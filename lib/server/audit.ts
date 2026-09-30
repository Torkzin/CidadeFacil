import { createHash } from "node:crypto";
import { auditLogs } from "@/db/schema";
import { db } from "@/lib/db";
import { clientAddress } from "@/lib/security/rate-limit";

type AuditInput = {
  request?: Request;
  municipalityId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function audit(input: AuditInput) {
  const ip = input.request ? clientAddress(input.request) : "unknown";
  const salt = process.env.AUDIT_IP_SALT ?? "cidadefacil-development";
  const ipHash = ip === "unknown" ? null : createHash("sha256").update(`${salt}:${ip}`).digest("hex");
  const userAgent = input.request?.headers.get("user-agent")?.slice(0, 300) ?? null;
  await db.insert(auditLogs).values({
    municipalityId: input.municipalityId,
    userId: input.userId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    ipHash,
    userAgent,
  });
}

