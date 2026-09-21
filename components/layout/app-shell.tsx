"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Bell, Building2, ChartNoAxesCombined, ChevronDown, CircleHelp, LayoutDashboard,
  LogOut, Map, Menu, Search, Settings, ShieldCheck, Sparkles, Users, UserRound,
  Workflow, ClipboardList, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { requests } from "@/data/mock-data";
import { WebMcpTools } from "@/components/layout/webmcp-tools";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Solicitações", href: "/solicitacoes", icon: ClipboardList },
  { name: "Mapa", href: "/mapa", icon: Map },
  { name: "Secretarias", href: "/secretarias", icon: Building2 },
  { name: "Equipes", href: "/equipes", icon: Workflow },
  { name: "Usuários", href: "/usuarios", icon: Users },
  { name: "Relatórios", href: "/relatorios", icon: ChartNoAxesCombined },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-3" aria-label="CidadeFácil — Dashboard">
      <div className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-cyan-700 text-white shadow-sm shadow-cyan-950/20">
        <Building2 className="size-[18px]" strokeWidth={2.3} />
      </div>
      {!compact && <div><div className="text-[15px] font-semibold leading-4 tracking-tight">CidadeFácil</div><div className="mt-1 text-[11px] text-slate-400">Gestão municipal</div></div>}
    </Link>
  );
}

function NavLinks({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1" aria-label="Navegação principal">
      {navigation.map((item) => {
        const active = pathname === item.href || (item.href === "/solicitacoes" && pathname.startsWith("/solicitacoes/"));
        const content = (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all",
              active ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100",
              compact && "justify-center px-0"
            )}
          >
            <item.icon className={cn("size-[18px] shrink-0", active ? "text-cyan-300" : "text-slate-500 group-hover:text-slate-300")} />
            {!compact && item.name}
          </Link>
        );
        return compact ? <Tooltip key={item.name}><TooltipTrigger render={content} /><TooltipContent side="right">{item.name}</TooltipContent></Tooltip> : content;
      })}
    </nav>
  );
}

function AccountMenu({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <button className={cn("flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-left hover:bg-white/[0.08]", compact && "justify-center border-0 bg-transparent p-1")}>
          <Avatar className="size-8 border border-white/10"><AvatarFallback className="bg-cyan-900 text-xs font-semibold text-cyan-100">MV</AvatarFallback></Avatar>
          {!compact && <><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-white">Matheus Vieira</span><span className="block truncate text-xs text-slate-400">Administrador</span></span><ChevronDown className="size-4 text-slate-500" /></>}
        </button>
      } />
      <DropdownMenuContent side="top" align="end" className="w-56">
        <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem><UserRound /> Perfil</DropdownMenuItem>
        <DropdownMenuItem><ShieldCheck /> Segurança</DropdownMenuItem>
        <DropdownMenuItem><CircleHelp /> Central de ajuda</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-rose-600" onClick={() => router.push("/login")}><LogOut /> Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  return (
    <aside className={cn("flex h-full flex-col bg-[#0d1b2a] text-white", mobile ? "w-full" : "fixed inset-y-0 left-0 z-30 hidden w-64 lg:flex")}>
      <div className="flex h-[72px] items-center border-b border-white/[0.07] px-5"><Brand /></div>
      <div className="border-b border-white/[0.07] px-5 py-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500"><span className="size-1.5 rounded-full bg-emerald-400" />Ambiente de demonstração</div>
        <p className="mt-2 text-sm text-slate-300">Prefeitura Municipal de Cidade Exemplo</p>
      </div>
      <div className="scrollbar-subtle flex-1 overflow-y-auto px-3 py-4"><NavLinks onNavigate={onNavigate} /></div>
      <div className="border-t border-white/[0.07] p-3"><AccountMenu /></div>
    </aside>
  );
}

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => query.length < 2 ? [] : requests.filter((item) => `${item.protocol} ${item.title} ${item.neighborhood}`.toLowerCase().includes(query.toLowerCase())).slice(0, 4), [query]);
  return (
    <div className="relative hidden w-full max-w-md md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
      <Input value={query} onFocus={() => setOpen(true)} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} placeholder="Pesquisar protocolo, bairro..." className="h-9 border-slate-200 bg-slate-50/80 pl-9 pr-14 shadow-none focus:bg-white" />
      <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border bg-white px-1.5 py-0.5 text-[10px] text-slate-400">⌘ K</kbd>
      {open && query.length >= 2 && (
        <div className="absolute top-11 z-50 w-full rounded-xl border bg-white p-1.5 shadow-xl shadow-slate-900/10">
          <div className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-500"><span>Resultados rápidos</span><button onClick={() => setOpen(false)} aria-label="Fechar"><X className="size-3.5" /></button></div>
          {results.length ? results.map((item) => <Link key={item.id} href={`/solicitacoes/${item.id}`} onClick={() => { setOpen(false); setQuery(""); }} className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50"><span className="mt-1 size-2 rounded-full bg-cyan-600" /><span><span className="block text-sm font-medium">{item.title}</span><span className="text-xs text-slate-500">{item.protocol} · {item.neighborhood}</span></span></Link>) : <p className="px-2 py-6 text-center text-sm text-slate-500">Nenhum resultado encontrado.</p>}
        </div>
      )}
    </div>
  );
}

