"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, Building2, ChevronRight, ExternalLink, Layers3, Loader2, Plus, Save, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { RequestPriority } from "@/types";

const sections = [
  { id: "city", label: "Dados da prefeitura", description: "Informações institucionais", icon: Building2 },
  { id: "categories", label: "Categorias", description: "Tipos de solicitação", icon: Layers3 },
  { id: "priorities", label: "Prioridades", description: "Regras e prazos de atendimento", icon: ShieldCheck },
  { id: "notifications", label: "Notificações", description: "Preferências de alertas", icon: Bell },
  { id: "users", label: "Usuários e permissões", description: "Papéis e níveis de acesso", icon: Users },
] as const;

type MunicipalityForm = { name: string; governmentName: string; taxId: string; phone: string; address: string; email: string; timezone: string; citizenResponseHours: number; privacyPolicy: string };
type NotificationForm = { urgentRequests: boolean; deadlineAlerts: boolean; dailyDigest: boolean; teamConclusions: boolean };
type PriorityForm = { priority: RequestPriority; responseHours: number; resolutionHours: number; active: boolean };
type Category = { id: string; name: string; color: string; publicEnabled: boolean };

const emptyMunicipality: MunicipalityForm = { name: "", governmentName: "", taxId: "", phone: "", address: "", email: "", timezone: "America/Sao_Paulo", citizenResponseHours: 72, privacyPolicy: "" };
const emptyNotifications: NotificationForm = { urgentRequests: true, deadlineAlerts: true, dailyDigest: false, teamConclusions: true };

