import assert from "node:assert/strict";
import test from "node:test";
import { graphDiagramSvg as computingGraphDiagramSvg } from "@red-cup-engineering/computing/diagramming";
import { graphDiagramSvg as organizingGraphDiagramSvg } from "@red-cup-engineering/computing/diagramming";

test("diagramming re-exports Computing's public graph projection", () => {
  assert.strictEqual(organizingGraphDiagramSvg, computingGraphDiagramSvg);
  assert.match(organizingGraphDiagramSvg({
    nodes: [{ id: "source", label: "Source" }, { id: "target", label: "Target" }],
    edges: [{ from: "source", to: "target" }],
  }), /<svg/);
});
