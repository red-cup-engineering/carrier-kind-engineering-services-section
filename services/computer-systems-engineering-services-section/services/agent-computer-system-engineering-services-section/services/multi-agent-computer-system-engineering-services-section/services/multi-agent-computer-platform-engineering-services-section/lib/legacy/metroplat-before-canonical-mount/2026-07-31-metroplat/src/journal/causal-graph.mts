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
import type { JournalWitness } from "./event.mts";
import type { WitnessRef } from "./witness.mts";

export interface CausalEntry {
  readonly ref: WitnessRef;
  readonly causes: readonly WitnessRef[];
}

/** Detect a cycle without inventing an order for spacelike witnesses. */
export function causalGraphHasCycle(entries: readonly CausalEntry[]): boolean {
  const causesByRef = new Map(entries.map((entry) => [entry.ref, entry.causes]));
  const pending = new Map<WitnessRef, number>();
  const children = new Map<WitnessRef, WitnessRef[]>();
  for (const [ref, causes] of causesByRef) {
    const internal = new Set(causes.filter((cause) => causesByRef.has(cause)));
    pending.set(ref, internal.size);
    for (const cause of internal) {
      const existing = children.get(cause);
      if (existing === undefined) children.set(cause, [ref]);
      else existing.push(ref);
    }
  }
  const ready = [...pending].filter(([, count]) => count === 0).map(([ref]) => ref).sort();
  let processed = 0;
  while (ready.length > 0) {
    const ref = ready.shift()!;
    processed += 1;
    for (const child of children.get(ref) ?? []) {
      const remaining = pending.get(child)! - 1;
      pending.set(child, remaining);
      if (remaining === 0) ready.push(child);
    }
    ready.sort();
  }
  return processed !== causesByRef.size;
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

/** Ids of every event reachable from `id` by following causes, oldest-first. */
export function ancestorsOf(graph: CausalGraph, id: string): readonly string[] {
  const seen = new Set<string>();
  const visit = (current: string): void => {
    for (const parent of graph.parents.get(current) ?? []) {
      if (seen.has(parent)) continue;
      seen.add(parent);
      visit(parent);
    }
  };
  visit(id);
  return Object.freeze(topologicalOrder(graph).map((event) => event.id).filter((eventId) => seen.has(eventId)));
}

/** Ids of every event reachable from `id` by followed-by edges, oldest-first. */
export function descendantsOf(graph: CausalGraph, id: string): readonly string[] {
  const seen = new Set<string>();
  const visit = (current: string): void => {
    for (const child of graph.children.get(current) ?? []) {
      if (seen.has(child)) continue;
      seen.add(child);
      visit(child);
    }
  };
  visit(id);
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
