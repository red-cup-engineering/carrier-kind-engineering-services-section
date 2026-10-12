/**
 * The magic circle (Huizinga 1938).
 *
 * Johan Huizinga, *Homo Ludens* (1938), names the *magic circle*: the bounded
 * space — physical or conceptual — within which play takes place, where special
 * rules apply and ordinary consequences are suspended.  In the corpus the magic
 * circle is realized algebraically: "Huizinga's magic circle IS fiber
 * composition" — entering the game composes your fiber with the game-world's,
 * and the circle is the *entity-fiber boundary* (sociology/questions,
 * girard-caillois-substrate-correspondence).
 *
 * Here the circle is drawn on an arena: a set of inside event ids marks the
 * in-play region, and the rest of the arena is the outside.  The inside is a
 * genuine sub-event-structure only when it is *down-closed* — every cause of an
 * inside event is itself inside (you cannot be mid-game on a move whose
 * prerequisites lie outside the circle).  Down-closure alone is the witness;
 * conflict-freeness is NOT required (a sub-structure is not a position).  The
 * boundary is the set of inside events whose causes or consequences cross out.
 */
import { arenaEvents } from "../arena.mjs";
import { causes, downSet, eventIds } from "@red-cup-engineering/playing/structuring/event/structure";

  

const sortIds = (ids) =>
  Object.freeze([...new Set(ids)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));

/**
 * Draw a magic circle on an arena from the in-play event ids.  Unknown ids are
 * silently ignored (they are not arena events, hence not in any circle); the
 * outside is every arena event not inside, and the boundary is the crossing
 * layer.
 */
export function magicCircle(arena, insideIds) {
  const all = eventIds(arena.structure);
  const known = new Set(all);
  const inside = new Set([...insideIds].filter((id) => known.has(id)));
  const outside = all.filter((id) => !inside.has(id));
  const structure = arena.structure;
  const boundary = [...inside].filter((id) =>
    outside.some((other) => causes(structure, other, id) || causes(structure, id, other)));
  return Object.freeze({
    kind: "game-geometry.magicCircle",
    arena,
    inside: sortIds(inside),
    outside: sortIds(outside),
    boundary: sortIds(boundary),
  });
}

  

/**
 * Judge whether the inside of a circle is a sub-event-structure: every inside
 * id is a known arena event, and the inside is down-closed under causality.
 * Conflict-freeness is deliberately not required.
 */
export function magicCircleJudgment(circle) {
  const structure = circle.arena.structure;
  const present = new Set(circle.inside);
  for (const id of circle.inside) {
    if (eventIds(structure).indexOf(id) === -1) {
      return Object.freeze({
        kind: "game-geometry.magicCircle-obstruction",
        reason: "unknown-event",
        offending: Object.freeze([id, id]),
      });
    }
  }
  for (const id of circle.inside) {
    for (const cause of downSet(structure, id)) {
      if (!present.has(cause)) {
        return Object.freeze({
          kind: "game-geometry.magicCircle-obstruction",
          reason: "not-down-closed",
          offending: Object.freeze([cause, id]),
        });
      }
    }
  }
  return Object.freeze({ kind: "game-geometry.magicCircle:witness", inside: circle.inside });
}

/** Whether the inside of the circle is a down-closed sub-event-structure. */
export function isMagicCircleClosed(circle) {
  return magicCircleJudgment(circle).kind === "game-geometry.magicCircle:witness";
}

/** The magic circle of the whole arena — every event is in play, no boundary crossings. */
export const wholeArenaCircle = (arena) =>
  magicCircle(arena, arenaEvents(arena).map((e) => e.id));

export function isMagicCircle(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return candidate.kind === "game-geometry.magicCircle"
    && Array.isArray(candidate.inside)
    && Array.isArray(candidate.outside)
    && Array.isArray(candidate.boundary);
}
