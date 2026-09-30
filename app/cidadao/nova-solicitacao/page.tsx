import { CitizenRequestForm } from "@/components/citizen/citizen-request-form";

export default function NewCitizenRequestPage() {
  return <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><div className="mb-8"><p className="text-sm font-semibold text-cyan-800">Portal do Cidadão</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Nova solicitação</h1><p className="mt-2 text-slate-600">Preencha os dados abaixo. Campos marcados com * são obrigatórios.</p></div><CitizenRequestForm /></div>;
}

