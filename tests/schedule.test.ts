import assert from "node:assert/strict";
import test from "node:test";
import { buildMonthGrid, toDateTimeLocal, toLocalIsoDate } from "../lib/work-orders/schedule.ts";

test("gera calendário mensal começando na segunda-feira", () => {
  const days = buildMonthGrid(2026, 8);
  assert.equal(days.length, 42);
  assert.equal(days[0].date.getDay(), 1);
  assert.equal(days.filter((day) => day.inCurrentMonth).length, 30);
});

test("formata data local sem deslocar o dia", () => {
  const date = new Date(2026, 8, 23, 14, 5);
  assert.equal(toLocalIsoDate(date), "2026-09-23");
  assert.equal(toDateTimeLocal(date), "2026-09-23T14:05");
});
