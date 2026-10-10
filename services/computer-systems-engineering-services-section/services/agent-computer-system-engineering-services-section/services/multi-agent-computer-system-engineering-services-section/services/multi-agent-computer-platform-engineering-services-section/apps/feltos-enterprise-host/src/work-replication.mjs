/**
 * One city from two nodes: the work board replicates as a union of content-addressed facts.
 *
 * The arena's moves that only tell into a grow-only record (`TOLD_MOVES`, `ALWAYS_TOLD_MOVES`) are
 * monotone and order-independent (CALM; Obsmetrologia's `calm_monotone_coordination_free` and
 * `crdt_merge_order_independent`), and an opening only adds a thread, so these join by set union
 * on the move's address: each node keeps every move it has seen and receiving a duplicate is a
 * no-op. The coordinated moves (a withdrawal, release, supersession, forfeit, a supply's draw and
 * return, a hold, a promise, an acceptance that chooses) are never replicated; they are played on
 * the thread's own board (`homeOf`), so they are not in this union.
 *
 * A move here is a journal entry `{ id, record }`: `id` its content address (the board journal's
 * own), `record` the move as it was admitted, with the edition that admitted it. A node re-admits
 * every remote move under that recorded edition and never under its own; a move of an edition this
 * release does not realize is kept unread (organizing `unreadReasonOf`), neither refused nor
 * played, until a release realizes its edition.
 *
 * Transport reuses the peer federation (`federated-work.mjs`): the same signed openings and
 * tellings, shipped by `shipWorkSince` from a cursor, so a peer that was away, or a delivery that
 * failed, is brought up to date by sending again. Receiving is `preparePeerWork`, already
 * idempotent. Not here yet (next slice): forwarding a coordinated move to its thread's home node,
 * which needs a territory-to-node map the configuration does not hold.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { ALWAYS_TOLD_MOVES, unreadReasonOf, moveOf, OPENING_MOVES, readForward, TOLD_MOVES } from "@red-cup-engineering/organizing/enterprise";
import { deliverActivity } from "@red-cup-engineering/activitypub-services-section";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { agencyAt } from "@red-cup-engineering/metroplat/offices";
import { workBoardStore } from "@red-cup-engineering/feltos/work/work-board";
import { homeHostOf, workHomesOf, workPeersOf, prepareWorkDecisionDelivery, prepareWorkOpeningDelivery, prepareWorkTellingDelivery } from "./federated-work.mjs";
import { notePeerRun, notePeerHealth, observeIdlePeers, PEER_LIVENESS_KIND } from "./peer-liveness.mjs";

/** The board journal's object kind and category (feltos work-board `WORK_BOARD_KIND`). */
const BOARD_KIND = "work-arena-move";

const byTimeThenAddress = (a, b) => String(a.record.at).localeCompare(String(b.record.at)) || a.id.localeCompare(b.id);

/** The entries of a board journal, as { id, record }. */
export const entriesOfJournal = (journal) => journal.query({ category: "move" }).map(({ id, record }) => Object.freeze({ id, record }));

/**
 * Whether one move is coordination-free, given the kinds of the threads it can answer:
 * an opening (grows the board by a content-addressed thread) or a response told on its thread's
 * kind. A response whose thread is not known is told only when it is told on every kind it answers.
 */
function isReplicable(record, kindOf) {
  if (OPENING_MOVES.includes(record.move)) return true;
  const kind = kindOf(record.thread);
  return kind === undefined ? ALWAYS_TOLD_MOVES.includes(record.move) : TOLD_MOVES[kind]?.includes(record.move) === true;
}

const kindsOf = (entries) => {
  const kinds = new Map();
  for (const { record } of entries) if (OPENING_MOVES.includes(record.move) && record.id !== undefined) kinds.set(record.id, record.move);
  return (thread) => kinds.get(thread);
};

/**
 * The moves of `moves` the law makes coordination-free, in time order. Their threads' kinds are read
 * from `among` (default `moves`), so a slice of a journal is classified by the whole. A move this
 * release cannot read has no classification: it is not selected here, only kept (`mergeMoves`).
 */
export function replicableMovesOf(moves, { among = moves } = {}) {
  const kindOf = kindsOf(among);
  return Object.freeze([...moves].filter(({ record }) => unreadReasonOf(record) === undefined && isReplicable(record, kindOf)).sort(byTimeThenAddress));
}

