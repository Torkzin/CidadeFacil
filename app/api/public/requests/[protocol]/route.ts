import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  categories,
  departments,
  requestHistory,
  requestFollowers,
  requestRelations,
  requestCitizenAcceptances,
  requestCommunications,
  requestRatings,
  requests,
} from "@/db/schema";
import { db } from "@/lib/db";
import { hashPublicAccessToken, verifyPublicAccessToken } from "@/lib/security/public-token";
import {
  checkRateLimit,
  clientAddress,
  envNumber,
} from "@/lib/security/rate-limit";
import { apiError } from "@/lib/server/api";
import { getPublicMunicipality } from "@/lib/server/public-municipality";

function publicAction(action: string) {
  if (action.includes("concluída")) return "Solicitação concluída";
  if (action.includes("criada")) return "Solicitação recebida";
  return "Andamento atualizado";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ protocol: string }> },
) {
  const rate = checkRateLimit(
    `public-query:${clientAddress(request)}`,
    envNumber("RATE_LIMIT_PUBLIC_QUERY_MAX", 30),
    envNumber("RATE_LIMIT_PUBLIC_QUERY_WINDOW_MS", 15 * 60 * 1000),
  );
  if (!rate.allowed)
    return NextResponse.json(
      { error: "Muitas consultas. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  const municipality = await getPublicMunicipality();
  if (!municipality) return apiError("Portal indisponível.", 503);
  const { protocol } = await params;
  const token = request.headers.get("x-public-token") ?? "";
  const [item] = await db
    .select({
      id: requests.id,
      protocol: requests.protocol,
      tokenHash: requests.publicAccessTokenHash,
      title: requests.title,
      category: categories.name,
      status: requests.status,
      department: departments.name,
      createdAt: requests.createdAt,
      updatedAt: requests.updatedAt,
      resolutionDueAt: requests.resolutionDueAt,
      concludedAt: requests.concludedAt,
      waitingReason: requests.waitingReason,
      cancellationReason: requests.cancellationReason,
      resolutionNote: requests.resolutionNote,
    })
    .from(requests)
    .innerJoin(categories, eq(categories.id, requests.categoryId))
    .leftJoin(departments, eq(departments.id, requests.departmentId))
    .where(
      and(
        eq(requests.municipalityId, municipality.id),
        eq(requests.protocol, protocol),
      ),
    )
    .limit(1);
  const isRequester = Boolean(
    item && verifyPublicAccessToken(token, item.tokenHash),
  );
  if (!item || !isRequester)
  {
    if (!item) return apiError("Protocolo ou código de acompanhamento inválido.", 404);
    const followerTokens = await db.select({ hash: requestFollowers.accessTokenHash }).from(requestFollowers).where(eq(requestFollowers.requestId, item.id));
    if (!followerTokens.some((entry) => verifyPublicAccessToken(token, entry.hash)))
      return apiError("Protocolo ou código de acompanhamento inválido.", 404);
  }
  const participantTokenHash = hashPublicAccessToken(token);
  const [history, rating, followers, related, acceptance, communications] = await Promise.all([
    db
      .select({
        action: requestHistory.action,
        createdAt: requestHistory.createdAt,
      })
      .from(requestHistory)
      .where(eq(requestHistory.requestId, item.id))
      .orderBy(requestHistory.createdAt),
    db
      .select({
        rating: requestRatings.rating,
        comment: requestRatings.comment,
      })
      .from(requestRatings)
      .where(eq(requestRatings.requestId, item.id))
      .limit(1),
    db.select({ id: requestFollowers.id }).from(requestFollowers).where(eq(requestFollowers.requestId, item.id)),
    db.select({ id: requestRelations.id }).from(requestRelations).where(eq(requestRelations.primaryRequestId, item.id)),
    db.select({
      outcome: requestCitizenAcceptances.outcome,
      comment: requestCitizenAcceptances.comment,
      participantName: requestCitizenAcceptances.participantName,
      createdAt: requestCitizenAcceptances.createdAt,
    }).from(requestCitizenAcceptances).where(and(
      eq(requestCitizenAcceptances.requestId, item.id),
      eq(requestCitizenAcceptances.participantTokenHash, participantTokenHash),
    )).limit(1),
    isRequester
      ? db.select({
          id: requestCommunications.id,
          authorType: requestCommunications.authorType,
          authorName: requestCommunications.authorName,
          kind: requestCommunications.kind,
          body: requestCommunications.body,
          answeredAt: requestCommunications.answeredAt,
          responseDueAt: requestCommunications.responseDueAt,
          createdAt: requestCommunications.createdAt,
        }).from(requestCommunications).where(and(
          eq(requestCommunications.requestId, item.id),
          eq(requestCommunications.participantTokenHash, participantTokenHash),
        )).orderBy(requestCommunications.createdAt)
      : Promise.resolve([]),
  ]);
  return NextResponse.json({
    protocol: item.protocol,
    title: item.title,
    category: item.category,
    status: item.status,
    department: item.department,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    resolutionDueAt: item.resolutionDueAt,
    concludedAt: item.concludedAt,
    waitingReason: item.waitingReason,
    cancellationReason: item.cancellationReason,
    resolutionNote: item.resolutionNote,
    history: history.map((entry) => ({
      title: publicAction(entry.action),
      createdAt: entry.createdAt,
    })),
    rating: rating[0] ?? null,
    collective: followers.length > 0 || related.length > 0,
    followerCount: followers.length,
    relatedCount: related.length,
    acceptance: acceptance[0] ?? null,
    communications,
    canReplyToCommunication: communications.some(
      (entry) =>
        entry.kind === "INFORMATION_REQUEST" && !entry.answeredAt,
    ),
  });
}
