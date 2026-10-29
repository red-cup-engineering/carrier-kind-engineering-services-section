/**
 * codex-topology — the Codex CLI as a settled meme-topology carrier.
 *
 * The "codex" half of the codex-cli-harness diamond: apex
 * `@red-cup-engineering/animating/becoming/doing/embodying/boundary`; middles `@red-cup-engineering/organizing-with-openai-agents/harness`
 * (agent + content) and this one (agent +
 * openai-models); floor `codex-cli-harness-topology` ⊂ both.
 *
 * Codex is an agent application that *runs* an openai model: a codex `embodies`
 * an agent (animating topology — the edge up to the apex) and `runs` that agent on
 * an openai model (openai-topology). It carries no harness slots of its own —
 * equipping an agent with the channels it speaks over is organizing-with-openai-agents harness's
 * half, and the floor specializes the *meet* of the two middles to the concrete
 * CLI (mcp-server, hook, setting, profile), where the mcp-server points at
 * 561 Group Operations Manifold.
 *
 * Pure: a codex's coordinates admit onto the meme floor as utterances;
 * settlement is `induceCodexTopology`.
 */
import { action, carrierFrom, mark, tm, utterance, type UtteranceCarrier, type MemeTopologyFixedPointReadings, type SettlementFiltration } from "@emsenn/relating";

import { fixedPointReadingsOfUtterances, settleUtterances, termOf } from "@red-cup-engineering/animating";
import { modelTerm } from "../index.mjs";

export type { UtteranceCarrier };

// ---------- term constructor ----------

/** Namespaced mark for a Codex instance: "codex.<id>". */
export function codexTerm(id: string): string {
  return `codex.${id}`;
}

// ---------- predicate constructors ----------

/** codex --embodies--> agent : the agent the application acts as. The agent term
 *  is animating topology's — the diamond edge up to the apex. */
export function embodiesPredicate(): string {
  return "codex.embodies";
}

/** codex --runs--> model : the openai model the embodied agent runs on. The model
 *  term is openai-topology's. */
export function runsPredicate(): string {
  return "codex.runs";
}

// ---------- CodexCarrier ----------

/**
 * Input coordinates for a Codex instance: the instance id, the agent id it
 * embodies (defaulting to the id), and the openai model id the agent runs on.
 */
export interface CodexInput {
  /** Instance id, e.g. a session id or "default". */
  readonly id: string;
  /** Agent id the instance embodies; defaults to the instance id. */
  readonly agent?: string;
  /** Openai model id the agent runs on (gpt-5-codex | gpt-5 | gpt-5-mini | gpt-5-nano). */
  readonly model: string;
}

export const CodexInputSchema = { "$id": "organizing/openai/codex/topology/input", "title": "CodexInput", "additionalProperties": false, type: "object", required: ["id", "model"], properties: { "id": { type: "string", "minLength": 1 }, "agent": { type: "string", "minLength": 1 }, "model": { type: "string", "minLength": 1 } } } as const;

export const codexInputCarrier = carrierFrom(CodexInputSchema);

/**
 * A settled Codex instance: its namespaced term, id, embodied agent, openai
 * model, and the frozen embodies/runs utterances that admit onto the meme floor.
 */
export interface CodexCarrier {
  readonly kind: "codex.carrier";
  readonly term: string;
  readonly id: string;
  readonly agent: string;
  readonly model: string;
  readonly utterances: readonly UtteranceCarrier[];
}

export const CodexCarrierSchema = { "$id": "organizing/openai/codex/topology/carrier", "title": "CodexCarrier", "additionalProperties": false, type: "object", required: ["kind", "term", "id", "agent", "model", "utterances"], properties: { "kind": { const: "codex.carrier" }, "term": { type: "string", "minLength": 1 }, "id": { type: "string", "minLength": 1 }, "agent": { type: "string", "minLength": 1 }, "model": { type: "string", "minLength": 1 }, "utterances": { type: "array", items: {} } } } as const;

