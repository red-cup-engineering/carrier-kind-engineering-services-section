/**
 * captp holds pure Capability Transport Protocol reads over capability views, causal cuts, sessions, and vat tables.
 * It may import values, schema, records, logic, fixpoint, math, codecs, and sibling capability modules, but it must not import contracts, rendering, search, runtime, integrations, interfaces, or apps.
 */
import { requireJsonValue, type JsonValue } from "../../codecs/json/core.mts";
import { canonicalBytes } from "../../identity/index.mts";
import { causalHeightStrata, type CausalLink, type CausalSet } from "../../math/order/causal.mts";
import { hasBoolPolarization } from "../../math/order/causal-polarization.mts";
import type { EAVT } from "../../codecs/json/jsonl/eavt/index.mts";
import { schemaFrom } from "../../schema/contract.mts";
import type { FromSchema } from "../../schema/contract.mts";
import {
  captpAuthorityGraphSchema,
  captpBlockedDeliverySchema,
  captpCausalCutSchema,
  captpCausalEventSchema,
  captpCausalFrontierSchema,
  captpCompressionSchema,
  captpDescriptorSchema,
  captpDeliverySchema,
  captpHandoffTableSchema,
  captpPipelineJudgmentSchema,
  captpSessionTranscriptSchema,
  captpSturdyRefSchema,
  captpTransportProjectionSchema,
  captpTurnEventSchema,
  captpTurnTraceSchema,
  captpVatTableSchema,
  captpVectorClockSchema,
  captpStatementRowSchema,
} from "./schema.mts";
import {
  capabilityView,
  capabilityViewContract,
  capabilityViewFromObjectCapability,
  invokeCapabilityView,
  type CapabilityInteraction,
  type CapabilityView,
  type ObjectCapability,
} from "../index.mts";
import { macaroonTokenContract, type MacaroonToken } from "../macaroons/index.mts";

export { capabilityViewContract, captpDeliverySchema, captpSturdyRefSchema };

export const captpAuthorityGraphContract = schemaFrom(captpAuthorityGraphSchema);
export const captpCausalCutContract = schemaFrom(captpCausalCutSchema);
export const captpCausalFrontierContract = schemaFrom(captpCausalFrontierSchema);
export const captpDescriptorContract = schemaFrom(captpDescriptorSchema);
export const captpDeliveryContract = schemaFrom(captpDeliverySchema);
export const captpHandoffTableContract = schemaFrom(captpHandoffTableSchema);
export const captpPipelineJudgmentContract = schemaFrom(captpPipelineJudgmentSchema);
export const captpSessionTranscriptContract = schemaFrom(captpSessionTranscriptSchema);
export const captpSturdyRefContract = schemaFrom(captpSturdyRefSchema);
export const captpTransportProjectionContract = schemaFrom(captpTransportProjectionSchema);
export const captpTurnTraceContract = schemaFrom(captpTurnTraceSchema);
export const captpVatTableContract = schemaFrom(captpVatTableSchema);
export const captpStatementRowContract = schemaFrom(captpStatementRowSchema);

function nonempty(value: string, label: string): string {
  if (value.trim().length === 0) throw new TypeError(`${label}: expected a non-empty string`);
  return value;
}

function unique(values: readonly string[], label: string): readonly string[] {
  const out: string[] = [];
  for (const value of values) {
    const normalized = nonempty(value, label);
    if (!out.includes(normalized)) out.push(normalized);
  }
  if (out.length === 0) throw new TypeError(`${label}: expected at least one value`);
  return Object.freeze(out);
}

let CAPTP_PROMISE_SEQ = 0;
function freshPromise(): string {
  CAPTP_PROMISE_SEQ += 1;
  return `p:${CAPTP_PROMISE_SEQ}`;
}

export type CapTpSturdyRef = FromSchema<typeof captpSturdyRefSchema>;

export type CapTpDelivery = Omit<FromSchema<typeof captpDeliverySchema>, "args"> & {
  readonly args: readonly JsonValue[];
};

export type CapTpPipelineJudgment = Omit<FromSchema<typeof captpPipelineJudgmentSchema>, "prior" | "follow" | "sequential"> & {
  readonly prior: CapTpDelivery;
  readonly follow: CapTpDelivery;
  readonly sequential: CapTpDelivery;
};

export type CapTpBlockedDelivery = Omit<FromSchema<typeof captpBlockedDeliverySchema>, "delivery"> & {
  readonly delivery: CapTpDelivery;
};

export type CapTpCompression = FromSchema<typeof captpCompressionSchema>;

export type CapTpAuthorityGraph = Omit<FromSchema<typeof captpAuthorityGraphSchema>, "refs" | "deliveries" | "blocked" | "compression"> & {
  readonly refs: readonly CapTpSturdyRef[];
  readonly deliveries: readonly CapTpDelivery[];
  readonly blocked: readonly CapTpBlockedDelivery[];
  readonly compression: CapTpCompression;
};

export type CapTpTurnEvent = Omit<FromSchema<typeof captpTurnEventSchema>, "delivery"> & {
  readonly delivery: CapTpDelivery;
};

export type CapTpTurnTrace = Omit<FromSchema<typeof captpTurnTraceSchema>, "events" | "compression"> & {
  readonly events: readonly CapTpTurnEvent[];
  readonly compression: CapTpCompression;
};

export type CapTpStatementValue = JsonValue;

export type CapTpStatementRow = Omit<FromSchema<typeof captpStatementRowSchema>, "object"> & {
  readonly object: CapTpStatementValue;
};

/** `captpVectorClockSchema` has no `properties` (it's an `additionalProperties`-typed
 *  map), so `FromSchema` gives it no field-level information to derive here — the
 *  hand-written map type IS the precise reading, not a second authored fact. */
export type CapTpVectorClock = Readonly<Record<string, number>>;
export type CapTpCausality = "before" | "after" | "concurrent" | "equal";

export type CapTpCausalTurnEvent = Omit<FromSchema<typeof captpCausalEventSchema>, "clock" | "delivery"> & {
  readonly clock: CapTpVectorClock;
  readonly delivery: CapTpDelivery;
};

export type CapTpCausalFrontier = Omit<FromSchema<typeof captpCausalFrontierSchema>, "events" | "frontier"> & {
  readonly events: readonly CapTpCausalTurnEvent[];
  readonly frontier: CapTpVectorClock;
};

export type CapTpCausalCutViolation = FromSchema<typeof captpCausalCutSchema>["violations"][number];

export type CapTpCausalCut = Omit<FromSchema<typeof captpCausalCutSchema>, "clock" | "violations"> & {
  readonly clock: CapTpVectorClock;
  readonly violations: readonly CapTpCausalCutViolation[];
};

export type CapTpVatPresence = Omit<FromSchema<typeof captpVatTableSchema>["presences"][number], "ref"> & {
  readonly ref?: CapTpSturdyRef;
};

export type CapTpVatTable = Omit<FromSchema<typeof captpVatTableSchema>, "presences"> & {
  readonly presences: readonly CapTpVatPresence[];
};

export type CapTpHandoffGift = Omit<FromSchema<typeof captpHandoffTableSchema>["gifts"][number], "ref"> & {
  readonly ref: CapTpSturdyRef;
};

export type CapTpHandoffTable = Omit<FromSchema<typeof captpHandoffTableSchema>, "gifts"> & {
  readonly gifts: readonly CapTpHandoffGift[];
};

export type CapTpDescriptor = Omit<FromSchema<typeof captpDescriptorSchema>, "value"> & {
  readonly value?: JsonValue;
};

export type CapTpTranscriptBlockedOperation = Omit<FromSchema<typeof captpSessionTranscriptSchema>["blocked"][number], "operation"> & {
  readonly operation: JsonValue;
};

export type CapTpSessionTranscript = Omit<FromSchema<typeof captpSessionTranscriptSchema>, "operations" | "blocked" | "counters"> & {
  readonly operations: readonly JsonValue[];
  readonly blocked: readonly CapTpTranscriptBlockedOperation[];
  readonly counters: CapTpVectorClock;
};

export type CapTpTransportStream = Omit<FromSchema<typeof captpTransportProjectionSchema>["streams"][number], "delivery"> & {
  readonly delivery: CapTpDelivery;
};

export type CapTpTransportPubsub = Omit<FromSchema<typeof captpTransportProjectionSchema>["pubsub"][number], "delivery"> & {
  readonly delivery?: CapTpDelivery;
};

export type CapTpTransportProjection = Omit<FromSchema<typeof captpTransportProjectionSchema>, "streams" | "pubsub"> & {
  readonly streams: readonly CapTpTransportStream[];
  readonly pubsub: readonly CapTpTransportPubsub[];
};

export type PipelineNodeKind = "ref" | "promise";
export type PipelineEdgeKind = "captp.delivery" | "captp.promise-cut";
export type CapTpTurnEventStatus = CapTpTurnEvent["status"];
export type CapTpCausalCutStatus = CapTpCausalCut["status"];
export type CapTpBaCausalEventStatus = CapTpBaCausalEvent["status"];
export type CapTpCutPromiseStateStatus = CapTpCutPromiseState["status"];
export type CapTpCutQuiescenceStatus = CapTpCutQuiescence["status"];
export type CapTpInvocationResultStatus = CapTpInvocationResult["status"];
export type CapTpPromiseRetirementStatus = CapTpPromiseRetirementItem["status"];
export type VatPresenceKind = CapTpVatPresence["presenceKind"];
export type VatPresenceStatus = CapTpVatPresence["status"];
export type CapTpExportStatus = CapTpVatPresence["status"];
export type HandoffGiftStatus = CapTpHandoffGift["status"];
export type HandoffClaimStatus = "claimed" | "blocked";
export type ReferenceJoinStatus = ReferenceJoin["status"];
export type CapTpVersion = "1.0";
export type CapTpSessionStatus = CapTpSessionTranscript["status"] | "starting";
export type CapTpCrossedHelloWinner = CapTpCrossedHelloResolution["winner"];
export type CapTpAnswerSlotStatus = "live" | "dropped" | "blocked";
export type CapTpTranscriptStatus = CapTpSessionTranscript["status"];
export type CapTpTranscriptCommitChain = readonly CapTpStatementRow[];
export type CapTpPromiseTraceStatus = "listening" | "fulfilled" | "broken";
export type CapTpProjectionSelectorKind = "field" | "index" | "tag";

export interface AuthorityBa {
  readonly kind: "captp.authority-ba";
  readonly holder: string;
  readonly place: string;
  readonly heldRefs: readonly CapTpSturdyRef[];
  readonly reachablePromises: readonly string[];
}

export interface CapTpBaCausalEvent {
  readonly kind: "captp.ba-causal-event";
  readonly event: CapTpCausalTurnEvent;
  readonly status: "situated" | "outside";
  readonly reason?: string;
}

export interface CapTpBaCausalFrame {
  readonly kind: "captp.ba-causal-frame";
  readonly holder: string;
  readonly place: string;
  readonly events: readonly CapTpBaCausalEvent[];
  readonly observed: readonly CapTpCausalTurnEvent[];
  readonly outside: readonly CapTpCausalTurnEvent[];
  readonly clock: CapTpVectorClock;
  readonly frontier: CapTpVectorClock;
}

