"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type DuplicateWarningItem = {
  collectiveId?: string;
  protocol?: string;
  title: string;
  category: string;
  neighborhood: string;
  status: string;
  createdAt: string;
  matchReason: string;
  distanceMeters: number | null;
};

export function DuplicateWarningDialog({ open, items, onReview, onConfirm, onFollow, confirming }: { open: boolean; items: DuplicateWarningItem[]; onReview: () => void; onConfirm: () => void; onFollow?: () => void; confirming: boolean }) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !confirming) onReview(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-amber-600" /> Possível solicitação repetida</DialogTitle>
          <DialogDescription>Encontramos {items.length} solicitação{items.length === 1 ? "" : "ões"} da mesma categoria neste endereço ou a até 200 metros. Confira antes de abrir um novo protocolo.</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {items.map((item, index) => (
            <div key={`${item.protocol ?? item.title}-${index}`} className="rounded-xl border bg-amber-50/50 p-3">
              <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{item.title}</p><span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600">{item.status}</span></div>
              <p className="mt-1 text-xs text-slate-500">{item.protocol ? `${item.protocol} · ` : ""}{item.neighborhood} · {new Date(item.createdAt).toLocaleDateString("pt-BR")}</p>
              <p className="mt-1 text-xs font-medium text-amber-700">{item.matchReason}{item.distanceMeters != null ? ` · ${item.distanceMeters} m` : ""}</p>
            </div>
          ))}
        </div>
        <p className="text-xs leading-5 text-slate-500">O sistema apenas alerta. Se for um problema diferente ou uma nova ocorrência, você ainda pode registrar normalmente.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onReview} disabled={confirming}>Revisar dados</Button>
          {onFollow && <Button onClick={onFollow} disabled={confirming} className="bg-cyan-800 hover:bg-cyan-900">{confirming ? "Vinculando..." : "Acompanhar existente"}</Button>}
          <Button onClick={onConfirm} disabled={confirming} className="bg-amber-700 hover:bg-amber-800">{confirming ? "Registrando..." : "Criar mesmo assim"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
