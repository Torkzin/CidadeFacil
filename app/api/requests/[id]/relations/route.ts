import { and, count, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { categories, requestFollowers, requestHistory, requestRelations, requests } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/server/api";
import { accessibleRequestIdentity } from "@/lib/server/request-query";
import { canChangeAssignment } from "@/lib/server/permissions";
import { resolveRequestGroup } from "@/lib/server/request-relations";
import { similarRequests } from "@/lib/server/recurrence";
import { inputText } from "@/lib/server/input";
import { audit } from "@/lib/server/audit";

async function currentRequest(user: NonNullable<Awaited<ReturnType<typeof requireApiUser>>>, key: string) {
  const [item] = await db.select().from(requests).where(accessibleRequestIdentity(user, key)).limit(1);
  return item;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const current = await currentRequest(user, (await params).id);
  if (!current) return apiError("Solicitação não encontrada.", 404);
  const group = await resolveRequestGroup(current.id);
  const [members, followerRows, suggestions] = await Promise.all([
    db.select({
      id: requests.id,
      protocol: requests.protocol,
      title: requests.title,
      status: requests.status,
      category: categories.name,
      neighborhood: requests.neighborhood,
      createdAt: requests.createdAt,
    }).from(requests).innerJoin(categories, eq(categories.id, requests.categoryId))
      .where(and(eq(requests.municipalityId, user.municipalityId), inArray(requests.id, group.memberIds))),
    db.select({ value: count() }).from(requestFollowers).where(eq(requestFollowers.requestId, group.primaryRequestId)),
    similarRequests({
      municipalityId: user.municipalityId,
      categoryId: current.categoryId,
      address: current.address,
      addressNumber: current.addressNumber,
      neighborhood: current.neighborhood,
      latitude: current.latitude,
      longitude: current.longitude,
    }),
  ]);
  const existing = new Set(group.memberIds);
  return NextResponse.json({
    primaryRequestId: group.primaryRequestId,
    isPrimary: group.isPrimary,
    members: members.sort((a, b) => a.id === group.primaryRequestId ? -1 : b.id === group.primaryRequestId ? 1 : 0),
    followerCount: Number(followerRows[0]?.value ?? 0),
    suggestions: suggestions.filter((item) => !existing.has(item.id)),
    canManage: canChangeAssignment(user),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  if (!canChangeAssignment(user)) return apiError("Sem permissão para relacionar solicitações.", 403);
  const current = await currentRequest(user, (await params).id);
  if (!current) return apiError("Solicitação não encontrada.", 404);
  const body = await request.json() as Record<string, unknown>;
  const relatedRequestId = inputText(body.relatedRequestId, 50);
  const reason = inputText(body.reason, 500) || "Mesma ocorrência ou local identificado pela gestão.";
  const candidate = await currentRequest(user, relatedRequestId);
  if (!candidate) return apiError("Solicitação relacionada não encontrada.", 404);
  const group = await resolveRequestGroup(current.id);
  if (!group.isPrimary) return apiError("Faça o vínculo a partir do protocolo principal.", 422);
  if (candidate.id === group.primaryRequestId || group.memberIds.includes(candidate.id)) return apiError("Esta solicitação já pertence ao grupo.", 409);
  if (candidate.categoryId !== current.categoryId) return apiError("Somente solicitações da mesma categoria podem ser vinculadas.", 422);
  const candidateGroup = await resolveRequestGroup(candidate.id);
  if (candidateGroup.memberIds.length > 1) return apiError("O protocolo selecionado já pertence a outro grupo.", 409);
  await db.transaction(async (tx) => {
    await tx.insert(requestRelations).values({ municipalityId: user.municipalityId, primaryRequestId: group.primaryRequestId, relatedRequestId: candidate.id, linkedBy: user.id, reason });
    await tx.insert(requestHistory).values([
      { requestId: group.primaryRequestId, userId: user.id, action: "Solicitação relacionada", note: `${candidate.protocol} foi vinculada como parte da mesma ocorrência.` },
      { requestId: candidate.id, userId: user.id, action: "Vinculada à ocorrência principal", note: `Protocolo principal: ${current.protocol}.` },
    ]);
  });
  await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "REQUEST_RELATED", entityType: "request", entityId: candidate.id, metadata: { primaryRequestId: group.primaryRequestId, reason } });
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  if (!canChangeAssignment(user)) return apiError("Sem permissão para alterar o protocolo principal.", 403);
  const current = await currentRequest(user, (await params).id);
  if (!current) return apiError("Solicitação não encontrada.", 404);
  const group = await resolveRequestGroup(current.id);
  const body = await request.json() as Record<string, unknown>;
  const newPrimaryId = inputText(body.newPrimaryId, 50);
  if (!group.memberIds.includes(newPrimaryId)) return apiError("O novo principal deve pertencer ao grupo.", 422);
  if (newPrimaryId === group.primaryRequestId) return apiError("Este protocolo já é o principal.", 409);
  const relatedIds = group.memberIds.filter((memberId) => memberId !== newPrimaryId);
  await db.transaction(async (tx) => {
    await tx.delete(requestRelations).where(eq(requestRelations.primaryRequestId, group.primaryRequestId));
    await tx.insert(requestRelations).values(relatedIds.map((relatedRequestId) => ({ municipalityId: user.municipalityId, primaryRequestId: newPrimaryId, relatedRequestId, linkedBy: user.id, reason: "Protocolo principal redefinido pela gestão." })));
    await tx.insert(requestHistory).values(group.memberIds.map((requestId) => ({ requestId, userId: user.id, action: "Protocolo principal alterado", note: `Novo principal definido para o grupo: ${newPrimaryId}.` })));
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  if (!canChangeAssignment(user)) return apiError("Sem permissão para remover vínculos.", 403);
  const current = await currentRequest(user, (await params).id);
  if (!current) return apiError("Solicitação não encontrada.", 404);
  const group = await resolveRequestGroup(current.id);
  if (!group.isPrimary) return apiError("Faça a alteração pelo protocolo principal.", 422);
  const body = await request.json() as Record<string, unknown>;
  const relatedRequestId = inputText(body.relatedRequestId, 50);
  if (!group.memberIds.includes(relatedRequestId) || relatedRequestId === group.primaryRequestId) return apiError("Vínculo não encontrado.", 404);
  await db.delete(requestRelations).where(and(eq(requestRelations.primaryRequestId, group.primaryRequestId), eq(requestRelations.relatedRequestId, relatedRequestId)));
  await db.insert(requestHistory).values({ requestId: relatedRequestId, userId: user.id, action: "Solicitação desvinculada", note: "O protocolo voltou a ser tratado individualmente." });
  return NextResponse.json({ success: true });
}
