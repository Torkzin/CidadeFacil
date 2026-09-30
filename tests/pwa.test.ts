import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

type WebManifest = {
  id: string;
  name: string;
  start_url: string;
  scope: string;
  display: string;
  icons: Array<{ src: string; sizes: string; purpose: string }>;
};

function readManifest(fileName: string) {
  return JSON.parse(readFileSync(path.join(process.cwd(), "public", fileName), "utf8")) as WebManifest;
}

test("mantém aplicativos distintos para cidadão e gestão", () => {
  const citizen = readManifest("manifest-cidadao.webmanifest");
  const management = readManifest("manifest-gestao.webmanifest");

  assert.equal(citizen.id, "/cidadao");
  assert.equal(citizen.scope, "/cidadao/");
  assert.match(citizen.start_url, /^\/cidadao/);
  assert.equal(management.id, "/gestao");
  assert.equal(management.scope, "/");
  assert.match(management.start_url, /^\/dashboard/);
  assert.notEqual(citizen.name, management.name);
});

test("fornece ícones instaláveis e maskable para os dois aplicativos", () => {
  for (const manifestName of ["manifest-cidadao.webmanifest", "manifest-gestao.webmanifest"]) {
    const manifest = readManifest(manifestName);
    assert.equal(manifest.display, "standalone");
    assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
    assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "any"));
    assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
    for (const icon of manifest.icons) assert.ok(existsSync(path.join(process.cwd(), "public", icon.src)), icon.src);
  }
});