/** The moves of `moves` that are coordinated: played on the thread's own board, never replicated. */
export function coordinatedMovesOf(moves, { among = moves } = {}) {
  const kindOf = kindsOf(among);
  return Object.freeze([...moves].filter(({ record }) => unreadReasonOf(record) === undefined && !isReplicable(record, kindOf)).sort(byTimeThenAddress));
}

/**
 * The union of two nodes' moves by address. Each remote move not already held is judged under its own
 * recorded edition (`readForward`, then `moveOf` as `admissibilityUnder` does): admitted and
 * coordination-free, it joins; of an edition this release does not realize, it is kept unread; one
 * its edition does not admit is refused, and a coordinated one is not replicated. Returns
 * { moves, added, unread, refused, coordinated }; `moves` is local plus the added and unread, in time order.
 */
export function mergeMoves(local, remote) {
  const held = new Map(local.map((entry) => [entry.id, entry]));
  const kindOf = kindsOf([...local, ...remote]);
  const added = [];
  const unread = [];
  const refused = [];
  const coordinated = [];
  for (const entry of remote) {
    if (held.has(entry.id)) continue;
    if (unreadReasonOf(entry.record) !== undefined) {
      held.set(entry.id, entry);
      unread.push(entry);
      continue;
    }
    if (!isReplicable(entry.record, kindOf)) {
      coordinated.push(entry);
      continue;
    }
    const read = readForward(entry.record);
    if (read.unread !== undefined) {
      held.set(entry.id, entry);
      unread.push(entry);
      continue;
    }
    try {
      moveOf(read.move, { law: read.edition });
    } catch (error) {
      refused.push(Object.freeze({ move: entry, why: error.message }));
      continue;
    }
    held.set(entry.id, entry);
    added.push(entry);
  }
  return Object.freeze({
    moves: Object.freeze([...held.values()].sort(byTimeThenAddress)),
    added: Object.freeze(added), unread: Object.freeze(unread), refused: Object.freeze(refused), coordinated: Object.freeze(coordinated),
  });
}

/**
 * The coordinated moves this node decided: those on threads homed here (`homedHere(thread id)`).
 * Their home is the one serializer of them, so the other node records what the home admitted.
 */
export const decidedMovesOf = (moves, { homedHere, among = moves }) => Object.freeze(coordinatedMovesOf(moves, { among }).filter(({ record }) => homedHere(record.thread)));

/** What a gateway answers when the node behind it is not there (Cloudflare's origin errors among them). */
const AWAY_STATUSES = new Set([502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 530]);
/** What the network says when nothing answers at all. */
const AWAY_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_SOCKET"]);

/**
 * Whether a failed delivery says the peer was away rather than that it refused. Away is no answer at
 * all, or a gateway's answer that the node behind it is not there: the peer's reading is unknown (⊥).
 * A refusal is an answer from the peer itself, which reads false. A transport failure is read by its
 * cause (Fedify keeps it as the cause of its FetchError), so a certificate or redirect fault is not
 * excused as absence: an error of neither shape stays a failure.
 */
export function deliveryAway(error) {
  // A handoff to several peers that failed for more than one is away only if every one of them was.
  if (error instanceof AggregateError) return error.errors.length > 0 && error.errors.every(deliveryAway);
  const status = error?.statusCode ?? error?.response?.status;
  if (typeof status === "number") return AWAY_STATUSES.has(status);
  for (let cause = error; cause !== undefined && cause !== null; cause = cause.cause) {
    if (AWAY_CODES.has(cause.code) || cause.name === "AbortError" || cause.name === "TimeoutError") return true;
  }
  return false;
}

/**
 * Ship what the peer is not yet known to hold, through `ship(entry)` (async, throws on failure): the
 * entries of `entries` not in `shipped` (the set of addresses the peer has received). The cursor is
 * the ledger of received addresses, not a time: the journal orders by when a move was played, so a
 * move recorded late with an early time (an old-dated arrival, a corrected clock) still ships. A
 * failed move stays out of the ledger and is sent again; the others go on.
 * Returns { shipped, failed } as entries; a failed entry keeps `why` it failed and whether the peer
 * was `away` (`deliveryAway`).
 */
