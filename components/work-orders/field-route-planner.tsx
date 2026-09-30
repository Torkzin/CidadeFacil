"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, MapPin, Navigation, Route, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { groupNearbyStops, routeDistanceKm } from "@/lib/work-orders/route-planning";
import { toLocalIsoDate } from "@/lib/work-orders/schedule";

type ApiOrder = {
  id: string;
  number: string;
  status: "Planejada" | "Em execução" | "Concluída" | "Cancelada";
  requestId: string;
  protocol: string;
  requestTitle: string;
  priority: string;
  category: string;
  address: string;
  addressNumber: string | null;
  neighborhood: string;
  latitude: string | null;
  longitude: string | null;
  teamId: string | null;
  team: string | null;
  plannedAt: string | null;
};

type Team = { id: string; name: string };
type Period = "all" | "today" | "tomorrow" | "week";

export type RouteStop = Omit<ApiOrder, "latitude" | "longitude"> & { latitude: number; longitude: number };

const RouteMap = dynamic(() => import("@/components/map/field-route-map-canvas").then((module) => module.FieldRouteMapCanvas), {
  ssr: false,
  loading: () => <div className="grid min-h-[620px] place-items-center bg-slate-100 text-sm text-slate-500"><span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Carregando mapa...</span></div>,
});

function withinPeriod(order: RouteStop, period: Period) {
  if (period === "all") return true;
  if (!order.plannedAt) return false;
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const value = new Date(order.plannedAt);
  if (period === "today") return toLocalIsoDate(value) === toLocalIsoDate(today);
  if (period === "tomorrow") return toLocalIsoDate(value) === toLocalIsoDate(tomorrow);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 23, 59, 59);
  return value >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) && value <= end;
}

