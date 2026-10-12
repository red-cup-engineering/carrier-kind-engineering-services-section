// types.ts — the core vocabulary of language-parsing/syntaxis.
// Every span is offset-true: span.text === original[span.start:span.end].
// Every charge is a bilattice four-value; unmentioned cells default to ⊥.
import type { GrammaticalCharge, GrammaticalChargeValue } from "@561-group/language-algebra";
export type Charge = GrammaticalCharge;

// ── Spans ─────────────────────────────────────────────────────────────────────

export type Tier = "document" | "block" | "sentence" | "clause" | "word" | "rule";

/** A text span: a tier, its absolute byte offsets (null for synthesized rule-spans), and its text. */
export interface Span {
  readonly tier: Tier;
  readonly start: number | null;
  readonly end: number | null;
  readonly text: string;
}

/** Containment edge: child is nested inside parent in the tier hierarchy. */
export interface ContainmentEdge {
  readonly child: Span;
  readonly parent: Span;
}

/** Sequence edge: span follows prev in reading order within the same tier. */
export interface SequenceEdge {
  readonly span: Span;
  readonly prev: Span;
}

/** The result of articulating a text: the 2-D base of containment + sequence edges. */
export interface ArticulateResult {
  readonly text: string;
  readonly document: Span;
  readonly spans: readonly Span[];
  readonly inside: readonly ContainmentEdge[];
  readonly after: readonly SequenceEdge[];
}

// ── Parse intermediate ────────────────────────────────────────────────────────

/** A word in a sentence, as seen during construal. */
export interface Word {
  readonly i: number;
  readonly id: string;
  readonly span: Span;
  readonly tags: readonly string[];
  readonly feats: readonly string[];
}

/** A dependency arc proposal (before settling). */
export interface Arc {
  readonly head: string;
  readonly rel: string;
  readonly dependent: string;
  readonly headSpan?: Span;
  readonly depSpan?: Span;
}

/** A kernel cell entry: one (subject, predicate[, object]) triple with its initial charge. */
export interface Entry {
  readonly subject: string;
  readonly predicate: string;
  readonly object?: string;
  readonly charge: Charge;
}

/** A specialization edge on predicates: source ⊢ target (charges propagate upward). */
export interface SpecializationEdge {
  readonly source: string;
  readonly target: string;
}

/** A question posed about a word: what predicate is being asked, on what surface text. */
export interface Question {
  readonly subject: string;
  readonly predicate: string;
  readonly label: string;
  readonly on: string;
}

/** Intermediate result of construing a sentence. */
export interface ConstrainedResult {
  readonly words: readonly Word[];
  readonly arcs: readonly Arc[];
  readonly entries: readonly Entry[];
  readonly specialization: readonly SpecializationEdge[];
  readonly questions: readonly Question[];
}

// ── Descent ───────────────────────────────────────────────────────────────────

/** The settled descent API: read charges by address. Unmentioned cells return ⊥. */
export interface DescentResult {
  readonly settledCharge: (subject: string, predicate: string) => Charge;
  readonly settledArc: (head: string, rel: string, dep: string) => Charge;
}

// ── Parse output ──────────────────────────────────────────────────────────────

export type ChargeValue = GrammaticalChargeValue;
export type ChargeStatus = "decided" | "ambiguous" | "void";

export interface ParsedWord {
  readonly i: number;
  readonly id: string;
  readonly text: string;
  readonly tags: readonly string[];
  readonly feats: readonly string[];
  readonly connected: ChargeStatus;
  readonly roles: readonly string[];
}

export interface ParsedArc {
  readonly rel: string;
  readonly head: string;
  readonly dependent: string;
  readonly headText: string;
  readonly depText: string;
  readonly status: ChargeStatus;
  readonly value: ChargeValue;
}

export interface ParsedAnswer {
  readonly question: string;
  readonly on: string;
  readonly status: ChargeStatus;
  readonly value: ChargeValue;
}

export interface FoldPath {
  readonly head: string;
  readonly path: readonly string[];
  readonly dependent: string;
}

export interface FoldTower {
  readonly folds: number;
  readonly fixedPoint: boolean;
  readonly sizes: readonly number[];
}

export interface ParseResult {
  readonly words: readonly ParsedWord[];
  readonly arcs: readonly ParsedArc[];
  readonly answers: readonly ParsedAnswer[];
  readonly compositions: readonly FoldPath[];
  readonly tower: FoldTower;
  readonly conflicts: readonly ParsedAnswer[];
  readonly voids: readonly ParsedAnswer[];
}

