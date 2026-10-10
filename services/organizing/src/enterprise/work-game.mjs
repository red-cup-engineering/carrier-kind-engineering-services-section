/**
 * enterprise/work-game — the work arena read as the concurrent game it says it is (note 2026-10-02
 * "The work arena typed as a game"; gaming faculty, "Arenas, Plays, and Strategies"; note
 * 2026-09-27 "Games as rule-presented arenas", Def. 12.1: G = (A, Players, strategies,
 * observation, payoff, settlement)).
 *
 * The arena (`work-arena`) presents its game by its rules: a legal-move rule (`extendThread`) and a
 * table of who owes which move (`PROTOCOL`). This module reads the rest of the tuple off the same
 * record, never storing it there:
 *
 *   polarity     Each thread is a game between its opener's side (the Proponent: the opener and
 *                the assayer it names) and everyone else (the Opponent: takers, the territory's
 *                holder, witnesses). A played move's polarity is its player's side, as a FOUR
 *                reading (`polarityReading`: positive is t, negative is f). Each response kind is
 *                typed by the roles the protocol gives it (`MOVE_SIDES`): a Proponent move, an
 *                Opponent move, or a telling either side may tell (CALM's `TOLD_MOVES`). A move
 *                played from the side its kind does not belong to is ill-polarized
 *                (`illPolarizedOf`): the opener taking up its own request plays both sides of one
 *                game, which no rule of the arena refuses and the game's typing does.
 *   arena        The board's moves as a polarized prime event structure (`workGameOf`): each move
 *                an event, caused by its thread's opening, by the taking it acts under (a
 *                delivery, an attachment, a release or a leaving by the promise, hold, adoption or
 *                wager it answers), by the delivery or answer it judges, the counter it agrees, and
 *                across threads by what an opening serves, supersedes, obstructs or addresses. A
 *                stored history is one configuration, so its conflict is empty; the conflicts
 *                live in the unplayed arena, which the legal-move rule presents.
 *   play         The journal's replay order is a play when each move comes after its causes (every
 *                prefix down-closed, so a configuration: Prop. 7.4). `outOfOrder` lists the moves
 *                that arrived before a cause, the tellings the arena holds as `awaiting`.
 *   observation  The board is complete information: every player reads every told move. What a
 *                strategy may lawfully depend on is narrower, its view (`viewOf`): the causal past
 *                of the player's own moves. A move is innocent of everything outside it.
 *   payoff       A taking's outcome in Belnap's FOUR (`payoffOf`), from what was told into the
 *                thread: won (an accepted delivery, a met wager, a resolved report that stayed
 *                resolved, a chosen answer), lost (a rejected delivery, a released promise, a
 *                missed wager, a leaving, a resolution corroborated open again, another's answer
 *                chosen), both (contested) or neither (unknown, still running). Paraconsistent:
 *                a taking both won and lost reads contested, never one or the other.
 *   strategy     A micro-enterprise's taking policy (`takingPolicyOf`) is its strategy on the
 *                board (`takingStrategyOf`). It is checked as one: receptive when every thread
 *                addressed to it is answered or taken up (Player may not refuse Opponent: an
 *                addressee owes a promise or a decline), and judged by its record, the FOUR join of
 *                its settled takings' payoffs.
 *
 * Who played a move is cast through the agency (`castOf`): the player is the mask (an office or
 * micro-enterprise), the hand is the account that played it, and the bearer is the character whose
 * organ that hand is (`bearersHandedBy`). The bearer is derived from the hand, never told beside the
 * move.
 * @packageDocumentation
 */
