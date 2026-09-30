import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRoutingText,
  selectRoutingRule,
  type RoutingCandidate,
} from "../lib/requests/routing-policy.ts";

const generic: RoutingCandidate = {
  id: "generic",
  name: "Regra geral",
  neighborhood: null,
  departmentId: "department-1",
  teamId: null,
  priority: null,
};
const specific: RoutingCandidate = {
  id: "specific",
  name: "Regra Campo Lindo",
  neighborhood: "Campo Lindo",
  departmentId: "department-2",
  teamId: "team-1",
  priority: "Alta",
};

test("normaliza acentos e espaços para comparação territorial", () => {
  assert.equal(normalizeRoutingText("  São Miguel  "), "sao miguel");
});

test("regra específica do bairro tem precedência sobre a regra geral", () => {
  assert.equal(
    selectRoutingRule([generic, specific], "campo lindo")?.id,
    "specific",
  );
});

test("utiliza regra geral quando não há correspondência de bairro", () => {
  assert.equal(
    selectRoutingRule([generic, specific], "Boa Esperança")?.id,
    "generic",
  );
});
