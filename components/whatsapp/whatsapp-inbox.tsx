"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  History,
  Loader2,
  MessageCircle,
  Search,
  Send,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InboxFilter = "pending" | "mine" | "unassigned" | "all" | "closed";
type Agent = { id: string; name: string; role: string };
type InboxItem = {
  id: string;
  phone: string;
  displayName: string | null;
  state: string;
  humanHandoffRequestedAt: string | null;
  humanHandoffResolvedAt: string | null;
  assignedToId: string | null;
  assigneeName: string | null;
  lastMessageAt: string;
  requestId: string | null;
  protocol: string | null;
  requestStatus: string | null;
  unreadCount: number;
  lastMessage: { body: string | null; type: string; direction: string } | null;
};
type InboxMessage = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  body: string | null;
  mediaOriginalName: string | null;
  status: string;
  createdAt: string;
};
type ConversationEvent = {
  id: string;
  action: string;
  note: string | null;
  userName: string | null;
  createdAt: string;
};
type ConversationDetail = {
  conversation: {
    id: string;
    phone: string;
    displayName: string | null;
    state: string;
    humanHandoffRequestedAt: string | null;
    humanHandoffResolvedAt: string | null;
    assignedToId: string | null;
    assigneeName: string | null;
    activeRequestId: string | null;
    protocol: string | null;
    requestStatus: string | null;
  };
  messages: InboxMessage[];
  events: ConversationEvent[];
};

const filters: { value: InboxFilter; label: string }[] = [
  { value: "pending", label: "Pendentes" },
  { value: "mine", label: "Minhas" },
  { value: "unassigned", label: "Sem responsável" },
  { value: "all", label: "Todas" },
  { value: "closed", label: "Encerradas" },
];

