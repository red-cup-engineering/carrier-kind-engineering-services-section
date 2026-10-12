/**
 * writing/captp — OCapN / CapTP object-capability transport, realized through the
 * OUT (playing) face: distributed object-capabilities as a *-autonomous concurrent
 * game system.
 *
 * CapTP (the Capability Transport Protocol of the Spritely/Goblins/OCapN lineage —
 * the wire beneath E, Goblins, and the W3C-incubating OCapN) carries object
 * references across a network, delivers messages to them, and — its signature
 * move — PIPELINES PROMISES: you may send a message to the *not-yet-resolved
 * result* of a prior message, so a multi-call interaction settles in one round
 * trip instead of one per call. That promise-pipelining is exactly the
 * *-autonomous composition our OUT face already is:
 *
 *   sturdyref            = a LOCUS you may play, named unforgeably + its holder
 *                          (playing: a design's locus / the capability's grant)
 *   delivery (invoke)    = the CUT / interaction (playing's interaction normal form)
 *   a promise            = a not-yet-settled answer locus (the codomain `1·1·…` side
 *                          of the cut, the result region the prior play opens)
 *   promise pipelining   = the cut COMPOSED BEFORE RESOLUTION: deliver to the answer
 *                          locus by cutting the next invocation's design against the
 *                          prior invocation's *result design*, with no settle between
 *
 * This is the out-face TWIN of WMAP's across-face ActivityPub: WMAP's `Activity` is
 * a meme crossing the membrane; CapTP's `Delivery` is a move played at a locus. It
 * is NOT a second ontology — a CapTP capability IS the `Capability` carrier the
 * activitypub OCap brick already authored (authority by possession of a move, gated
 * by `canInvoke`), and the cut is `@red-cup-engineering/playing`'s genuine `cut`, not a copy.
 *
 * Layering: this consumes relating's stable root apex (`carrier`) and the stable
 * `@red-cup-engineering/playing` root (`design`, `daimon`, `cut`, `composeChronicles`, `Design`)
 * — never a playing internal subpath — and reuses the activitypub `Capability`
 * carrier + `canInvoke` gate. This brick is a PURE VALUE LAYER: carriers plus the
 * compose/invoke functions. The wire framing (the bootstrap object, GC/drop
 * messages, three-party handoff, the actual socket) is a later brick — recorded as
 * a frontier in dev/docs/notes/2026-06-25-captp-as-playing.md.
 */
import { carrierFrom } from "@red-cup-engineering/relating";
import { sha256 } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/hash";
import { design, daimon, designFromActs } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/design";
import { cut, composeChronicles, observationallyEqual } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/composition";
import { locusFromKey } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/locus";
import { canInvoke } from "../activitypub/capability.mjs";

/* ------------------------------------------------------------------------- *
 * §1  SturdyRef — the unforgeable remote capability reference.
 * ------------------------------------------------------------------------- */

/**
 * A CapTP sturdyref: an unforgeable, persistable reference to a remote object,
 * naming the LOCUS the holder may play at it. Single-source carrier, bare
 * descent-path `$id`. It is a VIEW of the activitypub `Capability` (`locus` =
 * `grants`, `holder` = `holder`) projected onto the OCapN wire — not a new
 * authority model.
 */
export const sturdyRefSchema = {
  $id: "animating/writing/captp/sturdyref",
  title: "SturdyRef",
  description:
    "An OCapN/CapTP sturdyref: an unforgeable remote object-capability reference naming the locus the holder may play. The OUT-face wire view of the agent's affordance — authority by possession of a move. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["id", "locus", "holder"],
  properties: {
    id: { type: "string" },
    locus: { type: "string" },
    holder: { type: "string" },
  },
};

export const sturdyRefCarrier = carrierFrom(sturdyRefSchema);

/** refOf — project a held `Capability` onto its CapTP sturdyref (no second ontology:
 *  the grant IS the locus, the holder IS the holder, the cap id IS the ref bytes). */
export function refOf(capability) {
  return { id: capability.id, locus: capability.grants, holder: capability.holder };
}

/**
 * refOfMacaroon — project a caveat-attenuated playing macaroon/biscuit token onto
 * the CapTP sturdyref wire. The ref bytes are the token id, while the playable
 * locus is the token's final, narrowed capability grant.
 */
export function refOfMacaroon(token) {
  return { id: token.id, locus: token.capability.grants, holder: token.capability.holder };
}

/* ------------------------------------------------------------------------- *
 * §2  Delivery — the invocation message (the cut on the wire).
 * ------------------------------------------------------------------------- */

/**
 * A CapTP delivery (OCapN `op:deliver`): a message sent to a target object's locus.
 * Its `answer` is the promise the result settles to; `pipelinedOn` (when present)
 * marks this delivery as sent to a *prior delivery's still-unresolved answer* — the
 * promise-pipelining case. Single-source carrier, bare descent-path `$id`.
 */
export const deliverySchema = {
  $id: "animating/writing/captp/delivery",
  title: "Delivery",
  description:
    "An OCapN/CapTP delivery: a message (method + args) sent to a target object, producing a promise (`answer`). The interaction = the playing cut; `pipelinedOn` marks a delivery to a prior unresolved promise. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["target", "method", "args", "answer"],
  properties: {
    target: { type: "string" },
    method: { type: "string" },
    args: { type: "array", items: true },
    answer: { type: "string" },
    pipelinedOn: { type: "string" },
  },
};

export const deliveryCarrier = carrierFrom(deliverySchema);

let SEQ = 0;
/** A fresh promise/answer id (monotone per process; callers may supply their own). */
function freshPromise() {
  SEQ += 1;
  return `p:${SEQ}`;
}

/**
 * deliver — build a delivery to a settled sturdyref (the root, non-pipelined case).
 * The returned delivery names a fresh promise (`answer`) the result settles to.
 */
export function deliver(target, method, args = [], answer) {
  return {
    target: target.id,
    method,
    args: [...args],
    answer: answer ?? freshPromise(),
  };
}

/**
 * pipeline — deliver a message to the PROMISE of a prior, still-unresolved delivery
 * (CapTP's signature move). The new delivery's `target` is the prior delivery's
 * `answer`, and it records `pipelinedOn` so the transport knows not to wait for a
 * settle. This is the value-level construction; `composePipeline` realizes it as the
 * playing cut composed before resolution (§3).
 */
export function pipeline(prior, method, args = [], answer) {
  return {
    target: prior.answer,
    method,
    args: [...args],
    answer: answer ?? freshPromise(),
    pipelinedOn: prior.answer,
  };
}

/* ------------------------------------------------------------------------- *
 * §3  The cut: invocation and promise pipelining as *-autonomous composition.
 * ------------------------------------------------------------------------- */

/**
 * The two cut-interface sides of the categorical composition (the convention
 * `@red-cup-engineering/playing`'s `cut` runs on): a composable design `A ⊸ B` carries its
 * codomain B (its RESULT / answer side) under `1.1·…` and its domain B (its
 * argument / caller side) under `0·…`. A delivery's RESULT design opens its answer
 * locus on the codomain side (the promise); a pipelined delivery supplies the dual
 * move on the domain side — so their cut converges, which IS the pipeline composing
 * before resolution.
 */
const CODOMAIN = "1.1";
const DOMAIN = "0";

function answerKey(answer) {
  const address = Array.from(answer).map((char) => char.codePointAt(0) ?? 0);
  return address.length === 0 ? "0" : address.join(".");
}

function answerSideKey(side, answer) {
  return `${side}.${answerKey(answer)}`;
}

function followTargetAnswer(delivery) {
  return delivery.pipelinedOn ?? delivery.target;
}

/**
 * resultDesign — the design a delivery's RESULT plays: a give-up (Daimon, charge ⊤)
 * at the answer locus on the codomain side `1.1`. The Daimon is "the answer is
 * available here" — the settled locus the next play in a pipeline cuts against (the
 * verbatim copycat-transportable result, per playing's composition §3). A delivery
 * is a move that, when it lands, opens this result locus to be played at.
 */
export function resultDesign(_delivery) {
  return daimon(locusFromKey(answerSideKey(CODOMAIN, _delivery.answer)));
}

/**
 * followOnDesign — the design a delivery PIPELINED on a prior promise plays against
 * that promise: the dual give-up on the domain side `0`. Cut against the prior
 * delivery's `resultDesign`, the shared interface locus is dual (Daimon vs Daimon ⇒
 * a converging collision per playing's `bDual`), so the cut is defined — the
 * follow-on message is delivered to the answer BEFORE it resolves.
 */
export function followOnDesign(_delivery) {
  return designFromActs(new Map([[answerSideKey(DOMAIN, followTargetAnswer(_delivery)), "daimon"]]));
}

/** The outcome of composing a pipelined delivery against a prior promise via the cut. */

  

/**
 * sequentialFollow — the same follow-on delivery after the prior promise has
 * settled enough to be targeted as an ordinary ref. Its target is the prior
 * answer id, but it deliberately has no `pipelinedOn`: this is the two-step path
 * the pipeline law compares against.
 */
export function sequentialFollow(prior, follow) {
  return {
    target: prior.answer,
    method: follow.method,
    args: [...follow.args],
    answer: follow.answer,
  };
}

/**
 * composePipeline — REALIZE promise pipelining as the playing cut composed before
 * resolution. Cuts the prior delivery's `resultDesign` (the answer locus, codomain
 * side) against the follow-on delivery's `followOnDesign` (the dual move, domain
 * side). The cut runs the dispute on the shared answer interface and HIDES it: a
 * non-empty composite (and ≥1 converging play) means the follow-on was delivered to
 * the promise without waiting for it to settle — CapTP's one-round-trip pipeline,
 * proven as a *-autonomous composition rather than asserted.
 *
 * `follow` MUST be pipelined on `prior` (i.e. `follow.pipelinedOn === prior.answer`);
 * otherwise there is no promise to compose against and the result is non-composed.
 */
export function composePipeline(prior, follow) {
  const linked = follow.pipelinedOn === prior.answer && follow.target === prior.answer;
  if (!linked) {
    return { prior, follow, composite: design([]), composed: false, plays: 0 };
  }
  const composite = cut(resultDesign(prior), followOnDesign(follow));
  const plays = composeChronicles(resultDesign(prior), followOnDesign(follow)).filter((p) => p.converged).length;
  return { prior, follow, composite, composed: composite.entries.length > 0, plays };
}

/** composeSequentialCut — resolve first, then cut the follow-on delivery. */
export function composeSequentialCut(prior, follow) {
  const settledFollow = sequentialFollow(prior, follow);
  const composite = cut(resultDesign(prior), followOnDesign(settledFollow));
  const plays = composeChronicles(resultDesign(prior), followOnDesign(settledFollow)).filter((p) => p.converged).length;
  return { prior, follow: settledFollow, composite, composed: composite.entries.length > 0, plays };
}

/**
 * pipelineSequentialCutLaw — executable law witness: sending the follow-on to the
 * unresolved promise composes to the same visible design as waiting for the prior
 * answer and then cutting sequentially.
 */
export function pipelineSequentialCutLaw(prior, follow) {
  const pipelined = composePipeline(prior, follow);
  const sequential = composeSequentialCut(prior, follow);
  if (!pipelined.composed) {
    return {
      kind: "animating.captp.pipeline-sequential-cut:obstruction",
      pipelined,
      sequential,
      reason: "follow-on delivery is not linked to the prior promise",
    };
  }
  if (!sequential.composed) {
    return {
      kind: "animating.captp.pipeline-sequential-cut:obstruction",
      pipelined,
      sequential,
      reason: "sequential cut did not converge",
    };
  }
  if (!observationallyEqual(pipelined.composite, sequential.composite)) {
    return {
      kind: "animating.captp.pipeline-sequential-cut:obstruction",
      pipelined,
      sequential,
      reason: "pipelined cut and sequential cut differ observationally",
    };
  }
  return {
    kind: "animating.captp.pipeline-sequential-cut:witness",
    pipelined,
    sequential,
  };
}

