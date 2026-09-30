import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  categories,
  departments,
  notifications,
  prioritySettings,
  requestAttachments,
  requestCitizenAcceptances,
  requestCommunications,
  requestComments,
  requestHistory,
  requests,
  teams,
  userTeamMemberships,
  users,
} from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/server/api";
import {
  accessibleRequestIdentity,
  requestSelection,
} from "@/lib/server/request-query";
import type { RequestPriority, RequestStatus } from "@/types";
import { addHours, DEFAULT_SLA_HOURS } from "@/lib/requests/sla";
import {
  canChangeAssignment,
  canChangePriority,
  canChangeStatus,
  isAdministrator,
} from "@/lib/server/permissions";
import { audit } from "@/lib/server/audit";
import { inputText } from "@/lib/server/input";
import {
  canBeAssignedToRequest,
  isTerminalStatus,
  validateStatusTransition,
} from "@/lib/requests/workflow";
import { resolveRequestGroup } from "@/lib/server/request-relations";
import { queueRequestWhatsAppMessage } from "@/lib/whatsapp/notifications";

const priorities = new Set<RequestPriority>([
  "Baixa",
  "Normal",
  "Alta",
  "Urgente",
]);
const statuses = new Set<RequestStatus>([
  "Aberta",
  "Triagem",
  "Encaminhada",
  "Em andamento",
  "Aguardando",
  "Concluída",
  "Cancelada",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const { id } = await params;
  const [item] = await db
    .select({
      ...requestSelection,
      category: categories.name,
      department: departments.name,
      departmentId: departments.id,
      team: teams.name,
      teamId: teams.id,
    })
    .from(requests)
    .innerJoin(categories, eq(categories.id, requests.categoryId))
    .leftJoin(departments, eq(departments.id, requests.departmentId))
    .leftJoin(teams, eq(teams.id, requests.teamId))
    .where(accessibleRequestIdentity(user, id))
    .limit(1);
  if (!item) return apiError("Solicitação não encontrada.", 404);
  const history = await db
    .select({
      id: requestHistory.id,
      action: requestHistory.action,
      note: requestHistory.note,
      createdAt: requestHistory.createdAt,
      userName: users.name,
    })
    .from(requestHistory)
    .leftJoin(users, eq(users.id, requestHistory.userId))
    .where(eq(requestHistory.requestId, item.id))
    .orderBy(requestHistory.createdAt);
  const comments = await db
    .select({
      id: requestComments.id,
      body: requestComments.body,
      createdAt: requestComments.createdAt,
      userName: users.name,
    })
    .from(requestComments)
    .innerJoin(users, eq(users.id, requestComments.userId))
    .where(eq(requestComments.requestId, item.id))
    .orderBy(desc(requestComments.createdAt));
  const attachments = await db
    .select({
      id: requestAttachments.id,
      originalName: requestAttachments.originalName,
      contentType: requestAttachments.contentType,
      sizeBytes: requestAttachments.sizeBytes,
      createdAt: requestAttachments.createdAt,
    })
    .from(requestAttachments)
    .where(eq(requestAttachments.requestId, item.id))
    .orderBy(desc(requestAttachments.createdAt));
  const [assignee] = item.assignedToId
    ? await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(
          and(
            eq(users.id, item.assignedToId),
            eq(users.municipalityId, user.municipalityId),
          ),
        )
        .limit(1)
    : [];
  const [activeUsers, memberships, citizenAcceptances, communications] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        departmentId: users.departmentId,
      })
      .from(users)
      .where(
        and(
          eq(users.municipalityId, user.municipalityId),
          eq(users.status, "Ativo"),
        ),
      )
      .orderBy(users.name),
    item.teamId
      ? db
          .select({ userId: userTeamMemberships.userId })
          .from(userTeamMemberships)
          .where(eq(userTeamMemberships.teamId, item.teamId))
      : Promise.resolve([]),
    db.select({
      id: requestCitizenAcceptances.id,
      participantName: requestCitizenAcceptances.participantName,
      outcome: requestCitizenAcceptances.outcome,
      comment: requestCitizenAcceptances.comment,
      createdAt: requestCitizenAcceptances.createdAt,
    }).from(requestCitizenAcceptances).where(eq(requestCitizenAcceptances.requestId, item.id)).orderBy(desc(requestCitizenAcceptances.createdAt)),
    db.select({
      id: requestCommunications.id,
      authorType: requestCommunications.authorType,
      authorName: requestCommunications.authorName,
      kind: requestCommunications.kind,
      body: requestCommunications.body,
      answeredAt: requestCommunications.answeredAt,
      responseDueAt: requestCommunications.responseDueAt,
      createdAt: requestCommunications.createdAt,
    }).from(requestCommunications).where(eq(requestCommunications.requestId, item.id)).orderBy(requestCommunications.createdAt),
  ]);
  const teamMemberIds = new Set(memberships.map((entry) => entry.userId));
  const assigneeOptions = activeUsers
    .filter(
      (candidate) =>
        canBeAssignedToRequest({
          role: candidate.role,
          candidateDepartmentId: candidate.departmentId,
          requestDepartmentId: item.departmentId,
          requestHasTeam: Boolean(item.teamId),
          belongsToTeam: teamMemberIds.has(candidate.id),
        }),
    )
    .map(({ id: candidateId, name }) => ({ id: candidateId, name }));
  const collective = await resolveRequestGroup(item.id);
  return NextResponse.json({
    ...item,
    assignee: assignee ?? null,
    assigneeOptions,
    history,
    comments,
    attachments,
    citizenAcceptances,
    communications,
    collective,
    permissions: {
      currentUserId: user.id,
      canChangeStatus: collective.isPrimary && canChangeStatus(user),
      canChangePriority: collective.isPrimary && canChangePriority(user),
      canChangeAssignment: collective.isPrimary && canChangeAssignment(user),
      canReopen: collective.isPrimary && canChangeAssignment(user),
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const { id } = await params;
  const [current] = await db
    .select()
    .from(requests)
    .where(accessibleRequestIdentity(user, id))
    .limit(1);
  if (!current) return apiError("Solicitação não encontrada.", 404);
  const collective = await resolveRequestGroup(current.id);
  if (!collective.isPrimary)
    return apiError(
      "Este protocolo está vinculado a uma ocorrência coletiva. Faça a alteração pelo protocolo principal.",
      422,
    );
  const body = (await request.json()) as Record<string, unknown>;
  const status =
    typeof body.status === "string"
      ? (body.status as RequestStatus)
      : undefined;
  const priority =
    typeof body.priority === "string"
      ? (body.priority as RequestPriority)
      : undefined;
  const statusReason = inputText(body.statusReason, 1000);
  const resolutionNote = inputText(body.resolutionNote, 3000);
  const claimRequested = body.claim === true;
  const assigneeRequested = Object.prototype.hasOwnProperty.call(
    body,
    "assigneeId",
  );
  if (status && !statuses.has(status)) return apiError("Status inválido.", 422);
  if (priority && !priorities.has(priority))
    return apiError("Prioridade inválida.", 422);
  if (status && !canChangeStatus(user))
    return apiError("Você não possui permissão para alterar o status.", 403);
  if (priority && !canChangePriority(user))
    return apiError(
      "Você não possui permissão para alterar a prioridade.",
      403,
    );
  const assignmentRequested =
    (typeof body.department === "string" && Boolean(body.department)) ||
    (typeof body.team === "string" && Boolean(body.team));
  if (assignmentRequested && !canChangeAssignment(user))
    return apiError(
      "Você não possui permissão para encaminhar ou atribuir solicitações.",
      403,
    );
  if (claimRequested && assigneeRequested)
    return apiError("Escolha entre assumir ou transferir o atendimento.", 422);
  if (assigneeRequested && !canChangeAssignment(user))
    return apiError(
      "Você não possui permissão para transferir responsáveis.",
      403,
    );
  if ((claimRequested || assigneeRequested) && isTerminalStatus(current.status))
    return apiError(
      "Solicitações encerradas não podem receber responsável.",
      422,
    );
  let departmentId = current.departmentId;
  let teamId = current.teamId;
  let assignedToId = current.assignedToId;
  let assignedAt = current.assignedAt;
  const notes: string[] = [];
  if (typeof body.department === "string" && body.department) {
    const [department] = await db
      .select()
      .from(departments)
      .where(
        and(
          eq(departments.municipalityId, user.municipalityId),
          eq(departments.name, body.department),
        ),
      )
      .limit(1);
    if (!department) return apiError("Secretaria não encontrada.", 422);
    if (!isAdministrator(user) && department.id !== user.departmentId)
      return apiError("Você só pode gerenciar sua própria secretaria.", 403);
    departmentId = department.id;
    teamId = null;
    assignedToId = null;
    assignedAt = null;
    notes.push(`Encaminhada para ${department.name}`);
  }
  if (typeof body.team === "string" && body.team) {
    const [team] = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.municipalityId, user.municipalityId),
          eq(teams.name, body.team),
        ),
      )
      .limit(1);
    if (!team) return apiError("Equipe não encontrada.", 422);
    if (!isAdministrator(user) && team.departmentId !== user.departmentId)
      return apiError(
        "Você só pode atribuir equipes da própria secretaria.",
        403,
      );
    teamId = team.id;
    departmentId = team.departmentId;
    if (team.id !== current.teamId) {
      assignedToId = null;
      assignedAt = null;
    }
    notes.push(`Atribuída à ${team.name}`);
  }
  if (claimRequested) {
    assignedToId = user.id;
    assignedAt = new Date();
    notes.push(`Atendimento assumido por ${user.name}`);
  }
  if (assigneeRequested) {
    const requestedId =
      body.assigneeId === null ? "" : inputText(body.assigneeId, 50);
    if (!requestedId) {
      assignedToId = null;
      assignedAt = null;
      notes.push("Responsável individual removido");
    } else {
      const [candidate] = await db
        .select({
          id: users.id,
          name: users.name,
          role: users.role,
          departmentId: users.departmentId,
        })
        .from(users)
        .where(
          and(
            eq(users.id, requestedId),
            eq(users.municipalityId, user.municipalityId),
            eq(users.status, "Ativo"),
          ),
        )
        .limit(1);
      if (!candidate) return apiError("Responsável não encontrado.", 422);
      let belongsToTeam = true;
      if (teamId && candidate.role === "Equipe de campo") {
        const [membership] = await db
          .select({ userId: userTeamMemberships.userId })
          .from(userTeamMemberships)
          .where(
            and(
              eq(userTeamMemberships.userId, candidate.id),
              eq(userTeamMemberships.teamId, teamId),
            ),
          )
          .limit(1);
        belongsToTeam = Boolean(membership);
      }
      const eligible = canBeAssignedToRequest({
        role: candidate.role,
        candidateDepartmentId: candidate.departmentId,
        requestDepartmentId: departmentId,
        requestHasTeam: Boolean(teamId),
        belongsToTeam,
      });
      if (!eligible)
        return apiError(
          "O responsável deve pertencer à secretaria e à equipe atribuídas.",
          422,
        );
      assignedToId = candidate.id;
      assignedAt = new Date();
      notes.push(`Responsável alterado para ${candidate.name}`);
    }
  }
  let effectiveStatus = status ?? current.status;
  if (
    !status &&
    assignmentRequested &&
    ["Aberta", "Triagem"].includes(current.status)
  ) {
    effectiveStatus = "Encaminhada";
    notes.push("Status alterado automaticamente para Encaminhada");
  }
  if (status) {
    const transitionError = validateStatusTransition({
      current: current.status,
      next: status,
      canReopen: canChangeAssignment(user),
      hasDepartment: Boolean(departmentId),
      hasTeam: Boolean(teamId),
      reason: statusReason,
      resolutionNote,
    });
    if (transitionError) return apiError(transitionError, 422);
    notes.push(`Status alterado para ${status}`);
    if (statusReason) notes.push(`Justificativa: ${statusReason}`);
    if (resolutionNote) notes.push(`Solução: ${resolutionNote}`);
  }
  if (priority) notes.push(`Prioridade alterada para ${priority}`);
  if (!notes.length) return apiError("Nenhuma alteração válida enviada.", 422);
  const now = new Date();
  const reopening = Boolean(
    status && isTerminalStatus(current.status) && status === "Triagem",
  );
  const firstResponseRecorded =
    current.firstRespondedAt ??
    (effectiveStatus !== "Aberta" || assignmentRequested ? now : null);
  const slaPriority = priority ?? current.priority;
  const [configuredSla] =
    priority || reopening
      ? await db
          .select({
            responseHours: prioritySettings.responseHours,
            resolutionHours: prioritySettings.resolutionHours,
          })
          .from(prioritySettings)
          .where(
            and(
              eq(prioritySettings.municipalityId, user.municipalityId),
              eq(prioritySettings.priority, slaPriority),
            ),
          )
          .limit(1)
      : [];
  const sla =
    priority || reopening
      ? (configuredSla ?? DEFAULT_SLA_HOURS[slaPriority])
      : null;
  await db.transaction(async (tx) => {
    const sharedUpdate = {
      status: effectiveStatus,
      priority: priority ?? current.priority,
      departmentId,
      teamId,
      assignedToId,
      assignedAt,
      responseDueAt: reopening
        ? current.responseDueAt
        : sla
          ? addHours(current.createdAt, sla.responseHours)
          : current.responseDueAt,
      resolutionDueAt: sla
        ? addHours(reopening ? now : current.createdAt, sla.resolutionHours)
        : current.resolutionDueAt,
      firstRespondedAt: firstResponseRecorded,
      concludedAt:
        status === "Concluída" ? now : reopening ? null : current.concludedAt,
      waitingReason:
        status === "Aguardando"
          ? statusReason
          : status
            ? null
            : current.waitingReason,
      cancellationReason:
        status === "Cancelada"
          ? statusReason
          : reopening
            ? null
            : current.cancellationReason,
      resolutionNote:
        status === "Concluída"
          ? resolutionNote
          : reopening
            ? null
            : current.resolutionNote,
      reopenedAt: reopening ? now : current.reopenedAt,
      updatedAt: now,
    };
    await tx
      .update(requests)
      .set(sharedUpdate)
      .where(eq(requests.id, current.id));
    if (collective.memberIds.length > 1) {
      await tx.update(requests).set(sharedUpdate).where(and(inArray(requests.id, collective.memberIds), ne(requests.id, current.id)));
      await tx.insert(requestHistory).values(collective.memberIds.filter((memberId) => memberId !== current.id).map((requestId) => ({ requestId, userId: user.id, action: "Atualização da ocorrência coletiva", note: `${current.protocol}: ${notes.join(". ")}.` })));
    }
    await tx.insert(requestHistory).values({
      requestId: current.id,
      userId: user.id,
      action: reopening
        ? "Solicitação reaberta"
        : status === "Concluída"
          ? "Solicitação concluída"
          : status === "Cancelada"
            ? "Solicitação cancelada"
            : "Solicitação atualizada",
      note: notes.join(". "),
    });
    await tx.insert(notifications).values({
      municipalityId: user.municipalityId,
      userId: user.id,
      requestId: current.id,
      title: reopening
        ? "Solicitação reaberta"
        : status === "Concluída"
          ? "Solicitação concluída"
          : status === "Cancelada"
            ? "Solicitação cancelada"
            : "Solicitação atualizada",
      description: `${current.protocol}: ${notes.join(". ")}.`,
    });
    if (
      assignedToId &&
      assignedToId !== user.id &&
      (claimRequested || assigneeRequested)
    ) {
      await tx.insert(notifications).values({
        municipalityId: user.municipalityId,
        userId: assignedToId,
        requestId: current.id,
        title: "Nova solicitação sob sua responsabilidade",
        description: `${current.protocol}: você foi definido como responsável pelo atendimento.`,
      });
    }
  });
  await audit({
    request,
    municipalityId: user.municipalityId,
    userId: user.id,
    action: claimRequested
      ? "REQUEST_CLAIMED"
      : assigneeRequested
        ? assignedToId
          ? "REQUEST_ASSIGNED"
          : "REQUEST_UNASSIGNED"
        : reopening
          ? "REQUEST_REOPENED"
          : status === "Concluída"
            ? "REQUEST_CONCLUDED"
            : status === "Cancelada"
              ? "REQUEST_CANCELLED"
              : "REQUEST_UPDATED",
    entityType: "request",
    entityId: current.id,
    metadata: {
      protocol: current.protocol,
      status: status ?? null,
      priority: priority ?? null,
      assignmentChanged: assignmentRequested,
      responsibleChanged: claimRequested || assigneeRequested,
    },
  });
  if (status || assignmentRequested) {
    const [[department], [team]] = await Promise.all([
      departmentId
        ? db
            .select({ name: departments.name })
            .from(departments)
            .where(eq(departments.id, departmentId))
            .limit(1)
        : Promise.resolve([]),
      teamId
        ? db
            .select({ name: teams.name })
            .from(teams)
            .where(eq(teams.id, teamId))
            .limit(1)
        : Promise.resolve([]),
    ]);
    const message = [
      `Atualização do protocolo *${current.protocol}*`,
      "",
      `Status: *${effectiveStatus}*`,
      department?.name ? `Secretaria: ${department.name}` : null,
      team?.name ? `Equipe: ${team.name}` : null,
      effectiveStatus === "Aguardando" && statusReason
        ? `Motivo: ${statusReason}`
        : null,
      effectiveStatus === "Concluída" && resolutionNote
        ? `Solução: ${resolutionNote}`
        : null,
      "",
      effectiveStatus === "Concluída"
        ? "O atendimento foi concluído. Responda com uma nota de 1 a 5 para avaliar o serviço."
        : "Digite *MENU* para consultar ou enviar informações.",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await queueRequestWhatsAppMessage({
        requestId: current.id,
        body: message,
        ...(effectiveStatus === "Concluída"
          ? {
              nextState: "RATING_SCORE" as const,
              draft: { requestId: current.id, protocol: current.protocol },
              onlyWhenStateIsMenu: true,
            }
          : {}),
      });
    } catch (error) {
      console.error("Falha ao registrar atualização no WhatsApp", error);
    }
  }
  return NextResponse.json({ success: true });
}
