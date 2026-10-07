import test from "node:test";
import assert from "node:assert/strict";
import {
  realizeSection,
  sectionFromText,
  model,
} from "../../../src/speaking/generating/index.mjs";

import { knowledgeJoin, witnessedReading } from "@red-cup-engineering/signchain/bilattice";
const TRUE = witnessedReading("potential", "true-witness");
const FALSE = witnessedReading("active", "false-witness");
const BOTTOM = witnessedReading("absurd", "bottom-witness"); // absurd = (0,0): no side told, witness unused
const TOP = knowledgeJoin(TRUE, FALSE);

test("settled section realization honors all four bilattice regimes", () => {
  const out = realizeSection({
    subject: "dog",
    cells: [
      { predicate: "chase", object: "cat", evidence: TRUE, tense: "past" },
      { predicate: "eat", object: "cake", evidence: FALSE, tense: "past" },
      { predicate: "find", object: "bone", evidence: BOTTOM, tense: "past" },
      { predicate: "guard", object: "yard", evidence: TOP, tense: "present" },
    ],
  });
  assert.match(out.prose, /The dog chased the cat\./);
  assert.match(out.prose, /The dog did not eat the cake\./);
  assert.doesNotMatch(out.prose, /bone/);
  assert.equal(out.dropped.length, 1);
  assert.equal(out.audit.length, 1);
  assert.equal(out.why(0)?.cell.predicate, "guard");
});

test("sectionFromText bridges language-parsing parses into language-generation sections", () => {
  const section = sectionFromText("The dog chased the cat.");
  assert.equal(section.subject, "dog");
  assert.equal(section.cells[0]?.predicate, "chase");
  assert.equal(section.cells[0]?.object, "cat");
  assert.equal(realizeSection(section).prose, "The dog chased the cat.");
});

test("settling model is append-only and predicts without forgetting", () => {
  const first = model("a b", "one");
  const second = first.ingest("a c", "two");
  assert.equal(first.assertions.length, 1);
  assert.equal(second.assertions.length, 2);
  const tokens = new Set(second.predict("a").map((p) => p.token));
  assert.ok(tokens.has("b"));
  assert.ok(tokens.has("c"));
});
