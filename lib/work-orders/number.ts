export function formatWorkOrderNumber(year: number, sequence: number) {
  return `OS-${year}-${String(sequence).padStart(6, "0")}`;
}
