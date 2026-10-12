/**
 * The jianghu: the metroplex's pulse as the people of a wuxia city. Every jurisdiction is a kind
 * of hall (science keeps temples, engineering forges, operations courts, public services markets,
 * and the house its palace); a micro-enterprise is a sect, its section its hall; its routines and
 * the accounts acting for it are its disciples, who leap roof to roof (qinggong) to where the work
 * is, stay a moment once it is done, and go back to where they rest.
 *
 * The city is shown a beat behind the house (`DELAY`, a little more than a poll), so the acts one
 * reading brings are played out at the instants they happened, not all at once when it lands.
 * Everything here is a function of the readings taken and the instant asked about: a leap is
 * where it is by the time since it began, and a building's warmth is its heat read by the pulse's
 * half-life formula. Nothing draws; the view (metroplex-view.mjs) asks and draws.
 * @module
 */

export const EPITHETS = Object.freeze({ house: "palace", science: "temple", engineering: "forge", operations: "court", public: "market" });

/** How far behind the house the city is shown. */
export const DELAY = 3500;
/** How long a disciple stays where its act ended before going back. */
export const LINGER = 6000;
/** An act whose end is never heard is over after this. */
const STALE = 10 * 60_000;
/** How long a building flares when an act strikes it. */
const FLASH = 1100;
/** A leap: its speed in metres a second, its least and most time, and how high it arcs for its
 *  length, to at most `peak` metres over the higher roof. */
const LEAP = Object.freeze({ speed: 220, least: 650, most: 2200, rise: 0.2, lift: 6, peak: 60 });
const TRACK = 12;
/** An act is told as a rumour only while it is this fresh. */
const NEWS = 8000;

/** FNV-1a: a stable spot for an id, the same in every browser. */
function hash(text) {
  let h = 0x811c9dc5;
  for (let k = 0; k < text.length; k++) h = Math.imul(h ^ text.charCodeAt(k), 0x01000193);
  return h >>> 0;
}
const boundsOf = (footprint) => footprint.reduce(([a, b, c, d], [x, y]) => [Math.min(a, x), Math.min(b, y), Math.max(c, x), Math.max(d, y)], [Infinity, Infinity, -Infinity, -Infinity]);

/**
 * Where on a building `who` stands: on its roof, at a spot its id picks. In the plaza (`open`), on
 * the open ground at its edge, about the city.
 */
export function spotOn(body, who, { open = false } = {}) {
  const [x0, y0, x1, y1] = boundsOf(body.footprint);
  const h = hash(who), u = (h & 0xffff) / 0x10000, v = (h >>> 16) / 0x10000;
  if (!open) return [x0 + (0.2 + 0.6 * u) * (x1 - x0), y0 + (0.2 + 0.6 * v) * (y1 - y0), body.z[1]];
  const inset = 0.025, along = inset + (1 - 2 * inset) * v;
  const side = Math.floor(u * 4);
  const [fx, fy] = [[along, inset], [1 - inset, along], [along, 1 - inset], [inset, along]][side];
  return [x0 + fx * (x1 - x0), y0 + fy * (y1 - y0), body.z[1]];
}

/**
 * Where a disciple's work has it at instant `t`: the room of its latest act begun by then, while
 * that act runs and `LINGER` after (an act followed by another ends when the next begins), else
 * where it rests. `track` is its acts, oldest first; `walker` its latest reading.
 */
export function goalOf(walker, track, t) {
  let index = -1;
  for (let k = 0; k < track.length; k++) if (track[k].at <= t) index = k;
  if (index < 0) return walker.at <= t ? walker.room : undefined;
  const act = track[index];
  const ended = index + 1 < track.length ? track[index + 1].at : act.at === walker.at ? walker.done : undefined;
  if (ended !== undefined ? t - ended > LINGER : t - act.at > STALE) return walker.rest;
  return act.room;
}

const glowOf = (heat, flash) => Math.min(1, 0.7 * (1 - Math.exp(-heat / 3)) + flash);

/**
 * The jianghu over one city. `spotOf(room, who)` is where `who` stands in `room` (or nothing for a
 * room the city does not hold); `clock()` the browser's instant.
 */
