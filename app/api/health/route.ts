import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    const uploadRoot = path.join(process.cwd(), "storage", "uploads");
    await mkdir(uploadRoot, { recursive: true });
    await access(uploadRoot, constants.R_OK | constants.W_OK);
    return NextResponse.json({ status: "ok", checks: { application: "ok", database: "ok", storage: "ok" }, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error("health_check_failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ status: "unavailable", checks: { application: "ok", database: "unavailable_or_storage_unavailable" } }, { status: 503 });
  }
}
