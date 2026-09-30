import { eq, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sessions, users } from "@/db/schema";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { apiError } from "@/lib/server/api";
import { audit } from "@/lib/server/audit";
import { checkRateLimit, clientAddress, envNumber } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return apiError("Dados de acesso inválidos."); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return apiError("Informe e-mail e senha.", 422);
  const rate = checkRateLimit(`login:${clientAddress(request)}:${email}`, envNumber("RATE_LIMIT_LOGIN_MAX", 8), envNumber("RATE_LIMIT_LOGIN_WINDOW_MS", 15 * 60 * 1000));
  if (!rate.allowed) return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || user.status !== "Ativo" || !(await verifyPassword(password, user.passwordHash))) {
    return apiError("E-mail ou senha incorretos.", 401);
  }
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db.update(users).set({ lastAccessAt: new Date() }).where(eq(users.id, user.id));
  await createSession(user.id);
  await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "AUTH_LOGIN", entityType: "session", entityId: user.id });
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}
