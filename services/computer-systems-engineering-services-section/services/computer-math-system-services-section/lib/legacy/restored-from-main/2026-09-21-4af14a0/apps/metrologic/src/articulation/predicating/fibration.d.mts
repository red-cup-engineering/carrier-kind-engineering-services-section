/**
 * predicating/fibration - finite predication fibration and arrows-first reads.
 *
 * This is the executable shadow of the green RelMath predicating cluster. It is
 * derived from the package's existing predication-site and FOUR carriers:
 * predication cells are serialized as signatures, base arrows are read from the
 * materialized site, and valuation fibers are finite charge-name tables keyed by
 * those cell signatures.
 *
 * The runtime surface does not introduce a second category implementation. It
 * gives RMN-portable witnesses for the finite claims that can be checked over
 * existing `PredicationSite` data: incoming-arrow recovery, reindexing as
 * precomposition, bilattice-homomorphic reindexing, temporal composition, and
 * theory-relative ideal restriction.
 */
import { type ChargeValueName } from "../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type Cell, type PredicationSite } from "./predication.mjs";
export type PredicationObjectKind = "term" | "predicate" | "cell";
export interface PredicationCellSignature {
    readonly kind: "predication.cellSignature";
    readonly subject: string;
    readonly predicate: string;
    readonly object: string;
}
export interface PredicationObjectSignature {
    readonly kind: "predication.objectSignature";
    readonly objectKind: PredicationObjectKind;
    readonly key: string;
}
export interface PredicationArrowSignature {
    readonly kind: "predication.arrowSignature";
    readonly name: string;
    readonly generator: "identity" | "specialization" | "converse" | "subjectProjection" | "objectProjection";
    readonly from: string;
    readonly to: string;
}
export interface PredicationCategoryShadow {
    readonly kind: "predication.categoryShadow";
    readonly objects: readonly PredicationObjectSignature[];
    readonly arrows: readonly PredicationArrowSignature[];
}
export interface YonedaRecoveryWitness {
    readonly kind: "predication.yonedaRecovery:witness";
    readonly left: string;
    readonly right: string;
    readonly leftIncoming: readonly PredicationArrowSignature[];
    readonly rightIncoming: readonly PredicationArrowSignature[];
    readonly sameObject: boolean;
    readonly sameIncomingBundle: boolean;
    readonly objectRecoveredFromArrows: true;
}
export interface FinitePredicationValuation {
    readonly kind: "predication.finiteValuation";
    readonly cells: readonly PredicationCellSignature[];
    readonly values: Readonly<Record<string, ChargeValueName>>;
}
export interface PredicationEmbeddingEntry {
    readonly kind: "predication.embeddingEntry";
    readonly resource: PredicationCellSignature;
    readonly host: PredicationCellSignature;
}
export interface PredicationEmbedding {
    readonly kind: "predication.embedding";
    readonly entries: readonly PredicationEmbeddingEntry[];
}
export interface ReindexWitness {
    readonly kind: "predication.reindex:witness";
    readonly embedding: PredicationEmbedding;
    readonly host: FinitePredicationValuation;
    readonly resource: FinitePredicationValuation;
    readonly cellwise: true;
}
export interface BilatticeHomomorphismWitness {
    readonly kind: "predication.reindexBilatticeHom:witness";
    readonly embedding: PredicationEmbedding;
    readonly preservesMeetK: true;
    readonly preservesJoinK: true;
    readonly preservesMeetT: true;
    readonly preservesJoinT: true;
    readonly preservesNegation: true;
    readonly preservesFusion: true;
    readonly preservesResidual: true;
}
export interface GrothendieckTransposeWitness {
    readonly kind: "predication.grothendieckTranspose:witness";
    readonly fiberUniform: true;
    readonly identityReindex: true;
    readonly compositeReindex: true;
    readonly homomorphismValued: true;
}
export interface TemporalZeroCell {
    readonly kind: "predication.temporalZeroCell";
    readonly tau: number;
    readonly object: string;
}
export interface TemporalOneCell {
    readonly kind: "predication.temporalOneCell";
    readonly source: TemporalZeroCell;
    readonly target: TemporalZeroCell;
    readonly predicateArrow: string;
    readonly settlingAdvance: true;
}
export interface TemporalTwoCategoryWitness {
    readonly kind: "predication.temporalTwoCategory:witness";
    readonly leftIdentity: true;
    readonly rightIdentity: true;
    readonly associativity: true;
    readonly twoCellCategory: true;
    readonly beckChevalley: true;
}
export interface RelativeIdealWitness {
    readonly kind: "predication.relativeIdeal:witness";
    readonly embedding: PredicationEmbedding;
    readonly host: FinitePredicationValuation;
    readonly ideal: FinitePredicationValuation;
    readonly isReindex: true;
    readonly cellwise: true;
    readonly boundedByTop: true;
    readonly noNewContent: true;
}
export interface YonedaArrowsFirstReceipt {
    readonly kind: "predication.yonedaArrowsFirst.receipt:witness";
    readonly sourceModule: "RelMath.Predicating.YonedaArrowsFirst";
    readonly theorems: readonly [
        "yoneda_lemma",
        "yoneda_fully_faithful",
        "object_is_its_morphisms",
        "kp_object_is_its_arrows"
    ];
    readonly recovery: YonedaRecoveryWitness;
    readonly arrowsFirst: true;
}
export interface PredicationFibrationReceipt {
    readonly kind: "predication.fibration.receipt:witness";
    readonly sourceModule: "RelMath.Predicating.PredicationFibration";
    readonly theorems: readonly [
        "generator_converse",
        "reindex_is_bilattice_homomorphism",
        "fibration_grothendieck_transpose"
    ];
    readonly reindex: ReindexWitness;
    readonly homomorphism: BilatticeHomomorphismWitness;
    readonly transpose: GrothendieckTransposeWitness;
    readonly strictPresheaf: true;
}
export interface TheoryRelativeIdealReceipt {
    readonly kind: "predication.theoryRelativeIdeal.receipt:witness";
    readonly sourceModule: "RelMath.Predicating.TheoryRelativeIdeal";
    readonly theorems: readonly [
        "relativeIdeal_eq_reindex",
        "theory_relative_ideal_is_reindex",
        "relativeIdeal_mono",
        "relative_ideal_settled"
    ];
    readonly ideal: RelativeIdealWitness;
    readonly reindex: ReindexWitness;
    readonly settledRestriction: true;
    readonly boundary: "resource closure fixed point is not claimed";
}
export declare function signatureOfCell(cell: Cell): PredicationCellSignature;
export declare const cellSignatureKey: (cell: PredicationCellSignature) => string;
/** Read the finite base category generated by an existing `PredicationSite`. */
export declare function predicationCategoryShadow(site: PredicationSite): PredicationCategoryShadow;
export declare const incomingArrows: (category: PredicationCategoryShadow, objectKey: string) => readonly PredicationArrowSignature[];
/** Finite Yoneda read: an object is distinguished by its incoming-arrow bundle. */
export declare function yonedaRecovery(category: PredicationCategoryShadow, left: string, right: string): YonedaRecoveryWitness;
export declare function finitePredicationValuation(cells: readonly PredicationCellSignature[], values: Readonly<Record<string, ChargeValueName>>): FinitePredicationValuation;
export declare const finiteValuationFromCells: (cells: readonly Cell[], values: Readonly<Record<string, ChargeValueName>>) => FinitePredicationValuation;
export declare function embedding(entries: readonly [resource: PredicationCellSignature, host: PredicationCellSignature][]): PredicationEmbedding;
export declare function reindexValuation(embed: PredicationEmbedding, host: FinitePredicationValuation): FinitePredicationValuation;
export declare function reindexWitness(embed: PredicationEmbedding, host: FinitePredicationValuation): ReindexWitness;
/** Reindexing is pointwise precomposition, so it preserves the finite bilattice operations. */
export declare function reindexBilatticeHomomorphism(embed: PredicationEmbedding, left: FinitePredicationValuation, right: FinitePredicationValuation): BilatticeHomomorphismWitness;
export declare function grothendieckTranspose(embed: PredicationEmbedding, host: FinitePredicationValuation): GrothendieckTransposeWitness;
export declare function temporalZeroCell(tau: number, object: string): TemporalZeroCell;
export declare function temporalOneCell(source: TemporalZeroCell, target: TemporalZeroCell, predicateArrow: string): TemporalOneCell;
export declare function temporalTwoCategory(_left: TemporalOneCell, _right: TemporalOneCell): TemporalTwoCategoryWitness;
export declare function relativeIdeal(embed: PredicationEmbedding, host: FinitePredicationValuation): RelativeIdealWitness;
export declare function yonedaArrowsFirstReceipt(category: PredicationCategoryShadow, left: string, right: string): YonedaArrowsFirstReceipt;
export declare function predicationFibrationReceipt(embed: PredicationEmbedding, host: FinitePredicationValuation, otherHost: FinitePredicationValuation): PredicationFibrationReceipt;
export declare function theoryRelativeIdealReceipt(embed: PredicationEmbedding, host: FinitePredicationValuation): TheoryRelativeIdealReceipt;
