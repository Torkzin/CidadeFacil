import { and, asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { categories, serviceChecklistItems } from "@/db/schema";
import { db } from "@/lib/db";
import { audit } from "@/lib/server/audit";
import { apiError, requireAdminUser } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";

export async function GET(request: Request) {
  const user = await requireAdminUser();
  if (!user) return apiError("Acesso restrito a administradores.", 403);
  const categoryId = new URL(request.url).searchParams.get("categoryId");
  const items = await db.select().from(serviceChecklistItems).where(and(eq(serviceChecklistItems.municipalityId, user.municipalityId), categoryId ? eq(serviceChecklistItems.categoryId, categoryId) : undefined)).orderBy(asc(serviceChecklistItems.sortOrder), asc(serviceChecklistItems.createdAt));
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await requireAdminUser();
  if (!user) return apiError("Acesso restrito a administradores.", 403);
  const body = await request.json().catch(() => null) as { categoryId?: string; title?: unknown; required?: boolean } | null;
  const title = inputText(body?.title, 180);
  if (!body?.categoryId || !title) return apiError("Categoria e descrição são obrigatórias.", 422);
  const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, body.categoryId), eq(categories.municipalityId, user.municipalityId))).limit(1);
  if (!category) return apiError("Categoria não encontrada.", 404);
  const [last] = await db.select({ sortOrder: serviceChecklistItems.sortOrder }).from(serviceChecklistItems).where(and(eq(serviceChecklistItems.municipalityId, user.municipalityId), eq(serviceChecklistItems.categoryId, category.id))).orderBy(desc(serviceChecklistItems.sortOrder)).limit(1);
  try {
    const [created] = await db.insert(serviceChecklistItems).values({ municipalityId: user.municipalityId, categoryId: category.id, title, required: body.required !== false, sortOrder: (last?.sortOrder ?? 0) + 10 }).returning();
    await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "service_checklist.created", entityType: "service_checklist_item", entityId: created.id, metadata: { categoryId: category.id, required: created.required } });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch {
    return apiError("Já existe um item com essa descrição para a categoria.", 409);
  }
}
