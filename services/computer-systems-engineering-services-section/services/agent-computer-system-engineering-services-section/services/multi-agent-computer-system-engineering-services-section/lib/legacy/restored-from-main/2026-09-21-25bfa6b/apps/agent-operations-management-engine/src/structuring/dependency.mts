/**
 * dependency — the precedence relation between tasks.
 *
 * A dependency is a directed edge `predecessor → successor` carrying one of the
 * four classical precedence types (finish-to-start, start-to-start,
 * finish-to-finish, start-to-finish) and an optional lag. The dependency graph
 * is the substrate the schedule's critical-path pass walks, so this module also
 * provides the order operations that pass needs: cycle detection and a
 * topological order, both pure over the edge set.
 */

import type { CellSet } from "@lenticule-science/metrologic/articulation/predicating";
import { fact, facts, predicate, term } from "../terms.mjs";

/** The four classical precedence types. */
export type PrecedenceType = "finish-to-start" | "start-to-start" | "finish-to-finish" | "start-to-finish";

/** A precedence edge between two task keys. */
export interface Dependency {
  readonly kind: "managing.dependency";
  readonly predecessor: string;
  readonly successor: string;
  readonly type: PrecedenceType;
  /** Lag in whole days (may be negative for lead). */
  readonly lag: number;
  readonly facts: CellSet;
}

/** Construct a dependency edge. Defaults to finish-to-start with zero lag — the
 *  Asana/MS-Project default. */
export function dependency(input: {
  readonly predecessor: string;
  readonly successor: string;
  readonly type?: PrecedenceType;
  readonly lag?: number;
}): Dependency {
  const type = input.type ?? "finish-to-start";
  const lag = input.lag ?? 0;
  const edge = term("dependency", input.predecessor, input.successor);
  return Object.freeze({
    kind: "managing.dependency" as const,
    predecessor: input.predecessor,
    successor: input.successor,
    type,
    lag,
    facts: facts([
      fact(edge, predicate("dependency", "predecessor"), term("task", input.predecessor)),
      fact(edge, predicate("dependency", "successor"), term("task", input.successor)),
      fact(edge, predicate("dependency", "type"), term("precedence", type)),
      fact(edge, predicate("dependency", "lag"), term("lag", lag)),
    ]),
  });
}

/** Adjacency: predecessor key → successor keys. */
export function adjacency(deps: readonly Dependency[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const d of deps) {
    const list = out.get(d.predecessor) ?? [];
    list.push(d.successor);
    out.set(d.predecessor, list);
  }
  return out;
}

/** The set of task keys mentioned by any edge. */
export function nodesOf(deps: readonly Dependency[]): string[] {
  const seen = new Set<string>();
  for (const d of deps) {
    seen.add(d.predecessor);
    seen.add(d.successor);
  }
  return [...seen];
}

/** A cycle in the dependency graph as the ordered keys on the cycle, or null
 *  when the graph is acyclic. A dependency cycle is an operational defect — work
 *  that can never start — so this is the validity check a plan must pass. */
export function findCycle(deps: readonly Dependency[]): readonly string[] | null {
  const adj = adjacency(deps);
  const state = new Map<string, 0 | 1 | 2>(); // 0 unseen, 1 on-stack, 2 done
  const stack: string[] = [];

  function visit(node: string): readonly string[] | null {
    state.set(node, 1);
    stack.push(node);
    for (const next of adj.get(node) ?? []) {
      const s = state.get(next) ?? 0;
      if (s === 1) {
        const from = stack.indexOf(next);
        return Object.freeze([...stack.slice(from), next]);
      }
      if (s === 0) {
        const cycle = visit(next);
        if (cycle !== null) return cycle;
      }
    }
    stack.pop();
    state.set(node, 2);
    return null;
  }

  for (const node of nodesOf(deps)) {
    if ((state.get(node) ?? 0) === 0) {
      const cycle = visit(node);
      if (cycle !== null) return cycle;
    }
  }
  return null;
}

/** A topological order of the given task keys consistent with the dependency
 *  edges (Kahn's algorithm). Keys with no edges are included. Throws when the
 *  graph has a cycle — callers should `findCycle` first to diagnose. */
export function topologicalOrder(keys: readonly string[], deps: readonly Dependency[]): string[] {
  const indegree = new Map<string, number>();
  for (const k of keys) indegree.set(k, 0);
  const adj = adjacency(deps);
  for (const d of deps) {
    if (!indegree.has(d.successor)) indegree.set(d.successor, 0);
    if (!indegree.has(d.predecessor)) indegree.set(d.predecessor, 0);
    indegree.set(d.successor, (indegree.get(d.successor) ?? 0) + 1);
  }
  const queue = [...indegree.entries()].filter(([, n]) => n === 0).map(([k]) => k).sort();
  const order: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift() as string;
    order.push(node);
    const nexts = [...(adj.get(node) ?? [])].sort();
    for (const next of nexts) {
      const n = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, n);
      if (n === 0) queue.push(next);
    }
  }
  if (order.length !== indegree.size) {
    throw new Error("managing-operations: dependency graph has a cycle; topological order undefined");
  }
  return order;
}
