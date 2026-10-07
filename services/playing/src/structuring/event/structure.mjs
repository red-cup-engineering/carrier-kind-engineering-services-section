/**
 * Prime event structures — the objects of $\mathbf{CGS}$ before symmetry.
 *
 * Castellan-Clairambault-Winskel take the objects of the concurrent-games
 * category to be prime event structures $(E, \leq, \#)$: a set of events with a
 * causal partial order $\leq$ (an event may not occur until its causes have)
 * and an irreflexive symmetric conflict relation $\#$ (two events in conflict
 * never both occur), with conflict inherited upward along causality.  A
 * *configuration* is a finite, down-closed, conflict-free set of events — a
 * reachable position of the running game.
 *
 * Each event carries a polarity, making the structure a *polarized* prime event
 * structure — the raw board on which Player and Opponent move.
 */
import { isPolarity } from "../polarity.mjs";

/** An edge of a binary relation over event ids, stored as an ordered pair. */

export function event(id, polarity) {
  return Object.freeze({ kind: "game.event", id, polarity });
}

export function eventStructure(
  events,
  causality = [],
  conflict = [],
) {
  return Object.freeze({
    kind: "game.eventStructure",
    events: Object.freeze([...events]),
    causality: Object.freeze(causality.map((pair) => Object.freeze([pair[0], pair[1]]))),
    conflict: Object.freeze(conflict.map((pair) => Object.freeze([pair[0], pair[1]]))),
  });
}

export const eventIds = (structure) =>
  Object.freeze(structure.events.map((e) => e.id));

export const eventById = (structure, id) =>
  structure.events.find((e) => e.id === id) ?? null;

const hasPair = (pairs, from, to) =>
  pairs.some((pair) => pair[0] === from && pair[1] === to);

/** $a \leq b$ in the reflexive-transitive closure of the causality edges. */
export function causes(structure, a, b) {
  if (a === b) return true;
  const seen = new Set([a]);
  let frontier = [a];
  while (frontier.length > 0) {
    const next = [];
    for (const x of frontier) {
      for (const pair of structure.causality) {
        if (pair[0] === x && !seen.has(pair[1])) {
          if (pair[1] === b) return true;
          seen.add(pair[1]);
          next.push(pair[1]);
        }
      }
    }
    frontier = next;
  }
  return false;
}

/** $a \mathbin{\#} b$ — conflict is symmetric, so test both stored orientations. */
export function conflicts(structure, a, b) {
  return hasPair(structure.conflict, a, b) || hasPair(structure.conflict, b, a);
}

/** The causes of `id`: every event $c$ with $c \leq id$ (including `id`). */
export function downSet(structure, id) {
  return Object.freeze(eventIds(structure).filter((c) => causes(structure, c, id)));
}

/**
 * Judge whether a set of event ids is a configuration: every id is known, the
 * set is down-closed under causality, and it is conflict-free.
 */
export function configurationJudgment(structure, events) {
  const present = new Set(events);
  for (const id of events) {
    if (eventById(structure, id) === null) {
      return Object.freeze({ kind: "game.configuration-obstruction", events: Object.freeze([...events]), reason: "unknown-event", offending: Object.freeze([id, id]) });
    }
  }
  for (const id of events) {
    for (const cause of downSet(structure, id)) {
      if (!present.has(cause)) {
        return Object.freeze({ kind: "game.configuration-obstruction", events: Object.freeze([...events]), reason: "not-down-closed", offending: Object.freeze([cause, id]) });
      }
    }
  }
  for (const a of events) {
    for (const b of events) {
      if (a < b && conflicts(structure, a, b)) {
        return Object.freeze({ kind: "game.configuration-obstruction", events: Object.freeze([...events]), reason: "conflict", offending: Object.freeze([a, b]) });
      }
    }
  }
  return Object.freeze({ kind: "game.configuration:witness", events: Object.freeze([...events]) });
}

export function isConfiguration(structure, events) {
  return configurationJudgment(structure, events).kind === "game.configuration:witness";
}

export function isEvent(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return candidate.kind === "game.event" && typeof candidate.id === "string" && isPolarity(candidate.polarity);
}

export function isPrimeEventStructure(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return candidate.kind === "game.eventStructure"
    && Array.isArray(candidate.events)
    && candidate.events.every(isEvent)
    && Array.isArray(candidate.causality)
    && Array.isArray(candidate.conflict);
}
