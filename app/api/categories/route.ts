import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { categories } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/server/api";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const items = await db.select({ id: categories.id, name: categories.name, color: categories.color }).from(categories)
    .where(eq(categories.municipalityId, user.municipalityId)).orderBy(categories.name);
  return NextResponse.json({ items });
}
