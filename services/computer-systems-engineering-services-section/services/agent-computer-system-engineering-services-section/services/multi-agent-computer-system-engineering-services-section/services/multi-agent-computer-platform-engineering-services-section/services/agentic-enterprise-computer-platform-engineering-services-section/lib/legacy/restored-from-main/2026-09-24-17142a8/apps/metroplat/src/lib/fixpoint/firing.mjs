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

import { charge, negateValue } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { natIsZero } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mjs";

import { settlingStageOrdinalCoincidenceHolds } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/ordinal";
import { firingGrade, firingFirstCohomology, firingGenerator } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/firing";

/** A firing whose truth side is present and falsity absent. */
export const truthOnlyFiringTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/truth-only-firing-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.type.truthOnly" } },
  additionalProperties: false,
};

/** A firing whose falsity side is present and truth absent. */
export const falsityOnlyFiringTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/falsity-only-firing-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.type.falsityOnly" } },
  additionalProperties: false,
};

/** A firing whose truth and falsity sides are both present. */
export const stableFiringTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/stable-firing-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.type.stable" } },
  additionalProperties: false,
};

/** A firing whose truth and falsity sides are both absent. */
export const absurdFiringTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/absurd-firing-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.type.absurd" } },
  additionalProperties: false,
};

/** The four firing types by which sides are present. */

/** Singleton-pair consistency holds (not both sides nonzero). */

/** Singleton-pair consistency fails (both sides nonzero). */

/** Judgment of singleton-pair consistency. */

/** Cone consistency holds. */

/** Cone consistency fails. */

/** Judgment of cone consistency. */

/** The totality datum of a firing (its charge value). */

/** A graded record of a single firing. */

/** A generator record for a firing. */

/** A firing generator placed in cohomology (at a stage). */

/** The free module on firing cohomology generators. */

/** First cohomology of a firing family. */

/** The truth side of firing cohomology. */
export const firingTruthCohomologySideSchemaContractSchema = {
  $id: "metroplat/closure/firing/firing-truth-cohomology-side",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.cohomologySide.truth" } },
  additionalProperties: false,
};

/** The falsity side of firing cohomology. */
export const firingFalsityCohomologySideSchemaContractSchema = {
  $id: "metroplat/closure/firing/firing-falsity-cohomology-side",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.cohomologySide.falsity" } },
  additionalProperties: false,
};

/** A firing cohomology side. */

/** A one-sided firing cohomology module. */

/** The two-sided shadow of firing cohomology. */

/** Counts of firings by type. */

/** Graded cohomology of a family of charge values. */

/** A firing paired with a value (stage + charge). */

/** A firing orbit fixed by negation. */
export const selfDualFiringOrbitTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/self-dual-firing-orbit-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.orbitType.selfDual" } },
  additionalProperties: false,
};

/** A firing orbit of only truth-only firings. */
export const truthOnlyFiringOrbitTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/truth-only-firing-orbit-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.orbitType.truthOnly" } },
  additionalProperties: false,
};

/** A firing orbit of only falsity-only firings. */
export const falsityOnlyFiringOrbitTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/falsity-only-firing-orbit-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.orbitType.falsityOnly" } },
  additionalProperties: false,
};

/** A firing orbit of both one-sided firings, no stable/absurd. */
export const exchangeMixedFiringOrbitTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/exchange-mixed-firing-orbit-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.orbitType.exchangeMixed" } },
  additionalProperties: false,
};

/** A firing orbit holding stable/absurd alongside one-sided. */
export const mixedFiringOrbitTypeSchemaContractSchema = {
  $id: "metroplat/closure/firing/mixed-firing-orbit-type",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.orbitType.mixed" } },
  additionalProperties: false,
};

/** A firing orbit type. */

/** A singleton firing-orbit cardinality. */

/** A pair firing-orbit cardinality. */

/** A variable firing-orbit cardinality. */

/** A firing orbit cardinality. */

/** A self-dual firing orbit. */
export const firingOrbitDualityWitnessSchema = {
  $id: "metroplat/closure/firing/firing-orbit-duality-witness",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.orbitDuality:witness" } },
  additionalProperties: false,
};

/** A non-self-dual firing orbit. */

/** Judgment of a firing orbit's self-duality. */

/** A firing orbit classification. */

/** A firing family satisfies a symmetry. */
export const firingSymmetryWitnessSchema = {
  $id: "metroplat/closure/firing/firing-symmetry-witness",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.symmetry:witness" } },
  additionalProperties: false,
};

/** A firing family violates a symmetry. */

/** Judgment of a firing family's symmetry. */

/** Firing self-duality coherence holds. */
export const firingSelfDualityCoherenceWitnessSchema = {
  $id: "metroplat/closure/firing/firing-self-duality-coherence-witness",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.selfDualityCoherence:witness" } },
  additionalProperties: false,
};

/** Firing self-duality coherence fails. */

/** Judgment of firing self-duality coherence. */

/** A self-duality record for a firing family. */

/** Valued firings are independent (no shared stage). */

/** Valued firings collide on a stage. */

/** Judgment of valued-firing independence. */

/** The truth and falsity sides of a charge value. */
export const firingSideContribution = (value) => charge(value).value;

const sidePresent = (side) => side.name === "present";

