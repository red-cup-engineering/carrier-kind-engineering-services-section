import { deliverOrHold } from "./held-delivery.mjs";
export { presenceOf, HELD_DELIVERY_TYPE, holdForPeer, heldFor, heldDeliveryPage, deliverOrHold, signedRequestActor, heldDeliveryResponse } from "./held-delivery.mjs";
import { agencyAt, agencyRootOf, coordinatingOfficeSession } from "@red-cup-engineering/metroplat/offices";
import { deliverActivity } from "@red-cup-engineering/activitypub-services-section";
import { extractSignStuffEvidenceActivity, projectSignStuffEvidenceActivity, senActivityObjectBytes } from "@red-cup-engineering/activitypub-services-section/sen-activity";
import { put } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { homeHostOf, moveOf, openingOf, OPENING_MOVES, readForward, responseOf, TOLD_MOVES, unreadReasonOf, workArenaLawOf, workHomesOf } from "@red-cup-engineering/organizing/enterprise";
import { holderOf, settlementIntake, workBoardStore, workBoardCauses, WORK_BOARD_KIND } from "@red-cup-engineering/feltos/work/work-board";
import { admitCapabilityAssertions, readCapabilityAssertions } from "@red-cup-engineering/computer-system-engine/rpc/capability-assertions";
import { authorizationFromCapabilityAssertions, authorizationFromStanding } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { can, capabilityGrant, grantAssertion, PUBLIC_HOLDER } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { readingAs } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** An opening move of the work arena, carried between peer settlements as SignCell evidence. */
export const WORK_OPENING_OBJECT_KIND = "metroplat.work.arena-opening";

/**
 * A telling (the arena's `TOLD_MOVES`: an observation, argument, corroboration, answer or witness),
 * carried between peer settlements. Tellings merge as a join, so a peer admits them in any order
 * without coordinating with the thread's home (CALM); a coordinated move (a hold, a promise, a
 * withdrawal) is played only on the thread's own board and never travels.
 */
export const WORK_TELLING_OBJECT_KIND = "metroplat.work.arena-telling";
const TOLD = new Set(Object.values(TOLD_MOVES).flat());

/**
 * The work-move kinds a peer can deliver. A peer's authority for each is its standing for the grant
 * `<node origin>#work-<kind>` in the receiving node's own capability-assertions feed: a peer is a
 * holder, never an identity this node compares against a configured actor.
 */
export const WORK_MOVE_KINDS = Object.freeze(["opening", "telling", "decision", "forward", "refusal"]);

/** The grant a peer holds to deliver one kind of work move to the node at `origin`. */
export function workGrant(origin, kind) {
  if (!WORK_MOVE_KINDS.includes(kind)) throw new TypeError(`${kind} is not a federated work move`);
  return capabilityGrant(new URL(origin).origin, `work-${kind}`);
}

/** The store type of the witness of every disposition a peer's delivery received (the witness names its `disposition`). */
export const WORK_ADMISSION_TYPE = "federated-work-admission";

/** The four standings the gate reads, in the specification's words (extremal reading names). */
const STANDING = Object.freeze({ unknown: "unevidenced", held: "held", denied: "refused", contested: "contested" });
const DISPOSITION = Object.freeze({ unevidenced: "refused", held: "admitted", refused: "refused", contested: "held" });

/**
 * Decide a peer's delivery by the standing its sender holds, at the gate a local invocation passes
 * (`authorizationFromCapabilityAssertions`), over an uncached, fail-closed read of this node's feed.
 * Held admits; unevidenced and refused refuse with the obstruction; contested holds the delivery
 * unadmitted for repair. Every disposition is admitted as a witness before it takes effect.
 */