export const codexCarrier = carrierFrom(CodexCarrierSchema);

export const canonicalizeCodexAction = action({
  verb: "organizing.openai.codex.topology.canonicalize-codex",
  summary: "Canonicalize an admitted Codex topology carrier through the relational IR.",
  description: "Domain and codomain: a CodexCarrier. Body: the CHL identity term.",
  domain: codexCarrier,
  codomain: codexCarrier,
  runTerm: tm.lam(tm.var(0)),
});

/**
 * Builds a frozen CodexCarrier from input coordinates: derives the term,
 * defaults the agent to the id, and emits the embodies (agent) and runs (model)
 * utterances.
 */
export function codex(input: CodexInput): CodexCarrier {
  const term = codexTerm(input.id);
  const agent = input.agent ?? input.id;
  const utterances: UtteranceCarrier[] = [
    utterance(
      mark({ subject: term, object: termOf(mark(agent)) }),
      mark(embodiesPredicate()),
    ),
    utterance(
      mark({ subject: term, object: modelTerm(input.model) }),
      mark(runsPredicate()),
    ),
  ];
  return Object.freeze({
    kind: "codex.carrier" as const,
    term,
    id: input.id,
    agent,
    model: input.model,
    utterances: Object.freeze(utterances),
  });
}

// ---------- topology settlement ----------

/**
 * A meme-topology carrier branded as the codex topology: the settled relational
 * structure over codex utterances.
 */
export interface CodexTopologyCarrier {
  readonly kind: "codex.topology.carrier";
  readonly utterances: readonly UtteranceCarrier[];
  readonly settlement: SettlementFiltration;
  readonly fixedPointReadings: MemeTopologyFixedPointReadings;
  readonly _codexTopologyBrand: never;
}

export const CodexTopologyCarrierSchema = { "$id": "organizing/openai/codex/topology/topology", "title": "CodexTopologyCarrier", "additionalProperties": false, type: "object", required: ["kind", "utterances", "settlement", "fixedPointReadings"], properties: { "kind": { const: "codex.topology.carrier" }, "utterances": { type: "array", items: {} }, "settlement": {}, "fixedPointReadings": {} } } as const;

export const codexTopologyCarrier = carrierFrom(CodexTopologyCarrierSchema);

export const canonicalizeCodexTopologyAction = action({
  verb: "organizing.openai.codex.topology.canonicalize-topology",
  summary: "Canonicalize an admitted Codex topology carrier through the relational IR.",
  description: "Domain and codomain: a CodexTopologyCarrier. Body: the CHL identity term.",
  domain: codexTopologyCarrier,
  codomain: codexTopologyCarrier,
  runTerm: tm.lam(tm.var(0)),
});

/**
 * Settles a set of utterances into a CodexTopologyCarrier by inducing the meme
 * topology over them.
 */
export function induceCodexTopology(
  utterances: readonly UtteranceCarrier[],
): CodexTopologyCarrier {
  const log = Object.freeze([...utterances]);
  return Object.freeze({
    kind: "codex.topology.carrier" as const,
    utterances: log,
    settlement: settleUtterances(log),
    fixedPointReadings: fixedPointReadingsOfUtterances(log),
  }) as CodexTopologyCarrier;
}

/**
 * Extends an existing CodexTopologyCarrier with a delta of utterances, returning
 * the re-settled topology.
 */
export function extendCodexTopology(
  carrier: CodexTopologyCarrier,
  delta: readonly UtteranceCarrier[],
): CodexTopologyCarrier {
  return induceCodexTopology([...carrier.utterances, ...delta]);
}

/** Settle a single Codex instance's coordinates into a topology carrier. */
export function induceCodexInstanceTopology(
  c: CodexCarrier,
): CodexTopologyCarrier {
  return induceCodexTopology(c.utterances);
}

export const actions = Object.freeze([
  canonicalizeCodexAction,
  canonicalizeCodexTopologyAction,
]);
