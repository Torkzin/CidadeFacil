import { TeamsManager } from "@/components/management/teams-manager";
import { requireCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
export default async function TeamsPage() { const user = await requireCurrentUser(); if (user.role !== "Administrador") redirect("/acesso-negado"); return <TeamsManager />; }
