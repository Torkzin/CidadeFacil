import assert from "node:assert/strict";
import test from "node:test";
import { formatWorkOrderNumber } from "../lib/work-orders/number.ts";
import { canDeleteWorkOrderEvidence, canTransitionWorkOrder, workOrderChecklistError, workOrderCompletionError } from "../lib/work-orders/workflow.ts";

test("formata número anual de ordem de serviço", () => {
  assert.equal(formatWorkOrderNumber(2026, 42), "OS-2026-000042");
});

test("exige relatório e foto de depois para concluir", () => {
  assert.match(workOrderCompletionError("curto", 1) ?? "", /10 caracteres/);
  assert.match(workOrderCompletionError("Serviço executado e testado", 0) ?? "", /foto de depois/);
  assert.match(workOrderCompletionError("Serviço executado e testado", 1, false) ?? "", /confirmar eletronicamente/);
  assert.equal(workOrderCompletionError("Serviço executado e testado", 1), null);
});

test("valida o fluxo de uma ordem de serviço", () => {
  assert.equal(canTransitionWorkOrder("Planejada", "Em execução"), true);
  assert.equal(canTransitionWorkOrder("Em execução", "Concluída"), true);
  assert.equal(canTransitionWorkOrder("Planejada", "Concluída"), false);
  assert.equal(canTransitionWorkOrder("Concluída", "Em execução"), false);
});

test("exige todos os itens obrigatórios do checklist", () => {
  assert.equal(workOrderChecklistError(3, 2), "Conclua os 1 item(ns) obrigatório(s) do checklist antes de finalizar.");
  assert.equal(workOrderChecklistError(3, 3), null);
  assert.equal(workOrderChecklistError(0, 0), null);
});

test("permite remover evidência somente enquanto a OS está ativa", () => {
  assert.equal(canDeleteWorkOrderEvidence("Planejada", true), true);
  assert.equal(canDeleteWorkOrderEvidence("Em execução", true), true);
  assert.equal(canDeleteWorkOrderEvidence("Concluída", true), false);
  assert.equal(canDeleteWorkOrderEvidence("Cancelada", true), false);
  assert.equal(canDeleteWorkOrderEvidence("Em execução", false), false);
});
