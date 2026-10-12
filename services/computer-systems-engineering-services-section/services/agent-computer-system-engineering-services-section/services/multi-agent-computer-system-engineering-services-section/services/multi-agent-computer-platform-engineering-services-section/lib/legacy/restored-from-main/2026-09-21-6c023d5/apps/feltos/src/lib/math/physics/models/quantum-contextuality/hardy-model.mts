/**
 * models/quantum-contextuality/hardy-model - logical contextuality without strong contextuality.
 *
 * This captures `Obsmetrologia.Relational.Quantum.HardyModel`: Hardy support,
 * the global section that prevents strong contextuality, the local witness that
 * fails to extend, and the strict logical-not-strong phenomenon.
 */

import {
  extendsLocalSection,
  logicallyContextual,
  type LogicallyContextualWitness,
} from "./contextual-obstruction.mts";
import {
  empiricalModel,
  hasGlobalSection,
  prScenario,
  stronglyContextual,
  type HasGlobalSectionWitness,
  type Model,
  type OutcomeAssignment,
  type PrMeasurement,
} from "./measurement-scenario.mts";

export interface HardyGlobalSectionWitness {
  readonly kind: "relational.quantum.hardyModel.hasGlobalSection:witness";
  readonly model: Model<PrMeasurement, boolean>;
  readonly globalSection: HasGlobalSectionWitness<PrMeasurement, boolean>;
  readonly leanTheorem: "Obsmetrologia.Relational.Quantum.hardyBox_hasGlobalSection";
}

export interface HardyWitnessNotExtendsWitness {
  readonly kind: "relational.quantum.hardyModel.witness_not_extends:witness";
  readonly model: Model<PrMeasurement, boolean>;
  readonly context: readonly ["aPrime", "bPrime"];
  readonly localSection: OutcomeAssignment<PrMeasurement, boolean>;
  readonly supportedLocally: true;
  readonly extendsToNoGlobalSection: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Quantum.hardy_witness_support",
    "Obsmetrologia.Relational.Quantum.hardy_witness_not_extends",
  ];
}

export interface HardyLogicalNotStrongWitness {
  readonly kind: "relational.quantum.hardyModel.logical_not_strong:witness";
  readonly globalSection: HardyGlobalSectionWitness;
  readonly logical: LogicallyContextualWitness<PrMeasurement, boolean>;
  readonly notStronglyContextual: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Quantum.hardyBox_logicallyContextual",
    "Obsmetrologia.Relational.Quantum.hardyBox_logical_not_strong",
  ];
}

export interface HardyModelReceipt {
  readonly kind: "relational.quantum.hardyModel.receipt:witness";
  readonly globalSection: HardyGlobalSectionWitness;
  readonly witnessNotExtends: HardyWitnessNotExtendsWitness;
  readonly logicalNotStrong: HardyLogicalNotStrongWitness;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Quantum.HardyModel";
}

export function hardyAllowed(
  context: readonly PrMeasurement[],
  assignment: OutcomeAssignment<PrMeasurement, boolean>,
): boolean {
  if (context.length !== 2) return false;
  const [left, right] = context;
  if (left === "a" && right === "b") return !(assignment.a && assignment.b);
  if (left === "a" && right === "bPrime") return !(!assignment.a && assignment.bPrime);
  if (left === "aPrime" && right === "b") return !(assignment.aPrime && !assignment.b);
  if (left === "aPrime" && right === "bPrime") return true;
  return false;
}

export function hardyBox(): Model<PrMeasurement, boolean> {
  return empiricalModel(prScenario(), Object.freeze([false, true]), hardyAllowed);
}

export function hardyWitness(): OutcomeAssignment<PrMeasurement, boolean> {
  return Object.freeze({ a: false, aPrime: true, b: false, bPrime: true });
}

export function hardyBoxHasGlobalSection(): HardyGlobalSectionWitness {
  const model = hardyBox();
  const globalSection = hasGlobalSection(model);
  if (globalSection === undefined) throw new TypeError("hardyBoxHasGlobalSection: Hardy model had no global section");
  return Object.freeze({
    kind: "relational.quantum.hardyModel.hasGlobalSection:witness" as const,
    model,
    globalSection,
    leanTheorem: "Obsmetrologia.Relational.Quantum.hardyBox_hasGlobalSection" as const,
  });
}

export function hardyWitnessNotExtends(): HardyWitnessNotExtendsWitness {
  const model = hardyBox();
  const context = Object.freeze(["aPrime", "bPrime"] as const);
  const localSection = hardyWitness();
  if (!model.support(context, localSection) || extendsLocalSection(model, context, localSection) !== undefined) {
    throw new TypeError("hardyWitnessNotExtends: Hardy local witness check failed");
  }
  return Object.freeze({
    kind: "relational.quantum.hardyModel.witness_not_extends:witness" as const,
    model,
    context,
    localSection,
    supportedLocally: true as const,
    extendsToNoGlobalSection: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.hardy_witness_support",
      "Obsmetrologia.Relational.Quantum.hardy_witness_not_extends",
    ] as const),
  });
}

export function hardyBoxLogicalNotStrong(): HardyLogicalNotStrongWitness {
  const globalSection = hardyBoxHasGlobalSection();
  const logical = logicallyContextual(globalSection.model);
  if (logical === undefined || stronglyContextual(globalSection.model) !== undefined) {
    throw new TypeError("hardyBoxLogicalNotStrong: Hardy phenomenon check failed");
  }
  return Object.freeze({
    kind: "relational.quantum.hardyModel.logical_not_strong:witness" as const,
    globalSection,
    logical,
    notStronglyContextual: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.hardyBox_logicallyContextual",
      "Obsmetrologia.Relational.Quantum.hardyBox_logical_not_strong",
    ] as const),
  });
}

export function hardyModelReceipt(): HardyModelReceipt {
  return Object.freeze({
    kind: "relational.quantum.hardyModel.receipt:witness" as const,
    globalSection: hardyBoxHasGlobalSection(),
    witnessNotExtends: hardyWitnessNotExtends(),
    logicalNotStrong: hardyBoxLogicalNotStrong(),
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.HardyModel" as const,
  });
}
