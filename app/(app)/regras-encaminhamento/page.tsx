import { redirect } from "next/navigation";
import { PageHeading } from "@/components/common/page-heading";
import { RoutingRulesPanel } from "@/components/routing/routing-rules-panel";
import { requireCurrentUser } from "@/lib/auth/session";

export default async function RoutingRulesPage() {
  const user = await requireCurrentUser();
  if (user.role !== "Administrador") redirect("/acesso-negado");
  return (
    <div className="space-y-6">
      <PageHeading
        title="Regras de encaminhamento"
        description="Direcione automaticamente novas solicitações por categoria e bairro, sempre com possibilidade de revisão humana."
      />
      <RoutingRulesPanel />
    </div>
  );
}
