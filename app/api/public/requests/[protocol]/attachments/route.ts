import { randomUUID } from "node:crypto";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requestAttachments, requestHistory, requests } from "@/db/schema";
import { db } from "@/lib/db";
import { verifyPublicAccessToken } from "@/lib/security/public-token";
import { allowedImageTypes, validImageContent } from "@/lib/security/upload";
import { checkRateLimit, clientAddress, envNumber } from "@/lib/security/rate-limit";
import { deleteUpload, saveUpload } from "@/lib/storage/local";
import { apiError } from "@/lib/server/api";
import { audit } from "@/lib/server/audit";
import { getPublicMunicipality } from "@/lib/server/public-municipality";

export async function POST(request: Request, { params }: { params: Promise<{ protocol: string }> }) {
  const rate = checkRateLimit(`public-upload:${clientAddress(request)}`, envNumber("RATE_LIMIT_PUBLIC_UPLOAD_MAX", 10), envNumber("RATE_LIMIT_PUBLIC_UPLOAD_WINDOW_MS", 60 * 60 * 1000));
  if (!rate.allowed) return NextResponse.json({ error: "Limite temporário de uploads atingido." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const municipality = await getPublicMunicipality();
  if (!municipality) return apiError("Portal indisponível.", 503);
  const { protocol } = await params;
  const token = request.headers.get("x-public-token") ?? "";
  const [record] = await db.select({ id: requests.id, tokenHash: requests.publicAccessTokenHash }).from(requests)
    .where(and(eq(requests.municipalityId, municipality.id), eq(requests.protocol, protocol))).limit(1);
  if (!record || !verifyPublicAccessToken(token, record.tokenHash)) return apiError("Protocolo ou código de acompanhamento inválido.", 404);
  const form = await request.formData();
  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (!files.length || files.length > 5) return apiError("Envie entre uma e cinco imagens.", 422);
  const maxSize = envNumber("UPLOAD_MAX_BYTES", 10 * 1024 * 1024);
  const created: string[] = [];
  for (const file of files) {
    const extension = allowedImageTypes.get(file.type);
    if (!extension || file.size > maxSize) return apiError("Use apenas JPG, PNG ou WEBP dentro do limite permitido.", 422);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!validImageContent(file.type, bytes)) return apiError("O conteúdo do arquivo não corresponde a uma imagem válida.", 422);
    const storageKey = `${randomUUID()}${extension}`;
    await saveUpload(storageKey, bytes);
    try {
      await db.insert(requestAttachments).values({ requestId: record.id, uploadedBy: null, originalName: path.basename(file.name).slice(0, 240), storageKey, contentType: file.type, sizeBytes: file.size });
      created.push(storageKey);
    } catch (error) {
      await deleteUpload(storageKey);
      throw error;
    }
  }
  await db.insert(requestHistory).values({ requestId: record.id, userId: null, action: "Fotos enviadas pelo cidadão", note: `${created.length} foto(s) recebida(s) pelo portal público.` });
  await audit({ request, municipalityId: municipality.id, action: "PUBLIC_ATTACHMENT_UPLOADED", entityType: "request", entityId: record.id, metadata: { protocol, count: created.length } });
  return NextResponse.json({ success: true, count: created.length }, { status: 201 });
}

