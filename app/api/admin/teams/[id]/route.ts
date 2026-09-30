import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { departments, requests, teams } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireAdminUser } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";
const statuses = new Set(["Disponível", "Em campo", "Pausa"]);
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser(); if (!user) return apiError("Acesso restrito a administradores.", 403);
  const { id } = await params; const body = await request.json() as Record<string, unknown>; const name = inputText(body.name, 180); const departmentId = inputText(body.departmentId, 40); const status = inputText(body.status, 30); const memberCount = Number(body.memberCount ?? 0);
  if (!name || !departmentId || !statuses.has(status) || !Number.isInteger(memberCount) || memberCount < 0) return apiError("Preencha os dados da equipe corretamente.", 422);
  const [department] = await db.select({ id: departments.id }).from(departments).where(and(eq(departments.id, departmentId), eq(departments.municipalityId, user.municipalityId))).limit(1);
  if (!department) return apiError("Secretaria não encontrada.", 422);
  const [updated] = await db.update(teams).set({ name, departmentId, status: status as "Disponível" | "Em campo" | "Pausa", memberCount }).where(and(eq(teams.id, id), eq(teams.municipalityId, user.municipalityId))).returning();
  return updated ? NextResponse.json(updated) : apiError("Equipe não encontrada.", 404);
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser(); if (!user) return apiError("Acesso restrito a administradores.", 403); const { id } = await params;
  const [usage] = await db.select({ value: count() }).from(requests).where(eq(requests.teamId, id));
  if (usage.value > 0) return apiError("A equipe possui solicitações vinculadas e não pode ser excluída.", 409);
  const [deleted] = await db.delete(teams).where(and(eq(teams.id, id), eq(teams.municipalityId, user.municipalityId))).returning({ id: teams.id });
  return deleted ? NextResponse.json({ success: true }) : apiError("Equipe não encontrada.", 404);
}
