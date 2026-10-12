/**
 * The metroplex's pulse: the house's real work, as people going about the city.
 *
 * Every operation MetroPlat runs is witnessed in the day's RPC evidence before it runs (an attempt)
 * and when it ends (an outcome). The pulse folds those rows, as they are admitted, into walkers:
 * one per routine (a clock schedule) and one per account. A walker stands where its latest act
 * happens: a micro-enterprise's run in that enterprise's section, which is its hall; an account's
 * act in its micro-enterprise's hall when it names one, else in the room its character stands in,
 * else in its office's room; anything else in the plaza, where the instance keeps its own chores.
 * Between acts a walker rests: a routine with the clock that calls it, in the plaza, and an
 * account in its office. When it goes from one to the other is the client's to derive from the
 * instants it is given.
 *
 * A room's heat is the acts it hosted, each halving every `HALF_LIFE`. It is held as a value and
 * the instant it was last struck, and read at any later instant by the formula, so time passing
 * writes nothing. The evidence log is read from a byte cursor per day, seeded a little before its tail,
 * and only when someone asks, so a city nobody watches costs nothing.
 * @module
 */
import path from "node:path";
import { subjects, certainValue, values } from "@red-cup-engineering/feltos/world";
import { statSync } from "node:fs";
import { get, readLog } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { logFile } from "@red-cup-engineering/semiotic-eavt-services-section/layout";
import { rpcEvidenceType } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { actorIdFor } from "@red-cup-engineering/feltos/mud-server";

/** A room's heat halves in two minutes. */
export const HALF_LIFE = 120_000;
/** How long an account that stops acting stays in the city. */
export const PRESENCE = 30 * 60_000;
/** The acts kept for a reader catching up, newest last. */
const ACTS = 120;
/** Invocations awaiting their outcome; an attempt whose outcome never comes is forgotten past this. */
const PENDING = 4096;
/** How far before a day's tail a first reading starts (about ten minutes of today's lines). */
const SEED = 300_000;
/** Reading the city's own map or pulse is no work in it. */
const UNSEEN = new Set(["metroplex-atlas", "metroplex-pulse"]);
const PLAZA = "metroplex";

const title = (text) => String(text).split(/[-_\s]+/u).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

const instant = { type: "number", description: "Milliseconds since the Unix epoch." };
/** The pulse as data: who acts where, how warm each room is, and the latest acts. */
export const pulseSchema = Object.freeze({
  $id: "metroplat/metroplex/pulse", title: "MetroplexPulse", type: "object",
  required: ["kind", "at", "halfLife", "plaza", "seq", "walkers", "heat", "acts"],
  properties: {
    kind: { const: "metroplat.metroplex.pulse" }, at: instant,
    halfLife: { type: "number", description: "Milliseconds in which a room's heat halves." },
    plaza: { type: "string", description: "The room routines rest in between their acts." },
    seq: { type: "integer", minimum: 0, description: "The latest act's number: the next reading's `since`." },
    walkers: { type: "array", items: { type: "object", required: ["id", "kind", "rest", "room", "verb", "at", "seq"], properties: {
      id: { type: "string" }, kind: { enum: ["routine", "account"] }, name: { type: "string" },
      rest: { type: "string", description: "The room it rests in between acts." }, room: { type: "string", description: "The room of its latest act." },
      verb: { type: "string" }, enterprise: { type: "string" }, at: instant, seq: { type: "integer" },
      done: { ...instant, description: "When its latest act ended, once it has." }, ok: { type: "boolean" },
    } } },
    heat: { type: "array", items: { type: "object", required: ["room", "v", "at"], properties: { room: { type: "string" }, v: { type: "number" }, at: instant } } },
    acts: { type: "array", items: { type: "object", required: ["seq", "at", "walker", "room"], properties: {
      seq: { type: "integer" }, at: instant, walker: { type: "string" }, room: { type: "string" }, verb: { type: "string" }, enterprise: { type: "string" },
    } } },
  },
});

/** A room's heat at an instant: its value, halved for every `HALF_LIFE` since it was struck. */
export const heatAt = ({ v, at }, now) => v * 2 ** (-(now - at) / HALF_LIFE);

