import path from "node:path";

import {
  operation,
  type Operation,
} from "../../../rpc/index.mts";
import { contentAddress } from "../../../lib/identity/index.mts";
import { schemaFrom, type FromSchema } from "../../../lib/schema/contract.mts";
import type { FilesystemBinding } from "./read-write.mts";
import {
  foldFileLinesUtf8,
  readFileHeadUtf8,
  readFileUtf8,
  realPathOrNull,
  statPathOrNull,
  walkFiles,
  writeFileAtomicIf,
} from "../../../lib/filesystem/index.mts";

const DEFAULT_LINE_COUNT = 80;
const MAX_LINE_COUNT = 200;
const DEFAULT_SEARCH_LIMIT = 50;
const MAX_SEARCH_LIMIT = 200;
const DEFAULT_MAX_SEARCH_FILE_BYTES = 2 * 1024 * 1024;
const MAX_WORKSPACE_REPLACEMENT_BYTES = 256 * 1024;
const WORKSPACE_PRUNE_DIRS: ReadonlySet<string> = new Set([
  ".git",
  ".pnpm-store",
  ".tmp",
  "dist",
  "node_modules",
]);

function inputRecord(input: unknown): Readonly<Record<string, unknown>> {
  return input !== null && typeof input === "object" && !Array.isArray(input) ? input as Readonly<Record<string, unknown>> : {};
}

function optionalPositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function workspaceScopeRoot(binding: FilesystemBinding, scope: string | undefined): string {
  if (scope === "package" && binding.packageRoot !== undefined) return binding.packageRoot;
  return binding.dataRoot;
}

export interface WorkspaceFileSliceLine {
  readonly number: number;
  readonly text: string;
}

export interface WorkspaceFileSliceReadout {
  readonly kind: "metroplat.filesystem.workspace-file-slice-readout";
  readonly root: string;
  readonly path: string;
  readonly absolute: string;
  readonly startLine: number;
  readonly lineCount: number;
  readonly totalLinesSeen: number;
  readonly truncatedBefore: boolean;
  readonly truncatedAfter: boolean;
  readonly lines: readonly WorkspaceFileSliceLine[];
  readonly evidence: readonly string[];
}

export interface WorkspaceTextSearchMatch {
  readonly path: string;
  readonly line: number;
  readonly text: string;
}

export interface WorkspaceTextSearchReadout {
  readonly kind: "metroplat.filesystem.workspace-text-search-readout";
  readonly root: string;
  readonly query: string;
  readonly pathPrefix?: string;
  readonly limit: number;
  readonly filesVisited: number;
  readonly filesSkipped: number;
  readonly matches: readonly WorkspaceTextSearchMatch[];
  readonly truncated: boolean;
  readonly evidence: readonly string[];
}

export const workspaceFileReplaceRequestSchema = {
  $id: "metroplat/filesystem/workspace-file-replace/request",
  type: "object",
  required: ["path", "expected", "content"],
  additionalProperties: false,
  properties: {
    path: { type: "string", minLength: 1 },
    expected: { type: "string", minLength: 1 },
    content: { type: "string" },
  },
} as const;

export type WorkspaceFileReplaceRequest = FromSchema<typeof workspaceFileReplaceRequestSchema>;
export const workspaceFileReplaceRequestContract = schemaFrom(workspaceFileReplaceRequestSchema);

export const workspaceFileReplaceResultSchema = {
  $id: "metroplat/filesystem/workspace-file-replace/result",
  oneOf: [
    {
      type: "object",
      required: ["kind", "path", "before", "after", "changed", "evidence"],
      additionalProperties: false,
      properties: {
        kind: { const: "metroplat.filesystem.workspace-file-replace:witness" },
        path: { type: "string", minLength: 1 },
        before: { type: "string", minLength: 1 },
        after: { type: "string", minLength: 1 },
        changed: { type: "boolean" },
        evidence: { type: "array", items: { type: "string", minLength: 1 } },
      },
    },
    {
      type: "object",
      required: ["kind", "path", "reason", "message", "evidence"],
      additionalProperties: false,
      properties: {
        kind: { const: "metroplat.filesystem.workspace-file-replace:obstruction" },
        path: { type: "string", minLength: 1 },
        reason: { enum: ["package-root-unavailable", "outside-package", "not-file", "non-text", "source-too-large", "replacement-too-large", "stale-source", "write-failed"] },
        message: { type: "string", minLength: 1 },
        actual: { type: "string", minLength: 1 },
        evidence: { type: "array", items: { type: "string", minLength: 1 } },
      },
    },
  ],
} as const;

