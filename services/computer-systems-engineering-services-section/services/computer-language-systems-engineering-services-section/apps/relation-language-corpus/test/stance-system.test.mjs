import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

import { manifest, settle } from "../src/index.mjs";

const stanceUrl = new URL("../data/stance-system.json", import.meta.url);
const stance = JSON.parse(readFileSync(stanceUrl, "utf8"));

const rwilRows = manifest.witnessJournal ?? [];
const row = (entity, attribute) =>
  rwilRows.find((candidate) => candidate.entity === entity && candidate.attribute === attribute);

function arc(result, relation) {
  return result.arcs.find((candidate) => candidate.rel === relation);
}

function arcByText(result, relation, headText, depText) {
  return result.arcs.find((candidate) =>
    candidate.rel === relation && candidate.headText === headText && candidate.depText === depText);
}

function assertParseExpectation(result, expect) {
  assert.equal(arc(result, "nsubj")?.depText, expect.nsubj);
  if (expect.dobj !== undefined) {
    assert.equal(arc(result, "dobj")?.depText, expect.dobj);
  }
  if (expect.verb !== undefined) {
    const word = result.words.find((candidate) => candidate.text === expect.verb);
    assert.ok(word, `${expect.verb} should be tokenized`);
    assert.ok(word.tags.includes("verb"), `${expect.verb} should be tagged as a verb`);
  }
  for (const particle of expect.particles ?? []) {
    assert.ok(result.words.some((word) => word.text === particle), `${particle} should be present`);
  }
  for (const oblique of expect.obliques ?? []) {
    assert.ok(arcByText(result, "obl", oblique.head, oblique.dep));
    assert.ok(arcByText(result, "case", oblique.dep, oblique.case));
  }
  for (const discourse of expect.discourse ?? []) {
    assert.ok(arcByText(result, "discourse", discourse.head, discourse.dep));
  }
}

test("RelConLang stance system declares current maturity honestly", () => {
  assert.equal(stance.kind, "x-rel.stance-system");
  assert.equal(stance.language, manifest.bundle.meta.code);
  assert.equal(stance.maturity.chargeParticles, "Built+green");
  assert.equal(stance.maturity.provenanceOblique, "Built+green");
  assert.equal(stance.maturity.lexicalModality, "Built+green");
  assert.equal(stance.maturity.inflectionalMood, "Roadmap");
});

test("RelConLang stance charge particles agree with RWIL and Chu points", () => {
  const chuPts = new Set(manifest.chu.pts);
  for (const particle of stance.dimensions.charge.particles) {
    assert.ok(chuPts.has(particle.surface), `${particle.surface} should be a Chu point`);
    assert.equal(row(`language:x-rel:particle:${particle.surface}`, "communicating.charge")?.value, particle.value);
  }
});

test("RelConLang stance modality and dialogue entries agree with RWIL", () => {
  for (const verb of stance.dimensions.modality.verbs) {
    const modality = row(`language:x-rel:verb:${verb.surface}`, "communicating.modality");
    const speechAct = row(`language:x-rel:verb:${verb.surface}`, "communicating.speechAct");
    assert.ok(modality ?? speechAct, `${verb.surface} should have a modality or speech-act RWIL row`);
  }
  for (const particle of stance.dimensions.dialogueForce.particles) {
    assert.equal(
      row(`language:x-rel:particle:${particle.surface}`, "communicating.dialogueForce")?.value,
      particle.force,
    );
  }
});

test("RelConLang stance evidential source nouns are built semantic roots", () => {
  const semanticRoots = new Map((manifest.bundle.morphology.rootPatternRules ?? []).flatMap((rule) =>
    (rule.features ?? [])
      .filter((feature) => feature.startsWith("semantic:"))
      .map((feature) => [feature.slice("semantic:".length), rule.pattern])));
  for (const noun of stance.dimensions.evidentiality.sourceNouns) {
    assert.ok(semanticRoots.has(noun.semantic), `${noun.semantic} should be a built semantic root`);
  }
});

for (const example of stance.examples) {
  test(`RelConLang stance example parses ${example.id}`, () => {
    const result = settle(example.text);
    assertParseExpectation(result, example.expect);
  });
}
