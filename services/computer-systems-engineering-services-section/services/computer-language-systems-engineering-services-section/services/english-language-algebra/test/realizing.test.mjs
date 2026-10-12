import test from "node:test";
import assert from "node:assert/strict";
import { frameToClause, realizeClause } from "../src/realizing.mjs";

test("revived English realization conjugates and keeps semantic roles explicit", () => {
  assert.deepEqual(realizeClause({ subject: "the Group", verb: "use", object: "one Actor model" }), { text: "the Group uses the one Actor model", tokens: ["the Group", "uses", "the one Actor model"] });
  assert.equal(realizeClause({ subject: "they", verb: "duplicate", negated: true }).text, "they do not duplicate");
  assert.deepEqual(frameToClause({ agent: "the Group", verb: "use", patient: "one model", instrument: "a schema" }), { subject: "the Group", verb: "use", object: "one model", obliques: [{ prep: "with", object: "a schema" }] });
});
