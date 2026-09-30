import "server-only";

import { randomUUID } from "node:crypto";
import twilio from "twilio";
import { allowedImageTypes, validImageContent } from "@/lib/security/upload";
import { deleteUpload, saveUpload } from "@/lib/storage/local";
import { processWhatsAppMessage } from "@/lib/whatsapp/process-message";
import { twilioMessagingResponse, twilioWhatsAppPhone } from "@/lib/whatsapp/twilio-format";

function requiredTwilioEnvironment() {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) throw new Error("Credenciais da Twilio ainda não foram configuradas.");
  return { authToken };
}

export function validateTwilioWebhook(
  signature: string | null,
  url: string,
  parameters: Record<string, string>,
) {
  if (!signature) return false;
  const { authToken } = requiredTwilioEnvironment();
  return twilio.validateRequest(authToken, signature, url, parameters);
}

async function downloadTwilioImage(urlValue: string, messageSid: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) throw new Error("Credenciais da Twilio ainda não foram configuradas.");
  const url = new URL(urlValue);
  if (url.protocol !== "https:" || (url.hostname !== "api.twilio.com" && !url.hostname.endsWith(".twilio.com"))) {
    throw new Error("URL de mídia da Twilio inválida.");
  }
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Não foi possível baixar a foto recebida pela Twilio.");
  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
  const extension = allowedImageTypes.get(contentType);
  const maxSize = Number(process.env.UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!extension || bytes.length > maxSize || !validImageContent(contentType, bytes)) {
    throw new Error("A imagem recebida pela Twilio é inválida ou excede o limite.");
  }
  const storageKey = `${randomUUID()}${extension}`;
  await saveUpload(storageKey, bytes);
  return {
    storageKey,
    originalName: `whatsapp-${messageSid}${extension}`,
    contentType,
    sizeBytes: bytes.length,
  };
}

export async function processTwilioWebhook(parameters: Record<string, string>) {
  const from = twilioWhatsAppPhone(parameters.From ?? parameters.WaId ?? "");
  const messageSid = parameters.MessageSid ?? parameters.SmsMessageSid ?? "";
  if (!from || !messageSid) throw new Error("Mensagem da Twilio sem remetente ou identificador.");

  const hasLocation = Boolean(parameters.Latitude && parameters.Longitude);
  const hasImage = Number(parameters.NumMedia ?? "0") > 0 && parameters.MediaContentType0?.startsWith("image/");
  let storedKey: string | null = null;
  try {
    const media = hasImage && parameters.MediaUrl0
      ? await downloadTwilioImage(parameters.MediaUrl0, messageSid)
      : null;
    storedKey = media?.storageKey ?? null;
    const result = await processWhatsAppMessage({
      phone: from,
      displayName: parameters.ProfileName,
      provider: "TWILIO_SANDBOX",
      providerMessageId: messageSid,
      type: hasImage ? "image" : hasLocation ? "location" : "text",
      text: parameters.Body ?? "",
      latitude: parameters.Latitude,
      longitude: parameters.Longitude,
      media,
    });
    if (result.duplicate && storedKey) await deleteUpload(storedKey);
    else storedKey = null;
    return twilioMessagingResponse(result.duplicate ? [] : result.replies.map((reply) => reply.text));
  } catch (error) {
    if (storedKey) await deleteUpload(storedKey);
    throw error;
  }
}
