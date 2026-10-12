/**
 * analysis/evidence — exact information reads of charge distributions.
 *
 * Charge histograms (exact rational probabilities over Belnap's FOUR), the
 * expected evidence coordinates (truth/falsity presence, knowledge height,
 * conflict), the prior→posterior coordinate delta, absolute continuity (finite
 * divergence ⇔ support containment), the majorization (mixedness) order — which
 * settles every Schur-concave entropy comparison at once and exposes genuine
 * incomparability — joint distributions with mutual-information factorization,
 * coordinate distortion, and screening-off (conditional independence given a
 * boundary). Exact throughout; how much an obstruction is in bits is a boundary read.
 */
import { type ChargeValue, type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import type { MemeTopologyInformation } from "../fixed-point-reading.mjs";
import { type Natural, type Rational } from "./exact-number.mjs";
/** One bin of a charge histogram. */
export interface ChargeBin {
    readonly kind: "meme-analysis.evidence.bin";
    readonly value: ChargeValue;
    readonly count: Natural;
    readonly probability: Rational;
}
/** An exact charge histogram (a bin per charge value, zero counts kept). */
export interface ChargeDistributionCarrier {
    readonly kind: "meme-analysis.evidence.distribution";
    readonly total: Natural;
    readonly bins: readonly ChargeBin[];
}
/** Exact histogram of charge values. */
export declare function chargeDistribution(values: readonly ChargeValue[]): ChargeDistributionCarrier;
/** The charge histogram of a fixed-point reading's information entries. */
export declare function informationDistribution(information: MemeTopologyInformation): ChargeDistributionCarrier;
/** The expected bedrock charge coordinates of a distribution. */
export interface EvidenceCoordinatesCarrier {
    readonly kind: "meme-analysis.evidence.coordinates";
    readonly distribution: ChargeDistributionCarrier;
    readonly truth: Rational;
    readonly falsity: Rational;
    readonly knowledge: Rational;
    readonly conflict: Rational;
}
/** Expectations of the bedrock charge coordinates, exactly. */
export declare function evidenceCoordinates(distribution: ChargeDistributionCarrier): EvidenceCoordinatesCarrier;
/** The exact movement of evidence coordinates from a prior to a posterior. */
export interface EvidenceDeltaCarrier {
    readonly kind: "meme-analysis.evidence.coordinatesDelta";
    readonly prior: EvidenceCoordinatesCarrier;
    readonly posterior: EvidenceCoordinatesCarrier;
    readonly truthDelta: Rational;
    readonly falsityDelta: Rational;
    readonly knowledgeDelta: Rational;
    readonly conflictDelta: Rational;
}
/** Exact movement of evidence coordinates from prior to posterior. */
export declare function evidenceDelta(prior: ChargeDistributionCarrier, posterior: ChargeDistributionCarrier): EvidenceDeltaCarrier;
/** Support containment of `from` within `to`. */
export interface AbsoluteContinuityWitness {
    readonly kind: "meme-analysis.evidence.absoluteContinuity:witness";
    readonly from: ChargeDistributionCarrier;
    readonly to: ChargeDistributionCarrier;
}
/** A failure of support containment (the escaping charge values). */
export interface AbsoluteContinuityObstruction {
    readonly kind: "meme-analysis.evidence.absoluteContinuity-obstruction";
    readonly from: ChargeDistributionCarrier;
    readonly to: ChargeDistributionCarrier;
    readonly escaping: readonly ChargeValueName[];
}
/** The result of an absolute-continuity check. */
export type AbsoluteContinuityJudgment = AbsoluteContinuityWitness | AbsoluteContinuityObstruction;
/** Support containment of `from` within `to` (finite divergence ⇔ witness). */
export declare function absoluteContinuity(from: ChargeDistributionCarrier, to: ChargeDistributionCarrier): AbsoluteContinuityJudgment;
/** The ordering outcome of a mixedness comparison. */
export type MixednessRelation = "leftMoreMixed" | "rightMoreMixed" | "equallyMixed";
/** A decided mixedness comparison (majorization order). */
export interface MixednessComparison {
    readonly kind: "meme-analysis.evidence.mixedness";
    readonly left: ChargeDistributionCarrier;
    readonly right: ChargeDistributionCarrier;
    readonly relation: MixednessRelation;
}
/** A mixedness comparison with no order (incomparable prefixes). */
export interface MixednessIncomparability {
    readonly kind: "meme-analysis.evidence.mixedness-incomparable";
    readonly left: ChargeDistributionCarrier;
    readonly right: ChargeDistributionCarrier;
    readonly leftExceedsAtPrefix: number;
    readonly rightExceedsAtPrefix: number;
}
/** The result of a mixedness check. */
export type MixednessJudgment = MixednessComparison | MixednessIncomparability;
/** The mixedness (majorization) order, exactly. */
export declare function mixedness(left: ChargeDistributionCarrier, right: ChargeDistributionCarrier): MixednessJudgment;
/** One cell of a joint charge histogram. */
export interface JointChargeCell {
    readonly kind: "meme-analysis.evidence.jointCell";
    readonly source: ChargeValue;
    readonly reproduction: ChargeValue;
    readonly count: Natural;
    readonly probability: Rational;
}
/** An exact joint histogram of (source, reproduction) charge pairs. */
export interface JointChargeDistributionCarrier {
    readonly kind: "meme-analysis.evidence.joint";
    readonly total: Natural;
    readonly cells: readonly JointChargeCell[];
    readonly sourceMarginal: ChargeDistributionCarrier;
    readonly reproductionMarginal: ChargeDistributionCarrier;
}
/** Exact joint histogram of (source, reproduction) charge pairs. */
export declare function chargeJoint(pairs: readonly (readonly [source: ChargeValue, reproduction: ChargeValue])[]): JointChargeDistributionCarrier;
/** A joint that factorizes (mutual information vanishes). */
export interface IndependenceWitness {
    readonly kind: "meme-analysis.evidence.independence:witness";
    readonly joint: JointChargeDistributionCarrier;
}
/** A failure of factorization at one cell (dependence). */
export interface IndependenceObstruction {
    readonly kind: "meme-analysis.evidence.independence-obstruction";
    readonly joint: JointChargeDistributionCarrier;
    readonly source: ChargeValue;
    readonly reproduction: ChargeValue;
    readonly jointProbability: Rational;
    readonly productProbability: Rational;
}
/** The result of an independence check. */
export type IndependenceJudgment = IndependenceWitness | IndependenceObstruction;
/** Exact factorization check of a joint against its marginals. */
export declare function independence(joint: JointChargeDistributionCarrier): IndependenceJudgment;
/** Per-side disagreement of two charge coordinates, in {0, 1/2, 1}. */
export declare function coordinateDistortion(left: ChargeValue, right: ChargeValue): Rational;
/** Expected coordinate distortion of a joint, exactly. */
export declare function expectedDistortion(joint: JointChargeDistributionCarrier): Rational;
/** One cell of a triple charge histogram. */
export interface TripleChargeCell {
    readonly kind: "meme-analysis.evidence.tripleCell";
    readonly internal: ChargeValue;
    readonly boundary: ChargeValue;
    readonly external: ChargeValue;
    readonly count: Natural;
    readonly probability: Rational;
}
/** An exact joint histogram of (internal, boundary, external) charge triples. */
export interface TripleChargeDistributionCarrier {
    readonly kind: "meme-analysis.evidence.triple";
    readonly total: Natural;
    readonly cells: readonly TripleChargeCell[];
}
/** Exact joint histogram of (internal, boundary, external) charge triples. */
export declare function chargeTriple(triples: readonly (readonly [internal: ChargeValue, boundary: ChargeValue, external: ChargeValue])[]): TripleChargeDistributionCarrier;
/** The boundary screens off internal from external (conditional independence). */
export interface ScreeningOffWitness {
    readonly kind: "meme-analysis.evidence.screeningOff:witness";
    readonly triple: TripleChargeDistributionCarrier;
}
/** A failure of screening-off at one cell. */
export interface ScreeningOffObstruction {
    readonly kind: "meme-analysis.evidence.screeningOff-obstruction";
    readonly triple: TripleChargeDistributionCarrier;
    readonly internal: ChargeValue;
    readonly boundary: ChargeValue;
    readonly external: ChargeValue;
    readonly throughBoundary: Rational;
    readonly aroundBoundary: Rational;
}
/** The result of a screening-off check. */
export type ScreeningOffJudgment = ScreeningOffWitness | ScreeningOffObstruction;
/** Conditional independence of internal and external given the boundary, exactly. */
export declare function screeningOff(triple: TripleChargeDistributionCarrier): ScreeningOffJudgment;