export interface CapTpConcurrentTraceLayer {
  readonly kind: "captp.concurrent-trace-layer";
  readonly index: number;
  readonly events: readonly CapTpCausalTurnEvent[];
  readonly clock: CapTpVectorClock;
}

export interface CapTpConcurrentTrace {
  readonly kind: "captp.concurrent-trace";
  readonly layers: readonly CapTpConcurrentTraceLayer[];
  readonly frontier: CapTpVectorClock;
  readonly width: number;
  readonly depth: number;
}

export interface CapTpCutPromiseState {
  readonly kind: "captp.cut-promise-state";
  readonly id: string;
  readonly event?: CapTpCausalTurnEvent;
  readonly presence?: CapTpVatPresence;
  readonly status: "pending" | "resolved" | "failed" | "released" | "blocked" | "missing";
  readonly reason?: string;
}

export interface CapTpCutQuiescence {
  readonly kind: "captp.cut-quiescence";
  readonly status: "quiescent" | "active" | "inconsistent";
  readonly cut: CapTpCausalCut;
  readonly vat: CapTpVatTable;
  readonly promises: readonly CapTpCutPromiseState[];
  readonly pending: readonly CapTpCutPromiseState[];
  readonly terminal: readonly CapTpCutPromiseState[];
}

export interface CapTpInvocationDebt {
  readonly kind: "captp.invocation-debt";
  readonly id: string;
  readonly parent?: string;
  readonly descendants: readonly string[];
  readonly reason: string;
}

export interface CapTpInvocationResult {
  readonly kind: "captp.invocation-settlement";
  readonly status: "terminated" | "active" | "failed" | "inconsistent";
  readonly root?: string;
  readonly cut: CapTpCausalCut;
  readonly vat: CapTpVatTable;
  readonly quiescence: CapTpCutQuiescence;
  readonly debts: readonly CapTpInvocationDebt[];
  readonly failed: readonly CapTpCutPromiseState[];
  readonly terminal: readonly CapTpCutPromiseState[];
}

export interface CapTpPromiseRetirementItem {
  readonly kind: "captp.promise-retirement-item";
  readonly id: string;
  readonly status: "retirable" | "retained";
  readonly presence?: CapTpVatPresence;
  readonly descendants: readonly string[];
  readonly blockers: readonly string[];
}

export interface CapTpPromiseRetirementCertificate {
  readonly kind: "captp.promise-retirement-certificate";
  readonly status: "retirable" | "retained";
  readonly settlement: CapTpInvocationResult;
  readonly items: readonly CapTpPromiseRetirementItem[];
  readonly retirable: readonly CapTpPromiseRetirementItem[];
  readonly retained: readonly CapTpPromiseRetirementItem[];
}

export interface ReferenceJoinCandidate {
  readonly ref: CapTpSturdyRef;
  readonly descriptor?: CapTpDescriptor;
  readonly via?: string;
}

export interface ReferenceJoin {
  readonly kind: "captp.reference-join";
  readonly status: "joined" | "blocked";
  readonly locus?: string;
  readonly candidates: readonly ReferenceJoinCandidate[];
  readonly joinedRefs: readonly string[];
  readonly reason?: string;
}

export interface CapTpCrossedHelloResolution {
  readonly kind: "captp.crossed-hello-resolution";
  readonly winner: "local" | "remote" | "tie";
  readonly kept: CapTpSessionTranscript;
  readonly dropped: CapTpSessionTranscript;
  readonly localPublicIdentifier: string;
  readonly remotePublicIdentifier: string;
  readonly reason: string;
}

/** Project an OCap view onto a CapTP/OCapN sturdy reference. */
export function sturdyRefFromCapabilityView(view: CapabilityView): CapTpSturdyRef {
  const admitted = capabilityViewContract.assert(view, "CapTP sturdy ref capability view") as CapabilityView;
  return captpSturdyRefContract.assert(Object.freeze({
    kind: "captp.sturdy-ref" as const,
    id: admitted.id,
    locus: admitted.grants,
    holder: admitted.holder,
  }), "CapTP sturdy ref") as CapTpSturdyRef;
}

/** Project a current object-capability contract onto a CapTP sturdy reference. */
export function sturdyRefFromObjectCapability(capability: ObjectCapability, action?: string): CapTpSturdyRef {
  return sturdyRefFromCapabilityView(capabilityViewFromObjectCapability(capability, action));
}

/** Old CapTP `refOf` name, realized as a sturdy ref projected from a capability view. */
export function refOf(capability: CapabilityView): CapTpSturdyRef {
  return sturdyRefFromCapabilityView(capability);
}

/** Old CapTP `refOfMacaroon` name, realized through the macaroon's carried capability view. */
export function refOfMacaroon(token: MacaroonToken): CapTpSturdyRef {
  const admitted = macaroonTokenContract.assert(token, "CapTP ref of macaroon") as MacaroonToken;
  return sturdyRefFromCapabilityView(admitted.capability);
}

/** A root CapTP delivery to a sturdy reference. */
export function captpDeliver(target: CapTpSturdyRef, method: string, args: readonly JsonValue[] = [], answer?: string): CapTpDelivery {
  const ref = captpSturdyRefContract.assert(target, "CapTP delivery target") as CapTpSturdyRef;
  return captpDeliveryContract.assert(Object.freeze({
    kind: "captp.delivery" as const,
    target: ref.id,
    method: nonempty(method, "CapTP delivery method"),
    args: Object.freeze(args.map((arg) => requireJsonValue(arg, "CapTP delivery argument"))),
    answer: answer ?? freshPromise(),
  }), "CapTP delivery") as CapTpDelivery;
}

/** CapTP promise pipelining: deliver to a prior delivery's unresolved answer. */
export function captpPipeline(prior: CapTpDelivery, method: string, args: readonly JsonValue[] = [], answer?: string): CapTpDelivery {
  const admitted = captpDeliveryContract.assert(prior, "CapTP pipeline prior") as CapTpDelivery;
  return captpDeliveryContract.assert(Object.freeze({
    kind: "captp.delivery" as const,
    target: admitted.answer,
    method: nonempty(method, "CapTP pipeline method"),
    args: Object.freeze(args.map((arg) => requireJsonValue(arg, "CapTP pipeline argument"))),
    answer: answer ?? freshPromise(),
    pipelinedOn: admitted.answer,
  }), "CapTP pipelined delivery") as CapTpDelivery;
}

/** The two-step delivery that waits for the prior answer before targeting it. */
export function captpSequentialFollow(prior: CapTpDelivery, follow: CapTpDelivery): CapTpDelivery {
  const p = captpDeliveryContract.assert(prior, "CapTP sequential prior") as CapTpDelivery;
  const f = captpDeliveryContract.assert(follow, "CapTP sequential follow") as CapTpDelivery;
  return captpDeliveryContract.assert(Object.freeze({
    kind: "captp.delivery" as const,
    target: p.answer,
    method: f.method,
    args: f.args,
    answer: f.answer,
  }), "CapTP sequential delivery") as CapTpDelivery;
}

/** Witness that a pipelined delivery composes to the same visible follow as the sequential cut. */
export function captpPipelineSequentialCutLaw(prior: CapTpDelivery, follow: CapTpDelivery): CapTpPipelineJudgment {
  const p = captpDeliveryContract.assert(prior, "CapTP pipeline law prior") as CapTpDelivery;
  const f = captpDeliveryContract.assert(follow, "CapTP pipeline law follow") as CapTpDelivery;
  const sequential = captpSequentialFollow(p, f);
  const reasons: string[] = [];
  if (f.pipelinedOn !== p.answer) reasons.push("follow-on delivery is not linked to the prior promise");
  if (f.target !== p.answer) reasons.push("follow-on target is not the prior answer promise");
  if (f.method !== sequential.method) reasons.push("pipelined and sequential methods differ");
  if (canonicalBytes(f.args as unknown as JsonValue) !== canonicalBytes(sequential.args as unknown as JsonValue)) {
    reasons.push("pipelined and sequential arguments differ");
  }
  const ok = reasons.length === 0;
  return captpPipelineJudgmentContract.assert(Object.freeze({
    kind: ok ? "captp.pipeline:witness" as const : "captp.pipeline-obstruction" as const,
    prior: p,
    follow: f,
    sequential,
    ok,
    reasons: Object.freeze(reasons),
    savedRoundTrips: ok ? 1 : 0,
  }), "CapTP pipeline judgment") as CapTpPipelineJudgment;
}

/** Older CapTP result design reading, carried as a stable answer descriptor. */
export function resultDesign(delivery: CapTpDelivery): CapTpDescriptor {
  const admitted = captpDeliveryContract.assert(delivery, "CapTP result design delivery") as CapTpDelivery;
  return captpDescriptor({
    descriptorKind: "answer",
    id: admitted.answer,
    value: admitted as unknown as JsonValue,
  });
}

/** Older CapTP follow-on design reading, carried as the target promise descriptor. */
export function followOnDesign(delivery: CapTpDelivery): CapTpDescriptor {
  const admitted = captpDeliveryContract.assert(delivery, "CapTP follow-on design delivery") as CapTpDelivery;
  return captpDescriptor({
    descriptorKind: "answer",
    id: admitted.pipelinedOn ?? admitted.answer,
    value: admitted as unknown as JsonValue,
  });
}

/** Older composePipeline surface, now the pipelined delivery plus its law witness. */
export function composePipeline(prior: CapTpDelivery, follow: CapTpDelivery): JsonValue {
  return Object.freeze({
    kind: "captp.pipeline-composition",
    prior: captpDeliveryContract.assert(prior, "CapTP composed prior") as unknown as JsonValue,
    follow: captpDeliveryContract.assert(follow, "CapTP composed follow") as unknown as JsonValue,
    judgment: captpPipelineSequentialCutLaw(prior, follow) as unknown as JsonValue,
  });
}

/** Older composeSequentialCut surface, now the post-resolution delivery plus its law witness. */
export function composeSequentialCut(prior: CapTpDelivery, follow: CapTpDelivery): JsonValue {
  const sequential = captpSequentialFollow(prior, follow);
  return Object.freeze({
    kind: "captp.sequential-cut",
    prior: captpDeliveryContract.assert(prior, "CapTP sequential cut prior") as unknown as JsonValue,
    follow: captpDeliveryContract.assert(follow, "CapTP sequential cut follow") as unknown as JsonValue,
    sequential: sequential as unknown as JsonValue,
    judgment: captpPipelineSequentialCutLaw(prior, follow) as unknown as JsonValue,
  });
}

