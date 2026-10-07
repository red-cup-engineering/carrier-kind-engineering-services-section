import { test } from "node:test";
import assert from "node:assert/strict";

import { load, admitCommunication, parseCommunicationForest } from "../src/index.mjs";
import { articulate, findQuoteSpans } from "../src/speaking/listening/parsing/articulating.mjs";

// Fixtures below are verbatim excerpts (via `claims[].proposition.object`, id
// "summary" or "title") from real koios.news collapse-tech store JSON records:
// lib/emsenn/services/561-group/services/public-services-section/services/public-social-services-section/
//   services/public-media-services-section/services/public-news-media-services-section/
//   services/koios-news/sites/koios.news/store/collapse-tech/*.json

// a-bold-satellite-rescue-mission-came-together-in-record-time-but-will-it-work.json
const SATELLITE =
  "Could they build and launch a satellite to save a $500 million astronomy mission at risk of crashing back to Earth?";

// britain-sending-ukraine-an-extra-30-000-drones-now-150-000-all-up.json
const BRITAIN =
  "Britain has raised its drone commitment to Ukraine to 150,000 this year and will send air defense missiles and radars as part of a £752 million aid package to help the country defend against Russia.";

// learning-to-lead-in-a-hybrid-human-ai-enterprise.json
const HYBRID_ENTERPRISE =
  "As adoption of AI agents looks set to surge by as much as 300% in the next two years, leadership teams are carefully considering the implications of a hybrid human-AI workforce.";

// anthropic-now-atop-the-ai-bubble-files-for-its-ipo.json (two sentences, two curly-quoted spans)
const ANTHROPIC_IPO =
  "“The proposed initial public offering will depend on market conditions and other factors,” Anthropic said in the announcement. “The number of shares to be offered and the price have not yet been set.”";

// fox-s-22b-roku-acquisition-aims-to-expand-its-reach-into-smart-tvs-advertising.json
const FOX_ROKU =
  "Fox Corporation has agreed to buy Roku Inc. for $160 per share, an approximate enterprise value of $22 billion, the firms announced today.";

// spacex-to-list-on-us-stock-market-at-historic-1-77tn-valuation.json (title claim)
const SPACEX_TITLE = "SpaceX to list on US stock market at historic $1.77tn valuation";

// brit-mathematician-lets-ai-agent-loose-with-credit-card-cue-password-leaks-captcha-chaos-and-more.json
const FRY_STRAIGHT_QUOTE = "Fry's team gave it \"to show us what it could do.\"";
const FRY_NESTED_QUOTES =
  "\"I want to be called 'Cass', short for 'Cassandra', the one who always knew the truth even when nobody listened,\"";

const baseMeta = { script: "Latin", direction: "ltr" };

function bundle(overrides = {}) {
  return load({
    meta: { ...baseMeta, name: "News Articulation Test", code: "news-test", ...(overrides.meta ?? {}) },
    lexicon: {
      determiners: [],
      prepositions: [],
      pronouns: [],
      conjunctions: [],
      auxiliaries: [],
      copula: [],
    },
    morphology: {
      suffixRules: [],
      numberSuffixPattern: "",
      verbFormRules: [],
      numberWords: [],
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
      roleStrategies: [],
      morphology: {
        type: "isolating",
        caseMarking: "none",
        agreement: "none",
      },
      segmentation: {
        sentenceBoundary: "punctuation",
        wordBoundary: "space",
      },
    },
    attachment: {
      determiner: "left",
      adjective: "left",
      subject: "left",
      object: "right",
    },
    segmentation: {
      sentenceTerminatorPattern: "[.!?]",
      abbreviations: overrides.abbreviations ?? [],
    },
  });
}

function wordTexts(result) {
  return result.spans.filter((s) => s.tier === "word").map((s) => s.text);
}

function numericTexts(result) {
  return result.spans.filter((s) => s.tier === "word" && s.numeric === true).map((s) => s.text);
}

function quoteTexts(result) {
  return result.spans.filter((s) => s.tier === "quote").map((s) => s.text);
}

