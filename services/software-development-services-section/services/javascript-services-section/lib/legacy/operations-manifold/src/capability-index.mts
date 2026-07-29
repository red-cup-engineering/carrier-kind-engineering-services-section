import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  eachWorkspacePackageDir,
  packageAtlasView,
  type PackageAtlasView,
} from "@emsenn/jsnode-ick/topology";
import { canonical, parseJson, type JsonValue } from "@emsenn/relating/writing";

import { operationsManifoldStatePath } from "./package-surface.mts";

export type CapabilityCarrier = Readonly<{
  kind: "package" | "function" | "type";
  id: string;
  name: string;
  text: string;
  pkg?: string;
  field?: string;
  description?: string;
  layer?: string;
  href?: string;
  domain?: readonly string[];
  codomain?: string;
  typeKind?: string;
  score?: number;
}>;

export type CapabilitySearchResult = Readonly<{
  kind: "operations-manifold.capability-search";
  query: string;
  terms: readonly string[];
  packages: readonly CapabilityCarrier[];
  functions: readonly CapabilityCarrier[];
  types: readonly CapabilityCarrier[];
}>;

export type CapabilityCoverageResult = Readonly<{
  kind: "operations-manifold.capability-coverage";
  query: string;
  terms: readonly string[];
  coveredTerms: readonly string[];
  gaps: readonly string[];
}>;

const CAPABILITY_STATE_RELATIVE = operationsManifoldStatePath("capability-carriers");

type CapabilityCarrierSnapshot = Readonly<{
  kind: "operations-manifold.capability-carriers";
  generatedAt: string;
  state: string;
  carriers: readonly CapabilityCarrier[];
}>;

