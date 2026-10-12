/**
 * models/quantum-contextuality/magic-square - Mermin-Peres parity contextuality.
 *
 * This captures `Obsmetrologia.Relational.Quantum.MagicSquare`: line parity,
 * odd total parity, local satisfiability, no global section, and the
 * state-independent strong contextuality witness.
 */

import {
  allContextsInhabited,
  empiricalModel,
  hasGlobalSection,
  measurementScenario,
  stronglyContextual,
  type Model,
  type OutcomeAssignment,
} from "./measurement-scenario.mts";

export type MagicCell = "m0" | "m1" | "m2" | "m3" | "m4" | "m5" | "m6" | "m7" | "m8";

export interface MagicSquareStronglyContextualWitness {
  readonly kind: "relational.quantum.magicSquare.strongly_contextual:witness";
  readonly model: Model<MagicCell, boolean>;
  readonly parityTotalOdd: true;
  readonly inhabited: true;
  readonly noGlobalSection: true;
  readonly stronglyContextual: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Quantum.msParity_total_odd",
    "Obsmetrologia.Relational.Quantum.magicSquare_inhabited",
    "Obsmetrologia.Relational.Quantum.magicSquare_no_global",
    "Obsmetrologia.Relational.Quantum.magicSquare_strongly_contextual",
  ];
}

export interface MagicSquareReceipt {
  readonly kind: "relational.quantum.magicSquare.receipt:witness";
  readonly strong: MagicSquareStronglyContextualWitness;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Quantum.MagicSquare";
}

export const magicCells = Object.freeze(["m0", "m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8"] as const);

export function msLines() {
  return Object.freeze([
    Object.freeze(["m0", "m1", "m2"] as const),
    Object.freeze(["m3", "m4", "m5"] as const),
    Object.freeze(["m6", "m7", "m8"] as const),
    Object.freeze(["m0", "m3", "m6"] as const),
    Object.freeze(["m1", "m4", "m7"] as const),
    Object.freeze(["m2", "m5", "m8"] as const),
  ]);
}

function contextEquals(left: readonly MagicCell[], right: readonly MagicCell[]): boolean {
  return left.length === right.length && left.every((measurement, index) => measurement === right[index]);
}

export function lineXor(
  assignment: OutcomeAssignment<MagicCell, boolean>,
  context: readonly MagicCell[],
): boolean {
  return context.reduce((total, cell) => total !== assignment[cell], false);
}

export function msParity(context: readonly MagicCell[]): boolean {
  return contextEquals(context, ["m2", "m5", "m8"]);
}

export function msAllowed(
  context: readonly MagicCell[],
  assignment: OutcomeAssignment<MagicCell, boolean>,
): boolean {
  return lineXor(assignment, context) === msParity(context);
}

export function msScenario() {
  return measurementScenario(magicCells, msLines());
}

export function magicSquare(): Model<MagicCell, boolean> {
  return empiricalModel(msScenario(), Object.freeze([false, true]), msAllowed);
}

export function msParityTotalOdd(): boolean {
  return msLines().reduce((total, line) => total !== msParity(line), false);
}

export function magicSquareStronglyContextual(): MagicSquareStronglyContextualWitness {
  const model = magicSquare();
  if (!msParityTotalOdd() || allContextsInhabited(model) === undefined || hasGlobalSection(model) !== undefined || stronglyContextual(model) === undefined) {
    throw new TypeError("magicSquareStronglyContextual: magic-square contextuality check failed");
  }
  return Object.freeze({
    kind: "relational.quantum.magicSquare.strongly_contextual:witness" as const,
    model,
    parityTotalOdd: true as const,
    inhabited: true as const,
    noGlobalSection: true as const,
    stronglyContextual: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.msParity_total_odd",
      "Obsmetrologia.Relational.Quantum.magicSquare_inhabited",
      "Obsmetrologia.Relational.Quantum.magicSquare_no_global",
      "Obsmetrologia.Relational.Quantum.magicSquare_strongly_contextual",
    ] as const),
  });
}

export function magicSquareReceipt(): MagicSquareReceipt {
  return Object.freeze({
    kind: "relational.quantum.magicSquare.receipt:witness" as const,
    strong: magicSquareStronglyContextual(),
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.MagicSquare" as const,
  });
}
