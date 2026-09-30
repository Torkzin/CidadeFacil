import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { departments, requests, teams } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireAdminUser } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";

const statuses = new Set(["Disponível", "Em campo", "Pausa"]);
export async function GET() {
  const user = await requireAdminUser(); if (!user) return apiError("Acesso restrito a administradores.", 403);
  const items = await db.select({ id: teams.id, name: teams.name, status: teams.status, memberCount: teams.memberCount, departmentId: departments.id, department: departments.name,
    active: sql<number>`(select count(*)::int from ${requests} r where r.team_id = ${teams.id} and r.status not in ('Concluída', 'Cancelada'))`,
    completed: sql<number>`(select count(*)::int from ${requests} r where r.team_id = ${teams.id} and r.status = 'Concluída')`,
  }).from(teams).innerJoin(departments, eq(departments.id, teams.departmentId)).where(eq(teams.municipalityId, user.municipalityId)).orderBy(teams.name);
  return NextResponse.json({ items });
}
export async function POST(request: Request) {
  const user = await requireAdminUser(); if (!user) return apiError("Acesso restrito a administradores.", 403);
  const body = await request.json() as Record<string, unknown>; const name = inputText(body.name, 180); const departmentId = inputText(body.departmentId, 40); const status = inputText(body.status, 30); const memberCount = Number(body.memberCount ?? 0);
  if (!name || !departmentId || !statuses.has(status) || !Number.isInteger(memberCount) || memberCount < 0) return apiError("Preencha os dados da equipe corretamente.", 422);
  const [department] = await db.select({ id: departments.id }).from(departments).where(and(eq(departments.id, departmentId), eq(departments.municipalityId, user.municipalityId))).limit(1);
  if (!department) return apiError("Secretaria não encontrada.", 422);
  try { const [created] = await db.insert(teams).values({ municipalityId: user.municipalityId, name, departmentId, status: status as "Disponível" | "Em campo" | "Pausa", memberCount }).returning(); return NextResponse.json(created, { status: 201 }); }
  catch { return apiError("Já existe uma equipe com esse nome.", 409); }
}
