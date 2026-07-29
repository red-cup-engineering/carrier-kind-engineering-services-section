import assert from "node:assert/strict";
import test from "node:test";
import { projectSvg, svgProjector } from "../dist/xml/svg/index.mjs";

test("projects and recognizes an SVG flatfile", () => {
  const content = projectSvg({ width: 10, height: 10, nodes: [], edges: [] });
  assert.match(content, /<svg/);
  assert.equal(svgProjector.recognize({ path: "proof.svg", content }), true);
});
