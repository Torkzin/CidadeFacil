import { PageHeading } from "@/components/common/page-heading";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { requireCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  if (user.role !== "Administrador") redirect("/acesso-negado");
  return <div className="space-y-6"><PageHeading title="Configurações" description="Personalize as regras, acessos e identidade da plataforma." /><SettingsPanel /></div>;
}
