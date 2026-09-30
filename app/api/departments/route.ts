import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { departments } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/server/api";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const items = await db.select({ id: departments.id, name: departments.name }).from(departments)
    .where(eq(departments.municipalityId, user.municipalityId)).orderBy(departments.name);
  return NextResponse.json({ items });
}
