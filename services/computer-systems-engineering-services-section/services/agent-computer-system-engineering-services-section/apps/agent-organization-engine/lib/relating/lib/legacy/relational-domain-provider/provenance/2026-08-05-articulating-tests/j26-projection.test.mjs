import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { gyrobifastigiumJ26 } from "../dist/lib/articulating/predicating/geometry/spatial/gyrobifastigium-j26.mjs";

test("the browser-ready J26 projection matches the Lean incidence declaration", async () => {
  const lean = await readFile(new URL("../../../lib/obsmetrologia/Obsmetrologia/AperiodicOrder/Tiling/J26.lean", import.meta.url), "utf8");
  assert.equal(Object.keys(gyrobifastigiumJ26.vertices).length, 8);
  assert.equal(gyrobifastigiumJ26.faces.length, 8);
  assert.deepEqual(gyrobifastigiumJ26.faces.map(({ vertices }) => vertices.length), [3, 3, 4, 4, 3, 3, 4, 4]);
  for (const { name, vertices } of gyrobifastigiumJ26.faces) {
    assert.match(lean, new RegExp(`\\| \\.${name}\\s+=> \\[${vertices.map((vertex) => `\\.${vertex}`).join(", ") }\\]`, "u"));
  }
  const edges = new Set(gyrobifastigiumJ26.faces.flatMap(({ vertices }) => vertices.map((vertex, index) => [vertex, vertices[(index + 1) % vertices.length]].sort().join(":"))));
  assert.equal(edges.size, 14);
  assert.match(lean, /vertices\.length = 8 ∧ edges\.length = 14 ∧ faces\.length = 8/u);
});