function captpGraphRead(
  refs: readonly CapTpSturdyRef[],
  deliveries: readonly CapTpDelivery[],
  heldLoci: readonly string[],
): {
  readonly reachablePromises: readonly string[];
  readonly blocked: readonly CapTpBlockedDelivery[];
  readonly depthByAnswer: ReadonlyMap<string, number>;
  readonly statusByAnswer: ReadonlyMap<string, "admitted" | "composed" | "blocked">;
} {
  const admittedRefs = refs.map((ref) => captpSturdyRefContract.assert(ref, "CapTP authority graph ref") as CapTpSturdyRef);
  const admittedDeliveries = deliveries.map((delivery) => captpDeliveryContract.assert(delivery, "CapTP authority graph delivery") as CapTpDelivery);
  const held = new Set(heldLoci.map((locus) => nonempty(locus, "held CapTP locus")));
  const refById = new Map(admittedRefs.map((ref) => [ref.id, ref]));
  const reachable = new Set<string>();
  const depthByAnswer = new Map<string, number>();
  const statusByAnswer = new Map<string, "admitted" | "composed" | "blocked">();
  const blocked: CapTpBlockedDelivery[] = [];

  for (const delivery of admittedDeliveries) {
    const ref = refById.get(delivery.target);
    if (ref !== undefined) {
      if (!held.has(ref.locus)) {
        blocked.push(Object.freeze({ delivery, reason: `sturdy reference locus ${ref.locus} is not held` }));
        statusByAnswer.set(delivery.answer, "blocked");
        continue;
      }
      reachable.add(delivery.answer);
      depthByAnswer.set(delivery.answer, 1);
      statusByAnswer.set(delivery.answer, "admitted");
      continue;
    }

    if (delivery.pipelinedOn === undefined) {
      blocked.push(Object.freeze({ delivery, reason: "delivery target is neither a held sturdy reference nor an explicit promise pipeline" }));
      statusByAnswer.set(delivery.answer, "blocked");
      continue;
    }
    if (delivery.target !== delivery.pipelinedOn) {
      blocked.push(Object.freeze({ delivery, reason: "pipelined delivery target must equal pipelinedOn promise" }));
      statusByAnswer.set(delivery.answer, "blocked");
      continue;
    }
    if (!reachable.has(delivery.pipelinedOn)) {
      blocked.push(Object.freeze({ delivery, reason: `promise ${delivery.pipelinedOn} is not reachable from held authority` }));
      statusByAnswer.set(delivery.answer, "blocked");
      continue;
    }

    reachable.add(delivery.answer);
    depthByAnswer.set(delivery.answer, (depthByAnswer.get(delivery.pipelinedOn) ?? 0) + 1);
    statusByAnswer.set(delivery.answer, "composed");
  }

  return Object.freeze({
    reachablePromises: Object.freeze([...reachable]),
    blocked: Object.freeze(blocked),
    depthByAnswer,
    statusByAnswer,
  });
}

/** Recover the old CapTP authority graph as a package object over sturdy refs and deliveries. */
export function captpAuthorityGraph(
  refs: readonly CapTpSturdyRef[],
  deliveries: readonly CapTpDelivery[],
  heldLoci: readonly string[] = refs.map((ref) => ref.locus),
): CapTpAuthorityGraph {
  const admittedRefs = refs.map((ref) => captpSturdyRefContract.assert(ref, "CapTP authority graph ref") as CapTpSturdyRef);
  const admittedDeliveries = deliveries.map((delivery) => captpDeliveryContract.assert(delivery, "CapTP authority graph delivery") as CapTpDelivery);
  const read = captpGraphRead(admittedRefs, admittedDeliveries, heldLoci);
  const sequentialRoundTrips = Math.max(0, ...read.depthByAnswer.values());
  const pipelinedRoundTrips = read.reachablePromises.length === 0 ? 0 : 1;
  return captpAuthorityGraphContract.assert(Object.freeze({
    kind: "captp.authority-graph" as const,
    refs: Object.freeze(admittedRefs),
    deliveries: Object.freeze(admittedDeliveries),
    reachablePromises: read.reachablePromises,
    blocked: read.blocked,
    compression: Object.freeze({
      sequentialRoundTrips,
      pipelinedRoundTrips,
      savedRoundTrips: Math.max(0, sequentialRoundTrips - pipelinedRoundTrips),
    }),
    polarized: captpAuthorityGraphPolarization(admittedRefs, admittedDeliveries),
  }), "CapTP authority graph") as CapTpAuthorityGraph;
}

/**
 * Read a CapTP authority graph as a causal set (refs and delivery answers are
 * events; a ref's admission and a delivery's `pipelinedOn` link are causal
 * edges) and check whether it admits a proper two-colouring. A graph that
 * fails this is not merely deep or blocked — it contains an odd causal cycle:
 * a promise pipelined back onto its own ancestry through an odd number of
 * hops, which cannot converge no matter how delivery proceeds. This is the
 * real structural law the old "genuine cut" claim gestured at; it augments
 * `captpAuthorityGraph`'s reachability/blocked reading rather than replacing
 * it, and does not change that causal set's shape.
 */
export function captpAuthorityGraphPolarization(
  refs: readonly CapTpSturdyRef[],
  deliveries: readonly CapTpDelivery[],
): boolean {
  const admittedRefs = refs.map((ref) => captpSturdyRefContract.assert(ref, "CapTP polarization ref") as CapTpSturdyRef);
  const admittedDeliveries = deliveries.map((delivery) => captpDeliveryContract.assert(delivery, "CapTP polarization delivery") as CapTpDelivery);
  const events = new Set<string>();
  const links: CausalLink[] = [];
  for (const ref of admittedRefs) events.add(ref.id);
  for (const delivery of admittedDeliveries) {
    events.add(delivery.answer);
    if (delivery.pipelinedOn !== undefined) {
      events.add(delivery.pipelinedOn);
      links.push({ from: delivery.pipelinedOn, to: delivery.answer });
    } else {
      events.add(delivery.target);
      links.push({ from: delivery.target, to: delivery.answer });
    }
  }
  const causalSet: CausalSet = Object.freeze({
    kind: "lorentzian.causalSet" as const,
    events: Object.freeze([...events]),
    links: Object.freeze(links),
  });
  return hasBoolPolarization(causalSet);
}

/** Project a CapTP authority graph into one ba-local turn trace with saved sequential turns exposed. */
export function captpTurnTraceFromAuthorityGraph(input: {
  readonly session: string;
  readonly vat: string;
  readonly ba: string;
  readonly graph: CapTpAuthorityGraph;
}): CapTpTurnTrace {
  const graph = captpAuthorityGraphContract.assert(input.graph, "CapTP turn trace graph") as CapTpAuthorityGraph;
  const blockedByAnswer = new Map(graph.blocked.map((entry) => [entry.delivery.answer, entry.reason]));
  const reachable = new Set(graph.reachablePromises);
  const refIds = new Set(graph.refs.map((ref) => ref.id));
  const depthByAnswer = new Map<string, number>();
  for (const delivery of graph.deliveries) {
    if (blockedByAnswer.has(delivery.answer) || !reachable.has(delivery.answer)) continue;
    if (refIds.has(delivery.target)) {
      depthByAnswer.set(delivery.answer, 1);
      continue;
    }
    const parentDepth = delivery.pipelinedOn === undefined ? undefined : depthByAnswer.get(delivery.pipelinedOn);
    depthByAnswer.set(delivery.answer, (parentDepth ?? 0) + 1);
  }
  const events = graph.deliveries.map((delivery) => {
    const status = blockedByAnswer.has(delivery.answer)
      ? "blocked" as const
      : delivery.pipelinedOn === undefined
        ? "admitted" as const
        : "composed" as const;
    const sequentialTurn = Math.max(0, (depthByAnswer.get(delivery.answer) ?? 1) - 1);
    return Object.freeze({
      delivery,
      turn: 0,
      sequentialTurn,
      savedTurns: status === "blocked" ? 0 : sequentialTurn,
      status,
      ...(status === "blocked" ? { reason: blockedByAnswer.get(delivery.answer) ?? "delivery is blocked" } : {}),
    });
  });
  return captpTurnTraceContract.assert(Object.freeze({
    kind: "captp.turn-trace" as const,
    session: nonempty(input.session, "CapTP session"),
    vat: nonempty(input.vat, "CapTP vat"),
    ba: nonempty(input.ba, "CapTP ba"),
    events: Object.freeze(events),
    compression: graph.compression,
  }), "CapTP turn trace") as CapTpTurnTrace;
}

/** Build one append-only CapTP statement row. */
export function captpStatementRow(
  subject: string,
  predicate: string,
  object: JsonValue,
  at = new Date(0).toISOString(),
): CapTpStatementRow {
  return captpStatementRowContract.assert(Object.freeze({
    kind: "captp.witness-row" as const,
    subject: nonempty(subject, "CapTP witness subject"),
    predicate: nonempty(predicate, "CapTP witness predicate"),
    object: requireJsonValue(object, "CapTP witness object"),
    at: nonempty(at, "CapTP statement coordinate"),
  }), "CapTP statement row") as CapTpStatementRow;
}

export function captpStandingKey(row: CapTpStatementRow): string {
  const admitted = captpStatementRowContract.assert(row, "CapTP standing key row") as CapTpStatementRow;
  return `${admitted.subject}|${admitted.predicate}|${canonicalBytes(admitted.object)}`;
}

/**
 * Bridge a `CapTpStatementRow` (already E/A/V/T-shaped, but a local package type
 * that has never crossed into the statement log) into a real `EAVT` tuple. This is the pure
 * half of witnessing CapTP moves: it does not touch the filesystem or any
 * service; a caller with `dataRoot` access passes the result to
 * `openJournal` (`@red-cup-engineering/metroplat/integrations/filesystem/services/store`)
 * to actually make the move durable and replayable.
 */
export function captpStatementRowToEavt(row: CapTpStatementRow): EAVT {
  const admitted = captpStatementRowContract.assert(row, "CapTP EAVT row") as CapTpStatementRow;
  return [admitted.subject, admitted.predicate, admitted.object, admitted.at];
}

/** Project an authority graph into statement rows for refs, deliveries, blocked cuts, and compression. */
export function captpStatementLog(graph: CapTpAuthorityGraph, at?: string): readonly CapTpStatementRow[] {
  const admitted = captpAuthorityGraphContract.assert(graph, "CapTP witness graph") as CapTpAuthorityGraph;
  return Object.freeze([
    ...admitted.refs.map((ref) => captpStatementRow(ref.id, "captp.ref.locus", ref.locus, at)),
    ...admitted.deliveries.map((delivery) => captpStatementRow(delivery.answer, "captp.delivery", delivery as unknown as JsonValue, at)),
    ...admitted.blocked.map((entry) => captpStatementRow(entry.delivery.answer, "captp.blocked", entry.reason, at)),
    captpStatementRow("captp.compression", "captp.saved-round-trips", admitted.compression as unknown as JsonValue, at),
  ]);
}

/** Project a turn trace into statement rows over the ba-local event sequence. */
export function captpTurnTraceStatementLog(trace: CapTpTurnTrace, at?: string): readonly CapTpStatementRow[] {
  const admitted = captpTurnTraceContract.assert(trace, "CapTP turn trace witness") as CapTpTurnTrace;
  return Object.freeze(admitted.events.map((event, index) => captpStatementRow(
    `${admitted.session}:${admitted.vat}:${index}`,
    `captp.turn.${event.status}`,
    {
      answer: event.delivery.answer,
      turn: event.turn,
      sequentialTurn: event.sequentialTurn,
      savedTurns: event.savedTurns,
      ...(event.reason === undefined ? {} : { reason: event.reason }),
    },
    at,
  )));
}

