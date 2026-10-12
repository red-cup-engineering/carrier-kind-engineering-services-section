/**
 * src/journal/causal-graph - the causal audit graph.
 *
 * Every journal event carries `causes`: the ids of the events that had to
 * exist before it. Those edges induce one graph over the whole journal. This
 * module is that graph's single home: build it from events, walk it, order
 * it. It is pure — no filesystem, no store. The store enforces acyclicity at
 * admission; this module lets everything above the store read the same
 * structure by one name.
 *
 * An edge id in `causes` may reference an event outside the given slice
 * (earlier history not loaded). Such edges are kept and reported as
 * `externalCauses` rather than dropped, so a partial read never silently
 * rewrites history's shape.
 */
import { createGraph, isAcyclic, reachable } from "@red-cup-engineering/graph-data-service";
import type { JournalWitness } from "./event.mts";
import type { WitnessRef } from "./witness.mts";

export interface CausalEntry {
  readonly ref: WitnessRef;
  readonly causes: readonly WitnessRef[];
}

/** Detect a cycle without inventing an order for spacelike witnesses. */
export function causalGraphHasCycle(entries: readonly CausalEntry[]): boolean {
  const refs = new Set(entries.map((entry) => entry.ref));
  const graph = createGraph({ nodes: [...refs].map((id) => ({ id })) });
  for (const entry of entries) {
    for (const cause of entry.causes) {
      if (refs.has(cause)) graph.addEdge({ from: cause, to: entry.ref });
    }
  }
  return !isAcyclic(graph);
}

export interface CausalGraph {
  /** Every event in the slice, keyed by id. */
  readonly events: ReadonlyMap<string, JournalWitness>;
  /** id -> ids of its causes present in the slice. */
  readonly parents: ReadonlyMap<string, readonly string[]>;
  /** id -> ids of events in the slice that name it as a cause. */
  readonly children: ReadonlyMap<string, readonly string[]>;
  /** Cause ids referenced by slice events but absent from the slice. */
  readonly externalCauses: ReadonlySet<string>;
  /** Events with no cause inside the slice. */
  readonly roots: readonly string[];
  /** Events no slice event names as a cause: the current frontier. */
  readonly heads: readonly string[];
}

export function causalGraphOf(events: readonly JournalWitness[]): CausalGraph {
  const byId = new Map<string, JournalWitness>();
  for (const event of events) byId.set(event.id, event);
  const parents = new Map<string, readonly string[]>();
  const children = new Map<string, string[]>();
  const externalCauses = new Set<string>();
  for (const event of byId.values()) {
    const present: string[] = [];
    for (const cause of event.core.causes) {
      if (!byId.has(cause)) {
        externalCauses.add(cause);
        continue;
      }
      present.push(cause);
      const siblings = children.get(cause);
      if (siblings === undefined) children.set(cause, [event.id]);
      else siblings.push(event.id);
    }
    parents.set(event.id, Object.freeze(present));
  }
  const roots: string[] = [];
  const heads: string[] = [];
  for (const id of byId.keys()) {
    if ((parents.get(id) ?? []).length === 0) roots.push(id);
    if ((children.get(id) ?? []).length === 0) heads.push(id);
  }
  const frozenChildren = new Map<string, readonly string[]>();
  for (const [id, list] of children) frozenChildren.set(id, Object.freeze(list));
  return Object.freeze({
    events: byId,
    parents,
    children: frozenChildren,
    externalCauses,
    roots: Object.freeze(roots),
    heads: Object.freeze(heads),
  });
}

function graphOverEdges(byId: ReadonlyMap<string, readonly string[]>): ReturnType<typeof createGraph> {
  const g = createGraph({ nodes: [...byId.keys()].map((id) => ({ id })) });
  for (const [from, tos] of byId) for (const to of tos) g.addEdge({ from, to });
  return g;
}

/** Ids of every event reachable from `id` by following causes, oldest-first. */
export function ancestorsOf(graph: CausalGraph, id: string): readonly string[] {
  const seen = reachable(graphOverEdges(graph.parents), id);
  return Object.freeze(topologicalOrder(graph).map((event) => event.id).filter((eventId) => seen.has(eventId)));
}

/** Ids of every event reachable from `id` by followed-by edges, oldest-first. */
export function descendantsOf(graph: CausalGraph, id: string): readonly string[] {
  const seen = reachable(graphOverEdges(graph.children), id);
  return Object.freeze(topologicalOrder(graph).map((event) => event.id).filter((eventId) => seen.has(eventId)));
}

/**
 * All slice events in an order where every cause precedes its effects.
 * Spacelike ties break only by exact event id, so wall time never becomes a
 * causal order. Throws if the slice contains a causal cycle, which the store
 * refuses at admission — seeing one here means the journal was edited
 * outside the store.
 */
export function topologicalOrder(graph: CausalGraph): readonly JournalWitness[] {
  const pending = new Map<string, number>();
  for (const [id, list] of graph.parents) pending.set(id, list.length);
  const byId = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
  const ready = [...pending.keys()].filter((id) => pending.get(id) === 0).sort(byId);
  const order: JournalWitness[] = [];
  while (ready.length > 0) {
    const id = ready.shift()!;
    order.push(graph.events.get(id)!);
    const unlocked: string[] = [];
    for (const child of graph.children.get(id) ?? []) {
      const remaining = pending.get(child)! - 1;
      pending.set(child, remaining);
      if (remaining === 0) unlocked.push(child);
    }
    unlocked.sort(byId);
    let at = 0;
    for (const next of unlocked) {
      while (at < ready.length && byId(ready[at]!, next) < 0) at += 1;
      ready.splice(at, 0, next);
    }
  }
  if (order.length !== graph.events.size) {
    throw new TypeError("causal event graph contains a cycle; the journal was modified outside the store");
  }
  return Object.freeze(order);
}