function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const parts = pathname.split("/").filter(Boolean);
  const title = parts.length ? parts[parts.length - 1].replaceAll("-", " ") : "Dashboard";
  const readable = /^2026/.test(title) ? title : title.charAt(0).toUpperCase() + title.slice(1);
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden"><Menu className="size-5" /><span className="sr-only">Abrir menu</span></Button>} />
        <SheetContent side="left" className="w-[280px] border-0 p-0"><SheetTitle className="sr-only">Menu principal</SheetTitle><Sidebar mobile onNavigate={() => setMobileOpen(false)} /></SheetContent>
      </Sheet>
      <div className="hidden min-w-48 lg:block"><div className="text-xs text-slate-400">CidadeFácil <span className="px-1">/</span></div><div className="mt-0.5 text-sm font-medium capitalize text-slate-700">{readable}</div></div>
      <div className="flex flex-1 justify-center"><GlobalSearch /></div>
      <Popover>
        <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative text-slate-500"><Bell className="size-[18px]" /><span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-rose-500" /><span className="sr-only">Notificações</span></Button>} />
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between border-b px-4 py-3"><span className="font-semibold">Notificações</span><span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700">3 novas</span></div>
          {["Solicitação urgente atribuída", "Equipe concluiu atendimento", "Prazo próximo do vencimento"].map((item, index) => <div key={item} className="flex gap-3 border-b px-4 py-3 last:border-0"><span className={cn("mt-1.5 size-2 shrink-0 rounded-full", index === 1 ? "bg-emerald-500" : "bg-cyan-600")} /><div><p className="text-sm font-medium">{item}</p><p className="mt-0.5 text-xs text-slate-500">{index === 0 ? "Há 8 minutos" : index === 1 ? "Há 32 minutos" : "Há 1 hora"}</p></div></div>)}
        </PopoverContent>
      </Popover>
      <DropdownMenu>
        <DropdownMenuTrigger render={<button className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100"><Avatar className="size-8"><AvatarFallback className="bg-cyan-800 text-xs font-semibold text-white">MV</AvatarFallback></Avatar><ChevronDown className="hidden size-4 text-slate-400 sm:block" /></button>} />
        <DropdownMenuContent align="end" className="w-52"><DropdownMenuLabel>Matheus Vieira<span className="block text-xs font-normal text-muted-foreground">Administrador</span></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem><Settings /> Configurações</DropdownMenuItem><DropdownMenuItem><Sparkles /> Novidades</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-rose-600"><LogOut /> Sair</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50/70"><WebMcpTools /><Sidebar /><div className="lg:pl-64"><Header /><main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main></div></div>;
}
