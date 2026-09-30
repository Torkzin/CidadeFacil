import { UsersManager } from "@/components/management/users-manager";
import { requireCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
export default async function UsersPage() { const user = await requireCurrentUser(); if (user.role !== "Administrador") redirect("/acesso-negado"); return <UsersManager />; }
