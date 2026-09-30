import type { RequestStatus } from "@/types";

const transitions: Record<RequestStatus, RequestStatus[]> = {
  Aberta: ["Triagem", "Cancelada"],
  Triagem: ["Encaminhada", "Cancelada"],
  Encaminhada: ["Em andamento", "Aguardando", "Cancelada"],
  "Em andamento": ["Aguardando", "Concluída", "Cancelada"],
  Aguardando: ["Em andamento", "Concluída", "Cancelada"],
  Concluída: [],
  Cancelada: [],
};

export function allowedStatusTransitions(
  current: RequestStatus,
  canReopen = false,
) {
  if (canReopen && (current === "Concluída" || current === "Cancelada")) {
    return ["Triagem"] satisfies RequestStatus[];
  }
  return transitions[current];
}

export function isTerminalStatus(status: RequestStatus) {
  return status === "Concluída" || status === "Cancelada";
}

export function statusNeedsReason(current: RequestStatus, next: RequestStatus) {
  return (
    next === "Aguardando" ||
    next === "Cancelada" ||
    (isTerminalStatus(current) && next === "Triagem")
  );
}

export function validateStatusTransition({
  current,
  next,
  canReopen,
  hasDepartment,
  hasTeam,
  reason,
  resolutionNote,
}: {
  current: RequestStatus;
  next: RequestStatus;
  canReopen: boolean;
  hasDepartment: boolean;
  hasTeam: boolean;
  reason: string;
  resolutionNote: string;
}) {
  if (!allowedStatusTransitions(current, canReopen).includes(next)) {
    return `A transição de ${current} para ${next} não é permitida.`;
  }
  if (next === "Encaminhada" && !hasDepartment) {
    return "Encaminhe a solicitação para uma secretaria antes de alterar o status.";
  }
  if (next === "Em andamento" && !hasTeam) {
    return "Atribua uma equipe antes de iniciar o atendimento.";
  }
  if (statusNeedsReason(current, next) && reason.trim().length < 5) {
    return "Informe uma justificativa com ao menos 5 caracteres.";
  }
  if (next === "Concluída" && resolutionNote.trim().length < 10) {
    return "Descreva a solução aplicada com ao menos 10 caracteres.";
  }
  return null;
}

export function canBeAssignedToRequest({
  role,
  candidateDepartmentId,
  requestDepartmentId,
  requestHasTeam,
  belongsToTeam,
}: {
  role: string;
  candidateDepartmentId: string | null;
  requestDepartmentId: string | null;
  requestHasTeam: boolean;
  belongsToTeam: boolean;
}) {
  if (role === "Administrador") return true;
  if (!requestDepartmentId || candidateDepartmentId !== requestDepartmentId)
    return false;
  return role !== "Equipe de campo" || !requestHasTeam || belongsToTeam;
}
