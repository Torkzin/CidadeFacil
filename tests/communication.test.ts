import assert from "node:assert/strict";
import test from "node:test";
import {
  COMMUNICATION_BODY_MAX_LENGTH,
  validateCommunicationBody,
} from "../lib/requests/communication.ts";

test("aceita e normaliza uma mensagem válida", () => {
  assert.deepEqual(validateCommunicationBody("  Envie uma foto atual.  "), {
    body: "Envie uma foto atual.",
    error: null,
  });
});

test("rejeita mensagem curta", () => {
  assert.equal(validateCommunicationBody("oi").body, "");
  assert.match(validateCommunicationBody("oi").error ?? "", /5 caracteres/);
});

test("rejeita mensagem acima do limite", () => {
  const result = validateCommunicationBody(
    "a".repeat(COMMUNICATION_BODY_MAX_LENGTH + 1),
  );
  assert.equal(result.body, "");
  assert.match(result.error ?? "", /no máximo/);
});