function admitByStanding({ kind, senderActorId, origin, binding, subject, value }) {
  if (typeof senderActorId !== "string" || senderActorId === "") throw new TypeError(`federated work ${kind} needs its signed sender`);
  if (typeof origin !== "string" || origin === "") throw new TypeError("federated work admission needs this node's origin");
  const grant = workGrant(origin, kind);
  const operation = Object.freeze({ ref: `federated-work:${kind}`, verb: `work-${kind}` });
  const at = binding.now();
  const decision = authorizationFromCapabilityAssertions(
    authorizationFromStanding(new Map([[operation.ref, "held"]]), "federated-work"),
    () => readCapabilityAssertions(binding.dataRoot), "settled-capability-assertions",
  )(Object.freeze({ id: subject ?? `${kind}:${senderActorId}:${at}`, subject: senderActorId, resource: new URL(origin).origin }), operation, at);
  // Any reading the gate does not name as one of the four is not held, and is refused.
  const standing = decision.ok ? "held" : STANDING[readingAs("extremal", decision.reading)] ?? "refused";
  const disposition = decision.ok ? "admitted" : DISPOSITION[standing];
  const reasons = disposition === "admitted" ? [] : standing === "unevidenced"
    ? [`${senderActorId} holds no standing for ${grant} in this node's capability-assertions feed; the ${kind} needs that grant`]
    : standing === "contested" ? [`${senderActorId}'s standing for ${grant} is contested; the ${kind} is held unadmitted for repair`]
      : [`${senderActorId}'s standing for ${grant} is ${standing}; the ${kind} is refused`];
  const witness = Object.freeze({
    kind: "metroplat.federated-work.admission", move: kind, disposition, standing, sender: senderActorId, grant,
    ...(subject === undefined ? {} : { subject }), decision: decision.kind, evidence: Object.freeze([...decision.evidence]),
    reasons: Object.freeze(reasons), at,
    // Offered references remain the signed sender's claim. Their witnesses may be absent here;
    // they are not this node's causal predecessors or proof of the original actor's authority.
    ...(value?.causes === undefined ? {} : { sourceCauses: workBoardCauses(value.causes) }),
    // A held delivery keeps what it carried, so a repaired standing can admit it again.
    ...(disposition === "held" ? { value: JSON.parse(JSON.stringify(value ?? null)) } : {}),
  });
  const admitted = put(binding.dataRoot, WORK_ADMISSION_TYPE, JSON.parse(JSON.stringify(witness)));
  if (disposition === "refused") throw Object.assign(new TypeError(reasons[0]), { obstruction: witness });
  return Object.freeze({ ...witness, events: Object.freeze([admitted]) });
}

/** A delivery the sender's contested standing holds: witnessed, never played on the board. */
const held = (witness) => () => Object.freeze({ held: true, witness });

/** The holders this node's feed gives held standing for some work move on it: its work peers. */
export function heldWorkPeers(assertions, origin) {
  const own = new URL(origin).origin;
  const holders = new Set(assertions.filter((assertion) => assertion.holder !== PUBLIC_HOLDER && assertion.grants.startsWith(`${own}#work-`)).map((assertion) => assertion.holder));
  return Object.freeze([...holders].filter((holder) => WORK_MOVE_KINDS.some((kind) => readingAs("extremal", can(assertions, holder, workGrant(own, kind)).value) === "held")).sort());
}

/**
 * The actors this node hands work to. With a data root they are read from its feed, uncached, so a
 * peer is whoever holds a work grant here and a revocation stops the handing on; without one (a node
 * that keeps no feed) they are the declared `workPeers`.
 */
export function workPeersOf(config) {
  if (config.metroplatDataRoot !== undefined && config.publicBaseUrl !== undefined) return heldWorkPeers(readCapabilityAssertions(config.metroplatDataRoot), config.publicBaseUrl);
  return Object.freeze((config.workPeers ?? []).map((peer) => peer.actor));
}

/**
 * Peering: when nodes are first configured as peers, the office holding peering authority here
 * admits a `grant` to each peer's instance actor for the work moves the pair agrees. A grant
 * already asserted, or revoked, for that holder is never asserted again, so declaring a peer cannot
 * undo a revocation; the declaration can be removed once its grants are in the feed.
 */
