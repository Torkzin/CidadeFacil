import { PageHeading } from "@/components/common/page-heading";
import { FieldOperationsPanel } from "@/components/work-orders/field-operations-panel";

export default function FieldOperationsPage() {
  return <div className="space-y-6"><PageHeading title="Operação em campo" description="Execução móvel das ordens de serviço atribuídas à sua equipe." /><FieldOperationsPanel /></div>;
}
