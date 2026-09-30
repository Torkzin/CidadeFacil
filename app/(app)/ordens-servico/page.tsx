import { PageHeading } from "@/components/common/page-heading";
import { WorkOrdersList } from "@/components/work-orders/work-orders-list";

export default function WorkOrdersPage() {
  return <div className="space-y-6"><PageHeading title="Ordens de serviço" description="Planejamento e acompanhamento das execuções em campo." /><WorkOrdersList /></div>;
}
