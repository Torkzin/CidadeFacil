import { and, count, eq, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { departments, requests, teams, users } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireAdminUser } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser(); if (!user) return apiError("Acesso restrito a administradores.", 403);
  const { id } = await params; const body = await request.json() as Record<string, unknown>;
  const name = inputText(body.name, 180); const managerName = inputText(body.managerName, 160);
  if (!name) return apiError("Informe o nome da secretaria.", 422);
  const [updated] = await db.update(departments).set({ name, managerName: managerName || null }).where(and(eq(departments.id, id), eq(departments.municipalityId, user.municipalityId))).returning();
  return updated ? NextResponse.json(updated) : apiError("Secretaria não encontrada.", 404);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser(); if (!user) return apiError("Acesso restrito a administradores.", 403);
  const { id } = await params;
  const [usage] = await db.select({ value: count() }).from(departments).leftJoin(requests, eq(requests.departmentId, departments.id)).leftJoin(teams, eq(teams.departmentId, departments.id)).leftJoin(users, eq(users.departmentId, departments.id)).where(and(eq(departments.id, id), eq(departments.municipalityId, user.municipalityId), or(sql`${requests.id} is not null`, sql`${teams.id} is not null`, sql`${users.id} is not null`)));
  if (usage.value > 0) return apiError("A secretaria possui vínculos e não pode ser excluída.", 409);
  const [deleted] = await db.delete(departments).where(and(eq(departments.id, id), eq(departments.municipalityId, user.municipalityId))).returning({ id: departments.id });
  return deleted ? NextResponse.json({ success: true }) : apiError("Secretaria não encontrada.", 404);
}
