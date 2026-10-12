import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

import { settle } from "../src/index.mjs";

const registerUrl = new URL("../corpus/register-samples.jsonl", import.meta.url);
const samples = readFileSync(registerUrl, "utf8")
  .trim()
  .split(/\r?\n/u)
  .map((line) => JSON.parse(line));

const registers = new Set(["everyday", "technical", "proof", "ritual"]);

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
  for (const oblique of expect.obliques ?? []) {
    assert.ok(arcByText(result, "obl", oblique.head, oblique.dep));
    assert.ok(arcByText(result, "case", oblique.dep, oblique.case));
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

for (const sample of samples) {
  test(`RelConLang register sample parses ${sample.id}`, () => {
    assert.ok(registers.has(sample.register), `${sample.register} should be a known register`);
    const parsedLines = sample.lines.map((line) => ({ line, result: settle(line.text) }));

    for (const { line, result } of parsedLines) {
      assertParsedExpectation(result, line.expect);
      if (sample.constraints?.maxTokensPerLine !== undefined) {
        assert.ok(result.words.length <= sample.constraints.maxTokensPerLine);
      }
    }

    if (sample.requires?.includes("provenance")) {
      assert.ok(parsedLines.some(({ result }) => arcByText(result, "case", "sava", "pa")));
    }
    if (sample.requires?.includes("locus")) {
      assert.ok(parsedLines.some(({ result }) => arcByText(result, "case", "tilo", "lo")));
    }
    if (sample.requires?.includes("kind")) {
      assert.ok(parsedLines.some(({ result }) => arcByText(result, "case", "vara", "ke")));
    }
    if (sample.requires?.includes("embedded-proposition")) {
      assert.ok(parsedLines.some(({ result }) => result.arcs.some((candidate) => candidate.rel === "ccomp")));
    }
    if (sample.requires?.includes("stable-charge")) {
      assert.ok(parsedLines.some(({ result }) => result.words.some((word) => word.text === "sha")));
    }

    if (sample.parallelism !== undefined) {
      const subjects = parsedLines.map(({ result }) => arc(result, "nsubj")?.depText);
      const verbs = parsedLines.map(({ line }) => line.expect.verb);
      const objects = parsedLines.map(({ result }) => arc(result, "dobj")?.depText);
      assert.deepEqual(subjects, sample.lines.map(() => sample.parallelism.sameSubject));
      assert.deepEqual(verbs, sample.parallelism.verbs);
      assert.deepEqual(objects, sample.parallelism.objects);
    }
  });
}
