import test from "node:test";
import assert from "node:assert/strict";
import { addHours, calculateSlaState } from "../lib/requests/sla.ts";

test("calcula prazo em horas", () => {
  const start = new Date("2026-09-21T10:00:00Z");
  assert.equal(addHours(start, 12).toISOString(), "2026-09-21T22:00:00.000Z");
});

test("classifica SLA pendente, próximo e atrasado", () => {
  const now = new Date("2026-09-21T10:00:00Z");
  assert.equal(calculateSlaState("2026-09-23T10:00:00Z", null, false, now), "pending");
  assert.equal(calculateSlaState("2026-09-21T12:00:00Z", null, false, now), "near");
  assert.equal(calculateSlaState("2026-09-21T09:00:00Z", null, false, now), "overdue");
});

test("classifica cumprimento dentro e fora do prazo", () => {
  assert.equal(calculateSlaState("2026-09-21T12:00:00Z", "2026-09-21T11:00:00Z"), "met");
  assert.equal(calculateSlaState("2026-09-21T12:00:00Z", "2026-09-21T13:00:00Z"), "late");
  assert.equal(calculateSlaState("2026-09-21T12:00:00Z", null, true), "cancelled");
});
