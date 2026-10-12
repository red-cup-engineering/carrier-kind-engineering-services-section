/**
 * The city's people: who is present in the world, what they are called, and the verbs the
 * world answers itself from that presence (who, tell, finger, look, emote).
 *
 * FeltOS queues every input line to its engine, whose own commands know nothing of the agency's
 * cast: it names an actor by the id its session was opened with, and it says "You waves". The
 * world therefore keeps a control-plane verb table of its own. It is data (verb -> help line and
 * handler); a line whose verb is in it is answered here and never reaches the engine (but for a
 * bare `look`, which the engine draws first and the table then adds its people to), and every
 * other line is an engine verb. Each handler answers in prose and in data (a GMCP-style package,
 * `{ name, data }`, the channel a turn already carries its structured results on).
 *
 * Presence is a presence: an entry carries `lastSeen` and drops once it is older than
 * PRESENCE_TTL. The entries are held in recency order (a character seen again moves to the back), so
 * expiry reads only the front, `who` pages (`limit`, `offset`) without sorting the city, and the
 * cost of a turn does not grow with the number of people who are away.
 */

/** How long a character stays present after it last spoke or connected: fifteen minutes. */
export const PRESENCE_TTL = 15 * 60_000;
/** The most `who` lists in one page, and the page it lists when no limit is given. */
export const WHO_PAGE = 20, WHO_MAX = 200;

/** A short, stable stand-in for an id with no name: `actor:TxHz8_VaNnere…` is `TxHz8_Va`. */
export const shortId = (id) => String(id ?? "someone").split(":").pop().slice(0, 8) || "someone";

/**
 * The presence list. `now()` is the clock (injected, so expiry is testable).
 * An entry: { actor, character, name, room, lastSeen }.
 */
export function createPresence({ now = Date.now, ttl = PRESENCE_TTL } = {}) {
  const entries = new Map();
  const expire = () => {
    const dropped = [];
    const horizon = now() - ttl;
    for (const [actor, entry] of entries) {
      if (entry.lastSeen > horizon) break;
      entries.delete(actor);
      dropped.push(entry);
    }
    return dropped;
  };
  return Object.freeze({
    /** Note that `actor` was seen now; the entries it displaces by age are returned by expire(). */
    see(actor, details) {
      const prior = entries.get(actor);
      entries.delete(actor);
      entries.set(actor, Object.freeze({ ...prior, ...details, actor, lastSeen: now() }));
    },
    /** Drop and return whoever has not been seen within the TTL. */
    expire,
    get: (actor) => entries.get(actor),
    leave: (actor) => entries.delete(actor),
    size: () => entries.size,
    /** Present people from the oldest seen to the newest, `room` only if given, one page of them. */
    page({ room, offset = 0, limit = WHO_PAGE } = {}) {
      expire();
      const take = Math.min(Math.max(1, Math.trunc(limit) || WHO_PAGE), WHO_MAX), skip = Math.max(0, Math.trunc(offset) || 0);
      const people = [];
      let total = 0;
      for (const entry of entries.values()) {
        if (room !== undefined && entry.room !== room) continue;
        if (total >= skip && people.length < take) people.push(entry);
        total += 1;
      }
      return { total, offset: skip, limit: take, people };
    },
    /** The present character named `name` (any case), or its unique name prefix. */
    byName(name) {
      expire();
      const needle = String(name).trim().toLowerCase();
      if (needle === "") return undefined;
      let prefixed;
      for (const entry of entries.values()) {
        const hers = entry.name.toLowerCase();
        if (hers === needle) return entry;
        if (hers.startsWith(needle)) prefixed = prefixed === undefined ? entry : null;
      }
      return prefixed ?? undefined;
    },
  });
}

const VOWEL_Y = /[aeiou]y$/u, SIBILANT = /(?:[sxz]|[cs]h|o)$/u, CONSONANT_Y = /[^aeiou]y$/u;
const IRREGULAR = Object.freeze({ be: "is", have: "has" });
/**
 * An imperative verb in the third person singular: wave -> waves, watch -> watches, cry -> cries,
 * play -> plays, go -> goes, and the two irregular ones, be and have.
 */
export function thirdPerson(verb) {
  const word = String(verb);
  const lower = word.toLowerCase();
  if (Object.hasOwn(IRREGULAR, lower)) return IRREGULAR[lower];
  if (CONSONANT_Y.test(lower) && !VOWEL_Y.test(lower)) return `${word.slice(0, -1)}ies`;
  return SIBILANT.test(lower) ? `${word}es` : `${word}s`;
}

/** An emote as each side reads it: `wave at the clerk` is "You wave at the clerk" and "<Name> waves at the clerk". */
export function emoteLines(name, action) {
  const [verb, ...rest] = String(action).trim().split(/\s+/u);
  const tail = rest.length === 0 ? "" : ` ${rest.join(" ")}`;
  return { self: `You ${verb}${tail}`, others: `${name} ${thirdPerson(verb)}${tail}` };
}

const bare = (words) => String(words).trim();
const when = (ms) => (ms < 60_000 ? "just now" : ms < 3_600_000 ? `${Math.floor(ms / 60_000)}m ago` : `${Math.floor(ms / 3_600_000)}h ago`);

/**
 * The control-plane verb table. `context` is what the world lends: `presence`, `now()`,
 * `roomOf(actor)`, `roomName(room)`, `witnesses(actor)` (actors who see it act), `deliver(actor,
 * text, channel)` (a line into an actor's telling queue), `stash(actor, package)` (data for its
 * next turn), and `nameOf(actor)`. A handler is `(ctx) => void`, with ctx = { actor, argument }.
 */
