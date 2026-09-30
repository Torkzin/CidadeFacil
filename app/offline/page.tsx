import Link from "next/link";
export default function OfflinePage() { return <main className="grid min-h-screen place-items-center bg-slate-50 px-4"><div className="max-w-md text-center"><h1 className="text-3xl font-semibold">Sem conexão</h1><p className="mt-3 text-slate-600">Verifique sua internet e tente novamente. Nenhum dado incompleto foi enviado.</p><Link href="/" className="mt-6 inline-flex rounded-lg bg-cyan-800 px-4 py-2 text-sm font-medium text-white">Tentar novamente</Link></div></main>; }

