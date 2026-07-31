import { charge, chargeValue, negateValue, sameChargeValue, type ChargeSide, type ChargeValue } from "@emsenn/meme-algebra";
import { fromCount, natIsZero, natZero, successor, type Natural } from "@emsenn/meme-algebra";
import { rankComparison, rankIdentity, type RankComparison, type RankIdentityJudgment } from "./predication-cohomology.mjs";
import { nonScottSettlingFirings, sameSettlingStageOrdinal, type SettlingCarrier, type SettlingStageOrdinalCarrier } from "./predication-settling.mjs";

export interface TruthOnlyFiringTypeCarrier {
  readonly kind: "predication.firing.type.truthOnly";
}

export interface FalsityOnlyFiringTypeCarrier {
  readonly kind: "predication.firing.type.falsityOnly";
}

export interface StableFiringTypeCarrier {
  readonly kind: "predication.firing.type.stable";
}

export interface AbsurdFiringTypeCarrier {
  readonly kind: "predication.firing.type.absurd";
}

export type FiringTypeCarrier =
  | TruthOnlyFiringTypeCarrier
  | FalsityOnlyFiringTypeCarrier
  | StableFiringTypeCarrier
  | AbsurdFiringTypeCarrier;

export interface FiringSingletonPairConsistencyWitness {
  readonly kind: "predication.firing.singletonPairConsistency:witness";
  readonly value: ChargeValue;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

export interface FiringSingletonPairConsistencyObstruction {
  readonly kind: "predication.firing.singletonPairConsistency-obstruction";
  readonly value: ChargeValue;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

export type FiringSingletonPairConsistencyJudgment = FiringSingletonPairConsistencyWitness | FiringSingletonPairConsistencyObstruction;

export interface FiringConeConsistencyWitness {
  readonly kind: "predication.firing.coneConsistency:witness";
  readonly value: ChargeValue;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

export interface FiringConeConsistencyObstruction {
  readonly kind: "predication.firing.coneConsistency-obstruction";
  readonly value: ChargeValue;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

export type FiringConeConsistencyJudgment = FiringConeConsistencyWitness | FiringConeConsistencyObstruction;

export interface FiringTotalityCarrier {
  readonly kind: "predication.firing.totality.carrier";
  readonly value: ChargeValue;
}

export interface FiringGrade {
  readonly kind: "predication.firing.grade";
  readonly value: ChargeValue;
  readonly firingType: FiringTypeCarrier;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
  readonly consistency: FiringSingletonPairConsistencyJudgment;
}

export interface FiringGenerator {
  readonly kind: "predication.firing.generator";
  readonly value: ChargeValue;
  readonly firingType: FiringTypeCarrier;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
  readonly consistency: FiringConeConsistencyJudgment;
  readonly totality: FiringTotalityCarrier;
}

export interface FiringCohomologyGenerator {
  readonly kind: "predication.firing.cohomologyGenerator";
  readonly stage: SettlingStageOrdinalCarrier;
  readonly value: ChargeValue;
  readonly generator: FiringGenerator;
}

export interface FiringCohomologyModule {
  readonly kind: "predication.firing.cohomologyModule";
  readonly basis: readonly FiringCohomologyGenerator[];
  readonly rank: Natural;
}

export interface FiringFirstCohomology {
  readonly kind: "predication.firing.firstCohomology";
  readonly generators: readonly FiringCohomologyGenerator[];
  readonly module: FiringCohomologyModule;
  readonly rank: Natural;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

export interface FiringTruthCohomologySideCarrier {
  readonly kind: "predication.firing.cohomologySide.truth";
}

export interface FiringFalsityCohomologySideCarrier {
  readonly kind: "predication.firing.cohomologySide.falsity";
}

export type FiringCohomologySideCarrier =
  | FiringTruthCohomologySideCarrier
  | FiringFalsityCohomologySideCarrier;

export interface FiringSideModule {
  readonly kind: "predication.firing.sideModule";
  readonly side: FiringCohomologySideCarrier;
  readonly rank: Natural;
}

export interface FiringCohomologyShadow {
  readonly kind: "predication.firing.cohomologyShadow";
  readonly truthSide: FiringSideModule;
  readonly falsitySide: FiringSideModule;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

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

export interface ValuedFiring {
  readonly stage: SettlingStageOrdinalCarrier;
  readonly value: ChargeValue;
}

export interface SelfDualFiringOrbitTypeCarrier {
  readonly kind: "predication.firing.orbitType.selfDual";
}

export interface TruthOnlyFiringOrbitTypeCarrier {
  readonly kind: "predication.firing.orbitType.truthOnly";
}

export interface FalsityOnlyFiringOrbitTypeCarrier {
  readonly kind: "predication.firing.orbitType.falsityOnly";
}

export interface ExchangeMixedFiringOrbitTypeCarrier {
  readonly kind: "predication.firing.orbitType.exchangeMixed";
}

export interface MixedFiringOrbitTypeCarrier {
  readonly kind: "predication.firing.orbitType.mixed";
}

export type FiringOrbitTypeCarrier =
  | SelfDualFiringOrbitTypeCarrier
  | TruthOnlyFiringOrbitTypeCarrier
  | FalsityOnlyFiringOrbitTypeCarrier
  | ExchangeMixedFiringOrbitTypeCarrier
  | MixedFiringOrbitTypeCarrier;

export interface FiringTypeMultiplicityCarrier {
  readonly kind: "predication.firing.typeMultiplicity";
  readonly truthOnly: Natural;
  readonly falsityOnly: Natural;
  readonly stableFiring: Natural;
  readonly absurdFiring: Natural;
}

export interface FiringOrbitSingletonCardinality {
  readonly kind: "predication.firing.orbitCardinality.singleton";
  readonly rank: Natural;
}

export interface FiringOrbitPairCardinality {
  readonly kind: "predication.firing.orbitCardinality.pair";
  readonly rank: Natural;
}

export interface FiringOrbitVariableCardinality {
  readonly kind: "predication.firing.orbitCardinality.variable";
  readonly supportRank: Natural;
}

export type FiringOrbitCardinality = FiringOrbitSingletonCardinality | FiringOrbitPairCardinality | FiringOrbitVariableCardinality;

export interface FiringOrbitDualityWitness {
  readonly kind: "predication.firing.orbitDuality:witness";
}

export interface FiringOrbitDualityObstruction {
  readonly kind: "predication.firing.orbitDuality-obstruction";
  readonly orbitType: FiringOrbitTypeCarrier;
}

export type FiringOrbitDualityJudgment = FiringOrbitDualityWitness | FiringOrbitDualityObstruction;

export interface FiringOrbitClassification {
  readonly kind: "predication.firing.orbit";
  readonly firingMultiplicities: FiringTypeMultiplicityCarrier;
  readonly orbitType: FiringOrbitTypeCarrier;
  readonly cardinality: FiringOrbitCardinality;
  readonly duality: FiringOrbitDualityJudgment;
  readonly negated: readonly ChargeValue[];
}

export interface FiringSymmetryWitness {
  readonly kind: "predication.firing.symmetry:witness";
}

export interface FiringSymmetryObstruction {
  readonly kind: "predication.firing.symmetry-obstruction";
  readonly values: readonly ChargeValue[];
}

export type FiringSymmetryJudgment = FiringSymmetryWitness | FiringSymmetryObstruction;

export interface FiringSelfDualityCoherenceWitness {
  readonly kind: "predication.firing.selfDualityCoherence:witness";
}

export interface FiringSelfDualityCoherenceObstruction {
  readonly kind: "predication.firing.selfDualityCoherence-obstruction";
  readonly orbit: FiringOrbitDualityJudgment;
  readonly symmetry: FiringSymmetryJudgment;
  readonly negation: FiringSymmetryJudgment;
}

export type FiringSelfDualityCoherenceJudgment = FiringSelfDualityCoherenceWitness | FiringSelfDualityCoherenceObstruction;

export interface FiringSelfDuality {
  readonly kind: "predication.firing.selfDuality";
  readonly orbit: FiringOrbitDualityJudgment;
  readonly symmetry: FiringSymmetryJudgment;
  readonly negation: FiringSymmetryJudgment;
  readonly coherence: FiringSelfDualityCoherenceJudgment;
}

export interface FiringIndependenceWitness {
  readonly kind: "predication.firing.independence:witness";
  readonly firings: readonly ValuedFiring[];
}

export interface FiringIndependenceObstruction {
  readonly kind: "predication.firing.independence-obstruction";
  readonly stage: SettlingStageOrdinalCarrier;
  readonly firings: readonly ValuedFiring[];
}

export type FiringIndependenceJudgment = FiringIndependenceWitness | FiringIndependenceObstruction;

export const firingSideContribution = (value: ChargeValue): readonly [truth: ChargeSide, falsity: ChargeSide] =>
  charge(value).value;

const sidePresent = (side: ChargeSide): boolean => side.name === "present";

export const truthOnlyFiringType = (): TruthOnlyFiringTypeCarrier => Object.freeze({
  kind: "predication.firing.type.truthOnly" as const,
});

export const falsityOnlyFiringType = (): FalsityOnlyFiringTypeCarrier => Object.freeze({
  kind: "predication.firing.type.falsityOnly" as const,
});

export const stableFiringType = (): StableFiringTypeCarrier => Object.freeze({
  kind: "predication.firing.type.stable" as const,
});

export const absurdFiringType = (): AbsurdFiringTypeCarrier => Object.freeze({
  kind: "predication.firing.type.absurd" as const,
});

export const firingTruthCohomologySide = (): FiringTruthCohomologySideCarrier => Object.freeze({
  kind: "predication.firing.cohomologySide.truth" as const,
});

export const firingFalsityCohomologySide = (): FiringFalsityCohomologySideCarrier => Object.freeze({
  kind: "predication.firing.cohomologySide.falsity" as const,
});

export const selfDualFiringOrbitType = (): SelfDualFiringOrbitTypeCarrier => Object.freeze({
  kind: "predication.firing.orbitType.selfDual" as const,
});

export const truthOnlyFiringOrbitType = (): TruthOnlyFiringOrbitTypeCarrier => Object.freeze({
  kind: "predication.firing.orbitType.truthOnly" as const,
});

export const falsityOnlyFiringOrbitType = (): FalsityOnlyFiringOrbitTypeCarrier => Object.freeze({
  kind: "predication.firing.orbitType.falsityOnly" as const,
});

export const exchangeMixedFiringOrbitType = (): ExchangeMixedFiringOrbitTypeCarrier => Object.freeze({
  kind: "predication.firing.orbitType.exchangeMixed" as const,
});

export const mixedFiringOrbitType = (): MixedFiringOrbitTypeCarrier => Object.freeze({
  kind: "predication.firing.orbitType.mixed" as const,
});

export function classifyFiring(value: ChargeValue): FiringTypeCarrier {
  const [plus, minus] = firingSideContribution(value);
  if (sidePresent(plus) && sidePresent(minus)) return stableFiringType();
  if (sidePresent(plus)) return truthOnlyFiringType();
  if (sidePresent(minus)) return falsityOnlyFiringType();
  return absurdFiringType();
}

export function firingSingletonPairConsistency(value: ChargeValue, lPlus: Natural, lMinus: Natural): FiringSingletonPairConsistencyJudgment {
  return !natIsZero(lPlus) && !natIsZero(lMinus)
    ? Object.freeze({
      kind: "predication.firing.singletonPairConsistency-obstruction" as const,
      value,
      lPlus,
      lMinus,
    })
    : Object.freeze({
      kind: "predication.firing.singletonPairConsistency:witness" as const,
      value,
      lPlus,
      lMinus,
    });
}

export function firingConeConsistency(value: ChargeValue, lPlus: Natural, lMinus: Natural): FiringConeConsistencyJudgment {
  return !natIsZero(lPlus) && !natIsZero(lMinus)
    ? Object.freeze({
      kind: "predication.firing.coneConsistency-obstruction" as const,
      value,
      lPlus,
      lMinus,
    })
    : Object.freeze({
      kind: "predication.firing.coneConsistency:witness" as const,
      value,
      lPlus,
      lMinus,
    });
}

export const firingTotality = (value: ChargeValue): FiringTotalityCarrier => Object.freeze({
  kind: "predication.firing.totality.carrier" as const,
  value,
});

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

export function firingGrades(values: readonly ChargeValue[]): readonly FiringGrade[] {
  return Object.freeze(values.map(firingGrade));
}

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

export function firingFirstCohomology(valuedFirings: readonly ValuedFiring[]): FiringFirstCohomology {
  const generators = Object.freeze(valuedFirings.map((firing) => Object.freeze({
    kind: "predication.firing.cohomologyGenerator" as const,
    stage: firing.stage,
    value: firing.value,
    generator: firingGenerator(firing.value),
  })));
  const lPlus = generators.filter((generator) => !natIsZero(generator.generator.lPlus)).length;
  const lMinus = generators.filter((generator) => !natIsZero(generator.generator.lMinus)).length;
  const moduleRank = fromCount(generators.length);
  return Object.freeze({
    kind: "predication.firing.firstCohomology" as const,
    generators,
    module: Object.freeze({
      kind: "predication.firing.cohomologyModule" as const,
      basis: generators,
      rank: moduleRank,
    }),
    rank: moduleRank,
    lPlus: fromCount(lPlus),
    lMinus: fromCount(lMinus),
  });
}

export const firingSideModule = (side: FiringCohomologySideCarrier, moduleRank: Natural): FiringSideModule => Object.freeze({
  kind: "predication.firing.sideModule" as const,
  side,
  rank: moduleRank,
});

export function firingGradeShadow(valuedFirings: readonly ValuedFiring[]): FiringCohomologyShadow {
  const h = firingFirstCohomology(valuedFirings);
  return Object.freeze({
    kind: "predication.firing.cohomologyShadow" as const,
    lPlus: h.lPlus,
    lMinus: h.lMinus,
    truthSide: firingSideModule(firingTruthCohomologySide(), h.lPlus),
    falsitySide: firingSideModule(firingFalsityCohomologySide(), h.lMinus),
  });
}

export function negateFiringGenerator(generator: FiringGenerator): FiringGenerator {
  return firingGenerator(negateValue(generator.value));
}

export function firingIndependence(valuedFirings: readonly ValuedFiring[]): FiringIndependenceJudgment {
  for (let index = 0; index < valuedFirings.length; index += 1) {
    const firing = valuedFirings[index]!;
    const collision = valuedFirings.findIndex((candidate, candidateIndex) =>
      candidateIndex < index && sameSettlingStageOrdinal(candidate.stage, firing.stage));
    if (collision >= 0) {
      return Object.freeze({
        kind: "predication.firing.independence-obstruction" as const,
        stage: firing.stage,
        firings: Object.freeze([valuedFirings[collision]!, firing]),
      });
    }
  }
  return Object.freeze({
    kind: "predication.firing.independence:witness" as const,
    firings: Object.freeze([...valuedFirings]),
  });
}

export function valuedFiringsFromSettling(carrier: SettlingCarrier, values: readonly ChargeValue[]): readonly ValuedFiring[] {
  const nonScottFiringCarrier = nonScottSettlingFirings(carrier);
  if (values.length !== nonScottFiringCarrier.firings.length) {
    throw new RangeError(`valuedFiringsFromSettling: expected ${nonScottFiringCarrier.firings.length} values, got ${values.length}`);
  }
  return Object.freeze(nonScottFiringCarrier.firings.map((firing, index) => Object.freeze({
    stage: firing.stage,
    value: values[index]!,
  })));
}

export function firingTypeMultiplicities(values: readonly ChargeValue[]): FiringTypeMultiplicityCarrier {
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
  return Object.freeze({
    kind: "predication.firing.typeMultiplicity" as const,
    truthOnly,
    falsityOnly,
    stableFiring,
    absurdFiring,
  });
}

export function classifyFiringOrbit(values: readonly ChargeValue[]): FiringOrbitClassification {
  const firingMultiplicities = firingTypeMultiplicities(values);
  const truthOnly = firingMultiplicities.truthOnly;
  const falsityOnly = firingMultiplicities.falsityOnly;
  const stable = firingMultiplicities.stableFiring;
  const absurd = firingMultiplicities.absurdFiring;
  let orbitType: FiringOrbitTypeCarrier;
  let cardinality: FiringOrbitCardinality;
  if (natIsZero(truthOnly) && natIsZero(falsityOnly)) {
    orbitType = selfDualFiringOrbitType();
    cardinality = Object.freeze({ kind: "predication.firing.orbitCardinality.singleton" as const, rank: successor(natZero) });
  } else if (natIsZero(stable) && natIsZero(absurd)) {
    cardinality = Object.freeze({ kind: "predication.firing.orbitCardinality.pair" as const, rank: successor(successor(natZero)) });
    orbitType = natIsZero(falsityOnly)
      ? truthOnlyFiringOrbitType()
      : natIsZero(truthOnly)
        ? falsityOnlyFiringOrbitType()
        : exchangeMixedFiringOrbitType();
  } else {
    orbitType = mixedFiringOrbitType();
    cardinality = Object.freeze({
      kind: "predication.firing.orbitCardinality.variable" as const,
      supportRank: fromCount(values.length),
    });
  }

  return Object.freeze({
    kind: "predication.firing.orbit" as const,
    firingMultiplicities,
    orbitType,
    cardinality,
    duality: orbitType.kind === "predication.firing.orbitType.selfDual"
      ? Object.freeze({ kind: "predication.firing.orbitDuality:witness" as const })
      : Object.freeze({
        kind: "predication.firing.orbitDuality-obstruction" as const,
        orbitType,
      }),
    negated: Object.freeze(values.map(negateValue)),
  });
}

export function firingSelfDuality(values: readonly ChargeValue[]): FiringSelfDuality {
  const orbit = classifyFiringOrbit(values).duality;
  const symmetry: FiringSymmetryJudgment = values.every((value) => sameChargeValue(value, chargeValue("stable")) || sameChargeValue(value, chargeValue("absurd")))
    ? Object.freeze({ kind: "predication.firing.symmetry:witness" as const })
    : Object.freeze({
      kind: "predication.firing.symmetry-obstruction" as const,
      values: Object.freeze([...values]),
    });
  const negation: FiringSymmetryJudgment = values.every((value) => sameChargeValue(negateValue(value), value))
    ? Object.freeze({ kind: "predication.firing.symmetry:witness" as const })
    : Object.freeze({
      kind: "predication.firing.symmetry-obstruction" as const,
      values: Object.freeze([...values]),
    });
  const coherence = orbit.kind === "predication.firing.orbitDuality:witness"
    && symmetry.kind === "predication.firing.symmetry:witness"
    && negation.kind === "predication.firing.symmetry:witness"
    ? Object.freeze({ kind: "predication.firing.selfDualityCoherence:witness" as const })
    : Object.freeze({
      kind: "predication.firing.selfDualityCoherence-obstruction" as const,
      orbit,
      symmetry,
      negation,
    });
  return Object.freeze({
    kind: "predication.firing.selfDuality" as const,
    orbit,
    symmetry,
    negation,
    coherence,
  });
}

export function firingGradeCohomology(values: readonly ChargeValue[], abRank: Natural = fromCount(values.length)): FiringGradeCohomology {
  const perFiring = firingGrades(values);
  const firingMultiplicities = firingTypeMultiplicities(values);
  const lPlus = fromCount(perFiring.filter((grade) => !natIsZero(grade.lPlus)).length);
  const lMinus = fromCount(perFiring.filter((grade) => !natIsZero(grade.lMinus)).length);
  return Object.freeze({
    kind: "predication.firing.gradeCohomology" as const,
    values: Object.freeze([...values]),
    perFiring,
    firingMultiplicities,
    abRank,
    abelianRankComparison: rankComparison(abRank, fromCount(values.length)),
    shadow: Object.freeze({
      kind: "predication.firing.cohomologyShadow" as const,
      truthSide: firingSideModule(firingTruthCohomologySide(), lPlus),
      falsitySide: firingSideModule(firingFalsityCohomologySide(), lMinus),
      lPlus,
      lMinus,
    }),
    shadowRankIdentity: rankIdentity(fromCount(perFiring.length), abRank),
  });
}