/** Normalize a CapTP vector clock as finite JSON. */
export function vectorClock(entries: Record<string, number> = {}): CapTpVectorClock {
  const out: Record<string, number> = {};
  for (const [actor, count] of Object.entries(entries)) {
    const admittedActor = nonempty(actor, "CapTP vector-clock actor");
    if (!Number.isFinite(count) || count < 0) throw new TypeError("vectorClock: counts must be non-negative finite numbers");
    if (count > 0) out[admittedActor] = count;
  }
  return Object.freeze(out);
}

export function tickVectorClock(clock: CapTpVectorClock, actor: string): CapTpVectorClock {
  const admittedActor = nonempty(actor, "CapTP vector-clock actor");
  return vectorClock({ ...clock, [admittedActor]: (clock[admittedActor] ?? 0) + 1 });
}

export function mergeVectorClocks(...clocks: readonly CapTpVectorClock[]): CapTpVectorClock {
  const merged: Record<string, number> = {};
  for (const clock of clocks) {
    for (const [actor, count] of Object.entries(clock)) merged[actor] = Math.max(merged[actor] ?? 0, count);
  }
  return vectorClock(merged);
}

export function compareVectorClocks(left: CapTpVectorClock, right: CapTpVectorClock): CapTpCausality {
  const actors = new Set([...Object.keys(left), ...Object.keys(right)]);
  let less = false;
  let greater = false;
  for (const actor of actors) {
    const l = left[actor] ?? 0;
    const r = right[actor] ?? 0;
    if (l < r) less = true;
    if (l > r) greater = true;
  }
  if (!less && !greater) return "equal";
  if (less && !greater) return "before";
  if (!less && greater) return "after";
  return "concurrent";
}

/** Read turn traces as a cross-vat causal frontier. */
export function causalFrontierFromTurnTraces(
  traces: readonly CapTpTurnTrace[],
  session = traces[0]?.session ?? "captp:session",
): CapTpCausalFrontier {
  let frontier = vectorClock();
  const localClocks = new Map<string, CapTpVectorClock>();
  const events: CapTpCausalTurnEvent[] = [];
  for (const trace of traces) {
    const admitted = captpTurnTraceContract.assert(trace, "CapTP causal trace") as CapTpTurnTrace;
    let local = localClocks.get(admitted.vat) ?? vectorClock();
    for (const [index, event] of admitted.events.entries()) {
      local = tickVectorClock(local, admitted.vat);
      frontier = mergeVectorClocks(frontier, local);
      const causalEvent = Object.freeze({
        id: `${admitted.session}:${admitted.vat}:${index}:${event.delivery.answer}`,
        session: admitted.session,
        vat: admitted.vat,
        ba: admitted.ba,
        turn: event.turn,
        clock: local,
        delivery: event.delivery,
        status: event.status,
      });
      events.push(causalEvent);
    }
    localClocks.set(admitted.vat, local);
  }
  return captpCausalFrontierContract.assert(Object.freeze({
    kind: "captp.causal-frontier" as const,
    session: nonempty(session, "CapTP causal frontier session"),
    events: Object.freeze(events),
    frontier,
  }), "CapTP causal frontier") as CapTpCausalFrontier;
}

export function causalFrontierStatementLog(frontier: CapTpCausalFrontier, at?: string): readonly CapTpStatementRow[] {
  const admitted = captpCausalFrontierContract.assert(frontier, "CapTP causal frontier witness") as CapTpCausalFrontier;
  return Object.freeze([
    ...admitted.events.map((event) => captpStatementRow(event.id, `captp.causal.${event.status}`, event.clock as unknown as JsonValue, at)),
    captpStatementRow(`${admitted.session}:frontier`, "captp.causal.frontier", admitted.frontier as unknown as JsonValue, at),
  ]);
}

/** Read held refs and reachable promises as the ba-local authority place. */
export function authorityBa(holder: string, place: string, graph: CapTpAuthorityGraph): AuthorityBa {
  const admitted = captpAuthorityGraphContract.assert(graph, "CapTP authority ba graph") as CapTpAuthorityGraph;
  return Object.freeze({
    kind: "captp.authority-ba" as const,
    holder: nonempty(holder, "CapTP ba holder"),
    place: nonempty(place, "CapTP ba place"),
    heldRefs: admitted.refs,
    reachablePromises: admitted.reachablePromises,
  });
}

function baObservableIds(ba: AuthorityBa): ReadonlySet<string> {
  return new Set([...ba.heldRefs.map((ref) => ref.id), ...ba.reachablePromises]);
}

/** Project a distributed causal frontier through one ba's held refs/promises. */
export function baCausalFrame(ba: AuthorityBa, frontier: CapTpCausalFrontier): CapTpBaCausalFrame {
  const admitted = captpCausalFrontierContract.assert(frontier, "CapTP ba causal frontier") as CapTpCausalFrontier;
  const ids = baObservableIds(ba);
  const events = admitted.events.map((event) => {
    const situated = event.ba === ba.place || ids.has(event.delivery.target) || ids.has(event.delivery.answer);
    return Object.freeze({
      kind: "captp.ba-causal-event" as const,
      event,
      status: situated ? "situated" as const : "outside" as const,
      ...(situated ? {} : { reason: "event is outside this ba's held refs and reachable promises" }),
    });
  });
  const observed = events.filter((event) => event.status === "situated").map((event) => event.event);
  const outside = events.filter((event) => event.status === "outside").map((event) => event.event);
  return Object.freeze({
    kind: "captp.ba-causal-frame" as const,
    holder: ba.holder,
    place: ba.place,
    events: Object.freeze(events),
    observed: Object.freeze(observed),
    outside: Object.freeze(outside),
    clock: mergeVectorClocks(...observed.map((event) => event.clock)),
    frontier: admitted.frontier,
  });
}

export function baCausalFrameStatementLog(frame: CapTpBaCausalFrame, at?: string): readonly CapTpStatementRow[] {
  return Object.freeze(frame.events.map((event) => captpStatementRow(
    `${frame.place}:${event.event.id}`,
    `captp.ba-causal.${event.status}`,
    {
      holder: frame.holder,
      place: frame.place,
      event: event.event.id,
      clock: event.event.clock,
      ...(event.reason === undefined ? {} : { reason: event.reason }),
    } as unknown as JsonValue,
    at,
  )));
}

function eventResources(event: CapTpCausalTurnEvent): ReadonlySet<string> {
  return new Set([event.vat, event.ba, event.delivery.target, event.delivery.answer]);
}

/** CapTP event independence: concurrent/equal vector time and disjoint touched resources. */
export function capTpEventsIndependent(left: CapTpCausalTurnEvent, right: CapTpCausalTurnEvent): boolean {
  const order = compareVectorClocks(left.clock, right.clock);
  if (order !== "concurrent" && order !== "equal") return false;
  const leftResources = eventResources(left);
  for (const resource of eventResources(right)) if (leftResources.has(resource)) return false;
  return true;
}

function concurrentTraceLayer(index: number, events: readonly CapTpCausalTurnEvent[]): CapTpConcurrentTraceLayer {
  return Object.freeze({
    kind: "captp.concurrent-trace-layer" as const,
    index,
    events: Object.freeze([...events]),
    clock: mergeVectorClocks(...events.map((event) => event.clock)),
  });
}

/**
 * Cartier-Foata-style concurrent trace layers over a CapTP causal frontier.
 *
 * Causal layering is the causal-set HEIGHT STRATIFICATION (`core/closure/
 * analysis/causal`'s `causalHeightStrata`) over the vector-clock `before`
 * relation, not a hand-rolled repeated "has this event's prior already been
 * placed" scan — an inconsistent set of vector clocks surfaces as the same
 * closed-timelike-curve obstruction any other causal-set reading in this
 * package would produce, instead of being silently forced into an arbitrary
 * order. Resource independence (Cartier-Foata's actual trace condition,
 * beyond bare causal concurrency) has no causal-set equivalent — it stays a
 * second, CapTP-specific pass that further splits each causally-concurrent
 * tier wherever two events touch the same resource.
 */
export function concurrentTraceFromCausalFrontier(frontier: CapTpCausalFrontier): CapTpConcurrentTrace {
  const admitted = captpCausalFrontierContract.assert(frontier, "CapTP concurrent frontier") as CapTpCausalFrontier;
  const events = admitted.events;
  const byId = new Map(events.map((event) => [event.id, event] as const));
  const links: { readonly from: string; readonly to: string }[] = [];
  for (const left of events) {
    for (const right of events) {
      if (left !== right && compareVectorClocks(left.clock, right.clock) === "before") links.push({ from: left.id, to: right.id });
    }
  }
  const strata = causalHeightStrata(Object.freeze({
    kind: "lorentzian.causalSet" as const,
    events: events.map((event) => event.id),
    links: Object.freeze(links),
  }));
  if (!Array.isArray(strata)) {
    const obstruction = strata as {
      readonly reason: string;
      readonly offending?: { readonly from: string; readonly to: string };
      readonly cycle: readonly string[];
    };
    const location = obstruction.cycle.length > 0
      ? ` cycle ${obstruction.cycle.join(" -> ")}`
      : obstruction.offending === undefined ? "" : ` at ${obstruction.offending.from} -> ${obstruction.offending.to}`;
    throw new TypeError(`concurrentTraceFromCausalFrontier: inconsistent vector clocks (${obstruction.reason}` +
      `${location})`);
  }

  const layers: CapTpConcurrentTraceLayer[] = [];
  for (const tier of strata) {
    let group: CapTpCausalTurnEvent[] = [];
    for (const id of tier) {
      const event = byId.get(id)!;
      if (group.length === 0 || group.every((selected) => capTpEventsIndependent(selected, event))) {
        group.push(event);
        continue;
      }
      layers.push(concurrentTraceLayer(layers.length, group));
      group = [event];
    }
    if (group.length > 0) layers.push(concurrentTraceLayer(layers.length, group));
  }

  return Object.freeze({
    kind: "captp.concurrent-trace" as const,
    layers: Object.freeze(layers),
    frontier: admitted.frontier,
    width: layers.reduce((max, layer) => Math.max(max, layer.events.length), 0),
    depth: layers.length,
  });
}

export function concurrentTraceStatementLog(trace: CapTpConcurrentTrace, at?: string): readonly CapTpStatementRow[] {
  return Object.freeze(trace.layers.flatMap((layer) => layer.events.map((event) => captpStatementRow(
    `captp.concurrent:${layer.index}:${event.id}`,
    "captp.concurrent-trace",
    { layer: layer.index, event: event.id, width: trace.width, depth: trace.depth, clock: event.clock } as unknown as JsonValue,
    at,
  ))));
}

function eventSelectedByClock(event: CapTpCausalTurnEvent, clock: CapTpVectorClock): boolean {
  return compareVectorClocks(event.clock, clock) === "before" || compareVectorClocks(event.clock, clock) === "equal";
}

