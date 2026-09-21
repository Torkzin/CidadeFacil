"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, FilterX, Plus, Search } from "lucide-react";
import { requests } from "@/data/mock-data";
import { PriorityBadge, StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusOptions = ["Aberta", "Triagem", "Encaminhada", "Em andamento", "Aguardando", "Concluída", "Cancelada"];
const categoryOptions = ["Iluminação Pública", "Buracos/Vias", "Coleta de lixo", "Poda de árvores", "Saneamento", "Outros"];
const departmentOptions = ["Obras", "Serviços Públicos", "Meio Ambiente", "Transporte"];
const priorityOptions = ["Baixa", "Normal", "Alta", "Urgente"];
const neighborhoodOptions = ["Centro", "Jardim das Flores", "Boa Esperança", "São Miguel", "Parque Industrial", "Vila Nova"];

function FilterSelect({ value, onValueChange, placeholder, options }: { value: string; onValueChange: (value: string) => void; placeholder: string; options: string[] }) {
  return <Select value={value === "all" ? null : value} onValueChange={(next) => onValueChange(next ?? "all")}><SelectTrigger className="h-9 min-w-36 bg-white"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>;
}

export function RequestsTable() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [department, setDepartment] = useState("all");
  const [priority, setPriority] = useState("all");
  const [neighborhood, setNeighborhood] = useState("all");
  const filtered = useMemo(() => requests.filter((item) => {
    const matchesQuery = `${item.protocol} ${item.title} ${item.neighborhood}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "all" || item.status === status) && (category === "all" || item.category === category) && (department === "all" || item.department === department) && (priority === "all" || item.priority === priority) && (neighborhood === "all" || item.neighborhood === neighborhood);
  }), [query, status, category, department, priority, neighborhood]);
  const hasFilters = query || [status, category, department, priority, neighborhood].some((value) => value !== "all");
  function clear() { setQuery(""); setStatus("all"); setCategory("all"); setDepartment("all"); setPriority("all"); setNeighborhood("all"); }
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por protocolo, título ou bairro..." className="h-9 bg-white pl-9" /></div>
        <div className="scrollbar-subtle flex gap-2 overflow-x-auto pb-1 xl:pb-0"><FilterSelect value={status} onValueChange={setStatus} placeholder="Status" options={statusOptions} /><FilterSelect value={category} onValueChange={setCategory} placeholder="Categoria" options={categoryOptions} /><FilterSelect value={department} onValueChange={setDepartment} placeholder="Secretaria" options={departmentOptions} /><FilterSelect value={priority} onValueChange={setPriority} placeholder="Prioridade" options={priorityOptions} /><FilterSelect value={neighborhood} onValueChange={setNeighborhood} placeholder="Bairro" options={neighborhoodOptions} /><Button variant="outline" className="h-9 bg-white"><CalendarDays className="size-4" /> Período</Button></div>
      </div>
      {hasFilters && <div className="flex items-center justify-between rounded-lg border border-cyan-100 bg-cyan-50/60 px-3 py-2 text-sm"><span className="text-cyan-800">{filtered.length} resultado{filtered.length !== 1 && "s"} encontrado{filtered.length !== 1 && "s"}</span><Button variant="ghost" size="sm" onClick={clear} className="text-cyan-800"><FilterX className="size-4" /> Limpar filtros</Button></div>}
      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Protocolo</TableHead><TableHead className="min-w-52">Título</TableHead><TableHead>Categoria</TableHead><TableHead>Bairro</TableHead><TableHead>Secretaria</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead></TableRow></TableHeader><TableBody>{filtered.map((item) => <TableRow key={item.id} className="group"><TableCell className="font-mono text-xs text-slate-500"><Link href={`/solicitacoes/${item.id}`} className="hover:text-cyan-700">{item.protocol}</Link></TableCell><TableCell><Link href={`/solicitacoes/${item.id}`} className="font-medium text-slate-900 group-hover:text-cyan-700">{item.title}</Link></TableCell><TableCell className="whitespace-nowrap text-slate-600">{item.category}</TableCell><TableCell className="whitespace-nowrap text-slate-600">{item.neighborhood}</TableCell><TableCell className="whitespace-nowrap text-slate-600">{item.department}</TableCell><TableCell><PriorityBadge priority={item.priority} /></TableCell><TableCell><StatusBadge status={item.status} /></TableCell><TableCell className="whitespace-nowrap text-slate-500">{item.date}</TableCell></TableRow>)}{filtered.length === 0 && <TableRow><TableCell colSpan={8} className="h-44 text-center"><div className="mx-auto max-w-xs"><Search className="mx-auto mb-3 size-8 text-slate-300" /><p className="font-medium">Nenhuma solicitação encontrada</p><p className="mt-1 text-sm text-slate-500">Tente ajustar ou limpar os filtros.</p><Button variant="outline" size="sm" onClick={clear} className="mt-4">Limpar filtros</Button></div></TableCell></TableRow>}</TableBody></Table></div>
        <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="text-slate-500">Exibindo <strong className="text-slate-700">{filtered.length}</strong> de <strong className="text-slate-700">{requests.length}</strong> solicitações</span><div className="flex items-center gap-1"><Button size="icon-sm" variant="outline" disabled><ChevronLeft /></Button><Button size="sm" variant="secondary">1</Button><Button size="icon-sm" variant="outline" disabled><ChevronRight /></Button></div></div>
      </Card>
    </div>
  );
}

export function NewRequestButton() {
  return <Button render={<Link href="/solicitacoes/nova" />} nativeButton={false} className="bg-cyan-800 hover:bg-cyan-900"><Plus className="size-4" /> Nova solicitação</Button>;
}
