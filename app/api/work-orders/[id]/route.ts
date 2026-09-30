import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requestHistory, requests, serviceChecklistItems, workOrderAttachments, workOrderChecklistCompletions, workOrders, workOrderSignatures } from "@/db/schema";
import { db } from "@/lib/db";
import { audit } from "@/lib/server/audit";
import { apiError, requireApiUser } from "@/lib/server/api";
import { canChangeAssignment, canChangeStatus, requestAccessCondition } from "@/lib/server/permissions";
import { canTransitionWorkOrder, type WorkOrderStatus, workOrderChecklistError, workOrderCompletionError } from "@/lib/work-orders/workflow";
import { resolveRequestGroup } from "@/lib/server/request-relations";
import { queueRequestWhatsAppMessage } from "@/lib/whatsapp/notifications";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { status?: WorkOrderStatus; completionNote?: string; plannedAt?: string | null } | null;
  if (!body || (body.status === undefined && body.plannedAt === undefined)) return apiError("Informe o status ou a nova data de planejamento.");
  const [current] = await db.select({ order: workOrders, request: requests }).from(workOrders)
    .innerJoin(requests, eq(workOrders.requestId, requests.id))
    .where(and(eq(workOrders.id, id), requestAccessCondition(user))).limit(1);
  if (!current) return apiError("Ordem de serviço não encontrada.", 404);
  const collective = await resolveRequestGroup(current.request.id);
  if (!collective.isPrimary)
    return apiError("Esta OS pertence a um protocolo relacionado. Execute o atendimento pelo protocolo principal.", 422);
  if (body.status !== undefined && !canChangeStatus(user)) return apiError("Sem permissão para movimentar a OS.", 403);
  if (body.plannedAt !== undefined && !canChangeAssignment(user)) return apiError("Sem permissão para reagendar a OS.", 403);
  if (body.plannedAt !== undefined && current.order.status !== "Planejada") return apiError("Somente ordens planejadas podem ser reagendadas.");
  if (body.status !== undefined && !canTransitionWorkOrder(current.order.status, body.status)) return apiError("Transição de status não permitida.");
  if (body.status === "Em execução" && !current.order.teamId) return apiError("Atribua uma equipe antes de iniciar a OS.");
  const plannedAt = body.plannedAt === undefined ? current.order.plannedAt : body.plannedAt ? new Date(body.plannedAt) : null;
  if (plannedAt && Number.isNaN(plannedAt.getTime())) return apiError("Data de planejamento inválida.");
  const completionNote = body.completionNote?.trim() || null;
  if (body.status === "Concluída") {
    const evidence = await db.select({ id: workOrderAttachments.id }).from(workOrderAttachments)
      .where(and(eq(workOrderAttachments.workOrderId, id), eq(workOrderAttachments.phase, "Depois")));
    const [acceptance] = await db.select({ id: workOrderSignatures.id }).from(workOrderSignatures)
      .where(and(eq(workOrderSignatures.workOrderId, id), eq(workOrderSignatures.role, "Execução"))).limit(1);
    const completionError = workOrderCompletionError(completionNote, evidence.length, Boolean(acceptance));
    if (completionError) return apiError(completionError);
    const requiredItems = await db.select({ id: serviceChecklistItems.id }).from(serviceChecklistItems)
      .where(and(eq(serviceChecklistItems.municipalityId, user.municipalityId), eq(serviceChecklistItems.categoryId, current.request.categoryId), eq(serviceChecklistItems.active, true), eq(serviceChecklistItems.required, true)));
    const completedRequired = requiredItems.length ? await db.select({ id: workOrderChecklistCompletions.checklistItemId }).from(workOrderChecklistCompletions)
      .where(and(eq(workOrderChecklistCompletions.workOrderId, id), eq(workOrderChecklistCompletions.workOrderId, current.order.id))) : [];
    const completedRequiredIds = new Set(completedRequired.map((item) => item.id));
    const checklistError = workOrderChecklistError(requiredItems.length, requiredItems.filter((item) => completedRequiredIds.has(item.id)).length);
    if (checklistError) return apiError(checklistError);
  }
  const now = new Date();
  const [updated] = await db.transaction(async (tx) => {
    const nextStatus = body.status ?? current.order.status;
    const [order] = await tx.update(workOrders).set({
      status: nextStatus,
      plannedAt,
      startedAt: body.status === "Em execução" ? current.order.startedAt ?? now : current.order.startedAt,
      completedAt: body.status === "Concluída" ? now : current.order.completedAt,
      completionNote: body.status === "Concluída" ? completionNote : current.order.completionNote,
      updatedAt: now,
    }).where(eq(workOrders.id, id)).returning();
    const requestStatus = body.status === "Em execução" ? "Em andamento" : body.status === "Concluída" ? "Concluída" : null;
    if (requestStatus) {
      await tx.update(requests).set({
        status: requestStatus,
        firstRespondedAt: current.request.firstRespondedAt ?? now,
        concludedAt: requestStatus === "Concluída" ? now : current.request.concludedAt,
        resolutionNote: requestStatus === "Concluída" ? completionNote : current.request.resolutionNote,
        updatedAt: now,
      }).where(inArray(requests.id, collective.memberIds));
    }
    await tx.insert(requestHistory).values({
      requestId: current.request.id,
      userId: user.id,
      action: body.status === undefined ? "Ordem de serviço reagendada" : body.status === "Em execução" ? "Execução da OS iniciada" : body.status === "Concluída" ? "Ordem de serviço concluída" : "Ordem de serviço cancelada",
      note: body.status === undefined ? `${order.number} planejada para ${plannedAt ? plannedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "data a definir"}.` : body.status === "Concluída" ? `${order.number}: ${completionNote}` : order.number,
    });
    if (collective.memberIds.length > 1 && requestStatus) {
      await tx.insert(requestHistory).values(collective.memberIds.filter((requestId) => requestId !== current.request.id).map((requestId) => ({
        requestId,
        userId: user.id,
        action: "Atualização da ocorrência coletiva",
        note: `${current.request.protocol}: ${requestStatus === "Concluída" ? `serviço concluído — ${completionNote}` : "execução iniciada"}.`,
      })));
    }
    return [order];
  });
  await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: body.status !== undefined ? "work_order.status_changed" : "work_order.rescheduled", entityType: "work_order", entityId: id, metadata: body.status !== undefined ? { from: current.order.status, to: body.status } : { from: current.order.plannedAt?.toISOString() ?? null, to: plannedAt?.toISOString() ?? null } });
  if (body.status === "Em execução" || body.status === "Concluída") {
    const concluded = body.status === "Concluída";
    try {
      await queueRequestWhatsAppMessage({
        requestId: current.request.id,
        body: [
          `Atualização do protocolo *${current.request.protocol}*`,
          "",
          `Status: *${concluded ? "Concluída" : "Em andamento"}*`,
          concluded && completionNote ? `Solução: ${completionNote}` : null,
          "",
          concluded
            ? "O atendimento foi concluído. Responda com uma nota de 1 a 5 para avaliar o serviço."
            : "A equipe iniciou a execução do serviço.",
        ]
          .filter(Boolean)
          .join("\n"),
        ...(concluded
          ? {
              nextState: "RATING_SCORE" as const,
              draft: {
                requestId: current.request.id,
                protocol: current.request.protocol,
              },
              onlyWhenStateIsMenu: true,
            }
          : {}),
      });
    } catch (error) {
      console.error("Falha ao registrar atualização da OS no WhatsApp", error);
    }
  }
  return NextResponse.json({ item: updated });
}
