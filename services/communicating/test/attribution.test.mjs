import { test } from "node:test";
import assert from "node:assert/strict";

import { admitCommunication, load, parseCommunicationForest } from "../src/index.mjs";

const baseMeta = { script: "Latin", direction: "ltr" };

// fox-s-22b-roku-acquisition... / anthropic-now-atop-the-ai-bubble-files-for-its-ipo.json
// (verbatim excerpt, via koios.news collapse-tech store JSON records — see news-articulation.test.mjs)
const ANTHROPIC_IPO =
  "“The proposed initial public offering will depend on market conditions and other factors,” Anthropic said in the announcement. “The number of shares to be offered and the price have not yet been set.”";

function bundle(overrides = {}) {
  return load({
    meta: { ...baseMeta, name: "Attribution Test", code: "attribution-test" },
    lexicon: {
      determiners: ["the", "a", "an"],
      prepositions: ["to", "of", "in", "on"],
      pronouns: ["he", "she", "it", "they"],
      conjunctions: [],
      auxiliaries: ["may", "might", "could", "would", "should", "will", "shall"],
      copula: ["is", "are", "was", "were"],
    },
    morphology: {
      suffixRules: [],
      numberSuffixPattern: "",
      verbFormRules: [],
      numberWords: [],
      irregularVerbs: {
        say: { "3sg": "says", past: "said" },
        fall: { "3sg": "falls", past: "fell" },
      },
    },
    reference: { pronouns: {}, nameGender: {} },
    wordOrder: "SVO",
    grammar: {
      kind: "communicating.language-grammar-profile",
      wordOrder: "SVO",
      alignment: "nominative-accusative",
      headDirectionality: {
        determiner: "left",
        adjective: "left",
        subject: "left",
        object: "right",
        adposition: "left",
      },
      roleStrategies: [
        { relation: "nsubj", by: "position", direction: "left", distance: "nearest" },
        { relation: "dobj", by: "position", direction: "right", distance: "nearest" },
      ],
      morphology: { type: "isolating", caseMarking: "none", agreement: "weak" },
      segmentation: { sentenceBoundary: "punctuation", wordBoundary: "space" },
    },
    attachment: { determiner: "left", adjective: "left", subject: "left", object: "right" },
    segmentation: { sentenceTerminatorPattern: "[.!?]", abbreviations: overrides.abbreviations ?? [] },
    ...(overrides.reportingVerbs !== undefined ? { reportingVerbs: overrides.reportingVerbs } : {}),
    ...(overrides.attributionMarkers !== undefined ? { attributionMarkers: overrides.attributionMarkers } : {}),
  });
}

function firstAttribution(text, compiled) {
  const forest = parseCommunicationForest(admitCommunication(text), compiled);
  return forest.readings.flatMap((r) => r.parse.attributions)[0];
}

// --- reporting-verb kind -----------------------------------------------------

test("attributions: a reporting-verb clause reads speaker/cue/content, speaker extended through a title chain", () => {
  const compiled = bundle({ reportingVerbs: ["say"] });
  const text = "RIPE Managing Director Hans Petter Holen says returning to the old system is no longer an option.";
  const a = firstAttribution(text, compiled);

  assert.ok(a, "expected an attribution reading");
  assert.equal(a.kind, "reporting-verb");
  assert.equal(a.speaker.text, "RIPE Managing Director Hans Petter Holen");
  assert.equal(a.cue.text, "says");
  assert.equal(a.content.text, "returning to the old system is no longer an option");
  // offsets round-trip against the source text
  assert.equal(text.slice(a.speaker.start, a.speaker.end), a.speaker.text);
  assert.equal(text.slice(a.cue.start, a.cue.end), a.cue.text);
  assert.equal(text.slice(a.content.start, a.content.end), a.content.text);
});

test("attributions: quoted speech followed by a reporting clause is attributed to that clause's subject, content is the quote", () => {
  const compiled = bundle({ reportingVerbs: ["say"] });
  const forest = parseCommunicationForest(admitCommunication(ANTHROPIC_IPO), compiled);
  const a = forest.readings[0].parse.attributions[0];

  assert.ok(a, "expected an attribution reading on the first sentence");
  assert.equal(a.kind, "reporting-verb");
  assert.equal(a.speaker.text, "Anthropic");
  assert.equal(a.cue.text, "said");
  assert.equal(
    a.content.text,
    "“The proposed initial public offering will depend on market conditions and other factors,”",
  );
  assert.equal(ANTHROPIC_IPO.slice(a.content.start, a.content.end), a.content.text);
});

test("attributions: with no bundle.reportingVerbs and no bundle.attributionMarkers, the array is empty and nothing else changes", () => {
  const compiled = bundle();
  const forest = parseCommunicationForest(admitCommunication("RIPE Managing Director Hans Petter Holen says returning is no longer an option."), compiled);
  assert.deepEqual(forest.readings[0].parse.attributions, []);
  // the rest of the reading is unaffected
  assert.ok(forest.readings[0].parse.words.length > 0);
  assert.ok(forest.readings[0].parse.arcs.length > 0);
});

// --- marker kind --------------------------------------------------------------

test("attributions: a sentence-initial multi-word marker ('According to') reads speaker up to the comma and content as the remainder", () => {
  const compiled = bundle({ attributionMarkers: ["According to", "Per"] });
  const text = "According to the IEA, demand fell 3%.";
  const a = firstAttribution(text, compiled);

  assert.ok(a, "expected an attribution reading");
  assert.equal(a.kind, "marker");
  assert.equal(a.cue.text, "According to");
  assert.equal(a.speaker.text, "the IEA");
  assert.equal(a.content.text, "demand fell 3%");
  assert.equal(text.slice(a.speaker.start, a.speaker.end), a.speaker.text);
  assert.equal(text.slice(a.cue.start, a.cue.end), a.cue.text);
  assert.equal(text.slice(a.content.start, a.content.end), a.content.text);
});

test("attributions: a marker that only occurs mid-sentence (not sentence-initial) is not read as an attribution cue", () => {
  const compiled = bundle({ attributionMarkers: ["per"] });
  // "per share" here is an ordinary preposition phrase, not a sentence-initial attribution marker
  const text = "Fox Corporation has agreed to buy Roku Inc. for $160 per share.";
  const a = firstAttribution(text, compiled);
  assert.equal(a, undefined);
});
