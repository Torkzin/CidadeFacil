import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { deleteUpload, saveUpload } from "@/lib/storage/local";
import { allowedImageTypes, validImageContent } from "@/lib/security/upload";
import { processWhatsAppMessage } from "@/lib/whatsapp/process-message";

type MetaMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string };
  location?: { latitude?: number; longitude?: number };
  interactive?: {
    button_reply?: { title?: string; id?: string };
    list_reply?: { title?: string; id?: string };
  };
  button?: { text?: string; payload?: string };
};

type MetaWebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        messages?: MetaMessage[];
      };
    }>;
  }>;
};

function requiredMetaEnvironment() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const version = process.env.WHATSAPP_GRAPH_VERSION;
  if (!token || !version)
    throw new Error("Credenciais do WhatsApp ainda não foram configuradas.");
  return { token, version };
}

export function verifyMetaWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
) {
  if (!signature?.startsWith("sha256=")) return false;
  const received = signature.slice("sha256=".length);
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (received.length !== expected.length || !/^[a-f0-9]{64}$/i.test(received))
    return false;
  return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}

async function downloadMetaImage(mediaId: string) {
  const { token, version } = requiredMetaEnvironment();
  const metadataResponse = await fetch(
    `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(mediaId)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!metadataResponse.ok) throw new Error("Não foi possível obter a foto do WhatsApp.");
  const metadata = (await metadataResponse.json()) as {
    url?: string;
    mime_type?: string;
    file_size?: number;
  };
  if (!metadata.url) throw new Error("O WhatsApp não retornou a URL da foto.");
  const response = await fetch(metadata.url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Não foi possível baixar a foto do WhatsApp.");
  const contentType = response.headers.get("content-type")?.split(";")[0] ?? metadata.mime_type ?? "";
  const extension = allowedImageTypes.get(contentType);
  const maxSize = Number(process.env.UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!extension || bytes.length > maxSize || !validImageContent(contentType, bytes))
    throw new Error("A imagem recebida pelo WhatsApp é inválida ou excede o limite.");
  const storageKey = `${randomUUID()}${extension}`;
  await saveUpload(storageKey, bytes);
  return {
    storageKey,
    originalName: `whatsapp-${mediaId}${extension}`,
    contentType,
    sizeBytes: bytes.length,
  };
}

async function sendMetaText(phoneNumberId: string, to: string, body: string) {
  const { token, version } = requiredMetaEnvironment();
  const response = await fetch(
    `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(phoneNumberId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body },
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Falha ao responder pelo WhatsApp (${response.status}): ${details.slice(0, 300)}`);
  }
}

function messageText(message: MetaMessage) {
  if (message.type === "text") return message.text?.body ?? "";
  if (message.type === "interactive")
    return (
      message.interactive?.button_reply?.title ??
      message.interactive?.list_reply?.title ??
      ""
    );
  if (message.type === "button") return message.button?.text ?? "";
  return "";
}

export async function processMetaWebhookPayload(payload: unknown) {
  const parsed = payload as MetaWebhookPayload;
  if (parsed.object !== "whatsapp_business_account") return;
  for (const entry of parsed.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (change.field !== "messages" || !value || !phoneNumberId) continue;
      for (const message of value.messages ?? []) {
        if (!message.from || !message.id) continue;
        const contact = value.contacts?.find((item) => item.wa_id === message.from) ?? value.contacts?.[0];
        let storedKey: string | null = null;
        try {
          const media =
            message.type === "image" && message.image?.id
              ? await downloadMetaImage(message.image.id)
              : null;
          storedKey = media?.storageKey ?? null;
          const type =
            message.type === "image"
              ? "image"
              : message.type === "location"
                ? "location"
                : "text";
          const result = await processWhatsAppMessage({
            phone: message.from,
            displayName: contact?.profile?.name,
            provider: "META_CLOUD",
            providerMessageId: message.id,
            type,
            text: messageText(message),
            latitude: message.location?.latitude?.toString(),
            longitude: message.location?.longitude?.toString(),
            media,
          });
          if (result.duplicate && storedKey) {
            await deleteUpload(storedKey);
            storedKey = null;
            continue;
          }
          // A partir daqui a imagem já pertence ao histórico da conversa ou à solicitação.
          storedKey = null;
          for (const reply of result.replies)
            await sendMetaText(phoneNumberId, message.from, reply.text);
        } catch (error) {
          if (storedKey) await deleteUpload(storedKey);
          console.error("Falha ao processar mensagem do WhatsApp", error);
        }
      }
    }
  }
}