export type WorkspaceFileReplaceResult = FromSchema<typeof workspaceFileReplaceResultSchema>;
export const workspaceFileReplaceResultContract = schemaFrom(workspaceFileReplaceResultSchema);

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function resolveWithin(root: string, requested: string): string | undefined {
  const resolvedRoot = path.resolve(root);
  const resolved = path.isAbsolute(requested) ? path.resolve(requested) : path.resolve(resolvedRoot, requested);
  const relative = path.relative(resolvedRoot, resolved);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) return resolved;
  return undefined;
}

function workspaceRelative(root: string, filePath: string): string {
  return path.relative(path.resolve(root), filePath).split(path.sep).join("/");
}

function looksTextual(filePath: string): boolean {
  const head = readFileHeadUtf8(filePath, 4096);
  return !head.includes("\u0000");
}

function fileReplaceObstruction(
  requestedPath: string,
  reason: Extract<WorkspaceFileReplaceResult, { readonly kind: "metroplat.filesystem.workspace-file-replace:obstruction" }>["reason"],
  message: string,
  actual?: string,
): WorkspaceFileReplaceResult {
  return Object.freeze({
    kind: "metroplat.filesystem.workspace-file-replace:obstruction" as const,
    path: requestedPath,
    reason,
    message,
    ...(actual === undefined ? {} : { actual }),
    evidence: Object.freeze(["boundary:filesystem", "operation:atomic-content-addressed-replace"]),
  });
}

/** Replace one existing package file iff its exact current content address is
 * still the caller's expected address. The resolved real path must stay under
 * the resolved package root, making symlink traversal an obstruction. */
export function replaceWorkspaceFile(
  packageRoot: string | undefined,
  request: WorkspaceFileReplaceRequest,
): WorkspaceFileReplaceResult {
  if (packageRoot === undefined) {
    return fileReplaceObstruction(request.path, "package-root-unavailable", "workspace replacement requires a bound packageRoot");
  }
  if (Buffer.byteLength(request.content, "utf8") > MAX_WORKSPACE_REPLACEMENT_BYTES) {
    return fileReplaceObstruction(request.path, "replacement-too-large", `replacement exceeds ${MAX_WORKSPACE_REPLACEMENT_BYTES} UTF-8 bytes`);
  }
  const root = realPathOrNull(packageRoot);
  const requested = path.isAbsolute(request.path) ? undefined : path.resolve(packageRoot, request.path);
  const absolute = requested === undefined ? null : realPathOrNull(requested);
  if (root === null || absolute === null) {
    return fileReplaceObstruction(request.path, "not-file", "workspace replacement targets one existing package file");
  }
  const relative = path.relative(root, absolute);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    return fileReplaceObstruction(request.path, "outside-package", "resolved target is outside packageRoot");
  }
  const stat = statPathOrNull(absolute);
  if (stat === null || !stat.isFile()) return fileReplaceObstruction(request.path, "not-file", "workspace replacement target is not a file");
  if (stat.size > MAX_WORKSPACE_REPLACEMENT_BYTES) {
    return fileReplaceObstruction(request.path, "source-too-large", `source exceeds ${MAX_WORKSPACE_REPLACEMENT_BYTES} bytes`);
  }
  if (!looksTextual(absolute)) return fileReplaceObstruction(request.path, "non-text", "workspace replacement target is not UTF-8 text");
  try {
    const current = readFileUtf8(absolute);
    const before = contentAddress(current);
    if (before !== request.expected) {
      return fileReplaceObstruction(request.path, "stale-source", "source content no longer matches expected address", before);
    }
    const after = contentAddress(request.content);
    if (after === before) {
      return Object.freeze({
        kind: "metroplat.filesystem.workspace-file-replace:witness" as const,
        path: relative.split(path.sep).join("/"),
        before,
        after,
        changed: false,
        evidence: Object.freeze(["boundary:filesystem", "operation:atomic-content-addressed-replace", "result:unchanged"]),
      });
    }
    const committed = writeFileAtomicIf(absolute, request.content, () => contentAddress(readFileUtf8(absolute)) === before);
    if (!committed) {
      const actual = contentAddress(readFileUtf8(absolute));
      return fileReplaceObstruction(request.path, "stale-source", "source changed before atomic replacement", actual);
    }
    return Object.freeze({
      kind: "metroplat.filesystem.workspace-file-replace:witness" as const,
      path: relative.split(path.sep).join("/"),
      before,
      after,
      changed: true,
      evidence: Object.freeze(["boundary:filesystem", "operation:atomic-content-addressed-replace", `before:${before}`, `after:${after}`]),
    });
  } catch (error) {
    return fileReplaceObstruction(request.path, "write-failed", error instanceof Error ? error.message : String(error));
  }
}

