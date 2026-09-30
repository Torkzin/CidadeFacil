import Link from "next/link";
export default function NotFound() { return <main className="grid min-h-screen place-items-center bg-slate-50 px-4"><div className="max-w-md text-center"><p className="text-sm font-semibold text-cyan-800">Erro 404</p><h1 className="mt-2 text-3xl font-semibold">Página não encontrada</h1><p className="mt-3 text-slate-600">O endereço informado não existe ou foi removido.</p><Link href="/" className="mt-6 inline-flex rounded-lg bg-cyan-800 px-4 py-2 text-sm font-medium text-white">Voltar ao início</Link></div></main>; }