export function createControlTable(context) {
  const { presence, now, roomOf, roomName, witnesses, deliver, stash, nameOf } = context;
  // Injected by the world, which owns the binding: `tellMail(record)` tells one body record
  // (mail or a read mark) and `characterNamed(name)` reads the agency's character `{ id, name }` by
  // id, key or name. Without them a tell is the live line alone.
  const { tellMail, characterNamed = () => undefined } = context;
  const stamp = () => new Date(now()).toISOString();
  const placed = (entry) => Object.freeze({ id: entry.actor, name: entry.name, room: entry.room, roomName: roomName(entry.room), idle: Math.max(0, now() - entry.lastSeen) });
  const listing = (title, reading, where) => {
    if (reading.total === 0) return `${title}: no one.`;
    const rows = reading.people.map((entry) => `  ${entry.name}${entry.room === where ? "" : ` (${roomName(entry.room)})`}, ${when(now() - entry.lastSeen)}`);
    const end = reading.offset + reading.people.length;
    return [`${title}: ${reading.total} present, ${reading.offset + 1}-${end}:`, ...rows,
      ...(end < reading.total ? [`  …more: type who ${end} for the next page.`] : [])].join("\n");
  };
  const table = {
    who: {
      help: "who [offset] [limit]: the people present in the city, a page at a time",
      run({ actor, argument }) {
        const [offset, limit] = bare(argument).split(/\s+/u).map((word) => Number.parseInt(word, 10));
        const reading = presence.page({ offset: offset || 0, limit: limit || WHO_PAGE });
        deliver(actor, listing("In the city", reading, roomOf(actor)));
        stash(actor, { name: "Comm.Who", data: { total: reading.total, offset: reading.offset, limit: reading.limit, players: reading.people.map(placed) } });
      },
    },
    look: {
      help: "look: the room and the people in it (look <thing> looks at it)",
      // The engine draws the room and answers `look <thing>`; the people in a bare look are the world's to name.
      alongside: (argument) => bare(argument) === "",
      run({ actor }) {
        const room = roomOf(actor);
        const reading = presence.page({ room, limit: WHO_MAX });
        const others = reading.people.filter((entry) => entry.actor !== actor);
        deliver(actor, others.length === 0 ? "No one else is here." : `Here with you: ${others.map((entry) => entry.name).join(", ")}${reading.total > WHO_MAX ? ", and more" : ""}.`);
        stash(actor, { name: "Room.Players", data: { room, roomName: roomName(room), total: reading.total, players: reading.people.map(placed) } });
      },
    },
    tell: {
      help: "tell <name> <words>: say something to a character; one who is away finds it in its mail",
      run({ actor, argument }) {
        const [, target = "", words = ""] = /^(\S+)(?:\s+(.*))?$/su.exec(bare(argument)) ?? [];
        if (target === "" || words.trim() === "") return deliver(actor, "Tell whom what? tell <name> <words>");
        const said = words.trim();
        const hers = presence.byName(target);
        const from = nameOf(actor);
        const sender = characterNamed(presence.get(actor)?.character) ?? characterNamed(from);
        // The mail: told to the character's body (so it keeps the words), under its own address.
        const leave = (character) => tellMail?.({ kind: "mail", to: [character.id], from: sender?.id ?? from, words: said, at: stamp() });
        if (hers === undefined) {
          const away = tellMail === undefined ? undefined : characterNamed(target);
          if (away === undefined) return deliver(actor, `No one named ${target} is present. Type who.`);
          leave(away);
          return deliver(actor, `${away.name} is away; your words wait in its mail.`);
        }
        if (hers.actor === actor) return deliver(actor, "You murmur to yourself.");
        deliver(hers.actor, `${from} tells you, "${said}"`, "tell");
        stash(hers.actor, { name: "Comm.Tell", data: { from: { id: actor, name: from }, words: said, at: now() } });
        // The one present saw it live, so its body's copy is marked read.
        const body = characterNamed(hers.character) ?? characterNamed(hers.name);
        if (body !== undefined && tellMail !== undefined) {
          const [sent] = leave(body) ?? [];
          if (sent !== undefined) tellMail({ kind: "mail-read", id: sent.id, character: body.id, at: stamp() });
        }
        deliver(actor, `You tell ${hers.name}, "${said}"`, "tell");
      },
    },
    finger: {
      help: "finger <name>: who a present character is, where, and how long since it spoke",
      run({ actor, argument }) {
        const name = bare(argument);
        if (name === "") return deliver(actor, "Finger whom? finger <name>");
        const hers = presence.byName(name);
        if (hers === undefined) return deliver(actor, `No one named ${name} is present.`);
        const info = placed(hers);
        deliver(actor, `${hers.name} is in ${info.roomName}, last heard ${when(info.idle)}.`);
        stash(actor, { name: "Char.Info", data: info });
      },
    },
    emote: {
      help: "emote <action>: act visibly; `emote wave` reads \"You wave\" to you and \"<Name> waves\" to the room",
      run({ actor, argument }) {
        if (bare(argument) === "") return deliver(actor, "Emote what? emote <action>");
        const lines = emoteLines(nameOf(actor), argument);
        const seen = new Set([...witnesses(actor), actor]);
        for (const viewer of seen) deliver(viewer, viewer === actor ? lines.self : lines.others, "emote");
        stash(actor, { name: "Comm.Emote", data: { by: { id: actor, name: nameOf(actor) }, action: bare(argument), room: roomOf(actor), seenBy: seen.size - 1 } });
      },
    },
  };
  table.pose = table.emote;
  table.l = table.look;
  return Object.freeze(table);
}
