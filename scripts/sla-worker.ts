import { sqlClient } from "@/lib/db/runtime";
import { runSlaNotificationSweep } from "@/lib/notifications/sla";
import { getSlaWorkerInterval } from "@/lib/notifications/sla-policy";
import { logger } from "@/lib/observability/logger";

const runOnce = process.argv.includes("--once");
const intervalMs = getSlaWorkerInterval();
let running = false;
let timer: NodeJS.Timeout | undefined;

async function executeSweep() {
  if (running) return true;
  running = true;
  try {
    const result = await runSlaNotificationSweep();
    logger.info("Varredura de SLA concluída.", result);
    return true;
  } catch (error) {
    logger.error("Varredura de SLA falhou.", {
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return false;
  } finally {
    running = false;
  }
}

async function shutdown(signal: string) {
  if (timer) clearInterval(timer);
  logger.info("Worker de SLA encerrando.", { signal });
  await sqlClient.end({ timeout: 5 });
  process.exit(0);
}

async function main() {
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));

  const succeeded = await executeSweep();
  if (runOnce) {
    await sqlClient.end({ timeout: 5 });
    if (!succeeded) process.exitCode = 1;
  } else {
    logger.info("Worker de SLA iniciado.", { intervalMs });
    timer = setInterval(() => void executeSweep(), intervalMs);
  }
}

void main();