const OPERATIONS_MANIFOLD_PUBLIC_CAPABILITIES = Object.freeze([
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "read-agent-run-trace",
    domain: Object.freeze(["agent", "durable", "execution", "observability", "trace", "jsonl", "file", "format", "run", "focus", "limit", "MCP", "HTTP", "script", "witness"]),
    codomain: "AgentRunTraceProjection",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "trace-codex-exec",
    domain: Object.freeze(["codex-exec-jsonl", "jsonl", "file", "run", "focus", "limit", "MCP", "HTTP", "script"]),
    codomain: "CodexExecTraceProjection",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "read-agent-platform",
    domain: Object.freeze(["agent", "platform", "durable", "planning", "execution", "observability", "focus", "capabilities", "session", "governance", "read-work", "reports", "site orchestration"]),
    codomain: "AgentPlatformReading",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "heartbeat",
    domain: Object.freeze(["agent", "platform", "heartbeat", "pulse", "continuous", "learning", "planning", "dreaming", "read-workitems", "read-work items", "llm", "endpoint", "context", "spacesuit", "MCP", "HTTP", "script", "intent", "pressure", "site", "koios", "koios.news", "newsroom"]),
    codomain: "OperationsManifoldHeartbeatReading",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "admit-goal-document",
    domain: Object.freeze(["agent", "platform", "goals", "goal", "intent", "form", "forms", "EAVT", "Datom", "JSONL", "durable", "append-only", "log", "snapshot", "state", "records", "sensor", "actuator", "MCP", "HTTP", "script", "OpenAPI", "planning", "read-workitems"]),
    codomain: "GoalSnapshot",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "agentic-drift-control",
    domain: Object.freeze(["agent", "platform", "agentic", "drift", "assessment", "context", "injection", "memory", "prompts", "resources", "hooks", "MCP", "EAVT", "forms", "context admission", "context spacesuit", "trace", "goals", "heartbeat", "measurement", "constraint", "provenance", "recognition", "consolidation", "suiting"]),
    codomain: "AgenticDriftControlArchitecture",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "orchestration",
    domain: Object.freeze(["agent", "platform", "planning", "execution", "focus", "application nucleus", "arena", "strategy", "read-work enactment", "meaningful human control", "governance", "dispatch", "MCP", "HTTP", "script", "site", "koios", "koios.news", "newsroom", "news website"]),
    codomain: "OrchestrationReading",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "read-workitem-orchestration",
    domain: Object.freeze(["agent", "platform", "durable", "planning", "execution", "tasks", "goals", "read-workitems", "read-work items", "strategy", "arena", "procedure", "process", "dispatch", "governance", "site", "koios", "koios.news", "newsroom", "news website"]),
    codomain: "WorkItemOrchestrationReading",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "meaningful-control-governance",
    domain: Object.freeze(["agent", "platform", "human", "control", "meaningful human control", "governance", "safety envelope", "witness chain", "office", "charter", "dispatch", "review"]),
    codomain: "MeaningfulControlGateReading",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "observability-witness-ledger",
    domain: Object.freeze(["agent", "platform", "durable", "execution", "observability", "trace", "witness", "ledger", "operation", "reports", "cost", "endpoint", "run"]),
    codomain: "WitnessLedgerReading",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "read-operations-ledger",
    domain: Object.freeze(["agent", "platform", "operation", "operations", "ledger", "bookkeeping", "token", "tokens", "cost", "tool", "tool use", "MCP", "command", "http", "file", "read", "write", "EAVT", "JSONL", "fiber", "predicate", "trace", "layer", "nucleus", "ludics", "game", "gamified", "experience", "flow", "challenge", "badge", "automation", "hook"]),
    codomain: "OperationLedgerSnapshot",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "import-operation-trace",
    domain: Object.freeze(["agent", "platform", "operation", "operations", "ledger", "automation", "automated", "hook", "import", "trace", "agent trace", "codex", "exec", "jsonl", "token", "usage", "tool", "command", "file", "read", "write", "bookkeeping", "MCP", "HTTP", "script"]),
    codomain: "OperationTraceImportResult",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "external-llm-endpoint-participant",
    domain: Object.freeze(["agent", "platform", "external", "cloud", "llm", "endpoint", "NVIDIA", "NIM", "OpenAI-compatible", "API", "inference", "model", "outbound-only", "boundary", "handedness", "dispatch", "cost", "rate limit", "auth env var", "witness", "swarm"]),
    codomain: "LLMEndpointRecord",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "cloud-agent-boundary-admission",
    domain: Object.freeze(["agent", "platform", "external", "cloud", "endpoint", "inbound-only", "MCP", "A2A", "boundary", "handedness", "office", "dispatch", "read-workitem", "witness", "governance", "human control"]),
    codomain: "BoundaryAdmissionReading",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "read-agent-card",
    domain: Object.freeze(["agent", "card", "identity", "capability", "capabilities", "federation", "federated", "handoff", "MCP", "OpenAPI", "HTTP", "WebUX", "package script", "surface", "authority", "safety envelope"]),
    codomain: "AgentCard",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "handoff-agent",
    domain: Object.freeze(["agent", "handoff", "federation", "federated", "read-work", "task", "intent", "capability", "authority", "transport", "witness", "ledger", "record", "preview", "MCP", "HTTP", "script"]),
    codomain: "AgentHandoffReading",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "federation",
    domain: Object.freeze(["agent", "federation", "federated", "peer", "peers", "handoff", "protocol", "transport", "MCP", "OpenAPI", "HTTP", "WebUX", "package script", "upstream", "@emsenn/animating", "AgentFederation"]),
    codomain: "FederationReading",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "createCheckpoint",
    domain: Object.freeze(["agent", "createCheckpoint", "replayCheckpoint", "time travel", "durable", "stateless", "jsonl", "json", "data logs", "data state", "state file", "package bin", "LangGraph", "ledger", "snapshot"]),
    codomain: "CheckpointResult",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "replayCheckpoint",
    domain: Object.freeze(["agent", "replayCheckpoint", "createCheckpoint", "time travel", "durable", "stateless", "jsonl", "json", "data logs", "data state", "package bin", "delta", "ledger", "snapshot"]),
    codomain: "ReplayReading",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "recognition",
    domain: Object.freeze(["agent", "recognition", "recognition weighted memory", "sense", "rememberContexted sense", "learning", "provenance", "context suit", "memory", "conflict", "tier", "weight"]),
    codomain: "RecognitionReading",
  }),
  Object.freeze({
    pkg: "@emsenn/operations-manifold",
    name: "weight-recognition",
    domain: Object.freeze(["agent", "recognition", "weight", "recognition weighted memory", "sense beats learning", "conflict resolution", "subject", "claim", "provenance", "context suit"]),
    codomain: "RecognitionWeightReading",
  }),
] as const);

