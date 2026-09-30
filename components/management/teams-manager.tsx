"use client";
import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Pencil,
  Plus,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeading } from "@/components/common/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
type Team = {
  id: string;
  name: string;
  status: string;
  memberCount: number;
  departmentId: string;
  department: string;
  active: number;
  completed: number;
};
type Department = { id: string; name: string };
export function TeamsManager() {
  const [items, setItems] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [form, setForm] = useState({
    name: "",
    departmentId: "",
    status: "Disponível",
    memberCount: "0",
  });
  const load = useCallback(async () => {
    const [teamResponse, departmentResponse] = await Promise.all([
      fetch("/api/admin/teams", { cache: "no-store" }),
      fetch("/api/departments", { cache: "no-store" }),
    ]);
    const teamData = await teamResponse.json();
    const departmentData = await departmentResponse.json();
    if (!teamResponse.ok) throw new Error(teamData.error);
    setItems(teamData.items);
    setDepartments(departmentData.items ?? []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((error: Error) => toast.error(error.message));
  }, [load]);
  function show(item?: Team) {
    setEditing(item ?? null);
    setForm({
      name: item?.name ?? "",
      departmentId: item?.departmentId ?? "",
      status: item?.status ?? "Disponível",
      memberCount: String(item?.memberCount ?? 0),
    });
    setOpen(true);
  }
  async function save() {
    const response = await fetch(
      editing ? `/api/admin/teams/${editing.id}` : "/api/admin/teams",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          memberCount: Number(form.memberCount),
        }),
      },
    );
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    setOpen(false);
    await load();
    toast.success(editing ? "Equipe atualizada" : "Equipe criada");
  }
  async function remove(item: Team) {
    if (!window.confirm(`Excluir ${item.name}?`)) return;
    const response = await fetch(`/api/admin/teams/${item.id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    await load();
    toast.success("Equipe excluída");
  }
  return (
    <div className="space-y-6">
      <PageHeading
        title="Equipes"
        description="Gerencie equipes de campo e acompanhe a carga real de trabalho."
        actions={
          <Button onClick={() => show()}>
            <Plus className="size-4" /> Nova equipe
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className="gap-4 shadow-none">
            <CardHeader className="flex-row items-start justify-between">
              <div className="flex gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                  <Wrench className="size-5" />
                </span>
                <div>
                  <CardTitle>{item.name}</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.department}
                  </p>
                </div>
              </div>
              <div className="flex">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => show(item)}
                >
                  <Pencil />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-rose-600"
                  onClick={() => remove(item)}
                >
                  <Trash2 />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-5 flex items-center justify-between">
                <Badge variant="outline">{item.status}</Badge>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="size-3.5" /> {item.memberCount} membros
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <Clock3 className="size-4 text-amber-600" />
                  <p className="mt-2 text-xl font-semibold">{item.active}</p>
                  <p className="text-xs text-slate-500">Chamados ativos</p>
                </div>
                <div className="rounded-lg border p-3">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <p className="mt-2 text-xl font-semibold">{item.completed}</p>
                  <p className="text-xs text-slate-500">Concluídos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="hidden" />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar equipe" : "Nova equipe"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Secretaria</Label>
            <Select
              value={
                departments.find((item) => item.id === form.departmentId)
                  ?.name ?? null
              }
              onValueChange={(value) =>
                setForm({
                  ...form,
                  departmentId:
                    departments.find((item) => item.name === value)?.id ?? "",
                })
              }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((item) => (
                  <SelectItem key={item.id} value={item.name}>
                    {item.name}
                  </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm({ ...form, status: value ?? "Disponível" })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Disponível", "Em campo", "Pausa"].map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Membros</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.memberCount}
                  onChange={(event) =>
                    setForm({ ...form, memberCount: event.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={!form.name || !form.departmentId}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
