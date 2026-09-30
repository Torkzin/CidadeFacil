"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Crown, Link2, Loader2, Plus, Unlink, Users } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RequestStatus } from "@/types";

type Member = { id: string; protocol: string; title: string; status: RequestStatus; category: string; neighborhood: string; createdAt: string };
type Suggestion = Member & { matchReason: string; distanceMeters: number | null };
type RelationData = { primaryRequestId: string; isPrimary: boolean; members: Member[]; suggestions: Suggestion[]; followerCount: number; canManage: boolean };

export function RelatedRequestsCard({ requestId }: { requestId: string }) {
  const [data, setData] = useState<RelationData | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch(`/api/requests/${requestId}/relations`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os vínculos.");
    setData(payload);
  }, [requestId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((error) => toast.error(error.message));
  }, [load]);

  async function change(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>, success: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/requests/${requestId}/relations`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível alterar o grupo.");
      toast.success(success);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar o grupo.");
    } finally { setBusy(false); }
  }

  if (!data) return <Card className="shadow-none"><CardContent className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Analisando solicitações relacionadas...</CardContent></Card>;
  const primary = data.members.find((member) => member.id === data.primaryRequestId);
  return (
    <Card className="shadow-none">
      <CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="size-5 text-cyan-700" /> Ocorrência coletiva <span className="ml-auto rounded-full bg-cyan-50 px-2 py-1 text-xs font-normal text-cyan-800">{data.members.length} protocolo(s) · {data.followerCount} acompanhante(s)</span></CardTitle><p className="text-sm text-muted-foreground">Protocolos vinculados continuam auditáveis, mas o andamento operacional é centralizado no principal.</p></CardHeader>
      <CardContent className="space-y-4">
        {!data.isPrimary && primary && <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">Este protocolo faz parte de uma ocorrência coletiva. As movimentações devem ser feitas no <Link className="font-semibold underline" href={`/solicitacoes/${primary.id}`}>protocolo principal {primary.protocol}</Link>.</div>}
        <div className="space-y-2">
          {data.members.map((member) => (
            <div key={member.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><p className="flex items-center gap-2 font-mono text-xs text-slate-500">{member.id === data.primaryRequestId && <Crown className="size-3.5 text-amber-600" />}{member.protocol}{member.id === data.primaryRequestId && <span className="font-sans font-medium text-amber-700">Principal</span>}</p><Link href={`/solicitacoes/${member.id}`} className="mt-1 block truncate text-sm font-medium hover:text-cyan-700">{member.title}</Link></div><StatusBadge status={member.status} />
              {data.isPrimary && data.canManage && member.id !== data.primaryRequestId && <div className="flex gap-1"><Button size="sm" variant="outline" disabled={busy} onClick={() => void change("PATCH", { newPrimaryId: member.id }, "Protocolo principal alterado.")}><Crown className="size-3.5" /> Tornar principal</Button><Button size="icon-sm" variant="ghost" aria-label="Desvincular" disabled={busy} onClick={() => void change("DELETE", { relatedRequestId: member.id }, "Protocolo desvinculado.")}><Unlink className="size-4 text-rose-600" /></Button></div>}
            </div>
          ))}
        </div>
        {data.isPrimary && data.canManage && data.suggestions.length > 0 && <div><p className="mb-2 flex items-center gap-2 text-sm font-medium"><Users className="size-4 text-cyan-700" /> Possíveis protocolos da mesma ocorrência</p><div className="space-y-2">{data.suggestions.slice(0, 5).map((suggestion) => <div key={suggestion.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{suggestion.protocol} · {suggestion.title}</p><p className="mt-1 text-xs text-slate-500">{suggestion.matchReason}{suggestion.distanceMeters != null ? ` · ${suggestion.distanceMeters} m` : ""} · {suggestion.neighborhood}</p></div><Button size="sm" variant="outline" disabled={busy} onClick={() => void change("POST", { relatedRequestId: suggestion.id }, "Solicitação vinculada à ocorrência coletiva.")}><Plus className="size-4" /> Vincular</Button></div>)}</div></div>}
        {data.members.length === 1 && data.suggestions.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">Nenhuma solicitação semelhante disponível para vínculo.</p>}
      </CardContent>
    </Card>
  );
}
