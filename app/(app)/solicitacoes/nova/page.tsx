import { PageHeading } from "@/components/common/page-heading";
import { NewRequestForm } from "@/components/requests/new-request-form";

export default function NewRequestPage() {
  return <div className="space-y-6"><PageHeading title="Nova solicitação" description="Registre uma nova demanda para atendimento municipal." /><NewRequestForm /></div>;
}