export function admitWorkPeerGrants({ dataRoot, rootName, origin, issuer, peers = [], at }) {
  if (peers.length === 0) return undefined;
  if (typeof issuer !== "string" || issuer === "") throw new TypeError("work peering needs the office that holds peering authority");
  const asserted = readCapabilityAssertions(dataRoot);
  const assertions = peers.flatMap(({ actor, moves = WORK_MOVE_KINDS }) => moves.map((kind) => workGrant(origin, kind))
    .filter((grant) => !asserted.some((assertion) => assertion.holder === actor && assertion.grants === grant))
    .map((grant) => grantAssertion(issuer, actor, grant, at)));
  return admitCapabilityAssertions({ dataRoot, ...(rootName === undefined ? {} : { rootName }), date: at.slice(0, 10), assertions });
}

/** A queue failure retains the local admission as an explicit, retryable result. */
export async function deliverAdmittedWork(deliver, admission) {
  if (deliver === undefined) return admission;
  try {
    await deliver();
    return Object.freeze({ ...admission, peerHandoff: "queued" });
  } catch {
    return Object.freeze({ ...admission, peerHandoff: "failed" });
  }
}

/** The installed work operation supplies qualification; this port supplies the native carrier.
 * New demands enter the board. Witnessed held-work extensions use the existing enterprise realm
 * resolver and retain the taking's subject. Only board openings travel to the peer. */
export function hostedWorkIntentAdmission({ config, binding, resolveWorkRealm }) {
  const board = workBoardStore(binding, { agency: () => agencyAt(config.agencyRoot ?? agencyRootOf(binding)), homes: workHomesOf(() => agencyAt(config.agencyRoot ?? agencyRootOf(binding))) });
  const intake = settlementIntake({
    binding, board, rootName: config.instance.name, resolveWorkRealm,
    authorizeHeldWork: ({ authorization, intent, taking, context }) => {
      const subject = context?.invocation?.subject;
      if (typeof subject !== "string" || subject.length === 0) throw new TypeError("held work requires an authenticated invocation subject");
      const holderRealm = resolveWorkRealm(taking.player);
      const service = coordinatingOfficeSession(binding, subject, authorization.office, authorization.session, "structured-work-intent-admit");
      if (!holderRealm.officeKeys?.has(service.officeKey)) {
        throw new TypeError("held work office is not staffed by the current taking enterprise");
      }
      if (service.allocation !== undefined) throw new TypeError("held work admission requires directly held office authority");
      if (!service.verbs?.includes("structured-work-intent-admit")
          || !service.capabilities?.includes("structured-work-intent-admit")
          || typeof service.model !== "string" || typeof service.reasoningEffort !== "string") {
        throw new TypeError("held work session lacks the admitted model, effort, or exact office method");
      }
      // Keep this host-created envelope bound to the selected carrier, office, current holder,
      // exact taking subject, and canonical intent. The selector itself grants no authority.
      return Object.freeze({ subject, session: service.session, model: service.model,
        reasoningEffort: service.reasoningEffort, office: service.officeKey,
        method: "structured-work-intent-admit", player: taking.player,
        takingSubject: taking.subject, intent: intent.id, scope: intent.items });
    },
  });
  // Routing may bypass territorial caller context only when the current board
  // resolves this exact intent to a unique live taking. Witness shape alone is
  // not an authority signal; settlementIntake still validates the full witness.
  Object.defineProperty(intake, "isHeldWorkIntent", {
    value: (intent) => holderOf(board.read(), intent) !== undefined,
  });
  return intake;
}

/** Equality is the existing native opening carrier, not only its report-condition id. */
const sameOpening = (left, right) => Buffer.from(senActivityObjectBytes({ objectKind: WORK_OPENING_OBJECT_KIND, value: left }))
  .equals(Buffer.from(senActivityObjectBytes({ objectKind: WORK_OPENING_OBJECT_KIND, value: right })));

/** The host's opening port: retain the original opening, and carry a new report
 * observation as the native corroboration the board actually admitted. */
