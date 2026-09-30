import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requestFollowers, requestHistory, requests } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";
import { getPublicMunicipality } from "@/lib/server/public-municipality";
import { resolveRequestGroup } from "@/lib/server/request-relations";
import { createPublicAccessToken } from "@/lib/security/public-token";
import { checkRateLimit, clientAddress, envNumber } from "@/lib/security/rate-limit";
import { audit } from "@/lib/server/audit";

export async function POST(request: Request) {
  const rate = checkRateLimit(
    `public-follow:${clientAddress(request)}`,
    envNumber("RATE_LIMIT_PUBLIC_FOLLOW_MAX", 10),
    envNumber("RATE_LIMIT_PUBLIC_FOLLOW_WINDOW_MS", 60 * 60 * 1000),
  );
  if (!rate.allowed)
    return NextResponse.json({ error: "Limite de acompanhamentos atingido. Tente novamente mais tarde." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const municipality = await getPublicMunicipality();
  if (!municipality) return apiError("Portal indisponível.", 503);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return apiError("Dados inválidos."); }
  const targetId = inputText(body.targetId, 50);
  const citizenName = inputText(body.citizenName, 160);
  const citizenPhone = inputText(body.citizenPhone, 40);
  const citizenEmail = inputText(body.citizenEmail, 200);
  if (!targetId || !citizenName || !citizenPhone || body.privacyAccepted !== true)
    return apiError("Informe nome, telefone e aceite a política de privacidade.", 422);
  const [target] = await db.select({ id: requests.id }).from(requests).where(and(eq(requests.id, targetId), eq(requests.municipalityId, municipality.id))).limit(1);
  if (!target) return apiError("Ocorrência coletiva não encontrada.", 404);
  const group = await resolveRequestGroup(target.id);
  const [primary] = await db.select({ id: requests.id, protocol: requests.protocol }).from(requests).where(and(eq(requests.id, group.primaryRequestId), eq(requests.municipalityId, municipality.id))).limit(1);
  if (!primary) return apiError("Ocorrência coletiva não encontrada.", 404);
  const access = createPublicAccessToken();
  await db.transaction(async (tx) => {
    await tx.insert(requestFollowers).values({ municipalityId: municipality.id, requestId: primary.id, citizenName, citizenPhone, citizenEmail: citizenEmail || null, accessTokenHash: access.hash });
    const [followers] = await tx.select({ value: count() }).from(requestFollowers).where(eq(requestFollowers.requestId, primary.id));
    await tx.insert(requestHistory).values({ requestId: primary.id, action: "Novo acompanhamento coletivo", note: `A ocorrência agora possui ${Number(followers?.value ?? 1)} pessoa(s) acompanhando.` });
  });
  await audit({ request, municipalityId: municipality.id, action: "PUBLIC_REQUEST_FOLLOWED", entityType: "request", entityId: primary.id, metadata: { protocol: primary.protocol } });
  return NextResponse.json({ protocol: primary.protocol, publicToken: access.token, collective: true }, { status: 201 });
}
