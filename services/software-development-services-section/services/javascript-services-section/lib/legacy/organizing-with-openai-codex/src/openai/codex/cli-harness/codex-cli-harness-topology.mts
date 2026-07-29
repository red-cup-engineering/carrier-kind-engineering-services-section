/**
 * codex-cli-harness-topology — the Codex CLI harness as a settled meme-topology
 * carrier. The floor of the diamond: downstream of BOTH middles.
 *
 *   @emsenn/animating/becoming/doing/embodying/boundary              (apex)
 *     ├── @emsenn/organizing-with-openai-agents/harness (agent + content: equips an agent with channels)
 *     └── codex-topology           (agent + openai-models: embodies an agent on a model)
 *           └── codex-cli-harness-topology  (⊂ both — this node)
 *
 * The name spells its lineage: it *is* an agent-harness (it equips an agent and
 * speaks channels) AND it *is* codex's (it embodies an agent running an openai
 * model). Every word — including "cli" and "harness" — is load-bearing.
 *
 * What this floor adds over the two middles is the concrete CLI's *slots*, as
 * they appear in ~/.codex/config.toml: mcp-server ([mcp_servers.*]), hook (the
 * `notify` program), setting (model / approval_policy / sandbox_mode keys), and
 * profile ([profiles.*]). The single load-bearing edge is
 * `mcp-server --points-at--> hub`, where the hub is 561 Group Operations Manifold: that edge is the
 * topological statement of the standing law that every tool and read routes
 * You↔MCP↔561 Group Operations Manifold. The harness "speaks MCP" to *discover* the hub; it does not
 * hardcode it, so `pointsAt` is a coordinate, settled, not a constant.
 *
 * Pure: coordinates admit onto the meme floor as utterances; settlement is
 * `induceCodexCliHarnessTopology`.
 */
import { action, carrierFrom, mark, tm, utterance, type UtteranceCarrier, type MemeTopologyFixedPointReadings, type SettlementFiltration } from "@emsenn/relating";

import { fixedPointReadingsOfUtterances, settleUtterances } from "@emsenn/animating";
import { harness, harnessTerm } from "@emsenn/organizing-with-openai-agents/harness";
import { codex, codexTerm } from "../index.mjs";

export type { UtteranceCarrier };

/** The default hub a discovered mcp-server points at. */
export const OPERATIONS_MANIFOLD_HUB = "operations-manifold";

// ---------- term constructors ----------

/** The term for a CLI harness node: prefixes the id with "codex-cli-harness.". */
export function cliHarnessTerm(id: string): string {
  return `codex-cli-harness.${id}`;
}
/** The term for an mcp-server slot node: prefixes the id with "mcp-server.". */
export function mcpServerTerm(id: string): string {
  return `mcp-server.${id}`;
}
/** The term for a hook slot node: prefixes the id with "hook.". */
export function hookTerm(id: string): string {
  return `hook.${id}`;
}
/** The term for a setting slot node: prefixes the id with "setting.". */
export function settingTerm(id: string): string {
  return `setting.${id}`;
}
/** The term for a profile slot node: prefixes the id with "profile.". */
export function profileTerm(id: string): string {
  return `profile.${id}`;
}
/** The term for a hub node: prefixes the id with "hub.". */
export function hubTerm(id: string): string {
  return `hub.${id}`;
}

// ---------- predicate constructors ----------

/** floor --is-harness--> harness : the ⊂ edge to organizing-with-openai-agents harness. */
export function isHarnessPredicate(): string {
  return "codex-cli-harness.is-harness";
}
/** floor --is-codex--> codex : the ⊂ edge to codex-topology. */
export function isCodexPredicate(): string {
  return "codex-cli-harness.is-codex";
}
/** floor --has-mcp-server--> mcp-server : a CLI MCP server slot. */
export function hasMcpServerPredicate(): string {
  return "harness.has-mcp-server";
}
/** mcp-server --points-at--> hub : the hub the server discovers (561 Group Operations Manifold). The
 *  one edge that makes You↔MCP↔561 Group Operations Manifold a settled fact. */