export function hostedWorkOpening({ config, provider, binding, enterprises, deliver: deliverOpening = deliverActivity }) {
  const agency = () => agencyAt(config.agencyRoot ?? agencyRootOf(binding));
  const board = workBoardStore(binding, { agency, homes: workHomesOf(agency, enterprises) });
  return async (input, { causes: suppliedCauses } = {}) => {
    const causes = workBoardCauses(suppliedCauses);
    // The board admits under its agency's adopted law, which can precede the
    // newest law this release realizes. The offered carrier must name that
    // same edition so a replay is compared with the record actually admitted.
    const fresh = openingOf({ ...input, at: input.at ?? binding.now() }, { law: workArenaLawOf(agency()).inForce });
    const known = board.read(fresh.at).threads.find((thread) => thread.id === fresh.id);
    const transport = provider();
    const opening = known?.opening ?? fresh;
    const originalCauses = known === undefined ? causes : workBoardCauses(board.witnessesOf(opening).flatMap((row) => row.causes ?? []));
    const deliver = prepareWorkOpeningDelivery({ config, provider: transport, opening, causes: originalCauses, deliver: deliverOpening });
    if (known !== undefined && (fresh.move !== "report" || sameOpening(opening, fresh))) {
      // A repeated opening remains the original evidence on both nodes. It is
      // not another report by the earlier speaker at the earlier time.
      return deliverAdmittedWork(deliver, opening);
    }
    if (known === undefined) return deliverAdmittedWork(deliver, board.play(fresh, { causes }));
    // Validate the offered opening's carrier before its local effect. Fixed
    // opening/authority fields are still owned by the board's original record.
    prepareWorkOpeningDelivery({ config, provider: transport, opening: fresh, causes, deliver: deliverOpening });
    const admission = board.play(fresh, { causes });
    const forward = deliver === undefined ? undefined : async () => {
      await deliver();
      // Use the emitted native move, including its actual admitted law/hand.
      // A later preparation/queue failure is an explicit failed peer handoff,
      // not a claim that receiving succeeded or permission to repeat the work.
      const tell = prepareWorkTellingDelivery({ config, provider: transport, telling: admission, causes, deliver: deliverOpening });
      if (tell === undefined) throw new TypeError("admitted report telling lost its peer delivery binding");
      await tell();
    };
    return deliverAdmittedWork(forward, admission);
  };
}

/** An opening as the peer receives it: re-derived from its content, so its id is its content's. */
function assertFederatedOpening(value) {
  if (!OPENING_MOVES.includes(value?.move)) throw new TypeError("federated work evidence must carry one opening move");
  const { id, ...content } = value;
  const opening = openingOf(content);
  if (id !== undefined && id !== opening.id) throw new TypeError("federated opening id does not address its content");
  return opening;
}

/** A telling as the peer receives it: a response whose move is told on some kind of thread. */
function assertFederatedTelling(value) {
  if (!TOLD.has(value?.move)) throw new TypeError("federated work tellings carry one told move; a coordinated move is played on the thread's own board");
  return responseOf(value);
}

/** Whether a response is told on the thread it answers, read from that thread's kind; undefined while the thread is not on this board. */
const toldOn = (board, move) => {
  const thread = board.read(move.at).threads.find((candidate) => candidate.id === move.thread);
  return thread === undefined ? undefined : TOLD_MOVES[thread.opening.move].includes(move.move);
};

/**
 * A move as it travels: checked as this board reads it under the edition that admitted it, or, when
 * this release cannot read it there (organizing `unreadReasonOf`), carried exactly as stored, as the
 * peer keeps it; never re-derived under a law it was not admitted under.
 */
const carried = (move, assert) => (unreadReasonOf(move) === undefined ? assert(move) : move);

/** One opening travels as addressed SignCell evidence, with its player intact. */
export function workOpeningActivity({ origin, identifier, peerActor, opening, at, causes }) {
  return workMoveActivity({ origin, identifier, peerActor, at, objectKind: WORK_OPENING_OBJECT_KIND, value: carried(opening, assertFederatedOpening), causes });
}

/** One telling travels as addressed SignCell evidence, with its player intact. */
export function workTellingActivity({ origin, identifier, peerActor, telling, at, causes }) {
  return workMoveActivity({ origin, identifier, peerActor, at, objectKind: WORK_TELLING_OBJECT_KIND, value: carried(telling, assertFederatedTelling), causes });
}

function workMoveActivity({ origin, identifier, peerActor, at, objectKind, value, causes: suppliedCauses }) {
  const causes = workBoardCauses(suppliedCauses);
  // Transport-only metadata. The arena still derives exactly the same move and thread identity.
  const carriedValue = causes.length === 0 ? value : { ...value, causes };
  return projectSignStuffEvidenceActivity({
    origin, identifier, recipient: peerActor, eventTime: at,
    objectBytes: senActivityObjectBytes({ objectKind, value: carriedValue }),
  });
}

