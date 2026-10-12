/**
 * models/quantum-contextuality/empirical-model - finite weighted empirical models.
 *
 * This captures `Obsmetrologia.Relational.Quantum.EmpiricalModel`: weighted
 * context distributions, single-measurement marginals, no-signaling, induced
 * global distributions, and the probabilistic PR-box witness.
 */

import {
  measurementScenario,
  prMeasurements,
  prScenario,
  type OutcomeAssignment,
  type PrMeasurement,
  type Scenario,
} from "./measurement-scenario.mts";

export interface WeightedAssignment<Measurement extends string, Outcome extends string | boolean | number> {
  readonly assignment: OutcomeAssignment<Measurement, Outcome>;
  readonly weight: number;
}

export type WDist<Measurement extends string, Outcome extends string | boolean | number> =
  readonly WeightedAssignment<Measurement, Outcome>[];

export interface PModel<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.empiricalModel.pModel";
  readonly scenario: Scenario<Measurement>;
  readonly outcomes: readonly Outcome[];
  readonly dist: (context: readonly Measurement[]) => WDist<Measurement, Outcome>;
}

export interface NoSignalingWitness<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.empiricalModel.noSignaling:witness";
  readonly model: PModel<Measurement, Outcome>;
  readonly noSignaling: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Quantum.NoSignaling";
}

export interface GlobalDistImpliesNoSignalingWitness<Measurement extends string, Outcome extends string | boolean | number> {
  readonly kind: "relational.quantum.empiricalModel.globalDist_implies_noSignaling:witness";
  readonly scenario: Scenario<Measurement>;
  readonly globalDistribution: WDist<Measurement, Outcome>;
  readonly model: PModel<Measurement, Outcome>;
  readonly noSignaling: NoSignalingWitness<Measurement, Outcome>;
  readonly leanTheorem: "Obsmetrologia.Relational.Quantum.globalDist_implies_noSignaling";
}

export interface PrBoxPNoSignalingWitness {
  readonly kind: "relational.quantum.empiricalModel.prBoxP_noSignaling:witness";
  readonly model: PModel<PrMeasurement, boolean>;
  readonly noSignaling: NoSignalingWitness<PrMeasurement, boolean>;
  readonly contextDistributionsVary: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Quantum.prBoxP_noSignaling";
}

export interface EmpiricalModelReceipt {
  readonly kind: "relational.quantum.empiricalModel.receipt:witness";
  readonly globalNoSignaling: GlobalDistImpliesNoSignalingWitness<PrMeasurement, boolean>;
  readonly prBoxNoSignaling: PrBoxPNoSignalingWitness;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Quantum.EmpiricalModel";
}

function normalizeAssignment<Measurement extends string, Outcome extends string | boolean | number>(
  measurements: readonly Measurement[],
  assignment: OutcomeAssignment<Measurement, Outcome>,
  caller: string,
): OutcomeAssignment<Measurement, Outcome> {
  return Object.freeze(Object.fromEntries(measurements.map((measurement) => {
    if (!Object.hasOwn(assignment, measurement)) throw new TypeError(`${caller}: missing outcome for ${measurement}`);
    return [measurement, assignment[measurement]];
  })) as Record<Measurement, Outcome>);
}

function contextEquals<Measurement extends string>(left: readonly Measurement[], right: readonly Measurement[]): boolean {
  return left.length === right.length && left.every((measurement, index) => measurement === right[index]);
}

function sameAssignmentOnContext<Measurement extends string, Outcome extends string | boolean | number>(
  context: readonly Measurement[],
  left: OutcomeAssignment<Measurement, Outcome>,
  right: OutcomeAssignment<Measurement, Outcome>,
): boolean {
  return context.every((measurement) => left[measurement] === right[measurement]);
}

function normalizeDistribution<Measurement extends string, Outcome extends string | boolean | number>(
  measurements: readonly Measurement[],
  distribution: WDist<Measurement, Outcome>,
  caller: string,
): WDist<Measurement, Outcome> {
  return Object.freeze(distribution.map((entry) => {
    if (!Number.isInteger(entry.weight) || entry.weight < 0) {
      throw new TypeError(`${caller}: weights must be natural-number counts`);
    }
    return Object.freeze({
      assignment: normalizeAssignment(measurements, entry.assignment, caller),
      weight: entry.weight,
    });
  }));
}

function admittedContext<Measurement extends string>(
  scenario: Scenario<Measurement>,
  context: readonly Measurement[],
  caller: string,
): readonly Measurement[] {
  const found = scenario.contexts.find((candidate) => contextEquals(candidate, context));
  if (found === undefined) throw new TypeError(`${caller}: context is not in the scenario`);
  return found;
}

export function weightedAssignment<Measurement extends string, Outcome extends string | boolean | number>(
  measurements: readonly Measurement[],
  assignment: OutcomeAssignment<Measurement, Outcome>,
  weight: number,
): WeightedAssignment<Measurement, Outcome> {
  return normalizeDistribution(measurements, [Object.freeze({ assignment, weight })], "weightedAssignment")[0]!;
}

export function singleMarginal<Measurement extends string, Outcome extends string | boolean | number>(
  distribution: WDist<Measurement, Outcome>,
  measurement: Measurement,
  outcome: Outcome,
): number {
  return distribution.reduce((total, entry) => entry.assignment[measurement] === outcome ? total + entry.weight : total, 0);
}

