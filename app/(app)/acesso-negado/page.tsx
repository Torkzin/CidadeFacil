import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() { return <div className="grid min-h-[60vh] place-items-center"><div className="max-w-md text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-700"><ShieldX className="size-7" /></span><p className="mt-5 text-sm font-semibold text-rose-700">Erro 403</p><h1 className="mt-2 text-2xl font-semibold">Acesso negado</h1><p className="mt-3 text-sm leading-6 text-slate-500">Seu cargo não possui permissão para acessar esta área. Se isso parecer incorreto, procure o administrador municipal.</p><Button className="mt-6" render={<Link href="/dashboard" />} nativeButton={false}>Voltar ao dashboard</Button></div></div>; }