function causalCutFromSelected(frontier: CapTpCausalFrontier, clock: CapTpVectorClock, selected: readonly CapTpCausalTurnEvent[]): CapTpCausalCut {
  const selectedIds = new Set(selected.map((event) => event.id));
  const byAnswer = new Map(frontier.events.map((event) => [event.delivery.answer, event]));
  const violations: CapTpCausalCutViolation[] = [];
  for (const event of selected) {
    const parent = event.delivery.pipelinedOn === undefined ? undefined : byAnswer.get(event.delivery.pipelinedOn);
    if (parent !== undefined && !selectedIds.has(parent.id)) {
      violations.push(Object.freeze({
        event: event.id,
        dependsOn: parent.id,
        reason: `selected event depends on unselected promise ${event.delivery.pipelinedOn}`,
      }));
    }
  }
  return captpCausalCutContract.assert(Object.freeze({
    kind: "captp.causal-cut" as const,
    session: frontier.session,
    status: violations.length === 0 ? "consistent" as const : "inconsistent" as const,
    clock,
    selected: Object.freeze([...selectedIds]),
    violations: Object.freeze(violations),
  }), "CapTP causal cut") as CapTpCausalCut;
}

export function causalCutFromClock(frontier: CapTpCausalFrontier, clock: CapTpVectorClock): CapTpCausalCut {
  const admitted = captpCausalFrontierContract.assert(frontier, "CapTP causal cut frontier") as CapTpCausalFrontier;
  const admittedClock = vectorClock({ ...clock });
  const selected = admitted.events.filter((event) => eventSelectedByClock(event, admittedClock));
  return causalCutFromSelected(admitted, admittedClock, selected);
}

export function causalCutFromSelection(frontier: CapTpCausalFrontier, selected: readonly string[]): CapTpCausalCut {
  const admitted = captpCausalFrontierContract.assert(frontier, "CapTP causal cut selection frontier") as CapTpCausalFrontier;
  const selectedSet = new Set(selected.map((id) => nonempty(id, "CapTP selected event")));
  const selectedEvents = admitted.events.filter((event) => selectedSet.has(event.id));
  const clock = mergeVectorClocks(...selectedEvents.map((event) => event.clock));
  return causalCutFromSelected(admitted, clock, selectedEvents);
}

export function causalCutStatementLog(cut: CapTpCausalCut, at?: string): readonly CapTpStatementRow[] {
  const admitted = captpCausalCutContract.assert(cut, "CapTP causal cut witness") as CapTpCausalCut;
  return Object.freeze([
    captpStatementRow(`${admitted.session}:cut`, `captp.cut.${admitted.status}`, {
      clock: admitted.clock,
      selected: admitted.selected,
    } as unknown as JsonValue, at),
    ...admitted.violations.map((violation) => captpStatementRow(violation.event, "captp.cut.violation", violation as unknown as JsonValue, at)),
  ]);
}

function presenceForPromise(vat: CapTpVatTable, id: string): CapTpVatPresence | undefined {
  return vat.presences.find((presence) => presence.presenceKind === "promise" && (presence.id === id || presence.promise === id));
}

function cutPromiseStatus(presence: CapTpVatPresence | undefined): Pick<CapTpCutPromiseState, "status" | "reason"> {
  if (presence === undefined) return { status: "missing", reason: "promise presence is absent from the vat table" };
  switch (presence.status) {
    case "live":
      return { status: "pending", reason: "promise remains live in the cut" };
    case "settled":
      return { status: "resolved" };
    case "broken":
      return { status: "failed" };
    case "dropped":
      return { status: "released" };
    case "blocked":
      return { status: "blocked", reason: presence.reason ?? "promise is blocked" };
  }
}

/** Stable predicate: a causal cut is quiet only when selected promises are terminal. */
export function causalCutQuiescence(cut: CapTpCausalCut, vat: CapTpVatTable, frontier?: CapTpCausalFrontier): CapTpCutQuiescence {
  const admittedCut = captpCausalCutContract.assert(cut, "CapTP quiescence cut") as CapTpCausalCut;
  const admittedVat = captpVatTableContract.assert(vat, "CapTP quiescence vat") as CapTpVatTable;
  const byId = new Map((frontier?.events ?? []).map((event) => [event.id, event]));
  const byAnswer = new Map((frontier?.events ?? []).map((event) => [event.delivery.answer, event]));
  const promises = admittedCut.selected.map((id) => {
    const event = byId.get(id);
    const promiseId = event?.delivery.answer ?? id;
    const presence = presenceForPromise(admittedVat, promiseId);
    const status = cutPromiseStatus(presence);
    return Object.freeze({
      kind: "captp.cut-promise-state" as const,
      id: promiseId,
      ...(event === undefined ? {} : { event }),
      ...(presence === undefined ? {} : { presence }),
      status: status.status,
      ...(status.reason === undefined ? {} : { reason: status.reason }),
    });
  });
  for (const presence of admittedVat.presences.filter((entry) => entry.presenceKind === "promise" && admittedCut.selected.includes(entry.id) && !promises.some((state) => state.id === entry.id))) {
    const event = byAnswer.get(presence.id);
    const status = cutPromiseStatus(presence);
    promises.push(Object.freeze({
      kind: "captp.cut-promise-state" as const,
      id: presence.id,
      ...(event === undefined ? {} : { event }),
      presence,
      status: status.status,
      ...(status.reason === undefined ? {} : { reason: status.reason }),
    }));
  }
  const pending = promises.filter((state) => state.status === "pending" || state.status === "missing");
  const terminal = promises.filter((state) => state.status !== "pending" && state.status !== "missing");
  const status = admittedCut.status === "inconsistent"
    ? "inconsistent" as const
    : pending.length === 0 ? "quiescent" as const : "active" as const;
  return Object.freeze({
    kind: "captp.cut-quiescence" as const,
    status,
    cut: admittedCut,
    vat: admittedVat,
    promises: Object.freeze(promises),
    pending: Object.freeze(pending),
    terminal: Object.freeze(terminal),
  });
}

export function causalCutQuiescenceStatementLog(quiescence: CapTpCutQuiescence, at?: string): readonly CapTpStatementRow[] {
  return Object.freeze([
    captpStatementRow(`${quiescence.vat.session}:quiescence`, `captp.quiescence.${quiescence.status}`, {
      pending: quiescence.pending.map((state) => state.id),
      terminal: quiescence.terminal.map((state) => state.id),
    } as unknown as JsonValue, at),
    ...quiescence.promises.map((state) => captpStatementRow(state.id, `captp.quiescence.promise.${state.status}`, state as unknown as JsonValue, at)),
  ]);
}

function descendantsInVat(id: string, vat: CapTpVatTable): readonly CapTpVatPresence[] {
  return Object.freeze(vat.presences.filter((presence) => presence.target === id || presence.ref?.id === id));
}

/** Termination/settlement reading for an invocation tree at a causal cut. */
export function resolveInvocation(cut: CapTpCausalCut, vat: CapTpVatTable, root?: string, frontier?: CapTpCausalFrontier): CapTpInvocationResult {
  const quiescence = causalCutQuiescence(cut, vat, frontier);
  const debts = quiescence.pending.map((state) => Object.freeze({
    kind: "captp.invocation-debt" as const,
    id: state.id,
    descendants: descendantsInVat(state.id, vat).map((presence) => presence.id),
    reason: state.reason ?? "promise has not reached terminal settlement",
  }));
  const failed = quiescence.promises.filter((state) => state.status === "failed" || state.status === "blocked");
  const terminal = quiescence.promises.filter((state) => state.status === "resolved" || state.status === "released");
  const status = cut.status === "inconsistent"
    ? "inconsistent" as const
    : debts.length > 0 ? "active" as const : failed.length > 0 ? "failed" as const : "terminated" as const;
  return Object.freeze({
    kind: "captp.invocation-settlement" as const,
    status,
    ...(root === undefined ? {} : { root }),
    cut,
    vat,
    quiescence,
    debts: Object.freeze(debts),
    failed: Object.freeze(failed),
    terminal: Object.freeze(terminal),
  });
}

export function invocationResultStatementLog(settlement: CapTpInvocationResult, at?: string): readonly CapTpStatementRow[] {
  return Object.freeze([
    captpStatementRow(settlement.root ?? `${settlement.vat.session}:settlement`, `captp.invocation-settlement.${settlement.status}`, {
      debts: settlement.debts.map((debt) => debt.id),
      failed: settlement.failed.map((state) => state.id),
      terminal: settlement.terminal.map((state) => state.id),
    } as unknown as JsonValue, at),
    ...settlement.debts.map((debt) => captpStatementRow(debt.id, "captp.invocation-debt", debt as unknown as JsonValue, at)),
  ]);
}

/** Distributed-GC reading: which promises can retire after settlement. */
export function promiseRetirementCertificate(
  settlement: CapTpInvocationResult,
  promiseIds: readonly string[] = settlement.quiescence.promises.map((state) => state.id),
): CapTpPromiseRetirementCertificate {
  const selected = new Set(promiseIds);
  const byState = new Map(settlement.quiescence.promises.map((state) => [state.id, state]));
  const items = promiseIds.map((id) => {
    const state = byState.get(id);
    const presence = state?.presence ?? presenceForPromise(settlement.vat, id);
    const descendants = descendantsInVat(id, settlement.vat).map((entry) => entry.id);
    const blockers: string[] = [];
    if (settlement.status === "inconsistent") blockers.push("settlement cut is inconsistent");
    if (state === undefined) blockers.push("promise is absent from the settlement cut");
    if (state?.status === "pending" || state?.status === "missing") blockers.push("promise has not reached terminal settlement");
    for (const descendant of descendants) if (!selected.has(descendant)) blockers.push(`descendant presence is outside the certificate: ${descendant}`);
    return Object.freeze({
      kind: "captp.promise-retirement-item" as const,
      id,
      ...(presence === undefined ? {} : { presence }),
      descendants: Object.freeze(descendants),
      blockers: Object.freeze([...new Set(blockers)]),
      status: blockers.length === 0 ? "retirable" as const : "retained" as const,
    });
  });
  const retirable = items.filter((item) => item.status === "retirable");
  const retained = items.filter((item) => item.status === "retained");
  return Object.freeze({
    kind: "captp.promise-retirement-certificate" as const,
    status: retained.length === 0 ? "retirable" as const : "retained" as const,
    settlement,
    items: Object.freeze(items),
    retirable: Object.freeze(retirable),
    retained: Object.freeze(retained),
  });
}

export function promiseRetirementStatementLog(certificate: CapTpPromiseRetirementCertificate, at?: string): readonly CapTpStatementRow[] {
  return Object.freeze([
    captpStatementRow(certificate.settlement.root ?? `${certificate.settlement.vat.session}:retirement`, `captp.promise-retirement.${certificate.status}`, {
      retirable: certificate.retirable.map((item) => item.id),
      retained: certificate.retained.map((item) => item.id),
    } as unknown as JsonValue, at),
    ...certificate.items.map((item) => captpStatementRow(item.id, `captp.promise-retirement.item.${item.status}`, item as unknown as JsonValue, at)),
  ]);
}

/** Read an authority graph as a vat presence table of imports, exports, and promises. */
export function vatFromAuthorityGraph(session: string, graph: CapTpAuthorityGraph): CapTpVatTable {
  const admitted = captpAuthorityGraphContract.assert(graph, "CapTP vat graph") as CapTpAuthorityGraph;
  const blocked = new Map(admitted.blocked.map((entry) => [entry.delivery.answer, entry.reason]));
  const presences: CapTpVatPresence[] = [
    ...admitted.refs.map((ref) => Object.freeze({
      id: ref.id,
      presenceKind: "export" as const,
      status: "live" as const,
      ref,
    })),
    ...admitted.deliveries.map((delivery) => {
      const reason = blocked.get(delivery.answer);
      return Object.freeze({
        id: delivery.answer,
        presenceKind: "promise" as const,
        status: reason === undefined ? "live" as const : "blocked" as const,
        promise: delivery.answer,
        target: delivery.target,
        ...(reason === undefined ? {} : { reason }),
      });
    }),
  ];
  return captpVatTableContract.assert(Object.freeze({
    kind: "captp.vat-table" as const,
    session: nonempty(session, "CapTP vat session"),
    presences: Object.freeze(presences),
  }), "CapTP vat table") as CapTpVatTable;
}

