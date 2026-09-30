import { sql } from "drizzle-orm";
import {
  notifications,
  protocolSequences,
  requestHistory,
  requests,
} from "@/db/schema";
import { db } from "@/lib/db";
import { formatProtocol } from "@/lib/requests/protocol";
import { addHours } from "@/lib/requests/sla";
import { createPublicAccessToken } from "@/lib/security/public-token";
import type { RequestPriority } from "@/types";

export type CreateRequestInput = {
  municipalityId: string;
  actorUserId?: string | null;
  source: "ADMIN_PORTAL" | "CITIZEN_PORTAL" | "WHATSAPP" | "API" | "OTHER";
  title: string;
  description: string;
  categoryId: string;
  priority: RequestPriority;
  address: string;
  addressNumber?: string | null;
  complement?: string | null;
  neighborhood: string;
  postalCode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  citizenName: string;
  citizenPhone?: string | null;
  citizenEmail?: string | null;
  responseHours: number;
  resolutionHours: number;
  routingRuleName?: string | null;
};

export async function createRequest(input: CreateRequestInput) {
  const createdAt = new Date();
  const year = createdAt.getFullYear();
  const publicAccess =
    input.source === "CITIZEN_PORTAL" || input.source === "WHATSAPP"
      ? createPublicAccessToken()
      : null;
  const created = await db.transaction(async (tx) => {
    const [sequence] = await tx
      .insert(protocolSequences)
      .values({ municipalityId: input.municipalityId, year, lastValue: 1 })
      .onConflictDoUpdate({
        target: [protocolSequences.municipalityId, protocolSequences.year],
        set: { lastValue: sql`${protocolSequences.lastValue} + 1` },
      })
      .returning({ value: protocolSequences.lastValue });
    const protocol = formatProtocol(year, sequence.value);
    const [record] = await tx
      .insert(requests)
      .values({
        municipalityId: input.municipalityId,
        protocol,
        source: input.source,
        publicAccessTokenHash: publicAccess?.hash ?? null,
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        priority: input.priority,
        status: input.departmentId || input.teamId ? "Encaminhada" : "Aberta",
        address: input.address,
        addressNumber: input.addressNumber ?? null,
        complement: input.complement ?? null,
        neighborhood: input.neighborhood,
        postalCode: input.postalCode ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        departmentId: input.departmentId ?? null,
        teamId: input.teamId ?? null,
        citizenName: input.citizenName,
        citizenPhone: input.citizenPhone ?? null,
        citizenEmail: input.citizenEmail ?? null,
        createdBy: input.actorUserId ?? null,
        createdAt,
        updatedAt: createdAt,
        responseDueAt: addHours(createdAt, input.responseHours),
        resolutionDueAt: addHours(createdAt, input.resolutionHours),
      })
      .returning({
        id: requests.id,
        protocol: requests.protocol,
        status: requests.status,
        createdAt: requests.createdAt,
      });
    await tx.insert(requestHistory).values({
      requestId: record.id,
      userId: input.actorUserId ?? null,
      action: "Solicitação criada",
      note:
        input.source === "CITIZEN_PORTAL"
          ? "Registro recebido pelo Portal do Cidadão."
          : input.source === "WHATSAPP"
            ? "Registro recebido pelo atendimento oficial no WhatsApp."
            : "Registro criado no painel administrativo.",
    });
    if (input.routingRuleName) {
      await tx.insert(requestHistory).values({
        requestId: record.id,
        userId: input.actorUserId ?? null,
        action: "Encaminhamento automático",
        note: `Regra aplicada: ${input.routingRuleName}.`,
      });
    }
    if (input.actorUserId) {
      await tx.insert(notifications).values({
        municipalityId: input.municipalityId,
        userId: input.actorUserId,
        requestId: record.id,
        title: "Solicitação criada",
        description: `${record.protocol} foi registrada com sucesso.`,
      });
    }
    return record;
  });
  return { ...created, publicToken: publicAccess?.token };
}