export function readWorkspaceFileSlice(
  root: string,
  options: {
    readonly path: string;
    readonly startLine?: number;
    readonly lineCount?: number;
  },
): WorkspaceFileSliceReadout | undefined {
  const absolute = resolveWithin(root, options.path);
  if (absolute === undefined) return undefined;
  const stat = statPathOrNull(absolute);
  if (stat === null || !stat.isFile()) return undefined;
  const startLine = clampInt(options.startLine, 1, 1, Number.MAX_SAFE_INTEGER);
  const lineCount = clampInt(options.lineCount, DEFAULT_LINE_COUNT, 1, MAX_LINE_COUNT);
  const endLine = startLine + lineCount - 1;
  const lines: WorkspaceFileSliceLine[] = [];
  let totalLinesSeen = 0;
  foldFileLinesUtf8(absolute, (text) => {
    totalLinesSeen += 1;
    if (totalLinesSeen >= startLine && totalLinesSeen <= endLine) {
      lines.push(Object.freeze({ number: totalLinesSeen, text }));
    }
  });
  return Object.freeze({
    kind: "metroplat.filesystem.workspace-file-slice-readout" as const,
    root: path.resolve(root),
    path: workspaceRelative(root, absolute),
    absolute,
    startLine,
    lineCount,
    totalLinesSeen,
    truncatedBefore: startLine > 1,
    truncatedAfter: totalLinesSeen > endLine,
    lines: Object.freeze(lines),
    evidence: Object.freeze([
      "boundary:filesystem",
      "operation:bounded-line-slice",
      `path:${workspaceRelative(root, absolute)}`,
      `start-line:${startLine}`,
      `line-count:${lineCount}`,
    ]),
  });
}

export function readWorkspaceTextSearch(
  root: string,
  options: {
    readonly query: string;
    readonly pathPrefix?: string;
    readonly limit?: number;
    readonly maxFileBytes?: number;
  },
): WorkspaceTextSearchReadout | undefined {
  const query = options.query.trim();
  if (query.length === 0) return undefined;
  const resolvedRoot = path.resolve(root);
  const prefixRoot = options.pathPrefix === undefined || options.pathPrefix.length === 0
    ? resolvedRoot
    : resolveWithin(resolvedRoot, options.pathPrefix);
  if (prefixRoot === undefined) return undefined;
  const limit = clampInt(options.limit, DEFAULT_SEARCH_LIMIT, 1, MAX_SEARCH_LIMIT);
  const maxFileBytes = clampInt(options.maxFileBytes, DEFAULT_MAX_SEARCH_FILE_BYTES, 1, Number.MAX_SAFE_INTEGER);
  const needle = query.toLowerCase();
  const matches: WorkspaceTextSearchMatch[] = [];
  let filesVisited = 0;
  let filesSkipped = 0;
  let truncated = false;
  const files = walkFiles(prefixRoot, {
    pruneDirectory: (name) => WORKSPACE_PRUNE_DIRS.has(name),
    skipSymbolicLinks: true,
  });
  for (const filePath of files) {
    if (matches.length >= limit) {
      truncated = true;
      break;
    }
    const stat = statPathOrNull(filePath);
    if (stat === null || !stat.isFile() || stat.size > maxFileBytes) {
      filesSkipped += 1;
      continue;
    }
    try {
      if (!looksTextual(filePath)) {
        filesSkipped += 1;
        continue;
      }
      filesVisited += 1;
      let line = 0;
      foldFileLinesUtf8(filePath, (text) => {
        if (matches.length >= limit) return;
        line += 1;
        if (!text.toLowerCase().includes(needle)) return;
        matches.push(Object.freeze({
          path: workspaceRelative(resolvedRoot, filePath),
          line,
          text,
        }));
      });
    } catch {
      filesSkipped += 1;
    }
  }
  return Object.freeze({
    kind: "metroplat.filesystem.workspace-text-search-readout" as const,
    root: resolvedRoot,
    query,
    ...(options.pathPrefix === undefined ? {} : { pathPrefix: options.pathPrefix }),
    limit,
    filesVisited,
    filesSkipped,
    matches: Object.freeze(matches),
    truncated,
    evidence: Object.freeze([
      "boundary:filesystem",
      "operation:literal-text-search",
      `query:${query}`,
      `limit:${limit}`,
    ]),
  });
}

