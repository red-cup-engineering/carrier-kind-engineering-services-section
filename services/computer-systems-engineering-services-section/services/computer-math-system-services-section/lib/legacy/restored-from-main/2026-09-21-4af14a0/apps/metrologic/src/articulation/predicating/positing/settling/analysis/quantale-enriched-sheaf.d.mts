/**
 * analysis/quantale-enriched-sheaf - finite executable shadow of
 * RelMath.Cohomology.QuantaleEnrichedSheaf.
 *
 * Lean builds a commutative unital quantale on FOUR/Charge, Q-categories,
 * Q-functors, q-fuzzy equivalence composition, and the degree-0 enriched
 * Laplacian fixed-point witness. This module exposes the finite charge-quantale
 * instance and bounded Q-category/equivalence receipts.
 */
import { type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
export interface ChargeQuantaleReceipt {
    readonly kind: "quantaleEnrichedSheaf.chargeQuantale:witness";
    readonly carrier: readonly ChargeValueName[];
    readonly bottom: ChargeValueName;
    readonly top: ChargeValueName;
    readonly one: ChargeValueName;
    readonly multiplication: "knowledge-meet";
    readonly order: "knowledge";
    readonly leReflexive: true;
    readonly leTransitive: true;
    readonly leAntisymmetric: true;
    readonly supUpperBound: true;
    readonly supLeastUpperBound: true;
    readonly mulAssociative: true;
    readonly mulCommutative: true;
    readonly oneIsUnit: true;
    readonly mulDistributesOverSup: true;
    readonly mulMonotone: true;
}
export interface QCatCarrier {
    readonly kind: "quantaleEnrichedSheaf.qcat";
    readonly objects: readonly string[];
    readonly hom: Readonly<Record<string, ChargeValueName>>;
}
export interface QFunctorCarrier {
    readonly kind: "quantaleEnrichedSheaf.qfunctor";
    readonly sourceObjects: readonly string[];
    readonly targetObjects: readonly string[];
    readonly map: Readonly<Record<string, string>>;
    readonly preservesHomsUpward: true;
}
export interface QCategoryReceipt {
    readonly kind: "quantaleEnrichedSheaf.qcategory:witness";
    readonly oneObject: QCatCarrier;
    readonly discrete: QCatCarrier;
    readonly identityFunctor: QFunctorCarrier;
    readonly composedFunctor: QFunctorCarrier;
    readonly oneObjectReflexive: true;
    readonly oneObjectComposition: true;
    readonly discreteReflexive: true;
    readonly discreteComposition: true;
    readonly identityPreservesHoms: true;
    readonly compositionPreservesHoms: true;
}
export interface QFuzzyEquivalenceReceipt {
    readonly kind: "quantaleEnrichedSheaf.qFuzzyEquivalence:witness";
    readonly leftGrade: ChargeValueName;
    readonly rightGrade: ChargeValueName;
    readonly compositeGrade: ChargeValueName;
    readonly strictGrade: ChargeValueName;
    readonly compositionMultipliesGrade: true;
    readonly strictGradeReducesToRoundTripUnit: true;
    readonly roundTripBoundsHold: true;
}
export interface H0LaplacianReceipt {
    readonly kind: "quantaleEnrichedSheaf.h0Laplacian:witness";
    readonly weight: ChargeValueName;
    readonly fixedPoints: readonly ChargeValueName[];
    readonly laplacianTable: Readonly<Record<ChargeValueName, ChargeValueName>>;
    readonly laplacianIdempotent: true;
    readonly fixedPointsClosedUnderJoin: true;
}
export interface QuantaleEnrichedSheafReceipt {
    readonly kind: "quantaleEnrichedSheaf.receipt:witness";
    readonly quantale: ChargeQuantaleReceipt;
    readonly qcategory: QCategoryReceipt;
    readonly fuzzyEquivalence: QFuzzyEquivalenceReceipt;
    readonly h0: H0LaplacianReceipt;
    readonly openFrontier: readonly string[];
}
export declare const mul: (left: ChargeValueName, right: ChargeValueName) => ChargeValueName;
export declare const sup: (members: readonly ChargeValueName[]) => ChargeValueName;
export declare const le: (left: ChargeValueName, right: ChargeValueName) => boolean;
export declare function qcat(objects: readonly string[], hom: Readonly<Record<string, ChargeValueName>>): QCatCarrier;
export declare function hom(cat: QCatCarrier, from: string, to: string): ChargeValueName;
export declare function qcatReflexive(cat: QCatCarrier): boolean;
export declare function qcatCompositional(cat: QCatCarrier): boolean;
export declare function qfunctor(source: QCatCarrier, target: QCatCarrier, mapInput: Readonly<Record<string, string>>): QFunctorCarrier;
export declare function composeFunctor(source: QCatCarrier, middle: QCatCarrier, target: QCatCarrier, left: QFunctorCarrier, right: QFunctorCarrier): QFunctorCarrier;
export declare function oneObjectQCat(): QCatCarrier;
export declare function discreteQCat(objects?: readonly string[]): QCatCarrier;
export declare function chargeQuantaleReceipt(): ChargeQuantaleReceipt;
export declare function qcategoryReceipt(): QCategoryReceipt;
export declare function qFuzzyEquivalenceReceipt(leftGrade?: ChargeValueName, rightGrade?: ChargeValueName): QFuzzyEquivalenceReceipt;
export declare const laplacian: (weight: ChargeValueName, x: ChargeValueName) => ChargeValueName;
export declare function h0LaplacianReceipt(weight?: ChargeValueName): H0LaplacianReceipt;
export declare function receipt(): QuantaleEnrichedSheafReceipt;
