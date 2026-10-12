/**
 * The metroplex's quests: the work board's open threads, as the work each room holds.
 *
 * A thread is a quest in the room its tellings are heard in (metroplex-tellings.mjs `worldPlaces`):
 * the deepest room over what it is about, else its opener's hall, else the plaza. A room offers the
 * open threads placed in it and in every room it encloses, nearest horizon first and by the arena's
 * own attention within one, as an agenda is ordered (organizing/enterprise `agendaOf`); the plaza
 * offers the town's pressing work, the threads whose horizon is now or soon, wherever they stand,
 * and the market's: the work at home nowhere, which no micro-enterprise is seated for. A character's
 * journal is its own agenda (organizing/enterprise `agendaOf`): every thread awaiting a move of a
 * player it plays as (its account, the offices it holds, the micro-enterprises seating them), under
 * the house's spelling of players. Where a thread stands, whose turn it is and what it awaits are
 * the arena's readings of the board (`threadSummary`, `duesOf`, `agendaOf`), never the world's.
 *
 * The board is the settlement's own (feltos/work/work-board), replayed from the record index the
 * enterprise loops replay; it is read again at most every `FRESH` milliseconds, so a crowd asking
 * after quests costs one replay, and at once after a character's own move, so it sees what it did.
 * @module
 */
import { workBoardStore } from "@red-cup-engineering/feltos/work/work-board";
import { canonicalPlayer } from "@red-cup-engineering/organizing/agency";
import { CLOSED_STANDINGS, HORIZONS, agendaOf, attentionOf, byAttention, duesOf, horizonOf, sectionsOf, territoriesOf, threadSummary, workHomesOf } from "@red-cup-engineering/organizing/enterprise";
import { clip, handleOf } from "./metroplex-tellings.mjs";

/** How long one reading of the board serves, in milliseconds. */
export const FRESH = 10_000;
/** How many quests a room lists at once. */
export const QUESTS = 12;
const PRESSING = Object.freeze(["now", "soon"]);

/** A quest as data: one open thread as a room offers it. */
export const questSchema = Object.freeze({
  type: "object", required: ["id", "handle", "move", "standing", "room", "gist"],
  properties: {
    id: { type: "string" }, handle: { type: "string", description: "The thread's short handle (quest <handle>)." },
    move: { type: "string", description: "The kind of thread: its opening move." },
    standing: { type: "string" }, step: { type: "string" }, horizon: { enum: HORIZONS },
    room: { type: "string", description: "The room the thread is placed in." },
    home: { type: "string", description: "The micro-enterprise it is at home with." },
    owes: { type: "array", items: { type: "string" }, description: "Whose turn it is." },
    awaits: { type: "array", items: { type: "string" }, description: "The moves it awaits." },
    gist: { type: "string" },
  },
});

/** A journal's entry: a quest awaiting a move of a player the character plays as. */
const entrySchema = Object.freeze({
  ...questSchema, required: [...questSchema.required, "as", "moves"],
  properties: {
    ...questSchema.properties,
    as: { type: "string", description: "The player whose move it awaits: the account, the character, an office it holds or a house it serves." },
    moves: { type: "array", items: { type: "string" }, description: "The moves owed (accept <handle>, ...)." },
    roles: { type: "array", items: { type: "string" } },
  },
});

/** A page of a character's journal as data (Work.Journal), each player in it named as the city names it. */
export const journalSchema = Object.freeze({
  $id: "metroplat/metroplex/journal", title: "MetroplexJournal", type: "object",
  required: ["page", "total", "own", "houses", "houseTotal", "house", "names"],
  properties: {
    page: { type: "integer", minimum: 1 },
    total: { type: "integer", minimum: 0, description: "How many threads await the character's own move." },
    own: { type: "array", items: entrySchema, description: "This page of them, nearest first." },
    houses: { type: "array", items: { type: "string" }, description: "The micro-enterprises seating the offices it holds: the houses it serves." },
    houseTotal: { type: "integer", minimum: 0, description: "How many more threads await those houses' move." },
    house: { type: "array", items: entrySchema, description: "This page of those, when asked for (journal all)." },
    names: { type: "object", additionalProperties: { type: "string" }, description: "Each player named here, as the city names it." },
  },
});

/**
 * One settlement's quests over its work board. `agency()` is the agency now; `places()` the
 * current world's `worldPlaces`.
 */
