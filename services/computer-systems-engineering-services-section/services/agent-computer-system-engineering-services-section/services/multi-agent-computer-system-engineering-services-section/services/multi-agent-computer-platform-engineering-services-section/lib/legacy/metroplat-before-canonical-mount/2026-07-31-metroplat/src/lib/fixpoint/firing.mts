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
import { charge, chargeValue, negateValue, sameChargeValue, type ChargeSide, type ChargeValue } from "../values/index.mts";
import { count, natIsZero, natZero, successor, type Natural } from "../math/rational/exact-number.mts";
import { rankComparison, rankIdentity, type RankComparison, type RankIdentityJudgment } from "./cohomology.mts";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mts";
import type { Settlement, SettlingStageOrdinal } from "../settlement.mts";
import { settlingStageOrdinalCoincidenceHolds } from "./ordinal.mts";
import type { FromSchema } from "../schema/contract.mts";

/** A firing whose truth side is present and falsity absent. */
export const truthOnlyFiringTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/truth-only-firing-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.type.truthOnly" } },
  additionalProperties: false,
} as const;
export type TruthOnlyFiringType = FromSchema<typeof truthOnlyFiringTypeSchemaContractSchema>;
/** A firing whose falsity side is present and truth absent. */
export const falsityOnlyFiringTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/falsity-only-firing-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.type.falsityOnly" } },
  additionalProperties: false,
} as const;
export type FalsityOnlyFiringType = FromSchema<typeof falsityOnlyFiringTypeSchemaContractSchema>;
/** A firing whose truth and falsity sides are both present. */
export const stableFiringTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/stable-firing-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.type.stable" } },
  additionalProperties: false,
} as const;
export type StableFiringType = FromSchema<typeof stableFiringTypeSchemaContractSchema>;
/** A firing whose truth and falsity sides are both absent. */
export const absurdFiringTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/absurd-firing-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.type.absurd" } },
  additionalProperties: false,
} as const;
export type AbsurdFiringType = FromSchema<typeof absurdFiringTypeSchemaContractSchema>;

/** The four firing types by which sides are present. */
export type FiringType = TruthOnlyFiringType | FalsityOnlyFiringType | StableFiringType | AbsurdFiringType;

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
export interface FiringTotality {
  readonly kind: "predication.firing.totality";
  readonly value: ChargeValue;
}

/** A graded record of a single firing. */
export interface FiringGrade {
  readonly kind: "predication.firing.grade";
  readonly value: ChargeValue;
  readonly firingType: FiringType;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
  readonly consistency: FiringSingletonPairConsistencyJudgment;
}

/** A generator record for a firing. */
export interface FiringGenerator {
  readonly kind: "predication.firing.generator";
  readonly value: ChargeValue;
  readonly firingType: FiringType;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
  readonly consistency: FiringConeConsistencyJudgment;
  readonly totality: FiringTotality;
}

