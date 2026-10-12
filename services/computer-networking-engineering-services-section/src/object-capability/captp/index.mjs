/**
 * captp holds pure Capability Transport Protocol reads over capability views, causal cuts, sessions, and vat tables.
 * It may import values, schema, records, logic, fixpoint, math, codecs, and sibling capability modules, but it must not import contracts, rendering, search, runtime, integrations, interfaces, or apps.
 */

import { assertNonemptyString as nonempty } from "@red-cup-engineering/json-services-section/assert-nonempty-string";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { causalHeightStrata } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/causal";
import { hasBoolPolarization } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/causal-polarization";

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

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
} from "./schema.mjs";
import {
  capabilityView,
  capabilityViewContract,
  capabilityViewFromObjectCapability,
  invokeCapabilityView,

} from "../index.mjs";
import { macaroonTokenContract } from "../macaroons.mjs";

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

function unique(values, label) {
  const out = [];
  for (const value of values) {
    const normalized = nonempty(value, label);
    if (!out.includes(normalized)) out.push(normalized);
  }
  if (out.length === 0) throw new TypeError(`${label}: expected at least one value`);
  return Object.freeze(out);
}

let CAPTP_PROMISE_SEQ = 0;
function freshPromise() {
  CAPTP_PROMISE_SEQ += 1;
  return `p:${CAPTP_PROMISE_SEQ}`;
}

/** `captpVectorClockSchema` has no `properties` (it's an `additionalProperties`-typed
 *  map), so `FromJsonSchema` gives it no field-level information to derive here — the
 *  hand-written map type IS the precise reading, not a second authored fact. */

/** Project an OCap view onto a CapTP/OCapN sturdy reference. */
export function sturdyRefFromCapabilityView(view) {
  const admitted = capabilityViewContract.assert(view, "CapTP sturdy ref capability view");
  return captpSturdyRefContract.assert(Object.freeze({
    kind: "captp.sturdy-ref",
    id: admitted.id,
    locus: admitted.grants,
    holder: admitted.holder,
  }), "CapTP sturdy ref");
}

/** Project a current object-capability contract onto a CapTP sturdy reference. */
export function sturdyRefFromObjectCapability(capability, action) {
  return sturdyRefFromCapabilityView(capabilityViewFromObjectCapability(capability, action));
}

/** Old CapTP `refOf` name, realized as a sturdy ref projected from a capability view. */
export function refOf(capability) {
  return sturdyRefFromCapabilityView(capability);
}

/** Old CapTP `refOfMacaroon` name, realized through the macaroon's carried capability view. */
export function refOfMacaroon(token) {
  const admitted = macaroonTokenContract.assert(token, "CapTP ref of macaroon");
  return sturdyRefFromCapabilityView(admitted.capability);
}

/** A root CapTP delivery to a sturdy reference. */
export function captpDeliver(target, method, args = [], answer) {
  const ref = captpSturdyRefContract.assert(target, "CapTP delivery target");
  return captpDeliveryContract.assert(Object.freeze({
    kind: "captp.delivery",
    target: ref.id,
    method: nonempty(method, "CapTP delivery method"),
    args: Object.freeze(args.map((arg) => requireJsonValue(arg, "CapTP delivery argument"))),
    answer: answer ?? freshPromise(),
  }), "CapTP delivery");
}

/** CapTP promise pipelining: deliver to a prior delivery's unresolved answer. */
export function captpPipeline(prior, method, args = [], answer) {
  const admitted = captpDeliveryContract.assert(prior, "CapTP pipeline prior");
  return captpDeliveryContract.assert(Object.freeze({
    kind: "captp.delivery",
    target: admitted.answer,
    method: nonempty(method, "CapTP pipeline method"),
    args: Object.freeze(args.map((arg) => requireJsonValue(arg, "CapTP pipeline argument"))),
    answer: answer ?? freshPromise(),
    pipelinedOn: admitted.answer,
  }), "CapTP pipelined delivery");
}

/** The two-step delivery that waits for the prior answer before targeting it. */
export function captpSequentialFollow(prior, follow) {
  const p = captpDeliveryContract.assert(prior, "CapTP sequential prior");
  const f = captpDeliveryContract.assert(follow, "CapTP sequential follow");
  return captpDeliveryContract.assert(Object.freeze({
    kind: "captp.delivery",
    target: p.answer,
    method: f.method,
    args: f.args,
    answer: f.answer,
  }), "CapTP sequential delivery");
}

/** Witness that a pipelined delivery composes to the same visible follow as the sequential cut. */
export function captpPipelineSequentialCutLaw(prior, follow) {
  const p = captpDeliveryContract.assert(prior, "CapTP pipeline law prior");
  const f = captpDeliveryContract.assert(follow, "CapTP pipeline law follow");
  const sequential = captpSequentialFollow(p, f);
  const reasons = [];
  if (f.pipelinedOn !== p.answer) reasons.push("follow-on delivery is not linked to the prior promise");
  if (f.target !== p.answer) reasons.push("follow-on target is not the prior answer promise");
  if (f.method !== sequential.method) reasons.push("pipelined and sequential methods differ");
  if (canonicalJson(f.args) !== canonicalJson(sequential.args)) {
    reasons.push("pipelined and sequential arguments differ");
  }
  const ok = reasons.length === 0;
  return captpPipelineJudgmentContract.assert(Object.freeze({
    kind: ok ? "captp.pipeline:witness" : "captp.pipeline-obstruction",
    prior: p,
    follow: f,
    sequential,
    ok,
    reasons: Object.freeze(reasons),
    savedRoundTrips: ok ? 1 : 0,
  }), "CapTP pipeline judgment");
}

/** Older CapTP result design reading, carried as a stable answer descriptor. */
export function resultDesign(delivery) {
  const admitted = captpDeliveryContract.assert(delivery, "CapTP result design delivery");
  return captpDescriptor({
    descriptorKind: "answer",
    id: admitted.answer,
    value: admitted,
  });
}

/** Older CapTP follow-on design reading, carried as the target promise descriptor. */
export function followOnDesign(delivery) {
  const admitted = captpDeliveryContract.assert(delivery, "CapTP follow-on design delivery");
  return captpDescriptor({
    descriptorKind: "answer",
    id: admitted.pipelinedOn ?? admitted.answer,
    value: admitted,
  });
}

/** Older composePipeline surface, now the pipelined delivery plus its law witness. */
export function composePipeline(prior, follow) {
  return Object.freeze({
    kind: "captp.pipeline-composition",
    prior: captpDeliveryContract.assert(prior, "CapTP composed prior"),
    follow: captpDeliveryContract.assert(follow, "CapTP composed follow"),
    judgment: captpPipelineSequentialCutLaw(prior, follow),
  });
}