/** One piece of RPC evidence read as a pulse event: an attempt or an outcome, or nothing the pulse folds. */
export function pulseEvent(value) {
  if (value?.kind === "metroplat.rpc.attempt") {
    const invocation = value?.invocation;
    if (typeof invocation?.verb !== "string" || typeof invocation.subject !== "string" || UNSEEN.has(invocation.verb)) return undefined;
    const enterprise = [invocation.input?.enterprise, invocation.enterprise].find((e) => typeof e === "string" && e !== "");
    const schedule = invocation.caller?.schedule;
    const transport = invocation.caller?.transport;
    return Object.freeze({
      kind: "attempt", invocation: invocation.id, verb: invocation.verb, subject: invocation.subject, at: Date.parse(value.at),
      ...(enterprise === undefined ? {} : { enterprise }),
      ...(typeof schedule === "string" ? { schedule } : {}),
      ...(typeof transport === "string" ? { transport } : {}),
    });
  }
  if (value?.kind === "metroplat.rpc.outcome" && typeof value?.invocation === "string") {
    return Object.freeze({ kind: "outcome", invocation: value.invocation, ok: value.receipt?.ok === true, at: Date.parse(value.at) });
  }
  return undefined;
}

export function emptyPulse() {
  return { seq: 0, walkers: new Map(), pending: new Map(), heat: new Map(), acts: [] };
}

/**
 * Fold one pulse event. `siteOf(attempt)` says who acts and where: `{ walker, name, kind, rest,
 * room }`, or nothing for an act the city does not show.
 */
export function foldPulse(pulse, event, siteOf) {
  if (event.kind === "outcome") {
    const key = pulse.pending.get(event.invocation);
    if (key === undefined) return pulse;
    pulse.pending.delete(event.invocation);
    const walker = pulse.walkers.get(key);
    if (walker?.invocation === event.invocation) pulse.walkers.set(key, { ...walker, done: event.at, ok: event.ok });
    return pulse;
  }
  const site = siteOf(event);
  if (site === undefined || !Number.isFinite(event.at)) return pulse;
  const seq = (pulse.seq += 1);
  pulse.walkers.set(site.walker, {
    id: site.walker, kind: site.kind, name: site.name, rest: site.rest, room: site.room,
    verb: event.verb, ...(event.enterprise === undefined ? {} : { enterprise: event.enterprise }),
    invocation: event.invocation, at: event.at, seq,
  });
  pulse.pending.set(event.invocation, site.walker);
  if (pulse.pending.size > PENDING) pulse.pending.delete(pulse.pending.keys().next().value);
  const held = pulse.heat.get(site.room);
  pulse.heat.set(site.room, { v: (held === undefined ? 0 : heatAt(held, event.at)) + 1, at: event.at });
  pulse.acts.push({ seq, at: event.at, walker: site.walker, room: site.room, verb: event.verb,
    ...(event.enterprise === undefined ? {} : { enterprise: event.enterprise }) });
  if (pulse.acts.length > ACTS) pulse.acts.splice(0, pulse.acts.length - ACTS);
  return pulse;
}

/**
 * The pulse as a client reads it at `now`: every walker still in the city, every room still warm,
 * and the acts after `since` (a prior reading's `seq`).
 */
export function pulseReading(pulse, now, since = 0) {
  const walkers = [...pulse.walkers.values()]
    .filter((walker) => walker.kind === "routine" || now - (walker.done ?? walker.at) < PRESENCE)
    .map(({ invocation: _invocation, ...walker }) => Object.freeze(walker));
  const heat = [...pulse.heat].filter(([, held]) => heatAt(held, now) >= 0.01).map(([room, held]) => Object.freeze({ room, ...held }));
  return Object.freeze({
    kind: "metroplat.metroplex.pulse", at: now, halfLife: HALF_LIFE, plaza: PLAZA, seq: pulse.seq,
    walkers: Object.freeze(walkers), heat: Object.freeze(heat),
    acts: Object.freeze(pulse.acts.filter((act) => act.seq > since).map((act) => Object.freeze({ ...act }))),
  });
}

/**
 * Where acts happen in one built world. `game` is the metroplex's FeltOS game, `agency` the registry
 * it was built from, `root` the agency root, `characterOf(account)` the character an account enters
 * as, and `standing(account)` the room its character stands in now, if it is in the city.
 */
