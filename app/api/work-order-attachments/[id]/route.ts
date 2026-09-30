import { and, eq } from "drizzle-orm";
import { requestHistory, requests, workOrderAttachments, workOrders } from "@/db/schema";
import { db } from "@/lib/db";
import { audit } from "@/lib/server/audit";
import { apiError, requireApiUser } from "@/lib/server/api";
import { canChangeStatus, requestAccessCondition } from "@/lib/server/permissions";
import { deleteUpload, readUpload } from "@/lib/storage/local";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const { id } = await context.params;
  const [item] = await db.select({ orderId: workOrders.id, number: workOrders.number, storageKey: workOrderAttachments.storageKey, contentType: workOrderAttachments.contentType, originalName: workOrderAttachments.originalName })
    .from(workOrderAttachments)
    .innerJoin(workOrders, eq(workOrderAttachments.workOrderId, workOrders.id))
    .innerJoin(requests, eq(workOrders.requestId, requests.id))
    .where(and(eq(workOrderAttachments.id, id), requestAccessCondition(user))).limit(1);
  if (!item) return apiError("Evidência não encontrada.", 404);
  try {
    const bytes = await readUpload(item.storageKey);
    await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "work_order.evidence_accessed", entityType: "work_order", entityId: item.orderId, metadata: { number: item.number } });
    const safeName = item.originalName.replaceAll('"', "");
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": item.contentType, "Content-Disposition": `inline; filename="${safeName}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return apiError("Arquivo indisponível.", 404); }
}

export async function DELETE(request: Request, context: Context) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  if (!canChangeStatus(user))
    return apiError("Sem permissão para remover evidências.", 403);
  const { id } = await context.params;
  const [item] = await db
    .select({
      attachmentId: workOrderAttachments.id,
      orderId: workOrders.id,
      number: workOrders.number,
      orderStatus: workOrders.status,
      requestId: requests.id,
      storageKey: workOrderAttachments.storageKey,
      originalName: workOrderAttachments.originalName,
      phase: workOrderAttachments.phase,
    })
    .from(workOrderAttachments)
    .innerJoin(workOrders, eq(workOrderAttachments.workOrderId, workOrders.id))
    .innerJoin(requests, eq(workOrders.requestId, requests.id))
    .where(
      and(
        eq(workOrderAttachments.id, id),
        requestAccessCondition(user),
      ),
    )
    .limit(1);
  if (!item) return apiError("Evidência não encontrada.", 404);
  if (["Concluída", "Cancelada"].includes(item.orderStatus))
    return apiError(
      "Evidências de uma ordem encerrada não podem ser removidas.",
      422,
    );

  const removed = await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(workOrderAttachments)
      .where(eq(workOrderAttachments.id, item.attachmentId))
      .returning({ storageKey: workOrderAttachments.storageKey });
    if (!deleted) return null;
    await tx.insert(requestHistory).values({
      requestId: item.requestId,
      userId: user.id,
      action: `Evidência de ${item.phase.toLowerCase()} removida`,
      note: `${item.originalName} foi removida da ${item.number}.`,
    });
    return deleted;
  });
  if (!removed) return apiError("Evidência não encontrada.", 404);
  await deleteUpload(removed.storageKey);
  await audit({
    request,
    municipalityId: user.municipalityId,
    userId: user.id,
    action: "work_order.evidence_deleted",
    entityType: "work_order",
    entityId: item.orderId,
    metadata: {
      number: item.number,
      phase: item.phase,
      originalName: item.originalName,
    },
  });
  return Response.json({ success: true });
}