/** Older composeSequentialCut surface, now the post-resolution delivery plus its law witness. */
export function composeSequentialCut(prior, follow) {
  const sequential = captpSequentialFollow(prior, follow);
  return Object.freeze({
    kind: "captp.sequential-cut",
    prior: captpDeliveryContract.assert(prior, "CapTP sequential cut prior"),
    follow: captpDeliveryContract.assert(follow, "CapTP sequential cut follow"),
    sequential: sequential,
    judgment: captpPipelineSequentialCutLaw(prior, follow),
  });
}

function captpGraphRead(
  refs,
  deliveries,
  heldLoci,
)

 {
  const admittedRefs = refs.map((ref) => captpSturdyRefContract.assert(ref, "CapTP authority graph ref"));
  const admittedDeliveries = deliveries.map((delivery) => captpDeliveryContract.assert(delivery, "CapTP authority graph delivery"));
  const held = new Set(heldLoci.map((locus) => nonempty(locus, "held CapTP locus")));
  const refById = new Map(admittedRefs.map((ref) => [ref.id, ref]));
  const reachable = new Set();
  const depthByAnswer = new Map();
  const statusByAnswer = new Map();
  const blocked = [];

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
  refs,
  deliveries,
  heldLoci = refs.map((ref) => ref.locus),
) {
  const admittedRefs = refs.map((ref) => captpSturdyRefContract.assert(ref, "CapTP authority graph ref"));
  const admittedDeliveries = deliveries.map((delivery) => captpDeliveryContract.assert(delivery, "CapTP authority graph delivery"));
  const read = captpGraphRead(admittedRefs, admittedDeliveries, heldLoci);
  const sequentialRoundTrips = Math.max(0, ...read.depthByAnswer.values());
  const pipelinedRoundTrips = read.reachablePromises.length === 0 ? 0 : 1;
  return captpAuthorityGraphContract.assert(Object.freeze({
    kind: "captp.authority-graph",
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
  }), "CapTP authority graph");
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
  refs,
  deliveries,
) {
  const admittedRefs = refs.map((ref) => captpSturdyRefContract.assert(ref, "CapTP polarization ref"));
  const admittedDeliveries = deliveries.map((delivery) => captpDeliveryContract.assert(delivery, "CapTP polarization delivery"));
  const events = new Set();
  const links = [];
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
  const causalSet = Object.freeze({
    kind: "lorentzian.causalSet",
    events: Object.freeze([...events]),
    links: Object.freeze(links),
  });
  return hasBoolPolarization(causalSet);
}

/** Project a CapTP authority graph into one ba-local turn trace with saved sequential turns exposed. */
export function captpTurnTraceFromAuthorityGraph(input

) {
  const graph = captpAuthorityGraphContract.assert(input.graph, "CapTP turn trace graph");
  const blockedByAnswer = new Map(graph.blocked.map((entry) => [entry.delivery.answer, entry.reason]));
  const reachable = new Set(graph.reachablePromises);
  const refIds = new Set(graph.refs.map((ref) => ref.id));
  const depthByAnswer = new Map();
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
      ? "blocked"
      : delivery.pipelinedOn === undefined
        ? "admitted"
        : "composed";
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
    kind: "captp.turn-trace",
    session: nonempty(input.session, "CapTP session"),
    vat: nonempty(input.vat, "CapTP vat"),
    ba: nonempty(input.ba, "CapTP ba"),
    events: Object.freeze(events),
    compression: graph.compression,
  }), "CapTP turn trace");
}

/** Build one append-only CapTP statement row. */
export function captpStatementRow(
  subject,
  predicate,
  object,
  at = new Date(0).toISOString(),
) {
  return captpStatementRowContract.assert(Object.freeze({
    kind: "captp.witness-row",
    subject: nonempty(subject, "CapTP witness subject"),
    predicate: nonempty(predicate, "CapTP witness predicate"),
    object: requireJsonValue(object, "CapTP witness object"),
    at: nonempty(at, "CapTP statement coordinate"),
  }), "CapTP statement row");
}

export function captpStandingKey(row) {
  const admitted = captpStatementRowContract.assert(row, "CapTP standing key row");
  return `${admitted.subject}|${admitted.predicate}|${canonicalJson(admitted.object)}`;
}

/**
 * Bridge a `CapTpStatementRow` (already E/A/V/T-shaped, but a local package type
 * that has never crossed into the statement log) into a real `EAVT` tuple. This is the pure
 * half of witnessing CapTP moves: it does not touch the filesystem or any
 * service; a caller with `dataRoot` access passes the result to
 * `extend` (`@red-cup-engineering/semiotic-eavt-services-section/store`)
 * to make the move durable and replayable.
 */
export function captpStatementRowToEavt(row) {
  const admitted = captpStatementRowContract.assert(row, "CapTP EAVT row");
  return [admitted.subject, admitted.predicate, admitted.object, admitted.at];
}

/** Project an authority graph into statement rows for refs, deliveries, blocked cuts, and compression. */
export function captpStatementLog(graph, at) {
  const admitted = captpAuthorityGraphContract.assert(graph, "CapTP witness graph");
  return Object.freeze([
    ...admitted.refs.map((ref) => captpStatementRow(ref.id, "captp.ref.locus", ref.locus, at)),
    ...admitted.deliveries.map((delivery) => captpStatementRow(delivery.answer, "captp.delivery", delivery, at)),
    ...admitted.blocked.map((entry) => captpStatementRow(entry.delivery.answer, "captp.blocked", entry.reason, at)),
    captpStatementRow("captp.compression", "captp.saved-round-trips", admitted.compression, at),
  ]);
}

