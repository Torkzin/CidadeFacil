import { apiError } from "@/lib/server/api";
import { processTwilioWebhook, validateTwilioWebhook } from "@/lib/whatsapp/twilio-sandbox";

export const maxDuration = 60;

function webhookUrl(request: Request) {
  return process.env.TWILIO_WHATSAPP_WEBHOOK_URL?.trim() || request.url;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const parameters: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") parameters[key] = value;
  }
  try {
    if (!validateTwilioWebhook(request.headers.get("x-twilio-signature"), webhookUrl(request), parameters)) {
      return apiError("Assinatura da Twilio inválida.", 401);
    }
    const xml = await processTwilioWebhook(parameters);
    return new Response(xml, {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (error) {
    console.error("Falha ao processar webhook da Twilio", error);
    return apiError(error instanceof Error ? error.message : "Não foi possível processar a mensagem.", 422);
  }
}
