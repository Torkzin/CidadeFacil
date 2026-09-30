"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, ListChecks, Loader2 } from "lucide-react";
import { toast } from "sonner";

type ChecklistItem = {
  id: string;
  title: string;
  required: boolean;
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
};

type ChecklistPayload = {
  items: ChecklistItem[];
  progress: { completed: number; total: number; requiredCompleted: number; requiredTotal: number };
  canUpdate: boolean;
};

export function WorkOrderChecklist({ orderId, disabled = false, onProgress }: { orderId: string; disabled?: boolean; onProgress?: (ready: boolean) => void }) {
  const [data, setData] = useState<ChecklistPayload | null>(null);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/work-orders/${orderId}/checklist`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar o checklist.");
    setData(payload);
    onProgress?.(payload.progress.requiredCompleted === payload.progress.requiredTotal);
  }, [orderId, onProgress]);

  useEffect(() => {
    // Synchronizes the operational checklist with its protected API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((error: Error) => toast.error(error.message));
  }, [load]);

  async function toggle(item: ChecklistItem) {
    setBusyId(item.id);
    try {
      const response = await fetch(`/api/work-orders/${orderId}/checklist`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: item.id, completed: !item.completed }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível atualizar o checklist.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o checklist.");
    } finally {
      setBusyId("");
    }
  }

  if (!data) return <div className="flex items-center gap-2 rounded-xl border p-4 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Carregando checklist...</div>;
  if (!data.items.length) return <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500"><p className="flex items-center gap-2 font-medium text-slate-700"><ListChecks className="size-4 text-cyan-700" /> Checklist do serviço</p><p className="mt-1 text-xs">Nenhum item foi configurado para esta categoria.</p></div>;
  const complete = data.progress.requiredCompleted === data.progress.requiredTotal;
  return (
    <section className={`rounded-xl border p-4 ${complete ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"}`}>
      <div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-semibold"><ListChecks className="size-4 text-cyan-700" /> Checklist do serviço</p><p className="mt-1 text-xs text-slate-500">{data.progress.completed} de {data.progress.total} itens concluídos</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${complete ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{complete ? "Pronto" : "Pendente"}</span></div>
      <div className="mt-3 space-y-2">
        {data.items.map((item) => <button key={item.id} type="button" disabled={disabled || !data.canUpdate || busyId === item.id} onClick={() => void toggle(item)} className={`flex w-full items-start gap-3 rounded-lg border bg-white p-3 text-left transition ${item.completed ? "border-emerald-200" : "hover:border-cyan-300"} disabled:cursor-not-allowed disabled:opacity-70`}>{busyId === item.id ? <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" /> : item.completed ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 size-4 shrink-0 text-slate-300" />}<span className="min-w-0"><span className={`block text-sm ${item.completed ? "text-slate-500 line-through" : "font-medium"}`}>{item.title}</span><span className="mt-0.5 block text-[11px] text-slate-400">{item.required ? "Obrigatório" : "Opcional"}{item.completedBy ? ` · ${item.completedBy}` : ""}</span></span></button>)}
      </div>
    </section>
  );
}
