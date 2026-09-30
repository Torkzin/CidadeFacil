import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { categories, prioritySettings } from "@/db/schema";
import { db } from "@/lib/db";
import { createRequest } from "@/lib/requests/create-request";
import { DEFAULT_SLA_HOURS } from "@/lib/requests/sla";
import { resolveRoutingRule } from "@/lib/requests/routing";
import { SEROPEDICA_NEIGHBORHOOD_NAMES } from "@/lib/municipality/seropedica";
import { audit } from "@/lib/server/audit";
import { apiError } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";
import { getPublicMunicipality } from "@/lib/server/public-municipality";
import {
  checkRateLimit,
  clientAddress,
  envNumber,
} from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const rate = checkRateLimit(
    `public-create:${clientAddress(request)}`,
    envNumber("RATE_LIMIT_PUBLIC_CREATE_MAX", 5),
    envNumber("RATE_LIMIT_PUBLIC_CREATE_WINDOW_MS", 60 * 60 * 1000),
  );
  if (!rate.allowed)
    return NextResponse.json(
      {
        error:
          "Limite temporário de solicitações atingido. Tente novamente mais tarde.",
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  const municipality = await getPublicMunicipality();
  if (!municipality) return apiError("Portal indisponível.", 503);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Dados inválidos.");
  }
  const title = inputText(body.title, 180);
  const description = inputText(body.description, 5000);
  const categoryId = inputText(body.categoryId, 50);
  const address = inputText(body.address, 240);
  const neighborhood = inputText(body.neighborhood, 120);
  const citizenName = inputText(body.citizenName, 160);
  const citizenPhone = inputText(body.citizenPhone, 40);
  if (
    !title ||
    !description ||
    !categoryId ||
    !address ||
    !neighborhood ||
    !citizenName ||
    !citizenPhone ||
    body.privacyAccepted !== true
  ) {
    return apiError(
      "Preencha os campos obrigatórios e aceite a política de privacidade.",
      422,
    );
  }
  if (
    !SEROPEDICA_NEIGHBORHOOD_NAMES.includes(
      neighborhood as (typeof SEROPEDICA_NEIGHBORHOOD_NAMES)[number],
    )
  )
    return apiError("Selecione um bairro válido de Seropédica.", 422);
  const postalCode = inputText(body.postalCode, 16);
  if (postalCode && !/^2389\d-?\d{3}$/.test(postalCode))
    return apiError("Informe um CEP válido de Seropédica.", 422);
  const latitude = inputText(body.latitude, 32);
  const longitude = inputText(body.longitude, 32);
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
        eq(categories.id, categoryId),
        eq(categories.municipalityId, municipality.id),
        eq(categories.publicEnabled, true),
      ),
    )
    .limit(1);
  if (!category) return apiError("Categoria indisponível.", 422);
  const routingRule = await resolveRoutingRule({
    municipalityId: municipality.id,
    categoryId: category.id,
    neighborhood,
  });
  const priority = routingRule?.priority ?? "Normal";
  const [configuredSla] = await db
    .select({
      responseHours: prioritySettings.responseHours,
      resolutionHours: prioritySettings.resolutionHours,
    })
    .from(prioritySettings)
    .where(
      and(
        eq(prioritySettings.municipalityId, municipality.id),
        eq(prioritySettings.priority, priority),
      ),
    )
    .limit(1);
  const sla = configuredSla ?? DEFAULT_SLA_HOURS[priority];
  const result = await createRequest({
    municipalityId: municipality.id,
    source: "CITIZEN_PORTAL",
    title,
    description,
    categoryId: category.id,
    priority,
    address,
    addressNumber: inputText(body.addressNumber, 30) || null,
    complement: inputText(body.complement, 180) || null,
    neighborhood,
    postalCode: postalCode || null,
    latitude: latitude || null,
    longitude: longitude || null,
    departmentId: routingRule?.departmentId ?? null,
    teamId: routingRule?.teamId ?? null,
    citizenName,
    citizenPhone,
    citizenEmail: inputText(body.citizenEmail, 200) || null,
    responseHours: sla.responseHours,
    resolutionHours: sla.resolutionHours,
    routingRuleName: routingRule?.name ?? null,
  });
  await audit({
    request,
    municipalityId: municipality.id,
    action: "PUBLIC_REQUEST_CREATED",
    entityType: "request",
    entityId: result.id,
    metadata: {
      protocol: result.protocol,
      source: "CITIZEN_PORTAL",
      routingRuleId: routingRule?.id ?? null,
    },
  });
  return NextResponse.json(
    { protocol: result.protocol, publicToken: result.publicToken },
    { status: 201 },
  );
}
