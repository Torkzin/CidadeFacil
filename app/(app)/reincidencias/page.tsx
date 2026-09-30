import { PageHeading } from "@/components/common/page-heading";
import { RecurrenceDashboard } from "@/components/recurrence/recurrence-dashboard";

export default function RecurrencePage() {
  return <div className="space-y-6"><PageHeading title="Reincidências e mapa de calor" description="Identifique concentrações, ocorrências repetidas e pontos que exigem uma solução definitiva." /><RecurrenceDashboard /></div>;
}
