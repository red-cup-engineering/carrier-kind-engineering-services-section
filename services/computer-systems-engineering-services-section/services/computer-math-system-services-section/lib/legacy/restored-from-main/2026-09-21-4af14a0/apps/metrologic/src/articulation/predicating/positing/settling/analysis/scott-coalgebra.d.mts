/**
 * analysis/scott-coalgebra - finite executable shadow of
 * RelMath.Closure.ScottContinuousClosure and SettlingCoalgebra.
 *
 * Lean proves the corpus Scott equation over the finite FOUR charge lattice by
 * showing every finite directed family attains its knowledge join. It also
 * packages the settling coalgebra as the unfolding dual of the closure algebra.
 * This module keeps exactly that runtime boundary: finite charge families,
 * explicit pointwise closure tables, finite valuation orbits, and honest
 * proof-side markers for arbitrary dcpos and genuine 2-categorical data.
 */
import { type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type ChargeClosureCarrier, type ClosureMonadReceipt } from "../../closure-operator-fiber.mjs";
import { type ValuationFiberCarrier } from "../../index.mjs";
export interface DirectedChargeFamily {
    readonly kind: "scottCoalgebra.directedFamily.carrier";
    readonly elems: readonly ChargeValueName[];
    readonly sup: ChargeValueName;
    readonly nonempty: true;
    readonly directed: true;
    readonly supAttained: true;
}
export interface ScottContinuityReceipt {
    readonly kind: "scottCoalgebra.scottContinuity:witness";
    readonly closure: ChargeClosureCarrier;
    readonly family: DirectedChargeFamily;
    readonly left: ChargeValueName;
    readonly right: ChargeValueName;
    readonly commutesWithDirectedJoin: true;
    readonly finiteCarrierForcesAttainment: true;
    readonly finiteChargeClosureStrict: true;
}
export interface FiniteAntecedentScottReceipt {
    readonly kind: "scottCoalgebra.finiteAntecedent:witness";
    readonly antecedent: ChargeValueName;
    readonly conclusion: ChargeValueName;
    readonly family: DirectedChargeFamily;
    readonly firesOnJoinIffFiresOnMember: true;
    readonly left: ChargeValueName;
    readonly right: ChargeValueName;
    readonly commutesWithDirectedJoin: true;
}
export interface CoalgebraLimitReceipt {
    readonly kind: "scottCoalgebra.orbitLimit:witness";
    readonly limit: ValuationFiberCarrier;
    readonly dominatesPriorOrbit: true;
    readonly leastUpperBound: true;
}
export interface SettlingCoalgebraReceipt {
    readonly kind: "scottCoalgebra.settlingCoalgebra:witness";
    readonly closure: ChargeClosureCarrier;
    readonly carrier: ValuationFiberCarrier;
    readonly increment: ValuationFiberCarrier;
    readonly target: ValuationFiberCarrier;
    readonly orbit: readonly ValuationFiberCarrier[];
    readonly orbitLimit: CoalgebraLimitReceipt;
    readonly coalgebraMapInflationary: true;
    readonly settlingEndofunctorMonotone: true;
    readonly zeroIncrementRecoversClosure: true;
    readonly orbitMonotone: true;
    readonly algebraCoalgebraDualDirections: true;
    readonly quiescenceIsoAtZeroIncrement: true;
    readonly cclosedIffClosureAlgebra: true;
    readonly finiteKzShadow: ClosureMonadReceipt;
    readonly higherCategoricalBoundary: "proof-side 2-categorical KZ/cofree coalgebra data";
}
export interface ScottCoalgebraReceipt {
    readonly kind: "scottCoalgebra.receipt:witness";
    readonly scott: ScottContinuityReceipt;
    readonly finiteAntecedent: FiniteAntecedentScottReceipt;
    readonly coalgebra: SettlingCoalgebraReceipt;
    readonly dcpoBoundary: "proof-side arbitrary directed-complete joins";
}
export declare function directedFamily(elems: readonly ChargeValueName[]): DirectedChargeFamily;
export declare function scottContinuityReceipt(closure: ChargeClosureCarrier, family: DirectedChargeFamily): ScottContinuityReceipt;
export declare function finiteAntecedentFire(antecedent: ChargeValueName, conclusion: ChargeValueName, value: ChargeValueName): ChargeValueName;
export declare function finiteAntecedentScottReceipt(antecedent: ChargeValueName, conclusion: ChargeValueName, family: DirectedChargeFamily): FiniteAntecedentScottReceipt;
export declare function settlingEndofunctor(closure: ChargeClosureCarrier, increment: ValuationFiberCarrier, carrier: ValuationFiberCarrier): ValuationFiberCarrier;
export declare function coalgebraOrbit(closure: ChargeClosureCarrier, seed: ValuationFiberCarrier, steps: number): readonly ValuationFiberCarrier[];
export declare function coalgebraOrbitLimit(orbit: readonly ValuationFiberCarrier[]): CoalgebraLimitReceipt;
export declare function settlingCoalgebraReceipt(closure: ChargeClosureCarrier, carrier: ValuationFiberCarrier, increment: ValuationFiberCarrier): SettlingCoalgebraReceipt;
export declare function receipt(): ScottCoalgebraReceipt;
export declare function invalidNonDirectedFamily(): readonly ChargeValueName[];