/** A firing generator placed in cohomology (at a stage). */
export interface FiringCohomologyGenerator {
  readonly kind: "predication.firing.cohomologyGenerator";
  readonly stage: SettlingStageOrdinal;
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
export const firingTruthCohomologySideSchemaContractSchema = {
  $id: "metroplat/closure/firing/firing-truth-cohomology-side",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.cohomologySide.truth" } },
  additionalProperties: false,
} as const;
export type FiringTruthCohomologySide = FromSchema<typeof firingTruthCohomologySideSchemaContractSchema>;
/** The falsity side of firing cohomology. */
export const firingFalsityCohomologySideSchemaContractSchema = {
  $id: "metroplat/closure/firing/firing-falsity-cohomology-side",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.cohomologySide.falsity" } },
  additionalProperties: false,
} as const;
export type FiringFalsityCohomologySide = FromSchema<typeof firingFalsityCohomologySideSchemaContractSchema>;

/** A firing cohomology side. */
export type FiringCohomologySide = FiringTruthCohomologySide | FiringFalsityCohomologySide;

/** A one-sided firing cohomology module. */
export interface FiringSideModule {
  readonly kind: "predication.firing.sideModule";
  readonly side: FiringCohomologySide;
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
export interface FiringTypeMultiplicity {
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
  readonly firingMultiplicities: FiringTypeMultiplicity;
  readonly abRank: Natural;
  readonly abelianRankComparison: RankComparison;
  readonly shadow: FiringCohomologyShadow;
  readonly shadowRankIdentity: RankIdentityJudgment;
}

/** A firing paired with a value (stage + charge). */
export interface ValuedFiring {
  readonly stage: SettlingStageOrdinal;
  readonly value: ChargeValue;
}

/** A firing orbit fixed by negation. */
export const selfDualFiringOrbitTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/self-dual-firing-orbit-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.orbitType.selfDual" } },
  additionalProperties: false,
} as const;
export type SelfDualFiringOrbitType = FromSchema<typeof selfDualFiringOrbitTypeSchemaContractSchema>;
/** A firing orbit of only truth-only firings. */
export const truthOnlyFiringOrbitTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/truth-only-firing-orbit-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.orbitType.truthOnly" } },
  additionalProperties: false,
} as const;
export type TruthOnlyFiringOrbitType = FromSchema<typeof truthOnlyFiringOrbitTypeSchemaContractSchema>;
/** A firing orbit of only falsity-only firings. */
export const falsityOnlyFiringOrbitTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/falsity-only-firing-orbit-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.orbitType.falsityOnly" } },
  additionalProperties: false,
} as const;
export type FalsityOnlyFiringOrbitType = FromSchema<typeof falsityOnlyFiringOrbitTypeSchemaContractSchema>;
/** A firing orbit of both one-sided firings, no stable/absurd. */
export const exchangeMixedFiringOrbitTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/exchange-mixed-firing-orbit-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.orbitType.exchangeMixed" } },
  additionalProperties: false,
} as const;
export type ExchangeMixedFiringOrbitType = FromSchema<typeof exchangeMixedFiringOrbitTypeSchemaContractSchema>;
/** A firing orbit holding stable/absurd alongside one-sided. */
export const mixedFiringOrbitTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/mixed-firing-orbit-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.orbitType.mixed" } },
  additionalProperties: false,
} as const;
export type MixedFiringOrbitType = FromSchema<typeof mixedFiringOrbitTypeSchemaContractSchema>;

/** A firing orbit type. */
export type FiringOrbitType =
  | SelfDualFiringOrbitType
  | TruthOnlyFiringOrbitType
  | FalsityOnlyFiringOrbitType
  | ExchangeMixedFiringOrbitType
  | MixedFiringOrbitType;

/** A singleton firing-orbit cardinality. */
export interface FiringOrbitSingletonCardinality { readonly kind: "predication.firing.orbitCardinality.singleton"; readonly rank: Natural; }
/** A pair firing-orbit cardinality. */
export interface FiringOrbitPairCardinality { readonly kind: "predication.firing.orbitCardinality.pair"; readonly rank: Natural; }
/** A variable firing-orbit cardinality. */
export interface FiringOrbitVariableCardinality { readonly kind: "predication.firing.orbitCardinality.variable"; readonly supportRank: Natural; }

/** A firing orbit cardinality. */
export type FiringOrbitCardinality = FiringOrbitSingletonCardinality | FiringOrbitPairCardinality | FiringOrbitVariableCardinality;

/** A self-dual firing orbit. */
export const firingOrbitDualityWitnessSchema = {
  $id: "metroplat/closure/firing/firing-orbit-duality-witness",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.orbitDuality:witness" } },
  additionalProperties: false,
} as const;
export type FiringOrbitDualityWitness = FromSchema<typeof firingOrbitDualityWitnessSchema>;
/** A non-self-dual firing orbit. */
export interface FiringOrbitDualityObstruction { readonly kind: "predication.firing.orbitDuality-obstruction"; readonly orbitType: FiringOrbitType; }
/** Judgment of a firing orbit's self-duality. */
export type FiringOrbitDualityJudgment = FiringOrbitDualityWitness | FiringOrbitDualityObstruction;

