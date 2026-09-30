import { and, eq, inArray, isNull, lte, notInArray } from "drizzle-orm";
import {
  municipalities,
  notificationPreferences,
  notifications,
  requestCommunications,
  requests,
  systemJobs,
  users,
  userTeamMemberships,
} from "@/db/schema";
import { db } from "@/lib/db/runtime";
import { getSlaDedupeKey, SLA_JOB_KEY } from "@/lib/notifications/sla-policy";
import { requestAccessCondition } from "@/lib/server/permissions";

type SlaUser = Parameters<typeof requestAccessCondition>[0];

export type SlaSweepResult = {
  usersProcessed: number;
  notificationsCreated: number;
  responseAlerts: number;
  resolutionAlerts: number;
  escalationAlerts: number;
  citizenResponseAlerts: number;
};

export async function createSlaNotificationsForUser(
  user: SlaUser,
  now = new Date(),
) {
  const { id: userId, municipalityId } = user;
  const [preference] = await db
    .select({ deadlineAlerts: notificationPreferences.deadlineAlerts })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.municipalityId, municipalityId),
      ),
    )
    .limit(1);
  if (preference?.deadlineAlerts === false) {
    return { responseAlerts: 0, resolutionAlerts: 0, escalationAlerts: 0, citizenResponseAlerts: 0 };
  }

  const responseLimit = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const resolutionLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const citizenResponseLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const activeCondition = and(
    requestAccessCondition(user),
    notInArray(requests.status, ["Concluída", "Cancelada"]),
  );
  const shouldReceiveEscalations = [
    "Administrador",
    "Secretário",
    "Gestor",
  ].includes(user.role);
  const unassignedLimit = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const [responseItems, resolutionItems, unassignedItems, citizenResponseItems] = await Promise.all([
    db
      .select({
        id: requests.id,
        protocol: requests.protocol,
        dueAt: requests.responseDueAt,
      })
      .from(requests)
      .where(
        and(
          activeCondition,
          isNull(requests.firstRespondedAt),
          lte(requests.responseDueAt, responseLimit),
        ),
      )
      .limit(100),
    db
      .select({
        id: requests.id,
        protocol: requests.protocol,
        dueAt: requests.resolutionDueAt,
      })
      .from(requests)
      .where(
        and(activeCondition, lte(requests.resolutionDueAt, resolutionLimit)),
      )
      .limit(100),
    shouldReceiveEscalations
      ? db
          .select({
            id: requests.id,
            protocol: requests.protocol,
            createdAt: requests.createdAt,
          })
          .from(requests)
          .where(
            and(
              activeCondition,
              isNull(requests.assignedToId),
              lte(requests.createdAt, unassignedLimit),
            ),
          )
          .limit(100)
      : Promise.resolve([]),
    db
      .select({
        communicationId: requestCommunications.id,
        requestId: requests.id,
        protocol: requests.protocol,
        dueAt: requestCommunications.responseDueAt,
      })
      .from(requestCommunications)
      .innerJoin(requests, eq(requests.id, requestCommunications.requestId))
      .where(
        and(
          activeCondition,
          eq(requestCommunications.kind, "INFORMATION_REQUEST"),
          isNull(requestCommunications.answeredAt),
          lte(requestCommunications.responseDueAt, citizenResponseLimit),
        ),
      )
      .limit(100),
  ]);

  let responseAlerts = 0;
  let resolutionAlerts = 0;
  let escalationAlerts = 0;
  let citizenResponseAlerts = 0;
  for (const item of responseItems) {
    if (!item.dueAt) continue;
    const overdue = item.dueAt < now;
    const inserted = await db
      .insert(notifications)
      .values({
        municipalityId,
        userId,
        requestId: item.id,
        dedupeKey: getSlaDedupeKey("response", item.id, item.dueAt),
        title: overdue
          ? "Primeira resposta atrasada"
          : "Prazo de primeira resposta próximo",
        description: `${item.protocol} ${overdue ? "ultrapassou" : "está próximo de"} seu prazo de primeira resposta.`,
      })
      .onConflictDoNothing()
      .returning({ id: notifications.id });
    responseAlerts += inserted.length;
  }
  for (const item of resolutionItems) {
    if (!item.dueAt) continue;
    const overdue = item.dueAt < now;
    const inserted = await db
      .insert(notifications)
      .values({
        municipalityId,
        userId,
        requestId: item.id,
        dedupeKey: getSlaDedupeKey("resolution", item.id, item.dueAt),
        title: overdue
          ? "Prazo de resolução vencido"
          : "Prazo de resolução próximo",
        description: `${item.protocol} ${overdue ? "ultrapassou" : "está próximo de"} seu prazo de resolução.`,
      })
      .onConflictDoNothing()
      .returning({ id: notifications.id });
    resolutionAlerts += inserted.length;
  }
  for (const item of unassignedItems) {
    const inserted = await db
      .insert(notifications)
      .values({
        municipalityId,
        userId,
        requestId: item.id,
        dedupeKey: `escalation-unassigned:${item.id}:${item.createdAt.toISOString()}`,
        title: "Escalonamento: solicitação sem responsável",
        description: `${item.protocol} está sem responsável há mais de 2 horas.`,
      })
      .onConflictDoNothing()
      .returning({ id: notifications.id });
    escalationAlerts += inserted.length;
  }
  for (const item of citizenResponseItems) {
    if (!item.dueAt) continue;
    const overdue = item.dueAt < now;
    const inserted = await db
      .insert(notifications)
      .values({
        municipalityId,
        userId,
        requestId: item.requestId,
        dedupeKey: getSlaDedupeKey(
          "citizen-response",
          item.communicationId,
          item.dueAt,
        ),
        title: overdue
          ? "Complementação do cidadão atrasada"
          : "Prazo do cidadão próximo",
        description: `${item.protocol}: ${overdue ? "o prazo para complementação venceu" : "o prazo para complementação vence em menos de 24 horas"}.`,
      })
      .onConflictDoNothing()
      .returning({ id: notifications.id });
    citizenResponseAlerts += inserted.length;
  }
  return { responseAlerts, resolutionAlerts, escalationAlerts, citizenResponseAlerts };
}

