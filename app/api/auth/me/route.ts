import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { apiError } from "@/lib/server/api";

export async function GET() {
  const user = await getCurrentUser();
  return user ? NextResponse.json({ user }) : apiError("Não autenticado.", 401);
}