/** A firing orbit classification. */
export interface FiringOrbitClassification {
  readonly kind: "predication.firing.orbit";
  readonly firingMultiplicities: FiringTypeMultiplicity;
  readonly orbitType: FiringOrbitType;
  readonly cardinality: FiringOrbitCardinality;
  readonly duality: FiringOrbitDualityJudgment;
  readonly negated: readonly ChargeValue[];
}

/** A firing family satisfies a symmetry. */
export const firingSymmetryWitnessSchema = {
  $id: "metroplat/closure/firing/firing-symmetry-witness",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.symmetry:witness" } },
  additionalProperties: false,
} as const;
export type FiringSymmetryWitness = FromSchema<typeof firingSymmetryWitnessSchema>;
/** A firing family violates a symmetry. */
export interface FiringSymmetryObstruction { readonly kind: "predication.firing.symmetry-obstruction"; readonly values: readonly ChargeValue[]; }
/** Judgment of a firing family's symmetry. */
export type FiringSymmetryJudgment = FiringSymmetryWitness | FiringSymmetryObstruction;

/** Firing self-duality coherence holds. */
export const firingSelfDualityCoherenceWitnessSchema = {
  $id: "metroplat/closure/firing/firing-self-duality-coherence-witness",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.selfDualityCoherence:witness" } },
  additionalProperties: false,
} as const;
export type FiringSelfDualityCoherenceWitness = FromSchema<typeof firingSelfDualityCoherenceWitnessSchema>;
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
export interface FiringIndependenceWitness { readonly kind: "predication.firing.independence:witness"; readonly firings: readonly ValuedFiring[]; }
/** Valued firings collide on a stage. */
export interface FiringIndependenceObstruction { readonly kind: "predication.firing.independence-obstruction"; readonly stage: SettlingStageOrdinal; readonly firings: readonly ValuedFiring[]; }
/** Judgment of valued-firing independence. */
export type FiringIndependenceJudgment = FiringIndependenceWitness | FiringIndependenceObstruction;

/** The truth and falsity sides of a charge value. */
export const firingSideContribution = (value: ChargeValue): readonly [truth: ChargeSide, falsity: ChargeSide] => charge(value).value;

const sidePresent = (side: ChargeSide): boolean => side.name === "present";

/** Frozen truth-only firing-type filtration. */
export const truthOnlyFiringType: TruthOnlyFiringType = Object.freeze({ kind: "predication.firing.type.truthOnly" as const });
/** Frozen falsity-only firing-type filtration. */
export const falsityOnlyFiringType: FalsityOnlyFiringType = Object.freeze({ kind: "predication.firing.type.falsityOnly" as const });
/** Frozen stable firing-type filtration. */
export const stableFiringType: StableFiringType = Object.freeze({ kind: "predication.firing.type.stable" as const });
/** Frozen absurd firing-type filtration. */
export const absurdFiringType: AbsurdFiringType = Object.freeze({ kind: "predication.firing.type.absurd" as const });
/** Frozen truth-side firing cohomology filtration. */
export const firingTruthCohomologySide: FiringTruthCohomologySide = Object.freeze({ kind: "predication.firing.cohomologySide.truth" as const });
/** Frozen falsity-side firing cohomology filtration. */
export const firingFalsityCohomologySide: FiringFalsityCohomologySide = Object.freeze({ kind: "predication.firing.cohomologySide.falsity" as const });
/** Frozen self-dual firing orbit-type filtration. */
export const selfDualFiringOrbitType: SelfDualFiringOrbitType = Object.freeze({ kind: "predication.firing.orbitType.selfDual" as const });
/** Frozen truth-only firing orbit-type filtration. */
export const truthOnlyFiringOrbitType: TruthOnlyFiringOrbitType = Object.freeze({ kind: "predication.firing.orbitType.truthOnly" as const });
/** Frozen falsity-only firing orbit-type filtration. */
export const falsityOnlyFiringOrbitType: FalsityOnlyFiringOrbitType = Object.freeze({ kind: "predication.firing.orbitType.falsityOnly" as const });
/** Frozen exchange-mixed firing orbit-type filtration. */
export const exchangeMixedFiringOrbitType: ExchangeMixedFiringOrbitType = Object.freeze({ kind: "predication.firing.orbitType.exchangeMixed" as const });
/** Frozen mixed firing orbit-type filtration. */
export const mixedFiringOrbitType: MixedFiringOrbitType = Object.freeze({ kind: "predication.firing.orbitType.mixed" as const });