export function createQuests({ binding, agency, now = Date.now }) {
  const store = workBoardStore(binding, { territories: () => territoriesOf([...agency().enterprises.values()]), agency, homes: workHomesOf(agency) });
  let reading, readAt = -Infinity, placedFor;
  const read = (places) => {
    const instant = now();
    if (reading === undefined || instant - readAt >= FRESH) {
      readAt = instant;
      const board = store.read(new Date(instant).toISOString());
      const order = byAttention(attentionOf(board));
      const rank = (thread) => HORIZONS.indexOf(horizonOf(thread) ?? "eventually");
      const open = board.threads.filter((thread) => !CLOSED_STANDINGS.includes(thread.standing))
        .sort((left, right) => rank(left) - rank(right) || order(left, right));
      const byHandle = new Map(), byId = new Map(board.threads.map((thread) => [thread.id, thread]));
      for (const thread of board.threads) byHandle.set(handleOf(thread.id), [...(byHandle.get(handleOf(thread.id)) ?? []), thread]);
      const position = new Map(open.map((thread, index) => [thread.id, index]));
      reading = { board, open, byHandle, byId, rank: (id) => position.get(id) ?? open.length, agendas: new Map(), placed: undefined };
    }
    // A thread's room depends on the world it is placed in; it is placed again when either moves.
    if (reading.placed === undefined || placedFor !== places) {
      reading.placed = new Map(reading.board.threads.map((thread) => [thread.id, places.placeOf({ sections: sectionsOf(thread), by: thread.opening.by })]));
      placedFor = places;
    }
    return reading;
  };
  // One player's agenda, once per reading of the board.
  const agendaFor = (reading, player) => {
    if (!reading.agendas.has(player)) {
      const agency_ = agency();
      reading.agendas.set(player, agendaOf(reading.board, player, { playerIdentity: (other) => canonicalPlayer(agency_, other) }));
    }
    return reading.agendas.get(player);
  };
  const questOf = (thread, placed) => {
    const summary = threadSummary(thread);
    return Object.freeze({
      id: thread.id, handle: handleOf(thread.id), move: summary.move, standing: summary.standing,
      ...(summary.step === undefined ? {} : { step: summary.step }),
      ...(summary.horizon === undefined ? {} : { horizon: summary.horizon }),
      room: placed.get(thread.id),
      ...(summary.home === undefined ? {} : { home: summary.home }),
      ...(summary.owes === undefined ? {} : { owes: summary.owes }),
      ...(summary.awaits === undefined ? {} : { awaits: summary.awaits }),
      gist: summary.gist,
    });
  };
  return Object.freeze({
    /**
     * The quests `room` offers: the open threads placed in it or a room it encloses, the plaza's
     * only the pressing ones; the first `limit` after `skip`, and how many there are.
     */
    in(room, places, { plaza, skip = 0, limit = QUESTS } = {}) {
      const { open, placed } = read(places);
      const offered = open.filter((thread) => (room === plaza ? PRESSING.includes(horizonOf(thread)) : places.hears(room, placed.get(thread.id))));
      return Object.freeze({ total: offered.length, quests: Object.freeze(offered.slice(skip, skip + limit).map((thread) => questOf(thread, placed))) });
    },
    /** The market's quests: the work at home nowhere, which no micro-enterprise is seated for. */
    market(places, { skip = 0, limit = QUESTS } = {}) {
      const reading = read(places);
      const agenda = agendaFor(reading, "market");
      return Object.freeze({ total: agenda.length, quests: Object.freeze(agenda.slice(skip, skip + limit).map((entry) => questOf(reading.byId.get(entry.id), reading.placed))) });
    },
    /**
     * A character's journal: the threads awaiting a move of any player it plays as (`players`, its
     * own first), each once, as the player owed it first, nearest horizon first and by attention.
     */
    journal(players, places) {
      const reading = read(places);
      const owed = new Map();
      for (const player of players) {
        for (const entry of agendaFor(reading, player)) {
          if (!owed.has(entry.id)) owed.set(entry.id, Object.freeze({ ...questOf(reading.byId.get(entry.id), reading.placed), as: player, moves: entry.moves, roles: entry.roles }));
        }
      }
      return Object.freeze([...owed.values()].sort((left, right) => reading.rank(left.id) - reading.rank(right.id)));
    },
    /** The threads a handle (or a whole id) names, open or closed. */
    named(handle, places) {
      const { board, byHandle } = read(places);
      const key = String(handle).trim();
      if (key.startsWith("ni:")) return board.threads.filter((thread) => thread.id === key);
      return byHandle.get(handleOf(key)) ?? [];
    },
    /** Read the board again when next asked: a move was played on it. */
    forget() {
      readAt = -Infinity;
    },
    /** One thread as a room tells it: its quest, its whole summary and who owes what. */
    detail(thread, places) {
      const { placed } = read(places);
      return Object.freeze({ quest: questOf(thread, placed), summary: threadSummary(thread), dues: duesOf(thread) });
    },
  });
}

/** One journal entry as a line: `[handle] request · delivered · now · accept/reject as the Senior engineer of Engineering — “gist”`. */
export function journalLine(entry, { nameOf = (player) => player, roomName } = {}) {
  const where = roomName === undefined ? "" : ` (in ${roomName(entry.room)})`;
  return `  [${entry.handle}] ${[entry.move, entry.step ?? entry.standing, entry.horizon].filter(Boolean).join(" · ")} · ${entry.moves.join("/")} as ${nameOf(entry.as)}${where} — “${clip(entry.gist, 110)}”`;
}

/** One quest as a line: `[handle] request · refined · soon · awaits promise from Engineering — “gist”`. */
export function questLine(quest, { nameOf = (player) => player, roomName } = {}) {
  const owed = quest.owes === undefined ? "" : ` · awaits ${(quest.awaits ?? []).join("/")} from ${quest.owes.map(nameOf).join(", ")}`;
  const where = roomName === undefined ? "" : ` (in ${roomName(quest.room)})`;
  return `  [${quest.handle}] ${[quest.move, quest.step ?? quest.standing, quest.horizon].filter(Boolean).join(" · ")}${owed}${where} — “${clip(quest.gist, 110)}”`;
}
