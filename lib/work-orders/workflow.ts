export type WorkOrderStatus = "Planejada" | "Em execução" | "Concluída" | "Cancelada";

const transitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  Planejada: ["Em execução", "Cancelada"],
  "Em execução": ["Concluída", "Cancelada"],
  Concluída: [],
  Cancelada: [],
};

export function canTransitionWorkOrder(from: WorkOrderStatus, to: WorkOrderStatus) {
  return transitions[from].includes(to);
}

export function canDeleteWorkOrderEvidence(
  status: WorkOrderStatus,
  canOperate: boolean,
) {
  return canOperate && !["Concluída", "Cancelada"].includes(status);
}

export function workOrderCompletionError(completionNote: string | null | undefined, afterEvidenceCount: number, executionAccepted = true) {
  if (!completionNote?.trim() || completionNote.trim().length < 10) {
    return "Descreva o serviço executado com pelo menos 10 caracteres.";
  }
  if (afterEvidenceCount < 1) {
    return "Adicione ao menos uma foto de depois antes de concluir a OS.";
  }
  if (!executionAccepted) {
    return "A equipe responsável deve confirmar eletronicamente a execução antes da conclusão.";
  }
  return null;
}

export function workOrderChecklistError(requiredCount: number, completedRequiredCount: number) {
  if (completedRequiredCount < requiredCount) {
    return `Conclua os ${requiredCount - completedRequiredCount} item(ns) obrigatório(s) do checklist antes de finalizar.`;
  }
  return null;
}
