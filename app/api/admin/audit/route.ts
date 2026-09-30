import { and, desc, eq, gte, ilike, lte, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auditLogs, users } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireAdminUser } from "@/lib/server/api";

export async function GET(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return apiError("Acesso restrito a administradores.", 403);
  const url = new URL(request.url);
  const conditions: SQL[] = [eq(auditLogs.municipalityId, admin.municipalityId)];
  const userId = url.searchParams.get("userId"); if (userId) conditions.push(eq(auditLogs.userId, userId));
  const action = url.searchParams.get("action")?.trim(); if (action) conditions.push(ilike(auditLogs.action, `%${action.slice(0, 80)}%`));
  const entityType = url.searchParams.get("entityType")?.trim(); if (entityType) conditions.push(eq(auditLogs.entityType, entityType.slice(0, 80)));
  const from = url.searchParams.get("from"); if (from && !Number.isNaN(Date.parse(from))) conditions.push(gte(auditLogs.createdAt, new Date(`${from}T00:00:00-03:00`)));
  const to = url.searchParams.get("to"); if (to && !Number.isNaN(Date.parse(to))) conditions.push(lte(auditLogs.createdAt, new Date(`${to}T23:59:59-03:00`)));
  const items = await db.select({ id: auditLogs.id, createdAt: auditLogs.createdAt, userId: auditLogs.userId, userName: users.name, action: auditLogs.action, entityType: auditLogs.entityType, entityId: auditLogs.entityId, metadata: auditLogs.metadata, ipHash: auditLogs.ipHash, userAgent: auditLogs.userAgent })
    .from(auditLogs).leftJoin(users, eq(users.id, auditLogs.userId)).where(and(...conditions)).orderBy(desc(auditLogs.createdAt)).limit(500);
  const userItems = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.municipalityId, admin.municipalityId)).orderBy(users.name);
  return NextResponse.json({ items, users: userItems });
}