export function pointsAtPredicate(): string {
  return "mcp-server.points-at";
}
/** floor --fires-hook--> hook : a CLI hook slot (Codex's `notify` program).
 *  Returns "harness.fires-hook". */
export function firesHookPredicate(): string {
  return "harness.fires-hook";
}
/** floor --has-setting--> setting : a CLI setting slot. Returns
 *  "harness.has-setting". */
export function hasSettingPredicate(): string {
  return "harness.has-setting";
}
/** floor --has-profile--> profile : a CLI profile slot. Returns
 *  "harness.has-profile". */
export function hasProfilePredicate(): string {
  return "harness.has-profile";
}

// ---------- carrier ----------

/**
 * Input for one mcp-server slot: the server id and an optional hub it points at
 * (defaulting to 561 Group Operations Manifold).
 */
export interface McpServerInput {
  readonly id: string;
  /** Hub the server points at; defaults to 561 Group Operations Manifold. */
  readonly pointsAt?: string;
}

export const McpServerInputSchema = { "$id": "organizing/openai/codex/cli-harness/mcp-server-input", "title": "CodexCliMcpServerInput", "additionalProperties": false, type: "object", required: ["id"], properties: { "id": { type: "string", "minLength": 1 }, "pointsAt": { type: "string", "minLength": 1 } } } as const;

export const mcpServerInputCarrier = carrierFrom(McpServerInputSchema);

/**
 * Input for one CLI harness: the id, the agent it equips/embodies, the openai
 * model it runs on, the channels it speaks, the default hub, and the CLI slot
 * lists (mcp-servers, hooks, settings, profiles).
 */
export interface CodexCliHarnessInput {
  readonly id: string;
  /** Agent the harness equips/embodies; defaults to the harness id. */
  readonly agent?: string;
  /** Openai model the embodied agent runs on. */
  readonly model: string;
  /** Channels the harness speaks over (content-topology channels). */
  readonly channels?: readonly string[];
  /** Default hub for servers given as bare ids; defaults to 561 Group Operations Manifold. */
  readonly hub?: string;
  readonly mcpServers?: readonly (string | McpServerInput)[];
  readonly hooks?: readonly string[];
  readonly settings?: readonly string[];
  readonly profiles?: readonly string[];
}

export const CodexCliHarnessInputSchema = { "$id": "organizing/openai/codex/cli-harness/input", "title": "CodexCliHarnessInput", "additionalProperties": false, type: "object", required: ["id", "model"], properties: { "id": { type: "string", "minLength": 1 }, "agent": { type: "string", "minLength": 1 }, "model": { type: "string", "minLength": 1 }, "channels": { type: "array", items: { type: "string", "minLength": 1 } }, "hub": { type: "string", "minLength": 1 }, "mcpServers": { type: "array", items: { anyOf: [{ type: "string", "minLength": 1 }, McpServerInputSchema] } }, "hooks": { type: "array", items: { type: "string", "minLength": 1 } }, "settings": { type: "array", items: { type: "string", "minLength": 1 } }, "profiles": { type: "array", items: { type: "string", "minLength": 1 } } } } as const;

export const codexCliHarnessInputCarrier = carrierFrom(CodexCliHarnessInputSchema);

/**
 * An mcp-server slot after resolution: the server id paired with the concrete
 * hub it points at.
 */
export interface ResolvedMcpServer {
  readonly id: string;
  readonly pointsAt: string;
}

export const ResolvedMcpServerSchema = { "$id": "organizing/openai/codex/cli-harness/resolved-mcp-server", "title": "CodexCliResolvedMcpServer", "additionalProperties": false, type: "object", required: ["id", "pointsAt"], properties: { "id": { type: "string", "minLength": 1 }, "pointsAt": { type: "string", "minLength": 1 } } } as const;

export const resolvedMcpServerCarrier = carrierFrom(ResolvedMcpServerSchema);

