import { and, eq, or } from "drizzle-orm";
import { requests } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/session";
import { requestAccessCondition } from "@/lib/server/permissions";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requestIdentity(municipalityId: string, key: string) {
  return and(
    eq(requests.municipalityId, municipalityId),
    uuidPattern.test(key)
      ? or(eq(requests.id, key), eq(requests.protocol, key))
      : eq(requests.protocol, key),
  );
}

export function accessibleRequestIdentity(user: CurrentUser, key: string) {
  return and(
    requestAccessCondition(user),
    uuidPattern.test(key)
      ? or(eq(requests.id, key), eq(requests.protocol, key))
      : eq(requests.protocol, key),
  );
}

export const requestSelection = {
  id: requests.id,
  protocol: requests.protocol,
  title: requests.title,
  description: requests.description,
  priority: requests.priority,
  status: requests.status,
  address: requests.address,
  addressNumber: requests.addressNumber,
  complement: requests.complement,
  neighborhood: requests.neighborhood,
  postalCode: requests.postalCode,
  latitude: requests.latitude,
  longitude: requests.longitude,
  citizenName: requests.citizenName,
  citizenPhone: requests.citizenPhone,
  citizenEmail: requests.citizenEmail,
  assignedToId: requests.assignedToId,
  assignedAt: requests.assignedAt,
  createdAt: requests.createdAt,
  updatedAt: requests.updatedAt,
  responseDueAt: requests.responseDueAt,
  resolutionDueAt: requests.resolutionDueAt,
  firstRespondedAt: requests.firstRespondedAt,
  concludedAt: requests.concludedAt,
  waitingReason: requests.waitingReason,
  cancellationReason: requests.cancellationReason,
  resolutionNote: requests.resolutionNote,
  reopenedAt: requests.reopenedAt,
};