function clock(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function WhatsAppInbox() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [filter, setFilter] = useState<InboxFilter>("pending");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [canTransfer, setCanTransfer] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({ filter });
    if (search.trim()) params.set("q", search.trim());
    return params.toString();
  }, [filter, search]);

  const refreshList = useCallback(async () => {
    const response = await fetch(`/api/whatsapp/inbox?${query}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { items: InboxItem[]; agents: Agent[]; canTransfer: boolean };
    setItems(data.items);
    setAgents(data.agents);
    setCanTransfer(data.canTransfer);
    setSelectedId((current) => (current && data.items.some((item) => item.id === current) ? current : data.items[0]?.id ?? null));
  }, [query]);

  const refreshDetail = useCallback(async () => {
    if (!selectedId) return;
    const response = await fetch(`/api/whatsapp/inbox/${selectedId}`, { cache: "no-store" });
    if (response.ok) setDetail((await response.json()) as ConversationDetail);
  }, [selectedId]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshList(), 0);
    const timer = window.setInterval(() => void refreshList(), 5_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refreshList]);

  useEffect(() => {
    if (!selectedId) return;
    const initial = window.setTimeout(() => void refreshDetail(), 0);
    const timer = window.setInterval(() => void refreshDetail(), 3_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refreshDetail, selectedId]);

  const selectedUnread = items.find((item) => item.id === selectedId)?.unreadCount ?? 0;
  useEffect(() => {
    if (!selectedId || selectedUnread < 1) return;
    void fetch(`/api/whatsapp/inbox/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read" }),
    }).then(() => refreshList());
  }, [refreshList, selectedId, selectedUnread]);

  async function mutate(payload: Record<string, string>, success: string) {
    if (!selectedId) return;
    const response = await fetch(`/api/whatsapp/inbox/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) return toast.error(data.error ?? "Não foi possível atualizar o atendimento.");
    toast.success(success);
    await Promise.all([refreshDetail(), refreshList()]);
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || !message.trim()) return;
    setSending(true);
    try {
      const response = await fetch(`/api/whatsapp/inbox/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível enviar a mensagem.");
      setMessage("");
      await Promise.all([refreshDetail(), refreshList()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="space-y-4 border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">Caixa de atendimento</h2>
          <p className="mt-1 text-sm text-slate-500">Distribua conversas, acompanhe não lidas e mantenha o histórico da equipe.</p>
        </div>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {filters.map((entry) => (
              <Button key={entry.value} type="button" size="sm" variant={filter === entry.value ? "default" : "outline"} onClick={() => setFilter(entry.value)}>
                {entry.label}
              </Button>
            ))}
          </div>
          <label className="relative block w-full xl:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Nome, telefone ou protocolo" />
          </label>
        </div>
      </div>
      <div className="grid min-h-[590px] lg:grid-cols-[350px_minmax(0,1fr)]">
        <div className="border-b lg:border-b-0 lg:border-r">
          {items.length ? (
            <div className="max-h-[590px] overflow-y-auto">
              {items.map((item) => (
                <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full border-b p-4 text-left transition hover:bg-slate-50 ${selectedId === item.id ? "bg-cyan-50/70" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.displayName ?? item.phone}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.protocol ?? item.phone}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {item.unreadCount > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{item.unreadCount}</span>}
                      {item.humanHandoffRequestedAt && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800">Pendente</span>}
                    </div>
                  </div>
                  <p className="mt-2 truncate text-xs text-slate-600">{item.lastMessage?.type === "image" ? "Foto recebida" : item.lastMessage?.body ?? "Sem mensagens"}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                    <span className="truncate">{item.assigneeName ? `Responsável: ${item.assigneeName}` : "Sem responsável"}</span>
                    <span className="shrink-0">{clock(item.lastMessageAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid h-full min-h-48 place-items-center p-8 text-center text-sm text-slate-500">Nenhuma conversa neste filtro.</div>
          )}
        </div>

        {detail && selectedId === detail.conversation.id ? (
          <div className="flex min-h-[590px] flex-col">
            <div className="space-y-3 border-b px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-emerald-50 text-emerald-700"><UserRound className="size-4" /></span>
                  <div>
                    <p className="text-sm font-semibold">{detail.conversation.displayName ?? detail.conversation.phone}</p>
                    <p className="text-xs text-slate-500">{detail.conversation.phone} · {detail.conversation.assigneeName ?? "Sem responsável"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detail.conversation.activeRequestId && (
                    <Button variant="outline" size="sm" render={<Link href={`/solicitacoes/${detail.conversation.activeRequestId}`} />}><ExternalLink className="size-3.5" /> Abrir protocolo</Button>
                  )}
                  {detail.conversation.humanHandoffRequestedAt ? (
                    <Button size="sm" variant="outline" onClick={() => void mutate({ action: "resolve" }, "Atendimento encerrado")}><CheckCircle2 className="size-3.5" /> Encerrar</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => void mutate({ action: "claim" }, "Conversa assumida")}><MessageCircle className="size-3.5" /> Assumir</Button>
                  )}
                </div>
              </div>
              {canTransfer && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <UsersRound className="size-4" />
                  <span>Transferir para</span>
                  <select
                    aria-label="Transferir atendimento"
                    value={detail.conversation.assignedToId ?? ""}
                    onChange={(event) => event.target.value && void mutate({ action: "transfer", assigneeId: event.target.value }, "Atendimento transferido")}
                    className="h-8 min-w-48 rounded-lg border bg-white px-2 text-sm text-slate-700"
                  >
                    <option value="" disabled>Escolha um atendente</option>
                    {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} · {agent.role}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_250px]">
              <div className="flex min-h-0 flex-col">
                <div className="max-h-[390px] flex-1 space-y-3 overflow-y-auto bg-[#efeae2] p-4">
                  {detail.messages.map((entry) => (
                    <div key={entry.id} className={`flex ${entry.direction === "INBOUND" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[82%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm shadow-sm ${entry.direction === "INBOUND" ? "bg-white" : "bg-[#d9fdd3]"}`}>
                        {entry.type === "image" ? `Foto: ${entry.mediaOriginalName ?? "imagem recebida"}` : entry.body}
                        <p className="mt-1 text-right text-[10px] text-slate-400">{clock(entry.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={sendMessage} className="flex gap-2 border-t p-3">
                  <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Responder como atendente..." disabled={sending} />
                  <Button type="submit" disabled={sending || !message.trim()}>{sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Enviar</Button>
                </form>
              </div>
              <aside className="hidden overflow-y-auto border-l bg-slate-50/70 p-4 xl:block">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><History className="size-4" /> Histórico interno</h3>
                <div className="mt-4 space-y-4">
                  {detail.events.length ? detail.events.map((event) => (
                    <div key={event.id} className="border-l-2 border-cyan-200 pl-3">
                      <p className="text-xs font-medium text-slate-700">{event.note ?? event.action}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{event.userName ?? "Sistema"} · {clock(event.createdAt)}</p>
                    </div>
                  )) : <p className="text-xs text-slate-500">O histórico será criado nas próximas ações da equipe.</p>}
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center p-8 text-center text-sm text-slate-500">Selecione uma conversa para visualizar o atendimento.</div>
        )}
      </div>
    </section>
  );
}
