import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRecurrenceAnalysis,
  findSimilarOccurrences,
  normalizeLocation,
  type RecurrenceOccurrence,
} from "../lib/requests/recurrence.ts";

const base: RecurrenceOccurrence = {
  id: "a",
  protocol: "SER-2026-000001",
  title: "Buraco na via",
  categoryId: "vias",
  category: "Buracos e pavimentação",
  categoryColor: "#f97316",
  status: "Aberta",
  address: "Rua das Flores",
  addressNumber: "10",
  neighborhood: "Campo Lindo",
  latitude: "-22.7430",
  longitude: "-43.7040",
  createdAt: "2026-09-20T12:00:00.000Z",
};

test("normaliza logradouro, acentos e abreviações", () => {
  assert.equal(normalizeLocation("Av. São João"), "sao joao");
});

test("encontra mesma categoria no mesmo endereço ou em até 200 metros", () => {
  const sameAddress = { ...base, id: "b", address: "R. das Flores" };
  const nearby = {
    ...base,
    id: "c",
    address: "Outro logradouro",
    latitude: "-22.7435",
    longitude: "-43.7045",
  };
  const otherCategory = { ...base, id: "d", categoryId: "luz" };
  const matches = findSimilarOccurrences(base, [sameAddress, nearby, otherCategory]);
  assert.deepEqual(matches.map((item) => item.id), ["b", "c"]);
  assert.equal(matches[0].matchReason, "Mesmo endereço");
  assert.equal(matches[1].matchReason, "Local próximo");
});

test("agrupa reincidências e consolida pontos de calor", () => {
  const analysis = buildRecurrenceAnalysis([
    base,
    { ...base, id: "b", protocol: "SER-2026-000002" },
    {
      ...base,
      id: "c",
      protocol: "SER-2026-000003",
      categoryId: "luz",
      category: "Iluminação pública",
    },
  ]);
  assert.equal(analysis.summary.totalOccurrences, 3);
  assert.equal(analysis.summary.recurrentGroups, 1);
  assert.equal(analysis.groups[0].count, 2);
  assert.equal(analysis.heatPoints[0].count, 3);
});