function assertOffsetsRoundTrip(result) {
  for (const s of result.spans) {
    if (s.start === null || s.end === null) continue;
    assert.equal(result.text.slice(s.start, s.end), s.text, `span offsets round-trip for "${s.text}"`);
  }
}

// --- numeric tokens ---------------------------------------------------------

test("tokenize: a currency-prefixed number stays one token, and million/billion remain separate words ($500 million)", () => {
  const compiled = bundle();
  const result = articulate(SATELLITE, compiled);

  assert.ok(wordTexts(result).includes("$500"));
  assert.ok(wordTexts(result).includes("million"));
  assert.deepEqual(numericTexts(result), ["$500"]);
  assertOffsetsRoundTrip(result);
});

test("tokenize: a comma-grouped number and a currency-prefixed number both stay one token each (150,000 / £752)", () => {
  const compiled = bundle();
  const result = articulate(BRITAIN, compiled);

  assert.deepEqual(numericTexts(result), ["150,000", "£752"]);
  // the clause-splitting comma inside "150,000" must not fracture the sentence's clauses
  const clauses = result.spans.filter((s) => s.tier === "clause").map((s) => s.text);
  assert.ok(clauses.some((c) => c.includes("150,000")), "the digit-flanked comma stayed inside its clause");
  assertOffsetsRoundTrip(result);
});

test("tokenize: a percent-suffixed number stays one token, with no space before the sign (300%)", () => {
  const compiled = bundle();
  const result = articulate(HYBRID_ENTERPRISE, compiled);

  assert.deepEqual(numericTexts(result), ["300%"]);
  assertOffsetsRoundTrip(result);
});

test("tokenize: a decimal currency number keeps a directly-attached unit suffix as one token ($1.77tn)", () => {
  const compiled = bundle();
  const result = articulate(SPACEX_TITLE, compiled);

  assert.deepEqual(numericTexts(result), ["$1.77tn"]);
  assertOffsetsRoundTrip(result);
});

test("tokenize: two currency numbers in one sentence, with an ordinary (non-digit-flanked) comma still splitting clauses ($160 / $22 billion)", () => {
  const compiled = bundle({ abbreviations: ["inc"] });
  const result = articulate(FOX_ROKU, compiled);

  assert.deepEqual(numericTexts(result), ["$160", "$22"]);
  const clauses = result.spans.filter((s) => s.tier === "clause").map((s) => s.text);
  assert.ok(clauses.length > 1, "the ordinary comma after '$160 per share' still splits a clause");
  assertOffsetsRoundTrip(result);
});

test("tokenize: the spec's own examples produce exactly the stated tokens (€5, 1,195, 3.2%, $40.5bn)", () => {
  const compiled = bundle();
  const words = wordTexts(articulate("prices rose to €5 million after 1,195 sales, up 3.2% on a $40.5bn base.", compiled));
  assert.ok(words.includes("€5"));
  assert.ok(words.includes("million"));
  assert.ok(words.includes("1,195"));
  assert.ok(words.includes("3.2%"));
  assert.ok(words.includes("$40.5bn"));
});

// --- quote spans -------------------------------------------------------------

test("articulate: curly double-quote spans are recovered (not discarded) with correct offsets, one per attributed quote", () => {
  const compiled = bundle();
  const result = articulate(ANTHROPIC_IPO, compiled);

  assert.deepEqual(quoteTexts(result), [
    "“The proposed initial public offering will depend on market conditions and other factors,”",
    "“The number of shares to be offered and the price have not yet been set.”",
  ]);
  assertOffsetsRoundTrip(result);
});

test("articulate: a straight double-quote span is recovered without swallowing a contraction apostrophe (Fry's ... \"...\")", () => {
  const compiled = bundle();
  const result = articulate(FRY_STRAIGHT_QUOTE, compiled);

  assert.deepEqual(quoteTexts(result), ['"to show us what it could do."']);
  // the contraction survives as one word, not split by the (correctly-ignored) apostrophe
  assert.ok(wordTexts(result).includes("Fry's"));
  assertOffsetsRoundTrip(result);
});

