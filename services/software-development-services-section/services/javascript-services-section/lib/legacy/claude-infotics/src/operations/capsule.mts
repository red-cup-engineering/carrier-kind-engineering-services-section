/**
 * operations/capsule — gather a set of files into a reusable context capsule.
 *
 * The #15 session-computer piece with no platform home: slice named files to a
 * byte budget, hash each, and return a capsule blob suitable for injection into
 * a claude session (pairs with the harness `context.capsules` field). A
 * host-read operation over node:fs, the same class as the git/process
 * integrations' own child-process reads.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { operation, type Operation } from "@emsenn/metroplat/operations";
import type { FilesystemBinding } from "@emsenn/metroplat/integrations/filesystem";

const DEFAULT_PACKAGE_FILES = ["package.json", "README.md", "src/index.mts", "src/index.ts", "tsconfig.json"] as const;
const DEFAULT_MAX_BYTES = 24 * 1024;

interface Slice {
  readonly path: string;
  readonly bytes: number;
  readonly truncated: boolean;
  readonly sha256: string;
  readonly text: string;
}

function readSlice(root: string, relative: string, maxBytes: number): Slice | undefined {
  const absolute = path.resolve(root, relative);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) return undefined; // confine to root
  try {
    const buffer = readFileSync(absolute);
    const truncated = buffer.byteLength > maxBytes;
    return Object.freeze({
      path: relative,
      bytes: buffer.byteLength,
      truncated,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      text: (truncated ? buffer.subarray(0, maxBytes) : buffer).toString("utf8"),
    });
  } catch {
    return undefined;
  }
}

/** Pure(-ish host-read): build a capsule from a request record and a default root. */
export function buildCapsule(input: unknown, defaultRoot: string): Record<string, unknown> {
  const record = input !== null && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const root = typeof record["root"] === "string" ? path.resolve(record["root"]) : defaultRoot;
  const maxBytes = typeof record["maxBytes"] === "number" && record["maxBytes"] > 0 ? Math.trunc(record["maxBytes"]) : DEFAULT_MAX_BYTES;
  const packages = Array.isArray(record["packages"]) ? (record["packages"] as string[]) : [];
  const explicit = Array.isArray(record["files"]) ? (record["files"] as string[]) : [];
  const candidates = [
    ...packages.flatMap((p) => DEFAULT_PACKAGE_FILES.map((f) => `${p}/${f}`)),
    ...explicit,
  ];
  const slices = [...new Set(candidates)]
    .map((rel) => readSlice(root, rel, maxBytes))
    .filter((s): s is Slice => s !== undefined)
    .sort((a, b) => a.path.localeCompare(b.path));
  const id = createHash("sha256").update(JSON.stringify(slices.map((s) => [s.path, s.sha256]))).digest("hex").slice(0, 16);
  return Object.freeze({
    ok: true,
    id,
    root,
    fileCount: slices.length,
    files: slices,
    evidence: Object.freeze(["boundary:filesystem-read", `capsule:${id}`]),
  });
}

export function claudeCapsuleOperations(binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "claude-capsule",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Slice named files into a reusable context capsule for session injection.",
      description: "Input JSON: { root?, files?: string[], packages?: string[], maxBytes? }. `packages` expands to each package's key files; `files` are explicit root-relative paths.",
      run: (input: unknown): unknown => buildCapsule(input, binding.packageRoot ?? process.cwd()),
    }),
  ]);
}
