import assert from "node:assert/strict";
import test from "node:test";

import { evidenceCensus, joinedReading, renderingsOf, segmentEvidence } from "../src/translation-evidence.mjs";

const RULE = { id: "bare-title-address", pattern: "\\bMr\\.? (?:CEO|Chairman)\\b", message: "bare title" };

test("a gloss's accepted English forms", () => {
  assert.deepEqual(renderingsOf("Madam (the family matriarch)"), ["Madam"]);
  assert.deepEqual(renderingsOf("Madam; Mrs. <surname>"), ["Madam"]);
  assert.deepEqual(renderingsOf("whirlwind marriage"), ["whirlwind marriage"]);
});

test("a line with every check passing reads held", () => {
  const evidence = segmentEvidence({ source: "少爷，老夫人让您回家吃饭。", english: "Young Master, Madam wants you home for dinner.", terms: [{ source: "少爷", target: "Young Master" }, { source: "老夫人", target: "Madam (the family matriarch)" }] });
  assert.equal(evidence.reading, "held");
  assert.deepEqual(evidence.for.map((witness) => witness.check), ["glossary", "glossary", "untranslated"]);
});

test("a line told both ways reads contested, and the witnesses against say why", () => {
  const evidence = segmentEvidence({ source: "总裁，您的咖啡。", english: "Mr. CEO, your 咖啡.", terms: [{ source: "总裁", target: "CEO" }], rules: [RULE] });
  assert.equal(evidence.reading, "contested");
  assert.deepEqual(evidence.against.map((witness) => witness.check), ["untranslated", "rule"]);
  assert.equal(evidence.against[0].characters, "咖啡");
});

test("a subtitle cue is measured against its width and reading speed", () => {
  const cue = { start: 0, end: 1000, lines: ["This line is far too long to read in one second on a phone"] };
  const evidence = segmentEvidence({ source: "你好", english: cue.lines[0], cue, lineWidth: 42 });
  assert.equal(evidence.against[0].check, "fit");
  assert.ok(evidence.against[0].charactersPerSecond > 20);
});

test("the first term for a source wins, so the buyer's glossary and memory override the module's", () => {
  const evidence = segmentEvidence({ source: "顾总裁", english: "President Gu", terms: [{ source: "总裁", target: "President" }, { source: "总裁", target: "CEO" }] });
  assert.equal(evidence.reading, "held");
  assert.equal(evidence.for[0].expected, "President");
});

test("a response's reading is the knowledge join of its lines", () => {
  const held = { for: [{}], against: [], reading: "held" };
  const denied = { for: [], against: [{ check: "untranslated" }], reading: "denied" };
  assert.equal(joinedReading([held, held]), "held");
  assert.equal(joinedReading([held, denied]), "contested");
  assert.deepEqual(evidenceCensus([held, denied]), { readings: { unknown: 0, held: 1, denied: 1, contested: 0 }, against: { untranslated: 1 } });
});

test("a form of address is rendered by an English address as well as by its gloss", () => {
  const term = { source: "总裁", target: "CEO", kind: "form-of-address" };
  assert.equal(segmentEvidence({ source: "顾总裁，您的咖啡。", english: "Mr. Gu, your coffee.", terms: [term] }).reading, "held");
  assert.equal(segmentEvidence({ source: "总裁，您的咖啡。", english: "Sir, your coffee.", terms: [term] }).reading, "held");
  assert.equal(segmentEvidence({ source: "总裁，您的咖啡。", english: "Boss, your coffee.", terms: [term] }).reading, "contested");
});
