import { PageHeading } from "@/components/common/page-heading";
import { FieldRoutePlanner } from "@/components/work-orders/field-route-planner";

export default function FieldRoutePage() {
  return (
    <div className="space-y-6">
      <PageHeading title="Roteiro de campo" description="Agrupe atendimentos próximos e reduza deslocamentos das equipes." />
      <FieldRoutePlanner />
    </div>
  );
}
