/**
 * analysis/jeandel-rao-witness - finite Jeandel-Rao AP cohomology witnesses.
 *
 * This is the executable finite shadow of:
 * - RelMath.Aperiodic.Witness.JeandelRao
 * - RelMath.Aperiodic.Witness.JeandelRaoSubstitution
 * - RelMath.Aperiodic.Witness.JeandelRaoSubstitutionTower
 * - RelMath.Aperiodic.Witness.JeandelRaoPersistence
 *
 * It models the one-vertex Anderson-Putnam cochain complexes from the Lean
 * module, checks the degree-1 coboundary, packages the two nonzero H1 witness
 * cochains, and transcribes the finite marker-domino pullback/tower receipts.
 * It does not claim Jeandel-Rao aperiodicity or identify the finite tower map
 * with the literal Labbe recognizable substitution matrix.
 */
import { type Matrix, type Natural } from "./exact-number.mjs";
export interface OneVertexComplex {
    readonly kind: "jeandelRao.oneVertexComplex";
    readonly name: string;
    readonly edges: readonly string[];
    readonly faces: readonly string[];
    readonly d2: Matrix;
    readonly h1RankClaim?: Natural;
}
export interface Cochain {
    readonly kind: "jeandelRao.cochain";
    readonly complex: string;
    readonly values: Readonly<Record<string, number>>;
}
export interface NonzeroH1Witness {
    readonly kind: "jeandelRao.nonzeroH1:witness";
    readonly theorem: "RelMath.Aperiodic.Witness.jeandelRaoMarker01_nonzero_h1_shadow" | "RelMath.Aperiodic.Witness.markerRing_b3_nonzero_h1_shadow";
    readonly complex: OneVertexComplex;
    readonly cochain: Cochain;
    readonly delta1: readonly number[];
    readonly isCocycle: true;
    readonly nonzeroEdge: string;
    readonly nonzeroValue: number;
    readonly delta0Vanishes: true;
    readonly h1Rank: Natural;
    readonly h1RankMatchesLeanClaim: boolean;
    readonly representsNonzeroH1: true;
    readonly scopeBoundary: "finite local AP witness only; no Jeandel-Rao aperiodicity or direct-limit persistence";
}
export interface JeandelRaoWitnessReceipt {
    readonly kind: "jeandelRao.receipt:witness";
    readonly decoratedPhi: NonzeroH1Witness;
    readonly markerRingB3: NonzeroH1Witness;
    readonly decoratedPullbackBoundary: "phi is the pullback of b3 along the transcribed marker-domino chain map";
    readonly persistenceBoundary: "finite substitution tower persists b3; literal Labbe matrix identification remains residual";
    readonly substitutionPullback: SubstitutionPullbackReceipt;
    readonly substitutionTower: SubstitutionTowerReceipt;
    readonly persistence: JeandelRaoPersistenceReceipt;
}
export interface SubstitutionPullbackReceipt {
    readonly kind: "jeandelRao.receipt:substitutionPullback";
    readonly theorem: "RelMath.Aperiodic.Witness.jr_substitution_pullback";
    readonly subEdge: Readonly<Record<string, string>>;
    readonly subFace: Readonly<Record<string, Readonly<Record<string, number>>>>;
    readonly pulledBackB3: Cochain;
    readonly equalsPhi: true;
    readonly chainMapRows: readonly ChainMapRow[];
    readonly cocyclePreserved: true;
    readonly nonzeroEdge: string;
}
export interface ChainMapRow {
    readonly face: string;
    readonly jrDelta: number;
    readonly negativeMarkerG3Delta: number;
    readonly holds: true;
}
export interface SubstitutionTowerReceipt {
    readonly kind: "jeandelRao.receipt:substitutionTower";
    readonly theorem: "RelMath.Aperiodic.Witness.jr_substitution_tower";
    readonly recEdge: Readonly<Record<string, string>>;
    readonly returnedPhi: Cochain;
    readonly recPullPhiEqualsB3: true;
    readonly sigmaB3: Cochain;
    readonly sigmaB3EqualsB3: true;
    readonly iteratesChecked: readonly Cochain[];
    readonly everyCheckedIterateEqualsB3: true;
    readonly b3NonzeroInDirectLimit: true;
    readonly residualScope: "identifying sigma with the literal Labbe recognizable substitution matrix is not claimed";
}
export interface JeandelRaoPersistenceReceipt {
    readonly kind: "jeandelRao.receipt:persistence";
    readonly sourceModule: "RelMath.Aperiodic.Witness.JeandelRaoPersistence";
    readonly theorem: "RelMath.Aperiodic.Witness.jeandel_rao_persistence";
    readonly base: NonzeroH1Witness;
    readonly decoratedSigmaPhi: Cochain;
    readonly decoratedSigmaPhiEqualsPhi: true;
    readonly checkedThrough: number;
    readonly iteratesChecked: readonly Cochain[];
    readonly everyCheckedIterateEqualsPhi: true;
    readonly nonzeroAtEveryIterateByFixedPoint: true;
    readonly frontierBoundary: "finite decorated endomap fixes phi; the Lean frontier remains the literal marker-domino substitution endomorphism preserving nonzero H1 in the full AP direct limit";
}
/** The decorated marker-domino witness complex `jrComplex`. */
export declare const jrComplex: OneVertexComplex;
/** The decorated cochain `phi`, supported on `e2` and `e3`. */
export declare const phi: Cochain;
/** The marker-ring quotient complex. */
export declare const markerRingComplex: OneVertexComplex;
/** The isolated marker-ring class `b3 = q1 + q2 + q5`. */
export declare const b3: Cochain;
/** The marker-domino substitution on 1-cells, `jrComplex -> markerRingComplex`. */
export declare const subEdge: Readonly<Record<string, string>>;
/** The substitution sends every witness face to the integer 2-chain `-g3`. */
export declare const subFace: Readonly<Record<string, Readonly<Record<string, number>>>>;
/** The recognizability return on 1-cells, `markerRingComplex -> jrComplex`. */
export declare const recEdge: Readonly<Record<string, string>>;
/** The degree-1 coboundary `delta1(cochain)(face) = sum_e d2(face,e) * cochain(e)`. */
export declare function delta1(complex: OneVertexComplex, cochain: Cochain): readonly number[];
export declare function isCocycle(complex: OneVertexComplex, cochain: Cochain): boolean;
export declare function nonzeroSupport(complex: OneVertexComplex, cochain: Cochain): readonly string[];
/** Since the AP complexes are one-vertex, `delta0 = 0`; H1 rank is `|edges| - rank(delta1)`. */
export declare function h1Rank(complex: OneVertexComplex): Natural;
/** Pull a marker-ring cochain back to the decorated witness complex along `subEdge`. */
export declare function subPull(markerCochain: Cochain): Cochain;
/** Pull a decorated witness cochain back to the marker-ring complex along `recEdge`. */
export declare function recPull(decoratedCochain: Cochain): Cochain;
/** The substitution endomorphism `sigma = recPull . subPull` on marker-ring cochains. */
export declare function sigma(markerCochain: Cochain): Cochain;
/** The decorated substitution endomorphism `subPull . recPull` on JR cochains. */
export declare function decoratedSigma(decoratedCochain: Cochain): Cochain;
export declare function sigmaIter(iterations: number, markerCochain: Cochain): Cochain;
export declare function decoratedSigmaIter(iterations: number, decoratedCochain: Cochain): Cochain;
export declare function chainMapRows(markerCochain: Cochain): readonly ChainMapRow[];
export declare function nonzeroH1Witness(theorem: NonzeroH1Witness["theorem"], complex: OneVertexComplex, cochain: Cochain): NonzeroH1Witness;
export declare function decoratedPhiWitness(): NonzeroH1Witness;
export declare function markerRingB3Witness(): NonzeroH1Witness;
export declare function substitutionPullbackReceipt(): SubstitutionPullbackReceipt;
export declare function substitutionTowerReceipt(iterations?: number): SubstitutionTowerReceipt;
export declare function persistenceReceipt(iterations?: number): JeandelRaoPersistenceReceipt;
export declare function receipt(): JeandelRaoWitnessReceipt;
