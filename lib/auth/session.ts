import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { municipalities, sessions, userTeamMemberships, users } from "@/db/schema";

export const SESSION_COOKIE = "cidadefacil_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type CurrentUser = {
  id: string;
  municipalityId: string;
  municipalityName: string;
  departmentId: string | null;
  teamIds: string[];
  name: string;
  email: string;
  role: "Administrador" | "Secretário" | "Gestor" | "Servidor" | "Equipe de campo";
  status: "Ativo" | "Inativo";
};

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(sessions).values({ userId, tokenHash: tokenHash(token), expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  try {
    if (token) await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token)));
  } finally {
    store.delete(SESSION_COOKIE);
  }
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [result] = await db
    .select({
      sessionId: sessions.id,
      sessionExpiresAt: sessions.expiresAt,
      id: users.id,
      municipalityId: users.municipalityId,
      municipalityName: municipalities.name,
      departmentId: users.departmentId,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(municipalities, eq(municipalities.id, users.municipalityId))
    .where(and(eq(sessions.tokenHash, tokenHash(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!result) return null;
  if (result.status !== "Ativo") { await db.delete(sessions).where(eq(sessions.id, result.sessionId)); return null; }
  if (result.sessionExpiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
    const renewedExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await db.update(sessions).set({ expiresAt: renewedExpiresAt }).where(eq(sessions.id, result.sessionId));
    try {
      store.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.SESSION_COOKIE_SECURE === "true", path: "/", expires: renewedExpiresAt });
    } catch {
      // Server Components cannot mutate cookies; API activity will renew the browser cookie.
    }
  }
  const memberships = await db.select({ teamId: userTeamMemberships.teamId }).from(userTeamMemberships)
    .where(eq(userTeamMemberships.userId, result.id));
  return { id: result.id, municipalityId: result.municipalityId, municipalityName: result.municipalityName, departmentId: result.departmentId, teamIds: memberships.map((entry) => entry.teamId), name: result.name, email: result.email, role: result.role, status: result.status } satisfies CurrentUser;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