/** Classify a charge value by which sides are present. */
export function classifyFiring(value: ChargeValue): FiringType {
  const [plus, minus] = firingSideContribution(value);
  if (sidePresent(plus) && sidePresent(minus)) return stableFiringType;
  if (sidePresent(plus)) return truthOnlyFiringType;
  if (sidePresent(minus)) return falsityOnlyFiringType;
  return absurdFiringType;
}

/** Judge singleton-pair consistency (obstruction when both sides nonzero). */
export function firingSingletonPairConsistency(value: ChargeValue, lPlus: Natural, lMinus: Natural): FiringSingletonPairConsistencyJudgment {
  return !natIsZero(lPlus) && !natIsZero(lMinus)
    ? Object.freeze({ kind: "predication.firing.singletonPairConsistency-obstruction" as const, value, lPlus, lMinus })
    : Object.freeze({ kind: "predication.firing.singletonPairConsistency:witness" as const, value, lPlus, lMinus });
}

/** Judge cone consistency (obstruction when both sides nonzero). */
export function firingConeConsistency(value: ChargeValue, lPlus: Natural, lMinus: Natural): FiringConeConsistencyJudgment {
  return !natIsZero(lPlus) && !natIsZero(lMinus)
    ? Object.freeze({ kind: "predication.firing.coneConsistency-obstruction" as const, value, lPlus, lMinus })
    : Object.freeze({ kind: "predication.firing.coneConsistency:witness" as const, value, lPlus, lMinus });
}

/** A firing totality filtration. */
export const firingTotality = (value: ChargeValue): FiringTotality => Object.freeze({ kind: "predication.firing.totality" as const, value });

/** The firing grade of a charge value. */
export function firingGrade(value: ChargeValue): FiringGrade {
  const [plus, minus] = firingSideContribution(value);
  const lPlus = sidePresent(plus) ? successor(natZero) : natZero;
  const lMinus = sidePresent(minus) ? successor(natZero) : natZero;
  return Object.freeze({
    kind: "predication.firing.grade" as const,
    value,
    firingType: classifyFiring(value),
    lPlus,
    lMinus,
    consistency: firingSingletonPairConsistency(value, lPlus, lMinus),
  });
}

/** The firing grades of a list of charge values. */
export function firingGrades(values: readonly ChargeValue[]): readonly FiringGrade[] {
  return Object.freeze(values.map(firingGrade));
}

/** The firing generator of a charge value. */
export function firingGenerator(value: ChargeValue): FiringGenerator {
  const grade = firingGrade(value);
  return Object.freeze({
    kind: "predication.firing.generator" as const,
    value,
    firingType: grade.firingType,
    lPlus: grade.lPlus,
    lMinus: grade.lMinus,
    consistency: firingConeConsistency(value, grade.lPlus, grade.lMinus),
    totality: firingTotality(value),
  });
}

/** The first cohomology of a list of valued firings. */
export function firingFirstCohomology(valuedFirings: readonly ValuedFiring[]): FiringFirstCohomology {
  const generators = Object.freeze(valuedFirings.map((firing) => Object.freeze({
    kind: "predication.firing.cohomologyGenerator" as const,
    stage: firing.stage,
    value: firing.value,
    generator: firingGenerator(firing.value),
  })));
  const lPlus = count(generators.filter((generator) => !natIsZero(generator.generator.lPlus)));
  const lMinus = count(generators.filter((generator) => !natIsZero(generator.generator.lMinus)));
  const moduleRank = count(generators);
  return Object.freeze({
    kind: "predication.firing.firstCohomology" as const,
    generators,
    module: Object.freeze({ kind: "predication.firing.cohomologyModule" as const, basis: generators, rank: moduleRank }),
    rank: moduleRank,
    lPlus,
    lMinus,
  });
}