function updateVatPresence(vat: CapTpVatTable, id: string, update: Partial<CapTpVatPresence>): CapTpVatTable {
  const admitted = captpVatTableContract.assert(vat, "CapTP vat update") as CapTpVatTable;
  const target = nonempty(id, "CapTP vat presence id");
  return captpVatTableContract.assert(Object.freeze({
    kind: "captp.vat-table" as const,
    session: admitted.session,
    presences: Object.freeze(admitted.presences.map((presence) => presence.id === target ? Object.freeze({ ...presence, ...update }) : presence)),
  }), "CapTP vat table update") as CapTpVatTable;
}

export function dropPresence(vat: CapTpVatTable, id: string): CapTpVatTable {
  return updateVatPresence(vat, id, { status: "dropped" });
}

export function resolvePromise(vat: CapTpVatTable, promise: string, resolvedTo: CapTpSturdyRef): CapTpVatTable {
  const ref = captpSturdyRefContract.assert(resolvedTo, "CapTP resolved ref") as CapTpSturdyRef;
  return updateVatPresence(vat, promise, { status: "settled", target: ref.id });
}

export function breakPromise(vat: CapTpVatTable, promise: string, reason: string): CapTpVatTable {
  return updateVatPresence(vat, promise, { status: "broken", reason: nonempty(reason, "CapTP break reason") });
}

export function vatCanInvoke(vat: CapTpVatTable, id: string): boolean {
  const admitted = captpVatTableContract.assert(vat, "CapTP vat invocation") as CapTpVatTable;
  const presence = admitted.presences.find((entry) => entry.id === id);
  return presence !== undefined && (presence.status === "live" || presence.status === "settled");
}

export function vatStatementLog(vat: CapTpVatTable, at?: string): readonly CapTpStatementRow[] {
  const admitted = captpVatTableContract.assert(vat, "CapTP vat witness") as CapTpVatTable;
  return Object.freeze(admitted.presences.map((presence) => captpStatementRow(
    `${admitted.session}:${presence.id}`,
    `captp.vat.${presence.presenceKind}.${presence.status}`,
    presence as unknown as JsonValue,
    at,
  )));
}

/** Start or continue a CapTP handoff table. */
export function handoffTable(session: string, gifts: readonly CapTpHandoffGift[] = []): CapTpHandoffTable {
  return captpHandoffTableContract.assert(Object.freeze({
    kind: "captp.handoff-table" as const,
    session: nonempty(session, "CapTP handoff session"),
    gifts: Object.freeze(gifts),
  }), "CapTP handoff table") as CapTpHandoffTable;
}

export function offerHandoffGift(table: CapTpHandoffTable, input: {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly ref: CapTpSturdyRef;
}): CapTpHandoffTable {
  const admitted = captpHandoffTableContract.assert(table, "CapTP handoff offer") as CapTpHandoffTable;
  const gift = Object.freeze({
    id: nonempty(input.id, "CapTP handoff gift id"),
    from: nonempty(input.from, "CapTP handoff from"),
    to: nonempty(input.to, "CapTP handoff to"),
    ref: captpSturdyRefContract.assert(input.ref, "CapTP handoff ref") as CapTpSturdyRef,
    status: "offered" as const,
  });
  return handoffTable(admitted.session, Object.freeze([...admitted.gifts, gift]));
}

function setHandoffGiftStatus(table: CapTpHandoffTable, id: string, status: CapTpHandoffGift["status"]): CapTpHandoffTable {
  const admitted = captpHandoffTableContract.assert(table, "CapTP handoff status") as CapTpHandoffTable;
  const target = nonempty(id, "CapTP handoff gift id");
  return handoffTable(admitted.session, Object.freeze(admitted.gifts.map((gift) => gift.id === target ? Object.freeze({ ...gift, status }) : gift)));
}

export function depositHandoffGift(table: CapTpHandoffTable, id: string): CapTpHandoffTable {
  return setHandoffGiftStatus(table, id, "deposited");
}

export function withdrawHandoffGift(table: CapTpHandoffTable, id: string): CapTpHandoffTable {
  return setHandoffGiftStatus(table, id, "withdrawn");
}

export function handoffStatementLog(table: CapTpHandoffTable, at?: string): readonly CapTpStatementRow[] {
  const admitted = captpHandoffTableContract.assert(table, "CapTP handoff witness") as CapTpHandoffTable;
  return Object.freeze(admitted.gifts.map((gift) => captpStatementRow(
    `${admitted.session}:${gift.id}`,
    `captp.handoff.${gift.status}`,
    gift as unknown as JsonValue,
    at,
  )));
}

/** Read CapTP wire descriptors as an explicit descriptor contract. */
export function captpDescriptor(input: {
  readonly descriptorKind: CapTpDescriptor["descriptorKind"];
  readonly id: string;
  readonly session?: string;
  readonly position?: number;
  readonly value?: JsonValue;
}): CapTpDescriptor {
  return captpDescriptorContract.assert(Object.freeze({
    kind: "captp.descriptor" as const,
    descriptorKind: input.descriptorKind,
    id: nonempty(input.id, "CapTP descriptor id"),
    ...(input.session === undefined ? {} : { session: nonempty(input.session, "CapTP descriptor session") }),
    ...(input.position === undefined ? {} : { position: input.position }),
    ...(input.value === undefined ? {} : { value: requireJsonValue(input.value, "CapTP descriptor value") }),
  }), "CapTP descriptor") as CapTpDescriptor;
}

export function importObjectDesc(session: string, position: number, id = `import-object:${position}`): CapTpDescriptor {
  return captpDescriptor({ descriptorKind: "import-object", session, position, id });
}

export function importPromiseDesc(session: string, position: number, id = `import-promise:${position}`): CapTpDescriptor {
  return captpDescriptor({ descriptorKind: "import-promise", session, position, id });
}

export function exportDesc(session: string, position: number, id = `export:${position}`): CapTpDescriptor {
  return captpDescriptor({ descriptorKind: "export", session, position, id });
}

export function answerDesc(session: string, position: number, id = `answer:${position}`): CapTpDescriptor {
  return captpDescriptor({ descriptorKind: "answer", session, position, id });
}

export function sigEnvelope(id: string, value: JsonValue): CapTpDescriptor {
  return captpDescriptor({ descriptorKind: "signature", id, value });
}

export function handoffGiveDesc(gift: CapTpHandoffGift): CapTpDescriptor {
  return captpDescriptor({
    descriptorKind: "handoff-give",
    id: `handoff-give:${gift.id}`,
    session: gift.id,
    value: gift as unknown as JsonValue,
  });
}

export function handoffReceiveDesc(input: {
  readonly receivingSession: string;
  readonly receivingSide: string;
  readonly handoffCount: number;
  readonly signedGive: CapTpDescriptor;
}): CapTpDescriptor {
  return captpDescriptor({
    descriptorKind: "handoff-receive",
    id: `handoff-receive:${nonempty(input.receivingSession, "CapTP receiving session")}:${input.handoffCount}`,
    session: input.receivingSession,
    position: input.handoffCount,
    value: {
      receivingSide: nonempty(input.receivingSide, "CapTP receiving side"),
      signedGive: captpDescriptorContract.assert(input.signedGive, "CapTP signed give") as unknown as JsonValue,
    },
  });
}

export function descriptorStandingKey(descriptor: CapTpDescriptor): string {
  const admitted = captpDescriptorContract.assert(descriptor, "CapTP descriptor key") as CapTpDescriptor;
  return `${admitted.descriptorKind}:${admitted.session ?? "no-session"}:${admitted.position ?? admitted.id}`;
}

function candidateRefIds(candidates: readonly ReferenceJoinCandidate[]): readonly string[] {
  return Object.freeze(candidates.map((candidate) => candidate.ref.id));
}

/** CapTP reference equality/join as held-power evidence over vat presences. */
export function joinReferences(candidates: readonly ReferenceJoinCandidate[], vats: readonly CapTpVatTable[] = []): ReferenceJoin {
  const admitted = candidates.map((candidate) => Object.freeze({
    ref: captpSturdyRefContract.assert(candidate.ref, "CapTP reference join ref") as CapTpSturdyRef,
    ...(candidate.descriptor === undefined ? {} : { descriptor: captpDescriptorContract.assert(candidate.descriptor, "CapTP reference join descriptor") as CapTpDescriptor }),
    ...(candidate.via === undefined ? {} : { via: nonempty(candidate.via, "CapTP reference join via") }),
  }));
  if (admitted.length < 2) return Object.freeze({
    kind: "captp.reference-join" as const,
    status: "blocked" as const,
    candidates: Object.freeze(admitted),
    joinedRefs: candidateRefIds(admitted),
    reason: "at least two references are required",
  });
  const first = admitted[0];
  if (first === undefined) throw new TypeError("joinReferences: missing first candidate");
  const mismatch = admitted.find((candidate) => candidate.ref.locus !== first.ref.locus);
  if (mismatch !== undefined) return Object.freeze({
    kind: "captp.reference-join" as const,
    status: "blocked" as const,
    locus: first.ref.locus,
    candidates: Object.freeze(admitted),
    joinedRefs: candidateRefIds(admitted),
    reason: "references do not share a locus",
  });
  const live = new Set(vats.flatMap((vat) => vat.presences.filter((presence) => presence.status === "live" || presence.status === "settled").flatMap((presence) => [
    presence.id,
    presence.ref?.id,
    presence.target,
  ].filter((value): value is string => typeof value === "string"))));
  const unheld = vats.length === 0 ? undefined : admitted.find((candidate) => !live.has(candidate.ref.id));
  if (unheld !== undefined) return Object.freeze({
    kind: "captp.reference-join" as const,
    status: "blocked" as const,
    locus: first.ref.locus,
    candidates: Object.freeze(admitted),
    joinedRefs: candidateRefIds(admitted),
    reason: `reference is not live in supplied vat tables: ${unheld.ref.id}`,
  });
  return Object.freeze({
    kind: "captp.reference-join" as const,
    status: "joined" as const,
    locus: first.ref.locus,
    candidates: Object.freeze(admitted),
    joinedRefs: candidateRefIds(admitted),
  });
}

export function refJoinStandingKey(join: ReferenceJoin): string {
  return ["captp.reference-join", join.status, join.locus ?? "", [...join.joinedRefs].sort().join(",")].join("|");
}

export function refJoinStatementLog(join: ReferenceJoin, at?: string): readonly CapTpStatementRow[] {
  return Object.freeze(join.candidates.map((candidate) => captpStatementRow(
    candidate.ref.id,
    `captp.reference-join.${join.status}`,
    {
      locus: join.locus,
      joinedRefs: join.joinedRefs,
      via: candidate.via,
      descriptor: candidate.descriptor === undefined ? undefined : descriptorStandingKey(candidate.descriptor),
      reason: join.reason,
    } as unknown as JsonValue,
    at,
  )));
}