/** Frozen truth-only firing-type filtration. */
export const truthOnlyFiringType = Object.freeze({ kind: "predication.firing.type.truthOnly" });
/** Frozen falsity-only firing-type filtration. */
export const falsityOnlyFiringType = Object.freeze({ kind: "predication.firing.type.falsityOnly" });
/** Frozen stable firing-type filtration. */
export const stableFiringType = Object.freeze({ kind: "predication.firing.type.stable" });
/** Frozen absurd firing-type filtration. */
export const absurdFiringType = Object.freeze({ kind: "predication.firing.type.absurd" });
/** Frozen truth-side firing cohomology filtration. */
export const firingTruthCohomologySide = Object.freeze({ kind: "predication.firing.cohomologySide.truth" });
/** Frozen falsity-side firing cohomology filtration. */
export const firingFalsityCohomologySide = Object.freeze({ kind: "predication.firing.cohomologySide.falsity" });
/** Frozen self-dual firing orbit-type filtration. */
export const selfDualFiringOrbitType = Object.freeze({ kind: "predication.firing.orbitType.selfDual" });
/** Frozen truth-only firing orbit-type filtration. */
export const truthOnlyFiringOrbitType = Object.freeze({ kind: "predication.firing.orbitType.truthOnly" });
/** Frozen falsity-only firing orbit-type filtration. */
export const falsityOnlyFiringOrbitType = Object.freeze({ kind: "predication.firing.orbitType.falsityOnly" });
/** Frozen exchange-mixed firing orbit-type filtration. */
export const exchangeMixedFiringOrbitType = Object.freeze({ kind: "predication.firing.orbitType.exchangeMixed" });
/** Frozen mixed firing orbit-type filtration. */
export const mixedFiringOrbitType = Object.freeze({ kind: "predication.firing.orbitType.mixed" });

/** Classify a charge value by which sides are present. */
export function classifyFiring(value) {
  const [plus, minus] = firingSideContribution(value);
  if (sidePresent(plus) && sidePresent(minus)) return stableFiringType;
  if (sidePresent(plus)) return truthOnlyFiringType;
  if (sidePresent(minus)) return falsityOnlyFiringType;
  return absurdFiringType;
}

/** Judge singleton-pair consistency (obstruction when both sides nonzero). */
export function firingSingletonPairConsistency(value, lPlus, lMinus) {
  return !natIsZero(lPlus) && !natIsZero(lMinus)
    ? Object.freeze({ kind: "predication.firing.singletonPairConsistency-obstruction", value, lPlus, lMinus })
    : Object.freeze({ kind: "predication.firing.singletonPairConsistency:witness", value, lPlus, lMinus });
}

/** Judge cone consistency (obstruction when both sides nonzero). */
export function firingConeConsistency(value, lPlus, lMinus) {
  return !natIsZero(lPlus) && !natIsZero(lMinus)
    ? Object.freeze({ kind: "predication.firing.coneConsistency-obstruction", value, lPlus, lMinus })
    : Object.freeze({ kind: "predication.firing.coneConsistency:witness", value, lPlus, lMinus });
}

/** A firing totality filtration. */
export const firingTotality = (value) => Object.freeze({ kind: "predication.firing.totality", value });

/** The firing grades of a list of charge values. */
export function firingGrades(values) {
  return Object.freeze(values.map(firingGrade));
}

/** A one-sided firing cohomology module. */
export const firingSideModule = (side, moduleRank) =>
  Object.freeze({ kind: "predication.firing.sideModule", side, rank: moduleRank });

/** The two-sided cohomology shadow of valued firings. */
export function firingGradeShadow(valuedFirings) {
  const h = firingFirstCohomology(valuedFirings);
  return Object.freeze({
    kind: "predication.firing.cohomologyShadow",
    lPlus: h.lPlus,
    lMinus: h.lMinus,
    truthSide: firingSideModule(firingTruthCohomologySide, h.lPlus),
    falsitySide: firingSideModule(firingFalsityCohomologySide, h.lMinus),
  });
}

/** The firing generator of a generator's negation. */
export function negateFiringGenerator(generator) {
  return firingGenerator(negateValue(generator.value));
}

/** Whether a list of valued firings is independent (no shared stage). */
export function firingIndependence(valuedFirings) {
  for (let index = 0; index < valuedFirings.length; index += 1) {
    const firing = valuedFirings[index];
    const collision = valuedFirings.findIndex((candidate, candidateIndex) =>
      candidateIndex < index && settlingStageOrdinalCoincidenceHolds(candidate.stage, firing.stage));
    if (collision >= 0) {
      return Object.freeze({ kind: "predication.firing.independence-obstruction", stage: firing.stage, firings: Object.freeze([valuedFirings[collision], firing]) });
    }
  }
  return Object.freeze({ kind: "predication.firing.independence:witness", firings: Object.freeze([...valuedFirings]) });
}

/** Pair a settlement's non-Scott firings with charge values in order. */
export function valuedFiringsOfSettlementFiltration(filtration, values) {
  const nonScottFiringsRead = readNonScottFiringsOfSettlementFiltration(filtration);
  if (values.length !== nonScottFiringsRead.firings.length) {
    throw new RangeError(`valuedFiringsOfSettlementFiltration: expected ${nonScottFiringsRead.firings.length} values, got ${values.length}`);
  }
  return Object.freeze(nonScottFiringsRead.firings.map((firing, index) => Object.freeze({ stage: firing.stage, value: values[index] })));
}

