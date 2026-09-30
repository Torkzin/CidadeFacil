import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { requestAttachments, requestHistory, requests } from "@/db/schema";
import { db } from "@/lib/db";
import { saveUpload, deleteUpload } from "@/lib/storage/local";
import { apiError, requireApiUser } from "@/lib/server/api";
import { accessibleRequestIdentity } from "@/lib/server/request-query";
import { allowedImageTypes, validImageContent } from "@/lib/security/upload";
import { checkRateLimit, clientAddress, envNumber } from "@/lib/security/rate-limit";
import { audit } from "@/lib/server/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(); if (!user) return apiError("Não autenticado.", 401); const { id } = await params;
  const rate = checkRateLimit(`upload:${user.id}:${clientAddress(request)}`, envNumber("RATE_LIMIT_UPLOAD_MAX", 30), envNumber("RATE_LIMIT_UPLOAD_WINDOW_MS", 60 * 60 * 1000));
  if (!rate.allowed) return NextResponse.json({ error: "Limite temporário de uploads atingido." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const [record] = await db.select({ id: requests.id, protocol: requests.protocol }).from(requests).where(accessibleRequestIdentity(user, id)).limit(1);
  if (!record) return apiError("Solicitação não encontrada.", 404);
  const form = await request.formData(); const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (!files.length || files.length > 5) return apiError("Envie entre uma e cinco imagens.", 422);
  const maxSize = envNumber("UPLOAD_MAX_BYTES", 10 * 1024 * 1024);
  const created = [];
  for (const file of files) {
    const extension = allowedImageTypes.get(file.type); if (!extension || file.size > maxSize) return apiError("Use apenas JPG, PNG ou WEBP dentro do limite permitido.", 422);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!validImageContent(file.type, bytes)) return apiError("O conteúdo do arquivo não corresponde a uma imagem válida.", 422);
    const storageKey = `${randomUUID()}${extension}`; await saveUpload(storageKey, bytes);
    try { const [attachment] = await db.insert(requestAttachments).values({ requestId: record.id, uploadedBy: user.id, originalName: path.basename(file.name).slice(0, 240), storageKey, contentType: file.type, sizeBytes: file.size }).returning({ id: requestAttachments.id, originalName: requestAttachments.originalName, contentType: requestAttachments.contentType, sizeBytes: requestAttachments.sizeBytes, createdAt: requestAttachments.createdAt }); created.push(attachment); }
    catch (error) { await deleteUpload(storageKey); throw error; }
  }
  await db.insert(requestHistory).values({ requestId: record.id, userId: user.id, action: "Fotos adicionadas", note: `${created.length} anexo(s) incluído(s) na solicitação.` });
  await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "ATTACHMENT_UPLOADED", entityType: "request", entityId: record.id, metadata: { protocol: record.protocol, count: created.length } });
  return NextResponse.json({ items: created }, { status: 201 });
}
