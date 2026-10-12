import assert from "node:assert/strict";
import test from "node:test";

import { coverOf } from "../src/host-neutral-carriers.mjs";
import { dependencyGraphH1, topologicalSortDependencyGraph } from "../src/js-mark.mjs";

test("a cover's nerve joins the opens sharing members, and H1 is its cycle rank plus the obstructions", () => {
  const chain = coverOf([
    { id: "a", members: ["a", "shared"], source: "./a" },
    { id: "b", members: ["b", "shared", "pin"] },
    { id: "c", members: ["c", "pin"] },
  ]);
  assert.deepEqual(chain.universe, ["a", "b", "c", "pin", "shared"]);
  assert.deepEqual(chain.nerveEdges, [{ left: "a", right: "b", intersection: ["shared"] }, { left: "b", right: "c", intersection: ["pin"] }]);
  assert.deepEqual([chain.opens[0].source, chain.h1, chain.coordinationFree], ["./a", 0, true]);
  const loop = coverOf([{ id: "a", members: ["x", "y"] }, { id: "b", members: ["y", "z"] }, { id: "c", members: ["z", "x"] }]);
  assert.deepEqual([loop.h1, loop.coordinationFree], [1, false]);
  assert.deepEqual([coverOf([]).h1, coverOf([], { obstructions: 2 }).h1], [0, 2]);
});

test("dependency tiers put providers first, and the dependency graph's H1 counts the dependencies closing a loop", () => {
  const graph = {
    nodes: [{ id: "alone" }, { id: "app" }, { id: "core" }, { id: "lib" }],
    edges: [{ from: "app", to: "core" }, { from: "app", to: "lib" }, { from: "lib", to: "core" }],
  };
  assert.deepEqual(topologicalSortDependencyGraph(graph), [["alone", "core"], ["lib"], ["app"]]);
  assert.equal(dependencyGraphH1(graph), 1);
  assert.equal(dependencyGraphH1({ nodes: graph.nodes, edges: graph.edges.slice(1) }), 0);
});
