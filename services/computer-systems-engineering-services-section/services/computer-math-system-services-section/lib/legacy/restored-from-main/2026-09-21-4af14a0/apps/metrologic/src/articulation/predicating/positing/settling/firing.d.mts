/**
 * settling/firing — the firing pattern of a settlement's non-Scott firings.
 *
 * Each firing's charge value is classified by which sides are present (truth-only,
 * falsity-only, stable, absurd), graded with truth/falsity multiplicities, and
 * assembled into a first cohomology (one generator per firing) with its two-sided
 * shadow. A firing orbit is classified under negation (self-dual / one-sided /
 * exchange-mixed / mixed) and its self-duality coherence judged. Valued firings
 * pair the settlement's non-Scott firings with charge values.
 */
import { type ChargeSide, type ChargeValue } from "../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type Natural } from "./analysis/exact-number.mjs";
import { type RankComparison, type RankIdentityJudgment } from "./cohomology.mjs";
import type { SettlementFiltration, SettlingStageOrdinalCarrier } from "./object.mjs";
/** A firing whose truth side is present and falsity absent. */
export interface TruthOnlyFiringTypeCarrier {
    readonly kind: "predication.firing.type.truthOnly";
}
/** A firing whose falsity side is present and truth absent. */
export interface FalsityOnlyFiringTypeCarrier {
    readonly kind: "predication.firing.type.falsityOnly";
}
/** A firing whose truth and falsity sides are both present. */
export interface StableFiringTypeCarrier {
    readonly kind: "predication.firing.type.stable";
}
/** A firing whose truth and falsity sides are both absent. */
export interface AbsurdFiringTypeCarrier {
    readonly kind: "predication.firing.type.absurd";
}
/** The four firing types by which sides are present. */
export type FiringTypeCarrier = TruthOnlyFiringTypeCarrier | FalsityOnlyFiringTypeCarrier | StableFiringTypeCarrier | AbsurdFiringTypeCarrier;
/** Singleton-pair consistency holds (not both sides nonzero). */
export interface FiringSingletonPairConsistencyWitness {
    readonly kind: "predication.firing.singletonPairConsistency:witness";
    readonly value: ChargeValue;
    readonly lPlus: Natural;
    readonly lMinus: Natural;
}
/** Singleton-pair consistency fails (both sides nonzero). */
export interface FiringSingletonPairConsistencyObstruction {
    readonly kind: "predication.firing.singletonPairConsistency-obstruction";
    readonly value: ChargeValue;
    readonly lPlus: Natural;
    readonly lMinus: Natural;
}
/** Judgment of singleton-pair consistency. */
export type FiringSingletonPairConsistencyJudgment = FiringSingletonPairConsistencyWitness | FiringSingletonPairConsistencyObstruction;
/** Cone consistency holds. */
export interface FiringConeConsistencyWitness {
    readonly kind: "predication.firing.coneConsistency:witness";
    readonly value: ChargeValue;
    readonly lPlus: Natural;
    readonly lMinus: Natural;
}
/** Cone consistency fails. */
export interface FiringConeConsistencyObstruction {
    readonly kind: "predication.firing.coneConsistency-obstruction";
    readonly value: ChargeValue;
    readonly lPlus: Natural;
    readonly lMinus: Natural;
}
/** Judgment of cone consistency. */
export type FiringConeConsistencyJudgment = FiringConeConsistencyWitness | FiringConeConsistencyObstruction;
/** The totality datum of a firing (its charge value). */
export interface FiringTotalityCarrier {
    readonly kind: "predication.firing.totality.carrier";
    readonly value: ChargeValue;
}
/** A graded record of a single firing. */
export interface FiringGrade {
    readonly kind: "predication.firing.grade";
    readonly value: ChargeValue;
    readonly firingType: FiringTypeCarrier;
    readonly lPlus: Natural;
    readonly lMinus: Natural;
    readonly consistency: FiringSingletonPairConsistencyJudgment;
}
/** A generator record for a firing. */
export interface FiringGenerator {
    readonly kind: "predication.firing.generator";
    readonly value: ChargeValue;
    readonly firingType: FiringTypeCarrier;
    readonly lPlus: Natural;
    readonly lMinus: Natural;
    readonly consistency: FiringConeConsistencyJudgment;
    readonly totality: FiringTotalityCarrier;
}
/** A firing generator placed in cohomology (at a stage). */
export interface FiringCohomologyGenerator {
    readonly kind: "predication.firing.cohomologyGenerator";
    readonly stage: SettlingStageOrdinalCarrier;
    readonly value: ChargeValue;
    readonly generator: FiringGenerator;
}
/** The free module on firing cohomology generators. */
export interface FiringCohomologyModule {
    readonly kind: "predication.firing.cohomologyModule";
    readonly basis: readonly FiringCohomologyGenerator[];
    readonly rank: Natural;
}
/** First cohomology of a firing family. */
export interface FiringFirstCohomology {
    readonly kind: "predication.firing.firstCohomology";
    readonly generators: readonly FiringCohomologyGenerator[];
    readonly module: FiringCohomologyModule;
    readonly rank: Natural;
    readonly lPlus: Natural;
    readonly lMinus: Natural;
}
/** The truth side of firing cohomology. */
export interface FiringTruthCohomologySideCarrier {
    readonly kind: "predication.firing.cohomologySide.truth";
}
/** The falsity side of firing cohomology. */
export interface FiringFalsityCohomologySideCarrier {
    readonly kind: "predication.firing.cohomologySide.falsity";
}
/** A firing cohomology side. */
export type FiringCohomologySideCarrier = FiringTruthCohomologySideCarrier | FiringFalsityCohomologySideCarrier;
/** A one-sided firing cohomology module. */
export interface FiringSideModule {
    readonly kind: "predication.firing.sideModule";
    readonly side: FiringCohomologySideCarrier;
    readonly rank: Natural;
}
/** The two-sided shadow of firing cohomology. */
export interface FiringCohomologyShadow {
    readonly kind: "predication.firing.cohomologyShadow";
    readonly truthSide: FiringSideModule;
    readonly falsitySide: FiringSideModule;
    readonly lPlus: Natural;
    readonly lMinus: Natural;
}
/** Counts of firings by type. */
export interface FiringTypeMultiplicityCarrier {
    readonly kind: "predication.firing.typeMultiplicity";
    readonly truthOnly: Natural;
    readonly falsityOnly: Natural;
    readonly stableFiring: Natural;
    readonly absurdFiring: Natural;
}
/** Graded cohomology of a family of charge values. */
export interface FiringGradeCohomology {
    readonly kind: "predication.firing.gradeCohomology";
    readonly values: readonly ChargeValue[];
    readonly perFiring: readonly FiringGrade[];
    readonly firingMultiplicities: FiringTypeMultiplicityCarrier;
    readonly abRank: Natural;
    readonly abelianRankComparison: RankComparison;
    readonly shadow: FiringCohomologyShadow;
    readonly shadowRankIdentity: RankIdentityJudgment;
}
/** A firing paired with a value (stage + charge). */
export interface ValuedFiring {
    readonly stage: SettlingStageOrdinalCarrier;
    readonly value: ChargeValue;
}
/** A firing orbit fixed by negation. */
export interface SelfDualFiringOrbitTypeCarrier {
    readonly kind: "predication.firing.orbitType.selfDual";
}
/** A firing orbit of only truth-only firings. */
export interface TruthOnlyFiringOrbitTypeCarrier {
    readonly kind: "predication.firing.orbitType.truthOnly";
}
/** A firing orbit of only falsity-only firings. */
export interface FalsityOnlyFiringOrbitTypeCarrier {
    readonly kind: "predication.firing.orbitType.falsityOnly";
}
/** A firing orbit of both one-sided firings, no stable/absurd. */
export interface ExchangeMixedFiringOrbitTypeCarrier {
    readonly kind: "predication.firing.orbitType.exchangeMixed";
}
/** A firing orbit holding stable/absurd alongside one-sided. */
export interface MixedFiringOrbitTypeCarrier {
    readonly kind: "predication.firing.orbitType.mixed";
}
/** A firing orbit type. */
export type FiringOrbitTypeCarrier = SelfDualFiringOrbitTypeCarrier | TruthOnlyFiringOrbitTypeCarrier | FalsityOnlyFiringOrbitTypeCarrier | ExchangeMixedFiringOrbitTypeCarrier | MixedFiringOrbitTypeCarrier;
/** A singleton firing-orbit cardinality. */
export interface FiringOrbitSingletonCardinality {
    readonly kind: "predication.firing.orbitCardinality.singleton";
    readonly rank: Natural;
}
/** A pair firing-orbit cardinality. */
export interface FiringOrbitPairCardinality {
    readonly kind: "predication.firing.orbitCardinality.pair";
    readonly rank: Natural;
}
/** A variable firing-orbit cardinality. */
export interface FiringOrbitVariableCardinality {
    readonly kind: "predication.firing.orbitCardinality.variable";
    readonly supportRank: Natural;
}
/** A firing orbit cardinality. */
export type FiringOrbitCardinality = FiringOrbitSingletonCardinality | FiringOrbitPairCardinality | FiringOrbitVariableCardinality;
/** A self-dual firing orbit. */
export interface FiringOrbitDualityWitness {
    readonly kind: "predication.firing.orbitDuality:witness";
}
/** A non-self-dual firing orbit. */
export interface FiringOrbitDualityObstruction {
    readonly kind: "predication.firing.orbitDuality-obstruction";
    readonly orbitType: FiringOrbitTypeCarrier;
}
/** Judgment of a firing orbit's self-duality. */
export type FiringOrbitDualityJudgment = FiringOrbitDualityWitness | FiringOrbitDualityObstruction;
/** A firing orbit classification. */
export interface FiringOrbitClassification {
    readonly kind: "predication.firing.orbit";
    readonly firingMultiplicities: FiringTypeMultiplicityCarrier;
    readonly orbitType: FiringOrbitTypeCarrier;
    readonly cardinality: FiringOrbitCardinality;
    readonly duality: FiringOrbitDualityJudgment;
    readonly negated: readonly ChargeValue[];
}
/** A firing family satisfies a symmetry. */
export interface FiringSymmetryWitness {
    readonly kind: "predication.firing.symmetry:witness";
}
/** A firing family violates a symmetry. */
export interface FiringSymmetryObstruction {
    readonly kind: "predication.firing.symmetry-obstruction";
    readonly values: readonly ChargeValue[];
}
/** Judgment of a firing family's symmetry. */
export type FiringSymmetryJudgment = FiringSymmetryWitness | FiringSymmetryObstruction;
/** Firing self-duality coherence holds. */
export interface FiringSelfDualityCoherenceWitness {
    readonly kind: "predication.firing.selfDualityCoherence:witness";
}
/** Firing self-duality coherence fails. */
export interface FiringSelfDualityCoherenceObstruction {
    readonly kind: "predication.firing.selfDualityCoherence-obstruction";
    readonly orbit: FiringOrbitDualityJudgment;
    readonly symmetry: FiringSymmetryJudgment;
    readonly negation: FiringSymmetryJudgment;
}
/** Judgment of firing self-duality coherence. */
export type FiringSelfDualityCoherenceJudgment = FiringSelfDualityCoherenceWitness | FiringSelfDualityCoherenceObstruction;
/** A self-duality record for a firing family. */
export interface FiringSelfDuality {
    readonly kind: "predication.firing.selfDuality";
    readonly orbit: FiringOrbitDualityJudgment;
    readonly symmetry: FiringSymmetryJudgment;
    readonly negation: FiringSymmetryJudgment;
    readonly coherence: FiringSelfDualityCoherenceJudgment;
}
/** Valued firings are independent (no shared stage). */
export interface FiringIndependenceWitness {
    readonly kind: "predication.firing.independence:witness";
    readonly firings: readonly ValuedFiring[];
}
/** Valued firings collide on a stage. */
export interface FiringIndependenceObstruction {
    readonly kind: "predication.firing.independence-obstruction";
    readonly stage: SettlingStageOrdinalCarrier;
    readonly firings: readonly ValuedFiring[];
}
/** Judgment of valued-firing independence. */
export type FiringIndependenceJudgment = FiringIndependenceWitness | FiringIndependenceObstruction;
/** The truth and falsity sides of a charge value. */
export declare const firingSideContribution: (value: ChargeValue) => readonly [truth: ChargeSide, falsity: ChargeSide];
/** Frozen truth-only firing-type carrier. */
export declare const truthOnlyFiringType: TruthOnlyFiringTypeCarrier;
/** Frozen falsity-only firing-type carrier. */
export declare const falsityOnlyFiringType: FalsityOnlyFiringTypeCarrier;
/** Frozen stable firing-type carrier. */
export declare const stableFiringType: StableFiringTypeCarrier;
/** Frozen absurd firing-type carrier. */
export declare const absurdFiringType: AbsurdFiringTypeCarrier;
/** Frozen truth-side firing cohomology carrier. */
export declare const firingTruthCohomologySide: FiringTruthCohomologySideCarrier;
/** Frozen falsity-side firing cohomology carrier. */
export declare const firingFalsityCohomologySide: FiringFalsityCohomologySideCarrier;
/** Frozen self-dual firing orbit-type carrier. */
export declare const selfDualFiringOrbitType: SelfDualFiringOrbitTypeCarrier;
/** Frozen truth-only firing orbit-type carrier. */
export declare const truthOnlyFiringOrbitType: TruthOnlyFiringOrbitTypeCarrier;
/** Frozen falsity-only firing orbit-type carrier. */
export declare const falsityOnlyFiringOrbitType: FalsityOnlyFiringOrbitTypeCarrier;
/** Frozen exchange-mixed firing orbit-type carrier. */
export declare const exchangeMixedFiringOrbitType: ExchangeMixedFiringOrbitTypeCarrier;
/** Frozen mixed firing orbit-type carrier. */
export declare const mixedFiringOrbitType: MixedFiringOrbitTypeCarrier;
/** Classify a charge value by which sides are present. */
export declare function classifyFiring(value: ChargeValue): FiringTypeCarrier;
/** Judge singleton-pair consistency (obstruction when both sides nonzero). */
export declare function firingSingletonPairConsistency(value: ChargeValue, lPlus: Natural, lMinus: Natural): FiringSingletonPairConsistencyJudgment;
/** Judge cone consistency (obstruction when both sides nonzero). */
export declare function firingConeConsistency(value: ChargeValue, lPlus: Natural, lMinus: Natural): FiringConeConsistencyJudgment;
/** A firing totality carrier. */
export declare const firingTotality: (value: ChargeValue) => FiringTotalityCarrier;
/** The firing grade of a charge value. */
export declare function firingGrade(value: ChargeValue): FiringGrade;
/** The firing grades of a list of charge values. */
export declare function firingGrades(values: readonly ChargeValue[]): readonly FiringGrade[];
/** The firing generator of a charge value. */
export declare function firingGenerator(value: ChargeValue): FiringGenerator;
/** The first cohomology of a list of valued firings. */
export declare function firingFirstCohomology(valuedFirings: readonly ValuedFiring[]): FiringFirstCohomology;
/** A one-sided firing cohomology module. */
export declare const firingSideModule: (side: FiringCohomologySideCarrier, moduleRank: Natural) => FiringSideModule;
/** The two-sided cohomology shadow of valued firings. */
export declare function firingGradeShadow(valuedFirings: readonly ValuedFiring[]): FiringCohomologyShadow;
/** The firing generator of a generator's negation. */
export declare function negateFiringGenerator(generator: FiringGenerator): FiringGenerator;
/** Whether a list of valued firings is independent (no shared stage). */
export declare function firingIndependence(valuedFirings: readonly ValuedFiring[]): FiringIndependenceJudgment;
/** Pair a settlement's non-Scott firings with charge values in order. */
export declare function valuedFiringsOfSettlementFiltration(carrier: SettlementFiltration, values: readonly ChargeValue[]): readonly ValuedFiring[];
/** Count charge values by firing type. */
export declare function firingTypeMultiplicities(values: readonly ChargeValue[]): FiringTypeMultiplicityCarrier;
/** Classify the firing orbit of a list of charge values under negation. */
export declare function classifyFiringOrbit(values: readonly ChargeValue[]): FiringOrbitClassification;
/** The self-duality record of a list of charge values. */
export declare function firingSelfDuality(values: readonly ChargeValue[]): FiringSelfDuality;
/** The graded cohomology of a list of charge values. */
export declare function firingGradeCohomology(values: readonly ChargeValue[], abRank?: Natural): FiringGradeCohomology;
