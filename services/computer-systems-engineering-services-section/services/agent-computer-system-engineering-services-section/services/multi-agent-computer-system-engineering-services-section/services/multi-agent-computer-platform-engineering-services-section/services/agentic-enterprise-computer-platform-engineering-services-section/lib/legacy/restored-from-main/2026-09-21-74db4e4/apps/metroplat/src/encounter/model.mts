import { assertNonemptyString as nonempty } from "../lib/strings.mts";
/** Canonical material for externally driven computations with an observable causal interior. */
import { requireJsonValue, type JsonRecord, type JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { contentAddress } from "../lib/identity/index.mts";

export type EncounterDisposition = "completed" | "obstructed" | "cancelled";

export interface Encounter {
  readonly kind: "metroplat.encounter";
  readonly id: string;
  /** Domain class, for example `inference`, `proof-search`, or `process`. */
  readonly encounterClass: string;
  /** Content reference of the semantic input governed by this encounter. */
  readonly subject: string;
  /** Non-identity material for human and domain readings. */
  readonly metadata?: JsonRecord;
}

export interface EncounterRun {
  readonly kind: "metroplat.encounter.run";
  readonly id: string;
  readonly encounter: string;
  readonly invocation: string;
  readonly operation: string;
  readonly request: string;
  readonly retryOf?: string;
  readonly openedAt: string;
  readonly causes: readonly string[];
}

export interface EncounterMove {
  readonly kind: "metroplat.encounter.move";
  readonly id: string;
  readonly run: string;
  /** Domain-owned contribution name. The encounter substrate does not interpret it. */
  readonly type: string;
  /** Producer-local channel; independent channels may advance concurrently. */
  readonly channel: string;
  /** Non-negative, channel-local position used to distinguish repeated equal bodies. */
  readonly sequence: number;
  readonly body: JsonValue;
  /** Canonical move or terminal ids, resolved to journal causes by the witness. */
  readonly predecessors: readonly string[];
  /** External durable evidence, distinct from in-section semantic predecessors. */
  readonly causes: readonly string[];
  readonly observedAt: string;
}

export interface EncounterTerminal {
  readonly kind: "metroplat.encounter.terminal";
  readonly id: string;
  readonly run: string;
  /** Domain-owned terminal claim name. */
  readonly type: string;
  readonly disposition: EncounterDisposition;
  /** Domain-defined semantic claim used for identity and contradiction comparison. */
  readonly claim: JsonValue;
  /** Lossless admitted material carried for downstream readings. */
  readonly value: JsonValue;
  readonly predecessors: readonly string[];
  readonly causes: readonly string[];
  readonly observedAt: string;
}

export type EncounterContribution = EncounterMove | EncounterTerminal;

export interface EncounterDraft {
  readonly encounterClass: string;
  readonly subject: string;
  readonly metadata?: JsonRecord;
}

export interface EncounterRunDraft extends Omit<EncounterRun, "kind" | "id" | "causes"> {
  readonly causes?: readonly string[];
}

export interface EncounterMoveDraft extends Omit<EncounterMove, "kind" | "id" | "predecessors" | "causes"> {
  readonly predecessors?: readonly string[];
  readonly causes?: readonly string[];
}

export interface EncounterTerminalDraft extends Omit<EncounterTerminal, "kind" | "id" | "claim" | "predecessors" | "causes"> {
  readonly claim?: JsonValue;
  readonly predecessors?: readonly string[];
  readonly causes?: readonly string[];
}


function causalIds(values: readonly string[] | undefined, label: string): readonly string[] {
  return Object.freeze([...new Set((values ?? []).map((value) => nonempty(value, label)))].sort());
}

function channelSequence(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("encounter move sequence: expected a non-negative safe integer");
  }
  return value;
}

