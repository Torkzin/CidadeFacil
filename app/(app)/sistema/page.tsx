import {
  Activity,
  BellRing,
  Clock3,
  Database,
  HardDrive,
  Server,
  ShieldCheck,
} from "lucide-react";
import { PageHeading } from "@/components/common/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/session";
import { formatBytes } from "@/lib/observability/system-format";
import { getSystemStatus } from "@/lib/server/system-status";

export const dynamic = "force-dynamic";

const labels = {
  ok: {
    text: "Operacional",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  warning: {
    text: "Atenção",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  unavailable: {
    text: "Indisponível",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

function StatusBadge({ status }: { status: keyof typeof labels }) {
  const item = labels[status];
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${item.className}`}
    >
      {item.text}
    </span>
  );
}

function dateTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(value))
    : "Não identificado";
}

export default async function SystemPage() {
  const user = await requireCurrentUser();
  if (user.role !== "Administrador")
    return (
      <div className="mx-auto max-w-xl rounded-xl border bg-white p-8 text-center">
        <h1 className="text-xl font-semibold">Acesso negado</h1>
        <p className="mt-2 text-sm text-slate-500">
          Esta área é restrita a administradores.
        </p>
      </div>
    );
  const status = await getSystemStatus();
  const cards = [
    {
      title: "Aplicação",
      icon: Server,
      state: status.application.status,
      rows: [
        ["Versão", status.application.version],
        ["Ambiente", status.application.environment],
        ["Node.js", status.application.nodeVersion],
        [
          "Tempo ativo",
          `${Math.floor(status.application.uptimeSeconds / 60)} min`,
        ],
      ],
    },
    {
      title: "PostgreSQL",
      icon: Database,
      state: status.database.status,
      rows: [
        [
          "Latência",
          status.database.latencyMs === null
            ? "Indisponível"
            : `${status.database.latencyMs} ms`,
        ],
        ["Última migration", dateTime(status.database.lastMigrationAt)],
      ],
    },
    {
      title: "Anexos",
      icon: HardDrive,
      state: status.storage.status,
      rows: [
        [
          "Arquivos armazenados",
          status.storage.uploadCount?.toLocaleString("pt-BR") ?? "Indisponível",
        ],
        [
          "Espaço disponível",
          status.storage.availableBytes === null
            ? "Indisponível"
            : formatBytes(status.storage.availableBytes),
        ],
        [
          "Capacidade do volume",
          status.storage.totalBytes === null
            ? "Indisponível"
            : formatBytes(status.storage.totalBytes),
        ],
      ],
    },
    {
      title: "Backup",
      icon: ShieldCheck,
      state: status.backup.status,
      rows: [
        [
          "Último backup completo",
          status.backup.lastCompleteAt
            ? dateTime(status.backup.lastCompleteAt)
            : "Ainda não detectado",
        ],
        ["Composição", "PostgreSQL + anexos"],
      ],
    },
    {
      title: "Alertas de SLA",
      icon: BellRing,
      state: status.automation.status,
      rows: [
        [
          "Última execução concluída",
          status.automation.lastCompletedAt
            ? dateTime(status.automation.lastCompletedAt)
            : "Ainda não executado",
        ],
        [
          "Estado da última execução",
          status.automation.lastRunStatus === "ok"
            ? "Concluída"
            : status.automation.lastRunStatus === "running"
              ? "Em execução"
              : status.automation.lastRunStatus === "error"
                ? "Falhou"
                : "Sem registro",
        ],
        ["Intervalo", `${Math.round(status.automation.intervalMs / 1000)} s`],
      ],
    },
  ] as const;
  return (
    <div className="space-y-6">
      <PageHeading
        title="Saúde do sistema"
        description="Diagnóstico operacional da aplicação, banco, anexos, automações e backups."
      />
      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
              <Activity className="size-5" />
            </span>
            <div>
              <p className="font-medium">Estado geral</p>
              <p className="mt-1 text-sm text-slate-500">
                Atualizado em {dateTime(status.generatedAt)}
              </p>
            </div>
          </div>
          <StatusBadge status={status.overall} />
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Card key={card.title} className="shadow-none">
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-600">
                  <card.icon className="size-4" />
                </span>
                <CardTitle>{card.title}</CardTitle>
              </div>
              <StatusBadge status={card.state} />
            </CardHeader>
            <CardContent>
              <dl className="divide-y rounded-lg border">
                {card.rows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm"
                  >
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="text-right font-medium text-slate-800">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-cyan-100 bg-cyan-50/60 p-4 text-sm text-cyan-900">
        <Clock3 className="mt-0.5 size-4 shrink-0" />
        <p>
          O status do backup é apenas informativo. Mantenha cópias
          criptografadas fora da VPS e execute testes periódicos de restauração.
        </p>
      </div>
    </div>
  );
}
