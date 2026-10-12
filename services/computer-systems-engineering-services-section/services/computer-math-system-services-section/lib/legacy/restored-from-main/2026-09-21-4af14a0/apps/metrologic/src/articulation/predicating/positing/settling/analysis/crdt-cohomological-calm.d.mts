/**
 * analysis/crdt-cohomological-calm - finite executable shadow of
 * RelMath.Cohomology.CRDTCohomologicalCALM.
 *
 * Lean bundles four already-proved convergence readings: H1 vanishing,
 * order-independent CRDT merge, confluence by knowledge join, and quiescence
 * as closure fixed point. This module exposes that finite FOUR/valuation
 * surface and keeps the genuine CALM biconditional as a proof frontier.
 */
import { type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type ChargeClosureCarrier, type ClosureMonadReceipt, type CosettlingReceipt } from "../../closure-operator-fiber.mjs";
import { type ValuationFiberCarrier } from "../../index.mjs";
export interface MergeOrderIndependentReceipt {
    readonly kind: "crdtCalm.mergeOrderIndependent:witness";
    readonly left: readonly ChargeValueName[];
    readonly right: readonly ChargeValueName[];
    readonly sameMembership: true;
    readonly leftMerge: ChargeValueName;
    readonly rightMerge: ChargeValueName;
    readonly orderIndependent: true;
}
export interface ConfluenceReceipt {
    readonly kind: "crdtCalm.confluence:witness";
    readonly left: ValuationFiberCarrier;
    readonly right: ValuationFiberCarrier;
    readonly join: ValuationFiberCarrier;
    readonly leftLeJoin: true;
    readonly rightLeJoin: true;
    readonly totalByKnowledgeJoin: true;
}
export interface CalmConvergenceFactsReceipt {
    readonly kind: "crdtCalm.convergenceFacts:witness";
    readonly h1VanishesFinite: true;
    readonly merge: MergeOrderIndependentReceipt;
    readonly confluence: ConfluenceReceipt;
    readonly closure: ChargeClosureCarrier;
    readonly fixedPoint: ValuationFiberCarrier;
    readonly quiescentIffClosureFixed: true;
    readonly mutuallyBelowImpliesEqual: true;
    readonly biconditionalFrontier: "proof-side genuine CALM equivalence";
}
export interface CalmMonotoneCoordinationFreeReceipt {
    readonly kind: "crdtCalm.monotoneCoordinationFree:witness";
    readonly closure: ChargeClosureCarrier;
    readonly seed: ValuationFiberCarrier;
    readonly orbit: readonly ValuationFiberCarrier[];
    readonly orbitMonotone: true;
    readonly merge: MergeOrderIndependentReceipt;
    readonly coordinationFree: true;
}
export interface MayerVietorisOverlapReceipt {
    readonly kind: "crdtCalm.mayerVietorisOverlap:witness";
    readonly cosettling: CosettlingReceipt;
    readonly overlapJoinClosed: true;
}
export interface CRDTCohomologicalCALMReceipt {
    readonly kind: "crdtCalm.receipt:witness";
    readonly convergence: CalmConvergenceFactsReceipt;
    readonly monotoneCoordinationFree: CalmMonotoneCoordinationFreeReceipt;
    readonly overlap: MayerVietorisOverlapReceipt;
    readonly openFrontier: readonly string[];
}
export declare const mergeDeltas: (deltas: readonly ChargeValueName[]) => ChargeValueName;
export declare function mergeOrderIndependentReceipt(left?: readonly ChargeValueName[], right?: readonly ChargeValueName[]): MergeOrderIndependentReceipt;
export declare function confluenceReceipt(left: ValuationFiberCarrier, right: ValuationFiberCarrier): ConfluenceReceipt;
export declare function calmConvergenceFactsReceipt(): CalmConvergenceFactsReceipt;
export declare function monotoneCoordinationFreeReceipt(): CalmMonotoneCoordinationFreeReceipt;
export declare function mayerVietorisOverlapReceipt(): MayerVietorisOverlapReceipt;
export declare function receipt(): CRDTCohomologicalCALMReceipt;
export declare const finiteKzShadow: () => ClosureMonadReceipt;
