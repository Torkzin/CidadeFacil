"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, CheckCircle2, Clock3, ClipboardList, Loader2, TimerReset } from "lucide-react";
import { toast } from "sonner";
import { CategoryChart } from "@/components/dashboard/dashboard-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ReportData = {
  summary: { total: number; concluded: number; open: number; completionRate: number; averageDays: number };
  byStatus: Array<{ name: string; value: number }>;
  byCategory: Array<{ name: string; value: number }>;
  byDepartment: Array<{ name: string; value: number }>;
  byNeighborhood: Array<{ name: string; value: number }>;
};

const periods = [
  { value: "month", label: "Mês atual" },
  { value: "quarter", label: "Trimestre atual" },
  { value: "year", label: "Ano atual" },
  { value: "all", label: "Todo o período" },
];

export function ReportCards() {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reports/requests?period=${period}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar os indicadores.");
        return response.json() as Promise<ReportData>;
      })
      .then(setData)
      .catch((error) => { if (error.name !== "AbortError") toast.error(error.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [period]);

  const metrics = data ? [
    { label: "Solicitações", value: data.summary.total.toLocaleString("pt-BR"), icon: ClipboardList, tone: "bg-cyan-50 text-cyan-700" },
    { label: "Em aberto", value: data.summary.open.toLocaleString("pt-BR"), icon: Clock3, tone: "bg-amber-50 text-amber-700" },
    { label: "Concluídas", value: data.summary.concluded.toLocaleString("pt-BR"), icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Taxa de conclusão", value: `${data.summary.completionRate}%`, icon: TimerReset, tone: "bg-violet-50 text-violet-700" },
  ] : [];

  return <div className="space-y-5">
    <Card className="shadow-none"><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-medium">Período de análise</p><p className="text-sm text-slate-500">Indicadores calculados diretamente a partir das solicitações registradas.</p></div><div className="flex flex-col gap-2 sm:flex-row"><Select value={period} onValueChange={(value) => { if (value) { setLoading(true); setPeriod(value); } }}><SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent>{periods.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select><Button variant="outline" render={<a href={`/api/reports/requests?period=${period}&format=csv`} download />} nativeButton={false}><ArrowDownToLine className="size-4" /> Exportar CSV</Button></div></CardContent></Card>
    {loading && !data ? <Card className="shadow-none"><CardContent className="flex min-h-52 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Calculando relatório...</CardContent></Card> : data && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <Card key={metric.label} className="gap-0 py-0 shadow-none"><CardContent className="p-5"><span className={`grid size-9 place-items-center rounded-lg ${metric.tone}`}><metric.icon className="size-[18px]" /></span><p className="mt-5 text-2xl font-semibold tracking-tight">{metric.value}</p><p className="mt-1 text-sm text-slate-500">{metric.label}</p></CardContent></Card>)}</div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="shadow-none"><CardHeader><CardTitle>Solicitações por categoria</CardTitle><p className="text-sm text-muted-foreground">Distribuição no período selecionado</p></CardHeader><CardContent><div className="h-[280px]">{data.byCategory.length ? <CategoryChart data={data.byCategory} /> : <Empty />}</div></CardContent></Card>
        <Card className="shadow-none"><CardHeader><CardTitle>Atendimento por secretaria</CardTitle><p className="text-sm text-muted-foreground">Carga registrada por órgão responsável</p></CardHeader><CardContent className="space-y-4">{data.byDepartment.length ? <Ranking items={data.byDepartment} /> : <Empty />}</CardContent></Card>
        <Card className="shadow-none"><CardHeader><CardTitle>Situação das solicitações</CardTitle><p className="text-sm text-muted-foreground">Volume por status operacional</p></CardHeader><CardContent className="space-y-4">{data.byStatus.length ? <Ranking items={data.byStatus} /> : <Empty />}</CardContent></Card>
        <Card className="shadow-none"><CardHeader><CardTitle>Bairros com mais registros</CardTitle><p className="text-sm text-muted-foreground">Concentração territorial das ocorrências</p></CardHeader><CardContent className="space-y-4">{data.byNeighborhood.length ? <Ranking items={data.byNeighborhood} /> : <Empty />}</CardContent></Card>
      </div>
      <p className="text-xs text-slate-400">Tempo médio das solicitações concluídas: {data.summary.averageDays.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias.</p>
    </>}
  </div>;
}

function Ranking({ items }: { items: Array<{ name: string; value: number }> }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return items.slice(0, 8).map((item) => <div key={item.name}><div className="mb-1.5 flex items-center justify-between text-sm"><span className="truncate pr-4 text-slate-600">{item.name}</span><strong>{item.value.toLocaleString("pt-BR")}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-700" style={{ width: `${item.value / max * 100}%` }} /></div></div>);
}

function Empty() {
  return <div className="grid h-full min-h-32 place-items-center text-sm text-slate-400">Nenhum registro no período.</div>;
}
