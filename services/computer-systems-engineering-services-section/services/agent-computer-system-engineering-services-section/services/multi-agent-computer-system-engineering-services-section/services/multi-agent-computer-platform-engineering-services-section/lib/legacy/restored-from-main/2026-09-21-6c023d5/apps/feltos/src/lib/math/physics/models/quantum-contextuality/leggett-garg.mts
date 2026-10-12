/**
 * models/quantum-contextuality/leggett-garg - temporal contextuality and K3.
 *
 * This captures `Obsmetrologia.Relational.Quantum.LeggettGarg`: the three-time
 * temporal scenario, perfect-correlation macrorealism violation, the integer
 * Leggett-Garg bound, and the internal-real quantum-value separation.
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

export type LgTime = "t0" | "t1" | "t2";
export type SignTrajectory = Readonly<Record<LgTime, -1 | 1>>;

export interface LgPerfectMacrorealismViolatedWitness {
  readonly kind: "relational.quantum.leggettGarg.macrorealism_violated:witness";
  readonly model: Model<LgTime, boolean>;
  readonly inhabited: true;
  readonly noGlobalTrajectory: true;
  readonly stronglyContextual: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Quantum.lgPerfect_inhabited",
    "Obsmetrologia.Relational.Quantum.lgPerfect_no_global",
    "Obsmetrologia.Relational.Quantum.lgPerfect_macrorealism_violated",
  ];
}

export interface LgMacrorealistBoundWitness {
  readonly kind: "relational.quantum.leggettGarg.macrorealist_bound:witness";
  readonly trajectory: SignTrajectory;
  readonly k3: number;
  readonly bound: 1;
  readonly withinBound: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Quantum.lg_macrorealist_bound";
}

export interface LgQuantumValueNotMacrorealistWitness {
  readonly kind: "relational.quantum.leggettGarg.quantum_value_not_macrorealist:witness";
  readonly trajectory: SignTrajectory;
  readonly macrorealist: LgMacrorealistBoundWitness;
  readonly quantumValue: 1.5;
  readonly exceedsBound: true;
  readonly notEqualToTrajectoryValue: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Quantum.lgQuantum_exceeds_bound",
    "Obsmetrologia.Relational.Quantum.lg_macrorealist_real_bound",
    "Obsmetrologia.Relational.Quantum.lg_quantum_value_not_macrorealist",
  ];
}

export interface LeggettGargReceipt {
  readonly kind: "relational.quantum.leggettGarg.receipt:witness";
  readonly macrorealismViolated: LgPerfectMacrorealismViolatedWitness;
  readonly macrorealistBound: LgMacrorealistBoundWitness;
  readonly quantumSeparation: LgQuantumValueNotMacrorealistWitness;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Quantum.LeggettGarg";
}

export function lgScenario() {
  return measurementScenario(Object.freeze(["t0", "t1", "t2"] as const), [
    Object.freeze(["t0", "t1"] as const),
    Object.freeze(["t1", "t2"] as const),
    Object.freeze(["t0", "t2"] as const),
  ]);
}

export function lgAllowed(
  context: readonly LgTime[],
  assignment: OutcomeAssignment<LgTime, boolean>,
): boolean {
  if (context.length !== 2) return false;
  const [left, right] = context;
  if (left === "t0" && right === "t2") return assignment.t0 !== assignment.t2;
  return assignment[left!] === assignment[right!];
}

export function lgPerfect(): Model<LgTime, boolean> {
  return empiricalModel(lgScenario(), Object.freeze([false, true]), lgAllowed);
}

export function lgPerfectMacrorealismViolated(): LgPerfectMacrorealismViolatedWitness {
  const model = lgPerfect();
  if (allContextsInhabited(model) === undefined || hasGlobalSection(model) !== undefined || stronglyContextual(model) === undefined) {
    throw new TypeError("lgPerfectMacrorealismViolated: temporal contextuality check failed");
  }
  return Object.freeze({
    kind: "relational.quantum.leggettGarg.macrorealism_violated:witness" as const,
    model,
    inhabited: true as const,
    noGlobalTrajectory: true as const,
    stronglyContextual: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.lgPerfect_inhabited",
      "Obsmetrologia.Relational.Quantum.lgPerfect_no_global",
      "Obsmetrologia.Relational.Quantum.lgPerfect_macrorealism_violated",
    ] as const),
  });
}

export function isSign(trajectory: Readonly<Record<LgTime, number>>): trajectory is SignTrajectory {
  return (trajectory.t0 === 1 || trajectory.t0 === -1)
    && (trajectory.t1 === 1 || trajectory.t1 === -1)
    && (trajectory.t2 === 1 || trajectory.t2 === -1);
}

export function k3(trajectory: SignTrajectory): number {
  return trajectory.t0 * trajectory.t1 + trajectory.t1 * trajectory.t2 - trajectory.t0 * trajectory.t2;
}

export function lgMacrorealistBound(trajectory: SignTrajectory): LgMacrorealistBoundWitness {
  const value = k3(trajectory);
  if (value > 1) throw new TypeError("lgMacrorealistBound: trajectory violates the macrorealist bound");
  return Object.freeze({
    kind: "relational.quantum.leggettGarg.macrorealist_bound:witness" as const,
    trajectory,
    k3: value,
    bound: 1 as const,
    withinBound: true as const,
    leanTheorem: "Obsmetrologia.Relational.Quantum.lg_macrorealist_bound" as const,
  });
}

export function lgQuantumValueNotMacrorealist(trajectory: SignTrajectory): LgQuantumValueNotMacrorealistWitness {
  const macrorealist = lgMacrorealistBound(trajectory);
  return Object.freeze({
    kind: "relational.quantum.leggettGarg.quantum_value_not_macrorealist:witness" as const,
    trajectory,
    macrorealist,
    quantumValue: 1.5 as const,
    exceedsBound: true as const,
    notEqualToTrajectoryValue: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.lgQuantum_exceeds_bound",
      "Obsmetrologia.Relational.Quantum.lg_macrorealist_real_bound",
      "Obsmetrologia.Relational.Quantum.lg_quantum_value_not_macrorealist",
    ] as const),
  });
}

export function leggettGargReceipt(): LeggettGargReceipt {
  const trajectory = Object.freeze({ t0: 1, t1: 1, t2: -1 } as const);
  return Object.freeze({
    kind: "relational.quantum.leggettGarg.receipt:witness" as const,
    macrorealismViolated: lgPerfectMacrorealismViolated(),
    macrorealistBound: lgMacrorealistBound(trajectory),
    quantumSeparation: lgQuantumValueNotMacrorealist(trajectory),
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.LeggettGarg" as const,
  });
}
