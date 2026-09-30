import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { routingRules, teams } from "@/db/schema";
import { db } from "@/lib/db";
import { audit } from "@/lib/server/audit";
import { apiError, requireAdminUser } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAdminUser();
  if (!user) return apiError("Acesso restrito a administradores.", 403);
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError("Dados inválidos.");
  }
  const current = await db
    .select()
    .from(routingRules)
    .where(
      and(
        eq(routingRules.id, id),
        eq(routingRules.municipalityId, user.municipalityId),
      ),
    )
    .limit(1);
  if (!current[0]) return apiError("Regra não encontrada.", 404);

  const nextTeamId =
    body.teamId === undefined
      ? current[0].teamId
      : inputText(body.teamId, 50) || null;
  const nextDepartmentId =
    body.departmentId === undefined
      ? current[0].departmentId
      : inputText(body.departmentId, 50);
  if (nextTeamId) {
    const [team] = await db
      .select({ departmentId: teams.departmentId })
      .from(teams)
      .where(
        and(
          eq(teams.id, nextTeamId),
          eq(teams.municipalityId, user.municipalityId),
        ),
      )
      .limit(1);
    if (!team || team.departmentId !== nextDepartmentId)
      return apiError("A equipe não pertence à secretaria selecionada.", 422);
  }

  const updatedAt = new Date();
  const [updated] = await db
    .update(routingRules)
    .set({
      name:
        body.name === undefined
          ? current[0].name
          : inputText(body.name, 120) || current[0].name,
      departmentId: nextDepartmentId,
      teamId: nextTeamId,
      active:
        body.active === undefined ? current[0].active : body.active === true,
      updatedAt,
    })
    .where(
      and(
        eq(routingRules.id, id),
        eq(routingRules.municipalityId, user.municipalityId),
      ),
    )
    .returning();
  await audit({
    request,
    municipalityId: user.municipalityId,
    userId: user.id,
    action: "ROUTING_RULE_UPDATED",
    entityType: "routing_rule",
    entityId: id,
    metadata: { active: updated.active },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAdminUser();
  if (!user) return apiError("Acesso restrito a administradores.", 403);
  const { id } = await params;
  const [deleted] = await db
    .delete(routingRules)
    .where(
      and(
        eq(routingRules.id, id),
        eq(routingRules.municipalityId, user.municipalityId),
      ),
    )
    .returning({ id: routingRules.id });
  if (!deleted) return apiError("Regra não encontrada.", 404);
  await audit({
    request,
    municipalityId: user.municipalityId,
    userId: user.id,
    action: "ROUTING_RULE_DELETED",
    entityType: "routing_rule",
    entityId: id,
  });
  return NextResponse.json({ success: true });
}
