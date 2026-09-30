import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  departments,
  categories,
  requests,
  requestHistory,
  teams,
  users,
  workOrderMaterials,
  workOrderAttachments,
  workOrders,
  workOrderSequences,
  workOrderSignatures,
} from "@/db/schema";
import { db } from "@/lib/db";
import { audit } from "@/lib/server/audit";
import { apiError, requireApiUser } from "@/lib/server/api";
import { canChangeAssignment, requestAccessCondition } from "@/lib/server/permissions";
import { formatWorkOrderNumber } from "@/lib/work-orders/number";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const requestId = new URL(request.url).searchParams.get("requestId");
  const rows = await db
    .select({
      id: workOrders.id,
      number: workOrders.number,
      status: workOrders.status,
      requestId: workOrders.requestId,
      protocol: requests.protocol,
      requestTitle: requests.title,
      requestDescription: requests.description,
      priority: requests.priority,
      category: categories.name,
      address: requests.address,
      addressNumber: requests.addressNumber,
      complement: requests.complement,
      neighborhood: requests.neighborhood,
      latitude: requests.latitude,
      longitude: requests.longitude,
      departmentId: workOrders.departmentId,
      department: departments.name,
      teamId: workOrders.teamId,
      team: teams.name,
      assignee: users.name,
      plannedAt: workOrders.plannedAt,
      startedAt: workOrders.startedAt,
      completedAt: workOrders.completedAt,
      notes: workOrders.notes,
      completionNote: workOrders.completionNote,
      createdAt: workOrders.createdAt,
    })
    .from(workOrders)
    .innerJoin(requests, eq(workOrders.requestId, requests.id))
    .innerJoin(categories, eq(requests.categoryId, categories.id))
    .leftJoin(departments, eq(workOrders.departmentId, departments.id))
    .leftJoin(teams, eq(workOrders.teamId, teams.id))
    .leftJoin(users, eq(workOrders.assignedToId, users.id))
    .where(and(requestAccessCondition(user), requestId ? eq(workOrders.requestId, requestId) : undefined))
    .orderBy(desc(workOrders.createdAt));

  const items = await Promise.all(rows.map(async (row) => {
    const [materials, attachments, signatures] = await Promise.all([
      db.select().from(workOrderMaterials).where(eq(workOrderMaterials.workOrderId, row.id)),
      db.select({ id: workOrderAttachments.id, phase: workOrderAttachments.phase, originalName: workOrderAttachments.originalName, contentType: workOrderAttachments.contentType, sizeBytes: workOrderAttachments.sizeBytes, createdAt: workOrderAttachments.createdAt }).from(workOrderAttachments).where(eq(workOrderAttachments.workOrderId, row.id)).orderBy(workOrderAttachments.createdAt),
      db.select({ id: workOrderSignatures.id, role: workOrderSignatures.role, signerName: workOrderSignatures.signerName, signerRole: workOrderSignatures.signerRole, statement: workOrderSignatures.statement, signedAt: workOrderSignatures.signedAt }).from(workOrderSignatures).where(eq(workOrderSignatures.workOrderId, row.id)).orderBy(workOrderSignatures.signedAt),
    ]);
    return { ...row, materials, attachments, signatures };
  }));
  return NextResponse.json({ items, permissions: { canCreate: canChangeAssignment(user), canSchedule: canChangeAssignment(user), canOperate: true } });
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  if (!canChangeAssignment(user)) return apiError("Sem permissão para criar ordem de serviço.", 403);
  const body = await request.json().catch(() => null) as { requestId?: string; plannedAt?: string; notes?: string } | null;
  if (!body?.requestId) return apiError("Solicitação obrigatória.");

  const [source] = await db.select().from(requests)
    .where(and(requestAccessCondition(user), eq(requests.id, body.requestId))).limit(1);
  if (!source) return apiError("Solicitação não encontrada.", 404);
  if (["Concluída", "Cancelada"].includes(source.status)) return apiError("Não é possível criar OS para uma solicitação encerrada.");
  if (!source.departmentId || !source.teamId) return apiError("Encaminhe a solicitação e atribua uma equipe antes de criar a OS.");
  const plannedAt = body.plannedAt ? new Date(body.plannedAt) : null;
  if (plannedAt && Number.isNaN(plannedAt.getTime())) return apiError("Data de planejamento inválida.");

  try {
    const created = await db.transaction(async (tx) => {
      const year = new Date().getFullYear();
      const [sequence] = await tx.insert(workOrderSequences)
        .values({ municipalityId: user.municipalityId, year, lastValue: 1 })
        .onConflictDoUpdate({
          target: [workOrderSequences.municipalityId, workOrderSequences.year],
          set: { lastValue: sql`${workOrderSequences.lastValue} + 1` },
        }).returning({ value: workOrderSequences.lastValue });
      const [record] = await tx.insert(workOrders).values({
        municipalityId: user.municipalityId,
        requestId: source.id,
        number: formatWorkOrderNumber(year, sequence.value),
        departmentId: source.departmentId,
        teamId: source.teamId,
        assignedToId: source.assignedToId,
        plannedAt,
        notes: body.notes?.trim() || null,
        createdBy: user.id,
      }).returning();
      await tx.insert(requestHistory).values({
        requestId: source.id,
        userId: user.id,
        action: "Ordem de serviço criada",
        note: `${record.number} criada para execução pela equipe responsável.`,
      });
      return record;
    });
    await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "work_order.created", entityType: "work_order", entityId: created.id, metadata: { number: created.number, requestId: source.id } });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    if (String(error).includes("idx_work_orders_request_id")) return apiError("Esta solicitação já possui uma ordem de serviço.", 409);
    throw error;
  }
}