/**
 * A coordinated move played on a thread homed on the peer's node, carried to its home as a forwarded
 * intent: the move as its player said it, without the edition that would admit it. The home admits it
 * under its own law and the result comes back as a decision (`WORK_DECISION_OBJECT_KIND`).
 */
export const WORK_FORWARD_OBJECT_KIND = "metroplat.work.arena-forward";

/**
 * A coordinated move the thread's home node admitted, carried to the other node as a fact. The home is
 * the one serializer of its threads' coordinated moves, so the other node records what the home
 * decided and reads it by replay, never playing it out of turn (a union of told moves is
 * `work-replication.mjs`; a decision flows one way, from home).
 */
export const WORK_DECISION_OBJECT_KIND = "metroplat.work.arena-decision";

export { homeHostOf, workHomesOf };

/** The host's telling port: play a response on this board, hand a telling on to the peer, and forward a coordinated move to the node its thread is at home on. */
export function hostedWorkTelling({ config, provider, binding, host, enterprises, deliver = deliverActivity }) {
  const agencyOf = () => agencyAt(config.agencyRoot ?? agencyRootOf(binding));
  const board = workBoardStore(binding, { agency: agencyOf, homes: workHomesOf(agencyOf, enterprises) });
  return (move) => {
    // The board supplies its own clock when a local move omits `at`. Forwarding
    // must apply the same default before validating and serializing the intent.
    const timedMove = move.at == null ? { ...move, at: binding.now() } : move;
    const told = toldOn(board, timedMove);
    if (told === false && host !== undefined) {
      const thread = board.read(timedMove.at).threads.find((candidate) => candidate.id === timedMove.thread);
      const home = homeHostOf(thread, enterprises?.() ?? [...agencyOf().enterprises.values()]);
      if (home !== undefined && home !== host) {
        const forward = prepareWorkForwardDelivery({ config, provider: provider(), move: timedMove, deliver });
        if (forward !== undefined) return forward().then(() => Object.freeze({ forwarded: true, to: home, thread: timedMove.thread, move: timedMove.move }));
      }
    }
    if (told !== true) return board.play(timedMove);
    const delivery = prepareWorkTellingDelivery({ config, provider: provider(), telling: timedMove });
    return deliverAdmittedWork(delivery, board.play(timedMove));
  };
}

/** A forwarded intent as the home receives it: a response as its player said it, to be admitted under the home's own law. */
function assertFederatedForward(value) {
  if (OPENING_MOVES.includes(value?.move)) throw new TypeError("an opening is played on its own board and replicates; it is never forwarded");
  const { edition: _edition, id: _id, ...said } = value;
  responseOf(said);
  return said;
}

/** One forwarded intent travels as addressed SignCell evidence. */
export function workForwardActivity({ origin, identifier, peerActor, move, at }) {
  const { edition: _edition, ...said } = move;
  assertFederatedForward(said);
  return workMoveActivity({ origin, identifier, peerActor, at, objectKind: WORK_FORWARD_OBJECT_KIND, value: said });
}

/** One decision travels as addressed SignCell evidence, with the edition that admitted it. */
export function workDecisionActivity({ origin, identifier, peerActor, decision, at }) {
  if (OPENING_MOVES.includes(decision?.move)) throw new TypeError("a decision is a coordinated response");
  return workMoveActivity({ origin, identifier, peerActor, at, objectKind: WORK_DECISION_OBJECT_KIND, value: decision });
}

/** Prepare a forward before anything is played, so a move that cannot travel is refused whole. */
export function prepareWorkForwardDelivery({ config, provider, move, deliver = deliverActivity }) {
  return preparePeerDelivery({ config, provider, deliver, activityOf: (base) => workForwardActivity({ ...base, move, at: move.at }) });
}

/** Prepare a decision the home admitted for the other node. */
export function prepareWorkDecisionDelivery({ config, provider, decision, deliver = deliverActivity, onPeerFailure }) {
  return preparePeerDelivery({ config, provider, deliver, onPeerFailure, activityOf: (base) => workDecisionActivity({ ...base, decision, at: decision.at }) });
}

