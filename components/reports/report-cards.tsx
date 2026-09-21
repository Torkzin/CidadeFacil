"use client";

import { ArrowDownToLine, BarChart3, Building2, Clock3, FileBarChart, MapPinned, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const reports = [
  { title: "Relatório de solicitações", description: "Visão completa de protocolos, status, prazos e responsáveis.", icon: FileBarChart, tone: "bg-cyan-50 text-cyan-700" },
  { title: "Relatório por bairro", description: "Distribuição geográfica e volume de demandas por região.", icon: MapPinned, tone: "bg-violet-50 text-violet-700" },
  { title: "Relatório por secretaria", description: "Desempenho e carga de atendimento por órgão responsável.", icon: Building2, tone: "bg-blue-50 text-blue-700" },
  { title: "Relatório de produtividade", description: "Entregas, capacidade e eficiência das equipes de campo.", icon: Users, tone: "bg-emerald-50 text-emerald-700" },
  { title: "Tempo médio de atendimento", description: "Prazos entre abertura, triagem, atendimento e conclusão.", icon: Clock3, tone: "bg-amber-50 text-amber-700" },
];

export function ReportCards() {
  function download(title: string) { toast.success("Download simulado", { description: `${title} foi preparado para demonstração.` }); }
  return <><Card className="shadow-none"><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-slate-900 text-white"><BarChart3 className="size-5" /></span><div><p className="font-medium">Período de análise</p><p className="text-sm text-slate-500">Personalize o intervalo usado nos relatórios.</p></div></div><div className="flex flex-col gap-2 sm:flex-row"><Select defaultValue="september"><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="september">Setembro 2026</SelectItem><SelectItem value="august">Agosto 2026</SelectItem><SelectItem value="quarter">3º trimestre</SelectItem><SelectItem value="year">Ano de 2026</SelectItem></SelectContent></Select><Button variant="outline" onClick={() => download("Resumo consolidado")}><ArrowDownToLine className="size-4" /> Exportar resumo</Button></div></CardContent></Card><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{reports.map((report) => <Card key={report.title} className="gap-5 shadow-none transition-shadow hover:shadow-md"><CardHeader><span className={`mb-3 grid size-11 place-items-center rounded-xl ${report.tone}`}><report.icon className="size-5" /></span><CardTitle>{report.title}</CardTitle></CardHeader><CardContent><p className="min-h-10 text-sm leading-5 text-slate-500">{report.description}</p><div className="mt-5 flex items-center gap-2"><Button onClick={() => download(report.title)} className="flex-1"><ArrowDownToLine className="size-4" /> Baixar PDF</Button><Button variant="outline" onClick={() => download(`${report.title} em planilha`)}>XLSX</Button></div></CardContent></Card>)}</div></>;
}