export async function shipWorkSince({ entries, shipped = new Set(), ship }) {
  const done = [];
  const failed = [];
  for (const entry of entries.filter(({ id }) => !shipped.has(id))) {
    try {
      await ship(entry);
      done.push(entry);
    } catch (error) {
      failed.push(Object.freeze({ ...entry, why: String(error?.message ?? error), away: deliveryAway(error) }));
    }
  }
  return Object.freeze({ shipped: Object.freeze(done), failed: Object.freeze(failed) });
}

/**
 * Why moves were not delivered, as said: each distinct reason with how many moves it held back,
 * the most frequent first. A run that leaves moves undelivered says this, so its outcome names
 * the cause rather than only a count.
 */
export function failuresSaid(failed, limit = 3) {
  const counts = new Map();
  for (const { why = "no reason given" } of failed) counts.set(why, (counts.get(why) ?? 0) + 1);
  return [...counts].sort((left, right) => right[1] - left[1]).slice(0, limit)
    .map(([why, count]) => `${count} × ${why.slice(0, 300)}`).join("; ");
}

const LEDGER_FILE = "work-peer-shipped.jsonl";

/** The addresses the work peer has received from this settlement, from the ledger kept in its root. */
export function readShipped(dataRoot, peer) {
  const path = resolve(dataRoot, LEDGER_FILE);
  if (!existsSync(path)) return new Set();
  const receipts = readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  // Historical bare addresses do not identify a recipient and cannot prove a newly granted peer
  // has received them. Keep that reader for history; current delivery selects named receipts only.
  return new Set(receipts.flatMap((receipt) => peer === undefined
    ? (typeof receipt === "string" ? [receipt] : [])
    : (receipt?.peer === peer && typeof receipt.id === "string" ? [receipt.id] : [])));
}

function noteShipped(dataRoot, ids) {
  if (ids.length === 0) return;
  const path = resolve(dataRoot, LEDGER_FILE);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, ids.map((id) => `${JSON.stringify(id)}\n`).join(""));
}

/**
 * Bring the configured work peer up to date: ship every coordination-free move of this settlement's
 * board it has not received, and every coordinated move on a thread homed on this node (`host`) as
 * a decision, as the same signed evidence live handoff sends, then note what arrived. Idempotent: the
 * peer admits what it lacks and ignores what it holds.
 */
export async function catchUpWorkPeer({ config, provider, binding, deliver, host, agencyRoot = config.agencyRoot, enterprises: enterprisesOf }) {
  if (config.deliverWorkToPeer === false || workPeersOf(config).length === 0) return Object.freeze({ shipped: Object.freeze([]), failed: Object.freeze([]) });
  const journal = createSemanticRecordJournal({ root: binding.dataRoot, objectKind: BOARD_KIND });
  const entries = entriesOfJournal(journal);
  const agency = agencyAt(agencyRoot);
  const enterprises = enterprisesOf?.() ?? [...agency.enterprises.values()];
  const threads = workBoardStore(binding, { agency: () => agency, homes: workHomesOf(() => agency, () => enterprises) }).read(binding.now()).threads;
  const homedHere = (id) => {
    const thread = threads.find((candidate) => candidate.id === id);
    return thread !== undefined && homeHostOf(thread, enterprises) === host;
  };
  const outbound = [...replicableMovesOf(entries), ...decidedMovesOf(entries, { homedHere })];
  const observations = new Map(workPeersOf(config).map((peer) => [peer, { shipped: 0, failed: [] }]));
  const received = new Map([...observations.keys()].map((peer) => [peer, readShipped(binding.dataRoot, peer)]));
  let moveId;
  const observedDelivery = async (sender, request) => {
    const observation = observations.get(request.recipient);
    const held = received.get(request.recipient);
    if (held.has(moveId)) return;

    try {
      const value = await (deliver ?? deliverActivity)(sender, request);
      noteShipped(binding.dataRoot, [{ peer: request.recipient, id: moveId }]);
      held.add(moveId);
      observation.shipped += 1;
      return value;
    } catch (error) {
      observation.failed.push(Object.freeze({ why: String(error?.message ?? error), away: deliveryAway(error) }));
      throw error;
    }
  };
  const ship = async ({ id, record }) => {
    moveId = id;
    const opening = OPENING_MOVES.includes(record.move);
    const decided = !opening && !isReplicable(record, kindsOf(entries));
    const thunk = opening ? prepareWorkOpeningDelivery({ config, provider, deliver: observedDelivery, opening: record })
      : decided ? prepareWorkDecisionDelivery({ config, provider, deliver: observedDelivery, decision: { ...record, decidedBy: host } })
        : prepareWorkTellingDelivery({ config, provider, deliver: observedDelivery, telling: record });
    if (thunk === undefined) throw new TypeError("no work peer is configured");
    await thunk();
  };
  const completelyReceived = new Set(outbound.filter(({ id }) => [...received.values()].every((held) => held.has(id))).map(({ id }) => id));
  const result = await shipWorkSince({ entries: outbound, shipped: completelyReceived, ship });
  return Object.freeze({ ...result, peers: Object.freeze([...observations].map(([peer, observation]) => Object.freeze({ peer, shipped: observation.shipped, failed: Object.freeze(observation.failed) }))) });
}

