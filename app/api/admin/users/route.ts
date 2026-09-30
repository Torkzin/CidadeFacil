import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { departments, teams, userTeamMemberships, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { apiError, requireAdminUser } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";
import { audit } from "@/lib/server/audit";

const roles = new Set(["Administrador", "Secretário", "Gestor", "Servidor", "Equipe de campo"]);
export async function GET() {
  const admin = await requireAdminUser(); if (!admin) return apiError("Acesso restrito a administradores.", 403);
  const items = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, status: users.status, lastAccessAt: users.lastAccessAt, departmentId: users.departmentId, department: departments.name }).from(users).leftJoin(departments, eq(departments.id, users.departmentId)).where(eq(users.municipalityId, admin.municipalityId)).orderBy(users.name);
  const memberships = await db.select({ userId: userTeamMemberships.userId, teamId: teams.id, teamName: teams.name }).from(userTeamMemberships).innerJoin(teams, eq(teams.id, userTeamMemberships.teamId)).where(eq(teams.municipalityId, admin.municipalityId));
  return NextResponse.json({ items: items.map((item) => ({ ...item, teamId: memberships.find((membership) => membership.userId === item.id)?.teamId ?? null, team: memberships.find((membership) => membership.userId === item.id)?.teamName ?? null })) });
}
export async function POST(request: Request) {
  const admin = await requireAdminUser(); if (!admin) return apiError("Acesso restrito a administradores.", 403);
  const body = await request.json() as Record<string, unknown>; const name = inputText(body.name, 160); const email = inputText(body.email, 200).toLowerCase(); const role = inputText(body.role, 40); const departmentId = inputText(body.departmentId, 40) || null; const teamId = inputText(body.teamId, 40) || null; const password = typeof body.password === "string" ? body.password : "";
  if (!name || !email.includes("@") || !roles.has(role) || password.length < 8) return apiError("Informe nome, e-mail, cargo e uma senha com ao menos 8 caracteres.", 422);
  if (departmentId) { const [department] = await db.select({ id: departments.id }).from(departments).where(and(eq(departments.id, departmentId), eq(departments.municipalityId, admin.municipalityId))).limit(1); if (!department) return apiError("Secretaria não encontrada.", 422); }
  if (teamId) { const [team] = await db.select({ id: teams.id, departmentId: teams.departmentId }).from(teams).where(and(eq(teams.id, teamId), eq(teams.municipalityId, admin.municipalityId))).limit(1); if (!team || (departmentId && team.departmentId !== departmentId)) return apiError("Equipe inválida para a secretaria selecionada.", 422); }
  try { const created = await db.transaction(async (tx) => { const [record] = await tx.insert(users).values({ municipalityId: admin.municipalityId, departmentId, name, email, passwordHash: await hashPassword(password), role: role as "Administrador" | "Secretário" | "Gestor" | "Servidor" | "Equipe de campo", status: "Ativo" }).returning({ id: users.id, name: users.name, email: users.email, role: users.role, status: users.status }); if (teamId) await tx.insert(userTeamMemberships).values({ userId: record.id, teamId }); return record; }); await audit({ request, municipalityId: admin.municipalityId, userId: admin.id, action: "USER_CREATED", entityType: "user", entityId: created.id, metadata: { role } }); return NextResponse.json(created, { status: 201 }); }
  catch { return apiError("Já existe um usuário com esse e-mail.", 409); }
}
