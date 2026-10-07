/**
 * viable — Stafford Beer's VIABLE SYSTEM MODEL and the ALGEDONIC CHANNEL (frontier register §4): the
 * cybernetics-margin lens (Cybersyn, the VSM, syntegration).
 *
 * The unimplemented gem is the ALGEDONIC channel — a pain signal that BYPASSES the normal hierarchy and
 * reaches the apex (System 5) directly. In a polity whose ordinary routing follows the observer-category
 * translations, an algedonic alert from a distressed observer jumps straight to a designated apex in one
 * hop, skipping the intermediaries the chain of command would otherwise route through. It is the
 * structural antidote to a captured chain of command (the companion to `coagulationGuard`): when the
 * normal path is long or severed, the pain still gets through.
 *
 * VIABLE RECURSION is Beer's recursion theorem: every viable system is composed of viable systems and
 * embedded in one, and each level must satisfy Ashby's requisite variety to absorb its environment. A
 * recursion is viable iff every level is — variety absorbed at each layer.
 *
 * Reuses the observer-graph edges (`field.mts`) and `requisiteVariety` (`deciding.mts`).
 */
import { comparisonEdges } from "./field.mjs";
import { requisiteVariety } from "./deciding.mjs";

const memberName = (member) =>
  String((member.agent).name ?? "");

/** The shortest hop-distance from `source` to `target` along the (undirected) observer-comparison graph;
 *  Infinity if unreachable. */
function graphDistance(field, source, target) {
  if (source < 0 || target < 0) return Number.POSITIVE_INFINITY;
  if (source === target) return 0;
  const adjacency = field.members.map(() => []);
  for (const [left, right] of comparisonEdges(field.base)) {
    adjacency[left].push(right);
    adjacency[right].push(left);
  }
  const distance = new Array(field.members.length).fill(Number.POSITIVE_INFINITY);
  distance[source] = 0;
  const queue = [source];
  while (queue.length > 0) {
    const node = queue.shift();
    for (const next of adjacency[node]) {
      if (distance[next] === Number.POSITIVE_INFINITY) {
        distance[next] = distance[node] + 1;
        if (next === target) return distance[next];
        queue.push(next);
      }
    }
  }
  return distance[target];
}

/** An algedonic alert: a pain signal routed from a distressed observer straight to the apex. */

  

  

  

/**
 * algedonicAlert — raise a pain signal from a distressed observer directly to the apex, bypassing the
 * observer-category routing. Reports how many intermediaries the direct channel skips, and flags the
 * alert ESSENTIAL when the apex is otherwise unreachable — the structural antidote to a chain of command
 * that has captured or severed the normal path.
 */
export function algedonicAlert(field, from, to) {
  const names = field.members.map(memberName);
  const fromIndex = names.indexOf(from);
  const toIndex = names.indexOf(to);
  const routed = fromIndex >= 0 && toIndex >= 0 && from !== to;
  const normalHops = routed ? graphDistance(field, fromIndex, toIndex) : Number.POSITIVE_INFINITY;
  const reachable = Number.isFinite(normalHops);
  return Object.freeze({
    kind: "socializing.algedonic-alert",
    from,
    to,
    routed,
    normalHops,
    bypassed: routed && reachable ? Math.max(0, normalHops - 1) : 0,
    essential: routed && !reachable,
  });
}

/** One level of a viable-system recursion: its name and the variety it can produce vs must absorb. */

/** The viability of a recursion of nested viable systems. */

/**
 * viableRecursion — Beer's recursion theorem made checkable: a recursion of nested viable systems is
 * viable iff every level satisfies requisite variety (its controller variety ≥ its disturbance variety).
 * A single deficient level breaks the whole, because the unabsorbed variety propagates up the recursion.
 */
export function viableRecursion(levels) {
  const assessed = levels.map((level) => {
    const rv = requisiteVariety(level.controllerVariety, level.disturbanceVariety);
    return { name: level.name, viable: rv.viable, deficit: rv.deficit };
  });
  return Object.freeze({
    kind: "socializing.viable-recursion",
    levels: Object.freeze(assessed),
    viable: assessed.every((level) => level.viable),
  });
}
