import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { categories, requests } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireAdminUser } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";
import { audit } from "@/lib/server/audit";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser();
  if (!user) return apiError("Acesso restrito a administradores.", 403);
  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;
  const name = inputText(body.name, 120);
  const color = inputText(body.color, 20);
  if (!name || !/^#[0-9a-f]{6}$/i.test(color)) return apiError("Informe nome e cor hexadecimal válidos.", 422);
  const [updated] = await db.update(categories).set({ name, color, publicEnabled: body.publicEnabled !== false }).where(and(eq(categories.id, id), eq(categories.municipalityId, user.municipalityId))).returning();
  if (updated) await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "CATEGORY_UPDATED", entityType: "category", entityId: id, metadata: { publicEnabled: updated.publicEnabled } });
  return updated ? NextResponse.json(updated) : apiError("Categoria não encontrada.", 404);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser();
  if (!user) return apiError("Acesso restrito a administradores.", 403);
  const { id } = await params;
  const [usage] = await db.select({ value: count() }).from(requests).where(eq(requests.categoryId, id));
  if (Number(usage.value) > 0) return apiError("A categoria possui solicitações vinculadas e não pode ser excluída.", 409);
  const [deleted] = await db.delete(categories).where(and(eq(categories.id, id), eq(categories.municipalityId, user.municipalityId))).returning({ id: categories.id });
  if (!deleted) return apiError("Categoria não encontrada.", 404);
  await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "CATEGORY_DELETED", entityType: "category", entityId: id });
  return NextResponse.json({ success: true });
}