function searchableText(values: readonly unknown[]): string {
  return values.map((value) => String(value ?? "")).join(" ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

// The manifold's own public capabilities are not discoverable from the package
// graph, so they are supplied to the jsnode carrier build as extra carriers.
function publicCapabilityCarriers(): readonly CapabilityCarrier[] {
  return OPERATIONS_MANIFOLD_PUBLIC_CAPABILITIES.map((fn) => Object.freeze({
    kind: "function" as const,
    id: `${fn.pkg}:${fn.name}`,
    pkg: fn.pkg,
    name: fn.name,
    field: "public-capability",
    text: searchableText([fn.name, fn.pkg, ...fn.domain, fn.codomain]),
    domain: fn.domain,
    codomain: fn.codomain,
  }));
}

function termsOf(query: string): readonly string[] {
  return Object.freeze([...new Set(query
    .toLowerCase()
    .split(/[^a-z0-9@._/-]+/u)
    .map((term) => term.trim())
    .filter((term) => term.length > 1))]);
}

function scoreCarrier(carrier: CapabilityCarrier, terms: readonly string[]): number {
  const text = carrier.text.toLowerCase();
  return terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
}

function scored(carriers: readonly CapabilityCarrier[], terms: readonly string[], kind: CapabilityCarrier["kind"]): readonly CapabilityCarrier[] {
  return Object.freeze(carriers
    .filter((carrier) => carrier.kind === kind)
    .map((carrier) => Object.freeze({ ...carrier, score: scoreCarrier(carrier, terms) }))
    .filter((carrier) => (carrier.score ?? 0) > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name))
    .slice(0, 24));
}

function packageCarrier(atlas: PackageAtlasView): CapabilityCarrier {
  return Object.freeze({
    kind: "package" as const,
    id: atlas.package.name,
    pkg: atlas.package.name,
    name: atlas.package.name,
    field: "package",
    description: atlas.package.description,
    layer: atlas.package.layer,
    href: `/jsnode/package?name=${encodeURIComponent(atlas.package.name)}`,
    text: searchableText([
      atlas.package.name,
      atlas.package.description,
      atlas.package.layer,
      atlas.package.maturity,
      ...atlas.package.tags,
      ...atlas.package.dependencies,
      ...atlas.modules.map((mod) => mod.module),
      ...atlas.modules.flatMap((mod) => mod.symbols.map((symbol) => `${symbol.name} ${symbol.kind} ${symbol.signature}`)),
    ]),
  });
}

function functionCarriers(atlas: PackageAtlasView): readonly CapabilityCarrier[] {
  const fromFull = atlas.functions.map((fn) => Object.freeze({
    kind: "function" as const,
    id: `${atlas.package.name}:${fn.name}`,
    pkg: atlas.package.name,
    name: fn.name,
    field: "exported-function",
    href: `/jsnode/symbol?package=${encodeURIComponent(atlas.package.name)}&name=${encodeURIComponent(fn.name)}`,
    text: searchableText([fn.name, atlas.package.name, ...fn.domain, fn.codomain ?? ""]),
    domain: fn.domain,
    ...(fn.codomain === undefined ? {} : { codomain: fn.codomain }),
  }));
  const fromModules = atlas.modules.flatMap((mod) => mod.symbols
    .filter((symbol) => symbol.kind === "function")
    .map((symbol) => Object.freeze({
      kind: "function" as const,
      id: `${atlas.package.name}:${symbol.name}`,
      pkg: atlas.package.name,
      name: symbol.name,
      field: "exported-function",
      href: `/jsnode/symbol?package=${encodeURIComponent(atlas.package.name)}&name=${encodeURIComponent(symbol.name)}`,
      text: searchableText([symbol.name, atlas.package.name, mod.module, symbol.signature]),
      domain: Object.freeze([] as string[]),
    })));
  const byId = new Map([...fromModules, ...fromFull].map((carrier) => [carrier.id, carrier]));
  return Object.freeze([...byId.values()]);
}

function typeCarriers(atlas: PackageAtlasView): readonly CapabilityCarrier[] {
  const fromFull = atlas.types.map((type) => Object.freeze({
    kind: "type" as const,
    id: `${atlas.package.name}:${type.name}`,
    pkg: atlas.package.name,
    name: type.name,
    field: "exported-type",
    href: `/jsnode/symbol?package=${encodeURIComponent(atlas.package.name)}&name=${encodeURIComponent(type.name)}`,
    text: searchableText([type.name, type.kind, atlas.package.name, ...type.bases]),
    typeKind: type.kind,
  }));
  const fromModules = atlas.modules.flatMap((mod) => mod.symbols
    .filter((symbol) => symbol.kind === "class" || symbol.kind === "interface" || symbol.kind === "type-alias")
    .map((symbol) => Object.freeze({
      kind: "type" as const,
      id: `${atlas.package.name}:${symbol.name}`,
      pkg: atlas.package.name,
      name: symbol.name,
      field: "exported-type",
      href: `/jsnode/symbol?package=${encodeURIComponent(atlas.package.name)}&name=${encodeURIComponent(symbol.name)}`,
      text: searchableText([symbol.name, symbol.kind, atlas.package.name, mod.module, symbol.signature]),
      typeKind: symbol.kind,
    })));
  const byId = new Map([...fromModules, ...fromFull].map((carrier) => [carrier.id, carrier]));
  return Object.freeze([...byId.values()]);
}

async function workspaceCapabilityCarriers(
  repoRoot: string,
  options: Readonly<{ extraCarriers?: readonly CapabilityCarrier[] }> = {},
): Promise<readonly CapabilityCarrier[]> {
  const carriers: CapabilityCarrier[] = [...(options.extraCarriers ?? [])];
  for (const pkg of eachWorkspacePackageDir(repoRoot)) {
    const atlas = await packageAtlasView(repoRoot, pkg.name, { detail: "full" });
    if (atlas === null) continue;
    carriers.push(packageCarrier(atlas), ...functionCarriers(atlas), ...typeCarriers(atlas));
  }
  return Object.freeze(carriers);
}

function capabilitySearchOverCarriers(carriers: readonly CapabilityCarrier[], query: string): CapabilitySearchResult {
  const terms = termsOf(query);
  return Object.freeze({
    kind: "operations-manifold.capability-search" as const,
    query,
    terms,
    packages: scored(carriers, terms, "package"),
    functions: scored(carriers, terms, "function"),
    types: scored(carriers, terms, "type"),
  });
}

function capabilityCoverageOverCarriers(carriers: readonly CapabilityCarrier[], query: string): CapabilityCoverageResult {
  const terms = termsOf(query);
  const coveredTerms = terms.filter((term) => carriers.some((carrier) => carrier.text.toLowerCase().includes(term)));
  return Object.freeze({
    kind: "operations-manifold.capability-coverage" as const,
    query,
    terms,
    coveredTerms: Object.freeze(coveredTerms),
    gaps: Object.freeze(terms.filter((term) => !coveredTerms.includes(term))),
  });
}

async function capabilityCarriers(repoRoot: string, options: Readonly<{ refresh?: boolean }> = {}): Promise<readonly CapabilityCarrier[]> {
  if (options.refresh !== true) {
    const cached = await readCapabilityCarrierSnapshot(repoRoot);
    if (cached !== null) return cached.carriers;
  }
  const snapshot = await buildCapabilityCarrierSnapshot(repoRoot);
  await writeCapabilityCarrierSnapshot(repoRoot, snapshot);
  return snapshot.carriers;
}

async function buildCapabilityCarrierSnapshot(repoRoot: string): Promise<CapabilityCarrierSnapshot> {
  return Object.freeze({
    kind: "operations-manifold.capability-carriers" as const,
    generatedAt: new Date().toISOString(),
    state: CAPABILITY_STATE_RELATIVE,
    carriers: await workspaceCapabilityCarriers(repoRoot, { extraCarriers: publicCapabilityCarriers() }),
  });
}

async function readCapabilityCarrierSnapshot(repoRoot: string): Promise<CapabilityCarrierSnapshot | null> {
  try {
    const parsed = parseJson(await readFile(capabilityStatePath(repoRoot), "utf8"));
    return capabilityCarrierSnapshot(parsed);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    return null;
  }
}

async function writeCapabilityCarrierSnapshot(repoRoot: string, snapshot: CapabilityCarrierSnapshot): Promise<void> {
  await mkdir(path.dirname(capabilityStatePath(repoRoot)), { recursive: true });
  await writeFile(capabilityStatePath(repoRoot), `${canonical(snapshot as unknown as JsonValue)}\n`, "utf8");
}

function capabilityCarrierSnapshot(value: JsonValue): CapabilityCarrierSnapshot | null {
  if (!isJsonRecord(value)) return null;
  if (value["kind"] !== "operations-manifold.capability-carriers" || typeof value["generatedAt"] !== "string" || !Array.isArray(value["carriers"])) return null;
  return Object.freeze({
    kind: "operations-manifold.capability-carriers" as const,
    generatedAt: value["generatedAt"],
    state: typeof value["state"] === "string" ? value["state"] : CAPABILITY_STATE_RELATIVE,
    carriers: Object.freeze(value["carriers"].map(capabilityCarrier).filter((item): item is CapabilityCarrier => item !== null)),
  });
}

function capabilityCarrier(value: JsonValue): CapabilityCarrier | null {
  if (!isJsonRecord(value)) return null;
  const kind = value["kind"];
  if (kind !== "package" && kind !== "function" && kind !== "type") return null;
  if (typeof value["id"] !== "string" || typeof value["name"] !== "string" || typeof value["text"] !== "string") return null;
  const domain = Array.isArray(value["domain"]) ? value["domain"].filter((item): item is string => typeof item === "string") : undefined;
  return Object.freeze({
    kind,
    id: value["id"],
    name: value["name"],
    text: value["text"],
    ...(typeof value["pkg"] === "string" ? { pkg: value["pkg"] } : {}),
    ...(typeof value["field"] === "string" ? { field: value["field"] } : {}),
    ...(typeof value["description"] === "string" ? { description: value["description"] } : {}),
    ...(typeof value["layer"] === "string" ? { layer: value["layer"] } : {}),
    ...(typeof value["href"] === "string" ? { href: value["href"] } : {}),
    ...(domain === undefined ? {} : { domain: Object.freeze(domain) }),
    ...(typeof value["codomain"] === "string" ? { codomain: value["codomain"] } : {}),
    ...(typeof value["typeKind"] === "string" ? { typeKind: value["typeKind"] } : {}),
  });
}

function isJsonRecord(value: JsonValue): value is Readonly<Record<string, JsonValue>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function capabilityStatePath(repoRoot: string): string {
  return path.join(repoRoot, CAPABILITY_STATE_RELATIVE);
}

export async function capabilitySearch(repoRoot: string, query: string, options: Readonly<{ refresh?: boolean }> = {}): Promise<CapabilitySearchResult> {
  return capabilitySearchOverCarriers(await capabilityCarriers(repoRoot, options), query);
}

export async function capabilityCoverage(repoRoot: string, query: string, options: Readonly<{ refresh?: boolean }> = {}): Promise<CapabilityCoverageResult> {
  return capabilityCoverageOverCarriers(await capabilityCarriers(repoRoot, options), query);
}