/** Name one semantic encounter independently of any execution attempt or transport. */
export function encounter(draft: EncounterDraft): Encounter {
  const identity = Object.freeze({
    kind: "metroplat.encounter-identity" as const,
    encounterClass: nonempty(draft.encounterClass, "encounter class"),
    subject: nonempty(draft.subject, "encounter subject"),
  });
  return Object.freeze({
    kind: "metroplat.encounter" as const,
    id: contentAddress(identity as unknown as JsonValue),
    encounterClass: identity.encounterClass,
    subject: identity.subject,
    ...(draft.metadata === undefined ? {} : {
      metadata: requireJsonValue(draft.metadata, "encounter metadata") as JsonRecord,
    }),
  });
}

/** Name one governed execution. Observation time and causal placement do not alter its identity. */
export function encounterRun(draft: EncounterRunDraft): EncounterRun {
  const identity = Object.freeze({
    kind: "metroplat.encounter.run-identity" as const,
    encounter: nonempty(draft.encounter, "encounter run encounter"),
    invocation: nonempty(draft.invocation, "encounter run invocation"),
    operation: nonempty(draft.operation, "encounter run operation"),
    request: nonempty(draft.request, "encounter run request"),
    ...(draft.retryOf === undefined ? {} : { retryOf: nonempty(draft.retryOf, "encounter run retryOf") }),
  });
  return Object.freeze({
    kind: "metroplat.encounter.run" as const,
    id: contentAddress(identity as unknown as JsonValue),
    encounter: identity.encounter,
    invocation: identity.invocation,
    operation: identity.operation,
    request: identity.request,
    ...(identity.retryOf === undefined ? {} : { retryOf: identity.retryOf }),
    openedAt: nonempty(draft.openedAt, "encounter run openedAt"),
    causes: causalIds(draft.causes, "encounter run cause"),
  });
}

/** Seal one non-terminal contribution. Equal bodies at different channel positions stay distinct. */
export function encounterMove(draft: EncounterMoveDraft): EncounterMove {
  const body = requireJsonValue(draft.body, "encounter move body");
  const predecessors = causalIds(draft.predecessors, "encounter move predecessor");
  const causes = causalIds(draft.causes, "encounter move cause");
  const identity = Object.freeze({
    kind: "metroplat.encounter.move-identity" as const,
    run: nonempty(draft.run, "encounter move run"),
    type: nonempty(draft.type, "encounter move type"),
    channel: nonempty(draft.channel, "encounter move channel"),
    sequence: channelSequence(draft.sequence),
    body,
    predecessors,
    causes,
  });
  return Object.freeze({
    kind: "metroplat.encounter.move" as const,
    id: contentAddress(identity as unknown as JsonValue),
    run: identity.run,
    type: identity.type,
    channel: identity.channel,
    sequence: identity.sequence,
    body,
    predecessors,
    causes,
    observedAt: nonempty(draft.observedAt, "encounter move observedAt"),
  });
}

/** Seal a terminal claim. Terminality remains evidence and does not mutate the run. */
export function encounterTerminal(draft: EncounterTerminalDraft): EncounterTerminal {
  const value = requireJsonValue(draft.value, "encounter terminal value");
  const claim = draft.claim === undefined
    ? value
    : requireJsonValue(draft.claim, "encounter terminal claim");
  const predecessors = causalIds(draft.predecessors, "encounter terminal predecessor");
  const causes = causalIds(draft.causes, "encounter terminal cause");
  const identity = Object.freeze({
    kind: "metroplat.encounter.terminal-identity" as const,
    run: nonempty(draft.run, "encounter terminal run"),
    type: nonempty(draft.type, "encounter terminal type"),
    disposition: draft.disposition,
    claim,
    predecessors,
    causes,
  });
  return Object.freeze({
    kind: "metroplat.encounter.terminal" as const,
    id: contentAddress(identity as unknown as JsonValue),
    run: identity.run,
    type: identity.type,
    disposition: identity.disposition,
    claim,
    value,
    predecessors,
    causes,
    observedAt: nonempty(draft.observedAt, "encounter terminal observedAt"),
  });
}

export function isEncounterContribution(value: unknown): value is EncounterContribution {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as { readonly kind?: unknown }).kind;
  return kind === "metroplat.encounter.move" || kind === "metroplat.encounter.terminal";
}
