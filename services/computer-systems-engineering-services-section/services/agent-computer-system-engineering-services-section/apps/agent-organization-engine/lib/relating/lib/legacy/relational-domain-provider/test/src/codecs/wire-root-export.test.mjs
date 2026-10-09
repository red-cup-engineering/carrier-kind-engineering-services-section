import test from "node:test";
import assert from "node:assert/strict";
import { define, restrict, transcode } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";

test("writing is the established typed-resource projection seam", () => {
  const root = define({ type: "text", corner: "data", rung: "identity", recognize: () => true, read: (resource) => [resource.content], write: (items) => items.join("") });
  const child = restrict(root, { type: "upper", recognize: () => true, read: (resource) => [resource.content.toUpperCase()], write: (items) => items.join("").toUpperCase() });
  assert.equal(transcode(root, child, { content: "word" }), "WORD");
});
