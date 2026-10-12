/**
 * The metroplex's tellings: the work arena's moves, as what is said and done in the city.
 *
 * Every move of the work arena (organizing/enterprise/work-arena) is a semantic record of its
 * settlement's `work-arena-move` journal, and the board (feltos/work/work-board) replays those
 * records into threads. The tellings read the same records, through the same process-wide index
 * (semiotic-eavt's record query), and fold each record not yet told into a telling: who played
 * it, on which thread, in which room, and what it said. One index serves the board and the world;
 * the witness feed is never folded a second time. A telling is one event twice, as a line a person
 * reads (`prose`) and as fields a client or an agent reads, under one `seq`: GMCP's discipline, so
 * nobody scrapes prose for what the structure already says.
 *
 * A telling is placed where its work is: in the room of the deepest section its thread is about
 * (the arena's own `sectionsOf`), else in the hall of the micro-enterprise that played it, else in
 * the plaza. A coordination between micro-enterprises is overheard there, by whoever stands in
 * that room or a room enclosing it, as a crowd hears what is said in the hall it stands in.
 *
 * A telling is what was said, not the board's judgement of it: a move the arena's replay refuses
 * was still spoken. Where a thread stands is read from the board (metroplex-quests.mjs), never from
 * its tellings. Every opening is kept as its thread's gist and sections, so a response names the
 * thread it answers; the latest `TELLINGS` tellings are kept for readers catching up.
 * @module
 */
import { workArenaMovesAt } from "@red-cup-engineering/organizing/enterprise/outcomes";
import { resolve } from "@red-cup-engineering/organizing/agency";
import { subjects, certainValue, exitsOf } from "@red-cup-engineering/feltos/world";
import { OPENING_MOVES, houseSectionOf, sectionsOf } from "@red-cup-engineering/organizing/enterprise";

/** The journal the work arena's moves are recorded in (feltos/work/work-board's `WORK_BOARD_KIND`). */
/** The tellings kept for a reader catching up, newest last. */
export const TELLINGS = 400;
/** How long a move's own words run before they are cut: in its fields, and in its line of the world. */
const QUOTE = 240;
const SPOKEN = 160;
const GIST = 110;

const instant = { type: "number", description: "Milliseconds since the Unix epoch." };
/** One telling as data. */
export const tellingSchema = Object.freeze({
  type: "object", required: ["seq", "at", "move", "thread", "handle", "by", "who", "room", "prose"],
  properties: {
    seq: { type: "integer", minimum: 1, description: "The telling's number on this node: a later reading's `since`." },
    at: instant,
    move: { type: "string", description: "The arena move played (an opening: aim, request, propose, report, ask, declare; else a response)." },
    thread: { type: "string", description: "The thread's id on the work board." },
    handle: { type: "string", description: "The thread's short handle, as a command names it (quest <handle>)." },
    opening: { type: "string", description: "The kind of thread, when its opening is known." },
    gist: { type: "string", description: "What the thread opens with, in a line, when its opening is known." },
    by: { type: "string", description: "The player who made the move: a micro-enterprise, an office or an account." },
    who: { type: "string", description: "The player as the city names it." },
    room: { type: "string", description: "The room the move is told in." },
    says: { type: "string", description: "What the move itself says: a reason, an answer, an argument." },
    prose: { type: "string", description: "The telling as a line of the world." },
    record: { type: "string", description: "The move's record in the work arena's journal, by its content address: what a telling cites as evidence." },
  },
});
/** The tellings as data: those after `since`, in one room's hearing or the whole city's. */
export const tellingsSchema = Object.freeze({
  $id: "metroplat/metroplex/tellings", title: "MetroplexTellings", type: "object",
  required: ["kind", "at", "seq", "tellings"],
  properties: {
    kind: { const: "metroplat.metroplex.tellings" }, at: instant,
    seq: { type: "integer", minimum: 0, description: "The latest telling's number: the next reading's `since`." },
    room: { type: "string", description: "The room whose hearing was read (it and every room it encloses), when one was asked for." },
    tellings: { type: "array", items: tellingSchema },
  },
});

export const clip = (text, length) => {
  const line = String(text ?? "").replace(/\s+/gu, " ").trim();
  return line.length > length ? `${line.slice(0, length - 1)}…` : line;
};
const quoted = (text) => `“${clip(text, SPOKEN)}”`;

/** A thread's handle: the first eight characters of its digest, as a person types it. */
export const handleOf = (thread) => String(thread).replace(/^ni:\/\/\/sha-256;/u, "").slice(0, 8);

/** What an opening asks or tells, in its own words, in a line. */
export const gistOf = (opening) => clip(String(opening.purpose ?? opening.need ?? opening.idea ?? opening.observation ?? opening.question ?? opening.ruling ?? "").split("\n")[0], GIST);

/** What a response says of its own, if anything. */
function saysOf(move) {
  if (OPENING_MOVES.includes(move.move)) return undefined;
  if (typeof move.says === "string") return move.says;
  if (typeof move.reason === "string") return move.reason;
  if (typeof move.observation === "string") return move.observation;
  if (move.move === "reject" && Array.isArray(move.unmet)) return `unmet: ${move.unmet.join(", ")}`;
  return undefined;
}