/**
 * Validate a forwarded intent and play it on this board, which must be the thread's home: admitted
 * under this node's law in force, legal or refused at the thread's own position.
 */
export function preparePeerWorkForward({ projection, senderActorId, origin, binding, agencyRoot = agencyRootOf(binding), host, enterprises }) {
  if (projection.objectKind !== WORK_FORWARD_OBJECT_KIND) return undefined;
  const standing = admitByStanding({ kind: "forward", senderActorId, origin, binding, subject: projection.cloudEvent?.id, value: projection.value });
  if (standing.disposition === "held") return held(standing);
  const said = assertFederatedForward(projection.value);
  return () => {
    const agency = agencyAt(agencyRoot);
    const board = workBoardStore(binding, { agency: () => agency, homes: workHomesOf(() => agency, enterprises) });
    const thread = board.find(said.thread);
    const home = homeHostOf(thread, enterprises?.() ?? [...agency.enterprises.values()]);
    if (home !== host) throw new TypeError(`${said.thread} is not at home on ${host}; its coordinated moves are played on ${home ?? "its home node"}`);
    return board.play(said);
  };
}

/**
 * Record a decision the thread's home admitted. It is kept as the home said it, under the edition that
 * admitted it, and read by replay like any stored move (legal there or not counted); an edition this
 * release cannot read is kept unread. It carries `decidedBy`, the node that decided it, and the board counts
 * it only when that node is the thread's home at the read (`workHomesOf`, given to the board): the check here, while
 * the thread is on this board, only refuses early what the read would never count.
 */
export function preparePeerWorkDecision({ projection, senderActorId, origin, binding, agencyRoot = agencyRootOf(binding), host, enterprises }) {
  if (projection.objectKind !== WORK_DECISION_OBJECT_KIND) return undefined;
  const standing = admitByStanding({ kind: "decision", senderActorId, origin, binding, subject: projection.cloudEvent?.id, value: projection.value });
  if (standing.disposition === "held") return held(standing);
  const decision = projection.value;
  if (OPENING_MOVES.includes(decision?.move)) throw new TypeError("a decision is a response, never an opening");
  if (typeof decision.decidedBy !== "string" || decision.decidedBy === "") throw new TypeError("a decision names the node that decided it");
  const { decidedBy: _decidedBy, ...said } = decision;
  // A decision this board can read is judged under the edition that admitted it; one it cannot is kept unread.
  if (unreadReasonOf(said) === undefined) {
    const read = readForward(said);
    moveOf(read.move, { law: read.edition });
  }
  return () => {
    const agency = agencyAt(agencyRoot);
    const thread = workBoardStore(binding, { agency: () => agency, homes: workHomesOf(() => agency, enterprises) }).read(decision.at).threads.find((candidate) => candidate.id === decision.thread);
    if (thread !== undefined && homeHostOf(thread, enterprises?.() ?? [...agency.enterprises.values()]) === host) {
      throw new TypeError(`${decision.thread} is at home on ${host}; only this node decides its coordinated moves`);
    }
    return recordAsSaid(binding, decision);
  };
}

/** Record a peer's move in this board exactly as the peer said it (a `work-arena-move` record that cites its causes); replay reads it under its own edition. */
function recordAsSaid(binding, move, causes = []) {
  // Unknown-edition and coordinated moves are still one exact authored fact across
  // repeated arrivals; retain it once, never backfill its work row.
  if (workBoardStore(binding).rawWitnessesOf(move).length !== 0) return move;
  put(binding.dataRoot, WORK_BOARD_KIND, { ...JSON.parse(JSON.stringify(move)), ...(causes.length === 0 ? {} : { causes }) });
  return move;
}

/**
 * Keep a peer's move this board cannot read under the edition that admitted it (organizing
 * `unreadReasonOf`: an edition this release does not realize, or a move older than the editions that
 * no migration read into the sixteenth). It is a fact the peer's board holds, so it is kept as said
 * and listed unread with why, never refused: refusing it would leave the two boards apart for good
 * and the peer sending it again on every catch-up.
 */
