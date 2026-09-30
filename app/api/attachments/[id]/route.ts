import { and, eq } from "drizzle-orm";
import { requestAttachments, requests } from "@/db/schema";
import { db } from "@/lib/db";
import { readUpload } from "@/lib/storage/local";
import { apiError, requireApiUser } from "@/lib/server/api";
import { requestAccessCondition } from "@/lib/server/permissions";
import { audit } from "@/lib/server/audit";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(); if (!user) return apiError("Não autenticado.", 401); const { id } = await params;
  const [item] = await db.select({ requestId: requests.id, protocol: requests.protocol, storageKey: requestAttachments.storageKey, contentType: requestAttachments.contentType, originalName: requestAttachments.originalName }).from(requestAttachments).innerJoin(requests, eq(requests.id, requestAttachments.requestId)).where(and(eq(requestAttachments.id, id), requestAccessCondition(user))).limit(1);
  if (!item) return apiError("Anexo não encontrado.", 404);
  try { const bytes = await readUpload(item.storageKey); await audit({ request: _request, municipalityId: user.municipalityId, userId: user.id, action: "ATTACHMENT_ACCESSED", entityType: "request", entityId: item.requestId, metadata: { protocol: item.protocol } }); return new Response(new Uint8Array(bytes), { headers: { "Content-Type": item.contentType, "Content-Disposition": `inline; filename="${item.originalName.replaceAll('"', '')}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }); }
  catch { return apiError("Arquivo indisponível.", 404); }
}
