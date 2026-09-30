import test from "node:test";
import assert from "node:assert/strict";
import {
  getSlaDedupeKey,
  getSlaWorkerInterval,
  getWorkerHealth,
} from "../lib/notifications/sla-policy.ts";

test("gera chave estável de deduplicação por prazo", () => {
  const dueAt = new Date("2026-09-22T18:00:00Z");
  assert.equal(
    getSlaDedupeKey("response", "request-1", dueAt),
    "sla-response:request-1:2026-09-22T18:00:00.000Z",
  );
  assert.equal(
    getSlaDedupeKey("citizen-response", "message-1", dueAt),
    "sla-citizen-response:message-1:2026-09-22T18:00:00.000Z",
  );
});

test("normaliza intervalo do worker e respeita o mínimo operacional", () => {
  assert.equal(getSlaWorkerInterval("120000"), 120_000);
  assert.equal(getSlaWorkerInterval("1000"), 30_000);
  assert.equal(getSlaWorkerInterval("inválido"), 60_000);
});

test("classifica worker saudável, atrasado e com falha", () => {
  const now = new Date("2026-09-22T12:10:00Z");
  assert.equal(
    getWorkerHealth("ok", new Date("2026-09-22T12:08:00Z"), now, 60_000),
    "ok",
  );
  assert.equal(
    getWorkerHealth("ok", new Date("2026-09-22T12:00:00Z"), now, 60_000),
    "warning",
  );
  assert.equal(getWorkerHealth("error", null, now, 60_000), "unavailable");
});
