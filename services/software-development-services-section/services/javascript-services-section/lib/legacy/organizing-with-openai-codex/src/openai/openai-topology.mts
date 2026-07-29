/**
 * openai-topology — the openai models as a settled meme-topology carrier.
 *
 * This is the "openai" half of the codex-cli-harness diamond
 * (apex `@emsenn/animating/becoming/doing/embodying/boundary`; middles `@emsenn/organizing-with-openai-agents/harness`
 * = agent+content and
 * `codex-topology` = agent+openai-topology; floor `codex-cli-harness-topology`
 * ⊂ both). It is scoped to *only the models*: the GPT-5 family that the Codex
 * CLI runs on — gpt-5-codex, gpt-5, gpt-5-mini, gpt-5-nano.
 *
 * An openai model is read two ways, both downstream of animating topology:
 *  - it `realizes` an agent — the inference surface an agent's prehensions run on
 *    (`agentTerm` from `@emsenn/animating/becoming/doing/embodying/boundary`), the edge that makes this node a refinement
 *    of the apex; and
 *  - it sits `at-tier` a formality tier. Per the agent-algebra tier-routing
 *    reading the tiers are F0 (flagship), F1, F2 — gpt-5-codex/gpt-5 at F0,
 *    gpt-5-mini at F1, gpt-5-nano at F2 — and tiers are *peer formality surfaces
 *    over the same bilattice substrate*, a differentiating coordinate, not a
 *    capability total order.
 *
 * Pure: a model's coordinates admit onto the meme floor as utterances; settlement
 * is `induceOpenaiTopology`. No transport, no store, no harness lives here.
 */
import { action, carrierFrom, mark, tm, utterance, type UtteranceCarrier, type MemeTopologyFixedPointReadings, type SettlementFiltration } from "@emsenn/relating";

import { fixedPointReadingsOfUtterances, settleUtterances, termOf } from "@emsenn/animating";

export type { UtteranceCarrier };

/** The openai models this node settles. Open string elsewhere; this union pins
 *  the GPT-5 family the Codex CLI actually runs. */
export type OpenaiModelId = "gpt-5-codex" | "gpt-5" | "gpt-5-mini" | "gpt-5-nano";

export const OpenaiModelIdSchema = { anyOf: [{ const: "gpt-5-codex" }, { const: "gpt-5" }, { const: "gpt-5-mini" }, { const: "gpt-5-nano" }] } as const;

/** Formality tiers, per the agent-algebra tier-routing reading. */
export type ModelTier = "F0" | "F1" | "F2";

export const ModelTierSchema = { anyOf: [{ const: "F0" }, { const: "F1" }, { const: "F2" }] } as const;

// ---------- term constructors ----------

/** Namespaced mark for an openai model: "model.<id>". Matches the object form
 *  animating topology identity already prehends (`prehend(agent, "model.gpt-5")`). */
export function modelTerm(id: string): string {
  return `model.${id}`;
}

/** Namespaced mark for a formality tier: "tier.<F>". */
export function tierTerm(tier: string): string {
  return `tier.${tier}`;
}

// ---------- predicate constructors ----------

/** model --realizes--> agent : the inference surface an agent is realized through.
 *  The agent term is animating topology's — this is the diamond edge to the apex. */
export function realizesPredicate(): string {
  return "model.realizes";
}

/** model --at-tier--> tier : the formality tier the model occupies. */
export function atTierPredicate(): string {
  return "model.at-tier";
}

// ---------- OpenaiModelCarrier ----------

/**
 * Input coordinates for one openai model: its id, the formality tier it
 * occupies, and the agent id it realizes (defaulting to the model id).
 */
export interface OpenaiModelInput {
  /** Model id, e.g. "gpt-5-codex". */
  readonly id: string;
  /** Formality tier the model occupies. */
  readonly tier: string;
  /** Agent id the model realizes; defaults to the model id. */
  readonly agent?: string;
}

export const OpenaiModelInputSchema = { "$id": "organizing/openai/codex/openai-topology/model-input", "title": "CodexOpenaiModelInput", "additionalProperties": false, type: "object", required: ["id", "tier"], properties: { "id": OpenaiModelIdSchema, "tier": ModelTierSchema, "agent": { type: "string", "minLength": 1 } } } as const;

export const openaiModelInputCarrier = carrierFrom(OpenaiModelInputSchema);

/**
 * An openai model as a settled carrier: its namespaced model term, id, tier,
 * realized agent id, and the utterances asserting model --realizes--> agent and
 * model --at-tier--> tier.
 */
export interface OpenaiModelCarrier {
  readonly kind: "openai.model.carrier";
  readonly term: string;
  readonly id: string;
  readonly tier: string;
  readonly agent: string;
  readonly utterances: readonly UtteranceCarrier[];
}

export const OpenaiModelCarrierSchema = { "$id": "organizing/openai/codex/openai-topology/model", "title": "CodexOpenaiModelCarrier", "additionalProperties": false, type: "object", required: ["kind", "term", "id", "tier", "agent", "utterances"], properties: { "kind": { const: "openai.model.carrier" }, "term": { type: "string", "minLength": 1 }, "id": OpenaiModelIdSchema, "tier": ModelTierSchema, "agent": { type: "string", "minLength": 1 }, "utterances": { type: "array", items: {} } } } as const;

