/**
 * english/lambek — type-logical proof sketches over parse forests.
 *
 * Each reading is read as a Lambek-style sequent: lexical hypotheses from POS
 * tags, dependency-licensed proof steps from accepted arcs, and a
 * sentence-introduction step gated on the reading's real arc-graph cohomology
 * (`glued`/`complete`, from `parsing.mts`'s `cohomologyOfCells` reading) rather
 * than a per-arc charge. The finite Lambek algebra law witness is metroplat's
 * own `core/closure/analysis/lambek-calculus` — this module reads a sentence into
 * a sequent over that algebra, it does not re-derive the algebra's residuation
 * laws.
 */
import { booleanCommutativeLambekAlgebra, laws, type LambekLawsJudgment } from "../../math/topology/lambek-calculus.mts";
import { lambekForestProofContract, lambekParseProofContract } from "./schema.mts";
import type { ParseForest, ParsedArc, ParsedWord, SentenceParse } from "./types.mts";

export type LambekProofRule =
  | "lexical"
  | "left-residual-application"
  | "right-residual-application"
  | "sentence-introduction";

export interface LambekHypothesis {
  readonly wordId: string;
  readonly text: string;
  readonly category: string;
  readonly connected: boolean;
}

export interface LambekProofStep {
  readonly rule: LambekProofRule;
  readonly premises: readonly string[];
  readonly conclusion: string;
  readonly evidence: string;
}

export interface LambekSequent {
  readonly antecedent: readonly string[];
  readonly succedent: string;
}

export interface LambekParseProof {
  readonly kind: "parsing.lambek.parse-proof";
  readonly parseId: string;
  readonly sequent: LambekSequent;
  readonly hypotheses: readonly LambekHypothesis[];
  readonly steps: readonly LambekProofStep[];
  readonly conclusion: string;
  readonly proven: boolean;
}

export interface LambekForestProof {
  readonly kind: "parsing.lambek.forest-proof";
  readonly text: string;
  readonly proofs: readonly LambekParseProof[];
  readonly proven: boolean;
  readonly laws: LambekLawsJudgment;
}

function lexicalCategory(word: ParsedWord, arcs: readonly ParsedArc[]): string {
  if (word.tags.includes("det")) return "NP/N";
  if (word.tags.includes("adj")) return "N/N";
  if (word.tags.includes("prep")) return "(NP\\NP)/NP";
  if (word.tags.includes("adv")) return "(NP\\S)\\(NP\\S)";
  if (word.tags.includes("aux")) return "(NP\\S)/(NP\\S)";
  if (word.tags.includes("verb")) {
    const hasObject = arcs.some((arc) => arc.head === word.id && arc.rel === "dobj");
    const hasSubject = arcs.some((arc) => arc.head === word.id && arc.rel === "nsubj");
    if (hasObject) return "(NP\\S)/NP";
    if (hasSubject) return "NP\\S";
    return "S";
  }
  if (word.tags.includes("noun") || word.tags.includes("pron")) return "NP";
  return "N";
}

function hypotheses(reading: SentenceParse): readonly LambekHypothesis[] {
  return Object.freeze(reading.parse.words.map((word) => Object.freeze({
    wordId: word.id,
    text: word.text,
    category: lexicalCategory(word, reading.parse.arcs),
    connected: word.connected,
  })));
}

function arcStep(arc: ParsedArc): LambekProofStep | null {
  switch (arc.rel) {
    case "dobj":
    case "pobj":
      return Object.freeze({
        rule: "right-residual-application" as const,
        premises: Object.freeze([arc.head, arc.dependent]),
        conclusion: arc.rel === "dobj" ? "NP\\S" : "NP\\NP",
        evidence: arc.rel,
      });
    case "nsubj":
      return Object.freeze({
        rule: "left-residual-application" as const,
        premises: Object.freeze([arc.dependent, arc.head]),
        conclusion: "S",
        evidence: arc.rel,
      });
    case "det":
    case "amod":
    case "advmod":
    case "prep":
    case "discourse":
      return Object.freeze({
        rule: "right-residual-application" as const,
        premises: Object.freeze([arc.head, arc.dependent]),
        conclusion: arc.rel === "advmod" ? "NP\\S" : "NP",
        evidence: arc.rel,
      });
    default:
      return null;
  }
}

function readingProof(reading: SentenceParse): LambekParseProof {
  const hs = hypotheses(reading);
  const lexicalSteps: readonly LambekProofStep[] = Object.freeze(hs.map((hypothesis) => Object.freeze({
    rule: "lexical" as const,
    premises: Object.freeze([hypothesis.wordId]),
    conclusion: hypothesis.category,
    evidence: hypothesis.text,
  })));
  const dependencySteps = Object.freeze(reading.parse.arcs.map(arcStep).filter((step): step is LambekProofStep => step !== null));
  const hasSentence = dependencySteps.some((step) => step.conclusion === "S");
  // glued/complete are read from the reading's real arc-graph cohomology
  // (H¹ vanishing / H⁰ = 1 in parsing.mts), not a per-arc charge.
  const proven = reading.glued && reading.complete && hasSentence;
  const proof = Object.freeze({
    kind: "parsing.lambek.parse-proof" as const,
    parseId: reading.id,
    sequent: Object.freeze({ antecedent: Object.freeze(hs.map((hypothesis) => hypothesis.category)), succedent: "S" }),
    hypotheses: hs,
    steps: Object.freeze([
      ...lexicalSteps,
      ...dependencySteps,
      ...(proven ? [Object.freeze({
        rule: "sentence-introduction" as const,
        premises: Object.freeze(dependencySteps.filter((step) => step.conclusion === "S").flatMap((step) => step.premises)),
        conclusion: "S",
        evidence: "parse.glued.complete",
      })] : []),
    ]),
    conclusion: proven ? "S" : "unproved",
    proven,
  });
  lambekParseProofContract.assert(proof, "English Lambek parse proof");
  return proof;
}

/** Read a parse forest into a Lambek proof per reading, evidenced by
 *  metroplat's own finite Lambek algebra law witness (not re-derived here). */
export function lambekProofOfForest(forest: ParseForest): LambekForestProof {
  const proofs = Object.freeze(forest.readings.map(readingProof));
  const proof = Object.freeze({
    kind: "parsing.lambek.forest-proof" as const,
    text: forest.text,
    proofs,
    proven: proofs.length > 0 && proofs.every((reading) => reading.proven),
    laws: laws(booleanCommutativeLambekAlgebra),
  });
  lambekForestProofContract.assert(proof, "English Lambek forest proof");
  return proof;
}
