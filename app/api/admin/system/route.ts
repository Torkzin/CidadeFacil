import { NextResponse } from "next/server";
import { apiError, requireAdminUser } from "@/lib/server/api";
import { getSystemStatus } from "@/lib/server/system-status";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return apiError("Acesso restrito a administradores.", 403);
  return NextResponse.json(await getSystemStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
