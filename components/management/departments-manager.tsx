"use client";
import { useCallback, useEffect, useState } from "react";
import { Building2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeading } from "@/components/common/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
type Department = { id: string; name: string; managerName: string | null; requests: number; inProgress: number; teams: number };
export function DepartmentsManager() {
  const [items, setItems] = useState<Department[]>([]); const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Department | null>(null); const [name, setName] = useState(""); const [managerName, setManagerName] = useState("");
  const load = useCallback(async () => { const response = await fetch("/api/admin/departments", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setItems(data.items); }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load().catch((error: Error) => toast.error(error.message)); }, [load]);
  function show(item?: Department) { setEditing(item ?? null); setName(item?.name ?? ""); setManagerName(item?.managerName ?? ""); setOpen(true); }
  async function save() { const response = await fetch(editing ? `/api/admin/departments/${editing.id}` : "/api/admin/departments", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, managerName }) }); const data = await response.json(); if (!response.ok) return toast.error(data.error); setOpen(false); await load(); toast.success(editing ? "Secretaria atualizada" : "Secretaria criada"); }
  async function remove(item: Department) { if (!window.confirm(`Excluir ${item.name}?`)) return; const response = await fetch(`/api/admin/departments/${item.id}`, { method: "DELETE" }); const data = await response.json(); if (!response.ok) return toast.error(data.error); await load(); toast.success("Secretaria excluída"); }
  return <div className="space-y-6"><PageHeading title="Secretarias" description="Cadastre os órgãos municipais e acompanhe a distribuição real das demandas." actions={<Button onClick={() => show()}><Plus className="size-4" /> Nova secretaria</Button>} />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <Card key={item.id} className="gap-4 shadow-none"><CardHeader className="flex-row items-start justify-between"><div className="flex gap-3"><span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><Building2 className="size-5" /></span><div><CardTitle>{item.name}</CardTitle><p className="mt-1 text-xs text-slate-500">{item.managerName || "Gestor não informado"}</p></div></div><div className="flex"><Button size="icon-sm" variant="ghost" onClick={() => show(item)} aria-label="Editar"><Pencil /></Button><Button size="icon-sm" variant="ghost" onClick={() => remove(item)} aria-label="Excluir" className="text-rose-600"><Trash2 /></Button></div></CardHeader><CardContent><div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3"><div><strong className="text-lg">{item.requests}</strong><p className="text-[11px] text-slate-500">Solicitações</p></div><div><strong className="text-lg text-cyan-700">{item.inProgress}</strong><p className="text-[11px] text-slate-500">Em andamento</p></div><div><strong className="text-lg">{item.teams}</strong><p className="text-[11px] text-slate-500">Equipes</p></div></div><p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Users className="size-4" /> Dados atualizados pelo sistema</p></CardContent></Card>)}</div>
    {items.length === 0 && <Card className="shadow-none"><CardContent className="p-10 text-center text-slate-500">Nenhuma secretaria cadastrada.</CardContent></Card>}
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger className="hidden" /><DialogContent><DialogHeader><DialogTitle>{editing ? "Editar secretaria" : "Nova secretaria"}</DialogTitle></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div><div className="space-y-2"><Label>Gestor responsável</Label><Input value={managerName} onChange={(event) => setManagerName(event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={!name.trim()}>Salvar</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
