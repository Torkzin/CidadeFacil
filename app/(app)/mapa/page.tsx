import { PageHeading } from "@/components/common/page-heading";
import { MockMap } from "@/components/map/mock-map";

export default function MapPage() {
  return <div className="space-y-6"><PageHeading title="Mapa de solicitações" description="Visualize a distribuição geográfica das ocorrências em aberto." /><MockMap /></div>;
}
