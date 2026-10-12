/**
 * analysis/bigraded-cohomology - finite executable shadow of
 * RelMath.Positing.BigradedCohomology.
 *
 * Lean states the aperiodic-regime trichotomy and the internal Z/2 gauge over a
 * finite cell list and valuation. This runtime surface takes the finite list of
 * FOUR charge names that results from such a valuation and returns the
 * truth/inconsistency content, regime, and gauge facts as a carrier receipt.
 */
import { type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type ChargedCell, type CochainCarrier } from "./settling-associated-sheaf.mjs";
export type BigradedRegimeName = "trivial" | "consistent" | "paraconsistent" | "mixed";
export interface BigradedCohomologyReceipt {
    readonly kind: "bigradedCohomology.receipt:witness";
    readonly charges: readonly ChargeValueName[];
    readonly negated: readonly ChargeValueName[];
    readonly truthContent: boolean;
    readonly falseContent: boolean;
    readonly inconsistencyContent: boolean;
    readonly regime: BigradedRegimeName;
    readonly nontrivialTrichotomy: true;
    readonly truthInconsistencyDisjoint: true;
    readonly gaugeFixesInconsistency: true;
    readonly gaugeFlipsTruthToFalse: true;
    readonly paraconsistentGaugeStable: boolean;
    readonly classicalGaugeMoved: boolean;
}
export interface TruthKnowledgeSectionDecompositionReceipt {
    readonly kind: "bigradedCohomology.truthKnowledgeSectionDecomposition:witness";
    readonly valuation: readonly ChargedCell[];
    readonly knowledgeSection: CochainCarrier;
    readonly truthSection: CochainCarrier;
    readonly topSection: CochainCarrier;
    readonly merged: CochainCarrier;
    readonly knowledgeSupported: true;
    readonly truthSupported: true;
    readonly topSupported: true;
    readonly mergeSplitIdentity: true;
    readonly splitMergeIdentityOnSamples: true;
    readonly h1Vanishes: true;
    readonly hnAboveOneZero: true;
    readonly degenerateLes: true;
    readonly sampleSize: number;
    readonly frontier: "full graded LES over arbitrary cochain complexes remains proof-side";
}
export interface LocalMldClassificationReceipt {
    readonly kind: "bigradedCohomology.localMldClassification.receipt:witness";
    readonly sourceModule: "RelMath.Positing.LocalMldClassification";
    readonly theorems: readonly [
        "negate_involutive",
        "gaugeEquiv_refl",
        "gaugeEquiv_symm",
        "gaugeEquiv_trans",
        "local_mld_classification",
        "bilattice_base_mld"
    ];
    readonly gaugeOrbits: readonly (readonly ChargeValueName[])[];
    readonly localClInvFibers: readonly (readonly ChargeValueName[])[];
    readonly converseIncluded: true;
}
export declare const normalizeChargeNames: (charges: readonly string[]) => readonly ChargeValueName[];
export declare const isTruthFiring: (charge: ChargeValueName) => boolean;
export declare const isFalseFiring: (charge: ChargeValueName) => boolean;
export declare const isInconsistency: (charge: ChargeValueName) => boolean;
export declare const truthContent: (charges: readonly ChargeValueName[]) => boolean;
export declare const falseContent: (charges: readonly ChargeValueName[]) => boolean;
export declare const inconsistencyContent: (charges: readonly ChargeValueName[]) => boolean;
export declare function regimeOf(truth: boolean, inconsistency: boolean): BigradedRegimeName;
export declare const negateNames: (charges: readonly ChargeValueName[]) => readonly ChargeValueName[];
/** Finite bigraded-cohomology and gauge receipt over a list of FOUR charge names. */
export declare function receipt(chargesInput: readonly string[]): BigradedCohomologyReceipt;
/**
 * Finite degree-0 carrier for `RelMath.Cohomology.BigradedTruthKnowledgeLES`.
 *
 * Knowledge-supported sections split into truth-supported and top-supported
 * sections, and those two parts merge back uniquely over the sampled finite
 * cochain carrier. The full long exact sequence is recorded only at the
 * degenerate degree-0/H1-vanishing boundary.
 */
export declare function truthKnowledgeSectionDecompositionReceipt(valuationInput?: readonly ChargedCell[], knowledgeSectionInput?: CochainCarrier): TruthKnowledgeSectionDecompositionReceipt;
export declare const workedMixedCharges: readonly ChargeValueName[];
export declare const workedParaconsistentCharges: readonly ChargeValueName[];
export declare function localMldClassificationReceipt(): LocalMldClassificationReceipt;
