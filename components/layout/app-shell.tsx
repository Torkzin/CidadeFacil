"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  UserRound,
  Workflow,
  ClipboardList,
  X,
  CheckCheck,
  Loader2,
  ListTodo,
  ScrollText,
  Route,
  Wrench,
  HardHat,
  CalendarDays,
  ListChecks,
  Flame,
  MessageCircleMore,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WebMcpTools } from "@/components/layout/webmcp-tools";
import { PwaInstallButton } from "@/components/pwa/install-button";

type ShellUser = {
  name: string;
  role:
    "Administrador" | "Secretário" | "Gestor" | "Servidor" | "Equipe de campo";
};
const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Painel Executivo",
    href: "/executivo",
    icon: ChartNoAxesCombined,
    roles: ["Administrador", "Secretário", "Gestor"],
  },
  { name: "Solicitações", href: "/solicitacoes", icon: ClipboardList },
  { name: "Ordens de serviço", href: "/ordens-servico", icon: Wrench },
  { name: "Agenda de equipes", href: "/agenda-equipes", icon: CalendarDays },
  { name: "Roteiro de campo", href: "/roteiro-campo", icon: Route },
  { name: "Checklists de serviço", href: "/checklists", icon: ListChecks, roles: ["Administrador"] },
  { name: "Operação em campo", href: "/campo", icon: HardHat },
  { name: "Fila de pendências", href: "/pendencias", icon: ListTodo },
  {
    name: "WhatsApp",
    href: "/whatsapp",
    icon: MessageCircleMore,
    roles: ["Administrador", "Secretário", "Gestor", "Servidor"],
  },
  {
    name: "Regras automáticas",
    href: "/regras-encaminhamento",
    icon: Route,
    roles: ["Administrador"],
  },
  { name: "Mapa", href: "/mapa", icon: Map },
  { name: "Reincidências", href: "/reincidencias", icon: Flame },
  {
    name: "Secretarias",
    href: "/secretarias",
    icon: Building2,
    roles: ["Administrador"],
  },
  {
    name: "Equipes",
    href: "/equipes",
    icon: Workflow,
    roles: ["Administrador"],
  },
  {
    name: "Usuários",
    href: "/usuarios",
    icon: Users,
    roles: ["Administrador"],
  },
  { name: "Relatórios", href: "/relatorios", icon: ChartNoAxesCombined },
  {
    name: "Configurações",
    href: "/configuracoes",
    icon: Settings,
    roles: ["Administrador"],
  },
  {
    name: "Auditoria",
    href: "/auditoria",
    icon: ScrollText,
    roles: ["Administrador"],
  },
  {
    name: "Saúde do sistema",
    href: "/sistema",
    icon: Activity,
    roles: ["Administrador"],
  },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-3"
      aria-label="CidadeFácil — Dashboard"
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-cyan-700 text-white shadow-sm shadow-cyan-950/20">
        <Building2 className="size-[18px]" strokeWidth={2.3} />
      </div>
      {!compact && (
        <div>
          <div className="text-[15px] font-semibold leading-4 tracking-tight">
            CidadeFácil
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Gestão municipal
          </div>
        </div>
      )}
    </Link>
  );
}

function NavLinks({
  user,
  onNavigate,
  compact = false,
}: {
  user: ShellUser;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1" aria-label="Navegação principal">
      {navigation
        .filter((item) => !item.roles || item.roles.includes(user.role))
        .map((item) => {
          const active =
            pathname === item.href ||
            (item.href === "/solicitacoes" &&
              pathname.startsWith("/solicitacoes/"));
          const content = (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all",
                active
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100",
                compact && "justify-center px-0",
              )}
            >
              <item.icon
                className={cn(
                  "size-[18px] shrink-0",
                  active
                    ? "text-cyan-300"
                    : "text-slate-500 group-hover:text-slate-300",
                )}
              />
              {!compact && item.name}
            </Link>
          );
          return compact ? (
            <Tooltip key={item.name}>
              <TooltipTrigger render={content} />
              <TooltipContent side="right">{item.name}</TooltipContent>
            </Tooltip>
          ) : (
            content
          );
        })}
    </nav>
  );
}

