"use client";

import { useState } from "react";
import { Bell, Building2, Check, ChevronRight, KeyRound, Layers3, Palette, Save, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const sections = [
  { id: "city", label: "Dados da prefeitura", description: "Informações institucionais", icon: Building2 },
  { id: "users", label: "Usuários e permissões", description: "Papéis e níveis de acesso", icon: Users },
  { id: "categories", label: "Categorias", description: "Tipos de solicitação", icon: Layers3 },
  { id: "priorities", label: "Prioridades", description: "Regras e prazos de atendimento", icon: ShieldCheck },
  { id: "notifications", label: "Notificações", description: "E-mails e alertas do sistema", icon: Bell },
  { id: "brand", label: "Identidade visual", description: "Marca, cores e aparência", icon: Palette },
  { id: "security", label: "Segurança", description: "Sessões e políticas de senha", icon: KeyRound },
];

export function SettingsPanel() {
  const [active, setActive] = useState("city");
  const current = sections.find((section) => section.id === active) ?? sections[0];
  return <div className="grid gap-6 lg:grid-cols-[310px_1fr]"><Card className="gap-0 py-2 shadow-none"><CardContent className="p-2">{sections.map((section) => <button key={section.id} onClick={() => setActive(section.id)} className={`flex w-full items-center gap-3 rounded-lg p-3 text-left ${active === section.id ? "bg-cyan-50 text-cyan-900" : "hover:bg-slate-50"}`}><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${active === section.id ? "bg-white text-cyan-700 shadow-sm" : "bg-slate-100 text-slate-500"}`}><section.icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{section.label}</span><span className="block truncate text-xs text-slate-500">{section.description}</span></span><ChevronRight className="size-4 text-slate-400" /></button>)}</CardContent></Card><Card className="shadow-none"><CardContent className="p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">{current.label}</h2><p className="mt-1 text-sm text-slate-500">{current.description}</p></div><span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><current.icon className="size-5" /></span></div><Separator className="my-6" />{active === "city" ? <div className="grid max-w-2xl gap-5"><div className="space-y-2"><Label>Nome oficial</Label><Input defaultValue="Prefeitura Municipal de Cidade Exemplo" /></div><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label>CNPJ</Label><Input defaultValue="00.000.000/0001-00" /></div><div className="space-y-2"><Label>Telefone</Label><Input defaultValue="(11) 4000-0000" /></div></div><div className="space-y-2"><Label>Endereço administrativo</Label><Input defaultValue="Praça Central, 100 · Centro" /></div><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label>E-mail institucional</Label><Input defaultValue="contato@cidadeexemplo.gov.br" /></div><div className="space-y-2"><Label>Fuso horário</Label><Input defaultValue="América/São Paulo (UTC-03)" /></div></div></div> : active === "notifications" ? <div className="max-w-2xl space-y-5">{["Novas solicitações urgentes", "Solicitações próximas do prazo", "Resumo diário por e-mail", "Conclusões das equipes de campo"].map((item, index) => <div key={item} className="flex items-center justify-between rounded-lg border p-4"><div><p className="text-sm font-medium">{item}</p><p className="mt-1 text-xs text-slate-500">Notificar administradores e gestores responsáveis.</p></div><Switch defaultChecked={index !== 2} /></div>)}</div> : <div className="max-w-2xl space-y-4"><div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center"><current.icon className="mx-auto size-8 text-slate-400" /><h3 className="mt-3 font-medium">Configurações de {current.label.toLowerCase()}</h3><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Esta seção está pronta para receber as regras definitivas da prefeitura em uma próxima etapa.</p></div><div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><Check className="size-4" /> Configuração padrão ativa para a demonstração.</div></div>}<Separator className="my-6" /><div className="flex justify-end"><Button onClick={() => toast.success("Configurações salvas", { description: "Alterações mantidas localmente nesta demonstração." })}><Save className="size-4" /> Salvar alterações</Button></div></CardContent></Card></div>;
}
