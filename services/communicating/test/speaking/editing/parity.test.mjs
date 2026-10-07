import test from "node:test";
import assert from "node:assert/strict";
import {
  detect,
  report,
  stripMarkdown,
  allRules,
  contractionRules,
  abstractRules,
} from "../../../src/speaking/editing/index.mjs";

import { knowledgeReading } from "@red-cup-engineering/signcell/cell";
test("rule implication closure reports abstract parent predicates", () => {
  const diagnostics = report(detect("We utilize the implementation.", { markdown: false }));
  const ids = new Set(diagnostics.map((d) => d.ruleId));
  assert.ok(ids.has("jargon-utilize"));
  assert.ok(ids.has("nominalization-implementation"));
  assert.ok(ids.has("is-concise"));
  assert.ok(ids.has("reads-clearly"));
});

test("grammar-relevant passive detection covers irregular participles with by-phrases", () => {
  const diagnostics = report(detect("The cake was eaten by children.", { markdown: false }));
  const passive = diagnostics.find((d) => d.ruleId === "passive-voice");
  assert.ok(passive);
  assert.match(passive.suggest ?? "", /children eaten/);
});

test("opposed register rules surface parent-level conflict when requested", () => {
  const diagnostics = report(detect("We can't go.", {
    markdown: false,
    rules: [...contractionRules, ...abstractRules],
  }));
  const conflict = diagnostics.find((d) => d.ruleId === "register-consistent");
  assert.equal(conflict?.severity, "conflict");
});

test("markdown stripping preserves offsets by replacing markup with spaces", () => {
  const source = "Use `utilize` here.";
  const stripped = stripMarkdown(source);
  assert.equal(stripped.length, source.length);
  assert.equal(stripped.slice(4, 13), "         ");
});

test("markdown stripping keeps link text and masks code text at stable offsets", () => {
  const source = "We [utilize](https://example.test) this.\n\n```js\nvery\n```";
  const stripped = stripMarkdown(source);
  assert.equal(stripped.length, source.length);
  assert.ok(stripped.includes("utilize"));
  assert.ok(!stripped.includes("example.test"));
  assert.ok(!stripped.includes("very"));

  const diagnostics = report(detect(source, { markdown: true }));
  const ids = new Set(diagnostics.map((d) => d.ruleId));
  assert.ok(ids.has("jargon-utilize"));
  assert.ok(!ids.has("weasel-very"));
});

test("detect exposes the articulated base and positive compliance cells", () => {
  const result = detect("The river rose fast.", { markdown: false });
  assert.ok(result.base.spans.some((span) => span.tier === "word" && span.text === "river"));
  const cell = result.cells.find((candidate) => candidate.ruleId === "one-idea-per-sentence");
  assert.ok(cell !== undefined && (knowledgeReading(cell.evidence) === "potential" || knowledgeReading(cell.evidence) === "stable"));
});

test("default rule set keeps a calm informal register", () => {
  const ids = new Set(allRules.map((r) => r.id));
  assert.ok(ids.has("prefer-contractions"));
  assert.ok(!ids.has("avoid-contractions"));
});
