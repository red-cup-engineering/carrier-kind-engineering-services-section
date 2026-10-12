/**
 * positing/closure-operator-fiber — finite pointwise closure families.
 *
 * Executable shadow of the finite/runtime part of
 * `RelMath.Closure.ClosureOperatorFiber` and
 * `RelMath.Closure.SettlingMonotonicityQuiescence`.
 *
 * A Lean `Charge.Closure` is an operation on FOUR that is inflationary,
 * monotone, and idempotent in the knowledge order. Runtime parity stores that
 * operation as an explicit table over the four charge names, validates the
 * closure laws, and lifts the table pointwise over finite valuation fibers.
 */
import { type ChargeValueName } from "../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type ValuationFiberCarrier } from "./valuation-fiber-algebra.mjs";
export interface ChargeClosureCarrier {
    readonly kind: "positing.closure.chargeClosure.carrier";
    readonly name: string;
    readonly operation: Readonly<Record<ChargeValueName, ChargeValueName>>;
    readonly inflationary: true;
    readonly monotone: true;
    readonly idempotent: true;
}
export interface ReindexMapCarrier {
    readonly kind: "positing.closure.reindexMap.carrier";
    readonly sourcePoints: readonly string[];
    readonly targetPoints: readonly string[];
    readonly map: Readonly<Record<string, string>>;
}
export interface PointwiseClosureFamilyReceipt {
    readonly kind: "positing.closure.pointwiseFamily.receipt:witness";
    readonly closure: ChargeClosureCarrier;
    readonly seed: ValuationFiberCarrier;
    readonly closed: ValuationFiberCarrier;
    readonly orbit: readonly ValuationFiberCarrier[];
    readonly cNaturalMap: ReindexMapCarrier;
    readonly cNaturalSource: ValuationFiberCarrier;
    readonly cNaturalTarget: ValuationFiberCarrier;
    readonly cNaturalLeft: ValuationFiberCarrier;
    readonly cNaturalRight: ValuationFiberCarrier;
    readonly liftInflationary: true;
    readonly liftMonotone: true;
    readonly liftIdempotent: true;
    readonly noPeriodicOrbits: true;
    readonly cNatural: true;
    readonly closureMerge: true;
    readonly lfpIsSettled: true;
    readonly lfpReachedByThree: true;
    readonly orbitMonotone: true;
    readonly quiescentIffFixed: true;
}
export interface CosettlingReceipt {
    readonly kind: "positing.closure.cosettling.receipt:witness";
    readonly closure: ChargeClosureCarrier;
    readonly top: ValuationFiberCarrier;
    readonly preimages: readonly ValuationFiberCarrier[];
    readonly containment: true;
    readonly maximum: true;
    readonly joinClosed: true;
    readonly joinSubsemilatticeWithTop: true;
}
export interface ClosureMonadReceipt {
    readonly kind: "positing.closure.monad.receipt:witness";
    readonly closure: ChargeClosureCarrier;
    readonly increment: ChargeValueName;
    readonly seed: ChargeValueName;
    readonly settled: ChargeValueName;
    readonly settleStepOrbit: readonly ChargeValueName[];
    readonly kzIffStrict: true;
    readonly noPeriodicOrbits: true;
    readonly settleStepInflationary: true;
    readonly settleStepSettlesByThree: true;
    readonly unitInflationary: true;
    readonly multiplicationIdempotent: true;
    readonly counitTriangle: true;
}
export interface Closure2MonadKzReceipt {
    readonly kind: "positing.closure.closure2MonadKZ.receipt:witness";
    readonly theoremKz: "RelMath.closure_kz_lax_idempotent";
    readonly theoremPropertyLike: "RelMath.closure_algebra_property_like";
    readonly closure: ChargeClosureCarrier;
    readonly seed: ValuationFiberCarrier;
    readonly closed: ValuationFiberCarrier;
    readonly closedClosed: ValuationFiberCarrier;
    readonly pointwise: PointwiseClosureFamilyReceipt;
    readonly unitInflationary: true;
    readonly multiplicationIdempotent: true;
    readonly triangleClEta: true;
    readonly triangleEtaCl: true;
    readonly kzInequality: true;
    readonly kzIffStrict: true;
    readonly strictRegimeMuIdentity: true;
    readonly scottRegimeMuIdentity: true;
    readonly clAlgebraIffFixed: true;
    readonly algebraStructureUnique: true;
    readonly structureMapForcedIdentity: true;
    readonly algebraIsPropertyNotData: true;
}
export declare function chargeClosureCarrier(name: string, operation: Readonly<Record<ChargeValueName, ChargeValueName>>): ChargeClosureCarrier;
export declare function knowledgeJoinClosure(bound: ChargeValueName): ChargeClosureCarrier;
export declare function applyChargeClosure(closure: ChargeClosureCarrier, value: ChargeValueName): ChargeValueName;
export declare function iterateChargeOperation(operation: (value: ChargeValueName) => ChargeValueName, seed: ChargeValueName, steps: number): ChargeValueName;
export declare function settleStep(closure: ChargeClosureCarrier, increment: ChargeValueName, value: ChargeValueName): ChargeValueName;
export declare function chargeOrbit(operation: (value: ChargeValueName) => ChargeValueName, seed: ChargeValueName, steps: number): readonly ChargeValueName[];
export declare function liftClosure(closure: ChargeClosureCarrier, carrier: ValuationFiberCarrier): ValuationFiberCarrier;
export declare function closureMonadReceipt(closure: ChargeClosureCarrier, increment: ChargeValueName, seed: ChargeValueName): ClosureMonadReceipt;
/** Bundle the finite valuation shadow of `RelMath.Closure.Closure2MonadKZ`. */
export declare function closure2MonadKzReceipt(closure: ChargeClosureCarrier, seed: ValuationFiberCarrier): Closure2MonadKzReceipt;
export declare function valuationKnowledgeJoin(left: ValuationFiberCarrier, right: ValuationFiberCarrier): ValuationFiberCarrier;
export declare function valuationKnowledgeMeet(left: ValuationFiberCarrier, right: ValuationFiberCarrier): ValuationFiberCarrier;
export declare function closureOrbit(closure: ChargeClosureCarrier, seed: ValuationFiberCarrier, steps: number): readonly ValuationFiberCarrier[];
export declare function reindexMapCarrier(sourcePoints: readonly string[], targetPoints: readonly string[], map: Readonly<Record<string, string>>): ReindexMapCarrier;
export declare function reindexValuationFiber(map: ReindexMapCarrier, target: ValuationFiberCarrier): ValuationFiberCarrier;
export declare function pointwiseClosureFamilyReceipt(closure: ChargeClosureCarrier, seed: ValuationFiberCarrier, cNaturalMap?: ReindexMapCarrier, cNaturalTarget?: ValuationFiberCarrier): PointwiseClosureFamilyReceipt;
export declare function cosettlingReceipt(closure: ChargeClosureCarrier, top: ValuationFiberCarrier): CosettlingReceipt;