export function createJianghu({ spotOf, clock = () => Date.now() }) {
  const people = new Map(); // id -> { walker, track, goal, from, to, start, ms }
  let skew = 0, seen = 0, heat = [], halfLife = 120_000;
  let pending = []; // acts not yet played, oldest first
  const sects = new Map(); // room -> enterprise, as acts show it

  function where(person, local) {
    if (!person.to) return undefined;
    const p = person.ms > 0 ? Math.min(1, Math.max(0, (local - person.start) / person.ms)) : 1;
    if (p >= 1) return { at: person.to, moving: false, heading: person.heading };
    const [a, b] = [person.from, person.to];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    // A parabola over the straight line between the roofs, cresting above the higher one.
    const crest = Math.max(a[2], b[2]) - (a[2] + b[2]) / 2 + Math.min(LEAP.peak, length * LEAP.rise + LEAP.lift);
    const arc = crest * 4 * p * (1 - p);
    return { at: [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p + arc], moving: true, heading: person.heading };
  }

  return Object.freeze({
    /** Take a pulse reading; returns how many acts it brought that were not seen before. */
    take(reading, local = clock()) {
      skew = reading.at - local;
      heat = reading.heat;
      halfLife = reading.halfLife;
      const fresh = reading.acts.filter((act) => act.seq > seen);
      seen = Math.max(seen, reading.seq);
      for (const act of fresh) {
        if (act.enterprise !== undefined) sects.set(act.room, act.enterprise);
        const person = people.get(act.walker);
        if (person) person.track = [...person.track, { at: act.at, room: act.room }].slice(-TRACK);
      }
      pending = [...pending, ...fresh].sort((x, y) => x.at - y.at);
      const present = new Set();
      for (const walker of reading.walkers) {
        present.add(walker.id);
        const held = people.get(walker.id);
        const track = held?.track ?? fresh.filter((act) => act.walker === walker.id).map((act) => ({ at: act.at, room: act.room }));
        people.set(walker.id, { ...(held ?? {}), walker, track });
      }
      for (const id of people.keys()) if (!present.has(id)) people.delete(id);
      return fresh.length;
    },
    /** The instant the city is shown at, on the house's clock. */
    shownAt: (local = clock()) => local + skew - DELAY,
    /**
     * The city at a browser instant: every disciple's place (`{ id, walker, goal, at, moving, heading }`),
     * every room's glow (0 to 1), the acts that happened since the last asking (to be told as
     * rumours), and whether anything moves.
     */
    at(local = clock()) {
      const t = local + skew - DELAY;
      const shown = [];
      let moving = false;
      for (const [id, person] of people) {
        person.track = person.track.filter((act, index, all) => index === all.length - 1 || all[index + 1].at > t - LINGER - STALE);
        const goal = goalOf(person.walker, person.track, t) ?? person.goal ?? person.walker.rest;
        const target = spotOf(goal, id);
        if (target === undefined) continue;
        if (person.to === undefined) Object.assign(person, { goal, from: target, to: target, start: local, ms: 0, heading: 0 });
        else if (goal !== person.goal) {
          const from = where(person, local)?.at ?? person.to;
          const length = Math.hypot(target[0] - from[0], target[1] - from[1]);
          Object.assign(person, {
            goal, from, to: target, start: local,
            ms: Math.min(LEAP.most, Math.max(LEAP.least, (length / LEAP.speed) * 1000)),
            heading: length > 0 ? Math.atan2(target[0] - from[0], target[1] - from[1]) : person.heading,
          });
        }
        const place = where(person, local);
        moving ||= place.moving;
        shown.push({ id, walker: person.walker, goal, ...place });
      }
      const told = [];
      // What happened long before one came (a first reading's backlog) is not news.
      while (pending.length > 0 && pending[0].at <= t) {
        const act = pending.shift();
        if (t - act.at < NEWS) told.push(act);
      }
      const glow = new Map();
      for (const held of heat) {
        const value = held.v * 2 ** (-(t - held.at) / halfLife);
        if (value > 0) glow.set(held.room, value);
      }
      const struck = new Map();
      for (const person of people.values()) {
        for (const act of person.track) if (act.at <= t && t - act.at < FLASH) struck.set(act.room, Math.max(struck.get(act.room) ?? 0, 1 - (t - act.at) / FLASH));
      }
      const rooms = new Set([...glow.keys(), ...struck.keys()]);
      const glows = new Map([...rooms].map((room) => [room, glowOf(glow.get(room) ?? 0, struck.get(room) ?? 0)]));
      return { t, walkers: shown, glows, told, moving: moving || struck.size > 0 };
    },
    /** The enterprise whose hall a room is, as its acts have shown. */
    sectOf: (room) => sects.get(room),
  });
}
