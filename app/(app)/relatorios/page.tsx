import { PageHeading } from "@/components/common/page-heading";
import { ReportCards } from "@/components/reports/report-cards";

export default function ReportsPage() {
  return <div className="space-y-6"><PageHeading title="Relatórios" description="Analise indicadores e exporte informações para apoiar a tomada de decisão." /><ReportCards /></div>;
}
