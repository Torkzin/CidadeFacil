import { AuditLogViewer } from "@/components/audit/audit-log-viewer";
import { requireCurrentUser } from "@/lib/auth/session";

export default async function AuditPage() {
  const user = await requireCurrentUser();
  if (user.role !== "Administrador") return <div className="mx-auto max-w-xl rounded-xl border bg-white p-8 text-center"><h1 className="text-xl font-semibold">Acesso negado</h1><p className="mt-2 text-sm text-slate-500">Esta área é restrita a administradores.</p></div>;
  return <AuditLogViewer />;
}

