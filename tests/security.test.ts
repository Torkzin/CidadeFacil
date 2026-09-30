import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit, resetRateLimitsForTests } from "../lib/security/rate-limit.ts";
import { createPublicAccessToken, verifyPublicAccessToken } from "../lib/security/public-token.ts";
import { validImageContent } from "../lib/security/upload.ts";

test("rate limit permite até o limite e informa bloqueio temporário", () => {
  resetRateLimitsForTests();
  assert.equal(checkRateLimit("login:test", 2, 60_000, 1_000).allowed, true);
  assert.equal(checkRateLimit("login:test", 2, 60_000, 1_100).allowed, true);
  const blocked = checkRateLimit("login:test", 2, 60_000, 1_200);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfter > 0);
  assert.equal(checkRateLimit("login:test", 2, 60_000, 62_000).allowed, true);
});

test("token público aceita somente o código original", () => {
  const access = createPublicAccessToken();
  assert.equal(verifyPublicAccessToken(access.token, access.hash), true);
  assert.equal(verifyPublicAccessToken(`${access.token}x`, access.hash), false);
  assert.equal(verifyPublicAccessToken("", access.hash), false);
});

test("validação de upload confere a assinatura real da imagem", () => {
  assert.equal(validImageContent("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0x00])), true);
  assert.equal(validImageContent("image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true);
  assert.equal(validImageContent("image/webp", new TextEncoder().encode("RIFF0000WEBP")), true);
  assert.equal(validImageContent("image/jpeg", new TextEncoder().encode("<script>alert(1)</script>")), false);
  assert.equal(validImageContent("text/html", new Uint8Array([0xff, 0xd8, 0xff])), false);
});

