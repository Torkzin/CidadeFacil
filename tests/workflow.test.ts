import assert from "node:assert/strict";
import test from "node:test";
import {
  allowedStatusTransitions,
  canBeAssignedToRequest,
  statusNeedsReason,
  validateStatusTransition,
} from "../lib/requests/workflow.ts";

test("permite somente as próximas etapas válidas do fluxo", () => {
  assert.deepEqual(allowedStatusTransitions("Aberta"), [
    "Triagem",
    "Cancelada",
  ]);
  assert.deepEqual(allowedStatusTransitions("Concluída"), []);
  assert.deepEqual(allowedStatusTransitions("Concluída", true), ["Triagem"]);
});

test("responsável respeita município operacional, secretaria e equipe", () => {
  assert.equal(
    canBeAssignedToRequest({ role: "Administrador", candidateDepartmentId: null, requestDepartmentId: "obras", requestHasTeam: true, belongsToTeam: false }),
    true,
  );
  assert.equal(
    canBeAssignedToRequest({ role: "Servidor", candidateDepartmentId: "saude", requestDepartmentId: "obras", requestHasTeam: false, belongsToTeam: false }),
    false,
  );
  assert.equal(
    canBeAssignedToRequest({ role: "Equipe de campo", candidateDepartmentId: "obras", requestDepartmentId: "obras", requestHasTeam: true, belongsToTeam: false }),
    false,
  );
  assert.equal(
    canBeAssignedToRequest({ role: "Equipe de campo", candidateDepartmentId: "obras", requestDepartmentId: "obras", requestHasTeam: true, belongsToTeam: true }),
    true,
  );
});

test("exige equipe para iniciar e solução para concluir", () => {
  assert.match(
    validateStatusTransition({
      current: "Encaminhada",
      next: "Em andamento",
      canReopen: false,
      hasDepartment: true,
      hasTeam: false,
      reason: "",
      resolutionNote: "",
    }) ?? "",
    /equipe/i,
  );
  assert.match(
    validateStatusTransition({
      current: "Em andamento",
      next: "Concluída",
      canReopen: false,
      hasDepartment: true,
      hasTeam: true,
      reason: "",
      resolutionNote: "curta",
    }) ?? "",
    /solução/i,
  );
  assert.equal(
    validateStatusTransition({
      current: "Em andamento",
      next: "Concluída",
      canReopen: false,
      hasDepartment: true,
      hasTeam: true,
      reason: "",
      resolutionNote: "Serviço executado e validado.",
    }),
    null,
  );
});

test("cancelamento, espera e reabertura exigem justificativa", () => {
  assert.equal(statusNeedsReason("Em andamento", "Aguardando"), true);
  assert.equal(statusNeedsReason("Em andamento", "Cancelada"), true);
  assert.equal(statusNeedsReason("Concluída", "Triagem"), true);
  assert.match(
    validateStatusTransition({
      current: "Concluída",
      next: "Triagem",
      canReopen: true,
      hasDepartment: true,
      hasTeam: true,
      reason: "",
      resolutionNote: "",
    }) ?? "",
    /justificativa/i,
  );
});
