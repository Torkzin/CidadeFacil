import "server-only";

import { access, mkdir, readdir, statfs } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import packageJson from "@/package.json";
import { systemJobs } from "@/db/schema";
import { db, sqlClient } from "@/lib/db";
import {
  getSlaWorkerInterval,
  getWorkerHealth,
  SLA_JOB_KEY,
} from "@/lib/notifications/sla-policy";
import { eq } from "drizzle-orm";
import {
  backupTimestampToIso,
  findLatestCompleteBackup,
} from "@/lib/observability/system-format";

type CheckState = "ok" | "warning" | "unavailable";

export type SystemStatus = {
  overall: CheckState;
  generatedAt: string;
  application: {
    status: "ok";
    version: string;
    environment: string;
    nodeVersion: string;
    uptimeSeconds: number;
  };
  database: {
    status: CheckState;
    latencyMs: number | null;
    lastMigrationAt: string | null;
  };
  storage: {
    status: CheckState;
    uploadCount: number | null;
    totalBytes: number | null;
    availableBytes: number | null;
  };
  backup: {
    status: CheckState;
    lastCompleteAt: string | null;
  };
  automation: {
    status: CheckState;
    lastStartedAt: string | null;
    lastCompletedAt: string | null;
    lastRunStatus: string | null;
    intervalMs: number;
  };
};

export async function getSystemStatus(): Promise<SystemStatus> {
  let databaseStatus: CheckState = "unavailable";
  let latencyMs: number | null = null;
  let lastMigrationAt: string | null = null;
  const databaseStartedAt = performance.now();
  try {
    await sqlClient`select 1`;
    latencyMs = Math.max(1, Math.round(performance.now() - databaseStartedAt));
    databaseStatus = "ok";
    const migrations = await sqlClient<{ created_at: string | number }[]>`
      select created_at
      from drizzle.__drizzle_migrations
      order by id desc
      limit 1
    `;
    const createdAt = migrations[0]?.created_at;
    if (createdAt) {
      const numericValue = Number(createdAt);
      const migrationDate = Number.isFinite(numericValue)
        ? new Date(numericValue)
        : new Date(String(createdAt));
      if (!Number.isNaN(migrationDate.getTime())) {
        lastMigrationAt = migrationDate.toISOString();
      }
    }
  } catch {
    databaseStatus = "unavailable";
  }

  const uploadRoot = path.join(process.cwd(), "storage", "uploads");
  let storageStatus: CheckState = "unavailable";
  let uploadCount: number | null = null;
  let totalBytes: number | null = null;
  let availableBytes: number | null = null;
  try {
    await mkdir(uploadRoot, { recursive: true });
    await access(uploadRoot, constants.R_OK | constants.W_OK);
    const [files, filesystem] = await Promise.all([
      readdir(uploadRoot, { withFileTypes: true }),
      statfs(uploadRoot),
    ]);
    uploadCount = files.filter((entry) => entry.isFile()).length;
    totalBytes = filesystem.blocks * filesystem.bsize;
    availableBytes = filesystem.bavail * filesystem.bsize;
    storageStatus = "ok";
  } catch {
    storageStatus = "unavailable";
  }

  let backupStatus: CheckState = "warning";
  let lastCompleteAt: string | null = null;
  try {
    const backupDirectory = process.env.BACKUP_DIRECTORY;
    if (backupDirectory) {
      const latest = findLatestCompleteBackup(await readdir(backupDirectory));
      if (latest) {
        lastCompleteAt = backupTimestampToIso(latest.timestamp);
        backupStatus = lastCompleteAt ? "ok" : "warning";
      }
    }
  } catch {
    backupStatus = "warning";
  }

  const intervalMs = getSlaWorkerInterval();
  let automationStatus: CheckState = "warning";
  let lastStartedAt: string | null = null;
  let lastCompletedAt: string | null = null;
  let lastRunStatus: string | null = null;
  try {
    const [job] = await db
      .select({
        status: systemJobs.status,
        lastStartedAt: systemJobs.lastStartedAt,
        lastCompletedAt: systemJobs.lastCompletedAt,
      })
      .from(systemJobs)
      .where(eq(systemJobs.key, SLA_JOB_KEY))
      .limit(1);
    if (job) {
      lastStartedAt = job.lastStartedAt?.toISOString() ?? null;
      lastCompletedAt = job.lastCompletedAt?.toISOString() ?? null;
      lastRunStatus = job.status;
      automationStatus = getWorkerHealth(job.status, job.lastCompletedAt);
    }
  } catch {
    automationStatus = "unavailable";
  }

  const states = [
    databaseStatus,
    storageStatus,
    backupStatus,
    automationStatus,
  ];
  const overall = states.includes("unavailable")
    ? "unavailable"
    : states.includes("warning")
      ? "warning"
      : "ok";

  return {
    overall,
    generatedAt: new Date().toISOString(),
    application: {
      status: "ok",
      version: packageJson.version,
      environment: process.env.NODE_ENV ?? "development",
      nodeVersion: process.version,
      uptimeSeconds: Math.round(process.uptime()),
    },
    database: { status: databaseStatus, latencyMs, lastMigrationAt },
    storage: {
      status: storageStatus,
      uploadCount,
      totalBytes,
      availableBytes,
    },
    backup: { status: backupStatus, lastCompleteAt },
    automation: {
      status: automationStatus,
      lastStartedAt,
      lastCompletedAt,
      lastRunStatus,
      intervalMs,
    },
  };
}
