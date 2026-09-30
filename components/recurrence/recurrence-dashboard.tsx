"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Flame, Layers3, Loader2, MapPin, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RequestStatus } from "@/types";

export type HeatPoint = {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  neighborhood: string;
  topCategory: string;
};

export type RecurrenceGroup = {
  id: string;
  count: number;
  category: string;
  categoryColor: string;
  address: string;
  neighborhood: string;
  latitude: number | null;
  longitude: number | null;
  activeCount: number;
  lastOccurrenceAt: string;
  items: Array<{
    id: string;
    protocol: string;
    title: string;
    status: RequestStatus;
    createdAt: string;
  }>;
};

type Analysis = {
  groups: RecurrenceGroup[];
  heatPoints: HeatPoint[];
  summary: {
    totalOccurrences: number;
    recurrentGroups: number;
    recurrentOccurrences: number;
    activeRecurrences: number;
    neighborhoodsAffected: number;
  };
  generatedAt: string;
};

const HeatMapCanvas = dynamic(
  () => import("@/components/recurrence/recurrence-heat-map").then((module) => module.RecurrenceHeatMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[560px] place-items-center bg-slate-100 text-sm text-slate-500">
        <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Carregando mapa de calor...</span>
      </div>
    ),
  },
);

const emptyAnalysis: Analysis = {
  groups: [],
  heatPoints: [],
  summary: { totalOccurrences: 0, recurrentGroups: 0, recurrentOccurrences: 0, activeRecurrences: 0, neighborhoodsAffected: 0 },
  generatedAt: "",
};

const periodOptions = [
  { days: "30", label: "Últimos 30 dias" },
  { days: "90", label: "Últimos 90 dias" },
  { days: "365", label: "Últimos 12 meses" },
  { days: "all", label: "Todo o histórico" },
] as const;

export function RecurrenceDashboard() {
  const [analysis, setAnalysis] = useState<Analysis>(emptyAnalysis);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [days, setDays] = useState("90");
  const [categoryId, setCategoryId] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const parameters = new URLSearchParams({ days });
      if (categoryId !== "all") parameters.set("categoryId", categoryId);
      const response = await fetch(`/api/requests/recurrence?${parameters}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível analisar reincidências.");
      setAnalysis(data);
      setSelectedId((current) => data.groups.some((group: RecurrenceGroup) => group.id === current) ? current : (data.groups[0]?.id ?? ""));
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível analisar reincidências.");
    } finally {
      setLoading(false);
    }
  }, [categoryId, days]);

  useEffect(() => {
    fetch("/api/categories")
      .then((response) => response.json())
      .then((data) => setCategories(data.items ?? []))
      .catch(() => setCategories([]));
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const selected = useMemo(
    () => analysis.groups.find((group) => group.id === selectedId) ?? analysis.groups[0],
    [analysis.groups, selectedId],
  );
  const cards = [
    ["Ocorrências analisadas", analysis.summary.totalOccurrences, Layers3],
    ["Pontos reincidentes", analysis.summary.recurrentGroups, RotateCcw],
    ["Chamados ainda ativos", analysis.summary.activeRecurrences, TriangleAlert],
    ["Bairros afetados", analysis.summary.neighborhoodsAffected, MapPin],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
        <div className="min-w-48 space-y-1.5">
          <span className="text-xs font-medium text-slate-500">Período analisado</span>
          <Select
            value={periodOptions.find((option) => option.days === days)?.label ?? periodOptions[1].label}
            onValueChange={(value) => setDays(periodOptions.find((option) => option.label === value)?.days ?? "90")}
          >
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => <SelectItem key={option.days} value={option.label}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-60 flex-1 space-y-1.5">
          <span className="text-xs font-medium text-slate-500">Categoria</span>
          <Select
            value={categoryId === "all" ? "Todas as categorias" : (categories.find((category) => category.id === categoryId)?.name ?? "Todas as categorias")}
            onValueChange={(value) => setCategoryId(value === "Todas as categorias" ? "all" : (categories.find((category) => category.name === value)?.id ?? "all"))}
          >
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas as categorias">Todas as categorias</SelectItem>
              {categories.map((category) => <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <Card key={label} className="shadow-none"><CardContent className="flex items-center gap-4 p-5">
            <span className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-700"><Icon className="size-5" /></span>
            <div><p className="text-2xl font-semibold tracking-tight">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
          </CardContent></Card>
        ))}
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      <div className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
        <Card className="gap-0 overflow-hidden py-0 shadow-none">
          <CardHeader className="border-b py-4"><CardTitle className="flex items-center gap-2"><Flame className="size-4 text-orange-600" /> Locais reincidentes <span className="ml-auto rounded-full bg-orange-50 px-2 py-0.5 text-xs font-normal text-orange-700">{analysis.groups.length}</span></CardTitle></CardHeader>
          <CardContent className="max-h-[560px] space-y-2 overflow-y-auto p-3">
            {analysis.groups.map((group) => (
              <button key={group.id} onClick={() => setSelectedId(group.id)} className={`w-full rounded-xl border p-3 text-left transition ${selected?.id === group.id ? "border-orange-300 bg-orange-50" : "hover:bg-slate-50"}`}>
                <div className="flex items-start justify-between gap-3"><span className="text-sm font-semibold">{group.address}</span><span className="rounded-full bg-orange-600 px-2 py-0.5 text-xs font-semibold text-white">{group.count}×</span></div>
                <p className="mt-1 text-xs text-slate-500">{group.neighborhood} · {group.category}</p>
                <p className="mt-2 text-xs"><span className="font-medium text-amber-700">{group.activeCount} em atendimento</span> · última em {new Date(group.lastOccurrenceAt).toLocaleDateString("pt-BR")}</p>
              </button>
            ))}
            {!loading && !analysis.groups.length && <p className="p-8 text-center text-sm text-slate-500">Nenhuma reincidência encontrada neste recorte.</p>}
          </CardContent>
        </Card>
        <Card className="overflow-hidden py-0 shadow-none">
          <div className="relative min-h-[560px] bg-slate-100">
            <HeatMapCanvas points={analysis.heatPoints} groups={analysis.groups} selectedId={selected?.id ?? ""} onSelect={setSelectedId} />
            <div className="absolute left-4 top-4 z-[500] rounded-xl border bg-white/95 px-3 py-2 text-xs shadow-md backdrop-blur">
              <p className="font-medium">Intensidade</p><div className="mt-1 flex items-center gap-1"><span className="size-3 rounded-full bg-yellow-400" /><span>baixa</span><span className="mx-1 h-1.5 w-16 rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600" /><span>alta</span></div>
            </div>
          </div>
        </Card>
      </div>

      {selected && (
        <Card className="shadow-none"><CardHeader><CardTitle>Solicitações relacionadas em {selected.address}</CardTitle><p className="text-sm text-slate-500">Mesma categoria no mesmo endereço ou em um raio de até 200 metros.</p></CardHeader><CardContent className="grid gap-2 md:grid-cols-2">
          {selected.items.map((item) => (
            <Link key={item.id} href={`/solicitacoes/${item.id}`} className="flex items-center justify-between gap-3 rounded-xl border p-3 hover:bg-slate-50">
              <div className="min-w-0"><p className="font-mono text-xs text-slate-500">{item.protocol}</p><p className="mt-1 truncate text-sm font-medium">{item.title}</p></div><StatusBadge status={item.status} />
            </Link>
          ))}
        </CardContent></Card>
      )}
    </div>
  );
}
