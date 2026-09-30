import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { categories } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireAdminUser } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";
import { audit } from "@/lib/server/audit";

export async function GET() {
  const user = await requireAdminUser();
  if (!user) return apiError("Acesso restrito a administradores.", 403);
  const items = await db.select().from(categories).where(eq(categories.municipalityId, user.municipalityId)).orderBy(categories.name);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await requireAdminUser();
  if (!user) return apiError("Acesso restrito a administradores.", 403);
  const body = await request.json() as Record<string, unknown>;
  const name = inputText(body.name, 120);
  const color = inputText(body.color, 20);
  if (!name || !/^#[0-9a-f]{6}$/i.test(color)) return apiError("Informe nome e cor hexadecimal válidos.", 422);
  try {
    const [created] = await db.insert(categories).values({ municipalityId: user.municipalityId, name, color, publicEnabled: body.publicEnabled !== false }).returning();
    await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "CATEGORY_CREATED", entityType: "category", entityId: created.id, metadata: { publicEnabled: created.publicEnabled } });
    return NextResponse.json(created, { status: 201 });
  } catch { return apiError("Já existe uma categoria com esse nome.", 409); }
}
