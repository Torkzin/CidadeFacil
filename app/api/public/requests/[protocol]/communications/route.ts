import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  notifications,
  requestCommunications,
  requestHistory,
  requests,
} from "@/db/schema";
import { db } from "@/lib/db";
import { validateCommunicationBody } from "@/lib/requests/communication";
import {
  checkRateLimit,
  clientAddress,
  envNumber,
} from "@/lib/security/rate-limit";
import { apiError } from "@/lib/server/api";
import { audit } from "@/lib/server/audit";
import { getPublicMunicipality } from "@/lib/server/public-municipality";
import { authenticatePublicRequest } from "@/lib/server/public-request-access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ protocol: string }> },
) {
  const rate = checkRateLimit(
    `public-communication:${clientAddress(request)}`,
    envNumber("RATE_LIMIT_PUBLIC_ACTION_MAX", 12),
    envNumber("RATE_LIMIT_PUBLIC_ACTION_WINDOW_MS", 15 * 60 * 1000),
  );
  if (!rate.allowed)
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  const municipality = await getPublicMunicipality();
  if (!municipality) return apiError("Portal indisponível.", 503);
  const { protocol } = await params;
  const auth = await authenticatePublicRequest({
    municipalityId: municipality.id,
    protocol,
    token: request.headers.get("x-public-token") ?? "",
  });
  if (!auth)
    return apiError("Protocolo ou código de acompanhamento inválido.", 404);
  if (auth.participantType !== "requester")
    return apiError(
      "Somente o titular do protocolo pode responder a pedidos de complementação.",
      403,
    );
  if (["Concluída", "Cancelada"].includes(auth.item.status))
    return apiError(
      "Esta solicitação está encerrada e não recebe novas complementações.",
      422,
    );
  const data = (await request.json()) as { body?: unknown };
  const validated = validateCommunicationBody(data.body);
  if (validated.error) return apiError(validated.error, 422);
  const [pending] = await db
    .select({
      id: requestCommunications.id,
      userId: requestCommunications.userId,
    })
    .from(requestCommunications)
    .where(
      and(
        eq(requestCommunications.requestId, auth.item.id),
        eq(
          requestCommunications.participantTokenHash,
          auth.participantTokenHash,
        ),
        eq(requestCommunications.kind, "INFORMATION_REQUEST"),
        isNull(requestCommunications.answeredAt),
      ),
    )
    .orderBy(desc(requestCommunications.createdAt))
    .limit(1);
  if (!pending)
    return apiError(
      "Não há pedido de complementação aguardando sua resposta.",
      409,
    );
  const now = new Date();
  const [created] = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(requestCommunications)
      .values({
        municipalityId: municipality.id,
        requestId: auth.item.id,
        participantTokenHash: auth.participantTokenHash,
        authorType: "CITIZEN",
        authorName: auth.participantName,
        kind: "CITIZEN_REPLY",
        body: validated.body,
        replyToId: pending.id,
      })
      .returning({
        id: requestCommunications.id,
        body: requestCommunications.body,
        createdAt: requestCommunications.createdAt,
      });
    await tx
      .update(requestCommunications)
      .set({ answeredAt: now })
      .where(eq(requestCommunications.id, pending.id));
    await tx
      .update(requests)
      .set({
        status: "Triagem",
        waitingReason: null,
        updatedAt: now,
      })
      .where(eq(requests.id, auth.item.id));
    await tx.insert(requestHistory).values({
      requestId: auth.item.id,
      action: "Complementação enviada pelo cidadão",
      note: "O cidadão respondeu ao pedido de informações.",
    });
    if (pending.userId) {
      await tx.insert(notifications).values({
        municipalityId: municipality.id,
        userId: pending.userId,
        requestId: auth.item.id,
        title: "Complementação recebida",
        description: `${auth.item.protocol}: o cidadão respondeu ao pedido de informações.`,
      });
    }
    return inserted;
  });
  await audit({
    request,
    municipalityId: municipality.id,
    action: "REQUEST_INFORMATION_ANSWERED",
    entityType: "request",
    entityId: auth.item.id,
    metadata: { protocol: auth.item.protocol },
  });
  return NextResponse.json(
    {
      ...created,
      authorName: auth.participantName,
      status: "Triagem",
    },
    { status: 201 },
  );
}
