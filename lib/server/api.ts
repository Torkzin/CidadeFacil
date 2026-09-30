import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireApiUser() {
  return getCurrentUser();
}

export async function requireAdminUser() {
  const user = await getCurrentUser();
  return user?.role === "Administrador" ? user : null;
}
