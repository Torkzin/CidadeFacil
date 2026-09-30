import "server-only";

import { and, asc, desc, eq, inArray, isNull, notInArray } from "drizzle-orm";
import { categories, departments, requestCommunications, requests, teams, users } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  classifyPendingRequest,
  highestPendingSeverity,
  type PendingReasonKind,
  type PendingSeverity,
} from "@/lib/requests/pending";
import { requestAccessCondition } from "@/lib/server/permissions";

export type PendingFilter =
  "all" | "critical" | "unassigned" | "sla" | "stalled" | "waiting" | "citizen";

const validFilters = new Set<PendingFilter>([
  "all",
  "critical",
  "unassigned",
  "sla",
  "stalled",
  "waiting",
  "citizen",
]);

export function parsePendingFilter(value: string | undefined): PendingFilter {
  return validFilters.has(value as PendingFilter)
    ? (value as PendingFilter)
    : "all";
}

export async function getPendingRequests(user: CurrentUser, now = new Date()) {
  const rows = await db
    .select({
      id: requests.id,
      protocol: requests.protocol,
      title: requests.title,
      priority: requests.priority,
      status: requests.status,
      neighborhood: requests.neighborhood,
      createdAt: requests.createdAt,
      updatedAt: requests.updatedAt,
      responseDueAt: requests.responseDueAt,
      resolutionDueAt: requests.resolutionDueAt,
      firstRespondedAt: requests.firstRespondedAt,
      assignedToId: requests.assignedToId,
      departmentId: requests.departmentId,
      teamId: requests.teamId,
      category: categories.name,
      department: departments.name,
      team: teams.name,
      assignee: users.name,
    })
    .from(requests)
    .innerJoin(categories, eq(categories.id, requests.categoryId))
    .leftJoin(departments, eq(departments.id, requests.departmentId))
    .leftJoin(teams, eq(teams.id, requests.teamId))
    .leftJoin(users, eq(users.id, requests.assignedToId))
    .where(
      and(
        requestAccessCondition(user),
        notInArray(requests.status, ["Concluída", "Cancelada"]),
      ),
    )
    .orderBy(asc(requests.resolutionDueAt))
    .limit(500);

  const requestIds = rows.map((row) => row.id);
  const pendingCommunications = requestIds.length
    ? await db
        .select({
          requestId: requestCommunications.requestId,
          createdAt: requestCommunications.createdAt,
          responseDueAt: requestCommunications.responseDueAt,
        })
        .from(requestCommunications)
        .where(
          and(
            inArray(requestCommunications.requestId, requestIds),
            eq(requestCommunications.kind, "INFORMATION_REQUEST"),
            isNull(requestCommunications.answeredAt),
          ),
        )
        .orderBy(desc(requestCommunications.createdAt))
    : [];
  const communicationByRequest = new Map<
    string,
    (typeof pendingCommunications)[number]
  >();
  for (const communication of pendingCommunications) {
    if (!communicationByRequest.has(communication.requestId))
      communicationByRequest.set(communication.requestId, communication);
  }

  const items = rows
    .map((row) => {
      const communication = communicationByRequest.get(row.id);
      const enriched = {
        ...row,
        informationRequestedAt: communication?.createdAt ?? null,
        informationResponseDueAt: communication?.responseDueAt ?? null,
      };
      const reasons = classifyPendingRequest(enriched, now);
      return reasons.length
        ? { ...enriched, reasons, severity: highestPendingSeverity(reasons) }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const severityOrder: Record<PendingSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  items.sort((first, second) => {
    const severityDifference =
      severityOrder[first.severity] - severityOrder[second.severity];
    if (severityDifference) return severityDifference;
    return first.updatedAt.getTime() - second.updatedAt.getTime();
  });

  const hasReason = (kinds: PendingReasonKind[]) =>
    items.filter((item) =>
      item.reasons.some((reason) => kinds.includes(reason.kind)),
    ).length;

  return {
    items,
    counts: {
      all: items.length,
      critical: items.filter((item) => item.severity === "critical").length,
      unassigned: hasReason(["unassigned", "without-team"]),
      sla: hasReason([
        "response-overdue",
        "resolution-overdue",
        "response-near",
        "resolution-near",
      ]),
      stalled: hasReason(["stalled", "waiting-stale"]),
      waiting: items.filter((item) => item.status === "Aguardando").length,
      citizen: hasReason([
        "awaiting-citizen",
        "citizen-response-near",
        "citizen-response-overdue",
      ]),
    },
  };
}

export function filterPendingRequests<
  T extends Awaited<ReturnType<typeof getPendingRequests>>["items"][number],
>(items: T[], filter: PendingFilter) {
  if (filter === "all") return items;
  if (filter === "critical")
    return items.filter((item) => item.severity === "critical");
  if (filter === "unassigned")
    return items.filter((item) =>
      item.reasons.some((reason) =>
        ["unassigned", "without-team"].includes(reason.kind),
      ),
    );
  if (filter === "sla")
    return items.filter((item) =>
      item.reasons.some(
        (reason) =>
          reason.kind.includes("response") ||
          reason.kind.includes("resolution"),
      ),
    );
  if (filter === "stalled")
    return items.filter((item) =>
      item.reasons.some((reason) =>
        ["stalled", "waiting-stale"].includes(reason.kind),
      ),
    );
  if (filter === "citizen")
    return items.filter((item) =>
      item.reasons.some((reason) => reason.kind.includes("citizen")),
    );
  return items.filter((item) => item.status === "Aguardando");
}