/* ------------------------------------------------------------------------- *
 * §4  Pipeline authority graphs — references as placeful powers.
 * ------------------------------------------------------------------------- */

  

  

  

  

function refNode(ref) {
  return { kind: "ref", id: ref.id, locus: ref.locus, holder: ref.holder };
}

function promiseNode(id) {
  return { kind: "promise", id };
}

function addNode(nodes, node) {
  if (!nodes.has(node.id)) nodes.set(node.id, node);
}

/**
 * pipelineAuthorityGraph — the CapTP execution plan as an authority topology.
 * It follows Cap'n Proto / OCapN promise-pipelining practice: later deliveries
 * may target earlier answers before resolution. Admission is not an ACL lookup:
 * root deliveries require a held ref, and pipelined deliveries inherit authority
 * only through a prior admitted delivery plus a converging playing cut.
 */
export function pipelineAuthorityGraph(
  refs,
  deliveries,
  affordances,
) {
  const refById = new Map(refs.map((ref) => [ref.id, ref]));
  const deliveryByAnswer = new Map(deliveries.map((next) => [next.answer, next]));
  const nodes = new Map();
  for (const ref of refs) addNode(nodes, refNode(ref));
  for (const next of deliveries) addNode(nodes, promiseNode(next.answer));

  const edges = new Map();
  const visiting = new Set();

  const edgeFor = (next) => {
    const cached = edges.get(next.answer);
    if (cached !== undefined) return cached;
    if (visiting.has(next.answer)) {
      const edge = {
        kind: "captp.promise-cut",
        from: next.target,
        to: next.answer,
        delivery: next,
        admitted: false,
        composed: false,
        depth: 0,
        reason: "cycle in promise pipeline",
      };
      edges.set(next.answer, edge);
      return edge;
    }

    visiting.add(next.answer);
    let edge;
    if (next.pipelinedOn === undefined) {
      const ref = refById.get(next.target);
      if (ref === undefined) {
        edge = {
          kind: "captp.delivery",
          from: next.target,
          to: next.answer,
          delivery: next,
          admitted: false,
          composed: false,
          depth: 1,
          reason: "target ref is not in the held reference set",
        };
      } else {
        const admission = admit(affordances, ref);
        edge = {
          kind: "captp.delivery",
          from: ref.id,
          to: next.answer,
          delivery: next,
          admitted: admission.admitted,
          composed: admission.admitted,
          depth: 1,
          ...(admission.admitted ? {} : { reason: "target ref locus is not held" }),
        };
      }
    } else {
      const prior = deliveryByAnswer.get(next.pipelinedOn);
      if (prior === undefined) {
        edge = {
          kind: "captp.promise-cut",
          from: next.pipelinedOn,
          to: next.answer,
          delivery: next,
          admitted: false,
          composed: false,
          depth: 0,
          reason: "pipeline target has no prior delivery",
        };
      } else {
        const priorEdge = edgeFor(prior);
        const law = pipelineSequentialCutLaw(prior, next);
        const composed = law.kind === "animating.captp.pipeline-sequential-cut:witness";
        const admitted = priorEdge.admitted && composed;
        edge = {
          kind: "captp.promise-cut",
          from: prior.answer,
          to: next.answer,
          delivery: next,
          admitted,
          composed,
          depth: priorEdge.depth + 1,
          ...(admitted ? {} : { reason: priorEdge.admitted ? "pipeline cut does not compose" : "prior promise is not reachable" }),
        };
      }
    }
    visiting.delete(next.answer);
    edges.set(next.answer, edge);
    return edge;
  };

  for (const next of deliveries) edgeFor(next);

  const edgeList = deliveries.map((next) => edges.get(next.answer)).filter((edge) => edge !== undefined);
  const reachablePromises = edgeList.filter((edge) => edge.admitted).map((edge) => edge.to);
  const blocked = edgeList.filter((edge) => !edge.admitted);
  const sequentialRoundTrips = edgeList.reduce((max, edge) => edge.admitted ? Math.max(max, edge.depth) : max, 0);
  const pipelinedRoundTrips = reachablePromises.length > 0 ? 1 : 0;
  return {
    kind: "animating.captp.pipeline-authority-graph",
    refs: [...refs],
    deliveries: [...deliveries],
    nodes: [...nodes.values()],
    edges: edgeList,
    reachablePromises,
    blocked,
    compression: {
      sequentialRoundTrips,
      pipelinedRoundTrips,
      savedRoundTrips: Math.max(0, sequentialRoundTrips - pipelinedRoundTrips),
    },
  };
}

/**
 * authorityBa — a holder's situated CapTP authority context. "Ba" here is the
 * Nonaka/Konno sense of placeful shared context: refs and promises only carry
 * power inside the context where the holder actually has those loci.
 */
export function authorityBa(
  holder,
  refs,
  deliveries,
  affordances,
) {
  const heldRefs = refs.filter((ref) => ref.holder === holder && admit(affordances, ref).admitted);
  const graph = pipelineAuthorityGraph(refs, deliveries, affordances);
  return {
    kind: "animating.captp.authority-ba",
    holder,
    place: `captp:${holder}`,
    heldRefs,
    reachablePromises: graph.reachablePromises,
    blocked: graph.blocked,
    graph,
  };
}

function edgeWitnessValue(edge) {
  if (!edge.admitted) return "blocked";
  return edge.kind === "captp.promise-cut" ? "composed" : "admitted";
}

function edgeWitnessAttribute(edge) {
  const method = edge.delivery.method;
  return [
    edge.kind,
    `method=${method}`,
    `from=${edge.from}`,
    `to=${edge.to}`,
    `depth=${edge.depth}`,
  ].join("|");
}

/**
 * captpWitnessLog — read a CapTP authority graph as an witness-journal-shaped EAVT log.
 * This is the holographic bridge: the transport graph is not merely control
 * flow; every admitted or blocked power becomes a durable witness row. Blocked
 * rows are kept deliberately, because absence of authority is evidence.
 */
export function captpWitnessLog(graph, at) {
  return Object.freeze(graph.edges.map((edge, index) => Object.freeze({
    e: edge.from,
    a: edgeWitnessAttribute(edge),
    v: edgeWitnessValue(edge),
    t: at ?? `captp:${index}`,
  })));
}

/** The merge identity for a CapTP witness row, time-forgotten. */
export function captpStandingKey(row) {
  return `${row.e}|${row.v}|${row.a}`;
}

/* ------------------------------------------------------------------------- *
 * §5  Turn traces — promise pipelining as saved spatiotemporal work.
 * ------------------------------------------------------------------------- */

function clockEntries(clock) {
  return Object.entries(clock).sort(([left], [right]) => left.localeCompare(right));
}

export function vectorClock(entries = {}) {
  const out = {};
  for (const [actor, value] of Object.entries(entries).sort(([left], [right]) => left.localeCompare(right))) {
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError("CapTP vector clock components must be non-negative integers");
    }
    out[actor] = value;
  }
  return Object.freeze(out);
}

export function tickVectorClock(clock, actor) {
  return vectorClock({ ...clock, [actor]: (clock[actor] ?? 0) + 1 });
}

export function mergeVectorClocks(...clocks) {
  const out = {};
  for (const clock of clocks) {
    for (const [actor, value] of Object.entries(clock)) {
      out[actor] = Math.max(out[actor] ?? 0, value);
    }
  }
  return vectorClock(out);
}