function keepUnread(binding, move, causes = []) {
  if (!["move", "by", "at"].every((key) => typeof move[key] === "string") || (move.id === undefined && typeof move.thread !== "string")) {
    throw new TypeError("a kept move still names its kind, player, time and thread");
  }
  return recordAsSaid(binding, move, causes);
}

/** Prepare before playing locally so an untransportable telling cannot become local-only. */
export function prepareWorkTellingDelivery({ config, provider, telling, causes, deliver = deliverActivity, onPeerFailure }) {
  return preparePeerDelivery({ config, provider, deliver, onPeerFailure, activityOf: (base) => workTellingActivity({ ...base, telling, causes, at: telling.at }) });
}

/** Prepare before playing locally so an untransportable opening cannot become local-only. */
export function prepareWorkOpeningDelivery({ config, provider, opening, causes, deliver = deliverActivity, onPeerFailure }) {
  return preparePeerDelivery({ config, provider, deliver, onPeerFailure, activityOf: (base) => workOpeningActivity({ ...base, opening, causes, at: opening.at }) });
}

function preparePeerDelivery({ config, provider, deliver, activityOf, onPeerFailure }) {
  if (config.deliverWorkToPeer === false) return undefined;
  const peers = workPeersOf(config);
  if (peers.length === 0) return undefined;
  if ((provider === undefined && deliver === deliverActivity) || config.activityPub?.instanceActor?.identifier === undefined) {
    throw new TypeError("federated work requires the instance ActivityPub actor");
  }
  const identifier = config.activityPub.instanceActor.identifier;
  // The event is the move itself, at the time it was played: handing it on again is the same activity.
  const deliveries = peers.map((peerActor) => ({ peerActor, activity: activityOf({ origin: config.publicBaseUrl, identifier, peerActor }) }));
  // Every peer is tried; one that failed fails the handoff, so it is sent again (a peer that already
  // holds the move admits the repeat as a no-op).
  return async () => {
    // A known-intermittent peer is held for, not pushed to (`deliverOrHold`); it pulls what it lacks.
    const settled = await Promise.allSettled(deliveries.map(({ peerActor, activity }) => deliverOrHold({ config, provider, deliver, request: {
      identifier, recipient: peerActor, inbox: `${peerActor.replace(/\/$/u, "")}/inbox`, activity,
    } })));
    const failed = settled.flatMap((result, index) => (result.status === "rejected" ? [{ peerActor: deliveries[index].peerActor, reason: result.reason }] : []));
    // Catch-up observes every failed recipient, including a hold that failed before transport.
    for (const { peerActor, reason } of failed) onPeerFailure?.({ peer: peerActor, error: reason });
    // One failure is thrown as it came, so its cause is still read (away or refused); several are
    // thrown together, each kept as it came.
    if (failed.length === 1) throw failed[0].reason;
    if (failed.length > 1) throw new AggregateError(failed.map(({ reason }) => reason), `work handoff failed for ${failed.map(({ peerActor, reason }) => `${peerActor}: ${reason?.message ?? reason}`).join("; ")}`);
    return Object.freeze(settled.map((result) => result.value));
  };
}

/** Validate signed peer evidence before retaining its arrival or playing its opening on this board. */
export function preparePeerWorkOpening({ projection, senderActorId, origin, binding, agencyRoot = agencyRootOf(binding), enterprises }) {
  if (projection.objectKind !== WORK_OPENING_OBJECT_KIND) return undefined;
  const standing = admitByStanding({ kind: "opening", senderActorId, origin, binding, subject: projection.cloudEvent?.id, value: projection.value });
  if (standing.disposition === "held") return held(standing);
  const { causes: _sourceCauses, ...value } = projection.value;
  // Only the receiving node's actual admission witness is a local causal predecessor.
  const causes = standing.events;
  // A peer's opening this board cannot read under its own edition: kept unread, never refused.
  if (unreadReasonOf(value) !== undefined) return () => keepUnread(binding, value, causes);
  const opening = assertFederatedOpening(value);
  return () => {
    const board = workBoardStore(binding, { agency: () => agencyAt(agencyRoot), homes: workHomesOf(() => agencyAt(agencyRoot), enterprises) });
    const known = board.read(opening.at).threads.find((thread) => thread.id === opening.id);
    if (known !== undefined && sameOpening(known.opening, opening)) return known.opening;
    return board.play(opening, { causes });
  };
}

