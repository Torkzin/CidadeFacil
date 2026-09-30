import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { requests } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/session";

export function isAdministrator(user: CurrentUser) {
  return user.role === "Administrador";
}

export function canUseExecutivePanel(user: CurrentUser) {
  return ["Administrador", "Secretário", "Gestor"].includes(user.role);
}

export function requestAccessCondition(user: CurrentUser): SQL {
  const municipality = eq(requests.municipalityId, user.municipalityId);
  if (user.role === "Administrador") return municipality;
  if (user.role === "Equipe de campo") {
    return user.teamIds.length ? and(municipality, inArray(requests.teamId, user.teamIds))! : and(municipality, sql`false`)!;
  }
  return user.departmentId ? and(municipality, eq(requests.departmentId, user.departmentId))! : and(municipality, sql`false`)!;
}

export function canChangeAssignment(user: CurrentUser) {
  return ["Administrador", "Secretário", "Gestor"].includes(user.role);
}

export function canChangePriority(user: CurrentUser) {
  return ["Administrador", "Secretário", "Gestor"].includes(user.role);
}

export function canChangeStatus(user: CurrentUser) {
  return ["Administrador", "Secretário", "Gestor", "Servidor", "Equipe de campo"].includes(user.role);
}

