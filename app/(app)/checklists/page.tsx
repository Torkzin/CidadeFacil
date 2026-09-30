import { redirect } from "next/navigation";
import { PageHeading } from "@/components/common/page-heading";
import { ChecklistManager } from "@/components/work-orders/checklist-manager";
import { requireCurrentUser } from "@/lib/auth/session";

export default async function ChecklistsPage() {
  const user = await requireCurrentUser();
  if (user.role !== "Administrador") redirect("/acesso-negado");
  return <div className="space-y-6"><PageHeading title="Checklists de serviço" description="Padronize os procedimentos exigidos para cada categoria municipal." /><ChecklistManager /></div>;
}
