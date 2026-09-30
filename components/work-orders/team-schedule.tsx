"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, Clock3, Save, Users, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildMonthGrid, toDateTimeLocal, toLocalIsoDate } from "@/lib/work-orders/schedule";

type Order = {
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
  departmentId: string | null;
  department: string | null;
  teamId: string | null;
  team: string | null;
  assignee: string | null;
  plannedAt: string | null;
};

type Team = { id: string; name: string; departmentId: string };

const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const dayFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" });
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

function statusStyle(status: Order["status"]) {
  if (status === "Concluída") return "bg-emerald-100 text-emerald-800";
  if (status === "Em execução") return "bg-cyan-100 text-cyan-800";
  if (status === "Cancelada") return "bg-slate-100 text-slate-500";
  return "bg-amber-100 text-amber-800";
}

export function TeamSchedule() {
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => toLocalIsoDate(today));
  const [teamId, setTeamId] = useState("all");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [canSchedule, setCanSchedule] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [plannedAt, setPlannedAt] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [ordersResponse, teamsResponse] = await Promise.all([
        fetch("/api/work-orders", { cache: "no-store" }),
        fetch("/api/teams", { cache: "no-store" }),
      ]);
      const ordersPayload = await ordersResponse.json();
      const teamsPayload = await teamsResponse.json();
      if (!ordersResponse.ok) throw new Error(ordersPayload.error ?? "Não foi possível carregar a agenda.");
      if (!teamsResponse.ok) throw new Error(teamsPayload.error ?? "Não foi possível carregar as equipes.");
      setOrders(ordersPayload.items ?? []);
      setTeams(teamsPayload.items ?? []);
      setCanSchedule(Boolean(ordersPayload.permissions?.canSchedule));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar a agenda.");
    }
  }, []);

  useEffect(() => {
    // The callback synchronizes the client calendar with the server APIs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const filteredOrders = useMemo(
    () => (orders ?? []).filter((order) => teamId === "all" || order.teamId === teamId),
    [orders, teamId],
  );
  const days = useMemo(() => buildMonthGrid(month.getFullYear(), month.getMonth()), [month]);
  const scheduledByDay = useMemo(() => {
    const grouped = new Map<string, Order[]>();
    for (const order of filteredOrders) {
      if (!order.plannedAt) continue;
      const key = toLocalIsoDate(new Date(order.plannedAt));
      grouped.set(key, [...(grouped.get(key) ?? []), order]);
    }
    for (const items of grouped.values()) items.sort((a, b) => new Date(a.plannedAt!).getTime() - new Date(b.plannedAt!).getTime());
    return grouped;
  }, [filteredOrders]);
  const selectedOrders = scheduledByDay.get(selectedDate) ?? [];
  const unscheduled = filteredOrders.filter((order) => !order.plannedAt && order.status === "Planejada");

  function changeMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelectedDate(toLocalIsoDate(next));
    setEditingId(null);
  }

  function startEditing(order: Order, defaultDate?: string) {
    setEditingId(order.id);
    setPlannedAt(order.plannedAt ? toDateTimeLocal(order.plannedAt) : `${defaultDate ?? selectedDate}T08:00`);
  }

  async function saveSchedule(order: Order) {
    if (!plannedAt) return toast.error("Informe a data e o horário do serviço.");
    setSaving(true);
    try {
      const response = await fetch(`/api/work-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plannedAt: new Date(plannedAt).toISOString() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível reagendar a ordem.");
      setEditingId(null);
      await load();
      toast.success("Ordem de serviço reagendada.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Não foi possível reagendar a ordem.");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <Card className="border-rose-200 bg-rose-50 shadow-none"><CardContent className="p-6 text-rose-800">{error}</CardContent></Card>;
  if (!orders) return <Card className="shadow-none"><CardContent className="p-6 text-slate-500">Carregando agenda operacional...</CardContent></Card>;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Programadas no mês" value={days.filter((day) => day.inCurrentMonth).reduce((total, day) => total + (scheduledByDay.get(day.isoDate)?.length ?? 0), 0)} icon={CalendarClock} />
        <Metric label="Em execução" value={filteredOrders.filter((order) => order.status === "Em execução").length} icon={Wrench} />
        <Metric label="Aguardando agenda" value={unscheduled.length} icon={Clock3} />
      </div>

      <Card className="shadow-none">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="capitalize">{monthFormatter.format(month)}</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Selecione um dia para ver os atendimentos programados.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="team-filter">Filtrar por equipe</label>
              <select id="team-filter" value={teamId} onChange={(event) => setTeamId(event.target.value)} className="h-9 min-w-44 rounded-lg border bg-white px-3 text-sm">
                <option value="all">Todas as equipes</option>
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
              <Button variant="outline" size="icon" onClick={() => changeMonth(-1)} aria-label="Mês anterior"><ChevronLeft className="size-4" /></Button>
              <Button variant="outline" onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedDate(toLocalIsoDate(now)); }}>Hoje</Button>
              <Button variant="outline" size="icon" onClick={() => changeMonth(1)} aria-label="Próximo mês"><ChevronRight className="size-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-7 border-b bg-slate-50 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                {weekDays.map((day) => <div key={day} className="px-2 py-2.5">{day}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const dayOrders = scheduledByDay.get(day.isoDate) ?? [];
                  const isSelected = day.isoDate === selectedDate;
                  const isToday = day.isoDate === toLocalIsoDate(today);
                  return (
                    <button key={day.isoDate} onClick={() => { setSelectedDate(day.isoDate); setEditingId(null); }} className={`min-h-28 border-b border-r p-2 text-left transition hover:bg-slate-50 ${!day.inCurrentMonth ? "bg-slate-50/70 text-slate-400" : "bg-white"} ${isSelected ? "ring-2 ring-inset ring-cyan-600" : ""}`} aria-label={`${dayFormatter.format(day.date)}, ${dayOrders.length} serviços`}>
                      <span className={`inline-grid size-7 place-items-center rounded-full text-xs font-semibold ${isToday ? "bg-cyan-700 text-white" : ""}`}>{day.date.getDate()}</span>
                      <span className="mt-1 block space-y-1">
                        {dayOrders.slice(0, 3).map((order) => <span key={order.id} className={`block truncate rounded px-1.5 py-1 text-[10px] font-medium ${statusStyle(order.status)}`}>{timeFormatter.format(new Date(order.plannedAt!))} · {order.team ?? "Sem equipe"}</span>)}
                        {dayOrders.length > 3 && <span className="block px-1 text-[10px] font-medium text-slate-500">+ {dayOrders.length - 3} serviços</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="shadow-none">
          <CardHeader><CardTitle className="capitalize">{dayFormatter.format(new Date(`${selectedDate}T12:00:00`))}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {selectedOrders.length ? selectedOrders.map((order) => <ScheduleOrder key={order.id} order={order} canSchedule={canSchedule} editing={editingId === order.id} plannedAt={plannedAt} saving={saving} onEdit={() => startEditing(order)} onCancel={() => setEditingId(null)} onPlannedAt={setPlannedAt} onSave={() => void saveSchedule(order)} />) : <EmptyMessage text="Nenhum serviço programado para este dia." />}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="size-4 text-amber-600" /> Aguardando planejamento</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {unscheduled.length ? unscheduled.map((order) => <ScheduleOrder key={order.id} order={order} canSchedule={canSchedule} editing={editingId === order.id} plannedAt={plannedAt} saving={saving} onEdit={() => startEditing(order, selectedDate)} onCancel={() => setEditingId(null)} onPlannedAt={setPlannedAt} onSave={() => void saveSchedule(order)} compact />) : <EmptyMessage text="Todas as ordens planejadas possuem data definida." />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof CalendarClock }) {
  return <Card className="shadow-none"><CardContent className="flex items-center gap-3 p-4"><span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><Icon className="size-5" /></span><span><strong className="block text-xl">{value}</strong><span className="text-xs text-slate-500">{label}</span></span></CardContent></Card>;
}

function ScheduleOrder({ order, canSchedule, editing, plannedAt, saving, onEdit, onCancel, onPlannedAt, onSave, compact = false }: { order: Order; canSchedule: boolean; editing: boolean; plannedAt: string; saving: boolean; onEdit: () => void; onCancel: () => void; onPlannedAt: (value: string) => void; onSave: () => void; compact?: boolean }) {
  return (
    <article className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="font-mono text-xs font-semibold text-cyan-700">{order.number}</p><h3 className="mt-1 truncate font-semibold">{order.requestTitle}</h3><p className="mt-1 text-xs text-slate-500">{order.category} · {order.neighborhood}</p></div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyle(order.status)}`}>{order.status}</span>
      </div>
      {!compact && <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><p className="rounded-lg bg-slate-50 p-2"><strong>Equipe:</strong> {order.team ?? "Não atribuída"}</p><p className="rounded-lg bg-slate-50 p-2"><strong>Horário:</strong> {order.plannedAt ? timeFormatter.format(new Date(order.plannedAt)) : "A definir"}</p></div>}
      <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/solicitacoes/${order.requestId}`} />}><Wrench className="size-3.5" /> Abrir atendimento</Button>{canSchedule && order.status === "Planejada" && !editing && <Button size="sm" variant="outline" onClick={onEdit}><CalendarClock className="size-3.5" /> {order.plannedAt ? "Reagendar" : "Agendar"}</Button>}</div>
      {editing && <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3"><Label htmlFor={`schedule-${order.id}`}>Nova data e horário</Label><Input id={`schedule-${order.id}`} type="datetime-local" value={plannedAt} onChange={(event) => onPlannedAt(event.target.value)} /><div className="flex gap-2"><Button size="sm" disabled={saving || !plannedAt} onClick={onSave}><Save className="size-3.5" /> Salvar</Button><Button size="sm" variant="ghost" disabled={saving} onClick={onCancel}>Cancelar</Button></div></div>}
    </article>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed p-8 text-center"><Users className="mx-auto mb-2 size-7 text-slate-300" /><p className="text-sm text-slate-500">{text}</p></div>;
}
