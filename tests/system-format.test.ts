import assert from "node:assert/strict";
import test from "node:test";
import {
  backupTimestampToIso,
  findLatestCompleteBackup,
  formatBytes,
} from "../lib/observability/system-format.ts";

test("identifica somente o backup completo mais recente", () => {
  const result = findLatestCompleteBackup([
    "database-20260920T020000Z.dump",
    "uploads-20260920T020000Z.tar.gz",
    "database-20260921T020000Z.dump",
    "database-20260922T020000Z.dump",
    "uploads-20260922T020000Z.tar.gz",
  ]);
  assert.equal(result?.timestamp, "20260922T020000Z");
  assert.equal(result?.uploadsFile, "uploads-20260922T020000Z.tar.gz");
});

test("converte data do backup e formata armazenamento", () => {
  assert.equal(
    backupTimestampToIso("20260922T023000Z"),
    "2026-09-22T02:30:00.000Z",
  );
  assert.equal(formatBytes(1024 * 1024), "1 MB");
});