export const openaiModelCarrier = carrierFrom(OpenaiModelCarrierSchema);

/**
 * Builds an OpenaiModelCarrier from an OpenaiModelInput: derives the model term,
 * resolves the realized agent (defaulting to the id), and emits the realizes
 * and at-tier utterances as a frozen carrier.
 */
export function openaiModel(input: OpenaiModelInput): OpenaiModelCarrier {
  const term = modelTerm(input.id);
  const agent = input.agent ?? input.id;
  const utterances: UtteranceCarrier[] = [
    utterance(
      mark({ subject: term, object: termOf(mark(agent)) }),
      mark(realizesPredicate()),
    ),
    utterance(
      mark({ subject: term, object: tierTerm(input.tier) }),
      mark(atTierPredicate()),
    ),
  ];
  return Object.freeze({
    kind: "openai.model.carrier" as const,
    term,
    id: input.id,
    tier: input.tier,
    agent,
    utterances: Object.freeze(utterances),
  });
}

// ---------- the known openai models ----------

/** The openai models the Codex CLI runs and their formality tiers. gpt-5-codex
 *  is the coding-tuned flagship and is Codex's default; it joins gpt-5 at F0. */
export const OPENAI_MODELS: readonly OpenaiModelInput[] = Object.freeze([
  Object.freeze({ id: "gpt-5-codex", tier: "F0" satisfies ModelTier }),
  Object.freeze({ id: "gpt-5", tier: "F0" satisfies ModelTier }),
  Object.freeze({ id: "gpt-5-mini", tier: "F1" satisfies ModelTier }),
  Object.freeze({ id: "gpt-5-nano", tier: "F2" satisfies ModelTier }),
]);

/** Each known openai model as a carrier. */
export function openaiModels(): readonly OpenaiModelCarrier[] {
  return Object.freeze(OPENAI_MODELS.map(openaiModel));
}

// ---------- topology settlement ----------

/**
 * A meme-topology carrier branded as the openai-topology node: a
 * fixed-point readings and settlement from openai model utterances.
 */
export interface OpenaiTopologyCarrier {
  readonly kind: "openai.topology.carrier";
  readonly utterances: readonly UtteranceCarrier[];
  readonly settlement: SettlementFiltration;
  readonly fixedPointReadings: MemeTopologyFixedPointReadings;
  readonly _openaiTopologyBrand: never;
}

export const OpenaiTopologyCarrierSchema = { "$id": "organizing/openai/codex/openai-topology/topology", "title": "CodexOpenaiTopologyCarrier", "additionalProperties": false, type: "object", required: ["kind", "utterances", "settlement", "fixedPointReadings"], properties: { "kind": { const: "openai.topology.carrier" }, "utterances": { type: "array", items: {} }, "settlement": {}, "fixedPointReadings": {} } } as const;

export const openaiTopologyCarrier = carrierFrom(OpenaiTopologyCarrierSchema);

export const canonicalizeOpenaiModelInputAction = action({
  verb: "organizing.openai.codex.openai-topology.canonicalize-model-input",
  description: "Canonicalize a Codex OpenAI model input carrier.",
  domain: openaiModelInputCarrier,
  codomain: openaiModelInputCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeOpenaiModelAction = action({
  verb: "organizing.openai.codex.openai-topology.canonicalize-model",
  description: "Canonicalize a Codex OpenAI model carrier.",
  domain: openaiModelCarrier,
  codomain: openaiModelCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeOpenaiTopologyAction = action({
  verb: "organizing.openai.codex.openai-topology.canonicalize-topology",
  description: "Canonicalize a Codex OpenAI topology carrier.",
  domain: openaiTopologyCarrier,
  codomain: openaiTopologyCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const openaiTopologyActions = Object.freeze([
  canonicalizeOpenaiModelInputAction,
  canonicalizeOpenaiModelAction,
  canonicalizeOpenaiTopologyAction,
]);

/**
 * Settles utterances into an OpenaiTopologyCarrier: delegates to the base induce
 * and brands the result as the openai-topology node.
 */
export function induceOpenaiTopology(
  utterances: readonly UtteranceCarrier[],
): OpenaiTopologyCarrier {
  const log = Object.freeze([...utterances]);
  return Object.freeze({
    kind: "openai.topology.carrier" as const,
    utterances: log,
    settlement: settleUtterances(log),
    fixedPointReadings: fixedPointReadingsOfUtterances(log),
  }) as OpenaiTopologyCarrier;
}

/**
 * Extends an existing OpenaiTopologyCarrier with delta utterances: delegates to
 * the base extend and re-brands the result as the openai-topology node.
 */
export function extendOpenaiTopology(
  carrier: OpenaiTopologyCarrier,
  delta: readonly UtteranceCarrier[],
): OpenaiTopologyCarrier {
  return induceOpenaiTopology([...carrier.utterances, ...delta]);
}

/** Settle a single model's coordinates into a topology carrier. */
export function induceModelTopology(m: OpenaiModelCarrier): OpenaiTopologyCarrier {
  return induceOpenaiTopology(m.utterances);
}

/** Settle all known openai models into one topology carrier. */
export function induceOpenaiModelsTopology(): OpenaiTopologyCarrier {
  return induceOpenaiTopology(openaiModels().flatMap((m) => m.utterances));
}
