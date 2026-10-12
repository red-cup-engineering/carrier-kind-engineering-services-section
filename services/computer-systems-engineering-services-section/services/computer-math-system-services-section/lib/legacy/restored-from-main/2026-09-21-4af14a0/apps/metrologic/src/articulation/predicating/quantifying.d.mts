/**
 * predicating/quantifying — finite fiber quantifiers and hyperdoctrine receipts.
 *
 * Executable shadow of `RelMath.Predicating.Quantifying`,
 * `RelMath.Predicating.Hyperdoctrine`, and
 * `RelMath.Predicating.PredicationHyperdoctrineDual`.
 *
 * A finite fibration is stored as a total base map from source cells to target
 * cells; fibers are derived from the map. Quantifiers are finite joins/meets in
 * the knowledge or truth order, and receipt constructors check the adjunction
 * laws over the finite FOUR-valued valuation space when asked for a law witness.
 */
import { type ChargeValueName } from "../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import type { OrderName } from "./positing/fiber.mjs";
export type FiniteValuation = Readonly<Record<string, ChargeValueName>>;
export interface PredicatingFiniteFibration {
    readonly kind: "predicating.quantifying.finiteFibration";
    readonly points: readonly string[];
    readonly bases: readonly string[];
    readonly baseMap: Readonly<Record<string, string>>;
    readonly fibers: Readonly<Record<string, readonly string[]>>;
}
export interface PredicatingQuantifyingReceipt {
    readonly kind: "predicating.quantifying.receipt:witness";
    readonly fibration: PredicatingFiniteFibration;
    readonly valuation: FiniteValuation;
    readonly existsKnowledge: FiniteValuation;
    readonly forallKnowledge: FiniteValuation;
    readonly existsTruth: FiniteValuation;
    readonly forallTruth: FiniteValuation;
    readonly emptyFiberExistsKnowledge: "absurd";
    readonly emptyFiberForallKnowledge: "stable";
    readonly emptyFiberExistsTruth: "active";
    readonly emptyFiberForallTruth: "potential";
    readonly singletonFiberIdentityKnowledge: boolean;
    readonly singletonFiberIdentityTruth: boolean;
    readonly knowledgeAdjunctionFinite: true;
    readonly truthAdjunctionFinite: true;
}
export interface PredicatingHyperdoctrineReceipt {
    readonly kind: "predicating.hyperdoctrine.receipt:witness";
    readonly fibration: PredicatingFiniteFibration;
    readonly valuation: FiniteValuation;
    readonly reindexed: FiniteValuation;
    readonly reindexedTwice: FiniteValuation;
    readonly existsKnowledge: FiniteValuation;
    readonly forallKnowledge: FiniteValuation;
    readonly existsTruth: FiniteValuation;
    readonly forallTruth: FiniteValuation;
    readonly baseIsoInvolution: true;
    readonly reindexConverseConverse: true;
    readonly converseExistsIsReindexKnowledge: true;
    readonly converseForallIsReindexKnowledge: true;
    readonly converseExistsIsReindexTruth: true;
    readonly converseForallIsReindexTruth: true;
    readonly converseFrobeniusKnowledge: true;
    readonly converseFrobeniusTruth: true;
    readonly beckChevalleySelf: true;
}
export interface PredicatingDualHyperdoctrineReceipt {
    readonly kind: "predicating.hyperdoctrine.dual.receipt:witness";
    readonly fibration: PredicatingFiniteFibration;
    readonly valuation: FiniteValuation;
    readonly swappedValuation: FiniteValuation;
    readonly conjExists: FiniteValuation;
    readonly existsTruth: FiniteValuation;
    readonly conjForall: FiniteValuation;
    readonly forallTruth: FiniteValuation;
    readonly swapInvolutive: true;
    readonly conjExistsEqualsExistsTruth: true;
    readonly conjForallEqualsForallTruth: true;
    readonly conjReindexEqualsReindex: true;
    readonly dualAdjointSystemFinite: true;
}
export declare function finitePredicatingFibration(points: readonly string[], bases: readonly string[], baseMap: Readonly<Record<string, string>>): PredicatingFiniteFibration;
export declare function chargeListJoin(order: OrderName, values: readonly ChargeValueName[]): ChargeValueName;
export declare function chargeListMeet(order: OrderName, values: readonly ChargeValueName[]): ChargeValueName;
export declare function existsF(fibration: PredicatingFiniteFibration, valuation: FiniteValuation, order: OrderName): FiniteValuation;
export declare function forallF(fibration: PredicatingFiniteFibration, valuation: FiniteValuation, order: OrderName): FiniteValuation;
export declare function reindexF(fibration: PredicatingFiniteFibration, valuation: FiniteValuation): FiniteValuation;
export declare function swapValuation(valuation: FiniteValuation): FiniteValuation;
export declare function predicatingQuantifyingReceipt(fibration: PredicatingFiniteFibration, valuation: FiniteValuation): PredicatingQuantifyingReceipt;
export declare function finiteConverseFibration(points: readonly string[], converseMap: Readonly<Record<string, string>>): PredicatingFiniteFibration;
export declare function predicatingHyperdoctrineReceipt(fibration: PredicatingFiniteFibration, valuation: FiniteValuation): PredicatingHyperdoctrineReceipt;
export declare function predicatingDualHyperdoctrineReceipt(fibration: PredicatingFiniteFibration, valuation: FiniteValuation): PredicatingDualHyperdoctrineReceipt;
