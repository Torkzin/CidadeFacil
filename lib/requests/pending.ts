import type { RequestStatus } from "@/types";

const HOUR_MS = 60 * 60 * 1000;

export type PendingReasonKind =
  | "response-overdue"
  | "resolution-overdue"
  | "response-near"
  | "resolution-near"
  | "unassigned"
  | "without-team"
  | "awaiting-citizen"
  | "citizen-response-near"
  | "citizen-response-overdue"
  | "waiting-stale"
  | "stalled";

export type PendingSeverity = "critical" | "warning" | "info";

export type PendingReason = {
  kind: PendingReasonKind;
  label: string;
  severity: PendingSeverity;
};

export type PendingRequestInput = {
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
  responseDueAt: Date | null;
  resolutionDueAt: Date | null;
  firstRespondedAt: Date | null;
  assignedToId: string | null;
  departmentId: string | null;
  teamId: string | null;
  informationRequestedAt?: Date | null;
  informationResponseDueAt?: Date | null;
};

export function classifyPendingRequest(
  request: PendingRequestInput,
  now = new Date(),
) {
  if (["Concluída", "Cancelada"].includes(request.status)) return [];

  const reasons: PendingReason[] = [];
  const responseRemaining = request.responseDueAt
    ? request.responseDueAt.getTime() - now.getTime()
    : null;
  const resolutionRemaining = request.resolutionDueAt
    ? request.resolutionDueAt.getTime() - now.getTime()
    : null;

  if (!request.firstRespondedAt && responseRemaining !== null) {
    if (responseRemaining < 0) {
      reasons.push({
        kind: "response-overdue",
        label: "Primeira resposta atrasada",
        severity: "critical",
      });
    } else if (responseRemaining <= 4 * HOUR_MS) {
      reasons.push({
        kind: "response-near",
        label: "Primeira resposta vence em breve",
        severity: "warning",
      });
    }
  }

  if (resolutionRemaining !== null) {
    if (resolutionRemaining < 0) {
      reasons.push({
        kind: "resolution-overdue",
        label: "Resolução atrasada",
        severity: "critical",
      });
    } else if (resolutionRemaining <= 24 * HOUR_MS) {
      reasons.push({
        kind: "resolution-near",
        label: "Resolução vence em breve",
        severity: "warning",
      });
    }
  }

  if (!request.assignedToId) {
    reasons.push({
      kind: "unassigned",
      label: "Sem responsável",
      severity: "warning",
    });
  }
  if (request.departmentId && !request.teamId) {
    reasons.push({
      kind: "without-team",
      label: "Sem equipe",
      severity: "info",
    });
  }

  const awaitingCitizen = Boolean(
    request.informationRequestedAt && request.informationResponseDueAt,
  );
  if (request.informationResponseDueAt) {
    const citizenResponseRemaining =
      request.informationResponseDueAt.getTime() - now.getTime();
    if (citizenResponseRemaining < 0) {
      reasons.push({
        kind: "citizen-response-overdue",
        label: "Complementação do cidadão atrasada",
        severity: "critical",
      });
    } else if (citizenResponseRemaining <= 24 * HOUR_MS) {
      reasons.push({
        kind: "citizen-response-near",
        label: "Resposta do cidadão vence em breve",
        severity: "warning",
      });
    } else {
      reasons.push({
        kind: "awaiting-citizen",
        label: "Aguardando complementação do cidadão",
        severity: "info",
      });
    }
  }

  const inactiveFor = now.getTime() - request.updatedAt.getTime();
  if (!awaitingCitizen && request.status === "Aguardando" && inactiveFor >= 72 * HOUR_MS) {
    reasons.push({
      kind: "waiting-stale",
      label: "Aguardando há mais de 3 dias",
      severity: "warning",
    });
  } else if (!awaitingCitizen && inactiveFor >= 48 * HOUR_MS) {
    reasons.push({
      kind: "stalled",
      label: "Sem movimentação há mais de 2 dias",
      severity: "warning",
    });
  }

  return reasons;
}

export function highestPendingSeverity(reasons: PendingReason[]) {
  if (reasons.some((reason) => reason.severity === "critical"))
    return "critical" as const;
  if (reasons.some((reason) => reason.severity === "warning"))
    return "warning" as const;
  return "info" as const;
}
