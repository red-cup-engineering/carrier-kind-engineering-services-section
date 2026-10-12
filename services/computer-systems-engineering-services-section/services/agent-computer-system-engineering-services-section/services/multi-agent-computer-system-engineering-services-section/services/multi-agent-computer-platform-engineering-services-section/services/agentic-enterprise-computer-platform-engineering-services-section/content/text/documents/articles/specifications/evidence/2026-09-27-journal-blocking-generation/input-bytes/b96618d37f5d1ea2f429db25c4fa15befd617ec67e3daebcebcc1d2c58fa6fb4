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
 *
 * The causal order is the transitive closure of `causes` (MetroPlat architecture, 5.6); this module
 * computes it from the cause maps themselves, as the journal's own law beneath metrologic.
 */

/** Detect a cycle without inventing an order for spacelike witnesses. */
export function causalGraphHasCycle(entries) {
  const refs = new Set(entries.map((entry) => entry.ref));
  const pending = new Map();
  const effects = new Map();
  for (const ref of refs) pending.set(ref, 0);
  for (const entry of entries) {
    for (const cause of new Set(entry.causes)) {
      if (!refs.has(cause)) continue;
      pending.set(entry.ref, pending.get(entry.ref) + 1);
      effects.set(cause, [...(effects.get(cause) ?? []), entry.ref]);
    }
  }
  const ready = [...pending].filter(([, count]) => count === 0).map(([ref]) => ref);
  let placed = 0;
  while (ready.length > 0) {
    const ref = ready.pop();
    placed += 1;
    for (const effect of effects.get(ref) ?? []) {
      const remaining = pending.get(effect) - 1;
      pending.set(effect, remaining);
      if (remaining === 0) ready.push(effect);
    }
  }
  return placed !== refs.size;
}

export function causalGraphOf(events) {
  const byId = new Map();
  for (const event of events) byId.set(event.id, event);
  const parents = new Map();
  const children = new Map();
  const externalCauses = new Set();
  for (const event of byId.values()) {
    const present = [];
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
  const roots = [];
  const heads = [];
  for (const id of byId.keys()) {
    if ((parents.get(id) ?? []).length === 0) roots.push(id);
    if ((children.get(id) ?? []).length === 0) heads.push(id);
  }
  const frozenChildren = new Map();
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

/** Every id reachable from `start` along one of the graph's edge maps, `start` itself excluded. */
function reachableAlong(edges, start) {
  const seen = new Set();
  const frontier = [start];
  while (frontier.length > 0) {
    for (const next of edges.get(frontier.pop()) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      frontier.push(next);
    }
  }
  return seen;
}

/** Ids of every event reachable from `id` by following causes, oldest-first. */
export function ancestorsOf(graph, id) {
  const seen = reachableAlong(graph.parents, id);
  return Object.freeze(topologicalOrder(graph).map((event) => event.id).filter((eventId) => seen.has(eventId)));
}

/** Ids of every event reachable from `id` by followed-by edges, oldest-first. */
export function descendantsOf(graph, id) {
  const seen = reachableAlong(graph.children, id);
  return Object.freeze(topologicalOrder(graph).map((event) => event.id).filter((eventId) => seen.has(eventId)));
}

/**
 * All slice events in an order where every cause precedes its effects.
 * Spacelike ties break only by exact event id, so wall time never becomes a
 * causal order. Throws if the slice contains a causal cycle, which the store
 * refuses at admission — seeing one here means the journal was edited
 * outside the store.
 */
export function topologicalOrder(graph) {
  const pending = new Map();
  for (const [id, list] of graph.parents) pending.set(id, list.length);
  const byId = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const ready = [...pending.keys()].filter((id) => pending.get(id) === 0).sort(byId);
  const order = [];
  while (ready.length > 0) {
    const id = ready.shift();
    order.push(graph.events.get(id));
    const unlocked = [];
    for (const child of graph.children.get(id) ?? []) {
      const remaining = pending.get(child) - 1;
      pending.set(child, remaining);
      if (remaining === 0) unlocked.push(child);
    }
    unlocked.sort(byId);
    let at = 0;
    for (const next of unlocked) {
      while (at < ready.length && byId(ready[at], next) < 0) at += 1;
      ready.splice(at, 0, next);
    }
  }
  if (order.length !== graph.events.size) {
    throw new TypeError("causal event graph contains a cycle; the journal was modified outside the store");
  }
  return Object.freeze(order);
}
