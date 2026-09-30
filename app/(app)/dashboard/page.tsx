import Link from "next/link";
import { and, count, desc, eq, lt, notInArray, sql } from "drizzle-orm";
import { CheckCircle2, CircleAlert, Clock3, ClipboardList, Forward } from "lucide-react";
import { categories, requests } from "@/db/schema";
import { db } from "@/lib/db";
import { requireCurrentUser } from "@/lib/auth/session";
import { PageHeading } from "@/components/common/page-heading";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryChart, MonthlyChart, StatusChart } from "@/components/dashboard/dashboard-charts";
import { requestAccessCondition } from "@/lib/server/permissions";

const statusColors: Record<string, string> = { Aberta: "#f59e0b", Triagem: "#8b5cf6", Encaminhada: "#2563eb", "Em andamento": "#0891b2", Aguardando: "#f97316", Concluída: "#16a34a", Cancelada: "#64748b" };
const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const municipality = requestAccessCondition(user);
  const [totalRow, overdueRow, statusRows, categoryRows, monthRows, neighborhoodRows, recent] = await Promise.all([
    db.select({ value: count() }).from(requests).where(municipality),
    db.select({ value: count() }).from(requests).where(and(municipality, lt(requests.resolutionDueAt, new Date()), notInArray(requests.status, ["Concluída", "Cancelada"]))),
    db.select({ name: requests.status, value: count() }).from(requests).where(municipality).groupBy(requests.status),
    db.select({ name: categories.name, value: count() }).from(requests).innerJoin(categories, eq(categories.id, requests.categoryId)).where(municipality).groupBy(categories.name).orderBy(desc(count())),
    db.select({ month: sql<number>`extract(month from ${requests.createdAt})::int`, value: count() }).from(requests).where(and(municipality, sql`extract(year from ${requests.createdAt}) = extract(year from current_date)`)).groupBy(sql`extract(month from ${requests.createdAt})`).orderBy(sql`extract(month from ${requests.createdAt})`),
    db.select({ name: requests.neighborhood, value: count() }).from(requests).where(municipality).groupBy(requests.neighborhood).orderBy(desc(count())).limit(5),
    db.select({ id: requests.id, protocol: requests.protocol, title: requests.title, category: categories.name, neighborhood: requests.neighborhood, status: requests.status, createdAt: requests.createdAt }).from(requests).innerJoin(categories, eq(categories.id, requests.categoryId)).where(municipality).orderBy(desc(requests.createdAt)).limit(6),
  ]);
  const byStatus = Object.fromEntries(statusRows.map((entry) => [entry.name, Number(entry.value)]));
  const total = Number(totalRow[0]?.value ?? 0);
  const metrics = [
    { label: "Solicitações totais", value: total, icon: ClipboardList, tone: "bg-cyan-50 text-cyan-700" },
    { label: "Prazos vencidos", value: Number(overdueRow[0]?.value ?? 0), icon: CircleAlert, tone: "bg-rose-50 text-rose-700" },
    { label: "Encaminhadas", value: byStatus.Encaminhada ?? 0, icon: Forward, tone: "bg-blue-50 text-blue-700" },
    { label: "Em andamento", value: byStatus["Em andamento"] ?? 0, icon: Clock3, tone: "bg-indigo-50 text-indigo-700" },
    { label: "Concluídas", value: byStatus.Concluída ?? 0, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
  ];
  const statusData = statusRows.map((entry) => ({ name: entry.name, value: Number(entry.value), fill: statusColors[entry.name] }));
  const monthlyData = monthNames.map((month, index) => ({ month, requests: Number(monthRows.find((entry) => entry.month === index + 1)?.value ?? 0) }));
  const maxNeighborhood = Math.max(...neighborhoodRows.map((entry) => Number(entry.value)), 1);
  return <div className="space-y-6">
    <PageHeading title={user.role === "Equipe de campo" ? "Minhas solicitações" : "Visão Geral"} description={user.role === "Equipe de campo" ? "Demandas atribuídas à sua equipe, com prioridade para atendimentos em andamento e atrasados." : `Indicadores atualizados de ${user.municipalityName}.`} actions={user.role === "Equipe de campo" ? undefined : <Button render={<Link href="/relatorios" />} nativeButton={false} variant="outline">Gerar relatório</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{metrics.map((metric) => <Card key={metric.label} className="gap-0 py-0 shadow-none"><CardContent className="p-5"><span className={`grid size-9 place-items-center rounded-lg ${metric.tone}`}><metric.icon className="size-[18px]" /></span><p className="mt-5 text-2xl font-semibold tracking-tight">{metric.value.toLocaleString("pt-BR")}</p><p className="mt-1 text-sm text-slate-500">{metric.label}</p><p className="mt-3 border-t pt-3 text-[11px] text-slate-400">dados registrados no sistema</p></CardContent></Card>)}</div>
    <div className="grid gap-4 xl:grid-cols-12">
      <Card className="gap-4 shadow-none xl:col-span-7"><CardHeader><CardTitle>Solicitações por mês</CardTitle><p className="text-sm text-muted-foreground">Evolução no ano atual</p></CardHeader><CardContent><div className="h-[280px]"><MonthlyChart data={monthlyData} /></div></CardContent></Card>
      <Card className="gap-4 shadow-none xl:col-span-5"><CardHeader><CardTitle>Distribuição por status</CardTitle><p className="text-sm text-muted-foreground">Situação atual dos registros</p></CardHeader><CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr]"><div className="h-[210px]"><StatusChart data={statusData} total={total} /></div><div className="flex flex-col justify-center gap-3">{statusData.map((entry) => <div key={entry.name} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><span className="size-2 rounded-full" style={{ backgroundColor: entry.fill }} />{entry.name}</span><strong>{entry.value}</strong></div>)}</div></CardContent></Card>
      <Card className="gap-4 shadow-none xl:col-span-7"><CardHeader><CardTitle>Solicitações por categoria</CardTitle><p className="text-sm text-muted-foreground">Volume acumulado por tipo</p></CardHeader><CardContent><div className="h-[270px]"><CategoryChart data={categoryRows.map((entry) => ({ name: entry.name, value: Number(entry.value) }))} /></div></CardContent></Card>
      <Card className="gap-4 shadow-none xl:col-span-5"><CardHeader><CardTitle>Bairros com mais solicitações</CardTitle><p className="text-sm text-muted-foreground">Ranking acumulado</p></CardHeader><CardContent className="space-y-4">{neighborhoodRows.map((entry, index) => <div key={entry.name}><div className="mb-1.5 flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded bg-slate-100 text-[10px] font-semibold text-slate-500">{index + 1}</span>{entry.name}</span><strong>{Number(entry.value)}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-700" style={{ width: `${Number(entry.value) / maxNeighborhood * 100}%` }} /></div></div>)}</CardContent></Card>
    </div>
    <Card className="gap-0 overflow-hidden py-0 shadow-none"><CardHeader className="flex-row items-center justify-between border-b py-5"><div><CardTitle>Solicitações recentes</CardTitle><p className="mt-1 text-sm text-muted-foreground">Últimas ocorrências registradas</p></div><Button variant="ghost" render={<Link href="/solicitacoes" />} nativeButton={false} className="text-cyan-700">Ver todas</Button></CardHeader><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Protocolo</TableHead><TableHead>Solicitação</TableHead><TableHead>Categoria</TableHead><TableHead>Bairro</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead></TableRow></TableHeader><TableBody>{recent.map((entry) => <TableRow key={entry.id}><TableCell className="font-mono text-xs text-slate-500">{entry.protocol}</TableCell><TableCell><Link href={`/solicitacoes/${entry.id}`} className="font-medium hover:text-cyan-700">{entry.title}</Link></TableCell><TableCell>{entry.category}</TableCell><TableCell>{entry.neighborhood}</TableCell><TableCell><StatusBadge status={entry.status} /></TableCell><TableCell>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(entry.createdAt)}</TableCell></TableRow>)}</TableBody></Table></div></Card>
  </div>;
}
