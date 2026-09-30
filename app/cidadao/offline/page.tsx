import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function CitizenOfflinePage() {
  return (
    <section className="grid min-h-[calc(100vh-129px)] place-items-center px-4 py-16">
      <div className="max-w-md text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-teal-50 text-teal-700"><WifiOff className="size-7" /></div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Você está sem conexão</h1>
        <p className="mt-3 leading-7 text-slate-600">Assim que a internet voltar, abra novamente o aplicativo para registrar ou acompanhar sua solicitação.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/cidadao" className="inline-flex h-11 items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800">Tentar novamente</Link>
          <Link href="/cidadao/consultar" className="inline-flex h-11 items-center justify-center rounded-lg border bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Consultar protocolo</Link>
        </div>
      </div>
    </section>
  );
}
