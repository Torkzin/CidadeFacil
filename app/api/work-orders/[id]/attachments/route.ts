import { randomUUID } from "node:crypto";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requestHistory, requests, workOrderAttachments, workOrders } from "@/db/schema";
import { db } from "@/lib/db";
import { audit } from "@/lib/server/audit";
import { apiError, requireApiUser } from "@/lib/server/api";
import { canChangeStatus, requestAccessCondition } from "@/lib/server/permissions";
import { allowedImageTypes, validImageContent } from "@/lib/security/upload";
import { checkRateLimit, clientAddress, envNumber } from "@/lib/security/rate-limit";
import { deleteUpload, saveUpload } from "@/lib/storage/local";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  if (!canChangeStatus(user)) return apiError("Sem permissão para adicionar evidências.", 403);
  const { id } = await context.params;
  const rate = checkRateLimit(`work-order-upload:${user.id}:${clientAddress(request)}`, envNumber("RATE_LIMIT_UPLOAD_MAX", 30), envNumber("RATE_LIMIT_UPLOAD_WINDOW_MS", 60 * 60 * 1000));
  if (!rate.allowed) return NextResponse.json({ error: "Limite temporário de uploads atingido." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });

  const [order] = await db.select({ id: workOrders.id, number: workOrders.number, requestId: requests.id, status: workOrders.status })
    .from(workOrders).innerJoin(requests, eq(workOrders.requestId, requests.id))
    .where(and(eq(workOrders.id, id), requestAccessCondition(user))).limit(1);
  if (!order) return apiError("Ordem de serviço não encontrada.", 404);
  if (["Concluída", "Cancelada"].includes(order.status)) return apiError("A OS já está encerrada.");

  const form = await request.formData();
  const phase = form.get("phase");
  if (phase !== "Antes" && phase !== "Depois") return apiError("Informe se as fotos são de antes ou depois.", 422);
  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (!files.length || files.length > 5) return apiError("Envie entre uma e cinco imagens.", 422);
  const maxSize = envNumber("UPLOAD_MAX_BYTES", 10 * 1024 * 1024);
  const created = [];
  for (const file of files) {
    const extension = allowedImageTypes.get(file.type);
    if (!extension || file.size > maxSize) return apiError("Use apenas JPG, PNG ou WEBP dentro do limite permitido.", 422);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!validImageContent(file.type, bytes)) return apiError("O conteúdo do arquivo não corresponde a uma imagem válida.", 422);
    const storageKey = `${randomUUID()}${extension}`;
    await saveUpload(storageKey, bytes);
    try {
      const [attachment] = await db.insert(workOrderAttachments).values({ workOrderId: id, phase, uploadedBy: user.id, originalName: path.basename(file.name).slice(0, 240), storageKey, contentType: file.type, sizeBytes: file.size }).returning({ id: workOrderAttachments.id, phase: workOrderAttachments.phase, originalName: workOrderAttachments.originalName, contentType: workOrderAttachments.contentType, sizeBytes: workOrderAttachments.sizeBytes, createdAt: workOrderAttachments.createdAt });
      created.push(attachment);
    } catch (error) { await deleteUpload(storageKey); throw error; }
  }
  await db.insert(requestHistory).values({ requestId: order.requestId, userId: user.id, action: `Evidências de ${phase.toLowerCase()} adicionadas`, note: `${created.length} foto(s) vinculada(s) à ${order.number}.` });
  await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "work_order.evidence_uploaded", entityType: "work_order", entityId: id, metadata: { phase, count: created.length, number: order.number } });
  return NextResponse.json({ items: created }, { status: 201 });
}
