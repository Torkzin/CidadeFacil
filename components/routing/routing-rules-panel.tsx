"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Route, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SEROPEDICA_NEIGHBORHOOD_NAMES } from "@/lib/municipality/seropedica";
import type { RequestPriority } from "@/types";

type Category = { id: string; name: string };
type Department = { id: string; name: string };
type Team = { id: string; name: string; departmentId: string };
type RoutingRule = {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  neighborhood: string | null;
  departmentId: string;
  department: string;
  teamId: string | null;
  team: string | null;
  priority: RequestPriority | null;
  active: boolean;
};

const emptyForm = {
  name: "",
  categoryId: "",
  neighborhood: "Todos os bairros",
  departmentId: "",
  teamId: "Sem equipe automática",
  priority: "Manter prioridade informada",
};

async function json(response: Response) {
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error ?? "Não foi possível concluir a operação.");
  return payload;
}

export function RoutingRulesPanel() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [ruleData, categoryData, departmentData, teamData] =
      await Promise.all([
        fetch("/api/admin/routing-rules", { cache: "no-store" }).then(json),
        fetch("/api/admin/categories", { cache: "no-store" }).then(json),
        fetch("/api/departments", { cache: "no-store" }).then(json),
        fetch("/api/teams", { cache: "no-store" }).then(json),
      ]);
    setRules(ruleData.items ?? []);
    setCategories(categoryData.items ?? []);
    setDepartments(departmentData.items ?? []);
    setTeams(teamData.items ?? []);
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch("/api/admin/routing-rules", { cache: "no-store" }).then(json),
      fetch("/api/admin/categories", { cache: "no-store" }).then(json),
      fetch("/api/departments", { cache: "no-store" }).then(json),
      fetch("/api/teams", { cache: "no-store" }).then(json),
    ])
      .then(([ruleData, categoryData, departmentData, teamData]) => {
        if (!mounted) return;
        setRules(ruleData.items ?? []);
        setCategories(categoryData.items ?? []);
        setDepartments(departmentData.items ?? []);
        setTeams(teamData.items ?? []);
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [load]);

  const availableTeams = useMemo(
    () => teams.filter((team) => team.departmentId === form.departmentId),
    [form.departmentId, teams],
  );

  async function createRule() {
    setSaving(true);
    try {
      await json(
        await fetch("/api/admin/routing-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            categoryId: form.categoryId,
            neighborhood:
              form.neighborhood === "Todos os bairros"
                ? null
                : form.neighborhood,
            departmentId: form.departmentId,
            teamId:
              form.teamId === "Sem equipe automática" ? null : form.teamId,
            priority:
              form.priority === "Manter prioridade informada"
                ? null
                : form.priority,
          }),
        }),
      );
      setForm(emptyForm);
      await load();
      toast.success("Regra de encaminhamento criada.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível criar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleRule(rule: RoutingRule, active: boolean) {
    try {
      await json(
        await fetch(`/api/admin/routing-rules/${rule.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active }),
        }),
      );
      setRules((items) =>
        items.map((item) => (item.id === rule.id ? { ...item, active } : item)),
      );
      toast.success(active ? "Regra ativada." : "Regra pausada.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível atualizar.",
      );
    }
  }

  async function removeRule(rule: RoutingRule) {
    if (!window.confirm(`Excluir a regra “${rule.name}”?`)) return;
    try {
      await json(
        await fetch(`/api/admin/routing-rules/${rule.id}`, {
          method: "DELETE",
        }),
      );
      setRules((items) => items.filter((item) => item.id !== rule.id));
      toast.success("Regra excluída.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível excluir.",
      );
    }
  }

  const canCreate = Boolean(
    form.name.trim() && form.categoryId && form.departmentId && !saving,
  );

  if (loading)
    return (
      <Card className="shadow-none">
        <CardContent className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" /> Carregando regras...
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-5">
      <Card className="shadow-none">
        <CardContent className="p-5">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
              <Route className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">Nova regra</h2>
              <p className="mt-1 text-sm text-slate-500">
                Regras específicas de bairro têm precedência sobre regras gerais
                da categoria.
              </p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2 lg:col-span-2 xl:col-span-1">
              <Label>Nome da regra</Label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Ex.: Iluminação em Campo Lindo"
              />
            </div>
            <FieldSelect
              label="Categoria"
              value={form.categoryId}
              placeholder="Selecione a categoria"
              options={categories.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              onChange={(categoryId) => setForm({ ...form, categoryId })}
            />
            <FieldSelect
              label="Bairro"
              value={form.neighborhood}
              placeholder="Todos os bairros"
              options={[
                { value: "Todos os bairros", label: "Todos os bairros" },
                ...SEROPEDICA_NEIGHBORHOOD_NAMES.map((name) => ({
                  value: name,
                  label: name,
                })),
              ]}
              onChange={(neighborhood) => setForm({ ...form, neighborhood })}
            />
            <FieldSelect
              label="Secretaria de destino"
              value={form.departmentId}
              placeholder="Selecione a secretaria"
              options={departments.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              onChange={(departmentId) =>
                setForm({
                  ...form,
                  departmentId,
                  teamId: "Sem equipe automática",
                })
              }
            />
            <FieldSelect
              label="Equipe opcional"
              value={form.teamId}
              placeholder="Sem equipe automática"
              options={[
                {
                  value: "Sem equipe automática",
                  label: "Sem equipe automática",
                },
                ...availableTeams.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
              onChange={(teamId) => setForm({ ...form, teamId })}
              disabled={!form.departmentId}
            />
            <FieldSelect
              label="Prioridade opcional"
              value={form.priority}
              placeholder="Manter prioridade informada"
              options={[
                {
                  value: "Manter prioridade informada",
                  label: "Manter prioridade informada",
                },
                ...(["Baixa", "Normal", "Alta", "Urgente"] as const).map(
                  (priority) => ({ value: priority, label: priority }),
                ),
              ]}
              onChange={(priority) => setForm({ ...form, priority })}
            />
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={createRule} disabled={!canCreate}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Criar regra
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {rules.map((rule) => (
          <Card key={rule.id} className="gap-0 py-0 shadow-none">
            <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-lg ${rule.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}
              >
                <Route className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-slate-900">{rule.name}</h3>
                  <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs text-cyan-800">
                    {rule.category}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {rule.neighborhood ?? "Todos os bairros"}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-500">
                  {rule.department}
                  {rule.team ? ` → ${rule.team}` : ""}
                  {rule.priority ? ` · prioridade ${rule.priority}` : ""}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 lg:justify-end">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <Switch
                    checked={rule.active}
                    onCheckedChange={(active) => toggleRule(rule, active)}
                  />
                  {rule.active ? "Ativa" : "Pausada"}
                </label>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => removeRule(rule)}
                  aria-label={`Excluir ${rule.name}`}
                >
                  <Trash2 className="size-4 text-rose-600" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {rules.length === 0 && (
          <Card className="shadow-none">
            <CardContent className="py-12 text-center">
              <Route className="mx-auto mb-3 size-9 text-slate-300" />
              <p className="font-medium text-slate-800">
                Nenhuma regra configurada
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Solicitações continuam entrando normalmente até que uma regra
                seja criada.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function FieldSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value || null}
        onValueChange={(next) => next && onChange(next)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full bg-white">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
