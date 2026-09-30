export function formatProtocol(year: number, value: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) throw new Error("Ano inválido.");
  if (!Number.isInteger(value) || value < 1) throw new Error("Sequência inválida.");
  return `${year}-${String(value).padStart(7, "0")}`;
}
