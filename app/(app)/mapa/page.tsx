import { PageHeading } from "@/components/common/page-heading";
import { RequestsMap } from "@/components/map/requests-map";

export default function MapPage() {
  return <div className="space-y-6"><PageHeading title="Mapa de solicitações" description="Visualize as ocorrências com coordenadas registradas." /><RequestsMap /></div>;
}
