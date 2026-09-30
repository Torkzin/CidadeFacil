export const WHATSAPP_MENU = [
  "Olá! Sou o atendimento digital do CidadeFácil. Como posso ajudar?",
  "",
  "1 — Abrir uma solicitação",
  "2 — Acompanhar uma solicitação",
  "3 — Enviar foto para uma solicitação",
  "4 — Falar com um atendente",
  "5 — Responder uma pendência",
  "6 — Avaliar um atendimento",
  "",
  "Digite o número da opção desejada.",
].join("\n");

export type WhatsAppState =
  | "MENU"
  | "OPEN_NAME"
  | "OPEN_CATEGORY"
  | "OPEN_DESCRIPTION"
  | "OPEN_ADDRESS"
  | "OPEN_NEIGHBORHOOD"
  | "OPEN_LOCATION"
  | "OPEN_PHOTOS"
  | "OPEN_CONFIRM"
  | "TRACK_PROTOCOL"
  | "PHOTO_PROTOCOL"
  | "PHOTO_UPLOAD"
  | "REPLY_PROTOCOL"
  | "REPLY_TEXT"
  | "RATING_PROTOCOL"
  | "RATING_SCORE"
  | "RATING_COMMENT"
  | "HUMAN_HANDOFF";

export type PendingWhatsAppMedia = {
  storageKey: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
};

export type WhatsAppDraft = {
  citizenName?: string;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  address?: string;
  neighborhood?: string;
  latitude?: string;
  longitude?: string;
  protocol?: string;
  requestId?: string;
  rating?: number;
  photos?: PendingWhatsAppMedia[];
};

export function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function normalizeProtocol(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function parseMenuChoice(value: string) {
  const normalized = value.trim().toLocaleLowerCase("pt-BR");
  if (normalized === "1" || normalized.includes("abrir")) return "OPEN";
  if (
    normalized === "2" ||
    normalized.includes("acompanhar") ||
    normalized.includes("consultar")
  )
    return "TRACK";
  if (normalized === "3" || normalized.includes("foto")) return "PHOTO";
  if (
    normalized === "4" ||
    normalized.includes("atendente") ||
    normalized.includes("humano")
  )
    return "HUMAN";
  if (
    normalized === "5" ||
    normalized.includes("pendência") ||
    normalized.includes("pendencia") ||
    normalized.includes("complementa")
  )
    return "REPLY";
  if (
    normalized === "6" ||
    normalized.includes("avaliar") ||
    normalized.includes("avaliação") ||
    normalized.includes("avaliacao")
  )
    return "RATING";
  return null;
}

export function isMenuCommand(value: string) {
  return ["menu", "início", "inicio", "cancelar", "sair"].includes(
    value.trim().toLocaleLowerCase("pt-BR"),
  );
}

export function isFinishPhotosCommand(value: string) {
  return ["finalizar", "continuar", "pronto", "sem foto", "não", "nao"].includes(
    value.trim().toLocaleLowerCase("pt-BR"),
  );
}

export function isConfirmation(value: string) {
  return ["confirmar", "confirmo", "sim", "ok", "1"].includes(
    value.trim().toLocaleLowerCase("pt-BR"),
  );
}

export function isExplicitConfirmation(value: string) {
  return ["confirmar", "confirmo"].includes(
    value.trim().toLocaleLowerCase("pt-BR"),
  );
}

export function parseDraft(value: string): WhatsAppDraft {
  try {
    const parsed = JSON.parse(value) as WhatsAppDraft;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