export function workspaceReadoutOperations(binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "workspace-file-slice",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read a bounded line slice from a workspace file.",
      description: "Domain: { scope?, path?, id?, startLine?, lineCount? }. scope package selects packageRoot when available; otherwise dataRoot.",
      run: (input: unknown): unknown => {
        const record = inputRecord(input);
        const requestedPath = typeof record["path"] === "string"
          ? record["path"]
          : typeof record["id"] === "string" ? record["id"] : undefined;
        if (requestedPath === undefined || requestedPath.length === 0) return null;
        const startLine = optionalPositiveNumber(record["startLine"]);
        const lineCount = optionalPositiveNumber(record["lineCount"]);
        return readWorkspaceFileSlice(workspaceScopeRoot(binding, typeof record["scope"] === "string" ? record["scope"] : undefined), {
          path: requestedPath,
          ...(startLine === undefined ? {} : { startLine }),
          ...(lineCount === undefined ? {} : { lineCount }),
        }) ?? null;
      },
    }),
    operation({
      verb: "workspace-text-search",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Search workspace text with bounded literal matching.",
      description: "Domain: { scope?, query, pathPrefix?, path?, limit?, maxFileBytes? }. scope package selects packageRoot when available; otherwise dataRoot.",
      run: (input: unknown): unknown => {
        const record = inputRecord(input);
        if (typeof record["query"] !== "string" || record["query"].length === 0) return null;
        const pathPrefix = typeof record["pathPrefix"] === "string"
          ? record["pathPrefix"]
          : typeof record["path"] === "string" ? record["path"] : undefined;
        const limit = optionalPositiveNumber(record["limit"]);
        const maxFileBytes = optionalPositiveNumber(record["maxFileBytes"]);
        return readWorkspaceTextSearch(workspaceScopeRoot(binding, typeof record["scope"] === "string" ? record["scope"] : undefined), {
          query: record["query"],
          ...(pathPrefix === undefined ? {} : { pathPrefix }),
          ...(limit === undefined ? {} : { limit }),
          ...(maxFileBytes === undefined ? {} : { maxFileBytes }),
        }) ?? null;
      },
    }),
    operation({
      verb: "workspace-file-replace",
      relation: "boundary",
      inputFormat: "json",
      outputFormat: "json",
      effects: {
        class: "external",
        replay: "idempotency-key",
        coordination: "coordination-free",
        deterministic: "unmeasured",
        totality: "schema-bounded",
      },
      domain: workspaceFileReplaceRequestContract,
      codomain: workspaceFileReplaceResultContract,
      summary: "Atomically replace one existing package file at an expected content address.",
      description: "Domain: { path, expected, content }. The real existing target must remain inside packageRoot, be bounded UTF-8 text, and still match expected; stale, escaping, oversized, or failed writes return typed obstructions.",
      run: (input: unknown): unknown => replaceWorkspaceFile(binding.packageRoot, input as WorkspaceFileReplaceRequest),
    }),
  ]);
}
