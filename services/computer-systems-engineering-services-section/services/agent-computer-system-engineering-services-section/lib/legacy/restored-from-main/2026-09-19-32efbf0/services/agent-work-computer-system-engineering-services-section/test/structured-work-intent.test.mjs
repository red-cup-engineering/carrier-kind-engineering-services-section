import assert from "node:assert/strict";
import test from "node:test";
import { assertStructuredWorkIntent } from "../src/structured-work-intent.mjs";

const source = [{ id: "roadmap", kind: "roadmap-cut" }];
const item = (cell, parent) => ({ cell, ...(parent === undefined ? {} : { parent }), text: cell, evidence: ["e"], provenance: [{ source: "roadmap", start: 1, end: 1, unit: "line" }] });

test("a cut may root at an external admitted scope, but every included descendant has its immediate parent", () => {
  const accepted = { kind: "agent-work.structured-intent", id: "cut", producer: { id: "test" }, sources: source, items: [item("project:cut", "endeavor:ops-561-group"), item("plan:cut", "project:cut"), item("task:work", "plan:cut")] };
  assert.equal(assertStructuredWorkIntent(accepted), accepted);
  const refused = { ...accepted, items: [accepted.items[0], item("task:work", "endeavor:ops-561-group")] };
  assert.throws(() => assertStructuredWorkIntent(refused), /immediate parent/u);
});
