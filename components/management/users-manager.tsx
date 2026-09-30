"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeading } from "@/components/common/page-heading";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  departmentId: string | null;
  department: string | null;
  teamId: string | null;
  team: string | null;
  lastAccessAt: string | null;
};
type Department = { id: string; name: string };
type Team = { id: string; name: string; departmentId: string };
const roles = [
  "Administrador",
  "Secretário",
  "Gestor",
  "Servidor",
  "Equipe de campo",
];
export function UsersManager() {
  const [items, setItems] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Servidor",
    status: "Ativo",
    departmentId: "",
    teamId: "",
    password: "",
  });
  const load = useCallback(async () => {
    const [userResponse, departmentResponse, teamResponse] = await Promise.all([
      fetch("/api/admin/users", { cache: "no-store" }),
      fetch("/api/departments", { cache: "no-store" }),
      fetch("/api/teams", { cache: "no-store" }),
    ]);
    const userData = await userResponse.json();
    const departmentData = await departmentResponse.json();
    const teamData = await teamResponse.json();
    if (!userResponse.ok) throw new Error(userData.error);
    setItems(userData.items);
    setDepartments(departmentData.items ?? []);
    setTeams(teamData.items ?? []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((error: Error) => toast.error(error.message));
  }, [load]);
  const filtered = useMemo(
    () =>
      items.filter((item) =>
        `${item.name} ${item.email}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [items, query],
  );
  function show(item?: User) {
    setEditing(item ?? null);
    setForm({
      name: item?.name ?? "",
      email: item?.email ?? "",
      role: item?.role ?? "Servidor",
      status: item?.status ?? "Ativo",
      departmentId: item?.departmentId ?? "",
      teamId: item?.teamId ?? "",
      password: "",
    });
    setOpen(true);
  }
  async function save() {
    const response = await fetch(
      editing ? `/api/admin/users/${editing.id}` : "/api/admin/users",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    setOpen(false);
    await load();
    toast.success(editing ? "Usuário atualizado" : "Usuário criado");
  }
  async function remove(item: User) {
    if (!window.confirm(`Excluir o acesso de ${item.name}?`)) return;
    const response = await fetch(`/api/admin/users/${item.id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    await load();
    toast.success("Usuário excluído");
  }
  return (
    <div className="space-y-6">
      <PageHeading
        title="Usuários"
        description="Administre acessos, cargos e vínculos com as secretarias."
        actions={
          <Button onClick={() => show()}>
            <Plus className="size-4" /> Novo usuário
          </Button>
        }
      />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar usuário por nome ou e-mail..."
          className="bg-white pl-9"
        />
      </div>
      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Secretaria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-cyan-50 text-xs font-semibold text-cyan-700">
                          {item.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500">{item.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.role}</Badge>
                  </TableCell>
                  <TableCell>{item.department ?? "Sem vínculo"}</TableCell>
                  <TableCell>
                    <span
                      className={
                        item.status === "Ativo"
                          ? "text-emerald-700"
                          : "text-slate-500"
                      }
                    >
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-500">
                    {item.lastAccessAt
                      ? new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(item.lastAccessAt))
                      : "Nunca"}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-500">
          <span>{filtered.length} usuários</span>
          <span className="flex items-center gap-1">
            <UserRound className="size-4" />{" "}
            {items.filter((item) => item.status === "Ativo").length} ativos
          </span>
        </div>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="hidden" />
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar usuário" : "Novo usuário"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select
                value={form.role}
                onValueChange={(value) =>
                  setForm({ ...form, role: value ?? "Servidor" })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm({ ...form, status: value ?? "Ativo" })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
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
                  teamId: "",
                })
              }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sem vínculo" />
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
            <div className="space-y-2 sm:col-span-2">
              <Label>Equipe de campo</Label>
            <Select
              value={
                teams.find((item) => item.id === form.teamId)?.name ?? null
              }
              onValueChange={(value) =>
                setForm({
                  ...form,
                  teamId: teams.find((item) => item.name === value)?.id ?? "",
                })
              }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sem equipe" />
                </SelectTrigger>
                <SelectContent>
                  {teams
                    .filter(
                      (item) =>
                        !form.departmentId ||
                        item.departmentId === form.departmentId,
                    )
                    .map((item) => (
                    <SelectItem key={item.id} value={item.name}>
                      {item.name}
                    </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>
                {editing ? "Nova senha (opcional)" : "Senha inicial"}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={
                !form.name ||
                !form.email ||
                (!editing && form.password.length < 8)
              }
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
