import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requestHistory, requests, workOrders, workOrderSignatures } from "@/db/schema";
import { db } from "@/lib/db";
import { audit } from "@/lib/server/audit";
import { apiError, requireApiUser } from "@/lib/server/api";
import { canChangeAssignment, canChangeStatus, requestAccessCondition } from "@/lib/server/permissions";

type Context = { params: Promise<{ id: string }> };
type SignatureRole = "Execução" | "Fiscalização";

export async function POST(request: Request, context: Context) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { role?: SignatureRole; accepted?: boolean } | null;
  if (!body?.accepted || !body.role || !["Execução", "Fiscalização"].includes(body.role)) return apiError("Confirme a declaração para registrar o aceite.");
  const role = body.role as SignatureRole;
  const [current] = await db.select({ order: workOrders, requestId: requests.id }).from(workOrders)
    .innerJoin(requests, eq(workOrders.requestId, requests.id))
    .where(and(eq(workOrders.id, id), requestAccessCondition(user))).limit(1);
  if (!current) return apiError("Ordem de serviço não encontrada.", 404);
  if (role === "Execução") {
    if (!canChangeStatus(user)) return apiError("Sem permissão para confirmar a execução.", 403);
    if (current.order.status !== "Em execução") return apiError("O aceite da equipe só pode ser registrado durante a execução.");
  } else {
    if (!canChangeAssignment(user)) return apiError("Somente gestores podem homologar a execução.", 403);
    if (current.order.status !== "Concluída") return apiError("A fiscalização só pode homologar uma OS concluída.");
  }
  const statement = role === "Execução"
    ? "Confirmo que as informações, materiais e evidências registradas correspondem ao serviço executado."
    : "Homologo a execução registrada nesta ordem de serviço após análise das informações e evidências.";
  try {
    const [signature] = await db.transaction(async (tx) => {
      const [created] = await tx.insert(workOrderSignatures).values({ workOrderId: id, role, signerId: user.id, signerName: user.name, signerRole: user.role, statement }).returning();
      await tx.insert(requestHistory).values({ requestId: current.requestId, userId: user.id, action: role === "Execução" ? "Execução confirmada eletronicamente" : "Ordem de serviço homologada", note: `${current.order.number} — ${user.name} (${user.role}).` });
      return [created];
    });
    await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: role === "Execução" ? "work_order.execution_accepted" : "work_order.inspection_approved", entityType: "work_order", entityId: id, metadata: { number: current.order.number, signerName: user.name, signerRole: user.role } });
    return NextResponse.json({ item: signature }, { status: 201 });
  } catch (error) {
    if (String(error).includes("idx_work_order_signatures_order_role")) return apiError("Este aceite já foi registrado e não pode ser substituído.", 409);
    throw error;
  }
}