/**
 * A settled CLI harness carrier: its term, id, agent, model, default hub, and
 * the resolved CLI slots (mcp-servers, hooks, settings, profiles), together with
 * the utterances that express the harness and both middles on the meme floor.
 */
export interface CodexCliHarnessCarrier {
  readonly kind: "codex-cli-harness.carrier";
  readonly term: string;
  readonly id: string;
  readonly agent: string;
  readonly model: string;
  readonly hub: string;
  readonly mcpServers: readonly ResolvedMcpServer[];
  readonly hooks: readonly string[];
  readonly settings: readonly string[];
  readonly profiles: readonly string[];
  readonly utterances: readonly UtteranceCarrier[];
}

export const CodexCliHarnessCarrierSchema = { "$id": "organizing/openai/codex/cli-harness/carrier", "title": "CodexCliHarnessCarrier", "additionalProperties": false, type: "object", required: ["kind", "term", "id", "agent", "model", "hub", "mcpServers", "hooks", "settings", "profiles", "utterances"], properties: { "kind": { const: "codex-cli-harness.carrier" }, "term": { type: "string", "minLength": 1 }, "id": { type: "string", "minLength": 1 }, "agent": { type: "string", "minLength": 1 }, "model": { type: "string", "minLength": 1 }, "hub": { type: "string", "minLength": 1 }, "mcpServers": { type: "array", items: ResolvedMcpServerSchema }, "hooks": { type: "array", items: { type: "string", "minLength": 1 } }, "settings": { type: "array", items: { type: "string", "minLength": 1 } }, "profiles": { type: "array", items: { type: "string", "minLength": 1 } }, "utterances": { type: "array", items: {} } } } as const;

export const codexCliHarnessCarrier = carrierFrom(CodexCliHarnessCarrierSchema);

export const canonicalizeCodexCliHarnessAction = action({
  verb: "organizing.openai.codex.cli-harness.canonicalize-harness",
  summary: "Canonicalize an admitted Codex CLI harness carrier through the relational IR.",
  description: "Domain and codomain: a CodexCliHarnessCarrier. Body: the CHL identity term.",
  domain: codexCliHarnessCarrier,
  codomain: codexCliHarnessCarrier,
  runTerm: tm.lam(tm.var(0)),
});

function slotUtterance(subject: string, object: string, predicate: string): UtteranceCarrier {
  return utterance(mark({ subject, object }), mark(predicate));
}

/**
 * Builds a CLI harness carrier from input: composes the harness and codex
 * middles on the same body, resolves each mcp-server to its hub, and emits the
 * utterances — the two is-harness/is-codex edges, the middles' own coordinates,
 * and one edge per CLI slot (including each mcp-server's points-at-hub edge).
 */
export function codexCliHarness(
  input: CodexCliHarnessInput,
): CodexCliHarnessCarrier {
  const term = cliHarnessTerm(input.id);
  const agent = input.agent ?? input.id;
  const hub = input.hub ?? OPERATIONS_MANIFOLD_HUB;

  // The two middles, on the same body natural (same id/agent).
  const h = harness({ id: input.id, agent, channels: input.channels ?? [] });
  const cx = codex({ id: input.id, agent, model: input.model });

  const mcpServers: ResolvedMcpServer[] = (input.mcpServers ?? []).map((m) =>
    typeof m === "string"
      ? { id: m, pointsAt: hub }
      : { id: m.id, pointsAt: m.pointsAt ?? hub },
  );
  const hooks = [...(input.hooks ?? [])];
  const settings = [...(input.settings ?? [])];
  const profiles = [...(input.profiles ?? [])];

  const utterances: UtteranceCarrier[] = [
    // ⊂ both middles
    slotUtterance(term, harnessTerm(input.id), isHarnessPredicate()),
    slotUtterance(term, codexTerm(input.id), isCodexPredicate()),
    // embed the middles' own coordinates so the floor settles with their content
    ...h.utterances,
    ...cx.utterances,
  ];
  for (const s of mcpServers) {
    utterances.push(slotUtterance(term, mcpServerTerm(s.id), hasMcpServerPredicate()));
    // the load-bearing edge: mcp-server points at the hub (561 Group Operations Manifold)
    utterances.push(slotUtterance(mcpServerTerm(s.id), hubTerm(s.pointsAt), pointsAtPredicate()));
  }
  for (const k of hooks) utterances.push(slotUtterance(term, hookTerm(k), firesHookPredicate()));
  for (const g of settings) utterances.push(slotUtterance(term, settingTerm(g), hasSettingPredicate()));
  for (const p of profiles) utterances.push(slotUtterance(term, profileTerm(p), hasProfilePredicate()));

  return Object.freeze({
    kind: "codex-cli-harness.carrier" as const,
    term,
    id: input.id,
    agent,
    model: input.model,
    hub,
    mcpServers: Object.freeze(mcpServers),
    hooks: Object.freeze(hooks),
    settings: Object.freeze(settings),
    profiles: Object.freeze(profiles),
    utterances: Object.freeze(utterances),
  });
}