/**
 * Validate signed peer evidence before retaining its arrival or playing its telling on this board.
 * A telling whose thread has not arrived yet is told into the board and read once the thread opens
 * (the arena's `awaiting`), so tellings and openings may arrive in any order.
 */
export function preparePeerWorkTelling({ projection, senderActorId, origin, binding, agencyRoot = agencyRootOf(binding), enterprises }) {
  if (projection.objectKind !== WORK_TELLING_OBJECT_KIND) return undefined;
  const standing = admitByStanding({ kind: "telling", senderActorId, origin, binding, subject: projection.cloudEvent?.id, value: projection.value });
  if (standing.disposition === "held") return held(standing);
  const { causes: _sourceCauses, ...value } = projection.value;
  const causes = standing.events;
  if (unreadReasonOf(value) !== undefined) return () => keepUnread(binding, value, causes);
  const telling = assertFederatedTelling(value);
  return () => {
    const board = workBoardStore(binding, { agency: () => agencyAt(agencyRoot), homes: workHomesOf(() => agencyAt(agencyRoot), enterprises) });
    const told = toldOn(board, telling);
    if (told === undefined) return board.tell(telling, { causes });
    if (!told) throw new TypeError(`${telling.move} is not told on ${telling.thread}; a coordinated move is played on the thread's own board`);
    return board.play(telling, { causes });
  };
}

/**
 * A peer's Reject of a work move this board handed on. The refused activity carries the move's own
 * content-addressed bytes, so it is opened as this node's evidence addressed to that peer, and the
 * move must be on a thread of this board. The peer's refusal is then a report on this board, by
 * the peer, of the law the move broke there: one thread per refused activity, which a repeated
 * Reject corroborates, related to the thread the move was played on. The refusing peer is the
 * signed sender, which must hold `#work-refusal` here and be the actor the refused move was addressed to.
 */
export function preparePeerWorkRefusal({ refused, rejectId, reason, senderActorId, ownActor, origin, binding, agencyRoot = agencyRootOf(binding), enterprises }) {
  const standing = admitByStanding({ kind: "refusal", senderActorId, origin, binding, subject: rejectId, value: { refused, rejectId, reason } });
  if (standing.disposition === "held") return held(standing);
  const peerActor = senderActorId;
  // Fedify embeds an actor it has dereferenced; the wire extractor reads actors as scalars.
  const idOf = (value) => (typeof value === "string" ? value : value?.id);
  const evidence = extractSignStuffEvidenceActivity({ ...refused, actor: idOf(refused?.actor), to: [refused?.to ?? []].flat().map(idOf) }, {
    expectedActor: ownActor, expectedRecipient: peerActor,
  });
  const move = evidence.objectKind === WORK_OPENING_OBJECT_KIND ? assertFederatedOpening(evidence.value)
    : evidence.objectKind === WORK_TELLING_OBJECT_KIND ? assertFederatedTelling(evidence.value)
      : undefined;
  if (move === undefined) throw new TypeError("a peer's Reject names no work move of this board");
  const thread = move.thread ?? move.id;
  return () => {
    const board = workBoardStore(binding, { agency: () => agencyAt(agencyRoot), homes: workHomesOf(() => agencyAt(agencyRoot), enterprises) });
    board.find(thread);
    return board.play({
      move: "report", by: peerActor, law: "federated work admission", subject: refused.id,
      observation: `${peerActor} refused the ${move.move} on ${thread}: ${reason ?? "no reason given"}`.slice(0, 800),
      relates: [thread], evidence: [rejectId],
    });
  };
}

/** A peer's work evidence, opening, telling, forward or decision, decided by its sender's standing and prepared for this board; undefined for any other evidence. */
export const preparePeerWork = (input) => preparePeerWorkOpening(input) ?? preparePeerWorkTelling(input) ?? preparePeerWorkForward(input) ?? preparePeerWorkDecision(input);
