import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  requestCitizenAcceptances,
  requestHistory,
  requests,
} from "@/db/schema";
import { db } from "@/lib/db";
import { audit } from "@/lib/server/audit";
import { apiError } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";
import { getPublicMunicipality } from "@/lib/server/public-municipality";
import { authenticatePublicRequest } from "@/lib/server/public-request-access";
import { resolveRequestGroup } from "@/lib/server/request-relations";
import { checkRateLimit, clientAddress, envNumber } from "@/lib/security/rate-limit";
import { validateCitizenAcceptance } from "@/lib/requests/citizen-acceptance";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ protocol: string }> },
) {
  const rate = checkRateLimit(
    `public-acceptance:${clientAddress(request)}`,
    envNumber("RATE_LIMIT_PUBLIC_ACCEPTANCE_MAX", 10),
    envNumber("RATE_LIMIT_PUBLIC_ACCEPTANCE_WINDOW_MS", 60 * 60 * 1000),
  );
  if (!rate.allowed)
    return NextResponse.json(
      { error: "Muitas confirmações. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  const municipality = await getPublicMunicipality();
  if (!municipality) return apiError("Portal indisponível.", 503);
  const { protocol } = await params;
  const access = await authenticatePublicRequest({
    municipalityId: municipality.id,
    protocol,
    token: request.headers.get("x-public-token") ?? "",
  });
  if (!access)
    return apiError("Protocolo ou código de acompanhamento inválido.", 404);
  if (access.item.status !== "Concluída")
    return apiError("O aceite fica disponível após a conclusão.", 422);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Dados inválidos.");
  }
  const outcome = inputText(body.outcome, 30);
  const comment = inputText(body.comment, 1500);
  const validationError = validateCitizenAcceptance(outcome, comment);
  if (validationError) return apiError(validationError, 422);
  const [existing] = await db
    .select({ id: requestCitizenAcceptances.id })
    .from(requestCitizenAcceptances)
    .where(
      and(
        eq(requestCitizenAcceptances.requestId, access.item.id),
        eq(
          requestCitizenAcceptances.participantTokenHash,
          access.participantTokenHash,
        ),
      ),
    )
    .limit(1);
  if (existing) return apiError("Seu aceite já foi registrado.", 409);
  const group = await resolveRequestGroup(access.item.id);
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(requestCitizenAcceptances).values({
      municipalityId: municipality.id,
      requestId: access.item.id,
      participantTokenHash: access.participantTokenHash,
      participantName: access.participantName,
      outcome,
      comment: comment || null,
      createdAt: now,
    });
    if (outcome === "Problema persiste") {
      await tx
        .update(requests)
        .set({
          status: "Triagem",
          concludedAt: null,
          reopenedAt: now,
          updatedAt: now,
        })
        .where(inArray(requests.id, group.memberIds));
    }
    await tx.insert(requestHistory).values(
      group.memberIds.map((requestId) => ({
        requestId,
        action:
          outcome === "Aceito"
            ? "Conclusão aceita pelo cidadão"
            : "Solicitação reaberta pelo cidadão",
        note:
          outcome === "Aceito"
            ? `Serviço confirmado por ${access.participantName}.`
            : `${access.participantName} informou que o problema persiste: ${comment}`,
        createdAt: now,
      })),
    );
  });
  await audit({
    request,
    municipalityId: municipality.id,
    action:
      outcome === "Aceito"
        ? "PUBLIC_COMPLETION_ACCEPTED"
        : "PUBLIC_COMPLETION_CONTESTED",
    entityType: "request",
    entityId: access.item.id,
    metadata: { protocol, participantType: access.participantType },
  });
  return NextResponse.json(
    { success: true, reopened: outcome === "Problema persiste" },
    { status: 201 },
  );
}
