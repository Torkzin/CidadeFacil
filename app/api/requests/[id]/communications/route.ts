import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  municipalitySettings,
  requestCommunications,
  requestHistory,
  requests,
} from "@/db/schema";
import { db } from "@/lib/db";
import { validateCommunicationBody } from "@/lib/requests/communication";
import { addHours } from "@/lib/requests/sla";
import { apiError, requireApiUser } from "@/lib/server/api";
import { audit } from "@/lib/server/audit";
import { accessibleRequestIdentity } from "@/lib/server/request-query";
import { queueRequestWhatsAppMessage } from "@/lib/whatsapp/notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const { id } = await params;
  const [item] = await db
    .select({
      id: requests.id,
      protocol: requests.protocol,
      status: requests.status,
      tokenHash: requests.publicAccessTokenHash,
      firstRespondedAt: requests.firstRespondedAt,
    })
    .from(requests)
    .where(accessibleRequestIdentity(user, id))
    .limit(1);
  if (!item) return apiError("Solicitação não encontrada.", 404);
  if (!item.tokenHash)
    return apiError(
      "Esta solicitação não possui acesso público para receber complementação.",
      422,
    );
  if (["Concluída", "Cancelada"].includes(item.status))
    return apiError(
      "Reabra a solicitação antes de pedir uma complementação.",
      422,
    );
  const data = (await request.json()) as { body?: unknown };
  const validated = validateCommunicationBody(data.body);
  if (validated.error) return apiError(validated.error, 422);
  const [pending] = await db
    .select({ id: requestCommunications.id })
    .from(requestCommunications)
    .where(
      and(
        eq(requestCommunications.requestId, item.id),
        eq(requestCommunications.participantTokenHash, item.tokenHash),
        eq(requestCommunications.kind, "INFORMATION_REQUEST"),
        isNull(requestCommunications.answeredAt),
      ),
    )
    .orderBy(desc(requestCommunications.createdAt))
    .limit(1);
  if (pending)
    return apiError(
      "Já existe um pedido de complementação aguardando resposta.",
      409,
    );
  const [settings] = await db
    .select({
      citizenResponseHours: municipalitySettings.citizenResponseHours,
    })
    .from(municipalitySettings)
    .where(eq(municipalitySettings.municipalityId, user.municipalityId))
    .limit(1);
  const citizenResponseHours = settings?.citizenResponseHours ?? 72;
  const now = new Date();
  const responseDueAt = addHours(now, citizenResponseHours);
  const [created] = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(requestCommunications)
      .values({
        municipalityId: user.municipalityId,
        requestId: item.id,
        userId: user.id,
        participantTokenHash: item.tokenHash!,
        authorType: "STAFF",
        authorName: user.name,
        kind: "INFORMATION_REQUEST",
        body: validated.body,
        responseDueAt,
      })
      .returning({
        id: requestCommunications.id,
        body: requestCommunications.body,
        createdAt: requestCommunications.createdAt,
        responseDueAt: requestCommunications.responseDueAt,
      });
    await tx
      .update(requests)
      .set({
        status: "Aguardando",
        waitingReason: "Aguardando complementação do cidadão",
        firstRespondedAt: item.firstRespondedAt ?? now,
        updatedAt: now,
      })
      .where(eq(requests.id, item.id));
    await tx.insert(requestHistory).values({
      requestId: item.id,
      userId: user.id,
      action: "Complementação solicitada ao cidadão",
      note: validated.body,
    });
    return inserted;
  });
  await audit({
    request,
    municipalityId: user.municipalityId,
    userId: user.id,
    action: "REQUEST_INFORMATION_REQUESTED",
    entityType: "request",
    entityId: item.id,
    metadata: { protocol: item.protocol, citizenResponseHours },
  });
  try {
    await queueRequestWhatsAppMessage({
      requestId: item.id,
      body: [
        `A prefeitura solicitou uma complementação para o protocolo *${item.protocol}*:`,
        "",
        validated.body,
        "",
        `Responda por esta conversa em até ${citizenResponseHours} hora(s).`,
      ].join("\n"),
      nextState: "REPLY_TEXT",
      draft: { requestId: item.id, protocol: item.protocol },
    });
  } catch (error) {
    console.error("Falha ao enviar complementação pelo WhatsApp", error);
  }
  return NextResponse.json(
    { ...created, authorName: user.name, status: "Aguardando" },
    { status: 201 },
  );
}
