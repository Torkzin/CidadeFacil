import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { teams } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/server/api";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const items = await db.select({ id: teams.id, name: teams.name, departmentId: teams.departmentId }).from(teams)
    .where(eq(teams.municipalityId, user.municipalityId)).orderBy(teams.name);
  return NextResponse.json({ items });
}
