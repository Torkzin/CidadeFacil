import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireApiUser, apiError } from "@/lib/server/api";
import { allowedImageTypes, validImageContent } from "@/lib/security/upload";
import { envNumber } from "@/lib/security/rate-limit";
import { deleteUpload, saveUpload } from "@/lib/storage/local";
import { processWhatsAppMessage } from "@/lib/whatsapp/process-message";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  if (user.role !== "Administrador")
    return apiError("Acesso restrito a administradores.", 403);

  const contentType = request.headers.get("content-type") ?? "";
  let storedKey: string | null = null;
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const phone = String(form.get("phone") ?? "");
      const displayName = String(form.get("displayName") ?? "");
      const file = form.get("file");
      if (!(file instanceof File)) return apiError("Selecione uma imagem.", 422);
      const extension = allowedImageTypes.get(file.type);
      const maxSize = envNumber("UPLOAD_MAX_BYTES", 10 * 1024 * 1024);
      if (!extension || file.size > maxSize)
        return apiError("Use apenas JPG, PNG ou WEBP dentro do limite permitido.", 422);
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!validImageContent(file.type, bytes))
        return apiError("O conteúdo do arquivo não corresponde a uma imagem válida.", 422);
      storedKey = `${randomUUID()}${extension}`;
      await saveUpload(storedKey, bytes);
      const result = await processWhatsAppMessage({
        phone,
        displayName,
        provider: "SIMULATOR",
        providerMessageId: `sim-${randomUUID()}`,
        type: "image",
        media: {
          storageKey: storedKey,
          originalName: path.basename(file.name).slice(0, 240),
          contentType: file.type,
          sizeBytes: file.size,
        },
      });
      return NextResponse.json(result);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const type = body.type === "location" ? "location" : "text";
    const result = await processWhatsAppMessage({
      phone: String(body.phone ?? ""),
      displayName: String(body.displayName ?? ""),
      provider: "SIMULATOR",
      providerMessageId: `sim-${randomUUID()}`,
      type,
      text: typeof body.text === "string" ? body.text : null,
      latitude: typeof body.latitude === "string" ? body.latitude : null,
      longitude: typeof body.longitude === "string" ? body.longitude : null,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (storedKey) await deleteUpload(storedKey);
    return apiError(
      error instanceof Error ? error.message : "Não foi possível processar a mensagem.",
      422,
    );
  }
}

