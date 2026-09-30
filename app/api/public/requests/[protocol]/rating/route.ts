import { NextResponse } from "next/server";
import { requestRatings } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError } from "@/lib/server/api";
import { audit } from "@/lib/server/audit";
import { getPublicMunicipality } from "@/lib/server/public-municipality";
import { authenticatePublicRequest } from "@/lib/server/public-request-access";

export async function POST(request: Request, { params }: { params: Promise<{ protocol: string }> }) {
  const municipality = await getPublicMunicipality();
  if (!municipality) return apiError("Portal indisponível.", 503);
  const { protocol } = await params;
  const token = request.headers.get("x-public-token") ?? "";
  const access = await authenticatePublicRequest({ municipalityId: municipality.id, protocol, token });
  if (!access) return apiError("Protocolo ou código de acompanhamento inválido.", 404);
  if (access.item.status !== "Concluída") return apiError("A avaliação fica disponível após a conclusão.", 422);
  const body = await request.json() as { rating?: unknown; comment?: unknown };
  const rating = Number(body.rating);
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 1000) : "";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return apiError("Informe uma nota entre 1 e 5.", 422);
  await db.insert(requestRatings).values({ municipalityId: municipality.id, requestId: access.item.id, rating, comment: comment || null }).onConflictDoNothing();
  await audit({ request, municipalityId: municipality.id, action: "PUBLIC_REQUEST_RATED", entityType: "request", entityId: access.item.id, metadata: { protocol, rating } });
  return NextResponse.json({ success: true }, { status: 201 });
}
