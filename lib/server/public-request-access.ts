import "server-only";
import { and, eq } from "drizzle-orm";
import { requestFollowers, requests } from "@/db/schema";
import { db } from "@/lib/db";
import {
  hashPublicAccessToken,
  verifyPublicAccessToken,
} from "@/lib/security/public-token";

export async function authenticatePublicRequest({
  municipalityId,
  protocol,
  token,
}: {
  municipalityId: string;
  protocol: string;
  token: string;
}) {
  const [item] = await db
    .select()
    .from(requests)
    .where(
      and(
        eq(requests.municipalityId, municipalityId),
        eq(requests.protocol, protocol),
      ),
    )
    .limit(1);
  if (!item || !token) return null;
  const participantTokenHash = hashPublicAccessToken(token);
  if (verifyPublicAccessToken(token, item.publicAccessTokenHash)) {
    return {
      item,
      participantTokenHash,
      participantName: item.citizenName,
      participantType: "requester" as const,
    };
  }
  const [follower] = await db
    .select({ name: requestFollowers.citizenName })
    .from(requestFollowers)
    .where(
      and(
        eq(requestFollowers.requestId, item.id),
        eq(requestFollowers.accessTokenHash, participantTokenHash),
      ),
    )
    .limit(1);
  return follower
    ? {
        item,
        participantTokenHash,
        participantName: follower.name,
        participantType: "follower" as const,
      }
    : null;
}