/**
 * What a catch-up run says. A run that left a move undelivered fails, so the schedule's own retry
 * sends it again. A peer known to be intermittent is away as a matter of course: the moves it could
 * not be reached for are held in place of failing the run (the ledger sends them again next run
 * anyway), and the run says the peer was away. A refusal still fails it.
 */
export function catchUpOutcome({ shipped, failed }, presence = "continuous") {
  const held = presence === "known-intermittent" ? failed.filter(({ away }) => away) : [];
  const undelivered = failed.filter((entry) => !held.includes(entry));
  if (undelivered.length > 0) throw new TypeError(`work-peer-catch-up: ${undelivered.length} of ${shipped.length + failed.length} moves were not delivered: ${failuresSaid(undelivered)}`);
  return Object.freeze({ shipped: shipped.length, ...(held.length === 0 ? {} : { held: held.length, peer: "away" }) });
}

/**
 * Keep what one catch-up run says of the work peer's liveness in the node journal, and read it back:
 * the peer's FOUR reading (unknown while it is away and below its threshold, or always when it is
 * known-intermittent) and its silence in seconds. A run that fails still keeps its witness first.
 */
export function noteWorkPeerLiveness({ config, binding, host, result, now = new Date(binding.now?.() ?? Date.now()).toISOString() }) {
  if (config.deliverWorkToPeer === false) return Object.freeze({});
  const peers = result.peers ?? [];
  if (peers.length === 0) return Object.freeze({});
  const journal = createSemanticRecordJournal({ root: binding.dataRoot, objectKind: PEER_LIVENESS_KIND });
  const readings = peers.map(({ peer, shipped, failed, health }) => {
    const noted = (health === undefined ? notePeerRun : notePeerHealth)(journal, {
      observer: host, peer, now, shipped, failed,
      presence: config.workPeerPresence, thresholdSeconds: config.workPeerSuspicionSeconds,
      ...(health === undefined ? {} : { health }),
    });
    return Object.freeze({ peer, liveness: noted.reading, ...(noted.silentSeconds === undefined ? {} : { silentSeconds: Math.round(noted.silentSeconds) }) });
  });
  return Object.freeze({ peers: Object.freeze(readings), ...(readings.length === 1 ? { liveness: readings[0].liveness, ...(readings[0].silentSeconds === undefined ? {} : { silentSeconds: readings[0].silentSeconds }) } : {}) });
}

/** The operation a node schedule runs to keep the work peer current (MetroPlat instance `schedules`). */
export function workReplicationOperations({ config, binding, provider, host }) {
  return Object.freeze([operation({
    verb: "work-peer-catch-up",
    inputFormat: "json", outputFormat: "json",
    summary: "Send the work peer every work-board fact it has not received.",
    description: "Domain: {}. Ships this board's told moves (openings and tellings) the peer has not received, and the coordinated moves this node decided on threads homed here. Idempotent; a failed delivery is sent again on the next run.",
    relation: "boundary",
    effects: { class: "external", replay: "idempotency-key", coordination: "coordination-free", deterministic: "unmeasured", totality: "schema-bounded" },
    run: async () => {
      const result = await catchUpWorkPeer({ config, provider: provider(), binding, host });
      // An empty work queue is no longer a blind interval for an already-declared peer.
      // Re-read held peers before a public observation; no new recipient or grant is created.
      const held = new Set(workPeersOf(config));
      const peers = await observeIdlePeers((result.peers ?? []).filter(({ peer }) => held.has(peer)), { contracts: config.workPeerHealth });
      const liveness = noteWorkPeerLiveness({ config, binding, host, result: { ...result, peers } });
      return Object.freeze({ ...catchUpOutcome(result, config.workPeerPresence), ...liveness });
    },
  })]);
}