function AccountMenu({
  user,
  compact = false,
}: {
  user: ShellUser;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-left hover:bg-white/[0.08]",
              compact && "justify-center border-0 bg-transparent p-1",
            )}
          >
            <Avatar className="size-8 border border-white/10">
              <AvatarFallback className="bg-cyan-900 text-xs font-semibold text-cyan-100">
                {user.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
              </AvatarFallback>
            </Avatar>
            {!compact && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">
                    {user.name}
                  </span>
                  <span className="block truncate text-xs text-slate-400">
                    {user.role}
                  </span>
                </span>
                <ChevronDown className="size-4 text-slate-500" />
              </>
            )}
          </button>
        }
      />
      <DropdownMenuContent side="top" align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <UserRound /> Perfil
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ShieldCheck /> Segurança
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CircleHelp /> Central de ajuda
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <SessionMenuActions />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Sidebar({
  user,
  mobile = false,
  onNavigate,
}: {
  user: ShellUser;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-[#0d1b2a] text-white",
        mobile ? "w-full" : "fixed inset-y-0 left-0 z-30 hidden w-64 lg:flex",
      )}
    >
      <div className="flex h-[72px] items-center border-b border-white/[0.07] px-5">
        <Brand />
      </div>
      <div className="border-b border-white/[0.07] px-5 py-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Ambiente de demonstração
        </div>
        <p className="mt-2 text-sm text-slate-300">
          Prefeitura Municipal de Seropédica
        </p>
      </div>
      <div className="scrollbar-subtle flex-1 overflow-y-auto px-3 py-4">
        <NavLinks user={user} onNavigate={onNavigate} />
      </div>
      <div className="border-t border-white/[0.07] p-3">
        <AccountMenu user={user} />
      </div>
    </aside>
  );
}

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    Array<{
      id: string;
      type: string;
      title: string;
      subtitle: string;
      href: string;
    }>
  >([]);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
        signal: controller.signal,
      })
        .then((response) =>
          response.ok
            ? response.json()
            : Promise.reject(new Error("Busca indisponível")),
        )
        .then((data: { items: typeof results }) => setResults(data.items))
        .catch((error) => {
          if (error.name !== "AbortError") setResults([]);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);
  return (
    <div className="relative hidden w-full max-w-md md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          setOpen(true);
          if (value.trim().length < 2) {
            setResults([]);
            setLoading(false);
          }
        }}
        placeholder="Pesquisar protocolo, bairro..."
        className="h-9 border-slate-200 bg-slate-50/80 pl-9 pr-14 shadow-none focus:bg-white"
      />
      <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border bg-white px-1.5 py-0.5 text-[10px] text-slate-400">
        ⌘ K
      </kbd>
      {open && query.length >= 2 && (
        <div className="absolute top-11 z-50 w-full rounded-xl border bg-white p-1.5 shadow-xl shadow-slate-900/10">
          <div className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-500">
            <span>Resultados rápidos</span>
            <button onClick={() => setOpen(false)} aria-label="Fechar">
              <X className="size-3.5" />
            </button>
          </div>
          {loading ? (
            <p className="flex items-center justify-center gap-2 px-2 py-6 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" /> Pesquisando...
            </p>
          ) : results.length ? (
            results.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.href}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
                className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50"
              >
                <span className="mt-1 size-2 rounded-full bg-cyan-600" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {item.title}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {item.type} · {item.subtitle}
                  </span>
                </span>
              </Link>
            ))
          ) : (
            <p className="px-2 py-6 text-center text-sm text-slate-500">
              Nenhum resultado encontrado.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  readAt: string | null;
  createdAt: string;
  requestId: string | null;
  protocol: string | null;
};

