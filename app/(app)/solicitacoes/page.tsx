import { PageHeading } from "@/components/common/page-heading";
import { NewRequestButton, RequestsTable } from "@/components/requests/requests-table";

export default function RequestsPage() {
  return <div className="space-y-6"><PageHeading title="Solicitações" description="Gerencie e acompanhe as demandas registradas pelos cidadãos." actions={<NewRequestButton />} /><RequestsTable /></div>;
}
