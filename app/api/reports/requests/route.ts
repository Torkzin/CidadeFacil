import { and, count, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { categories, departments, requests, teams } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/server/api";
import { requestAccessCondition } from "@/lib/server/permissions";

function periodStart(period: string) {
  const now = new Date();
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "quarter") return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return null;
}

function csvCell(value: unknown) {
  const content = value instanceof Date ? value.toISOString() : String(value ?? "");
  return `"${content.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const url = new URL(request.url);
  const period = url.searchParams.get("period") ?? "month";
  const start = periodStart(period);
  const conditions: SQL[] = [requestAccessCondition(user)];
  if (start) conditions.push(gte(requests.createdAt, start));
  const where = and(...conditions);
  const format = url.searchParams.get("format");

  if (format === "csv") {
    const rows = await db.select({
      protocol: requests.protocol,
      title: requests.title,
      category: categories.name,
      neighborhood: requests.neighborhood,
      department: departments.name,
      team: teams.name,
      priority: requests.priority,
      status: requests.status,
      createdAt: requests.createdAt,
      concludedAt: requests.concludedAt,
    }).from(requests)
      .innerJoin(categories, eq(categories.id, requests.categoryId))
      .leftJoin(departments, eq(departments.id, requests.departmentId))
      .leftJoin(teams, eq(teams.id, requests.teamId))
      .where(where).orderBy(desc(requests.createdAt));
    const header = ["Protocolo", "Título", "Categoria", "Bairro", "Secretaria", "Equipe", "Prioridade", "Status", "Criada em", "Concluída em"];
    const csv = [header, ...rows.map((row) => Object.values(row))].map((row) => row.map(csvCell).join(";")).join("\r\n");
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cidadefacil-solicitacoes-${period}.csv"`,
      },
    });
  }

  const [totalRows, concludedRows, statusRows, categoryRows, departmentRows, neighborhoodRows, averageRows] = await Promise.all([
    db.select({ value: count() }).from(requests).where(where),
    db.select({ value: count() }).from(requests).where(and(where, eq(requests.status, "Concluída"))),
    db.select({ name: requests.status, value: count() }).from(requests).where(where).groupBy(requests.status).orderBy(desc(count())),
    db.select({ name: categories.name, value: count() }).from(requests).innerJoin(categories, eq(categories.id, requests.categoryId)).where(where).groupBy(categories.name).orderBy(desc(count())),
    db.select({ name: departments.name, value: count() }).from(requests).leftJoin(departments, eq(departments.id, requests.departmentId)).where(where).groupBy(departments.name).orderBy(desc(count())),
    db.select({ name: requests.neighborhood, value: count() }).from(requests).where(where).groupBy(requests.neighborhood).orderBy(desc(count())).limit(8),
    db.select({ value: sql<number>`coalesce(avg(extract(epoch from (${requests.concludedAt} - ${requests.createdAt})) / 86400), 0)::float` }).from(requests).where(and(where, eq(requests.status, "Concluída"), lt(requests.createdAt, requests.concludedAt))),
  ]);
  const total = Number(totalRows[0]?.value ?? 0);
  const concluded = Number(concludedRows[0]?.value ?? 0);
  return NextResponse.json({
    period,
    summary: { total, concluded, open: total - concluded, completionRate: total ? Math.round(concluded / total * 100) : 0, averageDays: Number(averageRows[0]?.value ?? 0) },
    byStatus: statusRows.map((row) => ({ name: row.name, value: Number(row.value) })),
    byCategory: categoryRows.map((row) => ({ name: row.name, value: Number(row.value) })),
    byDepartment: departmentRows.map((row) => ({ name: row.name ?? "Sem secretaria", value: Number(row.value) })),
    byNeighborhood: neighborhoodRows.map((row) => ({ name: row.name, value: Number(row.value) })),
  });
}
