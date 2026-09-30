import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../lib/auth/password.ts";

test("hash de senha aceita a senha correta e rejeita uma incorreta", async () => {
  const hash = await hashPassword("CidadeFacil@2026");
  assert.match(hash, /^scrypt\$/);
  assert.equal(await verifyPassword("CidadeFacil@2026", hash), true);
  assert.equal(await verifyPassword("senha-incorreta", hash), false);
});
