// Read the live Codex CLI substrate (~/.codex/config.toml) and settle it into
// the codex-cli-harness-topology; plan the canonical You<->MCP<->561 Group Operations Manifold wiring.
// Read-first: nothing here writes config unless asked.
//
// Codex's config is TOML — MCP servers live in `[mcp_servers.<id>]` tables. The
// topology can read a top-level `notify` program array as a hook slot, but this
// computer does not synthesize hook commands. The applied canonical substrate is
// the 561 Group Operations Manifold MCP edge. We read and write config through
// @emsenn/relating/writing (the shared substrate codec, the
// same way the Claude harness uses JSON.parse for .mcp.json): decode the file to
// a value tree, merge the canonical wiring into it, and re-encode — never
// clobbering the servers/keys already there.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import process from "node:process";
import {
  decodeToml,
  encodeToml,
  type TomlTable,
} from "@emsenn/relating/writing";

import { action, carrierFrom, tm } from "@emsenn/relating";
import {
  codexCliHarness,
  OPERATIONS_MANIFOLD_HUB,
  type CodexCliHarnessCarrier,
} from "./openai/codex/cli-harness/index.mjs";

export type { CodexCliHarnessCarrier };

export interface ReadOptions {
  /** The Codex home directory (CODEX_HOME). Defaults to ~/.codex. */
  readonly home?: string;
  readonly id?: string;
  readonly model?: string;
}

export const ReadOptionsSchema = { "$id": "organizing/openai/codex/harness/read-options", "title": "CodexHarnessReadOptions", "additionalProperties": false, type: "object", properties: { "home": { type: "string", "minLength": 1 }, "id": { type: "string", "minLength": 1 }, "model": { type: "string", "minLength": 1 } } } as const;

export const readOptionsCarrier = carrierFrom(ReadOptionsSchema);

/** Resolve the Codex home directory: explicit option, else CODEX_HOME, else ~/.codex. */
export function codexHome(home?: string): string {
  return home ?? process.env["CODEX_HOME"] ?? join(homedir(), ".codex");
}

/** The config.toml path inside a Codex home. */
export function configPath(home?: string): string {
  return join(codexHome(home), "config.toml");
}

function readConfig(path: string): TomlTable {
  try {
    return existsSync(path) ? decodeToml(readFileSync(path, "utf8")) : {};
  } catch {
    return {};
  }
}

/** The `[mcp_servers]` table of a decoded config, or an empty table. */
function mcpServersOf(config: TomlTable): TomlTable {
  const servers = config["mcp_servers"];
  return typeof servers === "object" && servers !== null && !Array.isArray(servers) ? servers : {};
}

/** A server points at 561 Group Operations Manifold if its id is the hub, or its stanza mentions it. */
function hubOf(id: string, stanza: unknown): string {
  return id === OPERATIONS_MANIFOLD_HUB || JSON.stringify(stanza ?? "").includes(OPERATIONS_MANIFOLD_HUB) ? OPERATIONS_MANIFOLD_HUB : id;
}

/** Settle the live Codex substrate into the floor topology — the read direction. */
export function readHarness(opts: ReadOptions = {}): CodexCliHarnessCarrier {
  const config = readConfig(configPath(opts.home));
  const servers = mcpServersOf(config);
  const mcpServers = Object.keys(servers).map((id) => ({ id, pointsAt: hubOf(id, servers[id]) }));
  const hooks = config["notify"] !== undefined ? ["notify"] : [];
  return codexCliHarness({
    id: opts.id ?? "this",
    model: opts.model ?? "gpt-5-codex",
    mcpServers,
    hooks,
  });
}

/** The canonical applied harness: one mcp-server discovering 561 Group Operations Manifold — the
 *  standing law that every tool and read routes You<->MCP<->561 Group Operations Manifold. Hooks
 *  remain readable topology slots, but are not applied until there is a real
 *  event carrier and projection worth installing. */
export function planHarness(opts: ReadOptions = {}): CodexCliHarnessCarrier {
  return codexCliHarness({
    id: opts.id ?? "this",
    model: opts.model ?? "gpt-5-codex",
    mcpServers: [{ id: OPERATIONS_MANIFOLD_HUB, pointsAt: OPERATIONS_MANIFOLD_HUB }],
    hooks: [],
  });
}

export function pointsAtOperationsManifold(h: CodexCliHarnessCarrier): boolean {
  return h.mcpServers.some((s) => s.pointsAt === OPERATIONS_MANIFOLD_HUB);
}

