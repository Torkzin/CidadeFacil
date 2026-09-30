import { PublicRequestLookup } from "@/components/citizen/public-request-lookup";

export default function CitizenLookupPage() {
  return <div className="mx-auto max-w-xl px-4 py-12 sm:px-6"><div className="text-center"><p className="text-sm font-semibold text-cyan-800">Acompanhamento seguro</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Consultar solicitação</h1><p className="mt-3 text-slate-600">Informe o protocolo e o código de acompanhamento recebidos no cadastro.</p></div><PublicRequestLookup /></div>;
}

