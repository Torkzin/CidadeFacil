export const COMMUNICATION_BODY_MAX_LENGTH = 2000;

export function validateCommunicationBody(value: unknown) {
  const body = typeof value === "string" ? value.trim() : "";
  if (body.length < 5) {
    return { body: "", error: "A mensagem deve ter pelo menos 5 caracteres." };
  }
  if (body.length > COMMUNICATION_BODY_MAX_LENGTH) {
    return {
      body: "",
      error: `A mensagem deve ter no máximo ${COMMUNICATION_BODY_MAX_LENGTH} caracteres.`,
    };
  }
  return { body, error: null };
}
