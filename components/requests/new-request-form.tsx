"use client";

import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, FileImage, Info, MapPin, UploadCloud, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const categories = ["Iluminação Pública", "Buracos/Vias", "Coleta de lixo", "Poda de árvores", "Saneamento", "Outros"];
const neighborhoods = ["Centro", "Jardim das Flores", "Boa Esperança", "São Miguel", "Parque Industrial", "Vila Nova"];
const departments = ["Secretaria de Obras", "Secretaria de Serviços Públicos", "Secretaria de Meio Ambiente", "Secretaria de Transporte"];
const teams = ["Equipe de Iluminação 01", "Equipe de Iluminação 02", "Equipe de Asfalto", "Equipe de Poda", "Equipe de Limpeza Urbana"];

function FieldSelect({ placeholder, options }: { placeholder: string; options: string[] }) {
  return <Select><SelectTrigger className="h-10 w-full"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>;
}

export function NewRequestForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    window.setTimeout(() => {
      toast.success("Solicitação criada com sucesso.", { description: "Protocolo 2026-0001429 gerado." });
      router.push("/solicitacoes/2026-0001429");
    }, 700);
  }
  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <Card className="shadow-none"><CardHeader><CardTitle>Informações da solicitação</CardTitle><p className="text-sm text-muted-foreground">Descreva a ocorrência com o máximo de clareza.</p></CardHeader><CardContent className="grid gap-5"><div className="space-y-2"><Label htmlFor="title">Título <span className="text-rose-500">*</span></Label><Input id="title" required placeholder="Ex.: Poste sem iluminação na Rua das Flores" className="h-10" /></div><div className="space-y-2"><Label htmlFor="description">Descrição <span className="text-rose-500">*</span></Label><Textarea id="description" required placeholder="Informe detalhes que ajudem a equipe no atendimento..." className="min-h-32 resize-y" /><p className="text-xs text-slate-400">Inclua referências do local e há quanto tempo o problema ocorre.</p></div><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label>Categoria <span className="text-rose-500">*</span></Label><FieldSelect placeholder="Selecione uma categoria" options={categories} /></div><div className="space-y-2"><Label>Prioridade <span className="text-rose-500">*</span></Label><FieldSelect placeholder="Selecione a prioridade" options={["Baixa", "Normal", "Alta", "Urgente"]} /></div></div></CardContent></Card>
        <Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="size-5 text-cyan-700" /> Localização</CardTitle><p className="text-sm text-muted-foreground">Informe onde a ocorrência foi identificada.</p></CardHeader><CardContent className="grid gap-5"><div className="grid gap-5 sm:grid-cols-[1fr_140px]"><div className="space-y-2"><Label htmlFor="address">Endereço <span className="text-rose-500">*</span></Label><Input id="address" required placeholder="Rua, avenida ou praça" /></div><div className="space-y-2"><Label htmlFor="number">Número</Label><Input id="number" placeholder="S/N" /></div></div><div className="grid gap-5 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="complement">Complemento</Label><Input id="complement" placeholder="Próximo a..." /></div><div className="space-y-2"><Label>Bairro <span className="text-rose-500">*</span></Label><FieldSelect placeholder="Selecione" options={neighborhoods} /></div><div className="space-y-2"><Label htmlFor="cep">CEP</Label><Input id="cep" placeholder="00000-000" /></div></div><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="lat">Latitude</Label><Input id="lat" placeholder="-23.550520" /></div><div className="space-y-2"><Label htmlFor="lng">Longitude</Label><Input id="lng" placeholder="-46.633308" /></div></div></CardContent></Card>
        <Card className="shadow-none"><CardHeader><CardTitle>Encaminhamento</CardTitle><p className="text-sm text-muted-foreground">Defina os responsáveis pelo primeiro atendimento.</p></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label>Secretaria responsável</Label><FieldSelect placeholder="Selecione a secretaria" options={departments} /></div><div className="space-y-2"><Label>Equipe responsável</Label><FieldSelect placeholder="Selecione a equipe" options={teams} /></div></CardContent></Card>
      </div>
      <aside className="space-y-5">
        <Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2"><Camera className="size-5 text-cyan-700" /> Fotos</CardTitle></CardHeader><CardContent><label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-5 text-center hover:border-cyan-400 hover:bg-cyan-50/40"><UploadCloud className="mb-3 size-7 text-cyan-700" /><span className="text-sm font-medium">Clique para adicionar fotos</span><span className="mt-1 text-xs text-slate-500">PNG, JPG ou WEBP · até 10 MB</span><input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => setFileNames(Array.from(event.target.files ?? []).map((file) => file.name))} /></label>{fileNames.length > 0 && <div className="mt-3 space-y-2">{fileNames.map((name) => <div key={name} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"><FileImage className="size-4 text-cyan-700" /><span className="min-w-0 flex-1 truncate">{name}</span><button type="button" onClick={() => setFileNames((files) => files.filter((file) => file !== name))}><X className="size-3.5 text-slate-400" /></button></div>)}</div>}</CardContent></Card>
        <Card className="border-cyan-100 bg-cyan-50/50 shadow-none"><CardContent className="flex gap-3 p-4"><Info className="mt-0.5 size-5 shrink-0 text-cyan-700" /><div><p className="text-sm font-medium text-cyan-950">Protocolo automático</p><p className="mt-1 text-xs leading-5 text-cyan-800">Ao criar, o sistema gerará o protocolo 2026-0001429 e abrirá a página de acompanhamento.</p></div></CardContent></Card>
        <Card className="sticky top-24 shadow-none"><CardContent className="space-y-3 p-4"><Button type="submit" className="h-10 w-full bg-cyan-800 hover:bg-cyan-900" disabled={submitting}>{submitting ? "Criando..." : <><CheckCircle2 className="size-4" /> Criar solicitação</>}</Button><Button type="button" variant="outline" className="h-10 w-full" onClick={() => router.back()}>Cancelar</Button></CardContent></Card>
      </aside>
    </form>
  );
}
