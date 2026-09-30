import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lt,
  or,
  type SQL,
} from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  categories,
  departments,
  prioritySettings,
  requests,
  teams,
} from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/server/api";
import { requestSelection } from "@/lib/server/request-query";
import type { RequestPriority, RequestStatus } from "@/types";
import { SEROPEDICA_NEIGHBORHOOD_NAMES } from "@/lib/municipality/seropedica";
import { DEFAULT_SLA_HOURS } from "@/lib/requests/sla";
import { requestAccessCondition } from "@/lib/server/permissions";
import { createRequest } from "@/lib/requests/create-request";
import { resolveRoutingRule } from "@/lib/requests/routing";
import { audit } from "@/lib/server/audit";

const priorities = new Set<RequestPriority>([
  "Baixa",
  "Normal",
  "Alta",
  "Urgente",
]);
const statuses = new Set<RequestStatus>([
  "Aberta",
  "Triagem",
  "Encaminhada",
  "Em andamento",
  "Aguardando",
  "Concluída",
  "Cancelada",
]);

function text(value: unknown, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function positiveInteger(
  value: string | null,
  fallback: number,
  maximum: number,
) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
}

function startOfMunicipalDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const url = new URL(request.url);
  const conditions: SQL[] = [requestAccessCondition(user)];
  const query = text(url.searchParams.get("q"), 120);
  if (query)
    conditions.push(
      or(
        ilike(requests.protocol, `%${query}%`),
        ilike(requests.title, `%${query}%`),
        ilike(requests.neighborhood, `%${query}%`),
      )!,
    );
  const status = text(url.searchParams.get("status"), 40) as RequestStatus;
  if (status && statuses.has(status))
    conditions.push(eq(requests.status, status));
  const priority = text(
    url.searchParams.get("priority"),
    20,
  ) as RequestPriority;
  if (priority && priorities.has(priority))
    conditions.push(eq(requests.priority, priority));
  const category = text(url.searchParams.get("category"), 120);
  if (category) conditions.push(eq(categories.name, category));
  const department = text(url.searchParams.get("department"), 160);
  if (department) conditions.push(eq(departments.name, department));
  const neighborhood = text(url.searchParams.get("neighborhood"), 120);
  if (neighborhood) conditions.push(eq(requests.neighborhood, neighborhood));
  if (url.searchParams.get("mine") === "true")
    conditions.push(eq(requests.assignedToId, user.id));
  if (url.searchParams.get("unassigned") === "true")
    conditions.push(isNull(requests.assignedToId));
  const from = startOfMunicipalDay(text(url.searchParams.get("from"), 10));
  if (from) conditions.push(gte(requests.createdAt, from));
  const to = startOfMunicipalDay(text(url.searchParams.get("to"), 10));
  if (to) {
    const dayAfter = new Date(to);
    dayAfter.setDate(dayAfter.getDate() + 1);
    conditions.push(lt(requests.createdAt, dayAfter));
  }
  const page = positiveInteger(url.searchParams.get("page"), 1, 100_000);
  const pageSize = positiveInteger(url.searchParams.get("pageSize"), 100, 100);
  const where = and(...conditions);
  const items = await db
    .select({
      ...requestSelection,
      category: categories.name,
      categoryColor: categories.color,
      department: departments.name,
      team: teams.name,
    })
    .from(requests)
    .innerJoin(categories, eq(categories.id, requests.categoryId))
    .leftJoin(departments, eq(departments.id, requests.departmentId))
    .leftJoin(teams, eq(teams.id, requests.teamId))
    .where(where)
    .orderBy(desc(requests.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [total] = await db
    .select({ value: count() })
    .from(requests)
    .innerJoin(categories, eq(categories.id, requests.categoryId))
    .leftJoin(departments, eq(departments.id, requests.departmentId))
    .where(where);
  const totalPages = Math.ceil(total.value / pageSize);
  return NextResponse.json({
    items,
    total: total.value,
    pagination: { page, pageSize, total: total.value, totalPages },
  });
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Dados inválidos.");
  }
  const title = text(body.title, 180);
  const description = text(body.description);
  const categoryName = text(body.category, 120);
  const priority = text(body.priority, 20) as RequestPriority;
  const address = text(body.address, 240);
  const neighborhood = text(body.neighborhood, 120);
  if (
    !title ||
    !description ||
    !categoryName ||
    !priorities.has(priority) ||
    !address ||
    !neighborhood
  ) {
    return apiError("Preencha todos os campos obrigatórios.", 422);
  }
  if (
    !SEROPEDICA_NEIGHBORHOOD_NAMES.includes(
      neighborhood as (typeof SEROPEDICA_NEIGHBORHOOD_NAMES)[number],
    )
  )
    return apiError("Selecione um bairro válido de Seropédica.", 422);
  const postalCode = text(body.postalCode, 16);
  if (postalCode && !/^2389\d-?\d{3}$/.test(postalCode))
    return apiError("Informe um CEP válido de Seropédica.", 422);
  const latitude = text(body.latitude, 32);
  const longitude = text(body.longitude, 32);
  if (!latitude || !longitude)
    return apiError("Marque a localização da solicitação no mapa.", 422);
  if (
    Number(latitude) < -22.9 ||
    Number(latitude) > -22.6 ||
    Number(longitude) < -43.9 ||
    Number(longitude) > -43.5
  )
    return apiError(
      "As coordenadas devem estar localizadas em Seropédica.",
      422,
    );
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.municipalityId, user.municipalityId),
        eq(categories.name, categoryName),
      ),
    )
    .limit(1);
  if (!category) return apiError("Categoria não encontrada.", 422);
  const departmentName = text(body.department, 180);
  const teamName = text(body.team, 180);
  const [department] = departmentName
    ? await db
        .select({ id: departments.id })
        .from(departments)
        .where(
          and(
            eq(departments.municipalityId, user.municipalityId),
            eq(departments.name, departmentName),
          ),
        )
        .limit(1)
    : [];
  const [team] = teamName
    ? await db
        .select({ id: teams.id, departmentId: teams.departmentId })
        .from(teams)
        .where(
          and(
            eq(teams.municipalityId, user.municipalityId),
            eq(teams.name, teamName),
          ),
        )
        .limit(1)
    : [];
  if (team && department && team.departmentId !== department.id)
    return apiError(
      "A equipe selecionada não pertence à secretaria informada.",
      422,
    );
  const routingRule =
    !departmentName && !teamName
      ? await resolveRoutingRule({
          municipalityId: user.municipalityId,
          categoryId: category.id,
          neighborhood,
        })
      : null;
  const [configuredSla] = await db
    .select({
      responseHours: prioritySettings.responseHours,
      resolutionHours: prioritySettings.resolutionHours,
    })
    .from(prioritySettings)
    .where(
      and(
        eq(prioritySettings.municipalityId, user.municipalityId),
        eq(prioritySettings.priority, priority),
      ),
    )
    .limit(1);
  const sla = configuredSla ?? DEFAULT_SLA_HOURS[priority];
  const result = await createRequest({
    municipalityId: user.municipalityId,
    actorUserId: user.id,
    source: "ADMIN_PORTAL",
    title,
    description,
    categoryId: category.id,
    priority,
    address,
    addressNumber: text(body.addressNumber, 30) || null,
    complement: text(body.complement, 180) || null,
    neighborhood,
    postalCode: postalCode || null,
    latitude: latitude || null,
    longitude: longitude || null,
    departmentId:
      department?.id ?? team?.departmentId ?? routingRule?.departmentId ?? null,
    teamId: team?.id ?? routingRule?.teamId ?? null,
    citizenName: text(body.citizenName, 160) || "Cidadão não informado",
    citizenPhone: text(body.citizenPhone, 40) || null,
    citizenEmail: text(body.citizenEmail, 200) || null,
    responseHours: sla.responseHours,
    resolutionHours: sla.resolutionHours,
    routingRuleName: routingRule?.name ?? null,
  });
  await audit({
    request,
    municipalityId: user.municipalityId,
    userId: user.id,
    action: "REQUEST_CREATED",
    entityType: "request",
    entityId: result.id,
    metadata: {
      source: "ADMIN_PORTAL",
      protocol: result.protocol,
      routingRuleId: routingRule?.id ?? null,
    },
  });
  return NextResponse.json(result, { status: 201 });
}