import { event, eventStructure } from "@red-cup-engineering/playing/structuring/event/structure";
import { negative, polarityName, polarityReading, positive } from "@red-cup-engineering/playing/structuring/polarity";
import { knowledgeJoinAll, readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { bearersHandedBy } from "../agency/index.mjs";
import {
  OPENING_MOVES, PROTOCOL, RESPONSE_MOVES, TAKING_MOVE, TOLD_MOVES,
  addresseeOf, assayerOf, takingOrderOf,
} from "./work-arena.mjs";

/** The protocol roles that speak for a thread's opener: the Proponent's side. Every other role is the Opponent's. */
export const PROPONENT_ROLES = Object.freeze(["opener", "assayer", "reader"]);

/**
 * Moves the legal-move rule lets a side play that the protocol table does not list for it: a
 * promiser elicits a contract where its opener stated none (`extendThread`'s refine), and whoever
 * measures a report's law resolves it by measuring again (sixth edition).
 */
const UNLISTED = Object.freeze({ request: Object.freeze({ refine: "opponent" }), report: Object.freeze({ resolve: "proponent" }) });

/**
 * Each response kind's side, per kind of opening: `proponent`, `opponent`, or `either` for a
 * telling (`TOLD_MOVES`) and a move the protocol gives to both sides. Derived from `PROTOCOL`.
 */
export const MOVE_SIDES = Object.freeze(Object.fromEntries(Object.entries(RESPONSE_MOVES).map(([kind, moves]) => {
  const sides = new Map();
  for (const step of Object.values(PROTOCOL[kind] ?? {}).flat()) {
    const side = PROPONENT_ROLES.includes(step.role) ? "proponent" : "opponent";
    for (const move of [...(step.turn ?? []), ...(step.may ?? [])]) sides.set(move, new Set([...(sides.get(move) ?? []), side]));
  }
  for (const [move, side] of Object.entries(UNLISTED[kind] ?? {})) sides.set(move, new Set([...(sides.get(move) ?? []), side]));
  return [kind, Object.freeze(Object.fromEntries(moves.map((move) => {
    const named = sides.get(move) ?? new Set();
    if (TOLD_MOVES[kind].includes(move) || named.size !== 1) return [move, "either"];
    return [move, [...named][0]];
  })))];
})));

/** The side a move kind belongs to on a thread opened by `kind`; an opening is its opener's. */
export const sideOfMove = (kind, move) => (OPENING_MOVES.includes(move) ? "proponent" : MOVE_SIDES[kind]?.[move]);

/** The side a player plays from on a thread: its opener and the assayer it named are the Proponent. */
export function sideOfPlayer(thread, player, playerIdentity = (value) => value) {
  const opening = thread.opening ?? thread;
  const own = [opening.by, opening.assayer].filter(Boolean).map(playerIdentity);
  return own.includes(playerIdentity(player)) ? "proponent" : "opponent";
}

const polarityOfSide = (side) => (side === "proponent" ? positive() : negative());

// The moves by which a player holds a thread, and the moves that act under that holding.
const TAKINGS = new Set(["promise", "hold", "adopt", "wager"]);
const UNDER_TAKING = new Set(["attach", "deliver", "release", "leave"]);

const optional = (key, value) => (value === undefined || (Array.isArray(value) && value.length === 0) ? {} : { [key]: value });

/**
 * The board's moves as a polarized prime event structure, the journal's order as a play on it, and
 * the moves played from the side their kind does not belong to.
 * The play is the arena's replay order (`playedPosition`): by time, an opening first at one instant,
 * and moves at one instant in the order they were told.
 * @param {ReadonlyArray<object>} told move records (`moveOf`), in the order they were told
 * @param {{playerIdentity?: (player: string) => string}} [options]
 */
export function workGameOf(told, { playerIdentity = (value) => value } = {}) {
  const moves = [...told].sort((a, b) => a.at.localeCompare(b.at) || (OPENING_MOVES.includes(b.move) - OPENING_MOVES.includes(a.move)));
  const openings = new Map();
  for (const move of moves) if (OPENING_MOVES.includes(move.move)) openings.set(move.id, move);
  const events = [];
  const causality = [];
  const meta = new Map();
  const counters = new Map();
  const latest = new Map();
  const seen = new Set();
  const outOfOrder = [];
  const illPolarized = [];
  const remember = (key, id) => latest.set(key, id);
  const cause = (from, to) => { if (from !== undefined) causality.push([from, to]); };
  for (const move of moves) {
    const isOpening = OPENING_MOVES.includes(move.move);
    const threadId = isOpening ? move.id : move.thread;
    const opening = openings.get(threadId);
    const index = counters.get(threadId) ?? 0;
    counters.set(threadId, index + 1);
    const id = isOpening ? threadId : `${threadId}#${index}`;
    const kind = opening?.move;
    const player = playerIdentity(move.by);
    const played = opening === undefined ? "opponent" : sideOfPlayer(opening, move.by, playerIdentity);
    const polarity = polarityOfSide(played);
    events.push(event(id, polarity));
    const typed = kind === undefined ? undefined : sideOfMove(kind, move.move);
    if (typed !== undefined && typed !== "either" && typed !== played) illPolarized.push(Object.freeze({ event: id, thread: threadId, move: move.move, by: move.by, typed, played }));
    const causes = [];
    if (isOpening) {
      for (const related of [...(move.serves ?? []), ...(move.supersedes ?? []), ...(move.addresses ?? []), ...(move.obstructs ?? []).map((trace) => trace.split("#")[0])]) {
        if (openings.has(related)) causes.push(related);
      }
    } else {
      if (opening !== undefined) causes.push(threadId);
      if (UNDER_TAKING.has(move.move)) causes.push(latest.get(`${threadId}:taking:${player}`));
      if (move.move === "accept" || move.move === "reject") {
        const judged = kind === "ask" ? "answer" : "deliver";
        if (move.of !== undefined) causes.push(latest.get(`${threadId}:${judged}:${playerIdentity(move.of)}`));
      }
      if (move.move === "agree" && move.to !== undefined) causes.push(latest.get(`${threadId}:counter:${playerIdentity(move.to)}`));
    }
    for (const from of new Set(causes.filter(Boolean))) {
      cause(from, id);
      if (!seen.has(from)) outOfOrder.push(Object.freeze({ event: id, cause: from }));
    }
    if (!isOpening && opening === undefined) outOfOrder.push(Object.freeze({ event: id, cause: threadId }));
    if (TAKINGS.has(move.move)) remember(`${threadId}:taking:${player}`, id);
    if (["deliver", "answer", "counter"].includes(move.move)) remember(`${threadId}:${move.move}:${player}`, id);
    seen.add(id);
    meta.set(id, Object.freeze({ thread: threadId, move: move.move, by: move.by, ...optional("hand", move.hand), at: move.at, side: played }));
  }
  const structure = eventStructure(events, causality, []);
  return Object.freeze({
    structure,
    moves: meta,
    play: Object.freeze(events.map((entry) => entry.id)),
    isPlay: outOfOrder.length === 0,
    outOfOrder: Object.freeze(outOfOrder),
    illPolarized: Object.freeze(illPolarized),
  });
}

/** The polarity census of a game: its moves by side, as FOUR readings (positive t, negative f). */
export function polarityCensusOf(game) {
  const census = { [polarityReading(positive())]: 0, [polarityReading(negative())]: 0 };
  for (const entry of game.structure.events) census[polarityReading(entry.polarity)] += 1;
  return Object.freeze(census);
}

/**
 * A player's view (the observation a strategy may depend on): the causal past of its own moves.
 * The board is complete information, so what a player sees is every move told; what it may answer
 * to is only this.
 */
export function viewOf(game, player, playerIdentity = (value) => value) {
  const parents = new Map();
  for (const [from, to] of game.structure.causality) parents.set(to, [...(parents.get(to) ?? []), from]);
  const own = [...game.moves].filter(([, entry]) => playerIdentity(entry.by) === playerIdentity(player)).map(([id]) => id);
  const view = new Set();
  const stack = [...own];
  while (stack.length > 0) {
    const id = stack.pop();
    if (view.has(id)) continue;
    view.add(id);
    stack.push(...(parents.get(id) ?? []));
  }
  return Object.freeze({ player, own: Object.freeze(own), view: Object.freeze(game.play.filter((id) => view.has(id))) });
}

/**
 * A player's payoff on a thread it took up, in FOUR (`held` won, `denied` lost, `contested` both,
 * `unknown` neither yet), from the board thread (`workBoard`).
 */
export function payoffOf(thread, player, playerIdentity = (value) => value) {
  const same = (other) => other !== undefined && playerIdentity(other) === playerIdentity(player);
  const kind = thread.opening.move;
  let won = false;
  let lost = false;
  if (kind === "request") {
    for (const delivery of thread.deliveries ?? []) {
      if (!same(delivery.player)) continue;
      if (delivery.verdict === "accepted") won = true;
      if (delivery.verdict === "rejected") lost = true;
    }
    if ((thread.releases ?? []).some((release) => same(release.player))) lost = true;
  } else if (kind === "aim") {
    for (const wager of thread.wagerReadings ?? []) {
      if (!same(wager.player)) continue;
      if (wager.standing === "met") won = true;
      if (wager.standing === "missed") lost = true;
      if (wager.standing === "contested") { won = true; lost = true; }
    }
    if ((thread.left ?? []).some((left) => same(left.player))) lost = true;
  } else if (kind === "report") {
    const adopted = (thread.adoptions ?? []).find((adoption) => same(adoption.player));
    if (adopted !== undefined) {
      if (thread.resolution !== undefined) won = true;
      if ((thread.corroborations ?? []).some((entry) => entry.recurs === true && entry.at > adopted.at)) lost = true;
    }
  } else if (kind === "ask") {
    if ((thread.answers ?? []).some((answer) => same(answer.player)) && thread.accepted !== undefined) {
      if (same(thread.accepted)) won = true;
      else lost = true;
    }
  }
  return readingOfSides("extremal", won, lost);
}

/** The players who took a thread up at any time: holders, promisers, adopters, answerers, and those who gave it back. */
function everTakenBy(thread) {
  return new Set([
    ...(thread.promisers ?? []), ...(thread.releases ?? []), ...(thread.holders ?? []), ...(thread.left ?? []),
    ...(thread.adoptions ?? []), ...(thread.answers ?? []), ...(thread.deliveries ?? []),
  ].map((entry) => entry.player));
}

/**
 * A micro-enterprise's taking policy checked as its strategy on the board (`workBoard`):
 *
 * - `receptive`: every open thread addressed to it is answered (promised or declined) or among
 *   what its policy takes up now; the rest are `refused`, an Opponent move it is not answering.
 * - `record`: each thread it took up with its payoff (`payoffOf`), and `reading`, their FOUR
 *   knowledge join: held when every settled taking was won, denied when every one was lost,
 *   contested when both, unknown when none has settled.
 * - `candidates`: what the policy would take up now (`takingOrderOf`).
 * @param {{id: string, takes?: object}} enterprise
 * @param {{threads: ReadonlyArray<object>}} board
 * @param {object} [options] `takingOrderOf`'s options
 */
export function takingStrategyOf(enterprise, board, options = {}) {
  const order = takingOrderOf(enterprise, board, options);
  const candidates = new Set(order.candidates.map((thread) => thread.id ?? thread.opening.id));
  const refused = [];
  const record = [];
  for (const thread of board.threads) {
    const id = thread.id ?? thread.opening.id;
    const open = !["accepted", "withdrawn", "superseded", "resolved"].includes(thread.standing);
    if (open && TAKING_MOVE[thread.opening.move] !== undefined && addresseeOf(thread) === enterprise.id) {
      const answered = (thread.promisers ?? []).some((entry) => entry.player === enterprise.id)
        || (thread.declines ?? []).some((entry) => entry.player === enterprise.id)
        || everTakenBy(thread).has(enterprise.id);
      if (!answered && !candidates.has(id)) refused.push(id);
    }
    if (everTakenBy(thread).has(enterprise.id) && assayerOf(thread) !== enterprise.id) {
      record.push(Object.freeze({ thread: id, kind: thread.opening.move, payoff: payoffOf(thread, enterprise.id) }));
    }
  }
  const settled = record.map((entry) => entry.payoff).filter((payoff) => payoff !== "unknown");
  const tally = {};
  for (const entry of record) tally[entry.payoff] = (tally[entry.payoff] ?? 0) + 1;
  return Object.freeze({
    enterprise: enterprise.id,
    receptive: refused.length === 0,
    refused: Object.freeze(refused),
    record: Object.freeze(record),
    tally: Object.freeze(tally),
    reading: settled.length === 0 ? "unknown" : knowledgeJoinAll(settled),
    candidates: Object.freeze([...candidates]),
  });
}

/** Who played a move, cast: the player is the mask, the hand the account, the bearers the characters whose organ that hand is. */
export function castOf(agency, move) {
  return Object.freeze({
    mask: move.by,
    ...optional("hand", move.hand),
    bearers: move.hand === undefined ? Object.freeze([]) : bearersHandedBy(agency, move.hand),
  });
}

/** The side and polarity names, for readers that print them. */
export const polarityOfMove = (game, id) => polarityName(game.structure.events.find((entry) => entry.id === id)?.polarity ?? negative());
