import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { makeCell } from "../src/kernel/cells.mjs";
import { FOUR } from "../src/kernel/four.mjs";
import {
  buildStore, cellsAt, holds, inEdges, outEdges, loadSystem, relationMap, subjectsWith, value,
} from "../src/kernel/store.mjs";

const CORPUS_ROOT = fileURLToPath(new URL("../../../lib/conformance/fixture-corpus", import.meta.url));
const EXPECTED_PATH = fileURLToPath(new URL("../../../lib/conformance/store-expected.json", import.meta.url));
const JS_SIDE_PATH = fileURLToPath(new URL("../../../lib/conformance/store-expected.js-side.json", import.meta.url));

function tripleOf(cell) {
  return [cell.subject, cell.predicate, cell.object];
}

function sortTriples(triples) {
  return [...triples].sort((a, b) => a.join("|").localeCompare(b.join("|")));
}

// Normalizes a subject/slug-keyed map of triple lists to a sorted,
// order-independent shape: sorted keys, each value a sorted list of
// "predicate|object" (or "subject|predicate") pair strings so array order
// never participates in the comparison, only membership.
function normalizeTripleMap(map, pick) {
  const out = {};
  for (const key of Object.keys(map).sort()) {
    out[key] = map[key].map((t) => pick(Array.isArray(t) ? t : tripleOf(t))).sort();
  }
  return out;
}

function normalizeStringMap(map) {
  const out = {};
  for (const key of Object.keys(map).sort()) out[key] = [...map[key]].sort();
  return out;
}

test("buildStore folds repeated triples via knowledge-join instead of overwriting", () => {
  const cells = [
    makeCell({ subject: "a", predicate: "p", object: "b" }),
    makeCell({ subject: "a", predicate: "p", object: "b" }),
  ];
  const store = buildStore(cells);
  assert.equal(store.order.length, 1);
  assert.deepEqual(value(store, "a", "p", "b"), FOUR.true);
  assert.equal(holds(store, "a", "p", "b"), true);
});

test("value defaults to NEITHER and holds is false for an absent triple", () => {
  const store = buildStore([]);
  assert.deepEqual(value(store, "a", "p", "b"), FOUR.neither);
  assert.equal(holds(store, "a", "p", "b"), false);
});

test("relationMap rejects a direction other than subject-keyed/object-keyed", () => {
  const store = buildStore([makeCell({ subject: "a", predicate: "p", object: "b" })]);
  assert.throws(() => relationMap(store, "p", { direction: "sideways" }));
});

test("loadSystem's query surface reproduces the shared conformance vector", async () => {
  const { system, diagnostics } = await loadSystem(CORPUS_ROOT);
  assert.deepEqual(diagnostics, []);

  const cellRows = sortTriples(system.order.map(tripleOf)).map(([subject, predicate, object]) => {
    const v = value(system, subject, predicate, object);
    return { subject, predicate, object, pos: v.positiveEvidence, neg: v.negativeEvidence };
  });

  const subjects = [...new Set(system.order.map((c) => c.subject))];
  const objects = [...new Set(system.order.map((c) => c.object))];
  const predicates = [...new Set(system.order.map((c) => c.predicate))];

  const queries = {
    cells_at: normalizeTripleMap(
      Object.fromEntries(subjects.map((s) => [s, cellsAt(system, s)])),
      (t) => t.join("|")
    ),
    subjects_with: normalizeStringMap(
      Object.fromEntries(
        system.order.map((c) => [`${c.predicate}|${c.object}`, [...subjectsWith(system, c.predicate, c.object)]])
      )
    ),
    in_edges: normalizeTripleMap(
      Object.fromEntries(objects.map((o) => [o, inEdges(system, o)])),
      (t) => t.join("|")
    ),
    out_edges: normalizeTripleMap(
      Object.fromEntries(subjects.map((s) => [s, outEdges(system, s)])),
      (t) => t.join("|")
    ),
    relation_map_subject_keyed: Object.fromEntries(
      predicates.map((p) => [p, normalizeStringMap(relationMap(system, p))])
    ),
    relation_map_object_keyed: Object.fromEntries(
      predicates.map((p) => [p, normalizeStringMap(relationMap(system, p, { direction: "object-keyed" }))])
    ),
  };

  const absentTriple = { subject: "alpha", predicate: "depends-on", object: "beta" };
  const absentValue = value(system, absentTriple.subject, absentTriple.predicate, absentTriple.object);
  const absentHolds = holds(system, absentTriple.subject, absentTriple.predicate, absentTriple.object);

  if (existsSync(EXPECTED_PATH)) {
    const expected = JSON.parse(readFileSync(EXPECTED_PATH, "utf8"));
    assert.deepEqual(cellRows, expected.cells);
    assert.equal(absentValue.positiveEvidence, expected.absent_triple.value.pos);
    assert.equal(absentValue.negativeEvidence, expected.absent_triple.value.neg);
    assert.equal(absentHolds, expected.absent_triple.holds);

    const wantCellsAt = normalizeTripleMap(expected.queries.cells_at, (t) => t.join("|"));
    const wantInEdges = normalizeTripleMap(expected.queries.in_edges, (t) => t.join("|"));
    const wantOutEdges = normalizeTripleMap(expected.queries.out_edges, (t) => t.join("|"));
    assert.deepEqual(queries.cells_at, wantCellsAt);
    assert.deepEqual(queries.subjects_with, normalizeStringMap(expected.queries.subjects_with));
    assert.deepEqual(queries.in_edges, wantInEdges);
    assert.deepEqual(queries.out_edges, wantOutEdges);
    for (const [predicate, expectedMap] of Object.entries(expected.queries.relation_map_subject_keyed)) {
      assert.deepEqual(queries.relation_map_subject_keyed[predicate], normalizeStringMap(expectedMap));
    }
    for (const [predicate, expectedMap] of Object.entries(expected.queries.relation_map_object_keyed)) {
      assert.deepEqual(queries.relation_map_object_keyed[predicate], normalizeStringMap(expectedMap));
    }
  } else {
    const jsSide = {
      description: "js-side computation of the store conformance vector, written because store-expected.json did not yet exist when this suite ran.",
      cells: cellRows,
      absent_triple: {
        ...absentTriple,
        value: { pos: absentValue.positiveEvidence, neg: absentValue.negativeEvidence },
        holds: absentHolds,
      },
      queries,
    };
    writeFileSync(JS_SIDE_PATH, `${JSON.stringify(jsSide, null, 2)}\n`);
  }
});
