import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { serviceChecklistItems } from "@/db/schema";
import { db } from "@/lib/db";
import { audit } from "@/lib/server/audit";
import { apiError, requireAdminUser } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const user = await requireAdminUser();
  if (!user) return apiError("Acesso restrito a administradores.", 403);
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { title?: unknown; required?: boolean; active?: boolean } | null;
  if (!body) return apiError("Dados inválidos.", 422);
  const title = body.title === undefined ? undefined : inputText(body.title, 180);
  if (body.title !== undefined && !title) return apiError("Descrição inválida.", 422);
  const [updated] = await db.update(serviceChecklistItems).set({ ...(title !== undefined ? { title } : {}), ...(body.required !== undefined ? { required: body.required } : {}), ...(body.active !== undefined ? { active: body.active } : {}), updatedAt: new Date() }).where(and(eq(serviceChecklistItems.id, id), eq(serviceChecklistItems.municipalityId, user.municipalityId))).returning();
  if (!updated) return apiError("Item não encontrado.", 404);
  await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "service_checklist.updated", entityType: "service_checklist_item", entityId: id, metadata: { required: updated.required, active: updated.active } });
  return NextResponse.json({ item: updated });
}
