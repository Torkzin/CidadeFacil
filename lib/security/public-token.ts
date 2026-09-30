import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createPublicAccessToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashPublicAccessToken(token) };
}

export function hashPublicAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyPublicAccessToken(token: string, storedHash: string | null) {
  if (!token || !storedHash) return false;
  const actual = Buffer.from(hashPublicAccessToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