export function startSessionOp(local: string, remote: string): JsonValue {
  return Object.freeze({
    kind: "captp.op.start-session",
    local: nonempty(local, "CapTP local side"),
    remote: nonempty(remote, "CapTP remote side"),
  });
}

export function captpPublicIdentifier(publicKeyMaterial: string | Uint8Array): string {
  const material = typeof publicKeyMaterial === "string"
    ? publicKeyMaterial
    : Array.from(publicKeyMaterial).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `captp:public:${canonicalBytes(nonempty(material, "CapTP public key material") as unknown as JsonValue)}`;
}

export function captpSessionIdentifier(leftPublicIdentifier: string, rightPublicIdentifier: string): string {
  const left = nonempty(leftPublicIdentifier, "CapTP left public identifier");
  const right = nonempty(rightPublicIdentifier, "CapTP right public identifier");
  return `captp:session:${[left, right].sort().join(":")}`;
}

function compareIdentifiers(left: string, right: string): number {
  return nonempty(left, "CapTP left identifier").localeCompare(nonempty(right, "CapTP right identifier"));
}

export function openSession(input: {
  readonly local: string;
  readonly remote: string;
  readonly session?: string;
}): CapTpSessionTranscript {
  const session = input.session ?? captpSessionIdentifier(input.local, input.remote);
  return foldSessionTranscript(session, [startSessionOp(input.local, input.remote)]);
}

export function receiveStartSession(transcript: CapTpSessionTranscript, operation: JsonValue, remoteSide?: string): CapTpSessionTranscript {
  const admitted = captpSessionTranscriptContract.assert(transcript, "CapTP receive start transcript") as CapTpSessionTranscript;
  const received = requireJsonValue({
    kind: "captp.op.receive-start-session",
    operation,
    ...(remoteSide === undefined ? {} : { remoteSide }),
  }, "CapTP receive start operation");
  return foldSessionTranscript(admitted.session, Object.freeze([...admitted.operations, received]));
}

export function resolveCrossedHellos(
  local: CapTpSessionTranscript,
  remote: CapTpSessionTranscript,
  localPublicIdentifier: string,
  remotePublicIdentifier: string,
): CapTpCrossedHelloResolution {
  const admittedLocal = captpSessionTranscriptContract.assert(local, "CapTP crossed hello local") as CapTpSessionTranscript;
  const admittedRemote = captpSessionTranscriptContract.assert(remote, "CapTP crossed hello remote") as CapTpSessionTranscript;
  const comparison = compareIdentifiers(localPublicIdentifier, remotePublicIdentifier);
  const winner = comparison > 0 ? "local" as const : comparison < 0 ? "remote" as const : "tie" as const;
  const kept = winner === "remote" ? admittedRemote : admittedLocal;
  const droppedBase = winner === "remote" ? admittedLocal : admittedRemote;
  const dropped = droppedBase.status === "aborted" ? droppedBase : abortSession(droppedBase, "crossed hello dropped");
  return Object.freeze({
    kind: "captp.crossed-hello-resolution" as const,
    winner,
    kept,
    dropped,
    localPublicIdentifier: nonempty(localPublicIdentifier, "CapTP local public identifier"),
    remotePublicIdentifier: nonempty(remotePublicIdentifier, "CapTP remote public identifier"),
    reason: winner === "tie" ? "crossed hellos have identical public identifiers" : "crossed hellos resolved by public identifier order",
  });
}

export function deliverOp(delivery: CapTpDelivery): JsonValue {
  const admitted = captpDeliveryContract.assert(delivery, "CapTP deliver operation") as CapTpDelivery;
  return Object.freeze({ kind: "captp.op.deliver", delivery: admitted as unknown as JsonValue });
}

export function listenOp(promise: string): JsonValue {
  return Object.freeze({ kind: "captp.op.listen", promise: nonempty(promise, "CapTP listen promise") });
}

export function fulfillResolverOp(resolverDesc: CapTpDescriptor, value: JsonValue): JsonValue {
  return Object.freeze({
    kind: "captp.op.fulfill-resolver",
    resolver: captpDescriptorContract.assert(resolverDesc, "CapTP resolver descriptor") as unknown as JsonValue,
    value: requireJsonValue(value, "CapTP fulfillment value"),
  });
}

export function breakResolverOp(resolverDesc: CapTpDescriptor, reason: JsonValue): JsonValue {
  return Object.freeze({
    kind: "captp.op.break-resolver",
    resolver: captpDescriptorContract.assert(resolverDesc, "CapTP resolver descriptor") as unknown as JsonValue,
    reason: requireJsonValue(reason, "CapTP break reason"),
  });
}

export function getOp(receiverDesc: CapTpDescriptor, fieldName: string, newAnswerPos: number): JsonValue {
  return Object.freeze({
    kind: "captp.op.get",
    receiver: captpDescriptorContract.assert(receiverDesc, "CapTP get receiver") as unknown as JsonValue,
    fieldName: nonempty(fieldName, "CapTP get field"),
    newAnswerPos,
  });
}

export function indexOp(receiverDesc: CapTpDescriptor, index: number, newAnswerPos: number): JsonValue {
  return Object.freeze({
    kind: "captp.op.index",
    receiver: captpDescriptorContract.assert(receiverDesc, "CapTP index receiver") as unknown as JsonValue,
    index,
    newAnswerPos,
  });
}

export function untagOp(receiverDesc: CapTpDescriptor, tag: string, newAnswerPos: number): JsonValue {
  return Object.freeze({
    kind: "captp.op.untag",
    receiver: captpDescriptorContract.assert(receiverDesc, "CapTP untag receiver") as unknown as JsonValue,
    tag: nonempty(tag, "CapTP untag tag"),
    newAnswerPos,
  });
}

export function bootstrapFetchOp(path: string, answerPos = 0): JsonValue {
  return Object.freeze({ kind: "captp.op.bootstrap-fetch", path: nonempty(path, "CapTP bootstrap path"), answerPos });
}

export function bootstrapDepositGiftOp(gift: CapTpHandoffGift, objectPosition: number): JsonValue {
  return Object.freeze({
    kind: "captp.op.bootstrap-deposit-gift",
    gift: gift as unknown as JsonValue,
    objectPosition,
  });
}

export function bootstrapWithdrawGiftOp(giftId: string, handoffCount: number, answerPos = 0): JsonValue {
  return Object.freeze({
    kind: "captp.op.bootstrap-withdraw-gift",
    giftId: nonempty(giftId, "CapTP gift id"),
    handoffCount,
    answerPos,
  });
}

export function gcAnswersOp(answerPositions: readonly number[]): JsonValue {
  return Object.freeze({ kind: "captp.op.gc-answers", answerPositions: Object.freeze([...answerPositions]) });
}

export function gcExportsOp(exportPositions: readonly number[], wireDeltas: readonly number[] = []): JsonValue {
  return Object.freeze({
    kind: "captp.op.gc-exports",
    exportPositions: Object.freeze([...exportPositions]),
    wireDeltas: Object.freeze([...wireDeltas]),
  });
}

export function abortOp(reason: string): JsonValue {
  return Object.freeze({ kind: "captp.op.abort", reason: nonempty(reason, "CapTP abort reason") });
}

export function abortSession(transcript: CapTpSessionTranscript, reason: string): CapTpSessionTranscript {
  const admitted = captpSessionTranscriptContract.assert(transcript, "CapTP abort session transcript") as CapTpSessionTranscript;
  return foldSessionTranscript(admitted.session, Object.freeze([...admitted.operations, abortOp(reason)]));
}

function operationKind(operation: JsonValue): string {
  if (typeof operation === "object" && operation !== null && !Array.isArray(operation)) {
    const record = operation as Readonly<Record<string, JsonValue>>;
    if (typeof record.kind === "string") return record.kind;
  }
  return "captp.op.unknown";
}

/** Fold CapTP operations into a finite session transcript object. */
export function foldSessionTranscript(session: string, operations: readonly JsonValue[]): CapTpSessionTranscript {
  const admittedOperations = Object.freeze(operations.map((operation) => requireJsonValue(operation, "CapTP transcript operation")));
  const blocked: CapTpTranscriptBlockedOperation[] = [];
  const counters: Record<string, number> = {};
  let status: CapTpSessionTranscript["status"] = "live";
  for (const operation of admittedOperations) {
    const kind = operationKind(operation);
    counters[kind] = (counters[kind] ?? 0) + 1;
    if (kind === "captp.op.abort") status = "aborted";
    if (kind === "captp.op.deliver") {
      const delivery = (operation as { readonly delivery?: unknown }).delivery as CapTpDelivery | undefined;
      if (delivery?.target === undefined) blocked.push(Object.freeze({ operation, reason: "deliver operation lacks target" }));
    }
  }
  return captpSessionTranscriptContract.assert(Object.freeze({
    kind: "captp.session-transcript" as const,
    session: nonempty(session, "CapTP transcript session"),
    status,
    operations: admittedOperations,
    blocked: Object.freeze(blocked),
    counters: vectorClock(counters),
  }), "CapTP session transcript") as CapTpSessionTranscript;
}

export function sessionTranscriptStatementLog(transcript: CapTpSessionTranscript, at?: string): readonly CapTpStatementRow[] {
  const admitted = captpSessionTranscriptContract.assert(transcript, "CapTP transcript witness") as CapTpSessionTranscript;
  return Object.freeze([
    captpStatementRow(`${admitted.session}:transcript`, `captp.session.${admitted.status}`, admitted.counters as unknown as JsonValue, at),
    ...admitted.blocked.map((blocked) => captpStatementRow(`${admitted.session}:blocked`, "captp.session.blocked", blocked as unknown as JsonValue, at)),
  ]);
}

export function sessionStatementLog(session: CapTpSessionTranscript, at?: string): readonly CapTpStatementRow[] {
  const admitted = captpSessionTranscriptContract.assert(session, "CapTP session witness") as CapTpSessionTranscript;
  return Object.freeze([
    captpStatementRow(admitted.session, `captp.session.${admitted.status}`, {
      operations: admitted.operations.length,
      counters: admitted.counters,
      blocked: admitted.blocked.length,
    } as unknown as JsonValue, at),
  ]);
}

export function crossedHelloStatementLog(resolution: CapTpCrossedHelloResolution, at?: string): readonly CapTpStatementRow[] {
  return Object.freeze([
    captpStatementRow(resolution.kept.session, "captp.crossed-hello.kept", {
      winner: resolution.winner,
      localPublicIdentifier: resolution.localPublicIdentifier,
      remotePublicIdentifier: resolution.remotePublicIdentifier,
      reason: resolution.reason,
    } as unknown as JsonValue, at),
    captpStatementRow(resolution.dropped.session, "captp.crossed-hello.dropped", {
      winner: resolution.winner,
      reason: resolution.reason,
    } as unknown as JsonValue, at),
  ]);
}

