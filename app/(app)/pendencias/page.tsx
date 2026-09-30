import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  CircleUserRound,
  Clock3,
  Hourglass,
  ListTodo,
  MessageSquareWarning,
} from "lucide-react";
import { PageHeading } from "@/components/common/page-heading";
import { PriorityBadge, StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireCurrentUser } from "@/lib/auth/session";
import {
  filterPendingRequests,
  getPendingRequests,
  parsePendingFilter,
  type PendingFilter,
} from "@/lib/server/pending-requests";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const filters: Array<{
  key: PendingFilter;
  label: string;
  description: string;
  icon: typeof ListTodo;
}> = [
  {
    key: "all",
    label: "Todas",
    description: "Demandas que precisam de atenção",
    icon: ListTodo,
  },
  {
    key: "critical",
    label: "Críticas",
    description: "Prazos já ultrapassados",
    icon: AlertTriangle,
  },
  {
    key: "unassigned",
    label: "Sem atribuição",
    description: "Sem responsável ou equipe",
    icon: CircleUserRound,
  },
  {
    key: "sla",
    label: "SLA",
    description: "Prazos próximos ou vencidos",
    icon: BellRing,
  },
  {
    key: "stalled",
    label: "Paradas",
    description: "Sem movimentação recente",
    icon: Clock3,
  },
  {
    key: "citizen",
    label: "Retorno do cidadão",
    description: "Complementações pendentes",
    icon: MessageSquareWarning,
  },
  {
    key: "waiting",
    label: "Aguardando",
    description: "Dependem de retorno ou ação",
    icon: Hourglass,
  },
];

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const user = await requireCurrentUser();
  const selected = parsePendingFilter((await searchParams).tipo);
  const result = await getPendingRequests(user);
  const items = filterPendingRequests(result.items, selected);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Fila de pendências"
        description="Priorize solicitações sem atribuição, paradas ou com risco de descumprimento do SLA."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {filters.map((filter) => {
          const Icon = filter.icon;
          const active = selected === filter.key;
          return (
            <Link key={filter.key} href={`/pendencias?tipo=${filter.key}`}>
              <Card
                className={cn(
                  "h-full gap-0 py-0 shadow-none transition-colors hover:border-cyan-300",
                  active && "border-cyan-500 bg-cyan-50/50",
                )}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600",
                      active && "bg-cyan-100 text-cyan-800",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">
                      {filter.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {filter.description}
                    </span>
                  </span>
                  <strong className="text-2xl tracking-tight text-slate-900">
                    {result.counts[filter.key]}
                  </strong>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <CardHeader className="border-b py-4">
          <CardTitle className="flex items-center justify-between gap-3">
            <span>
              {filters.find((filter) => filter.key === selected)?.label}
            </span>
            <span className="text-sm font-normal text-slate-500">
              {items.length} solicitaç{items.length === 1 ? "ão" : "ões"}
            </span>
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Protocolo</TableHead>
                <TableHead className="min-w-56">Solicitação</TableHead>
                <TableHead>Pendências</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última movimentação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
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
                    <p className="mt-1 text-xs text-slate-500">
                      {item.category} · {item.neighborhood}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-52 flex-wrap gap-1.5">
                      {item.reasons.map((reason) => (
                        <span
                          key={reason.kind}
                          className={cn(
                            "rounded-full px-2 py-1 text-xs font-medium",
                            reason.severity === "critical"
                              ? "bg-rose-50 text-rose-700"
                              : reason.severity === "warning"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {reason.label}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-slate-600">
                    {item.assignee ?? "Não definido"}
                    <span className="block text-xs text-slate-400">
                      {item.team ?? item.department ?? "Sem encaminhamento"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={item.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-slate-500">
                    {dateTime(item.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-52 text-center">
                    <ListTodo className="mx-auto mb-3 size-9 text-slate-300" />
                    <p className="font-medium text-slate-800">
                      Nenhuma pendência nesta fila
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      As solicitações aparecerão aqui automaticamente quando
                      precisarem de atenção.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