/** Project a turn trace into statement rows over the ba-local event sequence. */
export function captpTurnTraceStatementLog(trace, at) {
  const admitted = captpTurnTraceContract.assert(trace, "CapTP turn trace witness");
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
export function vectorClock(entries = {}) {
  const out = {};
  for (const [actor, count] of Object.entries(entries)) {
    const admittedActor = nonempty(actor, "CapTP vector-clock actor");
    if (!Number.isFinite(count) || count < 0) throw new TypeError("vectorClock: counts must be non-negative finite numbers");
    if (count > 0) out[admittedActor] = count;
  }
  return Object.freeze(out);
}

export function tickVectorClock(clock, actor) {
  const admittedActor = nonempty(actor, "CapTP vector-clock actor");
  return vectorClock({ ...clock, [admittedActor]: (clock[admittedActor] ?? 0) + 1 });
}

export function mergeVectorClocks(...clocks) {
  const merged = {};
  for (const clock of clocks) {
    for (const [actor, count] of Object.entries(clock)) merged[actor] = Math.max(merged[actor] ?? 0, count);
  }
  return vectorClock(merged);
}

/** Order two vector clocks: before, after, equal, or concurrent. */
export function compareVectorClocks(left, right) {
  let less = false;
  let greater = false;
  for (const actor of new Set([...Object.keys(left), ...Object.keys(right)])) {
    const leftValue = left[actor] ?? 0;
    const rightValue = right[actor] ?? 0;
    if (leftValue < rightValue) less = true;
    if (leftValue > rightValue) greater = true;
  }
  if (less && greater) return "concurrent";
  if (less) return "before";
  if (greater) return "after";
  return "equal";
}

/** Read turn traces as a cross-vat causal frontier. */
export function causalFrontierFromTurnTraces(
  traces,
  session = traces[0]?.session ?? "captp:session",
) {
  let frontier = vectorClock();
  const localClocks = new Map();
  const events = [];
  for (const trace of traces) {
    const admitted = captpTurnTraceContract.assert(trace, "CapTP causal trace");
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
    kind: "captp.causal-frontier",
    session: nonempty(session, "CapTP causal frontier session"),
    events: Object.freeze(events),
    frontier,
  }), "CapTP causal frontier");
}

export function causalFrontierStatementLog(frontier, at) {
  const admitted = captpCausalFrontierContract.assert(frontier, "CapTP causal frontier witness");
  return Object.freeze([
    ...admitted.events.map((event) => captpStatementRow(event.id, `captp.causal.${event.status}`, event.clock, at)),
    captpStatementRow(`${admitted.session}:frontier`, "captp.causal.frontier", admitted.frontier, at),
  ]);
}

/** Read held refs and reachable promises as the ba-local authority place. */
export function authorityBa(holder, place, graph) {
  const admitted = captpAuthorityGraphContract.assert(graph, "CapTP authority ba graph");
  return Object.freeze({
    kind: "captp.authority-ba",
    holder: nonempty(holder, "CapTP ba holder"),
    place: nonempty(place, "CapTP ba place"),
    heldRefs: admitted.refs,
    reachablePromises: admitted.reachablePromises,
  });
}

function baObservableIds(ba) {
  return new Set([...ba.heldRefs.map((ref) => ref.id), ...ba.reachablePromises]);
}

/** Project a distributed causal frontier through one ba's held refs/promises. */
export function baCausalFrame(ba, frontier) {
  const admitted = captpCausalFrontierContract.assert(frontier, "CapTP ba causal frontier");
  const ids = baObservableIds(ba);
  const events = admitted.events.map((event) => {
    const situated = event.ba === ba.place || ids.has(event.delivery.target) || ids.has(event.delivery.answer);
    return Object.freeze({
      kind: "captp.ba-causal-event",
      event,
      status: situated ? "situated" : "outside",
      ...(situated ? {} : { reason: "event is outside this ba's held refs and reachable promises" }),
    });
  });
  const observed = events.filter((event) => event.status === "situated").map((event) => event.event);
  const outside = events.filter((event) => event.status === "outside").map((event) => event.event);
  return Object.freeze({
    kind: "captp.ba-causal-frame",
    holder: ba.holder,
    place: ba.place,
    events: Object.freeze(events),
    observed: Object.freeze(observed),
    outside: Object.freeze(outside),
    clock: mergeVectorClocks(...observed.map((event) => event.clock)),
    frontier: admitted.frontier,
  });
}

export function baCausalFrameStatementLog(frame, at) {
  return Object.freeze(frame.events.map((event) => captpStatementRow(
    `${frame.place}:${event.event.id}`,
    `captp.ba-causal.${event.status}`,
    {
      holder: frame.holder,
      place: frame.place,
      event: event.event.id,
      clock: event.event.clock,
      ...(event.reason === undefined ? {} : { reason: event.reason }),
    },
    at,
  )));
}

function eventResources(event) {
  return new Set([event.vat, event.ba, event.delivery.target, event.delivery.answer]);
}

/** CapTP event independence: concurrent/equal vector time and disjoint touched resources. */
export function capTpEventsIndependent(left, right) {
  const order = compareVectorClocks(left.clock, right.clock);
  if (order !== "concurrent" && order !== "equal") return false;
  const leftResources = eventResources(left);
  for (const resource of eventResources(right)) if (leftResources.has(resource)) return false;
  return true;
}

function concurrentTraceLayer(index, events) {
  return Object.freeze({
    kind: "captp.concurrent-trace-layer",
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
export function concurrentTraceFromCausalFrontier(frontier) {
  const admitted = captpCausalFrontierContract.assert(frontier, "CapTP concurrent frontier");
  const events = admitted.events;
  const byId = new Map(events.map((event) => [event.id, event]));
  const links = [];
  for (const left of events) {
    for (const right of events) {
      if (left !== right && compareVectorClocks(left.clock, right.clock) === "before") links.push({ from: left.id, to: right.id });
    }
  }
  const strata = causalHeightStrata(Object.freeze({
    kind: "lorentzian.causalSet",
    events: events.map((event) => event.id),
    links: Object.freeze(links),
  }));
  if (!Array.isArray(strata)) {
    const obstruction = strata

;
    const location = obstruction.cycle.length > 0
      ? ` cycle ${obstruction.cycle.join(" -> ")}`
      : obstruction.offending === undefined ? "" : ` at ${obstruction.offending.from} -> ${obstruction.offending.to}`;
    throw new TypeError(`concurrentTraceFromCausalFrontier: inconsistent vector clocks (${obstruction.reason}` +
      `${location})`);
  }

  const layers = [];
  for (const tier of strata) {
    let group = [];
    for (const id of tier) {
      const event = byId.get(id);
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
    kind: "captp.concurrent-trace",
    layers: Object.freeze(layers),
    frontier: admitted.frontier,
    width: layers.reduce((max, layer) => Math.max(max, layer.events.length), 0),
    depth: layers.length,
  });
}

export function concurrentTraceStatementLog(trace, at) {
  return Object.freeze(trace.layers.flatMap((layer) => layer.events.map((event) => captpStatementRow(
    `captp.concurrent:${layer.index}:${event.id}`,
    "captp.concurrent-trace",
    { layer: layer.index, event: event.id, width: trace.width, depth: trace.depth, clock: event.clock },
    at,
  ))));
}

function eventSelectedByClock(event, clock) {
  return compareVectorClocks(event.clock, clock) === "before" || compareVectorClocks(event.clock, clock) === "equal";
}

function causalCutFromSelected(frontier, clock, selected) {
  const selectedIds = new Set(selected.map((event) => event.id));
  const byAnswer = new Map(frontier.events.map((event) => [event.delivery.answer, event]));
  const violations = [];
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
    kind: "captp.causal-cut",
    session: frontier.session,
    status: violations.length === 0 ? "consistent" : "inconsistent",
    clock,
    selected: Object.freeze([...selectedIds]),
    violations: Object.freeze(violations),
  }), "CapTP causal cut");
}