export function commitSessionTranscript(transcript: CapTpSessionTranscript, seed = "captp:genesis"): readonly CapTpStatementRow[] {
  const admitted = captpSessionTranscriptContract.assert(transcript, "CapTP transcript commit") as CapTpSessionTranscript;
  const commit = `captp:commit:${canonicalBytes({ seed, transcript: admitted } as unknown as JsonValue)}`;
  return Object.freeze([
    captpStatementRow(`${admitted.session}:commit`, "captp.session.commit", commit),
    ...sessionTranscriptStatementLog(admitted),
  ]);
}

export const transcriptCommitStatementLog = (chain: readonly CapTpStatementRow[]): readonly CapTpStatementRow[] => Object.freeze([...chain]);

export function captpLibp2pTransportProjection(input: {
  readonly session: string;
  readonly swarm: string;
  readonly roster: readonly string[];
  readonly streams: readonly {
    readonly streamId?: string;
    readonly protocol?: string;
    readonly source: string;
    readonly target: string;
    readonly delivery: CapTpDelivery;
  }[];
  readonly pubsub?: readonly {
    readonly topic: string;
    readonly messageId: string;
    readonly from: string;
    readonly delivery?: CapTpDelivery;
  }[];
}): CapTpTransportProjection {
  const roster = unique(input.roster, "CapTP libp2p roster");
  const rosterSet = new Set(roster);
  const violations: string[] = [];
  const streams = Object.freeze(input.streams.map((stream, index) => {
    const source = nonempty(stream.source, "CapTP libp2p stream source");
    const target = nonempty(stream.target, "CapTP libp2p stream target");
    const protocol = nonempty(stream.protocol ?? "/captp/1.0.0", "CapTP libp2p stream protocol");
    if (!rosterSet.has(source)) violations.push(`stream source is not in roster: ${source}`);
    if (!rosterSet.has(target)) violations.push(`stream target is not in roster: ${target}`);
    if (!protocol.includes("captp")) violations.push(`stream protocol does not name CapTP: ${protocol}`);
    const delivery = captpDeliveryContract.assert(stream.delivery, "CapTP libp2p stream delivery") as CapTpDelivery;
    return Object.freeze({
      streamId: stream.streamId ?? `${input.session}:stream:${index}:${delivery.answer}`,
      protocol,
      source,
      target,
      delivery,
    });
  }));
  const pubsub = Object.freeze((input.pubsub ?? []).map((entry, index) => {
    const from = nonempty(entry.from, "CapTP libp2p pubsub sender");
    if (!rosterSet.has(from)) violations.push(`pubsub sender is not in roster: ${from}`);
    return Object.freeze({
      topic: nonempty(entry.topic, "CapTP libp2p pubsub topic"),
      messageId: nonempty(entry.messageId, "CapTP libp2p pubsub message"),
      from,
      ...(entry.delivery === undefined ? {} : { delivery: captpDeliveryContract.assert(entry.delivery, `CapTP libp2p pubsub delivery ${index}`) as CapTpDelivery }),
    });
  }));
  return captpTransportProjectionContract.assert(Object.freeze({
    kind: "captp.transport-projection" as const,
    transport: "libp2p" as const,
    session: nonempty(input.session, "CapTP libp2p transport session"),
    swarm: nonempty(input.swarm, "CapTP libp2p swarm"),
    roster,
    streams,
    pubsub,
    status: violations.length === 0 ? "admitted" as const : "obstructed" as const,
    violations: Object.freeze(violations),
  }), "CapTP libp2p transport projection") as CapTpTransportProjection;
}

export function captpLibp2pTransportFromSession(
  session: CapTpSessionTranscript,
  input: {
    readonly swarm: string;
    readonly roster: readonly string[];
    readonly source: string;
    readonly target: string;
    readonly protocol?: string;
    readonly topic?: string;
  },
): CapTpTransportProjection {
  const admitted = captpSessionTranscriptContract.assert(session, "CapTP transport transcript") as CapTpSessionTranscript;
  const deliveries = admitted.operations
    .filter((operation) => operationKind(operation) === "captp.op.deliver")
    .map((operation) => ((operation as { readonly delivery?: unknown }).delivery))
    .filter((delivery): delivery is CapTpDelivery => delivery !== undefined);
  const protocol = input.protocol ?? "/captp/1.0.0";
  const topic = input.topic;
  return captpLibp2pTransportProjection({
    session: admitted.session,
    swarm: input.swarm,
    roster: input.roster,
    streams: deliveries.map((delivery, index) => Object.freeze({
      streamId: `${admitted.session}:captp:${index}:${delivery.answer}`,
      protocol,
      source: input.source,
      target: input.target,
      delivery,
    })),
    pubsub: topic === undefined ? [] : deliveries.map((delivery, index) => Object.freeze({
      topic,
      messageId: `${admitted.session}:captp:${index}:${delivery.answer}`,
      from: input.source,
      delivery,
    })),
  });
}

export function captpTransportStatementLog(projection: CapTpTransportProjection, at?: string): readonly CapTpStatementRow[] {
  const admitted = captpTransportProjectionContract.assert(projection, "CapTP transport witness projection") as CapTpTransportProjection;
  return Object.freeze([
    captpStatementRow(`${admitted.session}:transport:${admitted.swarm}`, `captp.transport.${admitted.status}`, {
      transport: admitted.transport,
      roster: admitted.roster,
      streams: admitted.streams.map((stream) => stream.streamId),
      pubsub: admitted.pubsub.map((entry) => entry.messageId),
      violations: admitted.violations,
    } as unknown as JsonValue, at),
    ...admitted.streams.map((stream) => captpStatementRow(stream.streamId, "captp.transport.stream", {
      protocol: stream.protocol,
      source: stream.source,
      target: stream.target,
      delivery: stream.delivery.answer,
    } as unknown as JsonValue, at)),
  ]);
}

/** Read an export table as vat export presences. */
export function exportTable(session: string, exports: readonly { readonly position: number; readonly ref: CapTpSturdyRef; readonly count?: number }[] = []): CapTpVatTable {
  const presences = exports.map((entry) => Object.freeze({
    id: `export:${entry.position}`,
    presenceKind: "export" as const,
    status: (entry.count ?? 1) > 0 ? "live" as const : "dropped" as const,
    ref: captpSturdyRefContract.assert(entry.ref, "CapTP export ref") as CapTpSturdyRef,
  }));
  return captpVatTableContract.assert(Object.freeze({
    kind: "captp.vat-table" as const,
    session: nonempty(session, "CapTP export table session"),
    presences: Object.freeze(presences),
  }), "CapTP export table") as CapTpVatTable;
}

export function trackExport(table: CapTpVatTable, position: number, ref: CapTpSturdyRef, count = 1): CapTpVatTable {
  const admitted = captpVatTableContract.assert(table, "CapTP track export table") as CapTpVatTable;
  const id = `export:${position}`;
  const next = admitted.presences.filter((presence) => presence.id !== id);
  next.push(Object.freeze({
    id,
    presenceKind: "export" as const,
    status: count > 0 ? "live" as const : "dropped" as const,
    ref: captpSturdyRefContract.assert(ref, "CapTP tracked export ref") as CapTpSturdyRef,
  }));
  return captpVatTableContract.assert(Object.freeze({
    kind: "captp.vat-table" as const,
    session: admitted.session,
    presences: Object.freeze(next),
  }), "CapTP tracked export table") as CapTpVatTable;
}

export function applyGcExports(table: CapTpVatTable, exportPositions: readonly number[]): CapTpVatTable {
  let out = captpVatTableContract.assert(table, "CapTP gc export table") as CapTpVatTable;
  for (const position of exportPositions) out = dropPresence(out, `export:${position}`);
  return out;
}

function operationsOf(value: CapTpSessionTranscript | readonly JsonValue[]): readonly JsonValue[] {
  if (Array.isArray(value)) return Object.freeze(value.map((operation) => requireJsonValue(operation, "CapTP trace operation")));
  return (captpSessionTranscriptContract.assert(value, "CapTP trace transcript") as CapTpSessionTranscript).operations;
}

export function operationStandingKey(operation: JsonValue): string {
  return `${operationKind(operation)}:${canonicalBytes(operation)}`;
}

export function operationStatementLog(operations: readonly JsonValue[], at?: string): readonly CapTpStatementRow[] {
  return Object.freeze(operations.map((operation) => captpStatementRow(operationStandingKey(operation), "captp.operation", operation, at)));
}

export function foldAnswerTable(session: string, operations: readonly JsonValue[]): CapTpSessionTranscript {
  return foldSessionTranscript(`${nonempty(session, "CapTP answer table session")}:answers`, operations);
}

export function answerTableStatementLog(table: CapTpSessionTranscript, at?: string): readonly CapTpStatementRow[] {
  return sessionTranscriptStatementLog(table, at);
}

export function foldPromiseTrace(operations: CapTpSessionTranscript | readonly JsonValue[]): readonly CapTpStatementRow[] {
  return Object.freeze(operationsOf(operations)
    .filter((operation) => operationKind(operation) === "captp.op.listen" || operationKind(operation) === "captp.op.deliver")
    .map((operation) => captpStatementRow(operationStandingKey(operation), "captp.promise-trace", operation, undefined)));
}

export const promiseTraceStatementLog = (trace: readonly CapTpStatementRow[]): readonly CapTpStatementRow[] => Object.freeze([...trace]);

export function foldProjectionTrace(operations: CapTpSessionTranscript | readonly JsonValue[]): readonly CapTpStatementRow[] {
  return Object.freeze(operationsOf(operations)
    .filter((operation) => ["captp.op.get", "captp.op.index", "captp.op.untag"].includes(operationKind(operation)))
    .map((operation) => captpStatementRow(operationStandingKey(operation), "captp.projection-trace", operation, undefined)));
}

export const projectionTraceStatementLog = (trace: readonly CapTpStatementRow[]): readonly CapTpStatementRow[] => Object.freeze([...trace]);

export function admit(affordances: readonly string[], ref: CapTpSturdyRef): CapabilityInteraction {
  const admitted = captpSturdyRefContract.assert(ref, "CapTP admission ref") as CapTpSturdyRef;
  return invokeCapabilityView(capabilityView({
    holder: admitted.holder,
    grants: admitted.locus,
    id: admitted.id,
  }), affordances);
}

export const captpAdmit = admit;
export const captpAbortOp = abortOp;
export const captpAbortSession = abortSession;
export const captpApplyGcExports = applyGcExports;
export const captpCausalCutFromClock = causalCutFromClock;
export const captpCausalFrontierFromTurnTraces = causalFrontierFromTurnTraces;
export const captpCommitSessionTranscript = commitSessionTranscript;
export const captpDeliverOp = deliverOp;
export const captpDescriptorStandingKey = descriptorStandingKey;
export const captpDropPresence = dropPresence;
export const captpExportTable = exportTable;
export const captpFoldSessionTranscript = foldSessionTranscript;
export const captpHandoffGiveDesc = handoffGiveDesc;
export const captpHandoffTable = handoffTable;
export const captpImportObjectDesc = importObjectDesc;
export const captpOfferHandoffGift = offerHandoffGift;
export const captpOpenSession = openSession;
export const captpResolvePromise = resolvePromise;
export const captpStartSessionOp = startSessionOp;
export const captpTrackExport = trackExport;
export const captpVatCanInvoke = vatCanInvoke;
export const captpVatFromAuthorityGraph = vatFromAuthorityGraph;
