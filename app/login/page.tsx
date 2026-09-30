"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível entrar.");
      router.push("/dashboard");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar.");
      setLoading(false);
    }
  }
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[#0d1b2a] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 data-grid opacity-[0.08]" />
        <div className="absolute -right-24 top-1/4 size-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-cyan-600"><Building2 className="size-5" /></div><div><div className="font-semibold tracking-tight">CidadeFácil</div><div className="text-xs text-slate-400">Gestão municipal inteligente</div></div></div>
        <div className="relative max-w-xl">
          <div className="mb-7 flex size-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10"><ShieldCheck className="size-6 text-cyan-300" /></div>
          <h1 className="text-4xl font-semibold leading-tight tracking-[-0.03em] xl:text-5xl">Demandas da cidade, organizadas em um só lugar.</h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">Acompanhe solicitações, coordene equipes e transforme dados municipais em decisões mais rápidas.</p>
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-7">
            <div><strong className="block text-2xl">1.428</strong><span className="text-sm text-slate-400">solicitações</span></div>
            <div><strong className="block text-2xl">88%</strong><span className="text-sm text-slate-400">resolvidas</span></div>
            <div><strong className="block text-2xl">21</strong><span className="text-sm text-slate-400">equipes</span></div>
          </div>
        </div>
        <p className="relative text-xs text-slate-500">Prefeitura Municipal de Seropédica · Ambiente de desenvolvimento</p>
      </section>
      <section className="flex items-center justify-center bg-slate-50/60 p-5 sm:p-10">
        <div className="w-full max-w-[430px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><div className="grid size-10 place-items-center rounded-xl bg-cyan-700 text-white"><Building2 className="size-5" /></div><div className="font-semibold">CidadeFácil</div></div>
          <Card className="border-slate-200/80 py-0 shadow-xl shadow-slate-950/[0.06]">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-7"><p className="text-sm font-medium text-cyan-700">Acesso administrativo</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Bem-vindo de volta</h2><p className="mt-2 text-sm text-muted-foreground">Entre para continuar no painel da prefeitura.</p></div>
              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2"><Label htmlFor="email">E-mail</Label><div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu.email@cidadeexemplo.gov.br" autoComplete="email" required className="h-11 pl-10" /></div></div>
                <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">Senha</Label><button type="button" className="text-xs font-medium text-cyan-700 hover:text-cyan-900">Esqueci minha senha</button></div><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" autoComplete="current-password" required className="h-11 px-10" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
                {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600"><Checkbox /> Lembrar de mim</label>
                <Button type="submit" className="h-11 w-full bg-cyan-800 hover:bg-cyan-900" disabled={loading}>{loading ? "Entrando..." : <>Entrar <ArrowRight className="ml-1 size-4" /></>}</Button>
              </form>
              <p className="mt-6 rounded-lg bg-slate-50 px-3 py-2.5 text-center text-xs text-slate-500">Acesso de desenvolvimento: admin@cidadefacil.local</p>
            </CardContent>
          </Card>
          <p className="mt-5 text-center text-xs text-slate-400">© 2026 CidadeFácil. Todos os dados são fictícios.</p>
        </div>
      </section>
    </main>
  );
}
