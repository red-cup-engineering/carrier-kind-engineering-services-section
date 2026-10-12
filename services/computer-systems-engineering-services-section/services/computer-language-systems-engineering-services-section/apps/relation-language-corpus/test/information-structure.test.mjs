import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

import { manifest, settle } from "../src/index.mjs";

const informationUrl = new URL("../data/information-structure.json", import.meta.url);
const information = JSON.parse(readFileSync(informationUrl, "utf8"));

function arcByText(result, relation, headText, depText) {
  return result.arcs.find((candidate) =>
    candidate.rel === relation && candidate.headText === headText && candidate.depText === depText);
}

test("RelConLang information structure declares current maturity honestly", () => {
  assert.equal(information.kind, "x-rel.information-structure");
  assert.equal(information.maturity.topicParticle, "Built+green");
  assert.equal(information.maturity.focusParticle, "Built+green");
  assert.equal(information.maturity.longDistanceScope, "Roadmap");
});

test("RelConLang information particles are manifest-backed RWIL readings", () => {
  for (const particle of information.particles) {
    assert.ok(
      manifest.witnessJournal.some((row) =>
        row.entity === `language:x-rel:particle:${particle.surface}`
          && row.attribute === "communicating.informationStructure"
          && row.value === particle.relation),
      `${particle.surface} should be carried as an information-structure RWIL reading`,
    );
  }
});

for (const example of information.examples) {
  test(`RelConLang information example parses ${example.id}`, () => {
    const result = settle(example.text);

    assert.ok(arcByText(result, "nsubj", example.expect.verb, example.expect.nsubj));
    assert.ok(arcByText(result, "dobj", example.expect.verb, example.expect.dobj));

    for (const expected of example.expect.information) {
      assert.ok(arcByText(result, expected.rel, expected.head, expected.dep));
      assert.ok(arcByText(result, "mark", expected.dep, expected.mark));

      const marker = result.words.find((word) => word.text === expected.mark);
      assert.ok(marker?.feats.includes(`info:${expected.rel}`));
    }
  });
}
