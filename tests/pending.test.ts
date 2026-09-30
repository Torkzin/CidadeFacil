import test from "node:test";
import assert from "node:assert/strict";
import { classifyPendingRequest } from "../lib/requests/pending.ts";

const now = new Date("2026-09-23T12:00:00Z");

function request(
  overrides: Partial<Parameters<typeof classifyPendingRequest>[0]> = {},
) {
  return {
    status: "Em andamento" as const,
    createdAt: new Date("2026-09-23T06:00:00Z"),
    updatedAt: new Date("2026-09-23T11:00:00Z"),
    responseDueAt: new Date("2026-09-23T10:00:00Z"),
    resolutionDueAt: new Date("2026-09-25T11:00:00Z"),
    firstRespondedAt: null,
    assignedToId: null,
    departmentId: "department-1",
    teamId: null,
    ...overrides,
  };
}

test("classifica atraso, ausência de responsável e ausência de equipe", () => {
  const reasons = classifyPendingRequest(request(), now);
  assert.deepEqual(
    reasons.map((reason) => reason.kind),
    ["response-overdue", "unassigned", "without-team"],
  );
});

test("identifica solicitação parada e prazo de resolução próximo", () => {
  const reasons = classifyPendingRequest(
    request({
      firstRespondedAt: new Date("2026-09-23T08:00:00Z"),
      assignedToId: "user-1",
      teamId: "team-1",
      updatedAt: new Date("2026-09-20T10:00:00Z"),
      resolutionDueAt: new Date("2026-09-24T10:00:00Z"),
    }),
    now,
  );
  assert.deepEqual(
    reasons.map((reason) => reason.kind),
    ["resolution-near", "stalled"],
  );
});

test("não inclui solicitações concluídas ou canceladas", () => {
  assert.deepEqual(
    classifyPendingRequest(request({ status: "Concluída" }), now),
    [],
  );
  assert.deepEqual(
    classifyPendingRequest(request({ status: "Cancelada" }), now),
    [],
  );
});

test("classifica complementação pendente, próxima e atrasada", () => {
  const base = {
    assignedToId: "user-1",
    teamId: "team-1",
    firstRespondedAt: new Date("2026-09-23T08:00:00Z"),
    informationRequestedAt: new Date("2026-09-23T09:00:00Z"),
  };
  assert.equal(
    classifyPendingRequest(
      request({
        ...base,
        informationResponseDueAt: new Date("2026-09-25T12:00:00Z"),
      }),
      now,
    ).find((reason) => reason.kind.includes("citizen"))?.kind,
    "awaiting-citizen",
  );
  assert.equal(
    classifyPendingRequest(
      request({
        ...base,
        informationResponseDueAt: new Date("2026-09-24T10:00:00Z"),
      }),
      now,
    ).find((reason) => reason.kind.includes("citizen"))?.kind,
    "citizen-response-near",
  );
  assert.equal(
    classifyPendingRequest(
      request({
        ...base,
        informationResponseDueAt: new Date("2026-09-23T10:00:00Z"),
      }),
      now,
    ).find((reason) => reason.kind.includes("citizen"))?.kind,
    "citizen-response-overdue",
  );
});
