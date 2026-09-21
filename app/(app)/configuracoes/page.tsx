import { PageHeading } from "@/components/common/page-heading";
import { SettingsPanel } from "@/components/settings/settings-panel";

export default function SettingsPage() {
  return <div className="space-y-6"><PageHeading title="Configurações" description="Personalize as regras, acessos e identidade da plataforma." /><SettingsPanel /></div>;
}
