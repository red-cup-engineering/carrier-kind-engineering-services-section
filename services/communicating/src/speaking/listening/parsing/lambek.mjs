/**
 * parsing/lambek - type-logical proof carriers over valued parse forests.
 *
 * This is the second layer after parse forests: it does not search a complete
 * grammar calculus. It reads each settled forest reading as a Lambek-style
 * sequent, records lexical hypotheses and dependency-licensed proof steps, and
 * attaches the finite Lambek law witness owned by @red-cup-engineering/relating.
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { step } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/chromatic-lorentzian";
import { laws, booleanCommutativeLambekAlgebra } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/lambek-calculus";

const readingSchema = { enum: ["absurd", "potential", "active", "stable"] };

const hypothesisSchema = {
  type: "object",
  required: ["wordId", "text", "category", "reading"],
  additionalProperties: false,
  properties: {
    wordId: { type: "string", minLength: 1 },
    text: { type: "string" },
    category: { type: "string", minLength: 1 },
    reading: readingSchema,
  },
};

const stepSchema = {
  type: "object",
  required: ["rule", "premises", "conclusion", "reading", "evidence"],
  additionalProperties: false,
  properties: {
    rule: {
      enum: [
        "lexical",
        "left-residual-application",
        "right-residual-application",
        "sentence-introduction",
        "obstruction",
      ],
    },
    premises: { type: "array", items: { type: "string" } },
    conclusion: { type: "string", minLength: 1 },
    reading: readingSchema,
    evidence: { type: "string" },
  },
};

const sequentSchema = {
  type: "object",
  required: ["antecedent", "succedent"],
  additionalProperties: false,
  properties: {
    antecedent: { type: "array", items: { type: "string", minLength: 1 } },
    succedent: { type: "string", minLength: 1 },
  },
};

export const lambekForestReadingProofSchema = {
  $id: "communicating/parsing/lambek-reading-proof",
  type: "object",
  required: ["kind", "readingId", "sequent", "hypotheses", "steps", "conclusion", "reading", "proven", "obstructions"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.lambek.reading-proof" },
    readingId: { type: "string", minLength: 1 },
    sequent: sequentSchema,
    hypotheses: { type: "array", items: hypothesisSchema },
    steps: { type: "array", items: stepSchema },
    conclusion: { type: "string", minLength: 1 },
    reading: readingSchema,
    proven: { type: "boolean" },
    obstructions: { type: "array", items: { type: "string" } },
  },
};

export const lambekForestProofSchema = {
  $id: "communicating/parsing/lambek-forest-proof",
  type: "object",
  required: ["kind", "text", "proofs", "reading", "proven", "laws"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.lambek.forest-proof" },
    text: { type: "string" },
    proofs: { type: "array", items: lambekForestReadingProofSchema },
    reading: readingSchema,
    proven: { type: "boolean" },
    laws: { type: "object", additionalProperties: true },
  },
};

export const lambekForestReadingProofCarrier = schemaFrom(lambekForestReadingProofSchema);
export const lambekForestProofCarrier = schemaFrom(lambekForestProofSchema);

function lexicalCategory(word, arcs) {
  if (word.tags.includes("det")) return "NP/N";
  if (word.tags.includes("adj")) return "N/N";
  if (word.tags.includes("prep")) return "(NP\\NP)/NP";
  if (word.tags.includes("adv")) return "(NP\\S)\\(NP\\S)";
  if (word.tags.includes("aux")) return "(NP\\S)/(NP\\S)";
  if (word.tags.includes("verb")) {
    const hasObject = arcs.some((arc) => arc.head === word.id && arc.rel === "dobj" && arc.value !== "absurd");
    const hasSubject = arcs.some((arc) => arc.head === word.id && arc.rel === "nsubj" && arc.value !== "absurd");
    if (hasObject) return "(NP\\S)/NP";
    if (hasSubject) return "NP\\S";
    return "S";
  }
  if (word.tags.includes("noun") || word.tags.includes("pron")) return "NP";
  return "N";
}

function hypothesisReading(word) {
  return word.connected === "void" ? "absurd" : word.connected === "ambiguous" ? "stable" : "potential";
}

function hypotheses(reading) {
  return Object.freeze(reading.parse.words.map((word) => Object.freeze({
    wordId: word.id,
    text: word.text,
    category: lexicalCategory(word, reading.parse.arcs),
    reading: hypothesisReading(word),
  })));
}

function arcStep(arc) {
  if (arc.value === "absurd") return null;
  switch (arc.rel) {
    case "dobj":
    case "pobj":
      return Object.freeze({
        rule: "right-residual-application",
        premises: Object.freeze([arc.head, arc.dependent]),
        conclusion: arc.rel === "dobj" ? "NP\\S" : "NP\\NP",
        reading: arc.value,
        evidence: arc.rel,
      });
    case "nsubj":
      return Object.freeze({
        rule: "left-residual-application",
        premises: Object.freeze([arc.dependent, arc.head]),
        conclusion: "S",
        reading: arc.value,
        evidence: arc.rel,
      });
    case "det":
    case "amod":
    case "advmod":
    case "prep":
    case "obl":
    case "case":
    case "ccomp":
    case "mark":
    case "discourse":
      return Object.freeze({
        rule: "right-residual-application",
        premises: Object.freeze([arc.head, arc.dependent]),
        conclusion: arc.rel === "advmod" ? "NP\\S" : "NP",
        reading: arc.value,
        evidence: arc.rel,
      });
    default:
      return null;
  }
}

function readingProof(reading) {
  const hs = hypotheses(reading);
  const lexicalSteps = Object.freeze(hs.map((hypothesis) => Object.freeze({
    rule: "lexical",
    premises: Object.freeze([hypothesis.wordId]),
    conclusion: hypothesis.category,
    reading: hypothesis.reading,
    evidence: hypothesis.text,
  })));
  const dependencySteps = Object.freeze(reading.parse.arcs
    .map(arcStep)
    .filter((step) => step !== null));
  const obstructionSteps = Object.freeze(reading.obstructions.map((obstruction) => Object.freeze({
    rule: "obstruction",
    premises: Object.freeze([obstruction.on]),
    conclusion: obstruction.label,
    reading: obstruction.value,
    evidence: obstruction.kind,
  })));
  const hasSentence = dependencySteps.some((step) => step.conclusion === "S");
  const proven = reading.glued && reading.complete && hasSentence;
  const proof = Object.freeze({
    kind: "communicating.lambek.reading-proof",
    readingId: reading.id,
    sequent: Object.freeze({
      antecedent: Object.freeze(hs.map((hypothesis) => hypothesis.category)),
      succedent: "S",
    }),
    hypotheses: hs,
    steps: Object.freeze([
      ...lexicalSteps,
      ...dependencySteps,
      ...(proven ? [Object.freeze({
        rule: "sentence-introduction",
        premises: Object.freeze(dependencySteps.filter((step) => step.conclusion === "S").flatMap((step) => step.premises)),
        conclusion: "S",
        reading: "potential",
        evidence: "reading.glued.complete",
      })] : []),
      ...obstructionSteps,
    ]),
    conclusion: proven ? "S" : "unproved",
    reading: proven ? "potential" : reading.reading,
    proven,
    obstructions: Object.freeze(reading.obstructions.map((obstruction) => `${obstruction.kind}:${obstruction.label}:${obstruction.on}`)),
  });
  lambekForestReadingProofCarrier.assert(proof, "lambek reading proof");
  return proof;
}

function lawsWitness() {
  return laws(booleanCommutativeLambekAlgebra);
}

export function lambekProofOfForest(forest) {
  const proofs = Object.freeze(forest.readings.map(readingProof));
  const proof = Object.freeze({
    kind: "communicating.lambek.forest-proof",
    text: forest.text,
    proofs,
    reading: proofs.every((reading) => reading.proven) ? "potential" : forest.reading,
    proven: proofs.length > 0 && proofs.every((reading) => reading.proven),
    laws: lawsWitness(),
  });
  lambekForestProofCarrier.assert(proof, "lambek forest proof");
  return proof;
}
