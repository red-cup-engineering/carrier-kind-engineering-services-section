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
 * release does not realize is kept unread (organizing `isUnreadableMove`), neither refused nor
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
import { ALWAYS_TOLD_MOVES, isUnreadableMove, moveOf, OPENING_MOVES, readForward, TOLD_MOVES } from "@red-cup-engineering/organizing/enterprise";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { agencyAt } from "@red-cup-engineering/metroplat/offices";
import { workBoardStore } from "@red-cup-engineering/feltos/work/work-board";
import { homeHostOf, workHomesOf, workPeersOf, prepareWorkDecisionDelivery, prepareWorkOpeningDelivery, prepareWorkTellingDelivery } from "./federated-work.mjs";

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
  return Object.freeze([...moves].filter(({ record }) => !isUnreadableMove(record) && isReplicable(record, kindOf)).sort(byTimeThenAddress));
}

/** The moves of `moves` that are coordinated: played on the thread's own board, never replicated. */
export function coordinatedMovesOf(moves, { among = moves } = {}) {
  const kindOf = kindsOf(among);
  return Object.freeze([...moves].filter(({ record }) => !isUnreadableMove(record) && !isReplicable(record, kindOf)).sort(byTimeThenAddress));
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
    if (isUnreadableMove(entry.record)) {
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

/**
 * Ship what the peer is not yet known to hold, through `ship(entry)` (async, throws on failure): the
 * entries of `entries` not in `shipped` (the set of addresses the peer has received). The cursor is
 * the ledger of received addresses, not a time: the journal orders by when a move was played, so a
 * move recorded late with an early time (an old-dated arrival, a corrected clock) still ships. A
 * failed move stays out of the ledger and is sent again; the others go on.
 * Returns { shipped, failed } as entries.
 */
export async function shipWorkSince({ entries, shipped = new Set(), ship }) {
  const done = [];
  const failed = [];
  for (const entry of entries.filter(({ id }) => !shipped.has(id))) {
    try {
      await ship(entry);
      done.push(entry);
    } catch (error) {
      failed.push(Object.freeze({ ...entry, why: String(error?.message ?? error) }));
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
export function readShipped(dataRoot) {
  const path = resolve(dataRoot, LEDGER_FILE);
  if (!existsSync(path)) return new Set();
  return new Set(readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)));
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
  const ship = async ({ record }) => {
    const opening = OPENING_MOVES.includes(record.move);
    const decided = !opening && !isReplicable(record, kindsOf(entries));
    const thunk = opening ? prepareWorkOpeningDelivery({ config, provider, deliver, opening: record })
      : decided ? prepareWorkDecisionDelivery({ config, provider, deliver, decision: { ...record, decidedBy: host } })
        : prepareWorkTellingDelivery({ config, provider, deliver, telling: record });
    if (thunk === undefined) throw new TypeError("no work peer is configured");
    await thunk();
  };
  const result = await shipWorkSince({ entries: outbound, shipped: readShipped(binding.dataRoot), ship });
  noteShipped(binding.dataRoot, result.shipped.map(({ id }) => id));
  return result;
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
      const { shipped, failed } = await catchUpWorkPeer({ config, provider: provider(), binding, host });
      // A run that left a move undelivered fails, so the schedule's own retry sends it again.
      if (failed.length > 0) throw new TypeError(`work-peer-catch-up: ${failed.length} of ${shipped.length + failed.length} moves were not delivered: ${failuresSaid(failed)}`);
      return Object.freeze({ shipped: shipped.length });
    },
  })]);
}
