import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/session";
import { audit } from "@/lib/server/audit";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user) {
    try {
      await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "AUTH_LOGOUT", entityType: "session", entityId: user.id });
    } catch {
      // Audit logging must never prevent a user from ending their session.
    }
  }
  try {
    await destroySession();
  } catch {
    // destroySession always clears the browser cookie, even if database cleanup fails.
  }
  const url = new URL("/login", request.url);
  url.searchParams.set(new URL(request.url).searchParams.get("mode") === "switch" ? "switch" : "loggedOut", "1");
  return NextResponse.redirect(url, 303);
}