// ---------- topology settlement ----------

/**
 * A meme-topology carrier settled from CLI harness utterances: a branded
 * fixed-point readings identifying the codex-cli-harness floor.
 */
export interface CodexCliHarnessTopologyCarrier {
  readonly kind: "codex-cli-harness.topology.carrier";
  readonly utterances: readonly UtteranceCarrier[];
  readonly settlement: SettlementFiltration;
  readonly fixedPointReadings: MemeTopologyFixedPointReadings;
  readonly _codexCliHarnessTopologyBrand: never;
}

export const CodexCliHarnessTopologyCarrierSchema = { "$id": "organizing/openai/codex/cli-harness/topology", "title": "CodexCliHarnessTopologyCarrier", "additionalProperties": false, type: "object", required: ["kind", "utterances", "settlement", "fixedPointReadings"], properties: { "kind": { const: "codex-cli-harness.topology.carrier" }, "utterances": { type: "array", items: {} }, "settlement": {}, "fixedPointReadings": {} } } as const;

export const codexCliHarnessTopologyCarrier = carrierFrom(CodexCliHarnessTopologyCarrierSchema);

export const canonicalizeCodexCliHarnessTopologyAction = action({
  verb: "organizing.openai.codex.cli-harness.canonicalize-topology",
  summary: "Canonicalize an admitted Codex CLI harness topology carrier through the relational IR.",
  description: "Domain and codomain: a CodexCliHarnessTopologyCarrier. Body: the CHL identity term.",
  domain: codexCliHarnessTopologyCarrier,
  codomain: codexCliHarnessTopologyCarrier,
  runTerm: tm.lam(tm.var(0)),
});

/**
 * Settles a set of utterances into a CLI harness topology carrier by inducing
 * the meme floor over them.
 */
export function induceCodexCliHarnessTopology(
  utterances: readonly UtteranceCarrier[],
): CodexCliHarnessTopologyCarrier {
  const log = Object.freeze([...utterances]);
  return Object.freeze({
    kind: "codex-cli-harness.topology.carrier" as const,
    utterances: log,
    settlement: settleUtterances(log),
    fixedPointReadings: fixedPointReadingsOfUtterances(log),
  }) as CodexCliHarnessTopologyCarrier;
}

/**
 * Extends a settled CLI harness topology carrier with a delta of further
 * utterances, returning the re-settled carrier.
 */
export function extendCodexCliHarnessTopology(
  carrier: CodexCliHarnessTopologyCarrier,
  delta: readonly UtteranceCarrier[],
): CodexCliHarnessTopologyCarrier {
  return induceCodexCliHarnessTopology([...carrier.utterances, ...delta]);
}

/** Settle one CLI harness's coordinates (both middles + CLI slots) into a carrier. */
export function induceHarnessInstanceTopology(
  h: CodexCliHarnessCarrier,
): CodexCliHarnessTopologyCarrier {
  return induceCodexCliHarnessTopology(h.utterances);
}

export const actions = Object.freeze([
  canonicalizeCodexCliHarnessAction,
  canonicalizeCodexCliHarnessTopologyAction,
]);