export function probabilisticModel<Measurement extends string, Outcome extends string | boolean | number>(
  scenario: Scenario<Measurement>,
  outcomes: readonly Outcome[],
  dist: (context: readonly Measurement[]) => WDist<Measurement, Outcome>,
): PModel<Measurement, Outcome> {
  if (outcomes.length === 0) throw new TypeError("probabilisticModel: expected at least one outcome");
  return Object.freeze({
    kind: "relational.quantum.empiricalModel.pModel" as const,
    scenario,
    outcomes: Object.freeze([...outcomes]),
    dist: (context: readonly Measurement[]) => {
      const admitted = admittedContext(scenario, context, "probabilisticModel.dist");
      return normalizeDistribution(scenario.measurements, dist(admitted), "probabilisticModel.dist");
    },
  });
}

export function noSignaling<Measurement extends string, Outcome extends string | boolean | number>(
  model: PModel<Measurement, Outcome>,
): NoSignalingWitness<Measurement, Outcome> | undefined {
  for (const context of model.scenario.contexts) {
    for (const otherContext of model.scenario.contexts) {
      for (const measurement of context) {
        if (!otherContext.includes(measurement)) continue;
        for (const outcome of model.outcomes) {
          if (singleMarginal(model.dist(context), measurement, outcome) !== singleMarginal(model.dist(otherContext), measurement, outcome)) {
            return undefined;
          }
        }
      }
    }
  }
  return Object.freeze({
    kind: "relational.quantum.empiricalModel.noSignaling:witness" as const,
    model,
    noSignaling: true as const,
    leanDefinition: "Obsmetrologia.Relational.Quantum.NoSignaling" as const,
  });
}

export function inducedModel<Measurement extends string, Outcome extends string | boolean | number>(
  scenario: Scenario<Measurement>,
  outcomes: readonly Outcome[],
  globalDistribution: WDist<Measurement, Outcome>,
): PModel<Measurement, Outcome> {
  const admitted = normalizeDistribution(scenario.measurements, globalDistribution, "inducedModel");
  return probabilisticModel(scenario, outcomes, () => admitted);
}

export function globalDistImpliesNoSignaling<Measurement extends string, Outcome extends string | boolean | number>(
  scenario: Scenario<Measurement>,
  outcomes: readonly Outcome[],
  globalDistribution: WDist<Measurement, Outcome>,
): GlobalDistImpliesNoSignalingWitness<Measurement, Outcome> {
  const model = inducedModel(scenario, outcomes, globalDistribution);
  const witness = noSignaling(model);
  if (witness === undefined) throw new TypeError("globalDistImpliesNoSignaling: induced model was signaling");
  return Object.freeze({
    kind: "relational.quantum.empiricalModel.globalDist_implies_noSignaling:witness" as const,
    scenario,
    globalDistribution: model.dist(scenario.contexts[0]!),
    model,
    noSignaling: witness,
    leanTheorem: "Obsmetrologia.Relational.Quantum.globalDist_implies_noSignaling" as const,
  });
}

export function prAssignment(a: boolean, aPrime: boolean, b: boolean, bPrime: boolean): OutcomeAssignment<PrMeasurement, boolean> {
  return Object.freeze({ a, aPrime, b, bPrime });
}

export function prDistB(context: readonly PrMeasurement[]): WDist<PrMeasurement, boolean> {
  const allFalse = prAssignment(false, false, false, false);
  if (contextEquals(context, ["a", "b"])) {
    return Object.freeze([
      weightedAssignment(prMeasurements, allFalse, 1),
      weightedAssignment(prMeasurements, prAssignment(true, false, true, false), 1),
    ]);
  }
  if (contextEquals(context, ["a", "bPrime"])) {
    return Object.freeze([
      weightedAssignment(prMeasurements, allFalse, 1),
      weightedAssignment(prMeasurements, prAssignment(true, false, false, true), 1),
    ]);
  }
  if (contextEquals(context, ["aPrime", "b"])) {
    return Object.freeze([
      weightedAssignment(prMeasurements, allFalse, 1),
      weightedAssignment(prMeasurements, prAssignment(false, true, true, false), 1),
    ]);
  }
  if (contextEquals(context, ["aPrime", "bPrime"])) {
    return Object.freeze([
      weightedAssignment(prMeasurements, prAssignment(false, false, false, true), 1),
      weightedAssignment(prMeasurements, prAssignment(false, true, false, false), 1),
    ]);
  }
  return Object.freeze([]);
}

export function prBoxP(): PModel<PrMeasurement, boolean> {
  return probabilisticModel(prScenario(), Object.freeze([false, true]), prDistB);
}

export function prBoxPNoSignaling(): PrBoxPNoSignalingWitness {
  const model = prBoxP();
  const witness = noSignaling(model);
  if (witness === undefined) throw new TypeError("prBoxPNoSignaling: PR-box model was signaling");
  return Object.freeze({
    kind: "relational.quantum.empiricalModel.prBoxP_noSignaling:witness" as const,
    model,
    noSignaling: witness,
    contextDistributionsVary: true as const,
    leanTheorem: "Obsmetrologia.Relational.Quantum.prBoxP_noSignaling" as const,
  });
}

export function empiricalModelReceipt(): EmpiricalModelReceipt {
  const scenario = measurementScenario(prMeasurements, [["a", "b"], ["a", "bPrime"]]);
  const globalDistribution = Object.freeze([
    weightedAssignment(prMeasurements, prAssignment(false, false, false, false), 2),
    weightedAssignment(prMeasurements, prAssignment(true, false, true, false), 1),
  ]);
  return Object.freeze({
    kind: "relational.quantum.empiricalModel.receipt:witness" as const,
    globalNoSignaling: globalDistImpliesNoSignaling(scenario, Object.freeze([false, true]), globalDistribution),
    prBoxNoSignaling: prBoxPNoSignaling(),
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.EmpiricalModel" as const,
  });
}

export { sameAssignmentOnContext };
