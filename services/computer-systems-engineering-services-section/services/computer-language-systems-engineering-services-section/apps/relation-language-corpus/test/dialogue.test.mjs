import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

import { settle } from "../src/index.mjs";

const dialogueUrl = new URL("../corpus/dialogue-samples.jsonl", import.meta.url);
const dialogues = readFileSync(dialogueUrl, "utf8")
  .trim()
  .split(/\r?\n/u)
  .map((line) => JSON.parse(line));

const allowedPairs = new Map([
  ["question-answer", ["question", "answer"]],
  ["question-repair", ["question", "repair"]],
  ["request-acknowledgement", ["request", "acknowledgement"]],
  ["answer-acknowledgement", ["answer", "acknowledgement"]],
  ["repair-acknowledgement", ["repair", "acknowledgement"]],
]);

function arc(result, relation) {
  return result.arcs.find((candidate) => candidate.rel === relation);
}

function arcByText(result, relation, headText, depText) {
  return result.arcs.find((candidate) =>
    candidate.rel === relation && candidate.headText === headText && candidate.depText === depText);
}

function assertParsedExpectation(result, expect) {
  assert.equal(arc(result, "nsubj")?.depText, expect.nsubj);
  if (expect.dobj !== undefined) {
    assert.equal(arc(result, "dobj")?.depText, expect.dobj);
  }
  if (expect.ccomp !== undefined) {
    assert.ok(arcByText(result, "ccomp", expect.ccomp.head, expect.ccomp.dep));
    assert.ok(arcByText(result, "mark", expect.ccomp.dep, expect.ccomp.mark));
  }
  if (expect.embedded !== undefined) {
    assert.ok(arcByText(result, "nsubj", expect.ccomp.dep, expect.embedded.nsubj));
    assert.ok(arcByText(result, "dobj", expect.ccomp.dep, expect.embedded.dobj));
  }
  for (const discourse of expect.discourse ?? []) {
    assert.ok(arcByText(result, "discourse", discourse.head, discourse.dep));
  }
  if (expect.verb !== undefined) {
    const parsedVerb = result.words.find((candidate) => candidate.text === expect.verb);
    assert.ok(parsedVerb, `${expect.verb} should be tokenized`);
    assert.ok(parsedVerb.tags.includes("verb"), `${expect.verb} should be tagged as a verb`);
    for (const feature of expect.verbFeatures ?? []) {
      assert.ok(parsedVerb.feats.includes(feature), `${expect.verb} should include ${feature}`);
    }
  }
  for (const [word, features] of Object.entries(expect.features ?? {})) {
    const parsed = result.words.find((candidate) => candidate.text === word);
    assert.ok(parsed, `${word} should be tokenized`);
    for (const feature of features) {
      assert.ok(parsed.feats.includes(feature), `${word} should include ${feature}`);
    }
  }
}

for (const dialogue of dialogues) {
  test(`RelConLang dialogue parses and pairs ${dialogue.id}`, () => {
    for (const [index, turn] of dialogue.turns.entries()) {
      const result = settle(turn.text);
      assertParsedExpectation(result, turn.expect);
      if (turn.respondsTo !== undefined) {
        assert.ok(turn.respondsTo < index, `${dialogue.id} turn ${index} should respond to an earlier turn`);
      }
    }

    for (const pair of dialogue.adjacency) {
      const expectedMoves = allowedPairs.get(pair.type);
      assert.ok(expectedMoves, `${pair.type} should be a known adjacency type`);
      const first = dialogue.turns[pair.first];
      const second = dialogue.turns[pair.second];
      assert.ok(first, `${dialogue.id} pair first turn exists`);
      assert.ok(second, `${dialogue.id} pair second turn exists`);
      assert.equal(first.move, expectedMoves[0]);
      assert.equal(second.move, expectedMoves[1]);
      assert.equal(second.respondsTo, pair.first);
    }
  });
}