export interface ApplyOptions {
  readonly home?: string;
  /** The 561 Group Operations Manifold MCP hub URL the wired server points at. */
  readonly hubUrl?: string;
  /** Write to disk; otherwise dry-run. */
  readonly write?: boolean;
}

export const ApplyOptionsSchema = { "$id": "organizing/openai/codex/harness/apply-options", "title": "CodexHarnessApplyOptions", "additionalProperties": false, type: "object", properties: { "home": { type: "string", "minLength": 1 }, "hubUrl": { type: "string", "minLength": 1 }, "write": { type: "boolean" } } } as const;

export const applyOptionsCarrier = carrierFrom(ApplyOptionsSchema);

export interface ApplyResult {
  readonly path: string;
  readonly before: TomlTable | null;
  readonly after: TomlTable;
  readonly text: string;
  readonly wrote: boolean;
  /** True when the canonical wiring was already present and nothing changed. */
  readonly alreadyWired: boolean;
}

const TomlTableSchema = { type: "object", additionalProperties: {} } as const;

export const ApplyResultSchema = { "$id": "organizing/openai/codex/harness/apply-result", "title": "CodexHarnessApplyResult", "additionalProperties": false, type: "object", required: ["path", "before", "after", "text", "wrote", "alreadyWired"], properties: { "path": { type: "string", "minLength": 1 }, "before": { anyOf: [TomlTableSchema, { type: "null" }] }, "after": TomlTableSchema, "text": { type: "string" }, "wrote": { type: "boolean" }, "alreadyWired": { type: "boolean" } } } as const;

export const applyResultCarrier = carrierFrom(ApplyResultSchema);

export const canonicalizeReadOptionsAction = action({
  verb: "organizing.openai.codex.harness.canonicalize-read-options",
  description: "Canonicalize Codex harness read options.",
  domain: readOptionsCarrier,
  codomain: readOptionsCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeApplyOptionsAction = action({
  verb: "organizing.openai.codex.harness.canonicalize-apply-options",
  description: "Canonicalize Codex harness apply options.",
  domain: applyOptionsCarrier,
  codomain: applyOptionsCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeApplyResultAction = action({
  verb: "organizing.openai.codex.harness.canonicalize-apply-result",
  description: "Canonicalize a Codex harness apply result.",
  domain: applyResultCarrier,
  codomain: applyResultCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const harnessActions = Object.freeze([
  canonicalizeReadOptionsAction,
  canonicalizeApplyOptionsAction,
  canonicalizeApplyResultAction,
]);

export const DEFAULT_OPERATIONS_MANIFOLD_CODEX_HUB_URL = "http://127.0.0.1:18805/codex/hub/mcp";

/** Project the canonical You<->MCP<->561 Group Operations Manifold wiring into ~/.codex/config.toml —
 *  the write direction. Merges the 561 Group Operations Manifold mcp-server table into the decoded
 *  config and re-encodes; never removes the servers or keys already there. */
export function applyConfig(opts: ApplyOptions = {}): ApplyResult {
  const path = configPath(opts.home);
  const existed = existsSync(path);
  const before = existed ? readConfig(path) : null;
  const hubUrl = opts.hubUrl ?? DEFAULT_OPERATIONS_MANIFOLD_CODEX_HUB_URL;

  const after: TomlTable = before === null ? {} : structuredClone(before);
  const servers = mcpServersOf(after);
  const current = servers[OPERATIONS_MANIFOLD_HUB];
  const alreadyWired =
    typeof current === "object" && current !== null && !Array.isArray(current) && current["url"] === hubUrl;
  servers[OPERATIONS_MANIFOLD_HUB] = { url: hubUrl };
  after["mcp_servers"] = servers;

  const text = encodeToml(after);
  if (opts.write === true && !alreadyWired) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  return { path, before, after, text, wrote: opts.write === true && !alreadyWired, alreadyWired };
}

export function renderHarness(h: CodexCliHarnessCarrier): string {
  const servers =
    h.mcpServers.length === 0
      ? "(none)"
      : h.mcpServers.map((s) => `${s.id} -> ${s.pointsAt}`).join(", ");
  return [
    `harness: ${h.term}  (agent ${h.agent}, model ${h.model})`,
    `  mcp-servers: ${servers}`,
    `  hooks: ${h.hooks.length === 0 ? "(none)" : h.hooks.join(", ")}`,
    `  You<->MCP<->561 Group Operations Manifold: ${pointsAtOperationsManifold(h) ? "wired" : "MISSING — no mcp-server points at 561 Group Operations Manifold"}`,
    `  utterances settled: ${h.utterances.length}`,
  ].join("\n");
}
