import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

import { settle } from "../src/index.mjs";

const exerciseUrl = new URL("../exercises/translation-01.jsonl", import.meta.url);
const exercises = readFileSync(exerciseUrl, "utf8")
  .trim()
  .split(/\r?\n/u)
  .map((line) => JSON.parse(line));

function arc(result, relation) {
  return result.arcs.find((candidate) => candidate.rel === relation);
}

function arcByText(result, relation, headText, depText) {
  return result.arcs.find((candidate) =>
    candidate.rel === relation && candidate.headText === headText && candidate.depText === depText);
}

for (const exercise of exercises) {
  test(`RelConLang translation exercise parses ${exercise.id}`, () => {
    const result = settle(exercise.answer);
    assert.equal(arc(result, "nsubj")?.depText, exercise.expect.nsubj);
    if (exercise.expect.dobj !== undefined) {
      assert.equal(arc(result, "dobj")?.depText, exercise.expect.dobj);
    }
    for (const discourse of exercise.expect.discourse ?? []) {
      assert.ok(arcByText(result, "discourse", discourse.head, discourse.dep));
    }
    for (const oblique of exercise.expect.obliques ?? []) {
      assert.ok(arcByText(result, "obl", oblique.head, oblique.dep));
      assert.ok(arcByText(result, "case", oblique.dep, oblique.case));
    }
    for (const information of exercise.expect.information ?? []) {
      assert.ok(arcByText(result, information.rel, information.head, information.dep));
      assert.ok(arcByText(result, "mark", information.dep, information.mark));
    }
    if (exercise.expect.ccomp !== undefined) {
      assert.ok(arcByText(result, "ccomp", exercise.expect.ccomp.head, exercise.expect.ccomp.dep));
      assert.ok(arcByText(result, "mark", exercise.expect.ccomp.dep, exercise.expect.ccomp.mark));
    }
    if (exercise.expect.embedded !== undefined) {
      assert.ok(arcByText(result, "nsubj", exercise.expect.ccomp.dep, exercise.expect.embedded.nsubj));
      assert.ok(arcByText(result, "dobj", exercise.expect.ccomp.dep, exercise.expect.embedded.dobj));
    }
    if (exercise.expect.verb !== undefined) {
      const parsedVerb = result.words.find((candidate) => candidate.text === exercise.expect.verb);
      assert.ok(parsedVerb, `${exercise.expect.verb} should be tokenized`);
      assert.ok(parsedVerb.tags.includes("verb"), `${exercise.expect.verb} should be tagged as a verb`);
      for (const feature of exercise.expect.verbFeatures ?? []) {
        assert.ok(parsedVerb.feats.includes(feature), `${exercise.expect.verb} should include ${feature}`);
      }
    }
  });
}
