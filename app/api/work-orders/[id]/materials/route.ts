import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requests, workOrderMaterials, workOrders } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/server/api";
import { canChangeStatus, requestAccessCondition } from "@/lib/server/permissions";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  if (!canChangeStatus(user)) return apiError("Sem permissão.", 403);
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { description?: string; quantity?: string; unit?: string } | null;
  if (!body?.description?.trim() || !body.quantity?.trim() || !body.unit?.trim()) return apiError("Informe material, quantidade e unidade.");
  const [order] = await db.select({ id: workOrders.id, status: workOrders.status }).from(workOrders)
    .innerJoin(requests, eq(workOrders.requestId, requests.id))
    .where(and(eq(workOrders.id, id), requestAccessCondition(user))).limit(1);
  if (!order) return apiError("Ordem de serviço não encontrada.", 404);
  if (["Concluída", "Cancelada"].includes(order.status)) return apiError("A OS já está encerrada.");
  const [material] = await db.insert(workOrderMaterials).values({ workOrderId: id, description: body.description.trim(), quantity: body.quantity.trim(), unit: body.unit.trim() }).returning();
  return NextResponse.json({ item: material }, { status: 201 });
}