/** A one-sided firing cohomology module. */
export const firingSideModule = (side: FiringCohomologySide, moduleRank: Natural): FiringSideModule =>
  Object.freeze({ kind: "predication.firing.sideModule" as const, side, rank: moduleRank });

/** The two-sided cohomology shadow of valued firings. */
export function firingGradeShadow(valuedFirings: readonly ValuedFiring[]): FiringCohomologyShadow {
  const h = firingFirstCohomology(valuedFirings);
  return Object.freeze({
    kind: "predication.firing.cohomologyShadow" as const,
    lPlus: h.lPlus,
    lMinus: h.lMinus,
    truthSide: firingSideModule(firingTruthCohomologySide, h.lPlus),
    falsitySide: firingSideModule(firingFalsityCohomologySide, h.lMinus),
  });
}

/** The firing generator of a generator's negation. */
export function negateFiringGenerator(generator: FiringGenerator): FiringGenerator {
  return firingGenerator(negateValue(generator.value));
}

/** Whether a list of valued firings is independent (no shared stage). */
export function firingIndependence(valuedFirings: readonly ValuedFiring[]): FiringIndependenceJudgment {
  for (let index = 0; index < valuedFirings.length; index += 1) {
    const firing = valuedFirings[index]!;
    const collision = valuedFirings.findIndex((candidate, candidateIndex) =>
      candidateIndex < index && settlingStageOrdinalCoincidenceHolds(candidate.stage, firing.stage));
    if (collision >= 0) {
      return Object.freeze({ kind: "predication.firing.independence-obstruction" as const, stage: firing.stage, firings: Object.freeze([valuedFirings[collision]!, firing]) });
    }
  }
  return Object.freeze({ kind: "predication.firing.independence:witness" as const, firings: Object.freeze([...valuedFirings]) });
}

/** Pair a settlement's non-Scott firings with charge values in order. */
export function valuedFiringsOfSettlementFiltration(filtration: Settlement, values: readonly ChargeValue[]): readonly ValuedFiring[] {
  const nonScottFiringsRead = readNonScottFiringsOfSettlementFiltration(filtration);
  if (values.length !== nonScottFiringsRead.firings.length) {
    throw new RangeError(`valuedFiringsOfSettlementFiltration: expected ${nonScottFiringsRead.firings.length} values, got ${values.length}`);
  }
  return Object.freeze(nonScottFiringsRead.firings.map((firing, index) => Object.freeze({ stage: firing.stage, value: values[index]! })));
}

/** Count charge values by firing type. */
export function firingTypeMultiplicities(values: readonly ChargeValue[]): FiringTypeMultiplicity {
  let truthOnly = natZero;
  let falsityOnly = natZero;
  let stableFiring = natZero;
  let absurdFiring = natZero;
  for (const value of values) {
    const firingType = classifyFiring(value);
    if (firingType.kind === "predication.firing.type.truthOnly") truthOnly = successor(truthOnly);
    else if (firingType.kind === "predication.firing.type.falsityOnly") falsityOnly = successor(falsityOnly);
    else if (firingType.kind === "predication.firing.type.stable") stableFiring = successor(stableFiring);
    else absurdFiring = successor(absurdFiring);
  }
  return Object.freeze({ kind: "predication.firing.typeMultiplicity" as const, truthOnly, falsityOnly, stableFiring, absurdFiring });
}

