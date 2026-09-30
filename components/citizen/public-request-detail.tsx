"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  Send,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RequestStatus } from "@/types";

type PublicData = {
  protocol: string;
  title: string;
  category: string;
  status: RequestStatus;
  department: string | null;
  createdAt: string;
  updatedAt: string;
  resolutionDueAt: string | null;
  concludedAt: string | null;
  waitingReason: string | null;
  cancellationReason: string | null;
  resolutionNote: string | null;
  history: Array<{ title: string; createdAt: string }>;
  rating: { rating: number; comment: string | null } | null;
  collective: boolean;
  followerCount: number;
  relatedCount: number;
  acceptance: {
    outcome: "Aceito" | "Problema persiste";
    comment: string | null;
    participantName: string;
    createdAt: string;
  } | null;
  communications: Array<{
    id: string;
    authorType: "STAFF" | "CITIZEN";
    authorName: string;
    kind: "INFORMATION_REQUEST" | "CITIZEN_REPLY";
    body: string;
    answeredAt: string | null;
    responseDueAt: string | null;
    createdAt: string;
  }>;
  canReplyToCommunication: boolean;
};

export function PublicRequestDetail({ protocol }: { protocol: string }) {
  const [token, setToken] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [data, setData] = useState<PublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [joinedCollective, setJoinedCollective] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [acceptanceComment, setAcceptanceComment] = useState("");
  const [submittingAcceptance, setSubmittingAcceptance] = useState(false);
  const [communicationReply, setCommunicationReply] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const load = useCallback(
    async (accessToken: string) => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/public/requests/${encodeURIComponent(protocol)}`,
          { headers: { "X-Public-Token": accessToken }, cache: "no-store" },
        );
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        setData(payload);
        setToken(accessToken);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Não foi possível consultar a solicitação.",
        );
      } finally {
        setLoading(false);
      }
    },
    [protocol],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = sessionStorage.getItem(`cidadefacil:${protocol}`) ?? "";
      const created =
        sessionStorage.getItem(`cidadefacil:new:${protocol}`) === "1";
      const joined = sessionStorage.getItem(`cidadefacil:collective:${protocol}`) === "1";
      setIsNew(created);
      setJoinedCollective(joined);
      if (created) sessionStorage.removeItem(`cidadefacil:new:${protocol}`);
      if (joined) sessionStorage.removeItem(`cidadefacil:collective:${protocol}`);
      if (stored) void load(stored);
      else setLoading(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [protocol, load]);
  async function submitRating() {
    const response = await fetch(
      `/api/public/requests/${encodeURIComponent(protocol)}/rating`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Public-Token": token,
        },
        body: JSON.stringify({ rating, comment }),
      },
    );
    const payload = await response.json();
    if (!response.ok) return toast.error(payload.error);
    toast.success("Obrigado pela avaliação.");
    await load(token);
  }
  async function submitAcceptance(outcome: "Aceito" | "Problema persiste") {
    setSubmittingAcceptance(true);
    try {
      const response = await fetch(
        `/api/public/requests/${encodeURIComponent(protocol)}/acceptance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Public-Token": token,
          },
          body: JSON.stringify({ outcome, comment: acceptanceComment }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      toast.success(
        payload.reopened
          ? "Solicitação reaberta para nova análise."
          : "Conclusão confirmada. Obrigado pelo retorno.",
      );
      await load(token);
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Não foi possível registrar sua confirmação.",
      );
    } finally {
      setSubmittingAcceptance(false);
    }
  }
  async function submitCommunicationReply() {
    setSubmittingReply(true);
    try {
      const response = await fetch(
        `/api/public/requests/${encodeURIComponent(protocol)}/communications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Public-Token": token,
          },
          body: JSON.stringify({ body: communicationReply }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error ?? "Não foi possível enviar a resposta.");
      setCommunicationReply("");
      await load(token);
      toast.success("Complementação enviada para a prefeitura.");
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Não foi possível enviar a resposta.",
      );
    } finally {
      setSubmittingReply(false);
    }
  }
  if (loading)
    return (
      <div className="flex min-h-72 items-center justify-center gap-2 text-slate-500">
        <Loader2 className="size-5 animate-spin" /> Consultando...
      </div>
    );
  if (!data)
    return (
      <Card className="mx-auto max-w-lg shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole className="size-5 text-cyan-700" /> Código de
            acompanhamento
          </CardTitle>
          <p className="text-sm text-slate-500">
            Informe o código recebido ao registrar a solicitação.
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (manualToken) {
                sessionStorage.setItem(`cidadefacil:${protocol}`, manualToken);
                void load(manualToken);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="token">Código</Label>
              <Input
                id="token"
                required
                value={manualToken}
                onChange={(event) => setManualToken(event.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-rose-700">
                {error}
              </p>
            )}
            <Button className="w-full">Consultar</Button>
            <Link
              href="/cidadao/consultar"
              className="block text-center text-sm text-cyan-800"
            >
              Voltar à consulta
            </Link>
          </form>
        </CardContent>
      </Card>
    );
  return (
    <div className="space-y-6">
      {isNew && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-700" />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-emerald-950">
                Solicitação registrada com sucesso
              </h1>
              <p className="mt-1 text-sm text-emerald-800">
                Guarde o protocolo e o código abaixo para consultar sua
                solicitação.
              </p>
              <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3">
                <span className="block text-xs text-slate-500">
                  Código de acompanhamento
                </span>
                <code className="mt-1 block break-all text-sm font-semibold text-slate-900">
                  {token}
                </code>
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-cyan-800"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(token)
                      .then(() => toast.success("Código copiado."))
                  }
                >
                  Copiar código
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {joinedCollective && (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
          <div className="flex gap-3"><Users className="mt-0.5 size-6 shrink-0 text-cyan-700" /><div><h1 className="text-xl font-semibold text-cyan-950">Você está acompanhando esta ocorrência</h1><p className="mt-1 text-sm text-cyan-800">Não foi criado outro protocolo. As atualizações da ocorrência principal aparecerão aqui.</p><div className="mt-4 rounded-lg border border-cyan-200 bg-white p-3"><span className="block text-xs text-slate-500">Código de acompanhamento</span><code className="mt-1 block break-all text-sm font-semibold">{token}</code></div></div></div>
        </div>
      )}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <p className="text-sm text-slate-500">Protocolo</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <strong className="font-mono text-2xl tracking-tight">
              {data.protocol}
            </strong>
            <StatusBadge status={data.status} />
          </div>
          <h2 className="mt-6 text-xl font-semibold">{data.title}</h2>
          <div className="mt-5 grid gap-4 border-t pt-5 text-sm sm:grid-cols-3">
            <div>
              <span className="block text-slate-500">Categoria</span>
              <strong className="mt-1 block">{data.category}</strong>
            </div>
            <div>
              <span className="block text-slate-500">Aberta em</span>
              <strong className="mt-1 block">
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(data.createdAt))}
              </strong>
            </div>
            <div>
              <span className="block text-slate-500">
                Secretaria responsável
              </span>
              <strong className="mt-1 block">
                {data.department ?? "Em triagem"}
              </strong>
            </div>
          </div>
        </CardContent>
      </Card>
      {data.communications.length > 0 && (
        <Card className="border-cyan-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="size-5 text-cyan-700" />
              Comunicação com a prefeitura
            </CardTitle>
            <p className="text-sm text-slate-500">
              Responda apenas às informações solicitadas para continuidade do
              atendimento.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.communications.map((entry) => (
                <div
                  key={entry.id}
                  className={`max-w-[92%] rounded-xl border p-4 ${
                    entry.authorType === "STAFF"
                      ? "border-cyan-100 bg-cyan-50"
                      : "ml-auto border-emerald-100 bg-emerald-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {entry.authorType === "STAFF"
                        ? "Prefeitura de Seropédica"
                        : "Sua resposta"}
                    </p>
                    <time className="text-xs text-slate-500">
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(entry.createdAt))}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {entry.body}
                  </p>
                  {entry.kind === "INFORMATION_REQUEST" &&
                    entry.responseDueAt &&
                    !entry.answeredAt && (
                      <p className={`mt-2 text-xs font-medium ${new Date(entry.responseDueAt) < new Date() ? "text-rose-700" : "text-cyan-800"}`}>
                        {new Date(entry.responseDueAt) < new Date()
                          ? "Prazo expirado em "
                          : "Responda até "}
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(entry.responseDueAt))}
                      </p>
                    )}
                </div>
              ))}
            </div>
            {data.canReplyToCommunication && (
              <div className="mt-5 border-t pt-5">
                <Label htmlFor="communication-reply">Sua resposta</Label>
                <Textarea
                  id="communication-reply"
                  value={communicationReply}
                  onChange={(event) =>
                    setCommunicationReply(event.target.value)
                  }
                  placeholder="Forneça as informações solicitadas..."
                  maxLength={2000}
                  className="mt-2 min-h-28"
                />
                <Button
                  className="mt-3 w-full"
                  disabled={
                    submittingReply || communicationReply.trim().length < 5
                  }
                  onClick={() => void submitCommunicationReply()}
                >
                  <Send className="size-4" />
                  {submittingReply ? "Enviando..." : "Enviar complementação"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {(data.status === "Concluída" || data.acceptance) && (
        <Card className={data.acceptance?.outcome === "Problema persiste" ? "border-amber-200 shadow-sm" : "border-emerald-200 shadow-sm"}>
          <CardHeader><CardTitle className="flex items-center gap-2">{data.acceptance?.outcome === "Problema persiste" ? <CircleAlert className="size-5 text-amber-700" /> : <CheckCircle2 className="size-5 text-emerald-700" />} Aceite da conclusão</CardTitle><p className="text-sm text-slate-500">Confirme se o serviço resolveu o problema informado.</p></CardHeader>
          <CardContent>
            {data.acceptance ? (
              <div className={`rounded-xl p-4 text-sm ${data.acceptance.outcome === "Aceito" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}><p className="font-semibold">{data.acceptance.outcome === "Aceito" ? "Serviço confirmado" : "Problema informado como persistente"}</p><p className="mt-1">Registrado por {data.acceptance.participantName} em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(data.acceptance.createdAt))}.</p>{data.acceptance.comment && <p className="mt-3 rounded-lg bg-white/70 p-3">{data.acceptance.comment}</p>}</div>
            ) : (
              <div className="space-y-4"><Button className="w-full bg-emerald-700 hover:bg-emerald-800" disabled={submittingAcceptance} onClick={() => void submitAcceptance("Aceito")}><CheckCircle2 className="size-4" /> Confirmar que o serviço foi realizado</Button><div className="border-t pt-4"><Label htmlFor="acceptance-comment">O problema continua?</Label><Textarea id="acceptance-comment" className="mt-2" placeholder="Explique o que ainda precisa ser resolvido..." maxLength={1500} value={acceptanceComment} onChange={(event) => setAcceptanceComment(event.target.value)} /><Button variant="outline" className="mt-3 w-full border-amber-300 text-amber-800" disabled={submittingAcceptance || acceptanceComment.trim().length < 10} onClick={() => void submitAcceptance("Problema persiste")}><CircleAlert className="size-4" /> Informar que o problema continua</Button></div></div>
            )}
          </CardContent>
        </Card>
      )}
      {data.collective && (
        <Card className="border-cyan-100 bg-cyan-50/40 shadow-sm"><CardContent className="flex items-center gap-4 p-5"><span className="grid size-11 place-items-center rounded-xl bg-cyan-100 text-cyan-800"><Users className="size-5" /></span><div><p className="font-medium text-cyan-950">Ocorrência coletiva</p><p className="mt-1 text-sm text-cyan-800">{data.relatedCount + 1} protocolo(s) relacionado(s) e {data.followerCount} pessoa(s) acompanhando.</p></div></CardContent></Card>
      )}
      {(data.waitingReason ||
        data.cancellationReason ||
        data.resolutionNote) && (
        <Card className="border-cyan-100 shadow-sm">
          <CardHeader>
            <CardTitle>Informações do atendimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {data.waitingReason && (
              <PublicNote label="Motivo da espera" value={data.waitingReason} />
            )}
            {data.cancellationReason && (
              <PublicNote
                label="Motivo do cancelamento"
                value={data.cancellationReason}
              />
            )}
            {data.resolutionNote && (
              <PublicNote
                label="Solução aplicada"
                value={data.resolutionNote}
              />
            )}
          </CardContent>
        </Card>
      )}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="size-5 text-cyan-700" /> Acompanhamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-0">
            {data.history.map((entry, index) => (
              <li
                key={`${entry.title}-${entry.createdAt}-${index}`}
                className="relative flex gap-4 pb-7 last:pb-0"
              >
                <span className="relative z-10 mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-cyan-100 text-cyan-800">
                  <ClipboardCheck className="size-4" />
                </span>
                {index < data.history.length - 1 && (
                  <span className="absolute left-3.5 top-7 h-full w-px bg-slate-200" />
                )}
                <div>
                  <strong className="text-sm">{entry.title}</strong>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "long",
                      timeStyle: "short",
                    }).format(new Date(entry.createdAt))}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      {data.status === "Concluída" && data.acceptance?.outcome === "Aceito" && (
        <Card className="border-emerald-200 shadow-sm">
          <CardHeader>
            <CardTitle>Como foi o atendimento?</CardTitle>
          </CardHeader>
          <CardContent>
            {data.rating ? (
              <div className="flex items-center gap-2 text-amber-600">
                <Star className="size-5 fill-current" />
                <strong>{data.rating.rating} de 5</strong>
                <span className="text-sm text-slate-500">
                  Avaliação registrada
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2" aria-label="Nota de 1 a 5">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${value} estrela${value > 1 ? "s" : ""}`}
                      onClick={() => setRating(value)}
                      className="p-1"
                    >
                      <Star
                        className={`size-7 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Comentário opcional"
                  maxLength={1000}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                />
                <Button onClick={submitRating} disabled={!rating}>
                  Enviar avaliação
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PublicNote({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 leading-6 text-slate-800">{value}</p>
    </div>
  );
}
