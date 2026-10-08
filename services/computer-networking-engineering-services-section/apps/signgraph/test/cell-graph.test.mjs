import test from "node:test";
import assert from "node:assert/strict";
import { samePoint } from "@red-cup-engineering/computer-data-services-section/four";
import { cell } from "@red-cup-engineering/signcell/cell";
import { at, transpose } from "@red-cup-engineering/metrologic/chu";
import { cellGraph } from "../src/cell-graph.mjs";

const cellOf = (subject, predicate, object) => cell(subject, predicate, object);

test("cellGraph: a cell reads present at an observation that names it, absent otherwise", () => {
  const a = cellOf("alice", "knows", "bob");
  const b = cellOf("bob", "knows", "carol");
  const graph = cellGraph([a, b], [
    { name: "subject-is-alice", evaluate: (c) => (c.subject === "alice" ? "potential" : "active") },
  ]);
  assert.ok(samePoint(at(graph, a, "subject-is-alice"), "potential"));
  assert.ok(samePoint(at(graph, b, "subject-is-alice"), "active"));
});

test("cellGraph: transpose swaps points and states, preserving the value at the swapped coordinate", () => {
  const a = cellOf("alice", "knows", "bob");
  const graph = cellGraph([a], [
    { name: "always-potential", evaluate: () => "potential" },
  ]);
  const flipped = transpose(graph);
  assert.ok(samePoint(at(flipped, "always-potential", a), "potential"));
});