export function causalCutFromClock(frontier, clock) {
  const admitted = captpCausalFrontierContract.assert(frontier, "CapTP causal cut frontier");
  const admittedClock = vectorClock({ ...clock });
  const selected = admitted.events.filter((event) => eventSelectedByClock(event, admittedClock));
  return causalCutFromSelected(admitted, admittedClock, selected);
}

export function causalCutFromSelection(frontier, selected) {
  const admitted = captpCausalFrontierContract.assert(frontier, "CapTP causal cut selection frontier");
  const selectedSet = new Set(selected.map((id) => nonempty(id, "CapTP selected event")));
  const selectedEvents = admitted.events.filter((event) => selectedSet.has(event.id));
  const clock = mergeVectorClocks(...selectedEvents.map((event) => event.clock));
  return causalCutFromSelected(admitted, clock, selectedEvents);
}

export function causalCutStatementLog(cut, at) {
  const admitted = captpCausalCutContract.assert(cut, "CapTP causal cut witness");
  return Object.freeze([
    captpStatementRow(`${admitted.session}:cut`, `captp.cut.${admitted.status}`, {
      clock: admitted.clock,
      selected: admitted.selected,
    }, at),
    ...admitted.violations.map((violation) => captpStatementRow(violation.event, "captp.cut.violation", violation, at)),
  ]);
}

function presenceForPromise(vat, id) {
  return vat.presences.find((presence) => presence.presenceKind === "promise" && (presence.id === id || presence.promise === id));
}

