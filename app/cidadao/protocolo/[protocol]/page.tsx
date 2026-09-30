import { PublicRequestDetail } from "@/components/citizen/public-request-detail";

export default async function CitizenProtocolPage({ params }: { params: Promise<{ protocol: string }> }) {
  const { protocol } = await params;
  return <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><PublicRequestDetail protocol={protocol} /></div>;
}

