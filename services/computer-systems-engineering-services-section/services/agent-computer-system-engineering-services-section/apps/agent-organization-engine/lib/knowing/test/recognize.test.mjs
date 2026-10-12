import assert from "node:assert/strict";
import test from "node:test";

import { readRecognition, recognitionCandidate, weightRecognition } from "../src/cognizing/recognize.mjs";

test("recognition ranks sense above remembered sense above learning", () => {
  const reading = readRecognition({ sources: [
    "sky -> green|learning|100",
    "sky -> blue|rememberContexted-sense|10",
    "sky -> grey|sense|1",
  ] });
  assert.deepEqual(reading.ranking.map((entry) => entry.claim), ["grey", "blue", "green"]);
  assert.equal(reading.ranking[0].decision, "recognized");
  assert.equal(reading.ranking[1].decision, "subordinate");
  assert.equal(reading.conflicts[0].rule, "sense-over-learning");
  assert.equal("generatedAt" in reading, false);
});

test("weight-recognition selects the strongest explicitly supplied subject", () => {
  const reading = weightRecognition({
    subject: "tree",
    sources: "tree -> oak|sense|40, tree -> ash|sense|60, river -> north|sense|100",
  });
  assert.equal(reading.selected.claim, "ash");
  assert.deepEqual(new Set(reading.ranking.map((entry) => entry.subject)), new Set(["tree"]));
});

test("recognition candidates accept importable structured values", () => {
  assert.deepEqual(recognitionCandidate({ uri: "bird -> robin", tier: "learning", weight: 52 }), {
    uri: "bird -> robin",
    tier: "learning",
    weight: 52,
  });
});
