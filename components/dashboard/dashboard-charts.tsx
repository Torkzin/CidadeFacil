"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ChartItem = { name: string; value: number; fill?: string };
type MonthItem = { month: string; requests: number };
const tooltipStyle = { borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,.08)", fontSize: 12 };

export function MonthlyChart({ data }: { data: MonthItem[] }) {
  return <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><defs><linearGradient id="requests" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0891b2" stopOpacity={0.28} /><stop offset="100%" stopColor="#0891b2" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 4" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={8} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} solicitações`, "Volume"]} /><Area type="monotone" dataKey="requests" stroke="#0e7490" strokeWidth={2.5} fill="url(#requests)" activeDot={{ r: 4, strokeWidth: 3, stroke: "white" }} /></AreaChart></ResponsiveContainer>;
}
export function CategoryChart({ data }: { data: ChartItem[] }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 4, right: 12 }}><CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 4" /><XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={105} tick={{ fill: "#475569", fontSize: 11 }} /><Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={tooltipStyle} formatter={(value) => [`${value}`, "Solicitações"]} /><Bar dataKey="value" radius={[0, 5, 5, 0]} fill="#0891b2" barSize={16} /></BarChart></ResponsiveContainer>;
}
export function StatusChart({ data, total }: { data: ChartItem[]; total: number }) {
  return <div className="relative h-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={3} strokeWidth={0}>{data.map((item) => <Cell key={item.name} fill={item.fill} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}`, "Solicitações"]} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl">{total}</strong><span className="text-xs text-slate-500">registros</span></div></div>;
}
