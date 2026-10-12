/**
 * predicating/equality — finite executable shadow of
 * RelMath.Predicating.Equality.
 *
 * Equality is derived by diagonal existential image, not admitted as a primitive:
 * classical equality uses the truth-order existential over the diagonal terminal,
 * while paraconsistent equality uses the knowledge-order existential.
 */
import { type PredicationTerm } from "./predication.mjs";
import { type ChargeValue, type ChargeValueName } from "../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
export interface EqualityCell {
    readonly kind: "predicating.equality.cell";
    readonly subject: PredicationTerm;
    readonly object: PredicationTerm;
    readonly diagonal: boolean;
    readonly classical: ChargeValue;
    readonly paraconsistent: ChargeValue;
}
export interface PredicatingEqualityReceipt {
    readonly kind: "predicating.equality.receipt:witness";
    readonly cells: readonly EqualityCell[];
    readonly classicalDiagonal: ChargeValueName;
    readonly classicalOffDiagonal: ChargeValueName;
    readonly paraconsistentDiagonal: ChargeValueName;
    readonly paraconsistentOffDiagonal: ChargeValueName;
    readonly reflexiveClassical: true;
    readonly reflexiveParaconsistent: true;
    readonly sameSupport: true;
    readonly derivedFromDiagonal: true;
}
export interface FiniteFibrationCarrier {
    readonly kind: "predicating.equality.finiteFibration";
    readonly bases: readonly string[];
    readonly fibers: readonly (readonly string[])[];
}
export interface FibrationQuantifierReceipt {
    readonly kind: "predicating.equality.truthQuantifier:witness";
    readonly fibration: FiniteFibrationCarrier;
    readonly valuation: Readonly<Record<string, ChargeValueName>>;
    readonly existsTruth: Readonly<Record<string, ChargeValueName>>;
    readonly forallTruth: Readonly<Record<string, ChargeValueName>>;
    readonly emptyFiberExistsTruth: ChargeValueName;
    readonly emptyFiberForallTruth: ChargeValueName;
    readonly singletonFiberIdentity: boolean;
    readonly truthOrderAdjunctionFinite: true;
}
export declare function truthJoinList(values: readonly ChargeValue[]): ChargeValue;
export declare function truthMeetList(values: readonly ChargeValue[]): ChargeValue;
export declare function knowledgeJoinList(values: readonly ChargeValue[]): ChargeValue;
export declare function diagonalFiber(subject: PredicationTerm, object: PredicationTerm): readonly [PredicationTerm] | readonly [];
export declare function classicalEq(subject: PredicationTerm, object: PredicationTerm): ChargeValue;
export declare function paraconsistentEq(subject: PredicationTerm, object: PredicationTerm): ChargeValue;
export declare function equalityCell(subject: PredicationTerm, object: PredicationTerm): EqualityCell;
export declare function predicatingEqualityReceipt(entities: readonly PredicationTerm[]): PredicatingEqualityReceipt;
export declare function finiteFibration(bases: readonly string[], fibers: readonly (readonly string[])[]): FiniteFibrationCarrier;
export declare function truthQuantifierReceipt(fibration: FiniteFibrationCarrier, valuation: Readonly<Record<string, ChargeValueName>>): FibrationQuantifierReceipt;
