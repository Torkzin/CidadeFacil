export const SLA_JOB_KEY = "sla-notifications";
export const DEFAULT_SLA_WORKER_INTERVAL_MS = 60_000;
export const MINIMUM_SLA_WORKER_INTERVAL_MS = 30_000;

export type WorkerHealth = "ok" | "warning" | "unavailable";

export function getSlaWorkerInterval(
  value = process.env.SLA_WORKER_INTERVAL_MS,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SLA_WORKER_INTERVAL_MS;
  return Math.max(MINIMUM_SLA_WORKER_INTERVAL_MS, Math.round(parsed));
}

export function getSlaDedupeKey(
  kind: "response" | "resolution" | "citizen-response",
  requestId: string,
  dueAt: Date,
) {
  return `sla-${kind}:${requestId}:${dueAt.toISOString()}`;
}

export function getWorkerHealth(
  status: string | null,
  lastCompletedAt: Date | null,
  now = new Date(),
  intervalMs = getSlaWorkerInterval(),
): WorkerHealth {
  if (status === "error") return "unavailable";
  if (!lastCompletedAt) return "warning";
  const toleranceMs = Math.max(intervalMs * 3, 5 * 60_000);
  return now.getTime() - lastCompletedAt.getTime() <= toleranceMs
    ? "ok"
    : "warning";
}