test("articulate: nested straight single-quote spans inside an outer straight double-quote span are all recovered", () => {
  const compiled = bundle();
  const result = articulate(FRY_NESTED_QUOTES, compiled);

  assert.deepEqual(quoteTexts(result).sort(), ["'Cass'", "'Cassandra'", FRY_NESTED_QUOTES].sort());
  assertOffsetsRoundTrip(result);
});

test("findQuoteSpans: exposed directly, honors a non-zero base offset", () => {
  const spans = findQuoteSpans('say "hi" now', 100);
  assert.deepEqual(spans.map((s) => s.text), ['"hi"']);
  assert.deepEqual([spans[0].start, spans[0].end], [104, 108]);
});

test("articulate: a sentence terminator inside a quote never ends the sentence, but the real terminator after it still does", () => {
  const compiled = bundle();
  const text = 'Officials called the plan "too risky." before quietly shelving it. Markets reacted swiftly.';
  const result = articulate(text, compiled);
  const sentences = result.spans.filter((s) => s.tier === "sentence").map((s) => s.text);

  assert.deepEqual(sentences, [
    'Officials called the plan "too risky." before quietly shelving it.',
    "Markets reacted swiftly.",
  ]);
});

// --- bundle.abbreviations (segmentation.abbreviations / isAbbreviation) ------

test("splitSentences: without an abbreviations hook, a period after a listed abbreviation-like word still ends the sentence (unchanged default)", () => {
  const compiled = bundle();
  const result = articulate(FOX_ROKU, compiled);
  const sentences = result.spans.filter((s) => s.tier === "sentence").map((s) => s.text);

  assert.equal(sentences.length, 2, "with no abbreviations supplied, 'Inc.' is read as ending a sentence");
  assert.equal(sentences[0], "Fox Corporation has agreed to buy Roku Inc.");
});

test("splitSentences: bundle.segmentation.abbreviations (surface forms ending in a period, e.g. \"Inc.\") suppresses the split there", () => {
  const compiled = bundle({ abbreviations: ["Inc."] });
  const result = articulate(FOX_ROKU, compiled);
  const sentences = result.spans.filter((s) => s.tier === "sentence").map((s) => s.text);

  assert.equal(sentences.length, 1, "'Inc.' no longer splits the sentence once listed as an abbreviation");
  assert.equal(sentences[0], FOX_ROKU);
});

test("splitSentences: an abbreviation supplied without its trailing period ('inc') resolves the same as with it ('Inc.')", () => {
  const withPeriod = articulate(FOX_ROKU, bundle({ abbreviations: ["Inc."] }));
  const withoutPeriod = articulate(FOX_ROKU, bundle({ abbreviations: ["inc"] }));

  const sentencesOf = (r) => r.spans.filter((s) => s.tier === "sentence").map((s) => s.text);
  assert.deepEqual(sentencesOf(withPeriod), sentencesOf(withoutPeriod));
});

// --- readings: quotes and numeric tokens surfaced per sentence ---------------

test("parseCommunicationForest: each reading exposes the quote spans and numeric tokens contained in its own sentence", () => {
  const compiled = bundle();
  const forest = parseCommunicationForest(admitCommunication(ANTHROPIC_IPO), compiled);

  assert.equal(forest.readings.length, 2);
  assert.deepEqual(
    forest.readings[0].quotes.map((q) => q.text),
    ["“The proposed initial public offering will depend on market conditions and other factors,”"],
  );
  assert.deepEqual(
    forest.readings[1].quotes.map((q) => q.text),
    ["“The number of shares to be offered and the price have not yet been set.”"],
  );
  assert.deepEqual(forest.readings[0].numericTokens, []);
});

test("parseCommunicationForest: a reading's numericTokens carries the sentence's currency/comma-grouped word spans", () => {
  const compiled = bundle();
  const forest = parseCommunicationForest(admitCommunication(BRITAIN), compiled);

  assert.equal(forest.readings.length, 1);
  assert.deepEqual(
    forest.readings[0].numericTokens.map((n) => n.text),
    ["150,000", "£752"],
  );
  assert.deepEqual(forest.readings[0].quotes, []);
});