export function SettingsPanel() {
  const [active, setActive] = useState<(typeof sections)[number]["id"]>("city");
  const [municipality, setMunicipality] = useState(emptyMunicipality);
  const [notifications, setNotifications] = useState(emptyNotifications);
  const [priorities, setPriorities] = useState<PriorityForm[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", color: "#0891b2", publicEnabled: true });
  const current = sections.find((section) => section.id === active) ?? sections[0];

  const load = useCallback(async () => {
    const [settingsResponse, categoriesResponse] = await Promise.all([fetch("/api/admin/settings", { cache: "no-store" }), fetch("/api/admin/categories", { cache: "no-store" })]);
    const settings = await settingsResponse.json();
    const categoryData = await categoriesResponse.json();
    if (!settingsResponse.ok) throw new Error(settings.error ?? "Não foi possível carregar as configurações.");
    if (!categoriesResponse.ok) throw new Error(categoryData.error ?? "Não foi possível carregar as categorias.");
    setMunicipality({ ...emptyMunicipality, ...settings.municipality });
    setNotifications({ ...emptyNotifications, ...settings.notifications });
    setPriorities(settings.priorities ?? []);
    setCategories(categoryData.items ?? []);
  }, []);

  useEffect(() => {
    let activeRequest = true;
    Promise.all([fetch("/api/admin/settings", { cache: "no-store" }).then((response) => response.json().then((data) => ({ response, data }))), fetch("/api/admin/categories", { cache: "no-store" }).then((response) => response.json().then((data) => ({ response, data })))])
      .then(([settings, categoryData]) => {
        if (!settings.response.ok) throw new Error(settings.data.error ?? "Não foi possível carregar as configurações.");
        if (!categoryData.response.ok) throw new Error(categoryData.data.error ?? "Não foi possível carregar as categorias.");
        if (!activeRequest) return;
        setMunicipality({ ...emptyMunicipality, ...settings.data.municipality });
        setNotifications({ ...emptyNotifications, ...settings.data.notifications });
        setPriorities(settings.data.priorities ?? []);
        setCategories(categoryData.data.items ?? []);
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => { if (activeRequest) setLoading(false); });
    return () => { activeRequest = false; };
  }, []);

  async function saveSection(section: "municipality" | "notifications" | "priorities", data: object) {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section, ...data }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar.");
      toast.success("Configurações salvas no banco de dados.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }

  async function createCategory() {
    const response = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCategory) });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error);
    setNewCategory({ name: "", color: "#0891b2", publicEnabled: true });
    await load();
    toast.success("Categoria criada.");
  }

  if (loading) return <Card className="shadow-none"><CardContent className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Carregando configurações...</CardContent></Card>;

  return <div className="grid gap-6 lg:grid-cols-[310px_1fr]">
    <Card className="gap-0 py-2 shadow-none"><CardContent className="p-2">{sections.map((section) => <button key={section.id} onClick={() => setActive(section.id)} className={`flex w-full items-center gap-3 rounded-lg p-3 text-left ${active === section.id ? "bg-cyan-50 text-cyan-900" : "hover:bg-slate-50"}`}><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${active === section.id ? "bg-white text-cyan-700 shadow-sm" : "bg-slate-100 text-slate-500"}`}><section.icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{section.label}</span><span className="block truncate text-xs text-slate-500">{section.description}</span></span><ChevronRight className="size-4 text-slate-400" /></button>)}</CardContent></Card>
    <Card className="shadow-none"><CardContent className="p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">{current.label}</h2><p className="mt-1 text-sm text-slate-500">{current.description}</p></div><span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><current.icon className="size-5" /></span></div><Separator className="my-6" />
      {active === "city" && <MunicipalitySettings value={municipality} onChange={setMunicipality} />}
      {active === "categories" && <div className="max-w-3xl space-y-4"><div className="grid gap-3 rounded-xl border bg-slate-50 p-4 sm:grid-cols-[1fr_80px_auto]"><Input placeholder="Nome da nova categoria" value={newCategory.name} onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })} /><Input type="color" aria-label="Cor da categoria" value={newCategory.color} onChange={(event) => setNewCategory({ ...newCategory, color: event.target.value })} className="w-full p-1" /><Button onClick={createCategory} disabled={!newCategory.name.trim()}><Plus className="size-4" /> Adicionar</Button></div>{categories.map((category) => <CategoryRow key={category.id} item={category} onChanged={load} />)}</div>}
      {active === "priorities" && <div className="max-w-3xl space-y-3">{priorities.map((item, index) => <div key={item.priority} className="grid items-end gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_130px_130px_80px]"><div><p className="font-medium">{item.priority}</p><p className="mt-1 text-xs text-slate-500">Prazos institucionais em horas.</p></div><div className="space-y-2"><Label>Primeira resposta</Label><Input type="number" min={1} value={item.responseHours} onChange={(event) => setPriorities((currentItems) => currentItems.map((entry, currentIndex) => currentIndex === index ? { ...entry, responseHours: Number(event.target.value) } : entry))} /></div><div className="space-y-2"><Label>Resolução</Label><Input type="number" min={1} value={item.resolutionHours} onChange={(event) => setPriorities((currentItems) => currentItems.map((entry, currentIndex) => currentIndex === index ? { ...entry, resolutionHours: Number(event.target.value) } : entry))} /></div><div className="flex h-8 items-center justify-end"><Switch checked={item.active} onCheckedChange={(checked) => setPriorities((currentItems) => currentItems.map((entry, currentIndex) => currentIndex === index ? { ...entry, active: checked } : entry))} /></div></div>)}</div>}
      {active === "notifications" && <NotificationSettings value={notifications} onChange={setNotifications} />}
      {active === "users" && <div className="max-w-2xl rounded-xl border bg-slate-50 p-6"><h3 className="font-medium">Administração de acessos</h3><p className="mt-2 text-sm leading-6 text-slate-500">Usuários, vínculos com secretarias, cargos e estados de acesso são administrados na área própria do sistema.</p><Button className="mt-5" variant="outline" render={<Link href="/usuarios" />} nativeButton={false}>Abrir usuários <ExternalLink className="size-4" /></Button></div>}
      {active !== "categories" && active !== "users" && <><Separator className="my-6" /><div className="flex justify-end"><Button disabled={saving} onClick={() => active === "city" ? saveSection("municipality", municipality) : active === "notifications" ? saveSection("notifications", notifications) : saveSection("priorities", { items: priorities })}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar alterações</Button></div></>}
    </CardContent></Card>
  </div>;
}

function MunicipalitySettings({ value, onChange }: { value: MunicipalityForm; onChange: (value: MunicipalityForm) => void }) {
  const field = (key: Exclude<keyof MunicipalityForm, "citizenResponseHours">) => ({ value: value[key], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [key]: event.target.value }) });
  return <div className="grid max-w-2xl gap-5"><div className="space-y-2"><Label>Nome do município</Label><Input {...field("name")} /></div><div className="space-y-2"><Label>Nome oficial da prefeitura</Label><Input {...field("governmentName")} /></div><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label>CNPJ</Label><Input {...field("taxId")} /></div><div className="space-y-2"><Label>Telefone</Label><Input {...field("phone")} /></div></div><div className="space-y-2"><Label>Endereço administrativo</Label><Input {...field("address")} /></div><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label>E-mail institucional</Label><Input type="email" {...field("email")} /></div><div className="space-y-2"><Label>Fuso horário</Label><Input {...field("timezone")} /></div></div><div className="space-y-2"><Label>Prazo para complementação do cidadão</Label><Input type="number" min={1} max={720} value={value.citizenResponseHours} onChange={(event) => onChange({ ...value, citizenResponseHours: Number(event.target.value) })} /><p className="text-xs text-slate-500">Prazo institucional em horas. O padrão recomendado é 72 horas.</p></div><div className="space-y-2"><Label>Política de privacidade pública</Label><Textarea className="min-h-48" placeholder="Texto revisado pelo responsável jurídico/LGPD..." {...field("privacyPolicy")} /><p className="text-xs text-amber-700">O conteúdo deve ser validado pelo responsável jurídico/LGPD antes da publicação oficial.</p></div></div>;
}

function NotificationSettings({ value, onChange }: { value: NotificationForm; onChange: (value: NotificationForm) => void }) {
  const options: Array<[keyof NotificationForm, string, string]> = [["urgentRequests", "Novas solicitações urgentes", "Alertar quando uma demanda urgente for registrada."], ["deadlineAlerts", "Solicitações próximas do prazo", "Avisar sobre vencimentos definidos nas prioridades."], ["dailyDigest", "Resumo diário", "Preparar um resumo diário das solicitações."], ["teamConclusions", "Conclusões das equipes", "Alertar quando uma equipe concluir um atendimento."]];
  return <div className="max-w-2xl space-y-4">{options.map(([key, title, description]) => <div key={key} className="flex items-center justify-between gap-5 rounded-lg border p-4"><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-slate-500">{description}</p></div><Switch checked={value[key]} onCheckedChange={(checked) => onChange({ ...value, [key]: checked })} /></div>)}</div>;
}

function CategoryRow({ item, onChanged }: { item: Category; onChanged: () => Promise<void> }) {
  const [name, setName] = useState(item.name);
  const [color, setColor] = useState(item.color);
  const [publicEnabled, setPublicEnabled] = useState(item.publicEnabled);
  async function save() {
    const response = await fetch(`/api/admin/categories/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color, publicEnabled }) });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error);
    await onChanged(); toast.success("Categoria atualizada.");
  }
  async function remove() {
    if (!window.confirm(`Excluir a categoria ${item.name}?`)) return;
    const response = await fetch(`/api/admin/categories/${item.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error);
    await onChanged(); toast.success("Categoria excluída.");
  }
  return <div className="grid items-center gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_80px_120px_auto]"><Input value={name} onChange={(event) => setName(event.target.value)} /><Input type="color" aria-label={`Cor de ${item.name}`} value={color} onChange={(event) => setColor(event.target.value)} className="w-full p-1" /><label className="flex items-center gap-2 text-xs text-slate-600"><Switch checked={publicEnabled} onCheckedChange={setPublicEnabled} /> Portal público</label><div className="flex gap-2"><Button size="sm" variant="outline" onClick={save}><Save className="size-4" /> Salvar</Button><Button size="icon-sm" variant="outline" onClick={remove} aria-label={`Excluir ${item.name}`}><Trash2 className="size-4 text-rose-600" /></Button></div></div>;
}