export async function runSlaNotificationSweep(now = new Date()) {
  await db
    .insert(systemJobs)
    .values({
      key: SLA_JOB_KEY,
      status: "running",
      lastStartedAt: now,
      lastError: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: systemJobs.key,
      set: {
        status: "running",
        lastStartedAt: now,
        lastError: null,
        updatedAt: now,
      },
    });

  try {
    const activeUsers = await db
      .select({
        id: users.id,
        municipalityId: users.municipalityId,
        municipalityName: municipalities.name,
        departmentId: users.departmentId,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .innerJoin(municipalities, eq(municipalities.id, users.municipalityId))
      .where(eq(users.status, "Ativo"));
    const userIds = activeUsers.map((user) => user.id);
    const memberships = userIds.length
      ? await db
          .select({
            userId: userTeamMemberships.userId,
            teamId: userTeamMemberships.teamId,
          })
          .from(userTeamMemberships)
          .where(inArray(userTeamMemberships.userId, userIds))
      : [];
    const teamsByUser = new Map<string, string[]>();
    for (const membership of memberships) {
      const teamIds = teamsByUser.get(membership.userId) ?? [];
      teamIds.push(membership.teamId);
      teamsByUser.set(membership.userId, teamIds);
    }

    const result: SlaSweepResult = {
      usersProcessed: 0,
      notificationsCreated: 0,
      responseAlerts: 0,
      resolutionAlerts: 0,
      escalationAlerts: 0,
      citizenResponseAlerts: 0,
    };
    for (const user of activeUsers) {
      const alerts = await createSlaNotificationsForUser(
        { ...user, teamIds: teamsByUser.get(user.id) ?? [] },
        now,
      );
      result.usersProcessed += 1;
      result.responseAlerts += alerts.responseAlerts;
      result.resolutionAlerts += alerts.resolutionAlerts;
      result.escalationAlerts += alerts.escalationAlerts;
      result.citizenResponseAlerts += alerts.citizenResponseAlerts;
      result.notificationsCreated +=
        alerts.responseAlerts +
        alerts.resolutionAlerts +
        alerts.escalationAlerts +
        alerts.citizenResponseAlerts;
    }

    const completedAt = new Date();
    await db
      .update(systemJobs)
      .set({
        status: "ok",
        lastCompletedAt: completedAt,
        lastError: null,
        result: JSON.stringify(result),
        updatedAt: completedAt,
      })
      .where(eq(systemJobs.key, SLA_JOB_KEY));
    return result;
  } catch (error) {
    const failedAt = new Date();
    const message =
      error instanceof Error
        ? error.message.slice(0, 500)
        : "Erro desconhecido";
    await db
      .update(systemJobs)
      .set({
        status: "error",
        lastError: message,
        updatedAt: failedAt,
      })
      .where(eq(systemJobs.key, SLA_JOB_KEY));
    throw error;
  }
}
