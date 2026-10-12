/**
 * models/quantum-contextuality/hardy-empirical-model - Hardy no-signaling empirical model.
 *
 * This captures `Obsmetrologia.Relational.Quantum.HardyEmpiricalModel`: the
 * weighted no-signaling Hardy distributions and the logical-not-strong
 * phenomenon in their possibilistic support.
 */

import {
  logicallyContextual,
} from "./contextual-obstruction.mts";
import {
  noSignaling,
  prAssignment,
  probabilisticModel,
  weightedAssignment,
  type NoSignalingWitness,
  type PModel,
  type WDist,
} from "./empirical-model.mts";
import {
  hasGlobalSection,
  prMeasurements,
  prScenario,
  stronglyContextual,
  type HasGlobalSectionWitness,
  type PrMeasurement,
} from "./measurement-scenario.mts";
import {
  toSupport,
} from "./support-contextuality.mts";

export interface HardyBoxPNoSignalingWitness {
  readonly kind: "relational.quantum.hardyEmpiricalModel.noSignaling:witness";
  readonly model: PModel<PrMeasurement, boolean>;
  readonly noSignaling: NoSignalingWitness<PrMeasurement, boolean>;
  readonly contextDistributionsVary: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Quantum.hardyBoxP_noSignaling";
}

export interface HardyBoxPSupportLogicalNotStrongWitness {
  readonly kind: "relational.quantum.hardyEmpiricalModel.support_logical_not_strong:witness";
  readonly noSignaling: HardyBoxPNoSignalingWitness;
  readonly supportGlobalSection: HasGlobalSectionWitness<PrMeasurement, boolean>;
  readonly logicallyContextual: true;
  readonly notStronglyContextual: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Quantum.hardyBoxP_support_hasGlobalSection",
    "Obsmetrologia.Relational.Quantum.hardyBoxP_support_not_stronglyContextual",
    "Obsmetrologia.Relational.Quantum.hardyBoxP_witness_support",
    "Obsmetrologia.Relational.Quantum.hardyBoxP_witness_not_extends",
    "Obsmetrologia.Relational.Quantum.hardyBoxP_support_logicallyContextual",
    "Obsmetrologia.Relational.Quantum.hardyBoxP_support_logical_not_strong",
  ];
}

export interface HardyEmpiricalModelReceipt {
  readonly kind: "relational.quantum.hardyEmpiricalModel.receipt:witness";
  readonly noSignaling: HardyBoxPNoSignalingWitness;
  readonly supportPhenomenon: HardyBoxPSupportLogicalNotStrongWitness;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Quantum.HardyEmpiricalModel";
}

function contextEquals(left: readonly PrMeasurement[], right: readonly PrMeasurement[]): boolean {
  return left.length === right.length && left.every((measurement, index) => measurement === right[index]);
}

export function hardyDistB(context: readonly PrMeasurement[]): WDist<PrMeasurement, boolean> {
  if (contextEquals(context, ["a", "b"])) {
    return Object.freeze([
      weightedAssignment(prMeasurements, prAssignment(false, false, true, false), 2),
      weightedAssignment(prMeasurements, prAssignment(true, false, false, false), 2),
    ]);
  }
  if (contextEquals(context, ["a", "bPrime"])) {
    return Object.freeze([
      weightedAssignment(prMeasurements, prAssignment(false, false, false, false), 2),
      weightedAssignment(prMeasurements, prAssignment(true, false, false, true), 2),
    ]);
  }
  if (contextEquals(context, ["aPrime", "b"])) {
    return Object.freeze([
      weightedAssignment(prMeasurements, prAssignment(false, false, false, false), 2),
      weightedAssignment(prMeasurements, prAssignment(false, true, true, false), 2),
    ]);
  }
  if (contextEquals(context, ["aPrime", "bPrime"])) {
    return Object.freeze([
      weightedAssignment(prMeasurements, prAssignment(false, false, false, false), 1),
      weightedAssignment(prMeasurements, prAssignment(false, false, false, true), 1),
      weightedAssignment(prMeasurements, prAssignment(false, true, false, false), 1),
      weightedAssignment(prMeasurements, prAssignment(false, true, false, true), 1),
    ]);
  }
  return Object.freeze([]);
}

export function hardyBoxP(): PModel<PrMeasurement, boolean> {
  return probabilisticModel(prScenario(), Object.freeze([false, true]), hardyDistB);
}

export function hardyBoxPNoSignaling(): HardyBoxPNoSignalingWitness {
  const model = hardyBoxP();
  const witness = noSignaling(model);
  if (witness === undefined) throw new TypeError("hardyBoxPNoSignaling: Hardy empirical model was signaling");
  return Object.freeze({
    kind: "relational.quantum.hardyEmpiricalModel.noSignaling:witness" as const,
    model,
    noSignaling: witness,
    contextDistributionsVary: true as const,
    leanTheorem: "Obsmetrologia.Relational.Quantum.hardyBoxP_noSignaling" as const,
  });
}

export function hardyBoxPSupportLogicalNotStrong(): HardyBoxPSupportLogicalNotStrongWitness {
  const noSignalingWitness = hardyBoxPNoSignaling();
  const support = toSupport(noSignalingWitness.model).supportModel;
  const global = hasGlobalSection(support);
  if (global === undefined || logicallyContextual(support) === undefined || stronglyContextual(support) !== undefined) {
    throw new TypeError("hardyBoxPSupportLogicalNotStrong: Hardy support phenomenon check failed");
  }
  return Object.freeze({
    kind: "relational.quantum.hardyEmpiricalModel.support_logical_not_strong:witness" as const,
    noSignaling: noSignalingWitness,
    supportGlobalSection: global,
    logicallyContextual: true as const,
    notStronglyContextual: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.hardyBoxP_support_hasGlobalSection",
      "Obsmetrologia.Relational.Quantum.hardyBoxP_support_not_stronglyContextual",
      "Obsmetrologia.Relational.Quantum.hardyBoxP_witness_support",
      "Obsmetrologia.Relational.Quantum.hardyBoxP_witness_not_extends",
      "Obsmetrologia.Relational.Quantum.hardyBoxP_support_logicallyContextual",
      "Obsmetrologia.Relational.Quantum.hardyBoxP_support_logical_not_strong",
    ] as const),
  });
}

export function hardyEmpiricalModelReceipt(): HardyEmpiricalModelReceipt {
  return Object.freeze({
    kind: "relational.quantum.hardyEmpiricalModel.receipt:witness" as const,
    noSignaling: hardyBoxPNoSignaling(),
    supportPhenomenon: hardyBoxPSupportLogicalNotStrong(),
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.HardyEmpiricalModel" as const,
  });
}
