import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { departments, requests, teams } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireAdminUser } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";

export async function GET() {
  const user = await requireAdminUser();
  if (!user) return apiError("Acesso restrito a administradores.", 403);
  const items = await db.select({ id: departments.id, name: departments.name, managerName: departments.managerName,
    requests: sql<number>`(select count(*)::int from ${requests} r where r.department_id = ${departments.id})`,
    inProgress: sql<number>`(select count(*)::int from ${requests} r where r.department_id = ${departments.id} and r.status = 'Em andamento')`,
    teams: sql<number>`(select count(*)::int from ${teams} t where t.department_id = ${departments.id})`,
  }).from(departments).where(eq(departments.municipalityId, user.municipalityId)).orderBy(departments.name);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await requireAdminUser();
  if (!user) return apiError("Acesso restrito a administradores.", 403);
  const body = await request.json() as Record<string, unknown>;
  const name = inputText(body.name, 180); const managerName = inputText(body.managerName, 160);
  if (!name) return apiError("Informe o nome da secretaria.", 422);
  try {
    const [created] = await db.insert(departments).values({ municipalityId: user.municipalityId, name, managerName: managerName || null }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch { return apiError("Já existe uma secretaria com esse nome.", 409); }
}
