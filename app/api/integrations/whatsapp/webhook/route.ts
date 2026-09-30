import { after } from "next/server";
import { apiError } from "@/lib/server/api";
import {
  processMetaWebhookPayload,
  verifyMetaWebhookSignature,
} from "@/lib/whatsapp/meta-cloud";

export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge") ?? "";
  const configuredToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!configuredToken) return apiError("Webhook do WhatsApp não configurado.", 503);
  if (mode !== "subscribe" || token !== configuredToken)
    return apiError("Verificação do webhook recusada.", 403);
  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return apiError("Webhook do WhatsApp não configurado.", 503);
  const rawBody = await request.text();
  if (
    !verifyMetaWebhookSignature(
      rawBody,
      request.headers.get("x-hub-signature-256"),
      appSecret,
    )
  )
    return apiError("Assinatura do webhook inválida.", 401);
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return apiError("Payload inválido.", 400);
  }
  after(() => processMetaWebhookPayload(payload));
  return Response.json({ received: true });
}

