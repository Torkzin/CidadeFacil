"use client";

import Link from "next/link";
import { useState } from "react";
import { Archive, ArrowLeft, Building2, CalendarDays, Camera, CheckCircle2, Clock3, Flag, Mail, MapPin, Phone, Send, UserRound, Users, Wrench } from "lucide-react";
import { toast } from "sonner";
import { requestHistory, requests } from "@/data/mock-data";
import type { RequestPriority, RequestStatus } from "@/types";
import { PriorityBadge, StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const statusOptions: RequestStatus[] = ["Aberta", "Triagem", "Encaminhada", "Em andamento", "Aguardando", "Concluída", "Cancelada"];
const priorityOptions: RequestPriority[] = ["Baixa", "Normal", "Alta", "Urgente"];

export function RequestDetail({ id }: { id: string }) {
  const base = requests.find((request) => request.id === id) ?? { ...requests[0], id, protocol: id, title: id === "2026-0001429" ? "Nova solicitação registrada" : requests[0].title, status: "Aberta" as const, date: "Hoje, 11:24", updatedAt: "Agora" };
  const [status, setStatus] = useState<RequestStatus>(base.status);
  const [priority, setPriority] = useState<RequestPriority>(base.priority);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  function notify(message: string) { toast.success(message, { description: "Alteração salva apenas nesta demonstração." }); }
  function addComment() { if (!comment.trim()) return; setComments((current) => [comment, ...current]); setComment(""); notify("Comentário adicionado"); }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><Link href="/solicitacoes" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-cyan-700"><ArrowLeft className="size-4" /> Voltar para solicitações</Link><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm text-slate-500">{base.protocol}</span><StatusBadge status={status} /><PriorityBadge priority={priority} /></div><h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{base.title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{base.description}</p></div>
        <Button onClick={() => { setStatus("Concluída"); notify("Solicitação concluída"); }} className="bg-emerald-700 hover:bg-emerald-800"><CheckCircle2 className="size-4" /> Concluir solicitação</Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card className="shadow-none"><CardHeader><CardTitle>Detalhes da ocorrência</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[
            [Archive, "Categoria", base.category], [Building2, "Secretaria", base.department], [Users, "Equipe", base.team],
            [CalendarDays, "Data de abertura", base.date], [Clock3, "Última atualização", base.updatedAt], [Flag, "Prioridade", priority],
          ].map(([Icon, label, value]) => { const ItemIcon = Icon as typeof Archive; return <div key={label as string} className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><ItemIcon className="size-4" /></span><div><p className="text-xs text-slate-500">{label as string}</p><p className="mt-1 text-sm font-medium">{value as string}</p></div></div>; })}</CardContent></Card>
          <Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="size-5 text-cyan-700" /> Local da ocorrência</CardTitle></CardHeader><CardContent><div className="rounded-xl border bg-slate-50 p-4"><p className="font-medium">{base.address}</p><p className="mt-1 text-sm text-slate-500">{base.neighborhood} · Cidade Exemplo</p><div className="data-grid mt-4 grid h-28 place-items-center rounded-lg border bg-cyan-50/40"><span className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-cyan-800 shadow-sm"><MapPin className="size-3.5" /> Localização aproximada</span></div></div></CardContent></Card>
          <Card className="shadow-none"><CardHeader><CardTitle>Linha do tempo</CardTitle><p className="text-sm text-muted-foreground">Histórico de movimentações desta solicitação.</p></CardHeader><CardContent><div className="relative ml-2 border-l border-slate-200 pl-7">{requestHistory.map((history, index) => <div key={history.id} className="relative pb-8 last:pb-0"><span className={`absolute -left-[35px] top-0 grid size-4 place-items-center rounded-full border-[3px] border-white ${index === requestHistory.length - 1 ? "bg-cyan-600 ring-2 ring-cyan-100" : "bg-slate-300"}`} /><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium">{history.title}</p><p className="mt-1 text-sm text-slate-500">{history.note}</p><p className="mt-2 text-xs text-slate-400">Por {history.user}</p></div><time className="whitespace-nowrap text-xs text-slate-400">{history.date} · {history.time}</time></div></div>)}</div></CardContent></Card>
          <Card className="shadow-none"><CardHeader><CardTitle>Comentários</CardTitle></CardHeader><CardContent><Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Adicione uma observação interna..." className="min-h-24" /><div className="mt-3 flex justify-end"><Button onClick={addComment} disabled={!comment.trim()}><Send className="size-4" /> Adicionar comentário</Button></div>{comments.length > 0 && <div className="mt-5 space-y-3 border-t pt-5">{comments.map((item, index) => <div key={`${item}-${index}`} className="flex gap-3 rounded-lg bg-slate-50 p-3"><div className="grid size-8 shrink-0 place-items-center rounded-full bg-cyan-800 text-xs font-semibold text-white">MV</div><div><p className="text-sm">{item}</p><p className="mt-1 text-xs text-slate-400">Matheus Vieira · agora</p></div></div>)}</div>}</CardContent></Card>
        </div>
        <aside className="space-y-5">
          <Card className="shadow-none"><CardHeader><CardTitle>Ações rápidas</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label>Alterar status</Label><Select value={status} onValueChange={(value) => { if (value) { setStatus(value as RequestStatus); notify(`Status alterado para ${value}`); } }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Alterar prioridade</Label><Select value={priority} onValueChange={(value) => { if (value) { setPriority(value as RequestPriority); notify(`Prioridade alterada para ${value}`); } }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{priorityOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><Dialog><DialogTrigger render={<Button variant="outline" className="w-full justify-start"><Building2 className="size-4" /> Encaminhar secretaria</Button>} /><DialogContent><DialogHeader><DialogTitle>Encaminhar para secretaria</DialogTitle></DialogHeader><div className="space-y-2 py-2"><Label>Secretaria responsável</Label><Select><SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{["Obras", "Serviços Públicos", "Meio Ambiente", "Transporte"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button onClick={() => notify("Solicitação encaminhada")}>Confirmar encaminhamento</Button></DialogFooter></DialogContent></Dialog><Dialog><DialogTrigger render={<Button variant="outline" className="w-full justify-start"><Wrench className="size-4" /> Atribuir equipe</Button>} /><DialogContent><DialogHeader><DialogTitle>Atribuir equipe responsável</DialogTitle></DialogHeader><div className="space-y-2 py-2"><Label>Equipe</Label><Select><SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{["Iluminação 01", "Iluminação 02", "Equipe de Asfalto", "Equipe de Poda"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button onClick={() => notify("Equipe atribuída")}>Atribuir equipe</Button></DialogFooter></DialogContent></Dialog><Button variant="outline" className="w-full justify-start" onClick={() => notify("Foto adicionada")}><Camera className="size-4" /> Adicionar foto</Button></CardContent></Card>
          <Card className="shadow-none"><CardHeader><CardTitle>Dados do cidadão</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-cyan-50 text-cyan-700"><UserRound className="size-4" /></span><div><p className="text-xs text-slate-500">Nome</p><p className="text-sm font-medium">{base.citizen.name}</p></div></div><div className="flex items-center gap-3"><Phone className="ml-2 size-4 text-slate-400" /><span className="text-sm">{base.citizen.phone}</span></div><div className="flex items-center gap-3"><Mail className="ml-2 size-4 text-slate-400" /><span className="break-all text-sm">{base.citizen.email}</span></div></CardContent></Card>
        </aside>
      </div>
    </div>
  );
}
