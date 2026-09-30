import type { RequestPriority } from "@/types";

export const DEFAULT_SLA_HOURS: Record<RequestPriority, { responseHours: number; resolutionHours: number }> = {
  Baixa: { responseHours: 24, resolutionHours: 240 },
  Normal: { responseHours: 12, resolutionHours: 120 },
  Alta: { responseHours: 4, resolutionHours: 48 },
  Urgente: { responseHours: 1, resolutionHours: 12 },
};

export function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export type SlaState = "pending" | "near" | "overdue" | "met" | "late" | "cancelled";

export function calculateSlaState(dueAt: string | Date | null, completedAt: string | Date | null, cancelled = false, now = new Date()): SlaState {
  if (cancelled) return "cancelled";
  if (!dueAt) return "pending";
  const due = new Date(dueAt);
  if (completedAt) return new Date(completedAt) <= due ? "met" : "late";
  if (now > due) return "overdue";
  return due.getTime() - now.getTime() <= 24 * 60 * 60 * 1000 ? "near" : "pending";
}
