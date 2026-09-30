import Link from "next/link";
import { getPublicMunicipality } from "@/lib/server/public-municipality";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const municipality = await getPublicMunicipality();
  return <main className="min-h-screen bg-slate-50 px-4 py-12"><article className="mx-auto max-w-3xl rounded-2xl border bg-white p-6 shadow-sm sm:p-10"><p className="text-sm font-semibold text-cyan-800">CidadeFácil</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Política de Privacidade</h1><p className="mt-2 text-sm text-slate-500">{municipality?.governmentName ?? municipality?.name ?? "Município de Seropédica"}</p><div className="mt-8 space-y-5 text-sm leading-7 text-slate-700">{municipality?.privacyPolicy ? <div className="whitespace-pre-wrap">{municipality.privacyPolicy}</div> : <><p>Os dados informados no Portal do Cidadão são utilizados para registrar, encaminhar e acompanhar solicitações de serviços municipais.</p><p>O sistema coleta apenas os dados necessários ao atendimento, como nome, telefone, e-mail opcional, localização da ocorrência e imagens enviadas. O acesso administrativo é restrito a usuários autorizados.</p><p>O protocolo e o código de acompanhamento devem ser mantidos em segurança. Eles permitem consultar o andamento sem expor dados pessoais publicamente.</p><p>Para dúvidas sobre tratamento de dados, utilize os canais oficiais da Prefeitura Municipal de Seropédica.</p></>}<aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><strong>Aviso institucional:</strong> este texto é uma base técnica provisória e deve ser revisado pelo responsável jurídico e de proteção de dados da prefeitura antes do piloto público.</aside></div><Link href="/cidadao" className="mt-8 inline-block font-medium text-cyan-800">← Voltar ao Portal do Cidadão</Link></article></main>;
}

