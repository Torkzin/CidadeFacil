import test from "node:test";
import assert from "node:assert/strict";
import { formatProtocol } from "../lib/requests/protocol.ts";

test("formata o protocolo institucional com sequência de sete dígitos", () => {
  assert.equal(formatProtocol(2026, 1429), "2026-0001429");
});

test("rejeita sequência inválida", () => {
  assert.throws(() => formatProtocol(2026, 0), /Sequência inválida/);
});