export function pulseSites({ world, agency, root, characterOf, standing, characterName = (character) => character }) {
  const prefix = root === undefined ? "" : `${path.basename(root)}/`;
  const roomOfSection = new Map(subjects(world).filter(id => certainValue(world, id, "kind") === "room")
    .flatMap(id => {
      const section = certainValue(world, id, "section-path");
      return typeof section === "string" ? [[section.startsWith(prefix) ? section.slice(prefix.length) : section, id]] : [];
    }));
  const roomAt = (sectionPath) => {
    for (const parts = String(sectionPath ?? "").split("/"); parts.length > 0; parts.pop()) {
      const room = roomOfSection.get(parts.join("/"));
      if (room !== undefined) return room;
    }
    return undefined;
  };
  const enterprises = [...agency.enterprises.values()];
  const enterpriseOf = (ref) => enterprises.find((e) => e.id === ref || e.key === ref);
  const seatOf = new Map();
  for (const office of subjects(world).filter(id => values(world, id, "tag").includes("office"))) {
    const room = certainValue(world, office, "located-in");
    if (room === null) continue;
    for (const actor of values(world, office, "seated")) if (!seatOf.has(actor)) seatOf.set(actor, room);
  }
  const officeRoom = (actor) => seatOf.get(actor);
  return (attempt) => {
    const enterprise = attempt.enterprise === undefined ? undefined : enterpriseOf(attempt.enterprise);
    const hall = roomAt(enterprise?.sectionPath);
    // The clock's own turn (what is due) has no schedule of its own: it is the clock.
    const schedule = attempt.schedule ?? (/clock$/u.test(attempt.transport ?? "") ? "clock" : undefined);
    if (schedule !== undefined) {
      const role = /^enterprise-(loop|work)-/u.exec(schedule)?.[1];
      return {
        walker: `routine:${schedule}`, kind: "routine", rest: PLAZA, room: hall ?? PLAZA,
        name: attempt.enterprise !== undefined && role !== undefined ? `${enterprise?.name ?? title(attempt.enterprise)} ${role}` : title(schedule),
      };
    }
    const character = characterOf(attempt.subject);
    const office = officeRoom(actorIdFor(character)) ?? officeRoom(actorIdFor(attempt.subject));
    return {
      walker: `account:${attempt.subject}`, kind: "account", name: characterName(character), rest: office ?? PLAZA,
      room: hall ?? standing(attempt.subject) ?? office ?? PLAZA,
    };
  };
}

/**
 * The pulse of one data root's RPC journal, read on demand: `read(siteOf, since)` folds what was
 * admitted since the last read (at most once a second) and returns the reading. A day's feed is
 * followed by its byte cursor to its end before the next day's is begun.
 */
export function createPulse({ dataRoot, now = Date.now, seed = SEED }) {
  const pulse = emptyPulse();
  let day, position, readAt = -Infinity;
  const follow = (date, from, siteOf) => {
    try {
      // A first reading starts a little before the log's tail; the lines it then reads are whole.
      const start = from ?? Math.max(0, statSync(logFile(dataRoot, rpcEvidenceType, date)).size - seed);
      let position = start;
      for (const { line, next } of readLog(dataRoot, rpcEvidenceType, date, { from: start })) {
        position = next;
        const evidence = typeof line.of === "string" ? get(dataRoot, rpcEvidenceType, line.of)?.evidence : undefined;
        const event = pulseEvent(evidence);
        if (event !== undefined) foldPulse(pulse, event, siteOf);
      }
      return position;
    } catch (error) {
      if (error?.code === "ENOENT") return from ?? 0;
      throw error;
    }
  };
  return Object.freeze({
    read(siteOf, since = 0) {
      const instant = now();
      if (instant - readAt >= 1000) {
        readAt = instant;
        const today = new Date(instant).toISOString().slice(0, 10);
        if (day !== undefined && day !== today) { follow(day, position, siteOf); position = 0; }
        position = follow(today, day === undefined ? undefined : position, siteOf);
        day = today;
      }
      return pulseReading(pulse, instant, since);
    },
  });
}
