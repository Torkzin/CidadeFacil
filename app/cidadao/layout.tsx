import type { Metadata } from "next";
import Link from "next/link";
import { Building2, LockKeyhole } from "lucide-react";
import { PwaInstallButton } from "@/components/pwa/install-button";

export const metadata: Metadata = {
  title: { default: "CidadeFácil Cidadão", template: "%s | CidadeFácil Cidadão" },
  description: "Solicite serviços municipais e acompanhe seus protocolos em Seropédica.",
  manifest: "/manifest-cidadao.webmanifest",
  applicationName: "CidadeFácil Cidadão",
  icons: { apple: "/icons/cidadao/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CidadeFácil Cidadão" },
};

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b bg-white"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"><Link href="/cidadao" className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-teal-700 text-white"><Building2 className="size-5" /></span><span><strong className="block text-sm">CidadeFácil</strong><span className="text-xs text-slate-500">Prefeitura de Seropédica</span></span></Link><nav className="flex items-center gap-2 text-sm"><PwaInstallButton app="citizen" /><Link href="/cidadao/consultar" className="hidden rounded-lg px-3 py-2 font-medium text-cyan-800 hover:bg-cyan-50 sm:block">Consultar protocolo</Link><Link href="/login" className="hidden items-center gap-1.5 rounded-lg border px-3 py-2 text-slate-600 hover:bg-slate-50 md:flex"><LockKeyhole className="size-3.5" /> Área do servidor</Link></nav></div></header>
    <main>{children}</main>
    <footer className="border-t bg-white"><div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6"><span>Prefeitura Municipal de Seropédica · Atendimento ao cidadão</span><div className="flex gap-4"><Link href="/privacidade" className="hover:text-cyan-800">Privacidade</Link><Link href="/cidadao/consultar" className="hover:text-cyan-800">Acompanhar solicitação</Link></div></div></footer>
  </div>;
}
