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
import { charge, chargeValue, negateValue, sameChargeValue } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { count, natIsZero, natZero, successor } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { rankComparison, rankIdentity } from "./cohomology.mjs";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mjs";
import { settlingStageOrdinalCoincidenceHolds } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/ordinal";
/** The truth and falsity sides of a charge value. */
export const firingSideContribution = (value) => charge(value).value;
const sidePresent = (side) => side.name === "present";
/** Frozen truth-only firing-type carrier. */
export const truthOnlyFiringType = Object.freeze({ kind: "predication.firing.type.truthOnly" });
/** Frozen falsity-only firing-type carrier. */
export const falsityOnlyFiringType = Object.freeze({ kind: "predication.firing.type.falsityOnly" });
/** Frozen stable firing-type carrier. */
export const stableFiringType = Object.freeze({ kind: "predication.firing.type.stable" });
/** Frozen absurd firing-type carrier. */
export const absurdFiringType = Object.freeze({ kind: "predication.firing.type.absurd" });
/** Frozen truth-side firing cohomology carrier. */
export const firingTruthCohomologySide = Object.freeze({ kind: "predication.firing.cohomologySide.truth" });
/** Frozen falsity-side firing cohomology carrier. */
export const firingFalsityCohomologySide = Object.freeze({ kind: "predication.firing.cohomologySide.falsity" });
/** Frozen self-dual firing orbit-type carrier. */
export const selfDualFiringOrbitType = Object.freeze({ kind: "predication.firing.orbitType.selfDual" });
/** Frozen truth-only firing orbit-type carrier. */
export const truthOnlyFiringOrbitType = Object.freeze({ kind: "predication.firing.orbitType.truthOnly" });
/** Frozen falsity-only firing orbit-type carrier. */
export const falsityOnlyFiringOrbitType = Object.freeze({ kind: "predication.firing.orbitType.falsityOnly" });
/** Frozen exchange-mixed firing orbit-type carrier. */
export const exchangeMixedFiringOrbitType = Object.freeze({ kind: "predication.firing.orbitType.exchangeMixed" });
/** Frozen mixed firing orbit-type carrier. */
export const mixedFiringOrbitType = Object.freeze({ kind: "predication.firing.orbitType.mixed" });
/** Classify a charge value by which sides are present. */
export function classifyFiring(value) {
    const [plus, minus] = firingSideContribution(value);
    if (sidePresent(plus) && sidePresent(minus))
        return stableFiringType;
    if (sidePresent(plus))
        return truthOnlyFiringType;
    if (sidePresent(minus))
        return falsityOnlyFiringType;
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
/** A firing totality carrier. */
export const firingTotality = (value) => Object.freeze({ kind: "predication.firing.totality.carrier", value });
/** The firing grade of a charge value. */
export function firingGrade(value) {
    const [plus, minus] = firingSideContribution(value);
    const lPlus = sidePresent(plus) ? successor(natZero) : natZero;
    const lMinus = sidePresent(minus) ? successor(natZero) : natZero;
    return Object.freeze({
        kind: "predication.firing.grade",
        value,
        firingType: classifyFiring(value),
        lPlus,
        lMinus,
        consistency: firingSingletonPairConsistency(value, lPlus, lMinus),
    });
}
/** The firing grades of a list of charge values. */
export function firingGrades(values) {
    return Object.freeze(values.map(firingGrade));
}
/** The firing generator of a charge value. */
export function firingGenerator(value) {
    const grade = firingGrade(value);
    return Object.freeze({
        kind: "predication.firing.generator",
        value,
        firingType: grade.firingType,
        lPlus: grade.lPlus,
        lMinus: grade.lMinus,
        consistency: firingConeConsistency(value, grade.lPlus, grade.lMinus),
        totality: firingTotality(value),
    });
}
/** The first cohomology of a list of valued firings. */
export function firingFirstCohomology(valuedFirings) {
    const generators = Object.freeze(valuedFirings.map((firing) => Object.freeze({
        kind: "predication.firing.cohomologyGenerator",
        stage: firing.stage,
        value: firing.value,
        generator: firingGenerator(firing.value),
    })));
    const lPlus = count(generators.filter((generator) => !natIsZero(generator.generator.lPlus)));
    const lMinus = count(generators.filter((generator) => !natIsZero(generator.generator.lMinus)));
    const moduleRank = count(generators);
    return Object.freeze({
        kind: "predication.firing.firstCohomology",
        generators,
        module: Object.freeze({ kind: "predication.firing.cohomologyModule", basis: generators, rank: moduleRank }),
        rank: moduleRank,
        lPlus,
        lMinus,
    });
}
/** A one-sided firing cohomology module. */
export const firingSideModule = (side, moduleRank) => Object.freeze({ kind: "predication.firing.sideModule", side, rank: moduleRank });
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
        const collision = valuedFirings.findIndex((candidate, candidateIndex) => candidateIndex < index && settlingStageOrdinalCoincidenceHolds(candidate.stage, firing.stage));
        if (collision >= 0) {
            return Object.freeze({ kind: "predication.firing.independence-obstruction", stage: firing.stage, firings: Object.freeze([valuedFirings[collision], firing]) });
        }
    }
    return Object.freeze({ kind: "predication.firing.independence:witness", firings: Object.freeze([...valuedFirings]) });
}
/** Pair a settlement's non-Scott firings with charge values in order. */
export function valuedFiringsOfSettlementFiltration(carrier, values) {
    const nonScottFiringCarrier = readNonScottFiringsOfSettlementFiltration(carrier);
    if (values.length !== nonScottFiringCarrier.firings.length) {
        throw new RangeError(`valuedFiringsOfSettlementFiltration: expected ${nonScottFiringCarrier.firings.length} values, got ${values.length}`);
    }
    return Object.freeze(nonScottFiringCarrier.firings.map((firing, index) => Object.freeze({ stage: firing.stage, value: values[index] })));
}
/** Count charge values by firing type. */
export function firingTypeMultiplicities(values) {
    let truthOnly = natZero;
    let falsityOnly = natZero;
    let stableFiring = natZero;
    let absurdFiring = natZero;
    for (const value of values) {
        const firingType = classifyFiring(value);
        if (firingType.kind === "predication.firing.type.truthOnly")
            truthOnly = successor(truthOnly);
        else if (firingType.kind === "predication.firing.type.falsityOnly")
            falsityOnly = successor(falsityOnly);
        else if (firingType.kind === "predication.firing.type.stable")
            stableFiring = successor(stableFiring);
        else
            absurdFiring = successor(absurdFiring);
    }
    return Object.freeze({ kind: "predication.firing.typeMultiplicity", truthOnly, falsityOnly, stableFiring, absurdFiring });
}
/** Classify the firing orbit of a list of charge values under negation. */
export function classifyFiringOrbit(values) {
    const firingMultiplicities = firingTypeMultiplicities(values);
    const truthOnly = firingMultiplicities.truthOnly;
    const falsityOnly = firingMultiplicities.falsityOnly;
    const stable = firingMultiplicities.stableFiring;
    const absurd = firingMultiplicities.absurdFiring;
    let orbitType;
    let cardinality;
    if (natIsZero(truthOnly) && natIsZero(falsityOnly)) {
        orbitType = selfDualFiringOrbitType;
        cardinality = Object.freeze({ kind: "predication.firing.orbitCardinality.singleton", rank: successor(natZero) });
    }
    else if (natIsZero(stable) && natIsZero(absurd)) {
        cardinality = Object.freeze({ kind: "predication.firing.orbitCardinality.pair", rank: successor(successor(natZero)) });
        orbitType = natIsZero(falsityOnly) ? truthOnlyFiringOrbitType : natIsZero(truthOnly) ? falsityOnlyFiringOrbitType : exchangeMixedFiringOrbitType;
    }
    else {
        orbitType = mixedFiringOrbitType;
        cardinality = Object.freeze({ kind: "predication.firing.orbitCardinality.variable", supportRank: count(values) });
    }
    return Object.freeze({
        kind: "predication.firing.orbit",
        firingMultiplicities,
        orbitType,
        cardinality,
        duality: orbitType.kind === "predication.firing.orbitType.selfDual"
            ? Object.freeze({ kind: "predication.firing.orbitDuality:witness" })
            : Object.freeze({ kind: "predication.firing.orbitDuality-obstruction", orbitType }),
        negated: Object.freeze(values.map(negateValue)),
    });
}
/** The self-duality record of a list of charge values. */
export function firingSelfDuality(values) {
    const orbit = classifyFiringOrbit(values).duality;
    const symmetry = values.every((value) => sameChargeValue(value, chargeValue("stable")) || sameChargeValue(value, chargeValue("absurd")))
        ? Object.freeze({ kind: "predication.firing.symmetry:witness" })
        : Object.freeze({ kind: "predication.firing.symmetry-obstruction", values: Object.freeze([...values]) });
    const negation = values.every((value) => sameChargeValue(negateValue(value), value))
        ? Object.freeze({ kind: "predication.firing.symmetry:witness" })
        : Object.freeze({ kind: "predication.firing.symmetry-obstruction", values: Object.freeze([...values]) });
    const coherence = orbit.kind === "predication.firing.orbitDuality:witness"
        && symmetry.kind === "predication.firing.symmetry:witness"
        && negation.kind === "predication.firing.symmetry:witness"
        ? Object.freeze({ kind: "predication.firing.selfDualityCoherence:witness" })
        : Object.freeze({ kind: "predication.firing.selfDualityCoherence-obstruction", orbit, symmetry, negation });
    return Object.freeze({ kind: "predication.firing.selfDuality", orbit, symmetry, negation, coherence });
}
/** The graded cohomology of a list of charge values. */
export function firingGradeCohomology(values, abRank = count(values)) {
    const perFiring = firingGrades(values);
    const firingMultiplicities = firingTypeMultiplicities(values);
    const lPlus = count(perFiring.filter((grade) => !natIsZero(grade.lPlus)));
    const lMinus = count(perFiring.filter((grade) => !natIsZero(grade.lMinus)));
    return Object.freeze({
        kind: "predication.firing.gradeCohomology",
        values: Object.freeze([...values]),
        perFiring,
        firingMultiplicities,
        abRank,
        abelianRankComparison: rankComparison(abRank, count(values)),
        shadow: Object.freeze({
            kind: "predication.firing.cohomologyShadow",
            truthSide: firingSideModule(firingTruthCohomologySide, lPlus),
            falsitySide: firingSideModule(firingFalsityCohomologySide, lMinus),
            lPlus,
            lMinus,
        }),
        shadowRankIdentity: rankIdentity(count(perFiring), abRank),
    });
}

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

/** A self-dual firing orbit. */
export const firingOrbitDualityWitnessSchema = {
  $id: "metroplat/closure/firing/firing-orbit-duality-witness",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.orbitDuality:witness" } },
  additionalProperties: false,
};

/** A firing family satisfies a symmetry. */
export const firingSymmetryWitnessSchema = {
  $id: "metroplat/closure/firing/firing-symmetry-witness",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.symmetry:witness" } },
  additionalProperties: false,
};

/** Firing self-duality coherence holds. */
export const firingSelfDualityCoherenceWitnessSchema = {
  $id: "metroplat/closure/firing/firing-self-duality-coherence-witness",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.firing.selfDualityCoherence:witness" } },
  additionalProperties: false,
};

