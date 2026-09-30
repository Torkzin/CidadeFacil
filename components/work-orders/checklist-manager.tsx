"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ListChecks, Loader2, Plus, Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Category = { id: string; name: string; color: string };
type Item = { id: string; categoryId: string; title: string; required: boolean; active: boolean; sortOrder: number };

export function ChecklistManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [title, setTitle] = useState("");
  const [required, setRequired] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadItems = useCallback(async (selectedCategoryId: string) => {
    if (!selectedCategoryId) return setItems([]);
    const response = await fetch(`/api/admin/checklist-items?categoryId=${encodeURIComponent(selectedCategoryId)}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os itens.");
    setItems(payload.items ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/admin/categories", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar as categorias.");
      setCategories(payload.items ?? []);
      setCategoryId((current) => current || payload.items?.[0]?.id || "");
    }).catch((error: Error) => toast.error(error.message));
  }, []);

  useEffect(() => {
    // Loads the selected category template from the protected API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadItems(categoryId).catch((error: Error) => toast.error(error.message));
  }, [categoryId, loadItems]);

  async function createItem() {
    if (!categoryId || title.trim().length < 3) return toast.error("Descreva o item com pelo menos 3 caracteres.");
    setBusy(true);
    try {
      const response = await fetch("/api/admin/checklist-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId, title, required }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível criar o item.");
      setTitle("");
      await loadItems(categoryId);
      toast.success("Item adicionado ao checklist.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o item.");
    } finally {
      setBusy(false);
    }
  }

  async function updateItem(item: Item, changes: Partial<Pick<Item, "required" | "active">>) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/checklist-items/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível atualizar o item.");
      await loadItems(categoryId);
      toast.success("Checklist atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o item.");
    } finally {
      setBusy(false);
    }
  }

  const selectedCategory = categories.find((category) => category.id === categoryId);
  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="shadow-none">
        <CardHeader><CardTitle>Categorias de serviço</CardTitle><p className="text-sm text-slate-500">Selecione uma categoria para editar seu procedimento.</p></CardHeader>
        <CardContent className="space-y-2">
          {categories.map((category) => <button key={category.id} onClick={() => { setCategoryId(category.id); setItems(null); }} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition ${category.id === categoryId ? "border-cyan-300 bg-cyan-50 font-semibold" : "hover:bg-slate-50"}`}><span className="size-3 rounded-full" style={{ backgroundColor: category.color }} />{category.name}</button>)}
        </CardContent>
      </Card>
      <Card className="shadow-none">
        <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="size-5 text-cyan-700" /> {selectedCategory?.name ?? "Checklist"}</CardTitle><p className="text-sm text-slate-500">Itens obrigatórios precisam ser confirmados antes da conclusão da ordem de serviço.</p></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 rounded-xl border bg-slate-50 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-2"><Label htmlFor="checklist-title">Novo procedimento</Label><Input id="checklist-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Isolar e sinalizar a área" onKeyDown={(event) => { if (event.key === "Enter") void createItem(); }} /></div>
            <label className="flex h-8 items-center gap-2 text-sm"><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} /> Obrigatório</label>
            <Button disabled={busy || !categoryId || title.trim().length < 3} onClick={() => void createItem()}><Plus className="size-4" /> Adicionar</Button>
          </div>
          {!items ? <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Carregando checklist...</p> : items.length ? <div className="space-y-2">{items.map((item, index) => <div key={item.id} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${item.active ? "bg-white" : "bg-slate-50 opacity-70"}`}><span className="grid size-7 shrink-0 place-items-center rounded-full bg-cyan-50 text-xs font-bold text-cyan-700">{index + 1}</span><div className="min-w-0 flex-1"><p className={`font-medium ${!item.active ? "line-through" : ""}`}>{item.title}</p><p className="mt-0.5 text-xs text-slate-500">{item.required ? "Obrigatório para conclusão" : "Orientação opcional"}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy || !item.active} onClick={() => void updateItem(item, { required: !item.required })}><CheckCircle2 className="size-3.5" /> {item.required ? "Tornar opcional" : "Tornar obrigatório"}</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void updateItem(item, { active: !item.active })}><Power className="size-3.5" /> {item.active ? "Desativar" : "Reativar"}</Button></div></div>)}</div> : <div className="rounded-xl border border-dashed p-10 text-center"><ListChecks className="mx-auto mb-3 size-9 text-slate-300" /><p className="font-medium">Nenhum procedimento configurado</p><p className="mt-1 text-sm text-slate-500">Adicione os passos que a equipe deve conferir durante o serviço.</p></div>}
        </CardContent>
      </Card>
    </div>
  );
}
