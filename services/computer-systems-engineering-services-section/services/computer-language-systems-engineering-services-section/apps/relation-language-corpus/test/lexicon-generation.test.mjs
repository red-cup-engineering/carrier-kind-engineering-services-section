import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

import { manifest, settle } from "../src/index.mjs";

const generationUrl = new URL("../data/lexicon-generation.json", import.meta.url);
const generation = JSON.parse(readFileSync(generationUrl, "utf8"));

function exactWordFromPattern(pattern) {
  const match = /^\^([a-z]+)\$$/u.exec(pattern);
  return match?.[1] ?? null;
}

function arcByText(result, relation, headText, depText) {
  return result.arcs.find((candidate) =>
    candidate.rel === relation && candidate.headText === headText && candidate.depText === depText);
}

test("RelConLang generative lexicon covers manifest root families", () => {
  assert.equal(generation.kind, "x-rel.lexicon-generation");
  assert.equal(generation.language, manifest.bundle.meta.code);
  const generated = new Map(generation.rootFamilies.map((entry) => [entry.surface, entry]));

  for (const rule of manifest.bundle.morphology.rootPatternRules ?? []) {
    const surface = exactWordFromPattern(rule.pattern);
    if (surface === null) continue;
    const entry = generated.get(surface);
    assert.ok(entry, `${surface} should have a generative root-family entry`);
    assert.equal(entry.root, rule.root);
    assert.equal(entry.template, rule.template);
    assert.equal(entry.semantic, rule.features?.find((feature) => feature.startsWith("semantic:"))?.slice("semantic:".length));
    assert.ok(entry.history.length > 0, `${surface} should have an internal-history note`);
  }
});

test("RelConLang generative templates cover all built manifest templates", () => {
  const templateIds = new Set(generation.templates.map((entry) => entry.id));
  for (const rule of manifest.bundle.morphology.rootPatternRules ?? []) {
    assert.ok(templateIds.has(rule.template), `${rule.template} should be a declared generative template`);
  }
});

test("RelConLang derivational rules align with manifest suffix features", () => {
  const features = new Set((manifest.bundle.morphology.featureRules ?? []).map((rule) => rule.tag));
  for (const derivation of generation.derivations) {
    assert.ok(features.has(derivation.feature), `${derivation.feature} should be a manifest feature`);
    assert.match(derivation.suffix, /^[a-z]+$/u);
  }
});

test("RelConLang built generated examples parse with their expected derivations", () => {
  for (const example of generation.builtExamples) {
    const result = settle(example.sentence);
    if (example.expect.verb !== undefined) {
      const word = result.words.find((candidate) => candidate.text === example.expect.verb);
      assert.ok(word, `${example.expect.verb} should be tokenized`);
      assert.ok(word.tags.includes("verb"), `${example.expect.verb} should be tagged as a verb`);
      for (const feature of example.expect.features) {
        assert.ok(word.feats.includes(feature), `${example.expect.verb} should include ${feature}`);
      }
    }
    if (example.expect.adjective !== undefined) {
      const word = result.words.find((candidate) => candidate.text === example.expect.adjective);
      assert.ok(word, `${example.expect.adjective} should be tokenized`);
      assert.ok(word.tags.includes("adj"), `${example.expect.adjective} should be tagged as an adjective`);
      for (const feature of example.expect.features) {
        assert.ok(word.feats.includes(feature), `${example.expect.adjective} should include ${feature}`);
      }
      assert.ok(arcByText(result, "amod", example.expect.head, example.expect.adjective));
    }
  }
});

test("RelConLang roadmap coinages do not collide with built surfaces", () => {
  const builtSurfaces = new Set([
    ...generation.rootFamilies.map((entry) => entry.surface),
    ...manifest.bundle.lexicon.determiners,
    ...manifest.bundle.lexicon.prepositions,
    ...manifest.bundle.lexicon.pronouns,
    ...manifest.bundle.lexicon.conjunctions,
  ]);
  for (const coinage of generation.coinageRoadmap) {
    assert.equal(coinage.status, "Roadmap");
    assert.ok(!builtSurfaces.has(coinage.candidate), `${coinage.candidate} should not collide with a built surface`);
  }
});