function cutPromiseStatus(presence) {
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
export function causalCutQuiescence(cut, vat, frontier) {
  const admittedCut = captpCausalCutContract.assert(cut, "CapTP quiescence cut");
  const admittedVat = captpVatTableContract.assert(vat, "CapTP quiescence vat");
  const byId = new Map((frontier?.events ?? []).map((event) => [event.id, event]));
  const byAnswer = new Map((frontier?.events ?? []).map((event) => [event.delivery.answer, event]));
  const promises = admittedCut.selected.map((id) => {
    const event = byId.get(id);
    const promiseId = event?.delivery.answer ?? id;
    const presence = presenceForPromise(admittedVat, promiseId);
    const status = cutPromiseStatus(presence);
    return Object.freeze({
      kind: "captp.cut-promise-state",
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
      kind: "captp.cut-promise-state",
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
    ? "inconsistent"
    : pending.length === 0 ? "quiescent" : "active";
  return Object.freeze({
    kind: "captp.cut-quiescence",
    status,
    cut: admittedCut,
    vat: admittedVat,
    promises: Object.freeze(promises),
    pending: Object.freeze(pending),
    terminal: Object.freeze(terminal),
  });
}

export function causalCutQuiescenceStatementLog(quiescence, at) {
  return Object.freeze([
    captpStatementRow(`${quiescence.vat.session}:quiescence`, `captp.quiescence.${quiescence.status}`, {
      pending: quiescence.pending.map((state) => state.id),
      terminal: quiescence.terminal.map((state) => state.id),
    }, at),
    ...quiescence.promises.map((state) => captpStatementRow(state.id, `captp.quiescence.promise.${state.status}`, state, at)),
  ]);
}

function descendantsInVat(id, vat) {
  return Object.freeze(vat.presences.filter((presence) => presence.target === id || presence.ref?.id === id));
}

/** Termination/settlement reading for an invocation tree at a causal cut. */
export function resolveInvocation(cut, vat, root, frontier) {
  const quiescence = causalCutQuiescence(cut, vat, frontier);
  const debts = quiescence.pending.map((state) => Object.freeze({
    kind: "captp.invocation-debt",
    id: state.id,
    descendants: descendantsInVat(state.id, vat).map((presence) => presence.id),
    reason: state.reason ?? "promise has not reached terminal settlement",
  }));
  const failed = quiescence.promises.filter((state) => state.status === "failed" || state.status === "blocked");
  const terminal = quiescence.promises.filter((state) => state.status === "resolved" || state.status === "released");
  const status = cut.status === "inconsistent"
    ? "inconsistent"
    : debts.length > 0 ? "active" : failed.length > 0 ? "failed" : "terminated";
  return Object.freeze({
    kind: "captp.invocation-settlement",
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

export function invocationResultStatementLog(settlement, at) {
  return Object.freeze([
    captpStatementRow(settlement.root ?? `${settlement.vat.session}:settlement`, `captp.invocation-settlement.${settlement.status}`, {
      debts: settlement.debts.map((debt) => debt.id),
      failed: settlement.failed.map((state) => state.id),
      terminal: settlement.terminal.map((state) => state.id),
    }, at),
    ...settlement.debts.map((debt) => captpStatementRow(debt.id, "captp.invocation-debt", debt, at)),
  ]);
}

/** Distributed-GC reading: which promises can retire after settlement. */
export function promiseRetirementCertificate(
  settlement,
  promiseIds = settlement.quiescence.promises.map((state) => state.id),
) {
  const selected = new Set(promiseIds);
  const byState = new Map(settlement.quiescence.promises.map((state) => [state.id, state]));
  const items = promiseIds.map((id) => {
    const state = byState.get(id);
    const presence = state?.presence ?? presenceForPromise(settlement.vat, id);
    const descendants = descendantsInVat(id, settlement.vat).map((entry) => entry.id);
    const blockers = [];
    if (settlement.status === "inconsistent") blockers.push("settlement cut is inconsistent");
    if (state === undefined) blockers.push("promise is absent from the settlement cut");
    if (state?.status === "pending" || state?.status === "missing") blockers.push("promise has not reached terminal settlement");
    for (const descendant of descendants) if (!selected.has(descendant)) blockers.push(`descendant presence is outside the certificate: ${descendant}`);
    return Object.freeze({
      kind: "captp.promise-retirement-item",
      id,
      ...(presence === undefined ? {} : { presence }),
      descendants: Object.freeze(descendants),
      blockers: Object.freeze([...new Set(blockers)]),
      status: blockers.length === 0 ? "retirable" : "retained",
    });
  });
  const retirable = items.filter((item) => item.status === "retirable");
  const retained = items.filter((item) => item.status === "retained");
  return Object.freeze({
    kind: "captp.promise-retirement-certificate",
    status: retained.length === 0 ? "retirable" : "retained",
    settlement,
    items: Object.freeze(items),
    retirable: Object.freeze(retirable),
    retained: Object.freeze(retained),
  });
}

export function promiseRetirementStatementLog(certificate, at) {
  return Object.freeze([
    captpStatementRow(certificate.settlement.root ?? `${certificate.settlement.vat.session}:retirement`, `captp.promise-retirement.${certificate.status}`, {
      retirable: certificate.retirable.map((item) => item.id),
      retained: certificate.retained.map((item) => item.id),
    }, at),
    ...certificate.items.map((item) => captpStatementRow(item.id, `captp.promise-retirement.item.${item.status}`, item, at)),
  ]);
}

/** Read an authority graph as a vat presence table of imports, exports, and promises. */
export function vatFromAuthorityGraph(session, graph) {
  const admitted = captpAuthorityGraphContract.assert(graph, "CapTP vat graph");
  const blocked = new Map(admitted.blocked.map((entry) => [entry.delivery.answer, entry.reason]));
  const presences = [
    ...admitted.refs.map((ref) => Object.freeze({
      id: ref.id,
      presenceKind: "export",
      status: "live",
      ref,
    })),
    ...admitted.deliveries.map((delivery) => {
      const reason = blocked.get(delivery.answer);
      return Object.freeze({
        id: delivery.answer,
        presenceKind: "promise",
        status: reason === undefined ? "live" : "blocked",
        promise: delivery.answer,
        target: delivery.target,
        ...(reason === undefined ? {} : { reason }),
      });
    }),
  ];
  return captpVatTableContract.assert(Object.freeze({
    kind: "captp.vat-table",
    session: nonempty(session, "CapTP vat session"),
    presences: Object.freeze(presences),
  }), "CapTP vat table");
}

function updateVatPresence(vat, id, update) {
  const admitted = captpVatTableContract.assert(vat, "CapTP vat update");
  const target = nonempty(id, "CapTP vat presence id");
  return captpVatTableContract.assert(Object.freeze({
    kind: "captp.vat-table",
    session: admitted.session,
    presences: Object.freeze(admitted.presences.map((presence) => presence.id === target ? Object.freeze({ ...presence, ...update }) : presence)),
  }), "CapTP vat table update");
}

export function dropPresence(vat, id) {
  return updateVatPresence(vat, id, { status: "dropped" });
}

export function resolvePromise(vat, promise, resolvedTo) {
  const ref = captpSturdyRefContract.assert(resolvedTo, "CapTP resolved ref");
  return updateVatPresence(vat, promise, { status: "settled", target: ref.id });
}

export function breakPromise(vat, promise, reason) {
  return updateVatPresence(vat, promise, { status: "broken", reason: nonempty(reason, "CapTP break reason") });
}

export function vatCanInvoke(vat, id) {
  const admitted = captpVatTableContract.assert(vat, "CapTP vat invocation");
  const presence = admitted.presences.find((entry) => entry.id === id);
  return presence !== undefined && (presence.status === "live" || presence.status === "settled");
}

export function vatStatementLog(vat, at) {
  const admitted = captpVatTableContract.assert(vat, "CapTP vat witness");
  return Object.freeze(admitted.presences.map((presence) => captpStatementRow(
    `${admitted.session}:${presence.id}`,
    `captp.vat.${presence.presenceKind}.${presence.status}`,
    presence,
    at,
  )));
}

/** Start or continue a CapTP handoff table. */
export function handoffTable(session, gifts = []) {
  return captpHandoffTableContract.assert(Object.freeze({
    kind: "captp.handoff-table",
    session: nonempty(session, "CapTP handoff session"),
    gifts: Object.freeze(gifts),
  }), "CapTP handoff table");
}

export function offerHandoffGift(table, input

) {
  const admitted = captpHandoffTableContract.assert(table, "CapTP handoff offer");
  const gift = Object.freeze({
    id: nonempty(input.id, "CapTP handoff gift id"),
    from: nonempty(input.from, "CapTP handoff from"),
    to: nonempty(input.to, "CapTP handoff to"),
    ref: captpSturdyRefContract.assert(input.ref, "CapTP handoff ref"),
    status: "offered",
  });
  return handoffTable(admitted.session, Object.freeze([...admitted.gifts, gift]));
}

function setHandoffGiftStatus(table, id, status) {
  const admitted = captpHandoffTableContract.assert(table, "CapTP handoff status");
  const target = nonempty(id, "CapTP handoff gift id");
  return handoffTable(admitted.session, Object.freeze(admitted.gifts.map((gift) => gift.id === target ? Object.freeze({ ...gift, status }) : gift)));
}

export function depositHandoffGift(table, id) {
  return setHandoffGiftStatus(table, id, "deposited");
}

export function withdrawHandoffGift(table, id) {
  return setHandoffGiftStatus(table, id, "withdrawn");
}

export function handoffStatementLog(table, at) {
  const admitted = captpHandoffTableContract.assert(table, "CapTP handoff witness");
  return Object.freeze(admitted.gifts.map((gift) => captpStatementRow(
    `${admitted.session}:${gift.id}`,
    `captp.handoff.${gift.status}`,
    gift,
    at,
  )));
}

/** Read CapTP wire descriptors as an explicit descriptor contract. */
export function captpDescriptor(input

) {
  return captpDescriptorContract.assert(Object.freeze({
    kind: "captp.descriptor",
    descriptorKind: input.descriptorKind,
    id: nonempty(input.id, "CapTP descriptor id"),
    ...(input.session === undefined ? {} : { session: nonempty(input.session, "CapTP descriptor session") }),
    ...(input.position === undefined ? {} : { position: input.position }),
    ...(input.value === undefined ? {} : { value: requireJsonValue(input.value, "CapTP descriptor value") }),
  }), "CapTP descriptor");
}

export function importObjectDesc(session, position, id = `import-object:${position}`) {
  return captpDescriptor({ descriptorKind: "import-object", session, position, id });
}

export function importPromiseDesc(session, position, id = `import-promise:${position}`) {
  return captpDescriptor({ descriptorKind: "import-promise", session, position, id });
}

export function exportDesc(session, position, id = `export:${position}`) {
  return captpDescriptor({ descriptorKind: "export", session, position, id });
}

export function answerDesc(session, position, id = `answer:${position}`) {
  return captpDescriptor({ descriptorKind: "answer", session, position, id });
}

export function sigEnvelope(id, value) {
  return captpDescriptor({ descriptorKind: "signature", id, value });
}

export function handoffGiveDesc(gift) {
  return captpDescriptor({
    descriptorKind: "handoff-give",
    id: `handoff-give:${gift.id}`,
    session: gift.id,
    value: gift,
  });
}

export function handoffReceiveDesc(input

) {
  return captpDescriptor({
    descriptorKind: "handoff-receive",
    id: `handoff-receive:${nonempty(input.receivingSession, "CapTP receiving session")}:${input.handoffCount}`,
    session: input.receivingSession,
    position: input.handoffCount,
    value: {
      receivingSide: nonempty(input.receivingSide, "CapTP receiving side"),
      signedGive: captpDescriptorContract.assert(input.signedGive, "CapTP signed give"),
    },
  });
}

export function descriptorStandingKey(descriptor) {
  const admitted = captpDescriptorContract.assert(descriptor, "CapTP descriptor key");
  return `${admitted.descriptorKind}:${admitted.session ?? "no-session"}:${admitted.position ?? admitted.id}`;
}

function candidateRefIds(candidates) {
  return Object.freeze(candidates.map((candidate) => candidate.ref.id));
}

/** CapTP reference equality/join as held-power evidence over vat presences. */
export function joinReferences(candidates, vats = []) {
  const admitted = candidates.map((candidate) => Object.freeze({
    ref: captpSturdyRefContract.assert(candidate.ref, "CapTP reference join ref"),
    ...(candidate.descriptor === undefined ? {} : { descriptor: captpDescriptorContract.assert(candidate.descriptor, "CapTP reference join descriptor") }),
    ...(candidate.via === undefined ? {} : { via: nonempty(candidate.via, "CapTP reference join via") }),
  }));
  if (admitted.length < 2) return Object.freeze({
    kind: "captp.reference-join",
    status: "blocked",
    candidates: Object.freeze(admitted),
    joinedRefs: candidateRefIds(admitted),
    reason: "at least two references are required",
  });
  const first = admitted[0];
  if (first === undefined) throw new TypeError("joinReferences: missing first candidate");
  const mismatch = admitted.find((candidate) => candidate.ref.locus !== first.ref.locus);
  if (mismatch !== undefined) return Object.freeze({
    kind: "captp.reference-join",
    status: "blocked",
    locus: first.ref.locus,
    candidates: Object.freeze(admitted),
    joinedRefs: candidateRefIds(admitted),
    reason: "references do not share a locus",
  });
  const live = new Set(vats.flatMap((vat) => vat.presences.filter((presence) => presence.status === "live" || presence.status === "settled").flatMap((presence) => [
    presence.id,
    presence.ref?.id,
    presence.target,
  ].filter((value) => typeof value === "string"))));
  const unheld = vats.length === 0 ? undefined : admitted.find((candidate) => !live.has(candidate.ref.id));
  if (unheld !== undefined) return Object.freeze({
    kind: "captp.reference-join",
    status: "blocked",
    locus: first.ref.locus,
    candidates: Object.freeze(admitted),
    joinedRefs: candidateRefIds(admitted),
    reason: `reference is not live in supplied vat tables: ${unheld.ref.id}`,
  });
  return Object.freeze({
    kind: "captp.reference-join",
    status: "joined",
    locus: first.ref.locus,
    candidates: Object.freeze(admitted),
    joinedRefs: candidateRefIds(admitted),
  });
}

export function refJoinStandingKey(join) {
  return ["captp.reference-join", join.status, join.locus ?? "", [...join.joinedRefs].sort().join(",")].join("|");
}

export function refJoinStatementLog(join, at) {
  return Object.freeze(join.candidates.map((candidate) => captpStatementRow(
    candidate.ref.id,
    `captp.reference-join.${join.status}`,
    {
      locus: join.locus,
      joinedRefs: join.joinedRefs,
      via: candidate.via,
      descriptor: candidate.descriptor === undefined ? undefined : descriptorStandingKey(candidate.descriptor),
      reason: join.reason,
    },
    at,
  )));
}

export function startSessionOp(local, remote) {
  return Object.freeze({
    kind: "captp.op.start-session",
    local: nonempty(local, "CapTP local side"),
    remote: nonempty(remote, "CapTP remote side"),
  });
}

export function captpPublicIdentifier(publicKeyMaterial) {
  const material = typeof publicKeyMaterial === "string"
    ? publicKeyMaterial
    : Array.from(publicKeyMaterial).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `captp:public:${canonicalJson(nonempty(material, "CapTP public key material"))}`;
}

export function captpSessionIdentifier(leftPublicIdentifier, rightPublicIdentifier) {
  const left = nonempty(leftPublicIdentifier, "CapTP left public identifier");
  const right = nonempty(rightPublicIdentifier, "CapTP right public identifier");
  return `captp:session:${[left, right].sort().join(":")}`;
}

function compareIdentifiers(left, right) {
  return nonempty(left, "CapTP left identifier").localeCompare(nonempty(right, "CapTP right identifier"));
}

export function openSession(input

) {
  const session = input.session ?? captpSessionIdentifier(input.local, input.remote);
  return foldSessionTranscript(session, [startSessionOp(input.local, input.remote)]);
}

export function receiveStartSession(transcript, operation, remoteSide) {
  const admitted = captpSessionTranscriptContract.assert(transcript, "CapTP receive start transcript");
  const received = requireJsonValue({
    kind: "captp.op.receive-start-session",
    operation,
    ...(remoteSide === undefined ? {} : { remoteSide }),
  }, "CapTP receive start operation");
  return foldSessionTranscript(admitted.session, Object.freeze([...admitted.operations, received]));
}

export function resolveCrossedHellos(
  local,
  remote,
  localPublicIdentifier,
  remotePublicIdentifier,
) {
  const admittedLocal = captpSessionTranscriptContract.assert(local, "CapTP crossed hello local");
  const admittedRemote = captpSessionTranscriptContract.assert(remote, "CapTP crossed hello remote");
  const comparison = compareIdentifiers(localPublicIdentifier, remotePublicIdentifier);
  const winner = comparison > 0 ? "local" : comparison < 0 ? "remote" : "tie";
  const kept = winner === "remote" ? admittedRemote : admittedLocal;
  const droppedBase = winner === "remote" ? admittedLocal : admittedRemote;
  const dropped = droppedBase.status === "aborted" ? droppedBase : abortSession(droppedBase, "crossed hello dropped");
  return Object.freeze({
    kind: "captp.crossed-hello-resolution",
    winner,
    kept,
    dropped,
    localPublicIdentifier: nonempty(localPublicIdentifier, "CapTP local public identifier"),
    remotePublicIdentifier: nonempty(remotePublicIdentifier, "CapTP remote public identifier"),
    reason: winner === "tie" ? "crossed hellos have identical public identifiers" : "crossed hellos resolved by public identifier order",
  });
}

export function deliverOp(delivery) {
  const admitted = captpDeliveryContract.assert(delivery, "CapTP deliver operation");
  return Object.freeze({ kind: "captp.op.deliver", delivery: admitted });
}

export function listenOp(promise) {
  return Object.freeze({ kind: "captp.op.listen", promise: nonempty(promise, "CapTP listen promise") });
}

export function fulfillResolverOp(resolverDesc, value) {
  return Object.freeze({
    kind: "captp.op.fulfill-resolver",
    resolver: captpDescriptorContract.assert(resolverDesc, "CapTP resolver descriptor"),
    value: requireJsonValue(value, "CapTP fulfillment value"),
  });
}

export function breakResolverOp(resolverDesc, reason) {
  return Object.freeze({
    kind: "captp.op.break-resolver",
    resolver: captpDescriptorContract.assert(resolverDesc, "CapTP resolver descriptor"),
    reason: requireJsonValue(reason, "CapTP break reason"),
  });
}

export function getOp(receiverDesc, fieldName, newAnswerPos) {
  return Object.freeze({
    kind: "captp.op.get",
    receiver: captpDescriptorContract.assert(receiverDesc, "CapTP get receiver"),
    fieldName: nonempty(fieldName, "CapTP get field"),
    newAnswerPos,
  });
}

export function indexOp(receiverDesc, index, newAnswerPos) {
  return Object.freeze({
    kind: "captp.op.index",
    receiver: captpDescriptorContract.assert(receiverDesc, "CapTP index receiver"),
    index,
    newAnswerPos,
  });
}

export function untagOp(receiverDesc, tag, newAnswerPos) {
  return Object.freeze({
    kind: "captp.op.untag",
    receiver: captpDescriptorContract.assert(receiverDesc, "CapTP untag receiver"),
    tag: nonempty(tag, "CapTP untag tag"),
    newAnswerPos,
  });
}

export function bootstrapFetchOp(path, answerPos = 0) {
  return Object.freeze({ kind: "captp.op.bootstrap-fetch", path: nonempty(path, "CapTP bootstrap path"), answerPos });
}

export function bootstrapDepositGiftOp(gift, objectPosition) {
  return Object.freeze({
    kind: "captp.op.bootstrap-deposit-gift",
    gift: gift,
    objectPosition,
  });
}

export function bootstrapWithdrawGiftOp(giftId, handoffCount, answerPos = 0) {
  return Object.freeze({
    kind: "captp.op.bootstrap-withdraw-gift",
    giftId: nonempty(giftId, "CapTP gift id"),
    handoffCount,
    answerPos,
  });
}

export function gcAnswersOp(answerPositions) {
  return Object.freeze({ kind: "captp.op.gc-answers", answerPositions: Object.freeze([...answerPositions]) });
}

export function gcExportsOp(exportPositions, wireDeltas = []) {
  return Object.freeze({
    kind: "captp.op.gc-exports",
    exportPositions: Object.freeze([...exportPositions]),
    wireDeltas: Object.freeze([...wireDeltas]),
  });
}

export function abortOp(reason) {
  return Object.freeze({ kind: "captp.op.abort", reason: nonempty(reason, "CapTP abort reason") });
}

export function abortSession(transcript, reason) {
  const admitted = captpSessionTranscriptContract.assert(transcript, "CapTP abort session transcript");
  return foldSessionTranscript(admitted.session, Object.freeze([...admitted.operations, abortOp(reason)]));
}

function operationKind(operation) {
  if (typeof operation === "object" && operation !== null && !Array.isArray(operation)) {
    const record = operation;
    if (typeof record.kind === "string") return record.kind;
  }
  return "captp.op.unknown";
}

/** Fold CapTP operations into a finite session transcript object. */
export function foldSessionTranscript(session, operations) {
  const admittedOperations = Object.freeze(operations.map((operation) => requireJsonValue(operation, "CapTP transcript operation")));
  const blocked = [];
  const counters = {};
  let status = "live";
  for (const operation of admittedOperations) {
    const kind = operationKind(operation);
    counters[kind] = (counters[kind] ?? 0) + 1;
    if (kind === "captp.op.abort") status = "aborted";
    if (kind === "captp.op.deliver") {
      const delivery = (operation).delivery;
      if (delivery?.target === undefined) blocked.push(Object.freeze({ operation, reason: "deliver operation lacks target" }));
    }
  }
  return captpSessionTranscriptContract.assert(Object.freeze({
    kind: "captp.session-transcript",
    session: nonempty(session, "CapTP transcript session"),
    status,
    operations: admittedOperations,
    blocked: Object.freeze(blocked),
    counters: vectorClock(counters),
  }), "CapTP session transcript");
}

export function sessionTranscriptStatementLog(transcript, at) {
  const admitted = captpSessionTranscriptContract.assert(transcript, "CapTP transcript witness");
  return Object.freeze([
    captpStatementRow(`${admitted.session}:transcript`, `captp.session.${admitted.status}`, admitted.counters, at),
    ...admitted.blocked.map((blocked) => captpStatementRow(`${admitted.session}:blocked`, "captp.session.blocked", blocked, at)),
  ]);
}

export function sessionStatementLog(session, at) {
  const admitted = captpSessionTranscriptContract.assert(session, "CapTP session witness");
  return Object.freeze([
    captpStatementRow(admitted.session, `captp.session.${admitted.status}`, {
      operations: admitted.operations.length,
      counters: admitted.counters,
      blocked: admitted.blocked.length,
    }, at),
  ]);
}

export function crossedHelloStatementLog(resolution, at) {
  return Object.freeze([
    captpStatementRow(resolution.kept.session, "captp.crossed-hello.kept", {
      winner: resolution.winner,
      localPublicIdentifier: resolution.localPublicIdentifier,
      remotePublicIdentifier: resolution.remotePublicIdentifier,
      reason: resolution.reason,
    }, at),
    captpStatementRow(resolution.dropped.session, "captp.crossed-hello.dropped", {
      winner: resolution.winner,
      reason: resolution.reason,
    }, at),
  ]);
}

export function commitSessionTranscript(transcript, seed = "captp:genesis") {
  const admitted = captpSessionTranscriptContract.assert(transcript, "CapTP transcript commit");
  const commit = `captp:commit:${canonicalJson({ seed, transcript: admitted })}`;
  return Object.freeze([
    captpStatementRow(`${admitted.session}:commit`, "captp.session.commit", commit),
    ...sessionTranscriptStatementLog(admitted),
  ]);
}

export const transcriptCommitStatementLog = (chain) => Object.freeze([...chain]);

export function captpLibp2pTransportProjection(input

) {
  const roster = unique(input.roster, "CapTP libp2p roster");
  const rosterSet = new Set(roster);
  const violations = [];
  const streams = Object.freeze(input.streams.map((stream, index) => {
    const source = nonempty(stream.source, "CapTP libp2p stream source");
    const target = nonempty(stream.target, "CapTP libp2p stream target");
    const protocol = nonempty(stream.protocol ?? "/captp/1.0.0", "CapTP libp2p stream protocol");
    if (!rosterSet.has(source)) violations.push(`stream source is not in roster: ${source}`);
    if (!rosterSet.has(target)) violations.push(`stream target is not in roster: ${target}`);
    if (!protocol.includes("captp")) violations.push(`stream protocol does not name CapTP: ${protocol}`);
    const delivery = captpDeliveryContract.assert(stream.delivery, "CapTP libp2p stream delivery");
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
      ...(entry.delivery === undefined ? {} : { delivery: captpDeliveryContract.assert(entry.delivery, `CapTP libp2p pubsub delivery ${index}`) }),
    });
  }));
  return captpTransportProjectionContract.assert(Object.freeze({
    kind: "captp.transport-projection",
    transport: "libp2p",
    session: nonempty(input.session, "CapTP libp2p transport session"),
    swarm: nonempty(input.swarm, "CapTP libp2p swarm"),
    roster,
    streams,
    pubsub,
    status: violations.length === 0 ? "admitted" : "obstructed",
    violations: Object.freeze(violations),
  }), "CapTP libp2p transport projection");
}

export function captpLibp2pTransportFromSession(
  session,
  input

,
) {
  const admitted = captpSessionTranscriptContract.assert(session, "CapTP transport transcript");
  const deliveries = admitted.operations
    .filter((operation) => operationKind(operation) === "captp.op.deliver")
    .map((operation) => ((operation).delivery))
    .filter((delivery) => delivery !== undefined);
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

export function captpTransportStatementLog(projection, at) {
  const admitted = captpTransportProjectionContract.assert(projection, "CapTP transport witness projection");
  return Object.freeze([
    captpStatementRow(`${admitted.session}:transport:${admitted.swarm}`, `captp.transport.${admitted.status}`, {
      transport: admitted.transport,
      roster: admitted.roster,
      streams: admitted.streams.map((stream) => stream.streamId),
      pubsub: admitted.pubsub.map((entry) => entry.messageId),
      violations: admitted.violations,
    }, at),
    ...admitted.streams.map((stream) => captpStatementRow(stream.streamId, "captp.transport.stream", {
      protocol: stream.protocol,
      source: stream.source,
      target: stream.target,
      delivery: stream.delivery.answer,
    }, at)),
  ]);
}

/** Read an export table as vat export presences. */
export function exportTable(session, exports = []) {
  const presences = exports.map((entry) => Object.freeze({
    id: `export:${entry.position}`,
    presenceKind: "export",
    status: (entry.count ?? 1) > 0 ? "live" : "dropped",
    ref: captpSturdyRefContract.assert(entry.ref, "CapTP export ref"),
  }));
  return captpVatTableContract.assert(Object.freeze({
    kind: "captp.vat-table",
    session: nonempty(session, "CapTP export table session"),
    presences: Object.freeze(presences),
  }), "CapTP export table");
}

export function trackExport(table, position, ref, count = 1) {
  const admitted = captpVatTableContract.assert(table, "CapTP track export table");
  const id = `export:${position}`;
  const next = admitted.presences.filter((presence) => presence.id !== id);
  next.push(Object.freeze({
    id,
    presenceKind: "export",
    status: count > 0 ? "live" : "dropped",
    ref: captpSturdyRefContract.assert(ref, "CapTP tracked export ref"),
  }));
  return captpVatTableContract.assert(Object.freeze({
    kind: "captp.vat-table",
    session: admitted.session,
    presences: Object.freeze(next),
  }), "CapTP tracked export table");
}

export function applyGcExports(table, exportPositions) {
  let out = captpVatTableContract.assert(table, "CapTP gc export table");
  for (const position of exportPositions) out = dropPresence(out, `export:${position}`);
  return out;
}

function operationsOf(value) {
  if (Array.isArray(value)) return Object.freeze(value.map((operation) => requireJsonValue(operation, "CapTP trace operation")));
  return (captpSessionTranscriptContract.assert(value, "CapTP trace transcript")).operations;
}

export function operationStandingKey(operation) {
  return `${operationKind(operation)}:${canonicalJson(operation)}`;
}

export function operationStatementLog(operations, at) {
  return Object.freeze(operations.map((operation) => captpStatementRow(operationStandingKey(operation), "captp.operation", operation, at)));
}

export function foldAnswerTable(session, operations) {
  return foldSessionTranscript(`${nonempty(session, "CapTP answer table session")}:answers`, operations);
}

export function answerTableStatementLog(table, at) {
  return sessionTranscriptStatementLog(table, at);
}

export function foldPromiseTrace(operations) {
  return Object.freeze(operationsOf(operations)
    .filter((operation) => operationKind(operation) === "captp.op.listen" || operationKind(operation) === "captp.op.deliver")
    .map((operation) => captpStatementRow(operationStandingKey(operation), "captp.promise-trace", operation, undefined)));
}

export const promiseTraceStatementLog = (trace) => Object.freeze([...trace]);

export function foldProjectionTrace(operations) {
  return Object.freeze(operationsOf(operations)
    .filter((operation) => ["captp.op.get", "captp.op.index", "captp.op.untag"].includes(operationKind(operation)))
    .map((operation) => captpStatementRow(operationStandingKey(operation), "captp.projection-trace", operation, undefined)));
}

export const projectionTraceStatementLog = (trace) => Object.freeze([...trace]);

export function admit(affordances, ref) {
  const admitted = captpSturdyRefContract.assert(ref, "CapTP admission ref");
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
