import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

import { manifest, receipts, settle } from "../src/index.mjs";

const corpusUrl = new URL("../corpus/agency-samples.jsonl", import.meta.url);
const samples = readFileSync(corpusUrl, "utf8")
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

test("RelConLang manifest exposes agency-language receipts", () => {
  assert.equal(manifest.kind, "communicating.language-manifest");
  assert.equal(manifest.bundle.meta.code, "x-rel");
  assert.equal(receipts.kind, "communicating.language-manifest.receipts");
  assert.equal(receipts.chu.dualInvolution, true);
  assert.ok(receipts.witnessJournal.length >= 6);
});

for (const sample of samples) {
  test(`RelConLang corpus parses ${sample.id}`, () => {
    const result = settle(sample.text);
    assert.equal(arc(result, "nsubj")?.depText, sample.expect.nsubj);
    if (sample.expect.dobj !== undefined) {
      assert.equal(arc(result, "dobj")?.depText, sample.expect.dobj);
    }
    if (sample.expect.embedded !== undefined) {
      assert.ok(arcByText(result, "nsubj", sample.expect.ccomp.dep, sample.expect.embedded.nsubj));
      assert.ok(arcByText(result, "dobj", sample.expect.ccomp.dep, sample.expect.embedded.dobj));
    }
    if (sample.expect.ccomp !== undefined) {
      assert.ok(arcByText(result, "ccomp", sample.expect.ccomp.head, sample.expect.ccomp.dep));
      assert.ok(arcByText(result, "mark", sample.expect.ccomp.dep, sample.expect.ccomp.mark));
    }
    for (const oblique of sample.expect.obliques ?? []) {
      assert.ok(arcByText(result, "obl", oblique.head, oblique.dep));
      assert.ok(arcByText(result, "case", oblique.dep, oblique.case));
    }
    for (const discourse of sample.expect.discourse ?? []) {
      assert.ok(arcByText(result, "discourse", discourse.head, discourse.dep));
    }
    for (const information of sample.expect.information ?? []) {
      assert.ok(arcByText(result, information.rel, information.head, information.dep));
      assert.ok(arcByText(result, "mark", information.dep, information.mark));
    }
    if (sample.expect.verb !== undefined) {
      const parsedVerb = result.words.find((candidate) => candidate.text === sample.expect.verb);
      assert.ok(parsedVerb, `${sample.expect.verb} should be tokenized`);
      assert.ok(parsedVerb.tags.includes("verb"), `${sample.expect.verb} should be tagged as a verb`);
      for (const feature of sample.expect.verbFeatures ?? []) {
        assert.ok(parsedVerb.feats.includes(feature), `${sample.expect.verb} should include ${feature}`);
      }
    }
    for (const [word, features] of Object.entries(sample.expect.features ?? {})) {
      const parsed = result.words.find((candidate) => candidate.text === word);
      assert.ok(parsed, `${word} should be tokenized`);
      for (const feature of features) {
        assert.ok(parsed.feats.includes(feature), `${word} should include ${feature}`);
      }
    }
  });
}
