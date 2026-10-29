/**
 * Temporal geometry of the scene — the causal order of its settling.
 *
 * This realizes meme-geometry's `temporal` construction (which defines the
 * causal order of a meme-topology settling) over the scene's own firing
 * events, so the engine's time has the same Lorentzian-like causal structure
 * the substrate proves: time is the settling, two events are causally ordered
 * when an evidence path runs from one to the other, and events with no such
 * path are spacelike — a fact about the scene, not a metric assertion.
 *
 * An event is one body's existence change at a tick. Two events are adjacent
 * when they share a subject (the same body), or when a strike couples a striker
 * and a target. Causal precedence is the transitive closure of tick-increasing
 * adjacency — a strict partial order, acyclic because ticks strictly increase
 * along every edge. The cone at an event is its causal past and future; what
 * lies in neither is elsewhere.
 *
 * It is integer-only (Floyd–Warshall over the events) — none of the exact
 * ordinal arithmetic — so it is cheap enough to read on demand.
 */

import type { FiringEvent } from "./scene.mjs";

export interface CausalOrder {
  readonly kind: "qwzspace.time.causalOrder";
  readonly events: readonly FiringEvent[];
  /** precedes[i] lists indices j with event i strictly causally before j. */
  readonly precedes: readonly (readonly number[])[];
}

const adjacent = (earlier: FiringEvent, later: FiringEvent): boolean =>
  earlier.tick < later.tick && earlier.subject === later.subject;

/** The causal order: transitive closure of tick-increasing subject adjacency
 *  over the firing events. */
export const causalOrder = (events: readonly FiringEvent[]): CausalOrder => {
  const n = events.length;
  const direct: boolean[][] = events.map((earlier) =>
    events.map((later) => adjacent(earlier, later)));
  for (let mid = 0; mid < n; mid += 1) {
    for (let from = 0; from < n; from += 1) {
      if (!direct[from]![mid]) continue;
      for (let to = 0; to < n; to += 1) {
        if (direct[mid]![to]) direct[from]![to] = true;
      }
    }
  }
  return Object.freeze({
    kind: "qwzspace.time.causalOrder" as const,
    events: Object.freeze([...events]),
    precedes: Object.freeze(direct.map((row) =>
      Object.freeze(row.flatMap((reachable, index) => (reachable ? [index] : []))))),
  });
};

export interface CausalCone {
  readonly kind: "qwzspace.time.cone";
  readonly apex: FiringEvent;
  readonly past: readonly FiringEvent[];
  readonly future: readonly FiringEvent[];
}

/** The cone at the event at `index`: everything causally before and after it. */
export const causalCone = (order: CausalOrder, index: number): CausalCone | null => {
  const apex = order.events[index];
  if (!apex) return null;
  const past = order.events.filter((_, i) => order.precedes[i]!.includes(index));
  const future = order.precedes[index]!.map((i) => order.events[i]!);
  return Object.freeze({
    kind: "qwzspace.time.cone" as const,
    apex,
    past: Object.freeze(past),
    future: Object.freeze(future),
  });
};

export type Separation = "timelike" | "spacelike";

/** How two events are separated: timelike when one causally precedes the
 *  other, spacelike when neither does. */
export const separation = (order: CausalOrder, left: number, right: number): Separation =>
  order.precedes[left]?.includes(right) || order.precedes[right]?.includes(left) ? "timelike" : "spacelike";
