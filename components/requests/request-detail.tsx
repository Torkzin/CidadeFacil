"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Flag,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Send,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import type { RequestPriority, RequestStatus } from "@/types";
import { PriorityBadge, StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { calculateSlaState, type SlaState } from "@/lib/requests/sla";
import {
  allowedStatusTransitions,
  statusNeedsReason,
} from "@/lib/requests/workflow";
import { RequestWorkOrderCard } from "@/components/work-orders/request-work-order-card";
import { RelatedRequestsCard } from "@/components/requests/related-requests-card";

const priorities: RequestPriority[] = ["Baixa", "Normal", "Alta", "Urgente"];
type History = {
  id: string;
  action: string;
  note: string | null;
  createdAt: string;
  userName: string;
};
type Comment = {
  id: string;
  body: string;
  createdAt: string;
  userName: string;
};
type Attachment = {
  id: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};
type Communication = {
  id: string;
  authorType: "STAFF" | "CITIZEN";
  authorName: string;
  kind: "INFORMATION_REQUEST" | "CITIZEN_REPLY";
  body: string;
  answeredAt: string | null;
  responseDueAt: string | null;
  createdAt: string;
};
type RequestData = {
  id: string;
  protocol: string;
  title: string;
  description: string;
  category: string;
  department: string | null;
  team: string | null;
  assignedToId: string | null;
  assignedAt: string | null;
  assignee: { id: string; name: string } | null;
  assigneeOptions: Array<{ id: string; name: string }>;
  priority: RequestPriority;
  status: RequestStatus;
  address: string;
  addressNumber: string | null;
  complement: string | null;
  neighborhood: string;
  latitude: string | null;
  longitude: string | null;
  citizenName: string;
  citizenPhone: string | null;
  citizenEmail: string | null;
  createdAt: string;
  updatedAt: string;
  responseDueAt: string | null;
  resolutionDueAt: string | null;
  firstRespondedAt: string | null;
  concludedAt: string | null;
  waitingReason: string | null;
  cancellationReason: string | null;
  resolutionNote: string | null;
  reopenedAt: string | null;
  permissions: {
    currentUserId: string;
    canChangeStatus: boolean;
    canChangePriority: boolean;
    canChangeAssignment: boolean;
    canReopen: boolean;
  };
  history: History[];
  comments: Comment[];
  attachments: Attachment[];
  communications: Communication[];
  collective: { primaryRequestId: string; memberIds: string[]; isPrimary: boolean };
  citizenAcceptances: Array<{
    id: string;
    participantName: string;
    outcome: string;
    comment: string | null;
    createdAt: string;
  }>;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

export function RequestDetail({ id }: { id: string }) {
  const [item, setItem] = useState<RequestData | null>(null);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [informationRequest, setInformationRequest] = useState("");
  const [requestingInformation, setRequestingInformation] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [department, setDepartment] = useState("");
  const [team, setTeam] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [pendingStatus, setPendingStatus] = useState<RequestStatus | null>(
    null,
  );
  const [statusReason, setStatusReason] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch(`/api/requests/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok)
      throw new Error(
        payload.error ?? "Não foi possível carregar a solicitação.",
      );
    setItem(payload);
  }, [id]);

  useEffect(() => {
    Promise.all([
      // The callback synchronizes this client view with the server API.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      load(),
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
    ])
      .then(([, d, t]) => {
        setDepartments((d.items ?? []).map((x: { name: string }) => x.name));
        setTeams((t.items ?? []).map((x: { name: string }) => x.name));
      })
      .catch((caught: Error) => setError(caught.message));
  }, [load]);

  async function mutate(body: Record<string, unknown>, message: string) {
    try {
      const response = await fetch(`/api/requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.error ?? "Não foi possível salvar a alteração.",
        );
      await load();
      toast.success(message);
      return true;
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar a alteração.",
      );
      return false;
    }
  }

  async function confirmStatusChange() {
    if (!pendingStatus) return;
    setChangingStatus(true);
    const changed = await mutate(
      {
        status: pendingStatus,
        ...(statusReason.trim() ? { statusReason: statusReason.trim() } : {}),
        ...(resolutionNote.trim()
          ? { resolutionNote: resolutionNote.trim() }
          : {}),
      },
      `Status alterado para ${pendingStatus}`,
    );
    setChangingStatus(false);
    if (changed) {
      setPendingStatus(null);
      setStatusReason("");
      setResolutionNote("");
    }
  }

  async function submitComment() {
    try {
      const response = await fetch(
        `/api/requests/${encodeURIComponent(id)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: comment }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.error ?? "Não foi possível adicionar o comentário.",
        );
      setComment("");
      await load();
      toast.success("Comentário adicionado");
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Não foi possível adicionar o comentário.",
      );
    }
  }

  async function requestCitizenInformation() {
    setRequestingInformation(true);
    try {
      const response = await fetch(
        `/api/requests/${encodeURIComponent(id)}/communications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: informationRequest }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.error ?? "Não foi possível solicitar a complementação.",
        );
      setInformationRequest("");
      await load();
      toast.success("Pedido de complementação enviado ao cidadão");
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Não foi possível solicitar a complementação.",
      );
    } finally {
      setRequestingInformation(false);
    }
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return;
    const form = new FormData();
    Array.from(files)
      .slice(0, 5)
      .forEach((file) => form.append("files", file));
    try {
      const response = await fetch(
        `/api/requests/${encodeURIComponent(id)}/attachments`,
        { method: "POST", body: form },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      await load();
      toast.success("Fotos adicionadas");
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Não foi possível enviar as fotos.",
      );
    }
  }

  if (error)
    return (
      <Card className="border-rose-200 bg-rose-50 shadow-none">
        <CardContent className="p-10 text-center text-rose-800">
          {error}
        </CardContent>
      </Card>
    );
  if (!item)
    return (
      <Card className="shadow-none">
        <CardContent className="p-10 text-center text-slate-500">
          Carregando solicitação...
        </CardContent>
      </Card>
    );

  const details = [
    [Building2, "Secretaria", item.department ?? "Não encaminhada"],
    [Users, "Equipe", item.team ?? "Não atribuída"],
    [UserRound, "Responsável", item.assignee?.name ?? "Não definido"],
    [CalendarDays, "Abertura", formatDate(item.createdAt)],
    [Clock3, "Atualização", formatDate(item.updatedAt)],
    [Flag, "Prioridade", item.priority],
  ] as const;
  const cancelled = item.status === "Cancelada";
  const responseSla = calculateSlaState(
    item.responseDueAt,
    item.firstRespondedAt,
    cancelled,
  );
  const resolutionSla = calculateSlaState(
    item.resolutionDueAt,
    item.concludedAt,
    cancelled,
  );
  const allowedStatuses = allowedStatusTransitions(
    item.status,
    item.permissions.canReopen,
  );
  const hasPendingInformationRequest = item.communications.some(
    (entry) =>
      entry.kind === "INFORMATION_REQUEST" && !entry.answeredAt,
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/solicitacoes"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-cyan-700"
          >
            <ArrowLeft className="size-4" /> Voltar para solicitações
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-slate-500">
              {item.protocol}
            </span>
            <StatusBadge status={item.status} />
            <PriorityBadge priority={item.priority} />
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {item.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {item.description}
          </p>
        </div>
        <Button
          disabled={!allowedStatuses.includes("Concluída")}
          onClick={() => setPendingStatus("Concluída")}
          className="bg-emerald-700 hover:bg-emerald-800"
        >
          <CheckCircle2 className="size-4" />{" "}
          {item.status === "Concluída"
            ? "Solicitação concluída"
            : "Concluir solicitação"}
        </Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Detalhes da ocorrência</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Categoria</p>
                <p className="mt-1 text-sm font-medium">{item.category}</p>
              </div>
              {details.map(([Icon, label, value]) => (
                <div key={label} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <RelatedRequestsCard requestId={item.id} />
          {item.citizenAcceptances.length > 0 && (
            <Card className="shadow-none"><CardHeader><CardTitle>Aceite dos cidadãos</CardTitle><p className="text-sm text-muted-foreground">Confirmações registradas pelos responsáveis ou acompanhantes da ocorrência.</p></CardHeader><CardContent className="space-y-2">{item.citizenAcceptances.map((acceptance) => <div key={acceptance.id} className={`rounded-xl border p-4 ${acceptance.outcome === "Aceito" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{acceptance.participantName} · {acceptance.outcome}</p><time className="text-xs text-slate-500">{formatDate(acceptance.createdAt)}</time></div>{acceptance.comment && <p className="mt-2 text-sm text-slate-700">{acceptance.comment}</p>}</div>)}</CardContent></Card>
          )}
          {(item.waitingReason ||
            item.cancellationReason ||
            item.resolutionNote) && (
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Resultado do atendimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {item.waitingReason && (
                  <WorkflowNote
                    label="Motivo da espera"
                    value={item.waitingReason}
                  />
                )}
                {item.cancellationReason && (
                  <WorkflowNote
                    label="Motivo do cancelamento"
                    value={item.cancellationReason}
                  />
                )}
                {item.resolutionNote && (
                  <WorkflowNote
                    label="Solução aplicada"
                    value={item.resolutionNote}
                  />
                )}
              </CardContent>
            </Card>
          )}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-600" /> Prazos de
                atendimento
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                SLA calculado a partir da prioridade{" "}
                {item.priority.toLowerCase()}.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <SlaIndicator
                label="Primeira resposta"
                dueAt={item.responseDueAt}
                completedAt={item.firstRespondedAt}
                state={responseSla}
              />
              <SlaIndicator
                label="Resolução"
                dueAt={item.resolutionDueAt}
                completedAt={item.concludedAt}
                state={resolutionSla}
              />
            </CardContent>
          </Card>
          <RequestWorkOrderCard
            requestId={item.id}
            canCreate={item.permissions.canChangeAssignment}
            canOperate={item.permissions.canChangeStatus}
            onChanged={load}
          />
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareText className="size-5 text-cyan-700" />
                Comunicação com o cidadão
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Canal restrito para solicitar informações necessárias ao
                atendimento.
              </p>
            </CardHeader>
            <CardContent>
              {item.communications.length > 0 ? (
                <div className="mb-5 space-y-3">
                  {item.communications.map((entry) => (
                    <div
                      key={entry.id}
                      className={`max-w-[90%] rounded-xl border p-4 ${
                        entry.authorType === "STAFF"
                          ? "border-cyan-100 bg-cyan-50"
                          : "ml-auto border-emerald-100 bg-emerald-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">
                          {entry.authorName}
                        </p>
                        <time className="text-xs text-slate-500">
                          {formatDate(entry.createdAt)}
                        </time>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {entry.body}
                      </p>
                      {entry.kind === "INFORMATION_REQUEST" && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium">
                          <span className={entry.answeredAt ? "text-emerald-700" : entry.responseDueAt && new Date(entry.responseDueAt) < new Date() ? "text-rose-700" : "text-slate-500"}>
                            {entry.answeredAt
                              ? "Respondido pelo cidadão"
                              : entry.responseDueAt && new Date(entry.responseDueAt) < new Date()
                                ? "Prazo do cidadão vencido"
                                : "Aguardando resposta"}
                          </span>
                          {entry.responseDueAt && (
                            <span className="text-slate-500">
                              Prazo: {formatDate(entry.responseDueAt)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mb-5 rounded-xl border border-dashed p-5 text-center text-sm text-slate-500">
                  Nenhuma comunicação pública registrada.
                </p>
              )}
              <Textarea
                value={informationRequest}
                onChange={(event) => setInformationRequest(event.target.value)}
                placeholder="Descreva objetivamente a informação ou evidência necessária..."
                maxLength={2000}
                className="min-h-24"
                disabled={
                  hasPendingInformationRequest ||
                  item.status === "Concluída" ||
                  item.status === "Cancelada"
                }
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {hasPendingInformationRequest
                    ? "Já existe um pedido aguardando resposta."
                    : "O status será alterado para Aguardando."}
                </p>
                <Button
                  onClick={requestCitizenInformation}
                  disabled={
                    requestingInformation ||
                    informationRequest.trim().length < 5 ||
                    hasPendingInformationRequest ||
                    item.status === "Concluída" ||
                    item.status === "Cancelada"
                  }
                >
                  <Send className="size-4" />
                  {requestingInformation
                    ? "Enviando..."
                    : "Solicitar complementação"}
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-5 text-cyan-700" /> Local da ocorrência
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="font-medium">
                  {[item.address, item.addressNumber, item.complement]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {item.neighborhood} · Seropédica/RJ
                </p>
                {item.latitude && item.longitude && (
                  <iframe
                    title="Mapa da ocorrência"
                    className="mt-4 h-56 w-full rounded-lg border"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(item.longitude) - 0.01}%2C${Number(item.latitude) - 0.01}%2C${Number(item.longitude) + 0.01}%2C${Number(item.latitude) + 0.01}&marker=${item.latitude}%2C${item.longitude}`}
                  />
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Fotos da ocorrência</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Imagens armazenadas com acesso protegido.
                </p>
              </div>
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-slate-50">
                <Camera className="size-4" /> Adicionar
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(event) => uploadPhotos(event.target.files)}
                />
              </label>
            </CardHeader>
            <CardContent>
              {item.attachments.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {item.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={`/api/attachments/${attachment.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-xl border bg-slate-50"
                    >
                      <Image
                        src={`/api/attachments/${attachment.id}`}
                        alt={attachment.originalName}
                        width={480}
                        height={320}
                        unoptimized
                        className="h-36 w-full object-cover transition group-hover:scale-[1.02]"
                      />
                      <p className="truncate px-3 py-2 text-xs text-slate-600">
                        {attachment.originalName}
                      </p>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
                  Nenhuma foto adicionada.
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Linha do tempo</CardTitle>
              <p className="text-sm text-muted-foreground">
                Histórico real de movimentações.
              </p>
            </CardHeader>
            <CardContent>
              <div className="relative ml-2 border-l border-slate-200 pl-7">
                {item.history.map((entry, index) => (
                  <div key={entry.id} className="relative pb-8 last:pb-0">
                    <span
                      className={`absolute -left-[35px] top-0 size-4 rounded-full border-[3px] border-white ${index === item.history.length - 1 ? "bg-cyan-600 ring-2 ring-cyan-100" : "bg-slate-300"}`}
                    />
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                      <div>
                        <p className="text-sm font-medium">{entry.action}</p>
                        {entry.note && (
                          <p className="mt-1 text-sm text-slate-500">
                            {entry.note}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-slate-400">
                          Por {entry.userName}
                        </p>
                      </div>
                      <time className="text-xs text-slate-400">
                        {formatDate(entry.createdAt)}
                      </time>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Comentários</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Adicione uma observação interna..."
                className="min-h-24"
              />
              <div className="mt-3 flex justify-end">
                <Button onClick={submitComment} disabled={!comment.trim()}>
                  <Send className="size-4" /> Adicionar comentário
                </Button>
              </div>
              <div className="mt-5 space-y-3">
                {item.comments.map((entry) => (
                  <div key={entry.id} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm">{entry.body}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {entry.userName} · {formatDate(entry.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-5">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Ações rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Alterar status</Label>
                <Select
                  value={item.status}
                  disabled={!item.permissions.canChangeStatus}
                  onValueChange={(value) =>
                    value &&
                    value !== item.status &&
                    setPendingStatus(value as RequestStatus)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[item.status, ...allowedStatuses].map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alterar prioridade</Label>
                <Select
                  value={item.priority}
                  disabled={!item.permissions.canChangePriority}
                  onValueChange={(value) =>
                    value &&
                    mutate(
                      { priority: value },
                      `Prioridade alterada para ${value}`,
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ChoiceDialog
                icon="department"
                label="Encaminhar secretaria"
                title="Encaminhar para secretaria"
                values={departments}
                selected={department}
                setSelected={setDepartment}
                confirm={() =>
                  mutate({ department }, "Solicitação encaminhada")
                }
                disabled={!item.permissions.canChangeAssignment}
              />
              {item.status !== "Concluída" &&
                item.status !== "Cancelada" &&
                item.assignedToId !== item.permissions.currentUserId && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() =>
                      mutate({ claim: true }, "Atendimento assumido por você")
                    }
                  >
                    <UserRound className="size-4" /> Assumir atendimento
                  </Button>
                )}
              {item.permissions.canChangeAssignment && (
                <AssigneeDialog
                  options={item.assigneeOptions}
                  selected={assigneeId}
                  setSelected={setAssigneeId}
                  currentName={item.assignee?.name ?? null}
                  disabled={
                    item.status === "Concluída" || item.status === "Cancelada"
                  }
                  confirm={() =>
                    mutate(
                      { assigneeId: assigneeId === "none" ? null : assigneeId },
                      assigneeId === "none"
                        ? "Responsável removido"
                        : "Responsável atualizado",
                    )
                  }
                />
              )}
              <ChoiceDialog
                icon="team"
                label="Atribuir equipe"
                title="Atribuir equipe responsável"
                values={teams}
                selected={team}
                setSelected={setTeam}
                confirm={() => mutate({ team }, "Equipe atribuída")}
                disabled={!item.permissions.canChangeAssignment}
              />
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Dados do cidadão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <UserRound className="size-4 text-cyan-700" />
                <span className="text-sm font-medium">{item.citizenName}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="size-4 text-slate-400" />
                <span className="text-sm">
                  {item.citizenPhone ?? "Não informado"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="size-4 text-slate-400" />
                <span className="break-all text-sm">
                  {item.citizenEmail ?? "Não informado"}
                </span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
      <Dialog
        open={Boolean(pendingStatus)}
        onOpenChange={(open) => {
          if (!open && !changingStatus) {
            setPendingStatus(null);
            setStatusReason("");
            setResolutionNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar status para {pendingStatus}</DialogTitle>
            <DialogDescription>
              Esta movimentação será registrada na linha do tempo e na
              auditoria.
            </DialogDescription>
          </DialogHeader>
          {pendingStatus === "Concluída" && (
            <div className="space-y-2">
              <Label htmlFor="resolution-note">Solução aplicada</Label>
              <Textarea
                id="resolution-note"
                value={resolutionNote}
                onChange={(event) => setResolutionNote(event.target.value)}
                placeholder="Descreva o serviço realizado e o resultado entregue ao cidadão."
                className="min-h-28"
              />
              <p className="text-xs text-slate-500">Mínimo de 10 caracteres.</p>
            </div>
          )}
          {pendingStatus && statusNeedsReason(item.status, pendingStatus) && (
            <div className="space-y-2">
              <Label htmlFor="status-reason">
                {pendingStatus === "Cancelada"
                  ? "Motivo do cancelamento"
                  : pendingStatus === "Aguardando"
                    ? "Motivo da espera"
                    : "Motivo da reabertura"}
              </Label>
              <Textarea
                id="status-reason"
                value={statusReason}
                onChange={(event) => setStatusReason(event.target.value)}
                placeholder="Informe uma justificativa para esta movimentação."
                className="min-h-24"
              />
              <p className="text-xs text-slate-500">Mínimo de 5 caracteres.</p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingStatus(null)}
              disabled={changingStatus}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmStatusChange}
              disabled={
                changingStatus ||
                (pendingStatus === "Concluída" &&
                  resolutionNote.trim().length < 10) ||
                (Boolean(
                  pendingStatus &&
                  statusNeedsReason(item.status, pendingStatus),
                ) &&
                  statusReason.trim().length < 5)
              }
            >
              {changingStatus ? "Salvando..." : "Confirmar alteração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const slaPresentation: Record<SlaState, { label: string; className: string }> =
  {
    pending: {
      label: "Dentro do prazo",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    },
    near: {
      label: "Prazo próximo",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    },
    overdue: {
      label: "Atrasado",
      className: "border-rose-200 bg-rose-50 text-rose-800",
    },
    met: {
      label: "Cumprido",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    },
    late: {
      label: "Cumprido com atraso",
      className: "border-orange-200 bg-orange-50 text-orange-800",
    },
    cancelled: {
      label: "Cancelado",
      className: "border-slate-200 bg-slate-100 text-slate-500",
    },
  };

function SlaIndicator({
  label,
  dueAt,
  completedAt,
  state,
}: {
  label: string;
  dueAt: string | null;
  completedAt: string | null;
  state: SlaState;
}) {
  const presentation = slaPresentation[state];
  return (
    <div className={`rounded-xl border p-4 ${presentation.className}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-semibold">
          {presentation.label}
        </span>
      </div>
      <p className="mt-3 text-xs">
        Prazo: {dueAt ? formatDate(dueAt) : "Não calculado"}
      </p>
      {completedAt && (
        <p className="mt-1 text-xs">Atendido em: {formatDate(completedAt)}</p>
      )}
    </div>
  );
}

function WorkflowNote({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function ChoiceDialog({
  icon,
  label,
  title,
  values,
  selected,
  setSelected,
  confirm,
  disabled = false,
}: {
  icon: "department" | "team";
  label: string;
  title: string;
  values: string[];
  selected: string;
  setSelected: (value: string) => void;
  confirm: () => void;
  disabled?: boolean;
}) {
  const Icon = icon === "department" ? Building2 : Wrench;
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-start"
            disabled={disabled}
          >
            <Icon className="size-4" /> {label}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Selecione uma opção</Label>
          <Select
            value={selected || null}
            onValueChange={(value) => setSelected(value ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {values.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button disabled={!selected} onClick={confirm}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssigneeDialog({
  options,
  selected,
  setSelected,
  currentName,
  disabled,
  confirm,
}: {
  options: Array<{ id: string; name: string }>;
  selected: string;
  setSelected: (value: string) => void;
  currentName: string | null;
  disabled: boolean;
  confirm: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-start"
            disabled={disabled}
          >
            <Users className="size-4" /> Transferir responsável
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Responsável pelo atendimento</DialogTitle>
          <DialogDescription>
            {currentName
              ? `Responsável atual: ${currentName}.`
              : "A solicitação ainda não possui responsável individual."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Servidor responsável</Label>
          <Select
            value={selected || null}
            onValueChange={(value) => setSelected(value ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um servidor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem responsável</SelectItem>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button disabled={!selected} onClick={confirm}>
            Salvar responsável
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
