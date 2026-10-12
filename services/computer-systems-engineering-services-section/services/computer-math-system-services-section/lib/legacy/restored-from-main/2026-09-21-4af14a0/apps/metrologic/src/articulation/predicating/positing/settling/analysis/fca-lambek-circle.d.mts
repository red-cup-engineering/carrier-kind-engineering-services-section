/**
 * analysis/fca-lambek-circle - finite receipts for RelMath.Order.FCALambekCircle.
 *
 * This surface closes the executable part of the FCA -> Lambek ->
 * residuated-lattice -> settling-closure circle over finite carriers. The Wurm /
 * Pentus model-theoretic completeness edge remains a documented boundary.
 */
import { type LambekLawsObstruction, type LambekLawsWitness } from "./lambek-calculus.mjs";
import { type FiniteResiduatedLatticeSystem, type ResiduatedLatticeObstruction } from "./residuated-lattice.mjs";
export interface FcaContextCell {
    readonly subject: string;
    readonly predicate: string;
}
export interface FiniteFcaContext {
    readonly kind: "fcaLambek.finiteContext";
    readonly cells: readonly FcaContextCell[];
    readonly subjects: readonly string[];
    readonly predicates: readonly string[];
}
export declare function finiteFcaContext(cells: readonly FcaContextCell[]): FiniteFcaContext;
export declare const intentOfExtent: (context: FiniteFcaContext, extent: readonly string[]) => readonly string[];
export declare const extentOfIntent: (context: FiniteFcaContext, intent: readonly string[]) => readonly string[];
export declare const closeExtent: (context: FiniteFcaContext, extent: readonly string[]) => readonly string[];
export declare const closeIntent: (context: FiniteFcaContext, intent: readonly string[]) => readonly string[];
export interface FormalConceptAnalysisReceipt {
    readonly kind: "fca.formalConceptAnalysis.receipt:witness";
    readonly sourceModule: "RelMath.Order.FormalConceptAnalysis";
    readonly theorems: readonly [
        "RelMath.FCA.prime_adjunction",
        "RelMath.FCA.primeA_antitone",
        "RelMath.FCA.primeB_antitone",
        "RelMath.FCA.subA_closeA",
        "RelMath.FCA.primeA_closeA",
        "RelMath.FCA.closeA_mono",
        "RelMath.FCA.closeA_idem",
        "RelMath.FCA.derivation_galois_connection",
        "RelMath.FCA.Concept.extent_closed",
        "RelMath.FCA.familyMeet_le",
        "RelMath.FCA.familyJoin_ge",
        "RelMath.FCA.implies_iff_closeM",
        "RelMath.FCA.conceptLatticeData"
    ];
    readonly contextSubjects: readonly string[];
    readonly contextPredicates: readonly string[];
    readonly sampleExtent: readonly string[];
    readonly sampleIntent: readonly string[];
    readonly sampleClosedExtent: readonly string[];
    readonly closedExtents: readonly (readonly string[])[];
    readonly primeAdjunction: true;
    readonly primeAAntitone: true;
    readonly primeBAntitone: true;
    readonly closeAExtensive: true;
    readonly primeACancelsClosure: true;
    readonly closeAMonotone: true;
    readonly closeAIdempotent: true;
    readonly conceptExtentsClosed: true;
    readonly conceptMeetClosed: true;
    readonly conceptJoinClosed: true;
    readonly implicationCharacterization: true;
}
/** Finite receipt for the Boolean derivation/Galois core of `RelMath.FCA`. */
export declare function formalConceptAnalysisReceipt(context?: FiniteFcaContext, sampleExtent?: readonly string[]): FormalConceptAnalysisReceipt;
export interface FcaLambekCircleWitness {
    readonly kind: "fcaLambek.circle:witness";
    readonly contextSubjects: readonly string[];
    readonly contextPredicates: readonly string[];
    readonly extentsChecked: number;
    readonly closedExtentCount: number;
    readonly fcaClosureIsSettlingClosure: true;
    readonly conceptLatticeFiniteComplete: true;
    readonly residuatedAsCommutativeLambek: true;
    readonly lambek: LambekLawsWitness;
    readonly commutativeCollapse: true;
    readonly modelTheoreticClosingEdge: "documented-boundary";
}
export interface FcaLambekCircleObstruction {
    readonly kind: "fcaLambek.circle-obstruction";
    readonly reason: "fca.extensive" | "fca.monotone" | "fca.idempotent" | "concept.meet" | "concept.join" | "residuated" | "lambek" | "commutativeCollapse";
    readonly extent?: readonly string[];
    readonly extent2?: readonly string[];
    readonly closed?: readonly string[];
    readonly residuated?: ResiduatedLatticeObstruction;
    readonly lambek?: LambekLawsObstruction;
}
export type FcaLambekCircleJudgment = FcaLambekCircleWitness | FcaLambekCircleObstruction;
/** Finite receipt for the proved algebraic edges of `RelMath.Order.FCALambekCircle`. */
export declare function circle(context: FiniteFcaContext, residuated: FiniteResiduatedLatticeSystem): FcaLambekCircleJudgment;
export declare const workedContext: FiniteFcaContext;