/** Classify the firing orbit of a list of charge values under negation. */
export function classifyFiringOrbit(values: readonly ChargeValue[]): FiringOrbitClassification {
  const firingMultiplicities = firingTypeMultiplicities(values);
  const truthOnly = firingMultiplicities.truthOnly;
  const falsityOnly = firingMultiplicities.falsityOnly;
  const stable = firingMultiplicities.stableFiring;
  const absurd = firingMultiplicities.absurdFiring;
  let orbitType: FiringOrbitType;
  let cardinality: FiringOrbitCardinality;
  if (natIsZero(truthOnly) && natIsZero(falsityOnly)) {
    orbitType = selfDualFiringOrbitType;
    cardinality = Object.freeze({ kind: "predication.firing.orbitCardinality.singleton" as const, rank: successor(natZero) });
  } else if (natIsZero(stable) && natIsZero(absurd)) {
    cardinality = Object.freeze({ kind: "predication.firing.orbitCardinality.pair" as const, rank: successor(successor(natZero)) });
    orbitType = natIsZero(falsityOnly) ? truthOnlyFiringOrbitType : natIsZero(truthOnly) ? falsityOnlyFiringOrbitType : exchangeMixedFiringOrbitType;
  } else {
    orbitType = mixedFiringOrbitType;
    cardinality = Object.freeze({ kind: "predication.firing.orbitCardinality.variable" as const, supportRank: count(values) });
  }
  return Object.freeze({
    kind: "predication.firing.orbit" as const,
    firingMultiplicities,
    orbitType,
    cardinality,
    duality: orbitType.kind === "predication.firing.orbitType.selfDual"
      ? Object.freeze({ kind: "predication.firing.orbitDuality:witness" as const })
      : Object.freeze({ kind: "predication.firing.orbitDuality-obstruction" as const, orbitType }),
    negated: Object.freeze(values.map(negateValue)),
  });
}

/** The self-duality record of a list of charge values. */
export function firingSelfDuality(values: readonly ChargeValue[]): FiringSelfDuality {
  const orbit = classifyFiringOrbit(values).duality;
  const symmetry: FiringSymmetryJudgment = values.every((value) => sameChargeValue(value, chargeValue("contested")) || sameChargeValue(value, chargeValue("unknown")))
    ? Object.freeze({ kind: "predication.firing.symmetry:witness" as const })
    : Object.freeze({ kind: "predication.firing.symmetry-obstruction" as const, values: Object.freeze([...values]) });
  const negation: FiringSymmetryJudgment = values.every((value) => sameChargeValue(negateValue(value), value))
    ? Object.freeze({ kind: "predication.firing.symmetry:witness" as const })
    : Object.freeze({ kind: "predication.firing.symmetry-obstruction" as const, values: Object.freeze([...values]) });
  const coherence = orbit.kind === "predication.firing.orbitDuality:witness"
    && symmetry.kind === "predication.firing.symmetry:witness"
    && negation.kind === "predication.firing.symmetry:witness"
    ? Object.freeze({ kind: "predication.firing.selfDualityCoherence:witness" as const })
    : Object.freeze({ kind: "predication.firing.selfDualityCoherence-obstruction" as const, orbit, symmetry, negation });
  return Object.freeze({ kind: "predication.firing.selfDuality" as const, orbit, symmetry, negation, coherence });
}

/** The graded cohomology of a list of charge values. */
export function firingGradeCohomology(values: readonly ChargeValue[], abRank: Natural = count(values)): FiringGradeCohomology {
  const perFiring = firingGrades(values);
  const firingMultiplicities = firingTypeMultiplicities(values);
  const lPlus = count(perFiring.filter((grade) => !natIsZero(grade.lPlus)));
  const lMinus = count(perFiring.filter((grade) => !natIsZero(grade.lMinus)));
  return Object.freeze({
    kind: "predication.firing.gradeCohomology" as const,
    values: Object.freeze([...values]),
    perFiring,
    firingMultiplicities,
    abRank,
    abelianRankComparison: rankComparison(abRank, count(values)),
    shadow: Object.freeze({
      kind: "predication.firing.cohomologyShadow" as const,
      truthSide: firingSideModule(firingTruthCohomologySide, lPlus),
      falsitySide: firingSideModule(firingFalsityCohomologySide, lMinus),
      lPlus,
      lMinus,
    }),
    shadowRankIdentity: rankIdentity(count(perFiring), abRank),
  });
}
