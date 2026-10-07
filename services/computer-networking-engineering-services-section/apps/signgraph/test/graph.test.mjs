import assert from "node:assert/strict";
import test from "node:test";
import { projectSignGraphTopology } from "../src/graph.mjs";

test("semantic graph topology projection keeps addressed witness data", () => {
  const projected = projectSignGraphTopology({
    cells: [{ id: "ni:cell", kind: "sign.cell", type: "test.cell" }],
    edges: [{ id: "ni:edge", edge: { subject: { id: "ni:cell" }, predicate: "supports", object: { id: "ni:cell" }, witness: { id: "ni:witness" } } }],
  });
  assert.deepEqual(projected.nodes(), [{ id: "ni:cell", data: { kind: "sign.cell", type: "test.cell" } }]);
  assert.deepEqual(projected.edges(), [{ from: "ni:cell", to: "ni:cell", kind: "supports", data: { id: "ni:edge", witness: "ni:witness" } }]);
});
