import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, CircleAlert, Clock3, ClipboardList, TrendingUp } from "lucide-react";
import { PageHeading } from "@/components/common/page-heading";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryChart, MonthlyChart, StatusChart } from "@/components/dashboard/dashboard-charts";
import { neighborhoodRanking, requests, statusData } from "@/data/mock-data";

const metrics = [
  { label: "Solicitações totais", value: "1.428", change: "+12,5%", positive: true, icon: ClipboardList, tone: "bg-cyan-50 text-cyan-700" },
  { label: "Abertas", value: "174", change: "+8,2%", positive: false, icon: CircleAlert, tone: "bg-amber-50 text-amber-700" },
  { label: "Em andamento", value: "125", change: "+5,1%", positive: true, icon: Clock3, tone: "bg-blue-50 text-blue-700" },
  { label: "Concluídas", value: "1.129", change: "+14,3%", positive: true, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
  { label: "Atrasadas", value: "37", change: "-3,4%", positive: true, icon: TrendingUp, tone: "bg-rose-50 text-rose-700" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeading title="Visão Geral" description="Acompanhe as principais demandas e indicadores do município." actions={<Button render={<Link href="/relatorios" />} nativeButton={false} variant="outline">Gerar relatório</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => <Card key={metric.label} className="gap-0 py-0 shadow-none"><CardContent className="p-5"><div className="flex items-center justify-between"><span className={`grid size-9 place-items-center rounded-lg ${metric.tone}`}><metric.icon className="size-[18px]" /></span><span className={`flex items-center gap-0.5 text-xs font-medium ${metric.positive ? "text-emerald-600" : "text-rose-600"}`}>{metric.positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}{metric.change}</span></div><p className="mt-5 text-2xl font-semibold tracking-tight">{metric.value}</p><p className="mt-1 text-sm text-slate-500">{metric.label}</p><p className="mt-3 border-t pt-3 text-[11px] text-slate-400">em relação ao mês anterior</p></CardContent></Card>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="gap-4 shadow-none xl:col-span-7"><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Solicitações por mês</CardTitle><p className="mt-1 text-sm text-muted-foreground">Evolução mensal em 2026</p></div><span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">+18,7% no período</span></CardHeader><CardContent><div className="h-[280px]"><MonthlyChart /></div></CardContent></Card>
        <Card className="gap-4 shadow-none xl:col-span-5"><CardHeader><CardTitle>Distribuição por status</CardTitle><p className="text-sm text-muted-foreground">Situação atual dos registros</p></CardHeader><CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr]"><div className="h-[210px]"><StatusChart /></div><div className="flex flex-col justify-center gap-3">{statusData.map((item) => <div key={item.name} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><span className="size-2 rounded-full" style={{ backgroundColor: item.fill }} />{item.name}</span><strong>{item.value}</strong></div>)}</div></CardContent></Card>
        <Card className="gap-4 shadow-none xl:col-span-7"><CardHeader><CardTitle>Solicitações por categoria</CardTitle><p className="text-sm text-muted-foreground">Participação no volume total</p></CardHeader><CardContent><div className="h-[270px]"><CategoryChart /></div></CardContent></Card>
        <Card className="gap-4 shadow-none xl:col-span-5"><CardHeader><CardTitle>Bairros com mais solicitações</CardTitle><p className="text-sm text-muted-foreground">Ranking no mês atual</p></CardHeader><CardContent className="space-y-4">{neighborhoodRanking.map((item, index) => <div key={item.name}><div className="mb-1.5 flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded bg-slate-100 text-[10px] font-semibold text-slate-500">{index + 1}</span>{item.name}</span><strong>{item.value}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-700" style={{ width: `${(item.value / 184) * 100}%` }} /></div></div>)}</CardContent></Card>
      </div>
      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <CardHeader className="flex-row items-center justify-between border-b py-5"><div><CardTitle>Solicitações recentes</CardTitle><p className="mt-1 text-sm text-muted-foreground">Últimas ocorrências registradas</p></div><Button variant="ghost" render={<Link href="/solicitacoes" />} nativeButton={false} className="text-cyan-700">Ver todas <ArrowRight className="size-4" /></Button></CardHeader>
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Protocolo</TableHead><TableHead>Solicitação</TableHead><TableHead>Categoria</TableHead><TableHead>Bairro</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead></TableRow></TableHeader><TableBody>{requests.slice(0, 6).map((item) => <TableRow key={item.id}><TableCell className="font-mono text-xs text-slate-500">{item.protocol}</TableCell><TableCell><Link href={`/solicitacoes/${item.id}`} className="font-medium hover:text-cyan-700">{item.title}</Link></TableCell><TableCell className="text-slate-600">{item.category}</TableCell><TableCell className="text-slate-600">{item.neighborhood}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell><TableCell className="whitespace-nowrap text-slate-500">{item.date}</TableCell></TableRow>)}</TableBody></Table></div>
      </Card>
    </div>
  );
}
