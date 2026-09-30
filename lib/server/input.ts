export function inputText(value: unknown, max = 240) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
