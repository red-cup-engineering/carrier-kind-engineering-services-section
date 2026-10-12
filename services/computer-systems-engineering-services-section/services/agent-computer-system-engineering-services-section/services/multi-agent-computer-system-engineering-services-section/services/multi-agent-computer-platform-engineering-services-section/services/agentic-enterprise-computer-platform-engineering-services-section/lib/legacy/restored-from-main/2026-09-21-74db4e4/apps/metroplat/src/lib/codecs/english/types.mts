/**
 * english/types — shared structures for the dependency parser.
 *
 * A text is read as a tiered span hierarchy (document/block/sentence/clause/word),
 * then words are tagged and related by dependency-arc proposals. Every accepted
 * arc becomes a real predication `Cell` (metroplat's own `core/calculus/predicating`
 * cell structure — subject/predicate/object over opaque Tokens); the arc graph's gluing
 * is read by metroplat's own `cohomologyOfCells` (`core/closure/cohomology`, real
 * union-find connectivity + incidence-matrix cycle rank), not by a hand-rolled
 * conflict tally. A word attached to two competing heads (e.g. genuine PP-
 * attachment ambiguity) closes a cycle in that graph — H¹ > 0 finds it directly.
 */
import type { CohomologyCarrier as Cohomology } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/cohomology";

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

/** A word in a sentence, as seen during construal. */
export interface Word {
  readonly i: number;
  readonly id: string;
  readonly span: Span;
  readonly tags: readonly string[];
  readonly feats: readonly string[];
}

/** A dependency arc proposal. */
export interface Arc {
  readonly head: string;
  readonly rel: string;
  readonly dependent: string;
  readonly headSpan?: Span;
  readonly depSpan?: Span;
}

/** A proposed arc with the source rule that licensed it. */
export interface Proposal {
  readonly arc: Arc;
  readonly rule: string;
}

/** Intermediate result of construing a sentence: tagged words and arc proposals. */
export interface ConstrainedResult {
  readonly words: readonly Word[];
  readonly arcs: readonly Arc[];
}

/** Subject-verb agreement, read directly off features (not a graph fact — kept
 *  separate from the arc cohomology so a genuine agreement holding doesn't read
 *  as a spurious extra edge). */
export type Agreement = "agrees" | "disagrees" | "unknown";

export interface ParsedWord {
  readonly i: number;
  readonly id: string;
  readonly text: string;
  readonly tags: readonly string[];
  readonly feats: readonly string[];
  /** Whether this word participates in at least one accepted dependency arc. */
  readonly connected: boolean;
}

export interface ParsedArc {
  readonly rel: string;
  readonly head: string;
  readonly dependent: string;
  readonly headText: string;
  readonly depText: string;
  readonly agreement: Agreement;
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
  readonly compositions: readonly FoldPath[];
  readonly tower: FoldTower;
  /** The real cohomology of the arc graph: H⁰ = connected components (union-find
   *  over word entities), H¹ = cycle rank (extra/competing edges). */
  readonly cohomology: Cohomology;
  /** Every word appears in at least one accepted arc. */
  readonly fullyConnected: boolean;
}

export interface SentenceParse {
  readonly kind: "parsing.sentence.parse";
  readonly id: string;
  readonly span: Span;
  readonly parse: ParseResult;
  /** No competing/redundant attachment: the arc graph's H¹ vanishes. */
  readonly glued: boolean;
  /** Every word is reachable and the arc graph is one component (H⁰ = 1). */
  readonly complete: boolean;
}

export interface ParseForest {
  readonly kind: "parsing.forest";
  readonly text: string;
  readonly readings: readonly SentenceParse[];
  readonly glued: boolean;
  readonly complete: boolean;
}
