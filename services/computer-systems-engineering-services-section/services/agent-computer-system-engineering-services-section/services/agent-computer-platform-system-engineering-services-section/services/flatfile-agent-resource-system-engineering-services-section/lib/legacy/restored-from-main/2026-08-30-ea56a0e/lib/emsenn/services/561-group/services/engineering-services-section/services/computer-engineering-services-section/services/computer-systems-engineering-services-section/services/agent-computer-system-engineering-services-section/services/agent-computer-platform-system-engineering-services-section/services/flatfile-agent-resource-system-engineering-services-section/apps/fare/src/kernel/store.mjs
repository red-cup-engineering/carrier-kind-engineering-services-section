import { loadCells } from "./cells.mjs";
import { FOUR, joinKnowledge } from "./four.mjs";

function cellKey(subject, predicate, object) {
  return JSON.stringify([subject, predicate, object]);
}

// A System is a query handle over a knowledge state: a map from
// (subject, predicate, object) to its folded FOUR value, plus the cells
// in first-seen order for deterministic iteration. A cell's mere presence
// on Tier A content is positive evidence for its triple — two edges
// asserting the same triple (e.g. from both fm and body) join their
// evidence at that one cell rather than one silently shadowing the other.
export function buildStore(cells) {
  const values = new Map();
  const order = [];
  for (const cell of cells) {
    const key = cellKey(cell.subject, cell.predicate, cell.object);
    if (!values.has(key)) order.push(cell);
    values.set(key, joinKnowledge(values.get(key) ?? FOUR.neither, FOUR.true));
  }
  return Object.freeze({ values, order: Object.freeze(order) });
}

// Walks root, derives its PredicationCells, and folds them into a System.
export async function loadSystem(root, options = {}) {
  const { cells, diagnostics } = await loadCells(root, options);
  return { system: buildStore(cells), diagnostics };
}

export function value(store, subject, predicate, object) {
  return store.values.get(cellKey(subject, predicate, object)) ?? FOUR.neither;
}

export function holds(store, subject, predicate, object) {
  const v = value(store, subject, predicate, object);
  return v.positiveEvidence && !v.negativeEvidence;
}

// Every query below treats T (holds) as load-bearing — cells whose folded
// value is F or TOP are excluded from positive queries, matching the
// Python System contract's t_cells discipline.
function tCells(store) {
  return store.order.filter((cell) => holds(store, cell.subject, cell.predicate, cell.object));
}

export function cellsAt(store, subject) {
  return tCells(store).filter((cell) => cell.subject === subject);
}

export function subjectsWith(store, predicate, object) {
  const out = new Set();
  for (const cell of tCells(store)) {
    if (cell.predicate === predicate && cell.object === object) out.add(cell.subject);
  }
  return out;
}

export function inEdges(store, slug, { predicates = null } = {}) {
  const predicateSet = predicates === null ? null : new Set(predicates);
  return tCells(store).filter(
    (cell) => cell.object === slug && (predicateSet === null || predicateSet.has(cell.predicate))
  );
}

export function outEdges(store, slug, { predicates = null } = {}) {
  const predicateSet = predicates === null ? null : new Set(predicates);
  return tCells(store).filter(
    (cell) => cell.subject === slug && (predicateSet === null || predicateSet.has(cell.predicate))
  );
}

// Typed-relation graph as a plain object. "subject-keyed" gives each
// subject its list of objects (depends_on[slug] semantics); "object-keyed"
// gives the reverse (dependents[slug]).
export function relationMap(store, predicate, { direction = "subject-keyed" } = {}) {
  if (direction !== "subject-keyed" && direction !== "object-keyed") {
    throw new Error(`direction must be "subject-keyed" or "object-keyed"; got ${direction}`);
  }
  const out = {};
  for (const cell of tCells(store)) {
    if (cell.predicate !== predicate) continue;
    const [key, item] = direction === "subject-keyed" ? [cell.subject, cell.object] : [cell.object, cell.subject];
    (out[key] ??= []).push(item);
  }
  return out;
}
