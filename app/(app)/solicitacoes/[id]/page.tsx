import { RequestDetail } from "@/components/requests/request-detail";
import { requests } from "@/data/mock-data";

export function generateStaticParams() {
  return [...requests.map((request) => ({ id: request.id })), { id: "2026-0001429" }];
}

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequestDetail id={id} />;
}