export function compareVectorClocks(left, right) {
  const actors = new Set([...Object.keys(left), ...Object.keys(right)]);
  let less = false;
  let greater = false;
  for (const actor of actors) {
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

function turnEventStatus(edge) {
  if (!edge.admitted) return "blocked";
  return edge.kind === "captp.promise-cut" ? "composed" : "admitted";
}

/**
 * turnTraceFromAuthorityGraph - read a CapTP authority graph as vat turns. In a
 * sequential reading, an edge at depth N would need turn N-1 after the root. In
 * the pipelined reading, admitted edges ride the same outbound turn; `savedTurns`
 * is the measurable temporal compression created by promise pipelining.
 */
export function turnTraceFromAuthorityGraph(
  session,
  vat,
  graph,
  ba = `captp:${vat}`,
) {
  const events = graph.edges.map((edge) => {
    const sequentialTurn = Math.max(0, edge.depth - 1);
    const status = turnEventStatus(edge);
    return Object.freeze({
      kind: "animating.captp.turn-event",
      session,
      vat,
      ba,
      turn: status === "blocked" ? sequentialTurn : 0,
      sequentialTurn,
      savedTurns: status === "blocked" ? 0 : sequentialTurn,
      from: edge.from,
      to: edge.to,
      delivery: edge.delivery,
      status,
      ...(edge.reason === undefined ? {} : { reason: edge.reason }),
    });
  });
  return {
    kind: "animating.captp.turn-trace",
    session,
    vat,
    ba,
    events: Object.freeze(events),
    compression: graph.compression,
  };
}

/** Project a turn trace to witness-journal-shaped rows: the temporal face of the same power. */
export function turnTraceWitnessLog(trace, at) {
  return Object.freeze(trace.events.map((event, index) => Object.freeze({
    e: event.to,
    a: [
      "captp.turn",
      `session=${event.session}`,
      `vat=${event.vat}`,
      `ba=${event.ba}`,
      `turn=${event.turn}`,
      `sequentialTurn=${event.sequentialTurn}`,
      `savedTurns=${event.savedTurns}`,
      `from=${event.from}`,
      `method=${event.delivery.method}`,
    ].join("|"),
    v: event.status,
    t: at ?? `captp:turn:${index}`,
  })));
}

function clockAttribute(clock) {
  return clockEntries(clock).map(([actor, value]) => `${actor}:${value}`).join(",");
}

/**
 * causalFrontierFromTurnTraces - lift per-vat CapTP turns into a vector-clock
 * frontier. This keeps independent vats concurrent while letting promise cuts
 * compose inside the vat turn that actually holds their locus.
 */
export function causalFrontierFromTurnTraces(
  traces,
  seed = vectorClock(),
) {
  const byVat = new Map();
  const events = [];

  for (const [actor, value] of clockEntries(seed)) {
    byVat.set(actor, vectorClock({ [actor]: value }));
  }

  for (const trace of traces) {
    let clock = mergeVectorClocks(byVat.get(trace.vat) ?? vectorClock(), seed);
    for (const event of trace.events) {
      clock = tickVectorClock(clock, event.vat);
      byVat.set(event.vat, clock);
      events.push(Object.freeze({
        kind: "animating.captp.causal-turn-event",
        event,
        clock,
      }));
    }
  }

  return Object.freeze({
    kind: "animating.captp.causal-frontier",
    events: Object.freeze(events),
    frontier: mergeVectorClocks(seed, ...byVat.values()),
  });
}

/** Project a causal frontier to witness-journal-shaped rows: vector time as witness rows. */
export function causalFrontierWitnessLog(frontier, at) {
  return Object.freeze(frontier.events.map((entry, index) => Object.freeze({
    e: entry.event.to,
    a: [
      "captp.causal-frontier",
      `session=${entry.event.session}`,
      `vat=${entry.event.vat}`,
      `turn=${entry.event.turn}`,
      `clock=${clockAttribute(entry.clock)}`,
      `frontier=${clockAttribute(frontier.frontier)}`,
    ].join("|"),
    v: "causal",
    t: at ?? `captp:causal:${index}`,
  })));
}

function baObservableIds(ba) {
  return new Set([
    ...ba.heldRefs.map((ref) => ref.id),
    ...ba.reachablePromises,
  ]);
}

function baEventStatus(ba, entry) {
  const ids = baObservableIds(ba);
  if (entry.event.ba === ba.place || ids.has(entry.event.from) || ids.has(entry.event.to)) {
    return { status: "situated" };
  }
  return {
    status: "outside",
    reason: "event is outside the ba's held refs and reachable promise locus",
  };
}

/**
 * baCausalFrame - read a distributed causal frontier from one AuthorityBa. This
 * is the CapTP operational form of ba as enabling shared context: the frame sees
 * only the events whose refs/promises are actually situated in that place.
 */
export function baCausalFrame(ba, frontier) {
  const events = frontier.events.map((entry) => {
    const status = baEventStatus(ba, entry);
    return Object.freeze({
      kind: "animating.captp.ba-causal-event",
      event: entry,
      status: status.status,
      ...(status.reason === undefined ? {} : { reason: status.reason }),
    });
  });
  const observed = events.filter((entry) => entry.status === "situated").map((entry) => entry.event);
  const outside = events.filter((entry) => entry.status === "outside").map((entry) => entry.event);
  return Object.freeze({
    kind: "animating.captp.ba-causal-frame",
    holder: ba.holder,
    place: ba.place,
    events: Object.freeze(events),
    observed: Object.freeze(observed),
    outside: Object.freeze(outside),
    clock: mergeVectorClocks(...observed.map((entry) => entry.clock)),
    frontier: frontier.frontier,
  });
}

/** Project a ba-local causal frame to witness-journal-shaped rows. */
export function baCausalFrameWitnessLog(frame, at) {
  return Object.freeze(frame.events.map((entry, index) => Object.freeze({
    e: entry.event.event.to,
    a: [
      "captp.ba-causal-frame",
      `holder=${frame.holder}`,
      `place=${frame.place}`,
      `vat=${entry.event.event.vat}`,
      `clock=${clockAttribute(entry.event.clock)}`,
      `observedClock=${clockAttribute(frame.clock)}`,
      ...(entry.reason === undefined ? [] : [`reason=${entry.reason}`]),
    ].join("|"),
    v: entry.status === "situated" ? "causal" : "blocked",
    t: at ?? `captp:ba-causal:${index}`,
  })));
}

function eventResources(entry) {
  return new Set([entry.event.vat, entry.event.from, entry.event.to]);
}

/**
 * capTpEventsIndependent - the Mazurkiewicz independence relation for CapTP
 * turn events. Independent events are causally concurrent and do not touch the
 * same vat/ref/promise resource, so their order may be commuted.
 */
export function capTpEventsIndependent(left, right) {
  const order = compareVectorClocks(left.clock, right.clock);
  if (order !== "concurrent" && order !== "equal") return false;
  const leftResources = eventResources(left);
  for (const resource of eventResources(right)) {
    if (leftResources.has(resource)) return false;
  }
  return true;
}

function hasCausalPredecessor(candidate, events) {
  return events.some((other) => other !== candidate && compareVectorClocks(other.clock, candidate.clock) === "before");
}

/**
 * concurrentTraceFromCausalFrontier - Cartier-Foata style normal form for a
 * CapTP causal frontier. Each layer is a maximal stable antichain under the
 * CapTP independence relation; later layers carry the non-commutable residue.
 */
export function concurrentTraceFromCausalFrontier(frontier) {
  let remaining = [...frontier.events];
  const layers = [];

  while (remaining.length > 0) {
    const layer = [];
    for (const entry of remaining) {
      if (hasCausalPredecessor(entry, remaining)) continue;
      if (layer.every((selected) => capTpEventsIndependent(selected, entry))) {
        layer.push(entry);
      }
    }
    if (layer.length === 0) {
      const first = remaining[0];
      if (first === undefined) break;
      layer.push(first);
    }
    const selected = new Set(layer);
    layers.push(Object.freeze({
      kind: "animating.captp.concurrent-trace-layer",
      index: layers.length,
      events: Object.freeze(layer),
      clock: mergeVectorClocks(...layer.map((entry) => entry.clock)),
    }));
    remaining = remaining.filter((entry) => !selected.has(entry));
  }

  return Object.freeze({
    kind: "animating.captp.concurrent-trace",
    layers: Object.freeze(layers),
    frontier: frontier.frontier,
    width: layers.reduce((max, layer) => Math.max(max, layer.events.length), 0),
    depth: layers.length,
  });
}

/** Project a concurrent trace normal form to witness-journal-shaped rows. */
export function concurrentTraceWitnessLog(trace, at) {
  return Object.freeze(trace.layers.flatMap((layer) => layer.events.map((entry, eventIndex) => Object.freeze({
    e: entry.event.to,
    a: [
      "captp.concurrent-trace",
      `layer=${layer.index}`,
      `event=${eventIndex}`,
      `width=${trace.width}`,
      `depth=${trace.depth}`,
      `vat=${entry.event.vat}`,
      `clock=${clockAttribute(entry.clock)}`,
      `layerClock=${clockAttribute(layer.clock)}`,
      `method=${entry.event.delivery.method}`,
    ].join("|"),
    v: "causal",
    t: at ?? `captp:concurrent-trace:${layer.index}:${eventIndex}`,
  }))));
}

function causalCutEventId(entry) {
  return entry.event.to;
}

function clockIncludes(clock, entry) {
  const order = compareVectorClocks(entry.clock, clock);
  return order === "before" || order === "equal";
}

function causalCutViolation(
  entry,
  selected,
  frontier,
) {
  const missing = frontier.events.filter((other) => (
    other !== entry
    && compareVectorClocks(other.clock, entry.clock) === "before"
    && !selected.has(causalCutEventId(other))
  ));
  if (missing.length === 0) return undefined;
  return Object.freeze({
    kind: "animating.captp.causal-cut-violation",
    event: entry,
    missing: Object.freeze(missing),
    reason: "causal cut includes an event while excluding one of its predecessors",
  });
}

/**
 * causalCutFromSelection - validate an arbitrary selected set of CapTP turn
 * events as a distributed consistent cut. A lawful cut is downward-closed: no
 * invocation result may appear without every causal predecessor it depends on.
 */
export function causalCutFromSelection(
  frontier,
  selectedEventIds,
  clock,
) {
  const selected = new Set(selectedEventIds);
  const included = frontier.events.filter((entry) => selected.has(causalCutEventId(entry)));
  const excluded = frontier.events.filter((entry) => !selected.has(causalCutEventId(entry)));
  const violations = included
    .map((entry) => causalCutViolation(entry, selected, frontier))
    .filter((entry) => entry !== undefined);

  return Object.freeze({
    kind: "animating.captp.causal-cut",
    status: violations.length === 0 ? "consistent" : "inconsistent",
    clock: clock ?? mergeVectorClocks(...included.map((entry) => entry.clock)),
    included: Object.freeze(included),
    excluded: Object.freeze(excluded),
    violations: Object.freeze(violations),
  });
}

/**
 * causalCutFromClock - derive the canonical vector-time cut: every event whose
 * clock is at or before the boundary is included, all later/concurrent excess is
 * left outside.
 */
export function causalCutFromClock(frontier, clock) {
  return causalCutFromSelection(
    frontier,
    frontier.events.filter((entry) => clockIncludes(clock, entry)).map(causalCutEventId),
    clock,
  );
}

/** Project a causal cut to witness-journal-shaped rows. */
export function causalCutWitnessLog(cut, at) {
  const included = cut.included.map((entry, index) => Object.freeze({
    e: entry.event.to,
    a: [
      "captp.causal-cut",
      `status=${cut.status}`,
      `role=included`,
      `clock=${clockAttribute(cut.clock)}`,
      `eventClock=${clockAttribute(entry.clock)}`,
      `vat=${entry.event.vat}`,
    ].join("|"),
    v: "causal",
    t: at ?? `captp:causal-cut:included:${index}`,
  }));
  const violations = cut.violations.map((violation, index) => Object.freeze({
    e: violation.event.event.to,
    a: [
      "captp.causal-cut",
      `status=${cut.status}`,
      `role=violation`,
      `clock=${clockAttribute(cut.clock)}`,
      `missing=${violation.missing.map((entry) => entry.event.to).join(",")}`,
      `reason=${violation.reason}`,
    ].join("|"),
    v: "blocked",
    t: at ?? `captp:causal-cut:violation:${index}`,
  }));
  return Object.freeze([...included, ...violations]);
}

function cutPromiseStatus(presence) {
  if (presence === undefined) {
    return { status: "missing", reason: "promise presence is absent from the vat table" };
  }
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
      return { status: "blocked" };
  }
}

function quiescenceWitnessValue(state) {
  if (state.kind === "animating.captp.cut-quiescence") {
    if (state.status === "quiescent") return "quiescent";
    return state.status === "active" ? "pending" : "blocked";
  }
  if (state.status === "pending" || state.status === "missing") return "pending";
  return "quiescent";
}

/**
 * causalCutQuiescence - detect the stable CapTP predicate "no included promise is
 * still live." This is distributed snapshot logic read through object
 * capabilities: a consistent cut may be causally valid but not yet quiet.
 */
export function causalCutQuiescence(cut, vat) {
  const presences = new Map(vat.presences.filter((presence) => presence.table === "promise").map((presence) => [presence.id, presence]));
  const promises = cut.included.map((entry) => {
    const presence = presences.get(entry.event.to);
    const state = cutPromiseStatus(presence);
    return Object.freeze({
      kind: "animating.captp.cut-promise-state",
      id: entry.event.to,
      event: entry,
      ...(presence === undefined ? {} : { presence }),
      status: state.status,
      ...(state.reason === undefined ? {} : { reason: state.reason }),
    });
  });
  const pending = promises.filter((state) => state.status === "pending" || state.status === "missing");
  const terminal = promises.filter((state) => state.status !== "pending" && state.status !== "missing");
  const status = cut.status === "inconsistent"
    ? "inconsistent"
    : pending.length === 0 ? "quiescent" : "active";

  return Object.freeze({
    kind: "animating.captp.cut-quiescence",
    status,
    cut,
    vat,
    promises: Object.freeze(promises),
    pending: Object.freeze(pending),
    terminal: Object.freeze(terminal),
  });
}

/** Project a cut-quiescence predicate reading to witness-journal-shaped rows. */
export function causalCutQuiescenceWitnessLog(quiescence, at) {
  const summary = Object.freeze({
    e: quiescence.vat.id,
    a: [
      "captp.cut-quiescence",
      `status=${quiescence.status}`,
      `clock=${clockAttribute(quiescence.cut.clock)}`,
      `pending=${quiescence.pending.map((state) => state.id).join(",")}`,
    ].join("|"),
    v: quiescenceWitnessValue(quiescence),
    t: at ?? "captp:cut-quiescence:summary",
  });
  const states = quiescence.promises.map((state, index) => Object.freeze({
    e: state.id,
    a: [
      "captp.cut-quiescence.promise",
      `status=${state.status}`,
      `vat=${quiescence.vat.id}`,
      `presenceStatus=${state.presence?.status ?? ""}`,
      ...(state.reason === undefined ? [] : [`reason=${state.reason}`]),
    ].join("|"),
    v: quiescenceWitnessValue(state),
    t: at ?? `captp:cut-quiescence:${index}`,
  }));
  return Object.freeze([summary, ...states]);
}

function descendantPromises(id, states) {
  const parents = new Map(states.map((state) => [state.id, state.presence?.parent]));
  const descendants = [];
  for (const state of states) {
    let parent = parents.get(state.id);
    while (parent !== undefined) {
      if (parent === id) {
        descendants.push(state.id);
        break;
      }
      parent = parents.get(parent);
    }
  }
  return Object.freeze(descendants);
}

function invocationDebt(state, states) {
  return Object.freeze({
    kind: "animating.captp.invocation-debt",
    id: state.id,
    ...(state.presence?.parent === undefined ? {} : { parent: state.presence.parent }),
    descendants: descendantPromises(state.id, states),
    reason: state.reason ?? "promise has not reached terminal settlement",
  });
}

function invocationSettlementValue(settlement) {
  switch (settlement.status) {
    case "terminated":
      return "terminated";
    case "active":
      return "pending";
    case "failed":
      return "broken";
    case "inconsistent":
      return "blocked";
  }
}

function cutPromiseStateValue(state) {
  switch (state.status) {
    case "resolved":
      return "settled";
    case "failed":
      return "broken";
    case "released":
      return "dropped";
    case "blocked":
      return "blocked";
    case "pending":
    case "missing":
      return "pending";
  }
}

/**
 * invocationSettlement - Dijkstra-Scholten style termination certificate for a
 * CapTP invocation tree. The root is settled only when the cut is consistent, no
 * included promise remains live/missing, and no included promise failed.
 */
export function invocationSettlement(
  cut,
  vat,
  root,
) {
  const quiescence = causalCutQuiescence(cut, vat);
  const debts = quiescence.pending.map((state) => invocationDebt(state, quiescence.promises));
  const failed = quiescence.promises.filter((state) => state.status === "failed" || state.status === "blocked");
  const terminal = quiescence.promises.filter((state) => (
    state.status === "resolved" || state.status === "released"
  ));
  const status = cut.status === "inconsistent"
    ? "inconsistent"
    : debts.length > 0 ? "active" : failed.length > 0 ? "failed" : "terminated";

  return Object.freeze({
    kind: "animating.captp.invocation-settlement",
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

/** Project an invocation settlement certificate to witness-journal-shaped rows. */
export function invocationSettlementWitnessLog(settlement, at) {
  const summary = Object.freeze({
    e: settlement.root ?? settlement.vat.id,
    a: [
      "captp.invocation-settlement",
      `status=${settlement.status}`,
      `root=${settlement.root ?? ""}`,
      `clock=${clockAttribute(settlement.cut.clock)}`,
      `debts=${settlement.debts.map((debt) => debt.id).join(",")}`,
      `failed=${settlement.failed.map((state) => state.id).join(",")}`,
    ].join("|"),
    v: invocationSettlementValue(settlement),
    t: at ?? "captp:invocation-settlement:summary",
  });
  const debts = settlement.debts.map((debt, index) => Object.freeze({
    e: debt.id,
    a: [
      "captp.invocation-settlement.debt",
      `parent=${debt.parent ?? ""}`,
      `descendants=${debt.descendants.join(",")}`,
      `reason=${debt.reason}`,
    ].join("|"),
    v: "pending",
    t: at ?? `captp:invocation-settlement:debt:${index}`,
  }));
  const states = settlement.quiescence.promises.map((state, index) => Object.freeze({
    e: state.id,
    a: [
      "captp.invocation-settlement.promise",
      `status=${state.status}`,
      `presenceStatus=${state.presence?.status ?? ""}`,
    ].join("|"),
    v: cutPromiseStateValue(state),
    t: at ?? `captp:invocation-settlement:promise:${index}`,
  }));
  return Object.freeze([summary, ...debts, ...states]);
}

function vatDescendants(id, vat) {
  const byId = new Map(vat.presences.map((presence) => [presence.id, presence]));
  const descendants = [];
  for (const presence of vat.presences) {
    let parent = presence.parent;
    while (parent !== undefined) {
      if (parent === id) {
        descendants.push(presence);
        break;
      }
      parent = byId.get(parent)?.parent;
    }
  }
  return Object.freeze(descendants);
}

function promiseRetirementBlockers(
  state,
  settlement,
  selected,
) {
  const blockers = [];
  if (settlement.status === "inconsistent") {
    blockers.push("settlement cut is inconsistent");
  }
  if (state.status === "pending" || state.status === "missing") {
    blockers.push("promise has not reached terminal settlement");
  }
  for (const presence of vatDescendants(state.id, settlement.vat)) {
    if (!selected.has(presence.id) && (presence.status === "live" || presence.status === "settled")) {
      blockers.push(`descendant presence is still retained outside the certificate: ${presence.id}`);
    }
    if (presence.status === "live") {
      blockers.push(`descendant presence is still live: ${presence.id}`);
    }
  }
  return Object.freeze([...new Set(blockers)]);
}

/**
 * promiseRetirementCertificate - decide which promise presences may be safely
 * reclaimed after an invocation settlement. This is the distributed-GC face of
 * CapTP: a promise can retire only after it and its reachable descendants have
 * no live debt left in the vat.
 */
export function promiseRetirementCertificate(
  settlement,
  promiseIds = settlement.quiescence.promises.map((state) => state.id),
) {
  const selected = new Set(promiseIds);
  const states = new Map(settlement.quiescence.promises.map((state) => [state.id, state]));
  const items = promiseIds.map((id) => {
    const state = states.get(id);
    const presence = state?.presence ?? settlement.vat.presences.find((entry) => entry.id === id && entry.table === "promise");
    const descendants = vatDescendants(id, settlement.vat).map((entry) => entry.id);
    const blockers = state === undefined
      ? Object.freeze(["promise is absent from the settlement cut"])
      : promiseRetirementBlockers(state, settlement, selected);
    return Object.freeze({
      kind: "animating.captp.promise-retirement-item",
      id,
      ...(presence === undefined ? {} : { presence }),
      descendants: Object.freeze(descendants),
      status: blockers.length === 0 ? "retirable" : "retained",
      blockers,
    });
  });
  const retirable = items.filter((item) => item.status === "retirable");
  const retained = items.filter((item) => item.status === "retained");

  return Object.freeze({
    kind: "animating.captp.promise-retirement-certificate",
    status: retained.length === 0 ? "retirable" : "retained",
    settlement,
    items: Object.freeze(items),
    retirable: Object.freeze(retirable),
    retained: Object.freeze(retained),
  });
}

/** Project a promise-retirement certificate to witness-journal-shaped rows. */
export function promiseRetirementWitnessLog(certificate, at) {
  const summary = Object.freeze({
    e: certificate.settlement.root ?? certificate.settlement.vat.id,
    a: [
      "captp.promise-retirement",
      `status=${certificate.status}`,
      `retirable=${certificate.retirable.map((item) => item.id).join(",")}`,
      `retained=${certificate.retained.map((item) => item.id).join(",")}`,
    ].join("|"),
    v: certificate.status === "retirable" ? "retired" : "blocked",
    t: at ?? "captp:promise-retirement:summary",
  });
  const items = certificate.items.map((item, index) => Object.freeze({
    e: item.id,
    a: [
      "captp.promise-retirement.item",
      `status=${item.status}`,
      `presenceStatus=${item.presence?.status ?? ""}`,
      `descendants=${item.descendants.join(",")}`,
      `blockers=${item.blockers.join(",")}`,
    ].join("|"),
    v: item.status === "retirable" ? "retired" : "blocked",
    t: at ?? `captp:promise-retirement:${index}`,
  }));
  return Object.freeze([summary, ...items]);
}

/* ------------------------------------------------------------------------- *
 * §6  Vat tables and drop — the live distributed object-capability state.
 * ------------------------------------------------------------------------- */

function presenceKey(presence) {
  return `${presence.table}:${presence.id}`;
}

function uniquePresences(presences) {
  const out = new Map();
  for (const presence of presences) out.set(presenceKey(presence), presence);
  return Object.freeze([...out.values()]);
}

/**
 * vatFromAuthorityGraph — materialize the CapTP import/export/promise tables for
 * one vat. Imports are held sturdyrefs; promises are the answers created by
 * deliveries. A blocked graph edge still becomes a blocked promise presence so
 * absence of authority is retained as state, not erased.
 */
export function vatFromAuthorityGraph(
  id,
  graph,
  table = "import",
) {
  const refPresences = graph.refs.map((ref) => ({
    kind: "animating.captp.vat-presence",
    table,
    id: ref.id,
    holder: ref.holder,
    locus: ref.locus,
    status: graph.edges.some((edge) => edge.from === ref.id && edge.admitted) ? "live" : "blocked",
  }));
  const promisePresences = graph.edges.map((edge) => ({
    kind: "animating.captp.vat-presence",
    table: "promise",
    id: edge.to,
    holder: graph.refs.find((ref) => ref.id === edge.from)?.holder ?? id,
    parent: edge.from,
    delivery: edge.delivery,
    status: edge.admitted ? "live" : "blocked",
    ...(edge.reason === undefined ? {} : { reason: edge.reason }),
  }));
  return {
    kind: "animating.captp.vat",
    id,
    presences: uniquePresences([...refPresences, ...promisePresences]),
  };
}

/**
 * dropPresence — model CapTP distributed-GC release at the value layer. Dropping a
 * ref/promise drops every promise that depends on it through the vat's parent
 * relation. This is linear resource discipline: a presence no longer held cannot
 * be used to authorize descendant cuts.
 */
export function dropPresence(vat, root) {
  const dropped = new Set([root]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const presence of vat.presences) {
      if (presence.parent !== undefined && dropped.has(presence.parent) && !dropped.has(presence.id)) {
        dropped.add(presence.id);
        changed = true;
      }
    }
  }
  const next = {
    ...vat,
    presences: vat.presences.map((presence) =>
      dropped.has(presence.id) ? { ...presence, status: "dropped" } : presence,
    ),
  };
  return {
    kind: "animating.captp.vat-drop",
    vat: next,
    root,
    dropped: Object.freeze([...dropped]),
  };
}

/**
 * resolvePromise — fulfill a live promise presence with a concrete sturdyref. The
 * promise remains a promise table entry, but it now carries the resolved locus and
 * holder so subsequent code can treat it as a usable remote presence.
 */
export function resolvePromise(vat, promise, resolvedTo) {
  const next = {
    ...vat,
    presences: vat.presences.map((presence) =>
      presence.id === promise && presence.table === "promise"
        ? {
          ...presence,
          holder: resolvedTo.holder,
          locus: resolvedTo.locus,
          resolvedTo: resolvedTo.id,
          status: "settled",
        }
        : presence,
    ),
  };
  return {
    kind: "animating.captp.promise-resolution",
    vat: next,
    promise,
    resolvedTo,
  };
}

/**
 * breakPromise — break a promise and every promise that pipelined through it.
 * Brokenness propagates along the same parent relation as drop because pipelined
 * descendants depended on the unresolved answer being usable.
 */
export function breakPromise(vat, root, reason) {
  const broken = new Set([root]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const presence of vat.presences) {
      if (presence.parent !== undefined && broken.has(presence.parent) && !broken.has(presence.id)) {
        broken.add(presence.id);
        changed = true;
      }
    }
  }
  const next = {
    ...vat,
    presences: vat.presences.map((presence) =>
      broken.has(presence.id) ? { ...presence, status: "broken", reason } : presence,
    ),
  };
  return {
    kind: "animating.captp.promise-break",
    vat: next,
    root,
    reason,
    broken: Object.freeze([...broken]),
  };
}

/** A presence is invocable exactly when it is still live in the vat table. */
export function vatCanInvoke(vat, id) {
  return vat.presences.some((presence) => presence.id === id && (presence.status === "live" || presence.status === "settled"));
}

/** exportTable - the sender-side CapTP export-position reference counts. */
export function exportTable(session, exports = []) {
  return {
    kind: "animating.captp.export-table",
    session,
    exports: Object.freeze([...exports]),
  };
}

/**
 * trackExport - count one or more sends of an exported object reference.
 * CapTP export references are linear resources on the wire: every send increments
 * the remote's live count, and op:gc-exports later spends that count back down.
 */
export function trackExport(table, position, ref, count = 1) {
  const exportPosition = positiveInteger(position);
  const delta = positiveInteger(count);
  let found = false;
  const exports = table.exports.map((entry) => {
    if (entry.position !== exportPosition) return entry;
    found = true;
    return Object.freeze({
      ...entry,
      ref,
      count: entry.count + delta,
      status: "live",
    });
  });
  if (!found) {
    exports.push(Object.freeze({
      kind: "animating.captp.export-count",
      position: exportPosition,
      ref,
      count: delta,
      status: "live",
    }));
  }
  return exportTable(table.session, exports);
}

/**
 * applyGcExports - apply the remote's op:gc-exports wire deltas to local export
 * counts. Count zero drops the authority from this session's export table.
 */
export function applyGcExports(table, operation) {
  const deltas = new Map();
  for (let index = 0; index < operation.exportPositions.length; index += 1) {
    const position = operation.exportPositions[index];
    const delta = operation.wireDeltas[index];
    if (position === undefined || delta === undefined) continue;
    deltas.set(position, (deltas.get(position) ?? 0) + delta);
  }

  const blocked = [];
  const dropped = [];
  const seen = new Set();
  const exports = table.exports.map((entry) => {
    const delta = deltas.get(entry.position);
    if (delta === undefined) return entry;
    seen.add(entry.position);
    if (delta > entry.count) {
      blocked.push(`wire delta exceeds reference count: ${entry.position}`);
    }
    const count = Math.max(0, entry.count - delta);
    if (count === 0) dropped.push(entry.position);
    return Object.freeze({
      ...entry,
      count,
      status: count === 0 ? "dropped" : "live",
    });
  });

  for (const position of deltas.keys()) {
    if (!seen.has(position)) blocked.push(`missing export position: ${position}`);
  }

  return {
    kind: "animating.captp.export-gc",
    table: exportTable(table.session, exports),
    operation,
    dropped: Object.freeze(dropped),
    blocked: Object.freeze(blocked),
  };
}

function presenceWitnessValue(presence) {
  switch (presence.status) {
    case "live":
      return presence.table === "promise" ? "composed" : "admitted";
    case "blocked":
      return "blocked";
    case "settled":
      return "settled";
    case "broken":
      return "broken";
    case "dropped":
      return "dropped";
  }
}

function presenceWitnessAttribute(presence) {
  return [
    `captp.${presence.table}`,
    `id=${presence.id}`,
    `parent=${presence.parent ?? ""}`,
    `resolvedTo=${presence.resolvedTo ?? ""}`,
  ].join("|");
}

/** Project a vat table to witness-journal-shaped rows, preserving settled/broken/dropped state. */
export function vatWitnessLog(vat, at) {
  return Object.freeze(vat.presences.map((presence, index) => Object.freeze({
    e: presence.id,
    a: presenceWitnessAttribute(presence),
    v: presenceWitnessValue(presence),
    t: at ?? `captp:vat:${index}`,
  })));
}

/** Project a CapTP export-count table to witness-journal-shaped rows. */
export function exportTableWitnessLog(table, at) {
  return Object.freeze(table.exports.map((entry, index) => Object.freeze({
    e: `${table.session}:export:${entry.position}`,
    a: [
      "captp.export-count",
      `position=${entry.position}`,
      `count=${entry.count}`,
      `ref=${entry.ref.id}`,
      `locus=${entry.ref.locus}`,
      `holder=${entry.ref.holder}`,
    ].join("|"),
    v: entry.status === "live" ? "admitted" : "dropped",
    t: at ?? `captp:export:${index}`,
  })));
}

/** Project one gc-exports application to witness-journal-shaped rows, including anomalies. */
export function exportGcWitnessLog(result, at) {
  const rows = result.operation.exportPositions.map((position, index) => Object.freeze({
    e: `${result.table.session}:gc-export:${position}`,
    a: [
      "captp.gc-exports",
      `position=${position}`,
      `delta=${result.operation.wireDeltas[index]}`,
    ].join("|"),
    v: result.blocked.some((reason) => reason.endsWith(`: ${position}`)) ? "blocked" : "gc",
    t: at ?? `captp:gc-export:${index}`,
  }));
  return Object.freeze(rows);
}

/* ------------------------------------------------------------------------- *
 * §6  Three-party handoff gift tables.
 * ------------------------------------------------------------------------- */

/** handoffTable - the exporter's per-session gift table. */
export function handoffTable(exporter, gifts = [], claims = []) {
  return {
    kind: "animating.captp.handoff-table",
    exporter,
    gifts: Object.freeze([...gifts]),
    claims: Object.freeze([...claims]),
  };
}

function presenceRef(presence, holder) {
  if (presence.locus === undefined) return undefined;
  return {
    id: presence.resolvedTo ?? presence.id,
    locus: presence.locus,
    holder,
  };
}

/**
 * offerHandoffGift - the gifter deposits a live imported reference into the
 * exporter's gift table. A dropped, broken, blocked, or unknown presence cannot
 * be deposited: the gift is blocked rather than minting authority from bytes.
 */
export function offerHandoffGift(vat, options) {
  const presence = vat.presences.find((entry) => entry.id === options.presence);
  if (presence === undefined) {
    return {
      kind: "animating.captp.handoff-gift",
      ...options,
      status: "blocked",
      reason: "presence is not in the vat table",
    };
  }
  if (!vatCanInvoke(vat, options.presence)) {
    return {
      kind: "animating.captp.handoff-gift",
      ...options,
      status: "blocked",
      reason: "presence is not live",
    };
  }
  const ref = presenceRef(presence, options.gifter);
  if (ref === undefined) {
    return {
      kind: "animating.captp.handoff-gift",
      ...options,
      status: "blocked",
      reason: "presence has no transferable locus",
    };
  }
  return {
    kind: "animating.captp.handoff-gift",
    ...options,
    ref,
    status: "offered",
  };
}

/** depositHandoffGift - place the gift in the exporter's table, keyed by gift-id. */
export function depositHandoffGift(table, gift) {
  const gifts = new Map(table.gifts.map((entry) => [entry.id, entry]));
  gifts.set(gift.id, gift);
  return handoffTable(table.exporter, [...gifts.values()], table.claims);
}

function claimRecord(options, status, reason) {
  return {
    giftId: options.giftId,
    receiver: options.receiver,
    receiverKey: options.receiverKey,
    receivingSession: options.receivingSession,
    receivingSide: options.receivingSide,
    handoffCount: options.handoffCount,
    status,
    ...(reason === undefined ? {} : { reason }),
  };
}

function appendClaim(table, record, gifts = table.gifts) {
  return handoffTable(table.exporter, gifts, [...table.claims, record]);
}

/**
 * withdrawHandoffGift - the receiver redeems a deposited gift. This models
 * CapTP's withdraw-gift check at the pure value layer: the designated receiver
 * key must match, the gift must still be offered, and the handoff-count cannot
 * replay within the receiving session.
 */
export function withdrawHandoffGift(table, options) {
  const gift = table.gifts.find((entry) => entry.id === options.giftId);
  if (gift === undefined) {
    const claim = claimRecord(options, "blocked", "gift is not deposited");
    return { kind: "animating.captp.handoff-claim", table: appendClaim(table, claim), claim };
  }
  if (gift.status !== "offered" || gift.ref === undefined) {
    const claim = claimRecord(options, "blocked", gift.reason ?? "gift is not offered");
    return { kind: "animating.captp.handoff-claim", table: appendClaim(table, claim), claim };
  }
  if (gift.receiver !== options.receiver || gift.receiverKey !== options.receiverKey) {
    const claim = claimRecord(options, "blocked", "receiver is not the designated gift recipient");
    return { kind: "animating.captp.handoff-claim", table: appendClaim(table, claim), claim };
  }
  if (!Number.isInteger(options.handoffCount) || options.handoffCount < 0) {
    const claim = claimRecord(options, "blocked", "handoff-count must be a non-negative integer");
    return { kind: "animating.captp.handoff-claim", table: appendClaim(table, claim), claim };
  }
  if (table.claims.some((claim) =>
    claim.receivingSession === options.receivingSession && claim.handoffCount === options.handoffCount
  )) {
    const claim = claimRecord(options, "blocked", "handoff-count was already used in this receiving session");
    return { kind: "animating.captp.handoff-claim", table: appendClaim(table, claim), claim };
  }

  const ref = { ...gift.ref, holder: options.receiver };
  const presence = {
    kind: "animating.captp.vat-presence",
    table: "import",
    id: ref.id,
    holder: options.receiver,
    locus: ref.locus,
    parent: gift.presence,
    status: "live",
  };
  const claim = claimRecord(options, "claimed");
  const gifts = table.gifts.map((entry) =>
    entry.id === gift.id ? { ...entry, status: "claimed" } : entry,
  );
  return {
    kind: "animating.captp.handoff-claim",
    table: appendClaim(table, claim, gifts),
    claim,
    ref,
    presence,
  };
}

function handoffGiftWitnessValue(gift) {
  switch (gift.status) {
    case "offered":
      return "offered";
    case "claimed":
      return "claimed";
    case "blocked":
      return "blocked";
  }
}

function handoffClaimWitnessValue(claim) {
  return claim.status === "claimed" ? "claimed" : "blocked";
}

function handoffGiftWitnessAttribute(gift) {
  return [
    "captp.handoff-gift",
    `exporter=${gift.exporter}`,
    `gifter=${gift.gifter}`,
    `receiver=${gift.receiver}`,
    `session=${gift.gifterExporterSession}`,
    `presence=${gift.presence}`,
  ].join("|");
}

function handoffClaimWitnessAttribute(claim) {
  return [
    "captp.handoff-claim",
    `receiver=${claim.receiver}`,
    `receivingSession=${claim.receivingSession}`,
    `receivingSide=${claim.receivingSide}`,
    `handoffCount=${claim.handoffCount}`,
  ].join("|");
}

/** Project a handoff gift table to witness-journal-shaped rows, including blocked attempts. */
export function handoffWitnessLog(table, at) {
  const giftRows = table.gifts.map((gift, index) => Object.freeze({
    e: gift.id,
    a: handoffGiftWitnessAttribute(gift),
    v: handoffGiftWitnessValue(gift),
    t: at ?? `captp:handoff:gift:${index}`,
  }));
  const claimRows = table.claims.map((claim, index) => Object.freeze({
    e: claim.giftId,
    a: handoffClaimWitnessAttribute(claim),
    v: handoffClaimWitnessValue(claim),
    t: at ?? `captp:handoff:claim:${index}`,
  }));
  return Object.freeze([...giftRows, ...claimRows]);
}

/* ------------------------------------------------------------------------- *
 * §7  CapTP descriptors: the wire nouns behind refs, promises, and handoffs.
 * ------------------------------------------------------------------------- */

function nonNegativeInteger(position) {
  if (!Number.isInteger(position) || position < 0) {
    throw new RangeError("CapTP descriptor positions must be non-negative integers");
  }
  return position;
}

function positiveInteger(position) {
  if (!Number.isInteger(position) || position <= 0) {
    throw new RangeError("CapTP object positions must be positive integers");
  }
  return position;
}

/** desc:import-object - our export seen from the receiver's side. */
export function importObjectDesc(position, ref) {
  return {
    kind: "desc:import-object",
    position: positiveInteger(position),
    ...(ref === undefined ? {} : { ref: ref.id }),
  };
}

/** desc:import-promise - our exported promise seen from the receiver's side. */
export function importPromiseDesc(position, promise) {
  return {
    kind: "desc:import-promise",
    position: positiveInteger(position),
    ...(promise === undefined ? {} : { promise }),
  };
}

/** desc:export - a remote object imported into the session we are messaging. */
export function exportDesc(position, ref) {
  return {
    kind: "desc:export",
    position: nonNegativeInteger(position),
    ...(ref === undefined ? {} : { ref: ref.id }),
  };
}

/** desc:answer - the answer position used by promise pipelining. */
export function answerDesc(delivery, position) {
  return {
    kind: "desc:answer",
    position: positiveInteger(position),
    answer: delivery.answer,
  };
}

/** desc:sig-envelope - pure value envelope for the signed handoff records. */
export function sigEnvelope(
  payload,
  signer,
  signature,
) {
  return {
    kind: "desc:sig-envelope",
    payload,
    signer,
    signature,
  };
}

/** desc:handoff-give - the gifter's certificate for a deposited gift. */
export function handoffGiveDesc(gift) {
  return {
    kind: "desc:handoff-give",
    receiverKey: gift.receiverKey,
    exporterLocation: gift.exporterLocation,
    session: gift.gifterExporterSession,
    gifterSide: gift.gifterSide ?? gift.gifter,
    giftId: gift.id,
  };
}

/** desc:handoff-receive - the receiver's certificate redeeming the signed give. */
export function handoffReceiveDesc(
  claim,
  signedGive,
) {
  return {
    kind: "desc:handoff-receive",
    receivingSession: claim.receivingSession,
    receivingSide: claim.receivingSide,
    handoffCount: nonNegativeInteger(claim.handoffCount),
    signedGive,
  };
}

/** A stable descriptor identity for witness rows and wire-table reconciliation. */
export function descriptorStandingKey(descriptor) {
  switch (descriptor.kind) {
    case "desc:import-object":
      return `${descriptor.kind}:${descriptor.position}:${descriptor.ref ?? ""}`;
    case "desc:import-promise":
      return `${descriptor.kind}:${descriptor.position}:${descriptor.promise ?? ""}`;
    case "desc:export":
      return `${descriptor.kind}:${descriptor.position}:${descriptor.ref ?? ""}`;
    case "desc:answer":
      return `${descriptor.kind}:${descriptor.position}:${descriptor.answer}`;
    case "desc:handoff-give":
      return `${descriptor.kind}:${descriptor.session}:${descriptor.gifterSide}:${descriptor.giftId}`;
    case "desc:handoff-receive":
      return `${descriptor.kind}:${descriptor.receivingSession}:${descriptor.receivingSide}:${descriptor.handoffCount}:${descriptor.signedGive.signature}`;
    case "desc:sig-envelope":
      return `${descriptor.kind}:${descriptor.signer}:${descriptor.signature}:${descriptorStandingKey(descriptor.payload)}`;
  }
}

/* ------------------------------------------------------------------------- *
 * §8  Reference equality / joining.
 * ------------------------------------------------------------------------- */

function candidateRefIds(candidates) {
  return Object.freeze(candidates.map((candidate) => candidate.ref.id));
}

function heldPresence(vats, ref) {
  for (const vat of vats) {
    const presence = vat.presences.find((entry) =>
      (entry.id === ref.id || entry.resolvedTo === ref.id)
      && (entry.status === "live" || entry.status === "settled")
    );
    if (presence !== undefined) return presence;
  }
  return undefined;
}

/**
 * joinReferences - CapTP level-4 reference equality as a held-power witness. Two
 * or more refs join only when they name the same locus and every ref is present
 * as a live/settled import/export/promise in the supplied vats. This captures
 * the Cap'n Proto/E equality move: secure sameness is verified by references
 * the parties actually hold, not by consulting ambient object ids.
 */
export function joinReferences(
  candidates,
  vats,
) {
  if (candidates.length < 2) {
    return {
      kind: "animating.captp.reference-join",
      status: "blocked",
      candidates: Object.freeze([...candidates]),
      joinedRefs: candidateRefIds(candidates),
      reason: "at least two references are required to verify equality",
    };
  }

  const first = candidates[0];
  if (first === undefined) {
    return {
      kind: "animating.captp.reference-join",
      status: "blocked",
      candidates: Object.freeze([...candidates]),
      joinedRefs: candidateRefIds(candidates),
      reason: "at least two references are required to verify equality",
    };
  }
  const mismatched = candidates.slice(1).find((candidate) => candidate.ref.locus !== first.ref.locus);
  if (mismatched !== undefined) {
    return {
      kind: "animating.captp.reference-join",
      status: "blocked",
      candidates: Object.freeze([...candidates]),
      joinedRefs: candidateRefIds(candidates),
      reason: "references do not share a locus",
    };
  }

  const unheld = candidates.find((candidate) => heldPresence(vats, candidate.ref) === undefined);
  if (unheld !== undefined) {
    return {
      kind: "animating.captp.reference-join",
      status: "blocked",
      locus: first.ref.locus,
      candidates: Object.freeze([...candidates]),
      joinedRefs: candidateRefIds(candidates),
      reason: `reference is not live in the supplied vat tables: ${unheld.ref.id}`,
    };
  }

  return {
    kind: "animating.captp.reference-join",
    status: "joined",
    locus: first.ref.locus,
    candidates: Object.freeze([...candidates]),
    joinedRefs: candidateRefIds(candidates),
  };
}

/** refJoinStandingKey - the time-forgotten identity of a successful or blocked join. */
export function refJoinStandingKey(join) {
  return [
    "captp.reference-join",
    join.status,
    join.locus ?? "",
    [...join.joinedRefs].sort().join(","),
  ].join("|");
}

function joinWitnessAttribute(join, candidate) {
  return [
    "captp.reference-join",
    `status=${join.status}`,
    `locus=${join.locus ?? ""}`,
    `ref=${candidate.ref.id}`,
    `holder=${candidate.ref.holder}`,
    `via=${candidate.via ?? ""}`,
    `descriptor=${candidate.descriptor === undefined ? "" : descriptorStandingKey(candidate.descriptor)}`,
  ].join("|");
}

/** Project a reference join judgment into witness-journal-shaped equality evidence. */
export function refJoinWitnessLog(join, at) {
  return Object.freeze(join.candidates.map((candidate, index) => Object.freeze({
    e: candidate.ref.id,
    a: joinWitnessAttribute(join, candidate),
    v: join.status === "joined" ? "joined" : "blocked",
    t: at ?? `captp:join:${index}`,
  })));
}

/* ------------------------------------------------------------------------- *
 * §9  Sessions and operations: the protocol verbs as pure values.
 * ------------------------------------------------------------------------- */

function keyMaterialBytes(material) {
  return typeof material === "string" ? new TextEncoder().encode(material) : material;
}

function hex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function identifierBytes(identifier) {
  if (/^[0-9a-f]+$/i.test(identifier) && identifier.length % 2 === 0) {
    const bytes = new Uint8Array(identifier.length / 2);
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Number.parseInt(identifier.slice(index * 2, index * 2 + 2), 16);
    }
    return bytes;
  }
  return keyMaterialBytes(identifier);
}

function compareIdentifiers(left, right) {
  const leftBytes = identifierBytes(left);
  const rightBytes = identifierBytes(right);
  const length = Math.min(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (leftBytes[index] ?? 0) - (rightBytes[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return leftBytes.length - rightBytes.length;
}

/** CapTP public identifier: SHA-256(SHA-256(public-key-material)). */
export function captpPublicIdentifier(publicKeyMaterial) {
  return hex(sha256(sha256(keyMaterialBytes(publicKeyMaterial))));
}

/** Deterministic session id for a public-identifier pair, order-insensitive. */
export function captpSessionIdentifier(leftPublicIdentifier, rightPublicIdentifier) {
  const ordered = compareIdentifiers(leftPublicIdentifier, rightPublicIdentifier) <= 0
    ? [leftPublicIdentifier, rightPublicIdentifier]
    : [rightPublicIdentifier, leftPublicIdentifier];
  return hex(sha256(sha256(keyMaterialBytes(ordered.join(":")))));
}

/** op:start-session - local hello for a new CapTP session. */
export function startSessionOp(
  sessionPubkey,
  acceptableLocation,
  acceptableLocationSig,
  captpVersion = "1.0",
) {
  return {
    kind: "op:start-session",
    captpVersion,
    sessionPubkey,
    acceptableLocation,
    acceptableLocationSig,
  };
}

/** openSession - create local session state and its outbound op:start-session. */
export function openSession(options) {
  const session = {
    kind: "animating.captp.session",
    id: options.id,
    version: "1.0",
    localLocation: options.localLocation,
    localPublicKey: options.localPublicKey,
    localSide: options.localSide,
    acceptableLocationSig: options.acceptableLocationSig,
    status: "starting",
  };
  return {
    kind: "animating.captp.session-step",
    session,
    operation: startSessionOp(options.localPublicKey, options.localLocation, options.acceptableLocationSig),
  };
}

/** receiveStartSession - verify the remote hello enough to make the session live. */
export function receiveStartSession(session, operation, remoteSide) {
  if (session.status === "aborted") return session;
  if (session.remotePublicKey !== undefined) {
    return { ...session, status: "aborted", abortReason: "op:start-session received twice" };
  }
  if (operation.captpVersion !== "1.0") {
    return { ...session, status: "aborted", abortReason: "unsupported CapTP version" };
  }
  return {
    ...session,
    remoteLocation: operation.acceptableLocation,
    remotePublicKey: operation.sessionPubkey,
    status: "live",
    ...(remoteSide === undefined ? {} : { remoteSide }),
  };
}

/**
 * resolveCrossedHellos - deterministically collapse simultaneous CapTP opens to
 * one surviving session. The caller supplies the public identifiers derived from
 * the per-session public keys; the higher identifier wins, matching the CapTP
 * crossed-hello rule without making this pure value layer own wire crypto.
 */
export function resolveCrossedHellos(
  local,
  remote,
  localPublicIdentifier,
  remotePublicIdentifier,
) {
  const comparison = compareIdentifiers(localPublicIdentifier, remotePublicIdentifier);
  const winner = comparison > 0 ? "local" : comparison < 0 ? "remote" : "tie";
  const reason = winner === "tie"
    ? "crossed hellos have identical public identifiers"
    : `crossed hellos resolved by higher public identifier: ${winner}`;
  const localWithRemote = {
    ...local,
    remoteLocation: remote.localLocation,
    remotePublicKey: remote.localPublicKey,
    remoteSide: remote.localSide,
  };
  const remoteWithLocal = {
    ...remote,
    remoteLocation: local.localLocation,
    remotePublicKey: local.localPublicKey,
    remoteSide: local.localSide,
  };
  if (winner === "local") {
    return {
      kind: "animating.captp.crossed-hello-resolution",
      winner,
      kept: { ...localWithRemote, status: "live" },
      dropped: { ...remoteWithLocal, status: "aborted", abortReason: reason },
      localPublicIdentifier,
      remotePublicIdentifier,
      reason,
    };
  }
  if (winner === "remote") {
    return {
      kind: "animating.captp.crossed-hello-resolution",
      winner,
      kept: { ...remoteWithLocal, status: "live" },
      dropped: { ...localWithRemote, status: "aborted", abortReason: reason },
      localPublicIdentifier,
      remotePublicIdentifier,
      reason,
    };
  }
  return {
    kind: "animating.captp.crossed-hello-resolution",
    winner,
    kept: { ...localWithRemote, status: "aborted", abortReason: reason },
    dropped: { ...remoteWithLocal, status: "aborted", abortReason: reason },
    localPublicIdentifier,
    remotePublicIdentifier,
    reason,
  };
}

/** op:deliver - the common operation behind ordinary calls, pipelining, and bootstrap methods. */
export function deliverOp(
  toDesc,
  args,
  answerPos = false,
  resolveMeDesc = false,
) {
  if (answerPos !== false) positiveInteger(answerPos);
  return {
    kind: "op:deliver",
    toDesc,
    args: Object.freeze([...args]),
    answerPos,
    resolveMeDesc,
  };
}

/** op:listen - request one settlement notification for a promise/exported promise. */
export function listenOp(
  toDesc,
  listenDesc,
) {
  return {
    kind: "op:listen",
    toDesc,
    listenDesc,
  };
}

/** Resolver method `fulfill`: send a settlement value to an exported resolver. */
export function fulfillResolverOp(resolverDesc, value) {
  return deliverOp(resolverDesc, ["fulfill", value], false, false);
}

/** Resolver method `break`: send an error value to an exported resolver. */
export function breakResolverOp(resolverDesc, reason) {
  return deliverOp(resolverDesc, ["break", reason], false, false);
}

/** op:get - project a named field out of an eventually settled Struct. */
export function getOp(
  receiverDesc,
  fieldName,
  newAnswerPos,
) {
  return {
    kind: "op:get",
    receiverDesc,
    fieldName,
    newAnswerPos: positiveInteger(newAnswerPos),
  };
}

/** op:index - project an index out of an eventually settled List. */
export function indexOp(
  receiverDesc,
  index,
  newAnswerPos,
) {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError("CapTP op:index indices must be non-negative integers");
  }
  return {
    kind: "op:index",
    receiverDesc,
    index,
    newAnswerPos: positiveInteger(newAnswerPos),
  };
}

/** op:untag - assert and project a tag out of an eventually settled Tagged value. */
export function untagOp(
  receiverDesc,
  tag,
  newAnswerPos,
) {
  return {
    kind: "op:untag",
    receiverDesc,
    tag,
    newAnswerPos: positiveInteger(newAnswerPos),
  };
}

/** Bootstrap fetch: <op:deliver <desc:export 0> ['fetch swiss-number] answer resolver>. */
export function bootstrapFetchOp(
  swissNumber,
  answerPos,
  resolverPosition,
) {
  return deliverOp(exportDesc(0), ["fetch", swissNumber], positiveInteger(answerPos), importObjectDesc(resolverPosition));
}

/** Bootstrap deposit-gift: deposit a live gifted import at the exporter's bootstrap object. */
export function bootstrapDepositGiftOp(gift, objectPosition) {
  if (gift.status !== "offered" || gift.ref === undefined) {
    throw new Error(gift.reason ?? "only an offered handoff gift can be deposited");
  }
  return deliverOp(exportDesc(0), ["deposit-gift", gift.id, importObjectDesc(objectPosition, gift.ref)], false, false);
}

/** Bootstrap withdraw-gift: redeem a signed desc:handoff-receive at the exporter. */
export function bootstrapWithdrawGiftOp(
  signedReceive,
  answerPos,
  resolverPosition,
) {
  return deliverOp(exportDesc(0), ["withdraw-gift", signedReceive], positiveInteger(answerPos), importObjectDesc(resolverPosition));
}

/** op:gc-answers - release answer positions once their promises are no longer needed. */
export function gcAnswersOp(answerPositions) {
  return {
    kind: "op:gc-answers",
    answerPositions: Object.freeze(answerPositions.map((position) => positiveInteger(position))),
  };
}

/** op:gc-exports - release counted exported object references by wire delta. */
export function gcExportsOp(exportPositions, wireDeltas) {
  if (exportPositions.length !== wireDeltas.length) {
    throw new RangeError("CapTP op:gc-exports export positions and wire deltas must have the same length");
  }
  return {
    kind: "op:gc-exports",
    exportPositions: Object.freeze(exportPositions.map((position) => positiveInteger(position))),
    wireDeltas: Object.freeze(wireDeltas.map((delta) => positiveInteger(delta))),
  };
}

/** op:abort - sever the session and force unresolved promise breakage upstream. */
export function abortOp(reason) {
  return { kind: "op:abort", reason };
}

/** abortSession - update session state and emit the corresponding op:abort. */
export function abortSession(session, reason) {
  const operation = abortOp(reason);
  return {
    kind: "animating.captp.session-step",
    session: { ...session, status: "aborted", abortReason: reason },
    operation,
  };
}

/** Stable operation identity for logs, de-duplication, and projections. */
export function operationStandingKey(operation) {
  switch (operation.kind) {
    case "op:start-session":
      return `${operation.kind}:${operation.captpVersion}:${operation.sessionPubkey}:${operation.acceptableLocation}`;
    case "op:deliver":
      return [
        operation.kind,
        descriptorStandingKey(operation.toDesc),
        operation.answerPos,
        operation.resolveMeDesc === false ? "" : descriptorStandingKey(operation.resolveMeDesc),
        operation.args.map((arg) => typeof arg === "string" ? arg : JSON.stringify(arg)).join(","),
      ].join(":");
    case "op:listen":
      return `${operation.kind}:${descriptorStandingKey(operation.toDesc)}:${descriptorStandingKey(operation.listenDesc)}`;
    case "op:get":
      return `${operation.kind}:${descriptorStandingKey(operation.receiverDesc)}:${operation.fieldName}:${operation.newAnswerPos}`;
    case "op:index":
      return `${operation.kind}:${descriptorStandingKey(operation.receiverDesc)}:${operation.index}:${operation.newAnswerPos}`;
    case "op:untag":
      return `${operation.kind}:${descriptorStandingKey(operation.receiverDesc)}:${operation.tag}:${operation.newAnswerPos}`;
    case "op:gc-answers":
      return `${operation.kind}:${[...operation.answerPositions].sort((a, b) => a - b).join(",")}`;
    case "op:gc-exports":
      return `${operation.kind}:${operation.exportPositions.join(",")}:${operation.wireDeltas.join(",")}`;
    case "op:abort":
      return `${operation.kind}:${operation.reason}`;
  }
}

function operationWitnessValue(operation) {
  switch (operation.kind) {
    case "op:start-session":
      return "started";
    case "op:deliver":
      return "sent";
    case "op:listen":
      return "listened";
    case "op:get":
    case "op:index":
    case "op:untag":
      return "projected";
    case "op:gc-answers":
    case "op:gc-exports":
      return "gc";
    case "op:abort":
      return "aborted";
  }
}

/** Project protocol operations to witness-journal-shaped rows. */
export function operationWitnessLog(operations, at) {
  return Object.freeze(operations.map((operation, index) => Object.freeze({
    e: operation.kind,
    a: operationStandingKey(operation),
    v: operationWitnessValue(operation),
    t: at ?? `captp:op:${index}`,
  })));
}

/**
 * foldSessionTranscript - enforce the session boundary at the operation stream.
 * Once op:abort is accepted, later operations are blocked: no authority can cross
 * an ended CapTP session.
 */
export function foldSessionTranscript(session, operations) {
  const accepted = [];
  const blocked = [];
  let abort;

  operations.forEach((operation, index) => {
    if (abort !== undefined) {
      blocked.push(Object.freeze({
        kind: "animating.captp.transcript-blocked-operation",
        index,
        operation: operationStandingKey(operation),
        reason: "session already aborted",
      }));
      return;
    }
    accepted.push(operation);
    if (operation.kind === "op:abort") abort = operation;
  });

  return {
    kind: "animating.captp.session-transcript",
    session,
    status: abort === undefined ? "live" : "aborted",
    operations: Object.freeze(accepted),
    blocked: Object.freeze(blocked),
    ...(abort === undefined ? {} : { abort }),
  };
}

/** Project a folded session transcript to witness-journal-shaped operation-boundary rows. */
export function sessionTranscriptWitnessLog(transcript, at) {
  const acceptedRows = transcript.operations.map((operation, index) => Object.freeze({
    e: transcript.session,
    a: [
      "captp.session-transcript",
      `operation=${operationStandingKey(operation)}`,
      `status=${transcript.status}`,
    ].join("|"),
    v: operationWitnessValue(operation),
    t: at ?? `captp:transcript:${index}`,
  }));
  const blockedRows = transcript.blocked.map((entry, index) => Object.freeze({
    e: transcript.session,
    a: [
      "captp.session-transcript.blocked",
      `index=${entry.index}`,
      `operation=${entry.operation}`,
      `reason=${entry.reason}`,
    ].join("|"),
    v: "blocked",
    t: at ?? `captp:transcript-blocked:${index}`,
  }));
  return Object.freeze([...acceptedRows, ...blockedRows]);
}

function transcriptCommitHash(session, index, operation, previous) {
  return hex(sha256(keyMaterialBytes([
    "captp.transcript-commit",
    session,
    String(index),
    previous,
    operation,
  ].join("\n"))));
}

/**
 * commitSessionTranscript - Lamport/Merkle-style causal commitment for accepted
 * CapTP operations. The head commits to every prior accepted operation in order;
 * blocked post-abort operations stay outside the chain and remain separate
 * boundary evidence.
 */
export function commitSessionTranscript(transcript, seed = "captp:genesis") {
  let previous = seed;
  const commits = transcript.operations.map((operation, index) => {
    const operationKey = operationStandingKey(operation);
    const hash = transcriptCommitHash(transcript.session, index, operationKey, previous);
    const commit = Object.freeze({
      kind: "animating.captp.transcript-commit",
      session: transcript.session,
      index,
      operation: operationKey,
      previous,
      hash,
    });
    previous = hash;
    return commit;
  });
  return {
    kind: "animating.captp.transcript-commit-chain",
    session: transcript.session,
    seed,
    commits: Object.freeze(commits),
    head: previous,
  };
}

/** Project a transcript commitment chain to witness-journal-shaped rows. */
export function transcriptCommitWitnessLog(chain, at) {
  return Object.freeze(chain.commits.map((commit, index) => Object.freeze({
    e: chain.session,
    a: [
      "captp.transcript-commit",
      `index=${commit.index}`,
      `operation=${commit.operation}`,
      `previous=${commit.previous}`,
      `hash=${commit.hash}`,
      `head=${chain.head}`,
    ].join("|"),
    v: "committed",
    t: at ?? `captp:transcript-commit:${index}`,
  })));
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function isDescriptor(value) {
  return isRecord(value)
    && typeof value.kind === "string"
    && value.kind.startsWith("desc:");
}

function collectDescriptors(value, seen = new WeakSet()) {
  if (!isRecord(value)) return Object.freeze([]);
  if (seen.has(value)) return Object.freeze([]);
  seen.add(value);

  const descriptors = [];
  if (isDescriptor(value)) descriptors.push(value);
  if (Array.isArray(value)) {
    for (const item of value) descriptors.push(...collectDescriptors(item, seen));
    return Object.freeze(descriptors);
  }
  for (const child of Object.values(value)) descriptors.push(...collectDescriptors(child, seen));
  return Object.freeze(descriptors);
}

function operationDescriptors(operation) {
  switch (operation.kind) {
    case "op:deliver":
      return Object.freeze([
        operation.toDesc,
        ...(operation.resolveMeDesc === false ? [] : [operation.resolveMeDesc]),
        ...operation.args.flatMap((arg) => collectDescriptors(arg)),
      ]);
    case "op:listen":
      return Object.freeze([operation.toDesc, operation.listenDesc]);
    case "op:get":
    case "op:index":
    case "op:untag":
      return Object.freeze([operation.receiverDesc]);
    case "op:start-session":
    case "op:gc-answers":
    case "op:gc-exports":
    case "op:abort":
      return Object.freeze([]);
  }
}

function referencedAnswerPositions(operation) {
  const positions = operationDescriptors(operation)
    .filter((descriptor) => descriptor.kind === "desc:answer")
    .map((descriptor) => descriptor.position);
  return Object.freeze([...new Set(positions)]);
}

function createdAnswerPositions(operation) {
  switch (operation.kind) {
    case "op:deliver":
      return operation.answerPos === false ? Object.freeze([]) : Object.freeze([operation.answerPos]);
    case "op:get":
    case "op:index":
    case "op:untag":
      return Object.freeze([operation.newAnswerPos]);
    case "op:start-session":
    case "op:listen":
    case "op:gc-answers":
    case "op:gc-exports":
    case "op:abort":
      return Object.freeze([]);
  }
}

function answerSlot(position, status, rest = {}) {
  return Object.freeze({
    kind: "animating.captp.answer-slot",
    position,
    status,
    ...rest,
  });
}

function answerAnomaly(position, operation, reason) {
  return Object.freeze({
    kind: "animating.captp.answer-anomaly",
    position,
    operation: operationStandingKey(operation),
    reason,
  });
}

/**
 * foldAnswerTable - enforce CapTP answer-position session discipline. Answer
 * positions are affine session loci: creation must be unique, desc:answer may
 * only name a live slot, and op:gc-answers drops that locus for later use.
 */
export function foldAnswerTable(session, operations) {
  const answers = new Map();
  const blocked = [];

  for (const operation of operations) {
    let operationBlockedReason;
    for (const position of referencedAnswerPositions(operation)) {
      const slot = answers.get(position);
      if (slot === undefined) {
        const reason = "answer position has not been created";
        operationBlockedReason ??= reason;
        blocked.push(answerAnomaly(position, operation, reason));
      } else if (slot.status === "dropped") {
        const reason = "answer position was already garbage-collected";
        operationBlockedReason ??= reason;
        blocked.push(answerAnomaly(position, operation, reason));
      } else if (slot.status === "blocked") {
        const reason = slot.reason ?? "answer position is blocked";
        operationBlockedReason ??= reason;
        blocked.push(answerAnomaly(position, operation, reason));
      }
    }

    for (const position of createdAnswerPositions(operation)) {
      const existing = answers.get(position);
      if (existing !== undefined) {
        const reason = "answer position was already created";
        answers.set(position, answerSlot(position, "blocked", {
          ...(existing.createdBy === undefined ? {} : { createdBy: existing.createdBy }),
          reason,
        }));
        blocked.push(answerAnomaly(position, operation, reason));
      } else if (operationBlockedReason !== undefined) {
        answers.set(position, answerSlot(position, "blocked", {
          createdBy: operationStandingKey(operation),
          reason: operationBlockedReason,
        }));
      } else {
        answers.set(position, answerSlot(position, "live", { createdBy: operationStandingKey(operation) }));
      }
    }

    if (operation.kind === "op:gc-answers") {
      for (const position of operation.answerPositions) {
        const existing = answers.get(position);
        if (existing === undefined) {
          blocked.push(answerAnomaly(position, operation, "cannot garbage-collect an unknown answer position"));
        } else {
          answers.set(position, answerSlot(position, "dropped", {
            ...(existing.createdBy === undefined ? {} : { createdBy: existing.createdBy }),
            droppedBy: operationStandingKey(operation),
          }));
        }
      }
    }
  }

  return {
    kind: "animating.captp.answer-table",
    session,
    answers: Object.freeze([...answers.values()].sort((left, right) => left.position - right.position)),
    blocked: Object.freeze(blocked),
  };
}

function answerSlotWitnessValue(slot) {
  switch (slot.status) {
    case "live":
      return "admitted";
    case "dropped":
      return "dropped";
    case "blocked":
      return "blocked";
  }
}

/** Project a folded answer table to witness-journal-shaped rows, including blocked uses. */
export function answerTableWitnessLog(table, at) {
  const answerRows = table.answers.map((slot, index) => Object.freeze({
    e: `${table.session}:answer:${slot.position}`,
    a: [
      "captp.answer-slot",
      `position=${slot.position}`,
      `status=${slot.status}`,
      `createdBy=${slot.createdBy ?? ""}`,
      `droppedBy=${slot.droppedBy ?? ""}`,
      `reason=${slot.reason ?? ""}`,
    ].join("|"),
    v: answerSlotWitnessValue(slot),
    t: at ?? `captp:answer:${index}`,
  }));
  const blockedRows = table.blocked.map((anomaly, index) => Object.freeze({
    e: `${table.session}:answer:${anomaly.position}`,
    a: [
      "captp.answer-anomaly",
      `position=${anomaly.position}`,
      `operation=${anomaly.operation}`,
      `reason=${anomaly.reason}`,
    ].join("|"),
    v: "blocked",
    t: at ?? `captp:answer-blocked:${index}`,
  }));
  return Object.freeze([...answerRows, ...blockedRows]);
}

function listenPosition(desc) {
  return desc.position;
}

function settlementValue(operation) {
  const [method, payload] = operation.args;
  if (method === "fulfill") return { status: "fulfilled", value: payload };
  if (method === "break") return { status: "broken", reason: payload };
  return undefined;
}

/**
 * foldPromiseTrace - read a session operation transcript as promise-settlement
 * state. `op:listen` creates a listener keyed by the imported resolver position;
 * a later resolver delivery with `fulfill` or `break` consumes that listener.
 */
export function foldPromiseTrace(operations) {
  const traces = new Map();
  for (const operation of operations) {
    if (operation.kind === "op:listen") {
      const resolverPosition = listenPosition(operation.listenDesc);
      traces.set(resolverPosition, {
        kind: "animating.captp.promise-trace-entry",
        promise: descriptorStandingKey(operation.toDesc),
        resolverPosition,
        status: "listening",
      });
      continue;
    }
    if (operation.kind === "op:abort") {
      for (const [resolverPosition, entry] of traces.entries()) {
        if (entry.status === "listening") {
          traces.set(resolverPosition, { ...entry, status: "broken", reason: operation.reason });
        }
      }
      continue;
    }
    if (operation.kind !== "op:deliver" || operation.toDesc.kind !== "desc:export") continue;
    const settlement = settlementValue(operation);
    if (settlement === undefined) continue;
    const prior = traces.get(operation.toDesc.position);
    if (prior === undefined) continue;
    traces.set(operation.toDesc.position, settlement.status === "fulfilled"
      ? { ...prior, status: "fulfilled", value: settlement.value }
      : { ...prior, status: "broken", reason: settlement.reason });
  }
  return Object.freeze([...traces.values()]);
}

function promiseTraceWitnessValue(entry) {
  switch (entry.status) {
    case "listening":
      return "listened";
    case "fulfilled":
      return "settled";
    case "broken":
      return "broken";
  }
}

/** Project a folded promise trace to witness-journal-shaped listener/settlement rows. */
export function promiseTraceWitnessLog(trace, at) {
  return Object.freeze(trace.map((entry, index) => Object.freeze({
    e: entry.promise,
    a: [
      "captp.promise-trace",
      `resolver=${entry.resolverPosition}`,
      `status=${entry.status}`,
    ].join("|"),
    v: promiseTraceWitnessValue(entry),
    t: at ?? `captp:promise-trace:${index}`,
  })));
}

function projectionTraceEntry(operation) {
  switch (operation.kind) {
    case "op:get":
      return {
        kind: "animating.captp.projection-trace-entry",
        selector: "field",
        receiver: descriptorStandingKey(operation.receiverDesc),
        value: operation.fieldName,
        answerPos: operation.newAnswerPos,
      };
    case "op:index":
      return {
        kind: "animating.captp.projection-trace-entry",
        selector: "index",
        receiver: descriptorStandingKey(operation.receiverDesc),
        value: operation.index,
        answerPos: operation.newAnswerPos,
      };
    case "op:untag":
      return {
        kind: "animating.captp.projection-trace-entry",
        selector: "tag",
        receiver: descriptorStandingKey(operation.receiverDesc),
        value: operation.tag,
        answerPos: operation.newAnswerPos,
      };
  }
}

/** foldProjectionTrace - read get/index/untag operations as future structural paths. */
export function foldProjectionTrace(operations) {
  return Object.freeze(operations
    .filter((operation) =>
      operation.kind === "op:get" || operation.kind === "op:index" || operation.kind === "op:untag")
    .map((operation) => Object.freeze(projectionTraceEntry(operation))));
}

/** Project structural promise selectors to witness-journal-shaped rows. */
export function projectionTraceWitnessLog(trace, at) {
  return Object.freeze(trace.map((entry, index) => Object.freeze({
    e: `desc:answer:${entry.answerPos}`,
    a: [
      "captp.projection-trace",
      `receiver=${entry.receiver}`,
      `selector=${entry.selector}`,
      `value=${entry.value}`,
    ].join("|"),
    v: "projected",
    t: at ?? `captp:projection-trace:${index}`,
  })));
}

/** Project a session state to an witness-journal-shaped row. */
export function sessionWitnessLog(session, at) {
  return Object.freeze([Object.freeze({
    e: session.id,
    a: [
      "captp.session",
      `status=${session.status}`,
      `local=${session.localLocation}`,
      `remote=${session.remoteLocation ?? ""}`,
      `localSide=${session.localSide}`,
      `remoteSide=${session.remoteSide ?? ""}`,
    ].join("|"),
    v: session.status === "aborted" ? "aborted" : "started",
    t: at ?? "captp:session:0",
  })]);
}

/** Project a crossed-hello resolution to witness-journal-shaped session arbitration rows. */
export function crossedHelloWitnessLog(resolution, at) {
  const sessions = [
    { role: "kept", session: resolution.kept },
    { role: "dropped", session: resolution.dropped },
  ];
  return Object.freeze(sessions.map(({ role, session }, index) => Object.freeze({
    e: session.id,
    a: [
      "captp.crossed-hello",
      `role=${role}`,
      `winner=${resolution.winner}`,
      `localIdentifier=${resolution.localPublicIdentifier}`,
      `remoteIdentifier=${resolution.remotePublicIdentifier}`,
      `reason=${resolution.reason}`,
    ].join("|"),
    v: session.status === "aborted" ? "aborted" : "started",
    t: at ?? `captp:crossed-hello:${index}`,
  })));
}

/* ------------------------------------------------------------------------- *
 * §10  The gate: a delivery is admissible only when the holder holds the move.
 * ------------------------------------------------------------------------- */

/** The outcome of admitting a delivery against the holder's affordances. */

/**
 * admit — the CapTP message-delivery gate, grounded in the OUT/playing face exactly
 * as the activitypub OCap brick's `canInvoke`: a delivery is admissible iff the
 * target ref's locus is a move the holder actually has (among `affordances` — the
 * open cells `act` reports). Authority by MOVE, not by possession-of-bytes: an
 * unforgeable ref to a locus you do not hold is still undeliverable. This is the
 * unforgeable-reference soundness property CapTP needs, gotten from the cut, not
 * from an ACL.
 */
export function admit(affordances, ref) {
  const capabilityView = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: ref.id,
    type: "Capability",
    grants: ref.locus,
    holder: ref.holder,
  };
  return { locus: ref.locus, admitted: canInvoke(affordances, capabilityView) };
}
