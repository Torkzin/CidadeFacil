export type CitizenAcceptanceOutcome = "Aceito" | "Problema persiste";

export function validateCitizenAcceptance(
  outcome: string,
  comment: string,
): string | null {
  if (outcome !== "Aceito" && outcome !== "Problema persiste")
    return "Informe se o serviço foi aceito ou se o problema persiste.";
  if (outcome === "Problema persiste" && comment.trim().length < 10)
    return "Descreva em pelo menos 10 caracteres o que ainda precisa ser resolvido.";
  return null;
}