function navigationUrl(stops: RouteStop[]) {
  if (stops.length === 1) return `https://www.google.com/maps/search/?api=1&query=${stops[0].latitude},${stops[0].longitude}`;
  const first = stops[0];
  const last = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1).map((stop) => `${stop.latitude},${stop.longitude}`).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${first.latitude},${first.longitude}&destination=${last.latitude},${last.longitude}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}&travelmode=driving`;
}

export function FieldRoutePlanner() {
  const [orders, setOrders] = useState<ApiOrder[] | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("all");
  const [period, setPeriod] = useState<Period>("all");
  const [radius, setRadius] = useState(2);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [selectedStopId, setSelectedStopId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [ordersResponse, teamsResponse] = await Promise.all([fetch("/api/work-orders", { cache: "no-store" }), fetch("/api/teams", { cache: "no-store" })]);
      const ordersPayload = await ordersResponse.json();
      const teamsPayload = await teamsResponse.json();
      if (!ordersResponse.ok) throw new Error(ordersPayload.error ?? "Não foi possível carregar as ordens.");
      if (!teamsResponse.ok) throw new Error(teamsPayload.error ?? "Não foi possível carregar as equipes.");
      setOrders(ordersPayload.items ?? []);
      setTeams(teamsPayload.items ?? []);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível montar os roteiros.");
    }
  }, []);

  useEffect(() => {
    // Synchronizes the route planner with protected operational data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const activeOrders = useMemo(() => (orders ?? []).filter((order) => !["Concluída", "Cancelada"].includes(order.status)), [orders]);
  const located = useMemo<RouteStop[]>(() => activeOrders.flatMap((order) => {
    const latitude = Number(order.latitude);
    const longitude = Number(order.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -22.9 || latitude > -22.6 || longitude < -43.9 || longitude > -43.5) return [];
    return [{ ...order, latitude, longitude }];
  }), [activeOrders]);
  const filtered = useMemo(() => located.filter((order) => (teamId === "all" || order.teamId === teamId) && withinPeriod(order, period)).sort((a, b) => (a.plannedAt ? new Date(a.plannedAt).getTime() : Number.MAX_SAFE_INTEGER) - (b.plannedAt ? new Date(b.plannedAt).getTime() : Number.MAX_SAFE_INTEGER)), [located, teamId, period]);
  const routes = useMemo(() => {
    const byTeam = new Map<string, RouteStop[]>();
    for (const order of filtered) {
      const key = order.teamId ?? "unassigned";
      byTeam.set(key, [...(byTeam.get(key) ?? []), order]);
    }
    return [...byTeam.values()].flatMap((teamOrders) => groupNearbyStops(teamOrders, radius)).sort((a, b) => b.length - a.length);
  }, [filtered, radius]);
  const routeIndex = Math.min(selectedRoute, Math.max(routes.length - 1, 0));
  const currentRoute = routes[routeIndex] ?? [];
  const selectedStop = currentRoute.find((stop) => stop.id === selectedStopId) ?? currentRoute[0];
  const missingLocation = activeOrders.filter((order) => !located.some((locatedOrder) => locatedOrder.id === order.id)).length;
  const totalDistance = routes.reduce((total, route) => total + routeDistanceKm(route), 0);

  function chooseRoute(index: number) {
    setSelectedRoute(index);
    setSelectedStopId(routes[index]?.[0]?.id ?? "");
  }

  if (error) return <Card className="border-rose-200 bg-rose-50 shadow-none"><CardContent className="p-6 text-rose-800">{error}</CardContent></Card>;
  if (!orders) return <Card className="shadow-none"><CardContent className="p-8 text-center text-slate-500">Carregando atendimentos ativos...</CardContent></Card>;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={MapPin} value={filtered.length} label="Paradas georreferenciadas" />
        <Metric icon={Route} value={routes.length} label="Roteiros sugeridos" />
        <Metric icon={Navigation} value={`${totalDistance.toFixed(1)} km`} label="Deslocamento entre paradas" />
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
        <Filter label="Equipe" value={teamId} onChange={(value) => { setTeamId(value); setSelectedRoute(0); }} options={[{ value: "all", label: "Todas as equipes" }, ...teams.map((team) => ({ value: team.id, label: team.name }))]} />
        <Filter label="Período" value={period} onChange={(value) => { setPeriod(value as Period); setSelectedRoute(0); }} options={[{ value: "all", label: "Todos os ativos" }, { value: "today", label: "Hoje" }, { value: "tomorrow", label: "Amanhã" }, { value: "week", label: "Próximos 7 dias" }]} />
        <Filter label="Proximidade" value={String(radius)} onChange={(value) => { setRadius(Number(value)); setSelectedRoute(0); }} options={[{ value: "1", label: "Até 1 km" }, { value: "2", label: "Até 2 km" }, { value: "3", label: "Até 3 km" }, { value: "5", label: "Até 5 km" }]} />
        {missingLocation > 0 && <p className="ml-auto text-xs text-amber-700">{missingLocation} atendimento(s) sem coordenadas não aparecem no roteiro.</p>}
      </div>
      {routes.length ? (
        <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-3">
            {routes.map((route, index) => (
              <Card key={`${route[0].teamId}-${route[0].id}`} className={`cursor-pointer shadow-none transition ${routeIndex === index ? "ring-2 ring-cyan-600" : "hover:bg-slate-50"}`} onClick={() => chooseRoute(index)}>
                <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-4 text-cyan-700" /> Roteiro {index + 1}<span className="ml-auto text-xs font-normal text-slate-500">{routeDistanceKm(route).toFixed(1)} km</span></CardTitle><p className="text-xs text-slate-500">{route[0].team ?? "Equipe não informada"} · {route.length} parada(s)</p></CardHeader>
                <CardContent className="space-y-2">
                  {route.map((stop, stopIndex) => <button key={stop.id} onClick={(event) => { event.stopPropagation(); chooseRoute(index); setSelectedStopId(stop.id); }} className={`flex w-full items-start gap-3 rounded-lg border p-2.5 text-left ${selectedStop?.id === stop.id && routeIndex === index ? "border-cyan-300 bg-cyan-50" : "bg-white"}`}><span className="grid size-6 shrink-0 place-items-center rounded-full bg-cyan-700 text-xs font-bold text-white">{stopIndex + 1}</span><span className="min-w-0"><strong className="block truncate text-xs">{stop.requestTitle}</strong><span className="mt-0.5 block truncate text-[11px] text-slate-500">{stop.neighborhood} · {stop.number}</span></span></button>)}
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="overflow-hidden py-0 shadow-none">
            <div className="relative min-h-[620px] bg-slate-100">
              <RouteMap stops={currentRoute} selectedId={selectedStop?.id ?? ""} onSelect={setSelectedStopId} />
              {selectedStop && <div className="absolute bottom-4 left-4 right-4 z-[500] rounded-xl border bg-white/95 p-4 shadow-lg backdrop-blur sm:right-auto sm:max-w-sm"><p className="font-semibold">{selectedStop.requestTitle}</p><p className="mt-1 text-xs text-slate-500">{selectedStop.address}{selectedStop.addressNumber ? `, ${selectedStop.addressNumber}` : ""} · {selectedStop.neighborhood}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" nativeButton={false} render={<Link href={`/solicitacoes/${selectedStop.requestId}`} />}>Abrir atendimento</Button><Button size="sm" variant="outline" nativeButton={false} render={<a href={navigationUrl(currentRoute)} target="_blank" rel="noreferrer" />}><ExternalLink className="size-3.5" /> Navegar rota</Button></div></div>}
            </div>
          </Card>
        </div>
      ) : <Card className="shadow-none"><CardContent className="flex flex-col items-center p-12 text-center"><Route className="mb-3 size-10 text-slate-300" /><p className="font-medium">Nenhum roteiro disponível</p><p className="mt-1 max-w-md text-sm text-slate-500">Não há ordens ativas com coordenadas para os filtros selecionados.</p></CardContent></Card>}
    </div>
  );
}

function Metric({ icon: Icon, value, label }: { icon: typeof MapPin; value: number | string; label: string }) {
  return <Card className="shadow-none"><CardContent className="flex items-center gap-3 p-4"><span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><Icon className="size-5" /></span><span><strong className="block text-xl">{value}</strong><span className="text-xs text-slate-500">{label}</span></span></CardContent></Card>;
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <label className="space-y-1 text-xs font-medium text-slate-600"><span className="block">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 min-w-44 rounded-lg border bg-white px-3 text-sm text-slate-800">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
