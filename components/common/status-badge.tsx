import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RequestPriority, RequestStatus } from "@/types";

const statusStyles: Record<RequestStatus, string> = {
  Aberta: "border-amber-200 bg-amber-50 text-amber-700",
  Triagem: "border-violet-200 bg-violet-50 text-violet-700",
  Encaminhada: "border-blue-200 bg-blue-50 text-blue-700",
  "Em andamento": "border-cyan-200 bg-cyan-50 text-cyan-700",
  Aguardando: "border-slate-200 bg-slate-100 text-slate-700",
  Concluída: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Cancelada: "border-rose-200 bg-rose-50 text-rose-700",
};

const priorityStyles: Record<RequestPriority, string> = {
  Baixa: "border-slate-200 bg-slate-50 text-slate-600",
  Normal: "border-blue-200 bg-blue-50 text-blue-700",
  Alta: "border-orange-200 bg-orange-50 text-orange-700",
  Urgente: "border-rose-200 bg-rose-50 text-rose-700",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <Badge variant="outline" className={cn("font-medium", statusStyles[status])}><span className="mr-1.5 size-1.5 rounded-full bg-current" />{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  return <Badge variant="outline" className={cn("font-medium", priorityStyles[priority])}>{priority}</Badge>;
}