const OPENED = Object.freeze({ aim: "sets an aim", request: "posts a request", propose: "puts forward a proposal", report: "reports", ask: "asks", declare: "declares" });

/** A move as the city tells it. `nameOf(player)` is how the city names a player. */
export function proseOf(move, opening, nameOf = (player) => player) {
  const who = nameOf(move.by);
  if (OPENING_MOVES.includes(move.move)) return `${who} ${OPENED[move.move]}: ${quoted(gistOf(move))}`;
  const on = opening === undefined ? `thread ${handleOf(move.thread)}` : `«${clip(gistOf(opening), 72)}»`;
  const says = saysOf(move);
  const tail = says === undefined ? "" : `: ${quoted(says)}`;
  const pieces = (count) => `${count} piece${count === 1 ? "" : "s"} of evidence`;
  switch (move.move) {
    case "hold": return `${who} takes up the aim ${on}`;
    case "wager": return `${who} wagers on ${on}: ${move.measure} to ${move.target?.value ?? move.target} by ${String(move.until ?? "").slice(0, 10)}`;
    case "observe": return `${who} reads ${move.measure} at ${move.value?.value ?? move.value} on ${on}`;
    case "attach": return `${who} sets more work under ${on}`;
    case "leave": return `${who} leaves ${on}${tail}`;
    case "promise": return `${who} promises ${on}`;
    case "decline": return `${who} declines ${on}${tail}`;
    case "refine": return `${who} restates the terms of ${on}`;
    case "counter": return `${who} counters the terms of ${on}${tail}`;
    case "agree": return `${who} agrees to ${nameOf(move.to)}'s terms on ${on}`;
    case "release": return `${who} gives back ${on}${tail}`;
    case "deliver": return `${who} delivers ${on}, with ${pieces(move.evidence?.length ?? 0)}`;
    case "accept": return `${who} accepts ${nameOf(move.of)}'s work on ${on}`;
    case "reject": return `${who} turns back ${nameOf(move.of)}'s delivery on ${on}${tail}`;
    case "withdraw": return `${who} withdraws ${on}${tail}`;
    case "adopt": return `${who} adopts ${on}`;
    case "argue": return `${who} argues ${move.stance} ${on}${tail}`;
    case "corroborate": return `${who} corroborates ${on}${tail}`;
    case "resolve": return `${who} resolves ${on}`;
    case "answer": return `${who} answers ${on}${tail}`;
    default: return `${who} plays ${move.move} on ${on}${tail}`;
  }
}

/**
 * Where a built world tells the house's work, and whom it names. A section's room is found by its
 * house spelling (organizing/enterprise `houseSectionOf`), so the world's paths (`lib/emsenn/…`)
 * and the arena's (`services/…`) meet. A thread about several sections is told in the deepest room
 * enclosing them all, as its home is the enterprise seated deepest over what it is about; one about
 * none, in its player's hall; one whose player has no hall, in the plaza. A room hears what is told
 * in it and in every room it encloses; the plaza hears the whole city.
 * `characterName(player)` names a character of the agency's cast, or nothing.
 * @param {{ game: { rooms: Record<string, { name: string, exits: Record<string, string> }>, assertions: ReadonlyArray<object> }, agency: object, plaza: string }} world
 */
export function worldPlaces({ world, agency, plaza, characterName = () => undefined }) {
  const roomOf = new Map(), sectionAt = new Map();
  for (const subject of subjects(world)) {
    const path = certainValue(world, subject, "section-path");
    const section = certainValue(world, subject, "kind") === "room" && typeof path === "string" ? houseSectionOf(path) : undefined;
    if (section !== undefined && !roomOf.has(section)) roomOf.set(section, subject);
    if (section !== undefined && !sectionAt.has(subject)) sectionAt.set(subject, section);
  }
  const roomAt = (section) => {
    const parts = String(section).split("/");
    for (; parts.length > 0; parts.pop()) if (roomOf.has(parts.join("/"))) return roomOf.get(parts.join("/"));
    return undefined;
  };
  const chains = new Map();
  /** A room and every room enclosing it, the plaza last. */
  const chainOf = (room) => {
    if (!chains.has(room)) {
      const chain = [];
      for (let at = room; at !== undefined && !chain.includes(at); at = at === plaza ? undefined : exitsOf(world, at).find(exit => exit.direction === "up")?.destination ?? plaza) chain.push(at);
      chains.set(room, Object.freeze(chain));
    }
    return chains.get(room);
  };
  const enterprises = new Map([...agency.enterprises.values()].map((record) => [record.id, record]));
  const offices = new Map([...agency.offices.values()].map((office) => [`${houseSectionOf(office.sectionPath) ?? office.sectionPath}#${office.id}`, office]));
  // An office in any spelling: the board's (`services/…#id`) or the agency's key (`emsenn/services/…#id`).
  const officeOf = (player) => offices.get(player) ?? (typeof player === "string" && player.includes("#") ? resolve(agency, "offices", player) : undefined);
  const hallOf = (player) => {
    const section = enterprises.get(player)?.sectionPath ?? officeOf(player)?.sectionPath;
    return section === undefined ? undefined : roomAt(houseSectionOf(section) ?? section);
  };
  const placeOf = ({ sections = [], by }) => {
    const rooms = sections.map(roomAt).filter((room) => room !== undefined);
    if (rooms.length === 0) return hallOf(by) ?? plaza;
    const [first, ...rest] = rooms.map(chainOf);
    return first.find((room) => rest.every((chain) => chain.includes(room))) ?? plaza;
  };
  const nameOf = (player) => {
    if (player === "market") return "the market";
    if (enterprises.has(player)) return enterprises.get(player).name ?? player;
    const office = officeOf(player);
    if (office !== undefined) return `the ${office.name} of ${certainValue(world, hallOf(player), "name") ?? "the house"}`;
    return characterName(player) ?? String(player ?? "someone");
  };
  return Object.freeze({
    placeOf, nameOf, chainOf,
    /** The section a room is, in the house's spelling (`services/…`); the plaza is none. */
    sectionOf: (room) => sectionAt.get(room),
    /** The room a section is in (the deepest room over it), in any of its spellings. */
    roomAt: (section) => roomAt(houseSectionOf(section) ?? section),
    /** Whether `room` hears a telling (or a thread placed) in `there`. */
    hears: (room, there) => chainOf(typeof there === "string" ? there : there.room).includes(room),
  });
}

