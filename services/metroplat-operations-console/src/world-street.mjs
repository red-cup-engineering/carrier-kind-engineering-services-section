/**
 * The world from the street: the city a visitor who has not signed in may see. Every building
 * stands where it stands, in its jurisdiction's colour, so the city reads whole; only the storeys
 * nearest the plaza keep their names. Nothing else of the house leaves: no section paths, no ids a
 * path can be read from, nothing standing inside, nobody seated.
 *
 * The street sees the house at work too: figures going about the city between its buildings, and
 * buildings warm with what was done in them. It does not see who they are or what they do: a
 * figure is an id that means nothing outside this process, and a building is its street alias.
 * @module
 */
import { createHmac, randomBytes } from "node:crypto";
import { packPlaceTree, unpackPlaceTree } from "@red-cup-engineering/qwzspace/place-tree";

const NAMED = 3;

/** Opaque ids by the atlas's own order: a building is one of the city's, never a path. */
export function streetAliases(atlas) {
  return new Map(unpackPlaceTree(atlas.rooms, atlas.tails).map((room, index) => [room.id, room.id === atlas.start ? "plaza" : `b${index.toString(36)}`]));
}

const PROCESS_KEY = randomBytes(32);

/** A world pulse reduced to what the street shows: each figure by an id keyed to this process,
 *  in buildings by their street aliases, with no names, verbs or enterprises; whatever stands where
 *  the street has no building is left out. */
export function streetPulse(pulse, alias, key = PROCESS_KEY) {
  const opaque = (id) => createHmac("sha256", key).update(id).digest("base64url").slice(0, 12);
  const walkers = pulse.walkers.filter((w) => alias.has(w.room) && alias.has(w.rest)).map((w) => Object.freeze({
    id: opaque(w.id), kind: w.kind, rest: alias.get(w.rest), room: alias.get(w.room), verb: "", at: w.at, seq: w.seq,
    ...(w.done === undefined ? {} : { done: w.done, ok: w.ok }),
  }));
  return Object.freeze({
    kind: pulse.kind, view: "street", at: pulse.at, halfLife: pulse.halfLife, plaza: "plaza", seq: pulse.seq,
    walkers: Object.freeze(walkers),
    heat: Object.freeze(pulse.heat.filter((h) => alias.has(h.room)).map((h) => Object.freeze({ room: alias.get(h.room), v: h.v, at: h.at }))),
    acts: Object.freeze(pulse.acts.filter((a) => alias.has(a.room)).map((a) => Object.freeze({ seq: a.seq, at: a.at, walker: opaque(a.walker), room: alias.get(a.room) }))),
  });
}

/** A world atlas reduced to what the street shows; `named` is how many storeys below the plaza
 *  keep their names. The room tree keeps its order, which is the city's, so the street stands
 *  where the city stands. */
export function streetAtlas(atlas, { named = NAMED } = {}) {
  const whole = unpackPlaceTree(atlas.rooms, atlas.tails);
  const holder = new Map(whole.map((room) => [room.id, room.up])), depth = new Map();
  const depthOf = (id) => {
    if (!depth.has(id)) depth.set(id, holder.get(id) === null ? 0 : depthOf(holder.get(id)) + 1);
    return depth.get(id);
  };
  const alias = streetAliases(atlas);
  const street = whole.map((room) => ({
    id: alias.get(room.id), name: depthOf(room.id) <= named ? room.name : "", up: room.up === null ? null : alias.get(room.up), jurisdiction: room.jurisdiction,
  }));
  return Object.freeze({
    kind: atlas.kind, view: "street", start: "plaza", jurisdictions: atlas.jurisdictions, tints: atlas.tints,
    city: atlas.city, tails: Object.freeze({}), rooms: packPlaceTree(street),
  });
}
