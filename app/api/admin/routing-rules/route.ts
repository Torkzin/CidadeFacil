import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { categories, departments, routingRules, teams } from "@/db/schema";
import { db } from "@/lib/db";
import { SEROPEDICA_NEIGHBORHOOD_NAMES } from "@/lib/municipality/seropedica";
import { audit } from "@/lib/server/audit";
import { apiError, requireAdminUser } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";
import { normalizeRoutingText } from "@/lib/requests/routing-policy";
import type { RequestPriority } from "@/types";

const priorities = new Set<RequestPriority>([
  "Baixa",
  "Normal",
  "Alta",
  "Urgente",
]);

export async function GET() {
  const user = await requireAdminUser();
  if (!user) return apiError("Acesso restrito a administradores.", 403);
  const items = await db
    .select({
      id: routingRules.id,
      name: routingRules.name,
      categoryId: routingRules.categoryId,
      category: categories.name,
      neighborhood: routingRules.neighborhood,
      departmentId: routingRules.departmentId,
      department: departments.name,
      teamId: routingRules.teamId,
      team: teams.name,
      priority: routingRules.priority,
      active: routingRules.active,
      createdAt: routingRules.createdAt,
      updatedAt: routingRules.updatedAt,
    })
    .from(routingRules)
    .innerJoin(categories, eq(categories.id, routingRules.categoryId))
    .innerJoin(departments, eq(departments.id, routingRules.departmentId))
    .leftJoin(teams, eq(teams.id, routingRules.teamId))
    .where(eq(routingRules.municipalityId, user.municipalityId))
    .orderBy(asc(routingRules.name));
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await requireAdminUser();
  if (!user) return apiError("Acesso restrito a administradores.", 403);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError("Dados inválidos.");
  }
  const name = inputText(body.name, 120);
  const categoryId = inputText(body.categoryId, 50);
  const departmentId = inputText(body.departmentId, 50);
  const teamId = inputText(body.teamId, 50) || null;
  const neighborhood = inputText(body.neighborhood, 120) || null;
  const priorityText = inputText(body.priority, 20);
  const priority = priorityText ? (priorityText as RequestPriority) : null;
  if (!name || !categoryId || !departmentId)
    return apiError("Informe nome, categoria e secretaria.", 422);
  if (priority && !priorities.has(priority))
    return apiError("Prioridade inválida.", 422);
  if (
    neighborhood &&
    !SEROPEDICA_NEIGHBORHOOD_NAMES.includes(
      neighborhood as (typeof SEROPEDICA_NEIGHBORHOOD_NAMES)[number],
    )
  )
    return apiError("Selecione um bairro válido de Seropédica.", 422);

  const [[category], [department], teamResult] = await Promise.all([
    db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.municipalityId, user.municipalityId),
        ),
      )
      .limit(1),
    db
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(
          eq(departments.id, departmentId),
          eq(departments.municipalityId, user.municipalityId),
        ),
      )
      .limit(1),
    teamId
      ? db
          .select({ id: teams.id, departmentId: teams.departmentId })
          .from(teams)
          .where(
            and(
              eq(teams.id, teamId),
              eq(teams.municipalityId, user.municipalityId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);
  if (!category || !department)
    return apiError("Categoria ou secretaria não encontrada.", 422);
  const team = teamResult[0];
  if (teamId && (!team || team.departmentId !== departmentId))
    return apiError("A equipe não pertence à secretaria selecionada.", 422);

  const existingRules = await db
    .select({ neighborhood: routingRules.neighborhood })
    .from(routingRules)
    .where(
      and(
        eq(routingRules.municipalityId, user.municipalityId),
        eq(routingRules.categoryId, categoryId),
      ),
    );
  const normalizedNeighborhood = neighborhood
    ? normalizeRoutingText(neighborhood)
    : null;
  if (
    existingRules.some((rule) =>
      normalizedNeighborhood
        ? rule.neighborhood &&
          normalizeRoutingText(rule.neighborhood) === normalizedNeighborhood
        : !rule.neighborhood,
    )
  )
    return apiError(
      "Já existe uma regra para esta categoria e abrangência territorial.",
      409,
    );

  const [created] = await db
    .insert(routingRules)
    .values({
      municipalityId: user.municipalityId,
      name,
      categoryId,
      neighborhood,
      departmentId,
      teamId,
      priority,
      active: body.active !== false,
    })
    .returning();
  await audit({
    request,
    municipalityId: user.municipalityId,
    userId: user.id,
    action: "ROUTING_RULE_CREATED",
    entityType: "routing_rule",
    entityId: created.id,
    metadata: { categoryId, neighborhood, departmentId, teamId, priority },
  });
  return NextResponse.json(created, { status: 201 });
}
