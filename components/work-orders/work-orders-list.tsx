"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClipboardList, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Order = { id: string; number: string; status: string; requestId: string; protocol: string; requestTitle: string; department: string | null; team: string | null; assignee: string | null; plannedAt: string | null };

export function WorkOrdersList() {
  const [items, setItems] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/work-orders", { cache: "no-store" }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setItems(payload.items ?? []); }).catch((caught: Error) => setError(caught.message)); }, []);
  if (error) return <Card className="border-rose-200 bg-rose-50 shadow-none"><CardContent className="p-6 text-rose-800">{error}</CardContent></Card>;
  if (!items) return <Card className="shadow-none"><CardContent className="p-6 text-slate-500">Carregando ordens de serviço...</CardContent></Card>;
  if (!items.length) return <Card className="shadow-none"><CardContent className="flex flex-col items-center p-12 text-center"><Wrench className="mb-3 size-9 text-slate-300" /><p className="font-medium">Nenhuma ordem de serviço emitida</p><p className="mt-1 text-sm text-slate-500">Abra uma solicitação encaminhada e atribua uma equipe para criar a primeira OS.</p></CardContent></Card>;
  return <Card className="overflow-hidden shadow-none"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Ordem</th><th className="px-5 py-3">Solicitação</th><th className="px-5 py-3">Equipe</th><th className="px-5 py-3">Planejamento</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y">{items.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="px-5 py-4"><Link href={`/solicitacoes/${item.requestId}`} className="font-mono font-semibold text-cyan-700 hover:underline">{item.number}</Link></td><td className="px-5 py-4"><div className="flex items-start gap-2"><ClipboardList className="mt-0.5 size-4 text-slate-400" /><div><p className="font-medium">{item.requestTitle}</p><p className="text-xs text-slate-500">{item.protocol}</p></div></div></td><td className="px-5 py-4"><p>{item.team ?? "Não atribuída"}</p><p className="text-xs text-slate-500">{item.department ?? "Sem secretaria"}</p></td><td className="px-5 py-4">{item.plannedAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.plannedAt)) : "A definir"}</td><td className="px-5 py-4"><span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-800">{item.status}</span></td></tr>)}</tbody></table></div></CardContent></Card>;
}
