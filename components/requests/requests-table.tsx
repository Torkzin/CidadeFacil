"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Plus,
  Search,
} from "lucide-react";
import type { MunicipalRequest, RequestPriority, RequestStatus } from "@/types";
import { PriorityBadge, StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SEROPEDICA_NEIGHBORHOOD_NAMES } from "@/lib/municipality/seropedica";
import { calculateSlaState } from "@/lib/requests/sla";

const PAGE_SIZE = 20;
const statusOptions = [
  "Aberta",
  "Triagem",
  "Encaminhada",
  "Em andamento",
  "Aguardando",
  "Concluída",
  "Cancelada",
];
const priorityOptions = ["Baixa", "Normal", "Alta", "Urgente"];

function FilterSelect({
  value,
  onValueChange,
  placeholder,
  options,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <Select
      value={value === "all" ? null : value}
      onValueChange={(next) => onValueChange(next ?? "all")}
    >
      <SelectTrigger className="h-9 min-w-36 bg-white">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function mapRequest(item: Record<string, unknown>): MunicipalRequest {
  const format = (value: unknown) =>
    new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(String(value)));
  return {
    id: String(item.id),
    protocol: String(item.protocol),
    title: String(item.title),
    description: String(item.description),
    category: String(item.category),
    neighborhood: String(item.neighborhood),
    department: item.department ? String(item.department) : "Não encaminhada",
    team: item.team ? String(item.team) : "Não atribuída",
    priority: item.priority as RequestPriority,
    status: item.status as RequestStatus,
    date: format(item.createdAt),
    updatedAt: format(item.updatedAt),
    resolutionDueAt: item.resolutionDueAt ? String(item.resolutionDueAt) : null,
    concludedAt: item.concludedAt ? String(item.concludedAt) : null,
    address: [item.address, item.addressNumber].filter(Boolean).join(", "),
    citizen: {
      name: String(item.citizenName),
      phone: String(item.citizenPhone ?? "Não informado"),
      email: String(item.citizenEmail ?? "Não informado"),
    },
  };
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
}

export function RequestsTable() {
  const [requests, setRequests] = useState<MunicipalRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [department, setDepartment] = useState("all");
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [priority, setPriority] = useState("all");
  const [responsibility, setResponsibility] = useState("all");
  const [neighborhood, setNeighborhood] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    const filters = {
      q: deferredQuery.trim(),
      status: status === "all" ? "" : status,
      category: category === "all" ? "" : category,
      department: department === "all" ? "" : department,
      priority: priority === "all" ? "" : priority,
      mine: responsibility === "Minhas solicitações" ? "true" : "",
      unassigned: responsibility === "Sem responsável" ? "true" : "",
      neighborhood: neighborhood === "all" ? "" : neighborhood,
      from,
      to,
    };
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    fetch(`/api/requests?${params}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(
            payload.error ?? "Não foi possível carregar as solicitações.",
          );
        return payload as {
          items: Array<Record<string, unknown>>;
          total: number;
        };
      })
      .then((payload) => {
        setRequests(payload.items.map(mapRequest));
        setTotal(payload.total);
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    page,
    deferredQuery,
    status,
    category,
    department,
    priority,
    responsibility,
    neighborhood,
    from,
    to,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/categories", {
        cache: "no-store",
        signal: controller.signal,
      }).then((response) => response.json()),
      fetch("/api/departments", {
        cache: "no-store",
        signal: controller.signal,
      }).then((response) => response.json()),
    ])
      .then(([categoryPayload, departmentPayload]) => {
        setCategoryOptions(
          (categoryPayload.items ?? []).map(
            (item: { name: string }) => item.name,
          ),
        );
        setDepartmentOptions(
          (departmentPayload.items ?? []).map(
            (item: { name: string }) => item.name,
          ),
        );
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const hasFilters =
    Boolean(query || from || to) ||
    [status, category, department, priority, responsibility, neighborhood].some(
      (value) => value !== "all",
    );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstResult = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastResult = Math.min(page * PAGE_SIZE, total);
  function changeFilter(setter: (value: string) => void, value: string) {
    setLoading(true);
    setLoadError("");
    setter(value);
    setPage(1);
  }
  function clear() {
    setLoading(true);
    setLoadError("");
    setQuery("");
    setStatus("all");
    setCategory("all");
    setDepartment("all");
    setPriority("all");
    setResponsibility("all");
    setNeighborhood("all");
    setFrom("");
    setTo("");
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => changeFilter(setQuery, event.target.value)}
            placeholder="Buscar por protocolo, título ou bairro..."
            className="h-9 bg-white pl-9"
          />
        </div>
        <div className="scrollbar-subtle flex gap-2 overflow-x-auto pb-1 xl:pb-0">
          <FilterSelect
            value={status}
            onValueChange={(value) => changeFilter(setStatus, value)}
            placeholder="Status"
            options={statusOptions}
          />
          <FilterSelect
            value={category}
            onValueChange={(value) => changeFilter(setCategory, value)}
            placeholder="Categoria"
            options={categoryOptions}
          />
          <FilterSelect
            value={department}
            onValueChange={(value) => changeFilter(setDepartment, value)}
            placeholder="Secretaria"
            options={departmentOptions}
          />
          <FilterSelect
            value={priority}
            onValueChange={(value) => changeFilter(setPriority, value)}
            placeholder="Prioridade"
            options={priorityOptions}
          />
          <FilterSelect
            value={responsibility}
            onValueChange={(value) => changeFilter(setResponsibility, value)}
            placeholder="Responsável"
            options={["Minhas solicitações", "Sem responsável"]}
          />
          <FilterSelect
            value={neighborhood}
            onValueChange={(value) => changeFilter(setNeighborhood, value)}
            placeholder="Bairro"
            options={[...SEROPEDICA_NEIGHBORHOOD_NAMES]}
          />
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" className="h-9 bg-white">
                  <CalendarDays className="size-4" />
                  {from || to ? "Período ativo" : "Período"}
                </Button>
              }
            />
            <PopoverContent align="end" className="w-80 p-4">
              <div>
                <p className="font-medium text-slate-900">
                  Período de abertura
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Filtre pela data em que a solicitação foi criada.
                </p>
              </div>
              <label className="mt-2 grid gap-1.5 text-xs font-medium text-slate-600">
                De
                <Input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(event) =>
                    changeFilter(setFrom, event.target.value)
                  }
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">
                Até
                <Input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(event) => changeFilter(setTo, event.target.value)}
                />
              </label>
              {(from || to) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFrom("");
                    setTo("");
                    setPage(1);
                  }}
                  className="self-end text-cyan-800"
                >
                  Limpar período
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {hasFilters && (
        <div className="flex items-center justify-between rounded-lg border border-cyan-100 bg-cyan-50/60 px-3 py-2 text-sm">
          <span className="text-cyan-800">
            {total} resultado{total !== 1 && "s"} encontrado{total !== 1 && "s"}
            {(from || to) && (
              <span className="ml-1 text-cyan-700">
                ({from ? formatShortDate(from) : "início"} até{" "}
                {to ? formatShortDate(to) : "hoje"})
              </span>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            className="text-cyan-800"
          >
            <FilterX className="size-4" /> Limpar filtros
          </Button>
        </div>
      )}
      {loadError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {loadError}
        </div>
      )}

      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Protocolo</TableHead>
                <TableHead className="min-w-52">Título</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Bairro</TableHead>
                <TableHead>Secretaria</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((item) => (
                <TableRow key={item.id} className="group">
                  <TableCell className="font-mono text-xs text-slate-500">
                    <Link
                      href={`/solicitacoes/${item.id}`}
                      className="hover:text-cyan-700"
                    >
                      {item.protocol}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/solicitacoes/${item.id}`}
                      className="font-medium text-slate-900 group-hover:text-cyan-700"
                    >
                      {item.title}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-600">
                    {item.category}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-600">
                    {item.neighborhood}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-600">
                    {item.department}
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={item.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>
                    <SlaBadge
                      dueAt={item.resolutionDueAt ?? null}
                      concludedAt={item.concludedAt ?? null}
                      cancelled={item.status === "Cancelada"}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-500">
                    {item.date}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-44 text-center">
                    <div className="mx-auto max-w-xs">
                      <Search className="mx-auto mb-3 size-8 text-slate-300" />
                      <p className="font-medium">
                        Nenhuma solicitação encontrada
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Tente ajustar ou limpar os filtros.
                      </p>
                      {hasFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clear}
                          className="mt-4"
                        >
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {loading && requests.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-44 text-center text-slate-500"
                  >
                    Carregando solicitações...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-slate-500">
            Exibindo <strong className="text-slate-700">{firstResult}</strong>–
            <strong className="text-slate-700">{lastResult}</strong> de{" "}
            <strong className="text-slate-700">{total}</strong> solicitações
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="icon-sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => {
                setLoading(true);
                setLoadError("");
                setPage((current) => Math.max(1, current - 1));
              }}
              aria-label="Página anterior"
            >
              <ChevronLeft />
            </Button>
            <span className="min-w-24 text-center text-slate-600">
              Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </span>
            <Button
              size="icon-sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => {
                setLoading(true);
                setLoadError("");
                setPage((current) => Math.min(totalPages, current + 1));
              }}
              aria-label="Próxima página"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SlaBadge({
  dueAt,
  concludedAt,
  cancelled,
}: {
  dueAt: string | null;
  concludedAt: string | null;
  cancelled: boolean;
}) {
  const state = calculateSlaState(dueAt, concludedAt, cancelled);
  const styles =
    state === "overdue" || state === "late"
      ? "bg-rose-50 text-rose-700"
      : state === "near"
        ? "bg-amber-50 text-amber-700"
        : state === "met"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600";
  const label =
    state === "overdue"
      ? "Atrasado"
      : state === "late"
        ? "Concluído após prazo"
        : state === "near"
          ? "Vence em breve"
          : state === "met"
            ? "No prazo"
            : state === "cancelled"
              ? "Cancelado"
              : "Dentro do prazo";
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${styles}`}
    >
      {label}
    </span>
  );
}

export function NewRequestButton() {
  return (
    <Button
      render={<Link href="/solicitacoes/nova" />}
      nativeButton={false}
      className="bg-cyan-800 hover:bg-cyan-900"
    >
      <Plus className="size-4" /> Nova solicitação
    </Button>
  );
}
