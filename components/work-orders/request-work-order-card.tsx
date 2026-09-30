"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Camera, CheckCircle2, FileDown, Hammer, ImageIcon, PackagePlus, Play, ShieldCheck, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkOrderChecklist } from "@/components/work-orders/work-order-checklist";
import { canDeleteWorkOrderEvidence } from "@/lib/work-orders/workflow";

type Material = { id: string; description: string; quantity: string; unit: string };
type Evidence = { id: string; phase: "Antes" | "Depois"; originalName: string; contentType: string; sizeBytes: number; createdAt: string };
type Signature = { id: string; role: "Execução" | "Fiscalização"; signerName: string; signerRole: string; statement: string; signedAt: string };
type Order = {
  id: string; number: string; status: "Planejada" | "Em execução" | "Concluída" | "Cancelada";
  department: string | null; team: string | null; assignee: string | null;
  plannedAt: string | null; startedAt: string | null; completedAt: string | null;
  notes: string | null; completionNote: string | null; materials: Material[]; attachments: Evidence[]; signatures: Signature[];
};

const date = (value: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "Não definido";

export function RequestWorkOrderCard({ requestId, canCreate, canOperate, onChanged }: { requestId: string; canCreate: boolean; canOperate: boolean; onChanged: () => Promise<void> }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [plannedAt, setPlannedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [material, setMaterial] = useState({ description: "", quantity: "", unit: "un" });
  const [busy, setBusy] = useState(false);
  const [executionAccepted, setExecutionAccepted] = useState(false);
  const [inspectionAccepted, setInspectionAccepted] = useState(false);
  const [checklistReady, setChecklistReady] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/work-orders?requestId=${encodeURIComponent(requestId)}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar a ordem de serviço.");
    setOrder(payload.items?.[0] ?? null);
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    // The callback synchronizes this client card with the server API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((error: Error) => toast.error(error.message));
  }, [load]);

  async function submit(url: string, body: Record<string, unknown>, success: string) {
    setBusy(true);
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar.");
      await load();
      await onChanged();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      return false;
    } finally { setBusy(false); }
  }

  async function changeStatus(status: "Em execução" | "Concluída" | "Cancelada") {
    setBusy(true);
    try {
      const response = await fetch(`/api/work-orders/${order?.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, completionNote }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível alterar a OS.");
      await load(); await onChanged(); toast.success(`Ordem de serviço ${status.toLowerCase()}.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível alterar a OS."); }
    finally { setBusy(false); }
  }

  async function uploadEvidence(phase: "Antes" | "Depois", files: FileList | null) {
    if (!order || !files?.length) return;
    const form = new FormData();
    form.append("phase", phase);
    Array.from(files).slice(0, 5).forEach((file) => form.append("files", file));
    setBusy(true);
    try {
      const response = await fetch(`/api/work-orders/${order.id}/attachments`, { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível enviar as evidências.");
      await load(); await onChanged(); toast.success(`Fotos de ${phase.toLowerCase()} adicionadas.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível enviar as evidências."); }
    finally { setBusy(false); }
  }

  async function removeEvidence(evidence: Evidence) {
    if (!order) return;
    if (
      !window.confirm(
        `Remover a foto "${evidence.originalName}" das evidências de ${evidence.phase.toLowerCase()}?`,
      )
    )
      return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/work-order-attachments/${evidence.id}`,
        { method: "DELETE" },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error ?? "Não foi possível remover a foto.");
      await load();
      await onChanged();
      toast.success("Foto removida das evidências.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível remover a foto.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function sign(role: "Execução" | "Fiscalização") {
    if (!order) return;
    await submit(`/api/work-orders/${order.id}/signatures`, { role, accepted: true }, role === "Execução" ? "Execução confirmada eletronicamente." : "Ordem de serviço homologada.");
  }

  if (loading) return <Card className="shadow-none"><CardContent className="p-6 text-sm text-slate-500">Carregando ordem de serviço...</CardContent></Card>;

  if (!order) return (
    <Card className="border-cyan-200 bg-cyan-50/30 shadow-none">
      <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="size-5 text-cyan-700" /> Ordem de serviço</CardTitle><p className="text-sm text-muted-foreground">Planeje a execução em campo a partir desta solicitação.</p></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Data planejada</Label><Input type="datetime-local" value={plannedAt} onChange={(event) => setPlannedAt(event.target.value)} /></div><div className="space-y-2"><Label>Orientações para a equipe</Label><Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: levar equipamento de poda" /></div></div>
        <Button disabled={!canCreate || busy} onClick={() => submit("/api/work-orders", { requestId, plannedAt: plannedAt || undefined, notes }, "Ordem de serviço criada.")}><Hammer className="size-4" /> Criar ordem de serviço</Button>
        {!canCreate && <p className="text-xs text-slate-500">Somente gestores podem emitir uma ordem de serviço.</p>}
      </CardContent>
    </Card>
  );

  const active = !["Concluída", "Cancelada"].includes(order.status);
  const canDeleteEvidence = canDeleteWorkOrderEvidence(
    order.status,
    canOperate,
  );
  const before = order.attachments.filter((item) => item.phase === "Antes");
  const after = order.attachments.filter((item) => item.phase === "Depois");
  const executionSignature = order.signatures.find((item) => item.role === "Execução");
  const inspectionSignature = order.signatures.find((item) => item.role === "Fiscalização");
  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row items-start justify-between"><div><CardTitle className="flex items-center gap-2"><Wrench className="size-5 text-cyan-700" /> {order.number}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{order.department} · {order.team}</p></div><div className="flex flex-wrap items-center justify-end gap-2"><a href={`/api/work-orders/${order.id}/pdf`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-white px-2.5 text-xs font-medium hover:bg-slate-50"><FileDown className="size-3.5" /> PDF</a><span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">{order.status}</span></div></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 text-sm sm:grid-cols-3"><Info label="Planejada" value={date(order.plannedAt)} /><Info label="Iniciada" value={date(order.startedAt)} /><Info label="Concluída" value={date(order.completedAt)} /></div>
        {order.notes && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{order.notes}</p>}
        <WorkOrderChecklist orderId={order.id} disabled={!active || busy} onProgress={setChecklistReady} />
        <div className="grid gap-4 lg:grid-cols-2">
          <EvidenceGallery title="Antes do serviço" description="Registre a situação encontrada pela equipe." items={before} canUpload={active && canOperate} canDelete={canDeleteEvidence} busy={busy} onUpload={(files) => uploadEvidence("Antes", files)} onDelete={removeEvidence} />
          <EvidenceGallery title="Depois do serviço" description="Evidência obrigatória para concluir a OS." items={after} canUpload={active && canOperate} canDelete={canDeleteEvidence} busy={busy} onUpload={(files) => uploadEvidence("Depois", files)} onDelete={removeEvidence} />
        </div>
        <div><p className="mb-2 text-sm font-medium">Materiais e recursos</p>{order.materials.length ? <div className="space-y-2">{order.materials.map((item) => <div key={item.id} className="flex justify-between rounded-lg border px-3 py-2 text-sm"><span>{item.description}</span><strong>{item.quantity} {item.unit}</strong></div>)}</div> : <p className="text-sm text-slate-500">Nenhum material registrado.</p>}</div>
        {active && canOperate && <div className="grid gap-2 sm:grid-cols-[1fr_110px_90px_auto]"><Input placeholder="Material ou recurso" value={material.description} onChange={(e) => setMaterial({ ...material, description: e.target.value })} /><Input placeholder="Qtd." value={material.quantity} onChange={(e) => setMaterial({ ...material, quantity: e.target.value })} /><Input placeholder="Un." value={material.unit} onChange={(e) => setMaterial({ ...material, unit: e.target.value })} /><Button variant="outline" disabled={busy || !material.description || !material.quantity || !material.unit} onClick={async () => { if (await submit(`/api/work-orders/${order.id}/materials`, material, "Material adicionado.")) setMaterial({ description: "", quantity: "", unit: "un" }); }}><PackagePlus className="size-4" /> Adicionar</Button></div>}
        {order.status === "Planejada" && canOperate && <Button disabled={busy} onClick={() => changeStatus("Em execução")}><Play className="size-4" /> Iniciar execução</Button>}
        {order.status === "Em execução" && canOperate && <div className="space-y-3">{executionSignature ? <SignatureCard signature={executionSignature} /> : <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3"><label className="flex items-start gap-2 text-sm leading-5 text-cyan-950"><input type="checkbox" className="mt-1" checked={executionAccepted} onChange={(event) => setExecutionAccepted(event.target.checked)} /> Confirmo que as informações, materiais e evidências correspondem ao serviço executado.</label><Button size="sm" variant="outline" className="mt-3 bg-white" disabled={busy || !executionAccepted} onClick={() => sign("Execução")}><ShieldCheck className="size-4" /> Confirmar execução</Button></div>}<Label>Relatório de conclusão</Label><Textarea value={completionNote} onChange={(e) => setCompletionNote(e.target.value)} placeholder="Descreva o serviço realizado..." /><Button className="bg-emerald-700 hover:bg-emerald-800" disabled={busy || completionNote.trim().length < 10 || after.length === 0 || !executionSignature || !checklistReady} onClick={() => changeStatus("Concluída")}><CheckCircle2 className="size-4" /> Concluir OS e solicitação</Button>{after.length === 0 && <p className="text-xs text-amber-700">Adicione ao menos uma foto de depois para liberar a conclusão.</p>}{!executionSignature && <p className="text-xs text-amber-700">Registre o aceite eletrônico da execução para concluir.</p>}{!checklistReady && <p className="text-xs text-amber-700">Conclua os itens obrigatórios do checklist para finalizar.</p>}</div>}
        {order.completionNote && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><strong>Serviço executado:</strong> {order.completionNote}</div>}
        {(executionSignature || order.status === "Concluída") && <div className="space-y-2"><p className="text-sm font-medium">Aceites eletrônicos</p>{executionSignature && <SignatureCard signature={executionSignature} />}{inspectionSignature ? <SignatureCard signature={inspectionSignature} /> : order.status === "Concluída" && canCreate ? <div className="rounded-lg border p-3"><label className="flex items-start gap-2 text-sm leading-5"><input type="checkbox" className="mt-1" checked={inspectionAccepted} onChange={(event) => setInspectionAccepted(event.target.checked)} /> Homologo a execução após análise das informações e evidências.</label><Button size="sm" variant="outline" className="mt-3" disabled={busy || !inspectionAccepted} onClick={() => sign("Fiscalização")}><ShieldCheck className="size-4" /> Homologar OS</Button></div> : null}</div>}
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border p-3"><p className="flex items-center gap-1 text-xs text-slate-500"><CalendarDays className="size-3" /> {label}</p><p className="mt-1 font-medium">{value}</p></div>; }
function SignatureCard({ signature }: { signature: Signature }) { return <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950"><p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4" /> {signature.role} confirmada</p><p className="mt-1">{signature.signerName} · {signature.signerRole}</p><p className="mt-0.5 text-xs text-emerald-700">{date(signature.signedAt)}</p></div>; }

function EvidenceGallery({ title, description, items, canUpload, canDelete, busy, onUpload, onDelete }: { title: string; description: string; items: Evidence[]; canUpload: boolean; canDelete: boolean; busy: boolean; onUpload: (files: FileList | null) => void; onDelete: (evidence: Evidence) => void }) {
  return <section className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-semibold"><ImageIcon className="size-4 text-cyan-700" /> {title}</p><p className="mt-1 text-xs text-slate-500">{description}</p></div>{canUpload && <label className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium hover:bg-slate-50 ${busy ? "pointer-events-none opacity-50" : "cursor-pointer"}`}><Camera className="size-3.5" /> Adicionar<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy} onChange={(event) => { onUpload(event.target.files); event.target.value = ""; }} /></label>}</div>{items.length ? <div className="mt-3 grid grid-cols-2 gap-2">{items.map((item) => <div key={item.id} className="relative overflow-hidden rounded-lg border bg-slate-50"><a href={`/api/work-order-attachments/${item.id}`} target="_blank" rel="noreferrer" className="group block"><Image src={`/api/work-order-attachments/${item.id}`} alt={`${title}: ${item.originalName}`} width={320} height={220} unoptimized className="h-28 w-full object-cover transition group-hover:scale-[1.02]" /><p className="truncate px-2 py-1.5 pr-9 text-[11px] text-slate-500">{item.originalName}</p></a>{canDelete && <Button type="button" size="icon-sm" variant="destructive" disabled={busy} className="absolute right-1.5 top-1.5 size-7 shadow-sm" aria-label={`Remover ${item.originalName}`} title="Remover foto" onClick={() => onDelete(item)}><Trash2 className="size-3.5" /></Button>}</div>)}</div> : <div className="mt-3 rounded-lg border border-dashed p-5 text-center text-xs text-slate-400">Nenhuma evidência adicionada.</div>}</section>;
}
