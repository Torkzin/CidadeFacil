import { and, desc, eq, ilike, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { departments, requests, teams, users } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/server/api";
import { requestAccessCondition } from "@/lib/server/permissions";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (query.length < 2) return NextResponse.json({ items: [] });
  const term = `%${query}%`;
  const requestResults = await db.select({
    id: requests.id,
    protocol: requests.protocol,
    title: requests.title,
    neighborhood: requests.neighborhood,
    status: requests.status,
  }).from(requests).where(and(
    requestAccessCondition(user),
    or(ilike(requests.protocol, term), ilike(requests.title, term), ilike(requests.neighborhood, term)),
  )).orderBy(desc(requests.updatedAt)).limit(6);
  const items: Array<{ id: string; type: string; title: string; subtitle: string; href: string }> = requestResults.map((item) => ({
    id: item.id,
    type: "Solicitação",
    title: item.title,
    subtitle: `${item.protocol} · ${item.neighborhood} · ${item.status}`,
    href: `/solicitacoes/${item.id}`,
  }));
  if (user.role === "Administrador") {
    const [departmentResults, teamResults, userResults] = await Promise.all([
      db.select({ id: departments.id, name: departments.name, manager: departments.managerName }).from(departments)
        .where(and(eq(departments.municipalityId, user.municipalityId), ilike(departments.name, term))).limit(3),
      db.select({ id: teams.id, name: teams.name, status: teams.status }).from(teams)
        .where(and(eq(teams.municipalityId, user.municipalityId), ilike(teams.name, term))).limit(3),
      db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users)
        .where(and(eq(users.municipalityId, user.municipalityId), or(ilike(users.name, term), ilike(users.email, term)))).limit(3),
    ]);
    items.push(
      ...departmentResults.map((item) => ({ id: item.id, type: "Secretaria", title: item.name, subtitle: item.manager ?? "Gestor não informado", href: "/secretarias" })),
      ...teamResults.map((item) => ({ id: item.id, type: "Equipe", title: item.name, subtitle: item.status, href: "/equipes" })),
      ...userResults.map((item) => ({ id: item.id, type: "Usuário", title: item.name, subtitle: `${item.email} · ${item.role}`, href: "/usuarios" })),
    );
  }
  return NextResponse.json({ items });
}
