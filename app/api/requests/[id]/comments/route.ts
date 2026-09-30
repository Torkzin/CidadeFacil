import { NextResponse } from "next/server";
import { requestComments, requests } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/server/api";
import { accessibleRequestIdentity } from "@/lib/server/request-query";
import { audit } from "@/lib/server/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const { id } = await params;
  const [item] = await db.select({ id: requests.id, protocol: requests.protocol }).from(requests).where(accessibleRequestIdentity(user, id)).limit(1);
  if (!item) return apiError("Solicitação não encontrada.", 404);
  const data = await request.json() as { body?: unknown };
  const body = typeof data.body === "string" ? data.body.trim().slice(0, 2000) : "";
  if (!body) return apiError("O comentário não pode ficar vazio.", 422);
  const [created] = await db.insert(requestComments).values({ requestId: item.id, userId: user.id, body })
    .returning({ id: requestComments.id, body: requestComments.body, createdAt: requestComments.createdAt });
  await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "REQUEST_COMMENTED", entityType: "request", entityId: item.id, metadata: { protocol: item.protocol } });
  return NextResponse.json({ ...created, userName: user.name }, { status: 201 });
}