function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications");
      if (!response.ok) return;
      const data = (await response.json()) as {
        items: NotificationItem[];
        unreadCount: number;
      };
      setItems(data.items);
      setUnread(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    fetch("/api/notifications")
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (data: { items: NotificationItem[]; unreadCount: number } | null) => {
          if (active && data) {
            setItems(data.items);
            setUnread(data.unreadCount);
          }
        },
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function markAllRead() {
    const response = await fetch("/api/notifications", { method: "PATCH" });
    if (response.ok) {
      setUnread(0);
      setItems((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
    }
  }
  async function markRead(item: NotificationItem) {
    if (!item.readAt) {
      await fetch(`/api/notifications/${item.id}`, { method: "PATCH" });
      setUnread((value) => Math.max(0, value - 1));
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, readAt: new Date().toISOString() }
            : entry,
        ),
      );
    }
    setOpen(false);
  }
  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) void load();
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative text-slate-500"
          >
            <Bell className="size-[18px]" />
            {unread > 0 && (
              <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-rose-500" />
            )}
            <span className="sr-only">Notificações</span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-semibold">Notificações</span>
          {unread > 0 ? (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs font-medium text-cyan-700 hover:text-cyan-900"
            >
              <CheckCheck className="size-3.5" /> Marcar lidas
            </button>
          ) : (
            <span className="text-xs text-slate-400">Tudo em dia</span>
          )}
        </div>
        {loading && !items.length ? (
          <p className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" /> Carregando...
          </p>
        ) : items.length ? (
          items.map((item) => {
            const content = (
              <>
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    item.readAt ? "bg-slate-200" : "bg-cyan-600",
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-4 text-slate-500">
                    {item.description}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(item.createdAt))}
                  </p>
                </div>
              </>
            );
            return item.requestId ? (
              <Link
                key={item.id}
                href={`/solicitacoes/${item.requestId}`}
                onClick={() => void markRead(item)}
                className="flex gap-3 border-b px-4 py-3 hover:bg-slate-50 last:border-0"
              >
                {content}
              </Link>
            ) : (
              <button
                key={item.id}
                onClick={() => void markRead(item)}
                className="flex w-full gap-3 border-b px-4 py-3 text-left hover:bg-slate-50 last:border-0"
              >
                {content}
              </button>
            );
          })
        ) : (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            Nenhuma notificação.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Header({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const parts = pathname.split("/").filter(Boolean);
  const title = parts.length
    ? parts[parts.length - 1].replaceAll("-", " ")
    : "Dashboard";
  const readable = /^2026/.test(title)
    ? title
    : title.charAt(0).toUpperCase() + title.slice(1);
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="size-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          }
        />
        <SheetContent side="left" className="w-[280px] border-0 p-0">
          <SheetTitle className="sr-only">Menu principal</SheetTitle>
          <Sidebar user={user} mobile onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="hidden min-w-48 lg:block">
        <div className="text-xs text-slate-400">
          CidadeFácil <span className="px-1">/</span>
        </div>
        <div className="mt-0.5 text-sm font-medium capitalize text-slate-700">
          {readable}
        </div>
      </div>
      <div className="flex flex-1 justify-center">
        <GlobalSearch />
      </div>
      <PwaInstallButton app="management" compact />
      <NotificationCenter />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100">
              <Avatar className="size-8">
                <AvatarFallback className="bg-cyan-800 text-xs font-semibold text-white">
                  {user.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="hidden size-4 text-slate-400 sm:block" />
            </button>
          }
        />
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {user.name}
              <span className="block text-xs font-normal text-muted-foreground">
                {user.role}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings /> Configurações
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Sparkles /> Novidades
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <SessionMenuActions />
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function SessionMenuActions() {
  return (
    <>
      <form action="/api/auth/logout?mode=switch" method="post">
        <DropdownMenuItem nativeButton render={<button type="submit" className="w-full" />}>
          <UserRound /> Trocar de conta
        </DropdownMenuItem>
      </form>
      <form action="/api/auth/logout?mode=logout" method="post">
        <DropdownMenuItem
          nativeButton
          className="text-rose-600"
          render={<button type="submit" className="w-full" />}
        >
          <LogOut /> Sair
        </DropdownMenuItem>
      </form>
    </>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50/70">
      <WebMcpTools />
      <Sidebar user={user} />
      <div className="lg:pl-64">
        <Header user={user} />
        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