/** One work-arena record read as a move, or nothing the city tells. */
export function toldMove(record) {
  const move = record?.record;
  if (move === null || typeof move !== "object" || typeof move.move !== "string" || typeof move.by !== "string") return undefined;
  const thread = OPENING_MOVES.includes(move.move) ? move.id : move.thread;
  return typeof thread === "string" ? Object.freeze({ ...move, thread, record: record.id }) : undefined;
}

export function emptyTellings() {
  return { seq: 0, openings: new Map(), tellings: [] };
}

/**
 * Fold one move. `placeOf({ sections, by })` is the room a move is told in, given the sections its
 * thread is about and its player; `nameOf(player)` how the city names a player.
 */
export function foldTellings(state, move, { placeOf, nameOf = (player) => player }) {
  const at = Date.parse(move.at);
  if (!Number.isFinite(at)) return state;
  if (OPENING_MOVES.includes(move.move) && !state.openings.has(move.thread)) {
    state.openings.set(move.thread, Object.freeze({ move: move.move, by: move.by, purpose: gistOf(move), sections: sectionsOf(move) }));
  }
  const opening = state.openings.get(move.thread);
  const says = saysOf(move);
  state.tellings.push(Object.freeze({
    seq: (state.seq += 1), at, move: move.move, thread: move.thread, handle: handleOf(move.thread),
    ...(opening === undefined ? {} : { opening: opening.move, gist: opening.purpose }),
    by: move.by, who: nameOf(move.by),
    room: placeOf({ sections: opening?.sections ?? [], by: move.by }),
    ...(says === undefined ? {} : { says: clip(says, QUOTE) }),
    prose: proseOf(move, opening, nameOf),
    ...(typeof move.record === "string" ? { record: move.record } : {}),
  }));
  if (state.tellings.length > TELLINGS) state.tellings.splice(0, state.tellings.length - TELLINGS);
  return state;
}

/**
 * The tellings as a reader reads them: those after `since`, those heard in `room` when one is given
 * (`hears(room, telling)` says whether a room hears one), on `thread` (an id or a handle) when one
 * is given, the latest `limit`.
 */
export function tellingsReading(state, { now = Date.now(), since = 0, room, thread, hears = () => true, limit = TELLINGS } = {}) {
  const heard = state.tellings.filter((telling) => telling.seq > since
    && (thread === undefined || telling.thread === thread || telling.handle === thread)
    && (room === undefined || hears(room, telling)));
  return Object.freeze({
    kind: "metroplat.metroplex.tellings", at: now, seq: state.seq,
    ...(room === undefined ? {} : { room }),
    tellings: Object.freeze(heard.slice(-limit)),
  });
}

/**
 * One data root's work arena as tellings, read on demand: `read(places)` folds the moves recorded
 * (at most once a second), in the order they were played, and returns the tellings. `places`
 * is `{ placeOf, nameOf }` for the world built now. Each reading is folded from the records; nothing
 * is kept of which moves were told before.
 */
export function createTellings({ dataRoot, now = Date.now }) {
  let state = emptyTellings();
  let readAt = -Infinity;
  return Object.freeze({
    read(places) {
      const instant = now();
      if (instant - readAt < 1000) return state;
      readAt = instant;
      const folded = emptyTellings();
      const moves = workArenaMovesAt(dataRoot).sort((left, right) => String(left.record?.at).localeCompare(String(right.record?.at)) || (left.id < right.id ? -1 : 1));
      for (const record of moves) {
        const move = toldMove(record);
        if (move !== undefined) foldTellings(folded, move, places);
      }
      state = folded;
      return state;
    },
  });
}
