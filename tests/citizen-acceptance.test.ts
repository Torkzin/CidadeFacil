import assert from "node:assert/strict";
import test from "node:test";
import { validateCitizenAcceptance } from "../lib/requests/citizen-acceptance.ts";

test("aceita confirmação positiva sem exigir comentário", () => {
  assert.equal(validateCitizenAcceptance("Aceito", ""), null);
});

test("exige explicação quando o cidadão informa que o problema persiste", () => {
  assert.match(
    validateCitizenAcceptance("Problema persiste", "ruim") ?? "",
    /10 caracteres/,
  );
  assert.equal(
    validateCitizenAcceptance(
      "Problema persiste",
      "O vazamento continua no mesmo ponto.",
    ),
    null,
  );
});

test("rejeita resultado desconhecido", () => {
  assert.match(validateCitizenAcceptance("Talvez", "") ?? "", /aceito/);
});
