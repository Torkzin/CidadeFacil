import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requestHistory, requests, serviceChecklistItems, users, workOrderChecklistCompletions, workOrders } from "@/db/schema";
import { db } from "@/lib/db";
import { audit } from "@/lib/server/audit";
import { apiError, requireApiUser } from "@/lib/server/api";
import { canChangeStatus, requestAccessCondition } from "@/lib/server/permissions";

type Context = { params: Promise<{ id: string }> };

async function findOrder(id: string, user: NonNullable<Awaited<ReturnType<typeof requireApiUser>>>) {
  const [result] = await db.select({ orderId: workOrders.id, requestId: requests.id, categoryId: requests.categoryId, status: workOrders.status }).from(workOrders).innerJoin(requests, eq(workOrders.requestId, requests.id)).where(and(eq(workOrders.id, id), requestAccessCondition(user))).limit(1);
  return result;
}

export async function GET(_request: Request, context: Context) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const { id } = await context.params;
  const order = await findOrder(id, user);
  if (!order) return apiError("Ordem de serviço não encontrada.", 404);
  const rows = await db.select({ id: serviceChecklistItems.id, title: serviceChecklistItems.title, required: serviceChecklistItems.required, sortOrder: serviceChecklistItems.sortOrder, completedAt: workOrderChecklistCompletions.completedAt, completedBy: users.name }).from(serviceChecklistItems).leftJoin(workOrderChecklistCompletions, and(eq(workOrderChecklistCompletions.checklistItemId, serviceChecklistItems.id), eq(workOrderChecklistCompletions.workOrderId, id))).leftJoin(users, eq(workOrderChecklistCompletions.completedBy, users.id)).where(and(eq(serviceChecklistItems.municipalityId, user.municipalityId), eq(serviceChecklistItems.categoryId, order.categoryId), eq(serviceChecklistItems.active, true))).orderBy(asc(serviceChecklistItems.sortOrder), asc(serviceChecklistItems.createdAt));
  const required = rows.filter((item) => item.required);
  return NextResponse.json({ items: rows.map((item) => ({ ...item, completed: Boolean(item.completedAt) })), progress: { completed: rows.filter((item) => item.completedAt).length, total: rows.length, requiredCompleted: required.filter((item) => item.completedAt).length, requiredTotal: required.length }, canUpdate: canChangeStatus(user) && !["Concluída", "Cancelada"].includes(order.status) });
}

export async function PATCH(request: Request, context: Context) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  if (!canChangeStatus(user)) return apiError("Sem permissão para atualizar o checklist.", 403);
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { itemId?: string; completed?: boolean } | null;
  if (!body?.itemId || typeof body.completed !== "boolean") return apiError("Item e estado são obrigatórios.", 422);
  const order = await findOrder(id, user);
  if (!order) return apiError("Ordem de serviço não encontrada.", 404);
  if (["Concluída", "Cancelada"].includes(order.status)) return apiError("O checklist de uma ordem encerrada não pode ser alterado.");
  const [item] = await db.select({ id: serviceChecklistItems.id, title: serviceChecklistItems.title }).from(serviceChecklistItems).where(and(eq(serviceChecklistItems.id, body.itemId), eq(serviceChecklistItems.municipalityId, user.municipalityId), eq(serviceChecklistItems.categoryId, order.categoryId), eq(serviceChecklistItems.active, true))).limit(1);
  if (!item) return apiError("Item de checklist não encontrado.", 404);
  if (body.completed) {
    await db.insert(workOrderChecklistCompletions).values({ workOrderId: id, checklistItemId: item.id, completedBy: user.id }).onConflictDoUpdate({ target: [workOrderChecklistCompletions.workOrderId, workOrderChecklistCompletions.checklistItemId], set: { completedBy: user.id, completedAt: new Date() } });
  } else {
    await db.delete(workOrderChecklistCompletions).where(and(eq(workOrderChecklistCompletions.workOrderId, id), eq(workOrderChecklistCompletions.checklistItemId, item.id)));
  }
  await db.insert(requestHistory).values({ requestId: order.requestId, userId: user.id, action: "Checklist da OS atualizado", note: `${item.title}: ${body.completed ? "concluído" : "reaberto"}.` });
  await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "work_order.checklist_updated", entityType: "work_order", entityId: id, metadata: { itemId: item.id, completed: body.completed } });
  return NextResponse.json({ ok: true });
}
