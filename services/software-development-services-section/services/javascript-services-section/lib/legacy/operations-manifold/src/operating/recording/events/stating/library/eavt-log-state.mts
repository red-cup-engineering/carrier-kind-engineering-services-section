import { appendFile, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseEavt, serializeEavt, toEavt, type EAVT, type JsonValue } from "@emsenn/relating/writing";

import { operationsManifoldLogPath, operationsManifoldStatePath } from "../../../../../package-surface.mts";

export type EavtLogStatePaths = Readonly<{
  log: string;
  state: string;
}>;

export type JsonStateFormatter = (snapshot: unknown) => string;

export function operationsManifoldEavtLogState(name: string): EavtLogStatePaths {
  return Object.freeze({
    log: operationsManifoldLogPath(name),
    state: operationsManifoldStatePath(name),
  });
}

export function eavtLogPath(repoRoot: string, paths: EavtLogStatePaths): string {
  return path.join(repoRoot, paths.log);
}

export function eavtStatePath(repoRoot: string, paths: EavtLogStatePaths): string {
  return path.join(repoRoot, paths.state);
}

export async function ensureEavtLogStateDirs(repoRoot: string, paths: EavtLogStatePaths): Promise<void> {
  await mkdir(path.dirname(eavtLogPath(repoRoot, paths)), { recursive: true });
  await mkdir(path.dirname(eavtStatePath(repoRoot, paths)), { recursive: true });
}

export async function appendEavtLog(repoRoot: string, paths: EavtLogStatePaths, events: readonly EAVT[]): Promise<string> {
  if (events.length === 0) return "";
  const eavtJsonl = serializeEavt(events);
  await appendFile(eavtLogPath(repoRoot, paths), eavtJsonl, "utf8");
  return eavtJsonl;
}

export async function readEavtLog(repoRoot: string, paths: EavtLogStatePaths): Promise<readonly EAVT[]> {
  try {
    const raw = await readFile(eavtLogPath(repoRoot, paths), "utf8");
    return Object.freeze(parseEavt(raw).map(toEavt));
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") return Object.freeze([]);
    throw err;
  }
}

export async function writeJsonState(repoRoot: string, paths: EavtLogStatePaths, snapshot: unknown, format: JsonStateFormatter = prettyJsonState): Promise<void> {
  await writeFileAtomicWithRetry(eavtStatePath(repoRoot, paths), `${format(snapshot)}\n`);
}

export function timeOfEavtMetadata(value: JsonValue, isRecord: (value: JsonValue) => value is Readonly<Record<string, JsonValue>>): string | null {
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value["at"] === "string") return value["at"];
  return null;
}

function prettyJsonState(snapshot: unknown): string {
  return JSON.stringify(snapshot, null, 2);
}

let atomicWriteNonce = 0;

async function writeFileAtomicWithRetry(filePath: string, content: string): Promise<void> {
  const tmp = `${filePath}.${process.pid}.${Date.now()}.${atomicWriteNonce++}.tmp`;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(tmp, content, "utf8");
  try {
    await renameWithContentionRetry(tmp, filePath);
  } catch (err) {
    await unlink(tmp).catch(() => undefined);
    throw err;
  }
}

async function renameWithContentionRetry(from: string, to: string): Promise<void> {
  const attempts = 24;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (err) {
      if (!isRenameContention(err) || attempt === attempts - 1) throw err;
      await delay(Math.min(25 * 2 ** attempt, 500));
    }
  }
}

function isRenameContention(err: unknown): boolean {
  return err !== null
    && typeof err === "object"
    && "code" in err
    && (err.code === "EPERM" || err.code === "EACCES" || err.code === "EBUSY");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
