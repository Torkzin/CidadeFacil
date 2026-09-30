export function twilioWhatsAppPhone(value: string) {
  return value.replace(/^whatsapp:/i, "").replace(/^\+/, "");
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function twilioMessagingResponse(messages: string[]) {
  const content = messages
    .map((message) => `<Message><Body>${escapeXml(message)}</Body></Message>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${content}</Response>`;
}
