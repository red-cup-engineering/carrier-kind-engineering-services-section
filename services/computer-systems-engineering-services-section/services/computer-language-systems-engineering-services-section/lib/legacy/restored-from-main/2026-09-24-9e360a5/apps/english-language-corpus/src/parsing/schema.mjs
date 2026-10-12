
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

export const spanSchema = {
  $id: "metroplat/codecs/text/english/span",
  type: "object",
  required: ["tier", "start", "end", "text"],
  additionalProperties: false,
  properties: {
    tier: { enum: ["document", "block", "sentence", "clause", "word", "rule"] },
    start: { anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }] },
    end: { anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }] },
    text: { type: "string" },
  },
};

export const sentenceParseSchema = {
  $id: "metroplat/codecs/text/english/sentence-parse",
  title: "EnglishSentenceParse",
  type: "object",
  required: ["kind", "id", "span", "parse", "glued", "complete"],
  additionalProperties: false,
  properties: {
    kind: { const: "parsing.sentence.parse" },
    id: { type: "string", minLength: 1 },
    span: spanSchema,
    // The full ParseResult embeds metroplat's own Cohomology (a
    // predication-package structure validated by that package) — not re-validated
    // here, the same shallow-escape convention the quarry's own schema used.
    parse: { type: "object", additionalProperties: true },
    glued: { type: "boolean" },
    complete: { type: "boolean" },
  },
};

export const parseForestSchema = {
  $id: "metroplat/codecs/text/english/parse-forest",
  title: "EnglishParseForest",
  type: "object",
  required: ["kind", "text", "readings", "glued", "complete"],
  additionalProperties: false,
  properties: {
    kind: { const: "parsing.forest" },
    text: { type: "string" },
    readings: { type: "array", items: sentenceParseSchema },
    glued: { type: "boolean" },
    complete: { type: "boolean" },
  },
};

const lambekHypothesisSchema = {
  type: "object",
  required: ["wordId", "text", "category", "connected"],
  additionalProperties: false,
  properties: {
    wordId: { type: "string", minLength: 1 },
    text: { type: "string" },
    category: { type: "string", minLength: 1 },
    connected: { type: "boolean" },
  },
};

const lambekProofStepSchema = {
  type: "object",
  required: ["rule", "premises", "conclusion", "evidence"],
  additionalProperties: false,
  properties: {
    rule: { enum: ["lexical", "left-residual-application", "right-residual-application", "sentence-introduction"] },
    premises: { type: "array", items: { type: "string" } },
    conclusion: { type: "string", minLength: 1 },
    evidence: { type: "string" },
  },
};

const lambekSequentSchema = {
  type: "object",
  required: ["antecedent", "succedent"],
  additionalProperties: false,
  properties: {
    antecedent: { type: "array", items: { type: "string", minLength: 1 } },
    succedent: { type: "string", minLength: 1 },
  },
};

export const lambekParseProofSchema = {
  $id: "metroplat/codecs/text/english/lambek-parse-proof",
  title: "EnglishLambekParseProof",
  type: "object",
  required: ["kind", "parseId", "sequent", "hypotheses", "steps", "conclusion", "proven"],
  additionalProperties: false,
  properties: {
    kind: { const: "parsing.lambek.parse-proof" },
    parseId: { type: "string", minLength: 1 },
    sequent: lambekSequentSchema,
    hypotheses: { type: "array", items: lambekHypothesisSchema },
    steps: { type: "array", items: lambekProofStepSchema },
    conclusion: { type: "string", minLength: 1 },
    proven: { type: "boolean" },
  },
};

export const lambekForestProofSchema = {
  $id: "metroplat/codecs/text/english/lambek-forest-proof",
  title: "EnglishLambekForestProof",
  type: "object",
  required: ["kind", "text", "proofs", "proven", "laws"],
  additionalProperties: false,
  properties: {
    kind: { const: "parsing.lambek.forest-proof" },
    text: { type: "string" },
    proofs: { type: "array", items: lambekParseProofSchema },
    proven: { type: "boolean" },
    // metroplat's own finite Lambek algebra law witness/obstruction
    // (`core/closure/analysis/lambek-calculus`) — already validated by that
    // module; carried here, not re-validated.
    laws: { type: "object", additionalProperties: true },
  },
};

export const sentenceParseContract = schemaFrom(sentenceParseSchema);
export const parseForestContract = schemaFrom(parseForestSchema);
export const lambekParseProofContract = schemaFrom(lambekParseProofSchema);
export const lambekForestProofContract = schemaFrom(lambekForestProofSchema);
