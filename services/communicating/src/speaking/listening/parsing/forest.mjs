/**
 * parsing/forest - valued parse forests over surface language.
 *
 * The legacy parser gives one settled reading of one sentence. A parse forest is
 * the carrier the rest of communicating should depend on: every sentence span is
 * read as a valued local parse, and ambiguity/void/conflict evidence is held in
 * the carrier instead of being collapsed into a single classical parse choice.
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { articulateCommunication } from "./articulating.mjs";
import { cohomology } from "./cohomology.mjs";
import { parse } from "./parsing.mjs";
import { spansInSentenceOfTier, wordsInSentence } from "./construing.mjs";
import { knowledgeJoinReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const spanSchema = {
  type: "object",
  required: ["tier", "start", "end", "text"],
  additionalProperties: false,
  properties: {
    tier: { enum: ["document", "block", "sentence", "clause", "word", "quote", "rule"] },
    start: { anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }] },
    end: { anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }] },
    text: { type: "string" },
    numeric: { type: "boolean" },
  },
};

const obstructionSchema = {
  type: "object",
  required: ["kind", "label", "on", "value"],
  additionalProperties: false,
  properties: {
    kind: { enum: ["conflict", "void"] },
    label: { type: "string" },
    on: { type: "string" },
    value: { enum: ["absurd", "potential", "active", "stable"] },
  },
};

const readingSchema = { enum: ["absurd", "potential", "active", "stable"] };

export const parseForestReadingSchema = {
  $id: "communicating/parsing/parse-forest-reading",
  type: "object",
  required: ["kind", "id", "span", "parse", "reading", "glued", "complete", "ambiguity", "obstructions"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.parse-forest.reading" },
    id: { type: "string", minLength: 1 },
    span: spanSchema,
    parse: { type: "object", additionalProperties: true },
    reading: readingSchema,
    glued: { type: "boolean" },
    complete: { type: "boolean" },
    ambiguity: { type: "integer", minimum: 0 },
    obstructions: { type: "array", items: obstructionSchema },
    quotes: { type: "array", items: spanSchema },
    numericTokens: { type: "array", items: spanSchema },
  },
};

export const parseForestSchema = {
  $id: "communicating/parsing/parse-forest",
  type: "object",
  required: ["kind", "text", "readings", "reading", "glued", "complete", "ambiguity", "obstructions"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.parse-forest" },
    text: { type: "string" },
    readings: { type: "array", items: parseForestReadingSchema },
    reading: readingSchema,
    glued: { type: "boolean" },
    complete: { type: "boolean" },
    ambiguity: { type: "integer", minimum: 0 },
    obstructions: { type: "array", items: obstructionSchema },
  },
};

export const parseForestReadingCarrier = schemaFrom(parseForestReadingSchema);
export const parseForestCarrier = schemaFrom(parseForestSchema);

function aggregateReadings(values) {
  return values
    .map((name) => (name))
    .reduce((prior, next) => knowledgeJoinReading(prior, next), "absurd")
    .name;
}

function parseReading(result) {
  return aggregateReadings(result.answers.map((answer) => answer.value));
}

function readingId(span, index) {
  return `reading@${span.start ?? "?"}-${span.end ?? "?"}:${index}`;
}

/** Build one reading, including the quote spans and numeric word-tokens that fall
 * within `span` (read off `allSpans`, the full articulation's span set) so a
 * consumer gets both through the reading without re-deriving them. */
function readingFromParse(span, result, index, allSpans) {
  const coh = cohomology(result);
  const reading = Object.freeze({
    kind: "communicating.parse-forest.reading",
    id: readingId(span, index),
    span,
    parse: result,
    reading: parseReading(result),
    glued: coh.glued,
    complete: result.voids.length === 0,
    ambiguity: coh.obstructions.length,
    obstructions: Object.freeze([...coh.obstructions]),
    quotes: Object.freeze(spansInSentenceOfTier(span, allSpans, "quote")),
    numericTokens: Object.freeze(wordsInSentence(span, allSpans).filter((s) => s.numeric === true)),
  });
  parseForestReadingCarrier.assert(reading, "parse forest reading");
  return reading;
}

function sentenceSpans(base) {
  const sentences = base.spans.filter((span) => span.tier === "sentence");
  return sentences.length === 0 ? [base.document] : sentences;
}

export function parseForestFromArticulation(base, bundle) {
  const readings = sentenceSpans(base).map((sentence, index) =>
    readingFromParse(sentence, parse(sentence, base, bundle), index, base.spans));
  // The document-level obstruction view repeats the semantic values, never
  // object references from a sentence reading.  The forest is a data carrier,
  // not an in-memory object graph, so it can be canonically encoded and
  // content-addressed by every receiver.
  const obstructions = Object.freeze(
    readings.flatMap((reading) => reading.obstructions.map((obstruction) => Object.freeze({ ...obstruction }))),
  );
  const forest = Object.freeze({
    kind: "communicating.parse-forest",
    text: base.text,
    readings: Object.freeze(readings),
    reading: aggregateReadings(readings.map((reading) => reading.reading)),
    glued: readings.every((reading) => reading.glued),
    complete: readings.every((reading) => reading.complete),
    ambiguity: obstructions.length,
    obstructions,
  });
  parseForestCarrier.assert(forest, "parse forest");
  return forest;
}

export function parseForest(sentenceSpan, base, bundle) {
  const wordSpans = wordsInSentence(sentenceSpan, base.spans);
  const quoteSpans = spansInSentenceOfTier(sentenceSpan, base.spans, "quote");
  const localBase = Object.freeze({
    ...base,
    document: sentenceSpan,
    spans: Object.freeze([sentenceSpan, ...wordSpans, ...quoteSpans]),
  });
  return parseForestFromArticulation(localBase, bundle);
}

export function parseCommunicationForest(carrier, bundle) {
  return parseForestFromArticulation(articulateCommunication(carrier, bundle), bundle);
}
