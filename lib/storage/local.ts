import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const uploadRoot = path.join(process.cwd(), "storage", "uploads");
export async function saveUpload(storageKey: string, bytes: Uint8Array) { await mkdir(uploadRoot, { recursive: true }); await writeFile(path.join(uploadRoot, storageKey), bytes); }
export async function readUpload(storageKey: string) { return readFile(path.join(uploadRoot, path.basename(storageKey))); }
export async function deleteUpload(storageKey: string) { await unlink(path.join(uploadRoot, path.basename(storageKey))).catch(() => undefined); }
