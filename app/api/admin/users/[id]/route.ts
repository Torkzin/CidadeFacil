import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { departments, teams, userTeamMemberships, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { apiError, requireAdminUser } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";
import { audit } from "@/lib/server/audit";
const roles = new Set(["Administrador", "Secretário", "Gestor", "Servidor", "Equipe de campo"]); const statuses = new Set(["Ativo", "Inativo"]);
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser(); if (!admin) return apiError("Acesso restrito a administradores.", 403); const { id } = await params;
  const body = await request.json() as Record<string, unknown>; const name = inputText(body.name, 160); const email = inputText(body.email, 200).toLowerCase(); const role = inputText(body.role, 40); const status = inputText(body.status, 20); const departmentId = inputText(body.departmentId, 40) || null; const teamId = inputText(body.teamId, 40) || null; const password = typeof body.password === "string" ? body.password : "";
  if (!name || !email.includes("@") || !roles.has(role) || !statuses.has(status)) return apiError("Preencha os dados do usuário corretamente.", 422);
  if (id === admin.id && status === "Inativo") return apiError("Você não pode desativar o próprio acesso.", 409);
  if (departmentId) { const [department] = await db.select({ id: departments.id }).from(departments).where(and(eq(departments.id, departmentId), eq(departments.municipalityId, admin.municipalityId))).limit(1); if (!department) return apiError("Secretaria não encontrada.", 422); }
  if (teamId) { const [team] = await db.select({ id: teams.id, departmentId: teams.departmentId }).from(teams).where(and(eq(teams.id, teamId), eq(teams.municipalityId, admin.municipalityId))).limit(1); if (!team || (departmentId && team.departmentId !== departmentId)) return apiError("Equipe inválida para a secretaria selecionada.", 422); }
  const updateValues = { name, email, role: role as "Administrador" | "Secretário" | "Gestor" | "Servidor" | "Equipe de campo", status: status as "Ativo" | "Inativo", departmentId, updatedAt: new Date(), ...(password ? { passwordHash: await hashPassword(password) } : {}) };
  try { const updated = await db.transaction(async (tx) => { const [record] = await tx.update(users).set(updateValues).where(and(eq(users.id, id), eq(users.municipalityId, admin.municipalityId))).returning({ id: users.id }); if (!record) return null; await tx.delete(userTeamMemberships).where(eq(userTeamMemberships.userId, id)); if (teamId) await tx.insert(userTeamMemberships).values({ userId: id, teamId }); return record; }); if (!updated) return apiError("Usuário não encontrado.", 404); await audit({ request, municipalityId: admin.municipalityId, userId: admin.id, action: status === "Inativo" ? "USER_DEACTIVATED" : "USER_UPDATED", entityType: "user", entityId: id, metadata: { role, status, passwordChanged: Boolean(password) } }); return NextResponse.json({ success: true }); }
  catch { return apiError("Já existe um usuário com esse e-mail.", 409); }
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser(); if (!admin) return apiError("Acesso restrito a administradores.", 403); const { id } = await params;
  if (id === admin.id) return apiError("Você não pode excluir o próprio acesso.", 409);
  try { const [deleted] = await db.delete(users).where(and(eq(users.id, id), eq(users.municipalityId, admin.municipalityId))).returning({ id: users.id }); if (!deleted) return apiError("Usuário não encontrado.", 404); await audit({ request, municipalityId: admin.municipalityId, userId: admin.id, action: "USER_DELETED", entityType: "user", entityId: id }); return NextResponse.json({ success: true }); }
  catch { return apiError("O usuário possui histórico vinculado e não pode ser excluído; desative-o.", 409); }
}
