import { DepartmentsManager } from "@/components/management/departments-manager";
import { requireCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
export default async function DepartmentsPage() { const user = await requireCurrentUser(); if (user.role !== "Administrador") redirect("/acesso-negado"); return <DepartmentsManager />; }