// ── Higher language-analysis outputs ─────────────────────────────────────────

export interface KnowledgeBaseEntity {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly aliases: readonly string[];
}

export interface LinkResult {
  readonly status: "linked" | "ambiguous" | "nil";
  readonly entity: string | null;
  readonly candidates: readonly string[];
  readonly charge: Charge;
}

export interface ReferenceResolution {
  readonly anaphor: string;
  readonly status: "resolved" | "ambiguous" | "void";
  readonly antecedent: string | null;
  readonly candidates: readonly string[];
}

export interface ReferenceResult {
  readonly resolutions: readonly ReferenceResolution[];
  readonly clusters: readonly (readonly string[])[];
}

export interface CohomologyObstruction {
  readonly kind: "conflict" | "void";
  readonly label: string;
  readonly on: string;
  readonly value: ChargeValue;
}

export interface CohomologyResult {
  readonly glued: boolean;
  readonly h0: 0 | 1;
  readonly h1: number;
  readonly obstructions: readonly CohomologyObstruction[];
  readonly overdetermined: readonly CohomologyObstruction[];
  readonly underdetermined: readonly CohomologyObstruction[];
}

export interface GrammaticalityViolation {
  readonly kind: string;
  readonly detail: string;
  readonly relation?: string;
  readonly head?: string;
  readonly dependent?: string;
}

export interface GrammaticalityResult {
  readonly status: "grammatical" | "ungrammatical" | "unknown";
  readonly violations: readonly GrammaticalityViolation[];
}

// ── Language bundle types ─────────────────────────────────────────────────────

export interface BundleMeta {
  readonly name: string;
  readonly code: string;
  readonly script: string;
  readonly direction: "ltr" | "rtl";
}

export interface BundleLexicon {
  readonly determiners: readonly string[];
  readonly prepositions: readonly string[];
  readonly pronouns: readonly string[];
  readonly conjunctions: readonly string[];
  readonly auxiliaries: readonly string[];
  readonly copula: readonly string[];
}

export interface SuffixRule {
  readonly pattern: string;
  readonly tag: string;
}

export interface BundleMorphology {
  readonly suffixRules: readonly SuffixRule[];
  readonly numberSuffixPattern: string;
  readonly verbFormRules: readonly SuffixRule[];
  readonly numberWords: readonly string[];
  readonly irregularPlurals?: Readonly<Record<string, string>>;
  readonly irregularVerbs?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

export interface PronounFeatures {
  readonly person: 1 | 2 | 3;
  readonly number: "sg" | "pl" | "both" | null;
  readonly gender?: "m" | "f" | "n";
}

export interface BundleReference {
  readonly pronouns: Readonly<Record<string, PronounFeatures>>;
  readonly nameGender?: Readonly<Record<string, "m" | "f" | "n">>;
}

export interface BundleAttachment {
  readonly determiner: "left" | "right";
  readonly adjective: "left" | "right";
  readonly subject: "left" | "right";
  readonly object: "left" | "right";
}

export interface BundleSegmentation {
  readonly sentenceTerminatorPattern: string;
  readonly abbreviations: readonly string[];
}

export interface RawBundle {
  readonly meta: BundleMeta;
  readonly lexicon: BundleLexicon;
  readonly morphology: BundleMorphology;
  readonly reference: BundleReference;
  readonly wordOrder: "SVO" | "SOV" | "VSO" | "VOS" | "OVS" | "OSV" | "free";
  readonly roleBy?: "case";
  readonly attachment: BundleAttachment;
  readonly segmentation: BundleSegmentation;
}

/** Compiled language bundle: raw data resolved into fast lookup functions. */
export interface CompiledBundle {
  readonly raw: RawBundle;
  readonly meta: BundleMeta;
  readonly wordOrder: RawBundle["wordOrder"];
  readonly roleBy?: "case";
  readonly attachment: BundleAttachment;
  readonly closedClassTags: (lowerWord: string) => readonly string[];
  readonly morphologyTags: (word: string) => readonly string[];
  readonly numberFeatures: (word: string, tags: readonly string[]) => readonly ("sg" | "pl")[];
  readonly verbForm: (word: string, tags: readonly string[]) => string | null;
  readonly isCopula: (lowerWord: string) => boolean;
  readonly isPronoun: (lowerWord: string) => boolean;
  readonly pronounFeatures: (lowerWord: string) => PronounFeatures | null;
  readonly isAbbreviation: (word: string) => boolean;
  readonly sentenceTerminators: RegExp;
}
