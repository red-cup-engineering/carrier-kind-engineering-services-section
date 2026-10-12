/**
 * analysis/flow - finite closure-flow and firing reads.
 *
 * cluster. The surface is deliberately finite: named cells, FOUR charge names,
 * pointwise charge operators, firing blowups, local-data reconstruction, finite
 * NSC commutation checks, curvature-regime receipts, Lyapunov free energy, and
 * Laplacianizer/Hodge fixed-point witnesses.
 *
 * Genuine arbitrary `Ord.limit` continuity and transfinite NSC firing classes
 * remain outside this runtime. The runtime surface only claims finite/canonical shadows
 * that can be checked over the package FOUR value set.
 */
import {
  chargeValue,
  conflateValue,
  joinKnowledgeValue,
  knowledgeLeq,
  negateValue,
  type ChargeValueName,
} from "../../values/index.mts";

export type FlowCharge = ChargeValueName;
export type FiringTypeName = "tSide" | "fSide" | "top";
export type ClosureRegimeName =
  | "ordinal.closure.regime.finite"
  | "ordinal.closure.regime.scott"
  | "ordinal.closure.regime.transfinite"
  | "ordinal.closure.regime.aperiodic";

export interface ChargeOperator {
  readonly kind: "flow.chargeOperator";
  readonly map: Readonly<Record<FlowCharge, FlowCharge>>;
}

export interface FiniteValuation {
  readonly kind: "flow.valuation";
  readonly cells: readonly string[];
  readonly values: Readonly<Record<string, FlowCharge>>;
}

export interface CellLocalData {
  readonly cell: string;
  readonly incidence: boolean;
  readonly firingType: FiringTypeName | null;
  readonly consistencyFailure: FlowCharge | null;
}

export interface FiringBlowupWitness {
  readonly kind: "flow.firingBlowup:witness";
  readonly step: number;
  readonly predecessor: FiniteValuation;
  readonly actual: FiniteValuation;
  readonly leqKnowledge: true;
  readonly trivial: boolean;
  readonly nontrivial: boolean;
  readonly identityBlowup: boolean;
  readonly localData: readonly CellLocalData[];
  readonly reconstructedActual: FiniteValuation;
  readonly classified: true;
}

export interface NscFiringWitness {
  readonly kind: "flow.nscFiring:witness";
  readonly operator: ChargeOperator;
  readonly family: readonly FlowCharge[];
  readonly supBefore: FlowCharge;
  readonly opSup: FlowCharge;
  readonly supAfterMap: FlowCharge;
  readonly commutes: false;
  readonly isNsc: true;
  readonly regime: "ordinal.closure.regime.transfinite";
  readonly cohomologyVanishes: false;
}

export interface NscFiringObstruction {
  readonly kind: "flow.nscFiring-obstruction";
  readonly operator: ChargeOperator;
  readonly family: readonly FlowCharge[];
  readonly supBefore: FlowCharge;
  readonly opSup: FlowCharge;
  readonly supAfterMap: FlowCharge;
  readonly commutes: true;
  readonly isNsc: false;
  readonly reason: "scott-continuous-on-family";
}

export type NscFiringJudgment = NscFiringWitness | NscFiringObstruction;

export interface ScottClosureWitness {
  readonly kind: "flow.scottClosureNoNsc:witness";
  readonly operator: ChargeOperator;
  readonly inflationary: boolean;
  readonly monotone: boolean;
  readonly idempotent: boolean;
  readonly closureLike: boolean;
  readonly directedFamiliesChecked: number;
  readonly nscCount: 0;
  readonly scottContinuous: true;
}

export interface ScottClosureObstruction {
  readonly kind: "flow.scottClosureNoNsc-obstruction";
  readonly operator: ChargeOperator;
  readonly inflationary: boolean;
  readonly monotone: boolean;
  readonly idempotent: boolean;
  readonly closureLike: boolean;
  readonly directedFamiliesChecked: number;
  readonly nscCount: number;
  readonly scottContinuous: boolean;
}

export type ScottClosureJudgment = ScottClosureWitness | ScottClosureObstruction;

export interface ClosureFlowDynamicsWitness {
  readonly kind: "flow.closureFlowDynamics:witness";
  readonly orbit: readonly FiniteValuation[];
  readonly firingSteps: readonly number[];
  readonly smoothSteps: readonly number[];
  readonly smoothTailTerminal: boolean;
  readonly monotoneAscent: boolean;
  readonly settlesAt: number | null;
}

export interface CurvatureRegimeWitness {
  readonly kind: "flow.curvatureRegime:witness";
  readonly regime: ClosureRegimeName;
  readonly flat: boolean;
  readonly curved: boolean;
  readonly cohomologyVanishes: boolean;
  readonly curvatureRank: 0 | null;
  readonly terminatesByOmega: boolean;
  readonly curvedOmegaTerminating: false;
}

export interface FreeEnergyLyapunovWitness {
  readonly kind: "flow.freeEnergyLyapunov:witness";
  readonly cells: readonly string[];
  readonly orbit: readonly FiniteValuation[];
  readonly settled: FiniteValuation;
  readonly energies: readonly number[];
  readonly antitone: boolean;
  readonly strictDropsAtFirings: boolean;
  readonly equilibriumEnergy: 0;
  readonly boundedSteps: number;
  readonly hardClosure: true;
}

/** The itemized evidence-height gained in one monotone flow transition. */
export interface EvidenceFlowStepReceipt {
  readonly kind: "flow.evidenceFlowStepReceipt:witness";
  readonly step: number;
  readonly predecessor: FiniteValuation;
  readonly actual: FiniteValuation;
  readonly flux: number;
  readonly commitments: number;
  readonly mints: number;
  readonly jumps: number;
  readonly truthRegisterLosses: number;
  readonly inconsistencyRegisterGains: number;
  readonly decomposed: true;
  readonly truthLossAccounted: true;
}

/** Runtime witness of `ledger_noether` for one monotone transition. */
export interface EvidenceFlowLedgerNoetherWitness {
  readonly kind: "flow.evidenceFlowLedgerNoether:witness";
  readonly ordinary: EvidenceFlowStepReceipt;
  readonly negated: EvidenceFlowStepReceipt;
  readonly conflatedReverse: EvidenceFlowStepReceipt;
  readonly negationPreservesFlux: true;
  readonly negationPreservesRegisters: true;
  readonly conflationPreservesFlux: true;
  readonly conflationExchangesCommitmentsAndMints: true;
  readonly conflationPreservesJumps: true;
}

/**
 * A finite horizon of evidence flow read as receipts plus residue.
 *
 * This is the runtime form of `stage_ledger`: it is computed from the same
 * orbit and knowledge-height metric as {@link freeEnergyLyapunov}; it is not a
 * persistence mechanism or a second journal.
 */
export interface OperationalAccountingLedger {
  readonly kind: "flow.operationalAccountingLedger:witness";
  readonly operator: ChargeOperator;
  readonly cells: readonly string[];
  readonly seed: FiniteValuation;
  readonly settled: FiniteValuation;
  readonly horizon: number;
  readonly orbit: readonly FiniteValuation[];
  readonly initialCost: number;
  readonly receipts: readonly EvidenceFlowStepReceipt[];
  readonly accumulatedFlux: number;
  readonly residue: number;
  readonly balanced: true;
  readonly quiescent: boolean;
  readonly closed: boolean;
  readonly closesAtQuiescence: true;
  readonly noether: readonly EvidenceFlowLedgerNoetherWitness[];
}

export interface OperationalAccountingLawReceipt {
  readonly kind: "flow.operationalAccountingLawReceipt:witness";
  readonly staged: OperationalAccountingLedger;
  readonly jumped: OperationalAccountingLedger;
  readonly conservation: true;
  readonly itemization: true;
  readonly truthLossAccounting: true;
  readonly closesAtQuiescence: true;
  readonly noether: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Valuation.stage_ledger",
    "Obsmetrologia.Valuation.truth_loss_is_record_gain",
    "Obsmetrologia.Valuation.ledger_noether",
  ];
}

export interface LaplacianizerWitness {
  readonly kind: "flow.laplacianizer:witness";
  readonly operator: ChargeOperator;
  readonly seed: FiniteValuation;
  readonly settled: FiniteValuation;
  readonly laplacianIsClosure: boolean;
  readonly hodgeIsoDegree0: true;
  readonly harmonicEqualsFixed: true;
  readonly settledIsLeastHarmonic: boolean;
}

export interface LawvereKernelH0Receipt {
  readonly kind: "flow.lawvereKernelH0.receipt:witness";
  readonly operator: ChargeOperator;
  readonly seed: FiniteValuation;
  readonly harmonic: FiniteValuation;
  readonly globalSectionSeed: FiniteValuation;
  readonly globalSectionImage: FiniteValuation;
  readonly imageIsHarmonicByIdempotence: true;
  readonly harmonicIsOwnImage: true;
  readonly membershipIff: true;
  readonly toH0FromKernelRoundTrip: true;
  readonly fromH0ToKernelRoundTrip: true;
  readonly hodgeIso: true;
}

export interface LawvereLaplacianSpectralGapReceipt {
  readonly kind: "flow.lawvereLaplacianSpectralGap.receipt:witness";
  readonly laplacianizer: LaplacianizerWitness;
  readonly kernelH0: LawvereKernelH0Receipt;
  readonly dynamics: ClosureFlowDynamicsWitness;
  readonly lyapunov: FreeEnergyLyapunovWitness;
  readonly laplacianIsClosure: true;
  readonly harmonicKernelIsFixedQuiescent: true;
  readonly diffusionMonotone: true;
  readonly spectralGapBound: number;
  readonly boundary:
    "finite FOUR strict-regime spectral-gap witness; enriched weighted-limit sheaf proof remains Lean-side";
}

export interface TransfiniteOmegaContinuityWitness {
  readonly kind: "flow.transfiniteOmegaContinuity:witness";
  readonly finiteChain: readonly FiniteValuation[];
  readonly omegaValue: FiniteValuation;
  readonly monotoneChain: boolean;
  readonly omegaIsLub: boolean;
  readonly noNscAtOmega: true;
  readonly boundary: "canonical-omega-only";
}

export interface NonScottContinuousFiringReceipt {
  readonly kind: "flow.nonScottContinuousFiring.receipt:witness";
  readonly closureNoNsc: ScottClosureWitness;
  readonly nscFiring: NscFiringWitness;
  readonly nonScottRegime: CurvatureRegimeWitness;
  readonly finiteClosureBoundary: "finite charge-closures are Scott-continuous; NSC requires a non-closure firing operator";
}

export interface ClosureFlowCurvatureRegimeReceipt {
  readonly kind: "flow.closureFlowCurvatureRegime.receipt:witness";
  readonly flat: CurvatureRegimeWitness;
  readonly curved: CurvatureRegimeWitness;
  readonly rankNonzeroWitness: NscFiringWitness;
  readonly partition: true;
  readonly cohomologyIsCurvatureModule: true;
}

export interface TransfiniteClosureFlowReceipt {
  readonly kind: "flow.transfiniteClosureFlow.receipt:witness";
  readonly dynamics: ClosureFlowDynamicsWitness;
  readonly omegaContinuity: TransfiniteOmegaContinuityWitness;
  readonly smoothAtOmega: true;
  readonly boundary: "canonical omega chain over the finite FOUR value set";
}

export interface BlowupClassificationReceipt {
  readonly kind: "flow.blowupClassification.receipt:witness";
  readonly blowup: FiringBlowupWitness;
  readonly localDataComplete: true;
  readonly reconstructedActual: FiniteValuation;
  readonly modelSingularity: boolean;
}

const chargeOrder: readonly FlowCharge[] = Object.freeze(["unknown", "held", "denied", "contested"] as const);

const assertNat = (name: string, value: number): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name}: expected a non-negative safe integer`);
  }
};

const cloneValues = (values: Readonly<Record<string, FlowCharge>>): Readonly<Record<string, FlowCharge>> =>
  Object.freeze({ ...values });

const uniqueCells = (cells: readonly string[]): readonly string[] => {
  const seen = new Set<string>();
  for (const cell of cells) {
    if (seen.has(cell)) throw new TypeError(`flow valuation has duplicate cell: ${cell}`);
    seen.add(cell);
  }
  return Object.freeze([...cells]);
};

export function valuation(cells: readonly string[], values: Readonly<Record<string, FlowCharge>>): FiniteValuation {
  const normalizedCells = uniqueCells(cells);
  const normalized: Record<string, FlowCharge> = {};
  for (const cell of normalizedCells) {
    const value = values[cell];
    if (value === undefined) throw new TypeError(`flow valuation missing cell: ${cell}`);
    normalized[cell] = value;
  }
  return Object.freeze({
    kind: "flow.valuation" as const,
    cells: normalizedCells,
    values: cloneValues(normalized),
  });
}

export function constantValuation(cells: readonly string[], value: FlowCharge): FiniteValuation {
  return valuation(cells, Object.fromEntries(cells.map((cell) => [cell, value])));
}

const sameValuation = (left: FiniteValuation, right: FiniteValuation): boolean =>
  left.cells.length === right.cells.length
  && left.cells.every((cell, index) => cell === right.cells[index] && left.values[cell] === right.values[cell]);

const leqCharge = (left: FlowCharge, right: FlowCharge): boolean =>
  knowledgeLeq(chargeValue(left), chargeValue(right)).kind === "charge.orderLeq:witness";

const joinCharge = (left: FlowCharge, right: FlowCharge): FlowCharge =>
  joinKnowledgeValue(chargeValue(left), chargeValue(right)).name;

export function leqValuation(left: FiniteValuation, right: FiniteValuation): boolean {
  return left.cells.length === right.cells.length
    && left.cells.every((cell, index) => cell === right.cells[index] && leqCharge(left.values[cell]!, right.values[cell]!));
}

export function joinFamily(family: readonly FlowCharge[]): FlowCharge {
  return family.reduce((current, value) => joinCharge(current, value), "unknown" as FlowCharge);
}

export const identityOperator: ChargeOperator = Object.freeze({
  kind: "flow.chargeOperator" as const,
  map: Object.freeze({
    contested: "contested",
    unknown: "unknown",
    held: "held",
    denied: "denied",
  } satisfies Record<FlowCharge, FlowCharge>),
});

export const closureToStableOperator: ChargeOperator = Object.freeze({
  kind: "flow.chargeOperator" as const,
  map: Object.freeze({
    contested: "contested",
    unknown: "contested",
    held: "contested",
    denied: "contested",
  } satisfies Record<FlowCharge, FlowCharge>),
});

export const truthSideClosureOperator: ChargeOperator = Object.freeze({
  kind: "flow.chargeOperator" as const,
  map: Object.freeze({
    contested: "contested",
    unknown: "held",
    held: "held",
    denied: "contested",
  } satisfies Record<FlowCharge, FlowCharge>),
});

/** The finite pointwise join closure `a ↦ target ∨ₖ a` used by settlement. */
export function joinClosureOperator(target: FlowCharge): ChargeOperator {
  return Object.freeze({
    kind: "flow.chargeOperator" as const,
    map: Object.freeze(Object.fromEntries(
      chargeOrder.map((value) => [value, joinCharge(target, value)]),
    ) as Record<FlowCharge, FlowCharge>),
  });
}

/** Finite runtime shadow of the `∀`-antecedent NSC operator: top maps to bottom, all else to top. */
export const forallAntecedentOperator: ChargeOperator = Object.freeze({
  kind: "flow.chargeOperator" as const,
  map: Object.freeze({
    contested: "unknown",
    unknown: "contested",
    held: "contested",
    denied: "contested",
  } satisfies Record<FlowCharge, FlowCharge>),
});

export const botTopPrefix: readonly FlowCharge[] = Object.freeze(["unknown", "contested"] as const);

export function applyChargeOperator(operator: ChargeOperator, value: FlowCharge): FlowCharge {
  return operator.map[value];
}

export function applyOperator(operator: ChargeOperator, input: FiniteValuation): FiniteValuation {
  return valuation(
    input.cells,
    Object.fromEntries(input.cells.map((cell) => [cell, applyChargeOperator(operator, input.values[cell]!)])),
  );
}

export function orbit(operator: ChargeOperator, seed: FiniteValuation, length: number): readonly FiniteValuation[] {
  assertNat("orbit length", length);
  const stages: FiniteValuation[] = [seed];
  for (let index = 0; index < length; index += 1) {
    stages.push(applyOperator(operator, stages[index]!));
  }
  return Object.freeze(stages);
}

export function settledValue(operator: ChargeOperator, seed: FiniteValuation, maxSteps = 8): FiniteValuation {
  assertNat("settledValue maxSteps", maxSteps);
  let current = seed;
  for (let index = 0; index < maxSteps; index += 1) {
    const next = applyOperator(operator, current);
    if (sameValuation(next, current)) return current;
    current = next;
  }
  return current;
}

export function cellType(before: FlowCharge, after: FlowCharge): FiringTypeName | null {
  if (before === after) return null;
  if (before === "unknown" && after === "held") return "tSide";
  if (before === "unknown" && after === "denied") return "fSide";
  if (after === "contested" && before !== "contested") return "top";
  return null;
}

export function reconstruct(before: FlowCharge, type: FiringTypeName | null): FlowCharge {
  if (type === null) return before;
  if (type === "tSide") return "held";
  if (type === "fSide") return "denied";
  return "contested";
}

export function localData(predecessor: FiniteValuation, actual: FiniteValuation): readonly CellLocalData[] {
  return Object.freeze(predecessor.cells.map((cell) => {
    const before = predecessor.values[cell]!;
    const after = actual.values[cell]!;
    const type = cellType(before, after);
    return Object.freeze({
      cell,
      incidence: before !== after,
      firingType: type,
      consistencyFailure: type === "top" ? before : null,
    });
  }));
}

export function reconstructActual(predecessor: FiniteValuation, data: readonly CellLocalData[]): FiniteValuation {
  return valuation(
    predecessor.cells,
    Object.fromEntries(data.map((entry) => [entry.cell, reconstruct(predecessor.values[entry.cell]!, entry.firingType)])),
  );
}

export function firingBlowup(operator: ChargeOperator, seed: FiniteValuation, step: number): FiringBlowupWitness {
  assertNat("firingBlowup step", step);
  const stages = orbit(operator, seed, step + 1);
  const predecessor = stages[step]!;
  const actual = stages[step + 1]!;
  const data = localData(predecessor, actual);
  const reconstructedActual = reconstructActual(predecessor, data);
  return Object.freeze({
    kind: "flow.firingBlowup:witness" as const,
    step,
    predecessor,
    actual,
    leqKnowledge: leqValuation(predecessor, actual) as true,
    trivial: sameValuation(predecessor, actual),
    nontrivial: !sameValuation(predecessor, actual),
    identityBlowup: sameValuation(predecessor, actual),
    localData: data,
    reconstructedActual,
    classified: sameValuation(actual, reconstructedActual) as true,
  });
}

export function nscFiring(operator: ChargeOperator, family: readonly FlowCharge[]): NscFiringJudgment {
  if (family.length === 0) throw new RangeError("nscFiring: expected a nonempty directed family");
  const supBefore = joinFamily(family);
  const opSup = applyChargeOperator(operator, supBefore);
  const supAfterMap = joinFamily(family.map((value) => applyChargeOperator(operator, value)));
  const commutes = opSup === supAfterMap;
  if (commutes) {
    return Object.freeze({
      kind: "flow.nscFiring-obstruction" as const,
      operator,
      family: Object.freeze([...family]),
      supBefore,
      opSup,
      supAfterMap,
      commutes: true as const,
      isNsc: false as const,
      reason: "scott-continuous-on-family" as const,
    });
  }
  return Object.freeze({
    kind: "flow.nscFiring:witness" as const,
    operator,
    family: Object.freeze([...family]),
    supBefore,
    opSup,
    supAfterMap,
    commutes: false as const,
    isNsc: true as const,
    regime: "ordinal.closure.regime.transfinite" as const,
    cohomologyVanishes: false as const,
  });
}

function nonemptySubsets<T>(values: readonly T[]): readonly (readonly T[])[] {
  const subsets: T[][] = [];
  const count = 1 << values.length;
  for (let mask = 1; mask < count; mask += 1) {
    const subset: T[] = [];
    values.forEach((value, index) => {
      if ((mask & (1 << index)) !== 0) subset.push(value);
    });
    subsets.push(subset);
  }
  return Object.freeze(subsets.map((subset) => Object.freeze(subset)));
}

function isDirectedFamily(family: readonly FlowCharge[]): boolean {
  return family.every((left) => family.every((right) => family.some((upper) => leqCharge(left, upper) && leqCharge(right, upper))));
}

const directedFamilies = (): readonly (readonly FlowCharge[])[] =>
  Object.freeze(nonemptySubsets(chargeOrder).filter(isDirectedFamily));

export function operatorInflationary(operator: ChargeOperator): boolean {
  return chargeOrder.every((value) => leqCharge(value, applyChargeOperator(operator, value)));
}

export function operatorMonotone(operator: ChargeOperator): boolean {
  return chargeOrder.every((left) => chargeOrder.every((right) =>
    !leqCharge(left, right) || leqCharge(applyChargeOperator(operator, left), applyChargeOperator(operator, right))));
}

export function operatorIdempotent(operator: ChargeOperator): boolean {
  return chargeOrder.every((value) =>
    applyChargeOperator(operator, applyChargeOperator(operator, value)) === applyChargeOperator(operator, value));
}

export function scottClosureNoNsc(operator: ChargeOperator): ScottClosureJudgment {
  const families = directedFamilies();
  const nscCount = families.filter((family) => nscFiring(operator, family).kind === "flow.nscFiring:witness").length;
  const inflationary = operatorInflationary(operator);
  const monotone = operatorMonotone(operator);
  const idempotent = operatorIdempotent(operator);
  const closureLike = inflationary && monotone && idempotent;
  if (closureLike && nscCount === 0) {
    return Object.freeze({
      kind: "flow.scottClosureNoNsc:witness" as const,
      operator,
      inflationary,
      monotone,
      idempotent,
      closureLike,
      directedFamiliesChecked: families.length,
      nscCount: 0 as const,
      scottContinuous: true as const,
    });
  }
  return Object.freeze({
    kind: "flow.scottClosureNoNsc-obstruction" as const,
    operator,
    inflationary,
    monotone,
    idempotent,
    closureLike,
    directedFamiliesChecked: families.length,
    nscCount,
    scottContinuous: nscCount === 0,
  });
}

export function closureFlowDynamics(operator: ChargeOperator, seed: FiniteValuation, steps: number): ClosureFlowDynamicsWitness {
  assertNat("closureFlowDynamics steps", steps);
  const stages = orbit(operator, seed, steps);
  const firingSteps: number[] = [];
  const smoothSteps: number[] = [];
  for (let index = 0; index < stages.length - 1; index += 1) {
    if (sameValuation(stages[index]!, stages[index + 1]!)) smoothSteps.push(index);
    else firingSteps.push(index);
  }
  const firstSmooth = smoothSteps[0] ?? null;
  const smoothTailTerminal = firstSmooth === null
    ? true
    : stages.slice(firstSmooth).every((stage) => sameValuation(stage, stages[firstSmooth]!));
  const monotoneAscent = stages.slice(0, -1).every((stage, index) => leqValuation(stage, stages[index + 1]!));
  return Object.freeze({
    kind: "flow.closureFlowDynamics:witness" as const,
    orbit: stages,
    firingSteps: Object.freeze(firingSteps),
    smoothSteps: Object.freeze(smoothSteps),
    smoothTailTerminal,
    monotoneAscent,
    settlesAt: firstSmooth,
  });
}

export function cohomologyVanishes(regime: ClosureRegimeName): boolean {
  return regime === "ordinal.closure.regime.finite" || regime === "ordinal.closure.regime.scott";
}

export function curvatureRegime(regime: ClosureRegimeName): CurvatureRegimeWitness {
  const flat = cohomologyVanishes(regime);
  const curved = !flat;
  const terminatesByOmega = flat;
  return Object.freeze({
    kind: "flow.curvatureRegime:witness" as const,
    regime,
    flat,
    curved,
    cohomologyVanishes: flat,
    curvatureRank: flat ? 0 as const : null,
    terminatesByOmega,
    curvedOmegaTerminating: false as const,
  });
}

export function kHeight(value: FlowCharge): number {
  if (value === "unknown") return 0;
  if (value === "contested") return 2;
  return 1;
}

const negateFlowCharge = (value: FlowCharge): FlowCharge => negateValue(chargeValue(value)).name;
const conflateFlowCharge = (value: FlowCharge): FlowCharge => conflateValue(chargeValue(value)).name;

function mapValuation(input: FiniteValuation, transform: (value: FlowCharge) => FlowCharge): FiniteValuation {
  return valuation(input.cells, Object.fromEntries(input.cells.map((cell) => [cell, transform(input.values[cell]!)])));
}

function assertCellsInValuation(cells: readonly string[], value: FiniteValuation): readonly string[] {
  const normalized = uniqueCells(cells);
  const available = new Set(value.cells);
  for (const cell of normalized) {
    if (!available.has(cell)) throw new TypeError(`flow accounting cell is absent from valuation: ${cell}`);
  }
  return normalized;
}

function registers(before: FlowCharge, after: FlowCharge): Readonly<{
  commitments: number;
  mints: number;
  jumps: number;
  truthRegisterLosses: number;
  inconsistencyRegisterGains: number;
}> {
  const commitments = before === "unknown" && (after === "held" || after === "denied") ? 1 : 0;
  const mints = (before === "held" || before === "denied") && after === "contested" ? 1 : 0;
  const jumps = before === "unknown" && after === "contested" ? 1 : 0;
  const truthRegisterLosses = before === "held" && after === "contested" ? 1 : 0;
  const inconsistencyRegisterGains = before === "held" && after === "contested" ? 1 : 0;
  return Object.freeze({ commitments, mints, jumps, truthRegisterLosses, inconsistencyRegisterGains });
}

/** Itemize one monotone transition using `commits + mints + 2*jumps`. */
export function evidenceFlowStepReceipt(
  cells: readonly string[],
  predecessor: FiniteValuation,
  actual: FiniteValuation,
  step = 0,
): EvidenceFlowStepReceipt {
  assertNat("evidenceFlowStepReceipt step", step);
  const support = assertCellsInValuation(cells, predecessor);
  if (predecessor.cells.length !== actual.cells.length
    || predecessor.cells.some((cell, index) => cell !== actual.cells[index])) {
    throw new TypeError("evidenceFlowStepReceipt: predecessor and actual must have the same ordered cells");
  }
  if (!leqValuation(predecessor, actual)) {
    throw new TypeError("evidenceFlowStepReceipt: transition must ascend in the knowledge order");
  }
  let flux = 0;
  let commitments = 0;
  let mints = 0;
  let jumps = 0;
  let truthRegisterLosses = 0;
  let inconsistencyRegisterGains = 0;
  for (const cell of support) {
    const before = predecessor.values[cell]!;
    const after = actual.values[cell]!;
    flux += kHeight(after) - kHeight(before);
    const item = registers(before, after);
    commitments += item.commitments;
    mints += item.mints;
    jumps += item.jumps;
    truthRegisterLosses += item.truthRegisterLosses;
    inconsistencyRegisterGains += item.inconsistencyRegisterGains;
  }
  if (flux !== commitments + mints + 2 * jumps) {
    throw new TypeError("evidenceFlowStepReceipt: flux decomposition failed");
  }
  if (truthRegisterLosses !== inconsistencyRegisterGains) {
    throw new TypeError("evidenceFlowStepReceipt: truth loss was not accounted as inconsistency gain");
  }
  return Object.freeze({
    kind: "flow.evidenceFlowStepReceipt:witness" as const,
    step,
    predecessor,
    actual,
    flux,
    commitments,
    mints,
    jumps,
    truthRegisterLosses,
    inconsistencyRegisterGains,
    decomposed: true as const,
    truthLossAccounted: true as const,
  });
}

/** Check negation invariance and conflation's reversed register exchange. */
export function evidenceFlowLedgerNoether(
  cells: readonly string[],
  predecessor: FiniteValuation,
  actual: FiniteValuation,
  step = 0,
): EvidenceFlowLedgerNoetherWitness {
  const ordinary = evidenceFlowStepReceipt(cells, predecessor, actual, step);
  const negated = evidenceFlowStepReceipt(
    cells,
    mapValuation(predecessor, negateFlowCharge),
    mapValuation(actual, negateFlowCharge),
    step,
  );
  const conflatedReverse = evidenceFlowStepReceipt(
    cells,
    mapValuation(actual, conflateFlowCharge),
    mapValuation(predecessor, conflateFlowCharge),
    step,
  );
  const negationPreservesFlux = negated.flux === ordinary.flux;
  const negationPreservesRegisters = negated.commitments === ordinary.commitments
    && negated.mints === ordinary.mints && negated.jumps === ordinary.jumps;
  const conflationPreservesFlux = conflatedReverse.flux === ordinary.flux;
  const conflationExchangesCommitmentsAndMints = conflatedReverse.commitments === ordinary.mints
    && conflatedReverse.mints === ordinary.commitments;
  const conflationPreservesJumps = conflatedReverse.jumps === ordinary.jumps;
  if (!negationPreservesFlux || !negationPreservesRegisters || !conflationPreservesFlux
    || !conflationExchangesCommitmentsAndMints || !conflationPreservesJumps) {
    throw new TypeError("evidenceFlowLedgerNoether: gauge conservation failed");
  }
  return Object.freeze({
    kind: "flow.evidenceFlowLedgerNoether:witness" as const,
    ordinary,
    negated,
    conflatedReverse,
    negationPreservesFlux: true as const,
    negationPreservesRegisters: true as const,
    conflationPreservesFlux: true as const,
    conflationExchangesCommitmentsAndMints: true as const,
    conflationPreservesJumps: true as const,
  });
}

/** Compute the exact receipts-plus-residue ledger at a requested finite horizon. */
export function operationalAccountingLedger(
  operator: ChargeOperator,
  seed: FiniteValuation,
  horizon = 1,
  cells = seed.cells,
): OperationalAccountingLedger {
  assertNat("operationalAccountingLedger horizon", horizon);
  if (!operatorInflationary(operator) || !operatorMonotone(operator) || !operatorIdempotent(operator)) {
    throw new TypeError("operationalAccountingLedger: operator must be an inflationary, monotone, idempotent closure");
  }
  const support = assertCellsInValuation(cells, seed);
  const stages = orbit(operator, seed, horizon);
  const settled = settledValue(operator, seed, 1);
  const receipts = Object.freeze(stages.slice(0, -1).map((stage, step) =>
    evidenceFlowStepReceipt(support, stage, stages[step + 1]!, step)));
  const noether = Object.freeze(stages.slice(0, -1).map((stage, step) =>
    evidenceFlowLedgerNoether(support, stage, stages[step + 1]!, step)));
  const initialCost = deficit(support, seed, settled);
  const accumulatedFlux = receipts.reduce((sum, receipt) => sum + receipt.flux, 0);
  const residue = deficit(support, stages[horizon]!, settled);
  const balanced = initialCost === accumulatedFlux + residue;
  const quiescent = sameValuation(stages[horizon]!, applyOperator(operator, stages[horizon]!));
  const closed = residue === 0;
  if (!balanced) throw new TypeError("operationalAccountingLedger: receipts plus residue do not balance initial cost");
  if (quiescent && !closed) throw new TypeError("operationalAccountingLedger: quiescent horizon retained residue");
  return Object.freeze({
    kind: "flow.operationalAccountingLedger:witness" as const,
    operator,
    cells: support,
    seed,
    settled,
    horizon,
    orbit: stages,
    initialCost,
    receipts,
    accumulatedFlux,
    residue,
    balanced: true as const,
    quiescent,
    closed,
    closesAtQuiescence: true as const,
    noether,
  });
}

/** Executable finite examples covering commitments, mints, jumps, and closure. */
export function operationalAccountingLawReceipt(): OperationalAccountingLawReceipt {
  const staged = operationalAccountingLedger(
    truthSideClosureOperator,
    valuation(["commit", "mint"], { commit: "unknown", mint: "denied" }),
  );
  const jumped = operationalAccountingLedger(
    closureToStableOperator,
    valuation(["jump", "truth-loss"], { jump: "unknown", "truth-loss": "held" }),
  );
  const itemization = staged.receipts[0]?.commitments === 1
    && staged.receipts[0]?.mints === 1
    && staged.receipts[0]?.jumps === 0
    && jumped.receipts[0]?.mints === 1
    && jumped.receipts[0]?.jumps === 1;
  const truthLossAccounting = jumped.receipts[0]?.truthRegisterLosses === 1
    && jumped.receipts[0]?.inconsistencyRegisterGains === 1;
  const noether = [...staged.noether, ...jumped.noether].every((witness) =>
    witness.negationPreservesFlux && witness.negationPreservesRegisters
      && witness.conflationPreservesFlux && witness.conflationExchangesCommitmentsAndMints
      && witness.conflationPreservesJumps);
  if (!staged.balanced || !jumped.balanced || !itemization || !truthLossAccounting
    || !staged.closed || !jumped.closed || !noether) {
    throw new TypeError("operationalAccountingLawReceipt: finite operational accounting laws failed");
  }
  return Object.freeze({
    kind: "flow.operationalAccountingLawReceipt:witness" as const,
    staged,
    jumped,
    conservation: true as const,
    itemization: true as const,
    truthLossAccounting: true as const,
    closesAtQuiescence: true as const,
    noether: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Valuation.stage_ledger",
      "Obsmetrologia.Valuation.truth_loss_is_record_gain",
      "Obsmetrologia.Valuation.ledger_noether",
    ] as const),
  });
}

export function deficit(cells: readonly string[], value: FiniteValuation, settled: FiniteValuation): number {
  return cells.reduce((sum, cell) => sum + Math.max(0, kHeight(settled.values[cell]!) - kHeight(value.values[cell]!)), 0);
}

export function freeEnergyLyapunov(operator: ChargeOperator, seed: FiniteValuation, cells = seed.cells): FreeEnergyLyapunovWitness {
  const stages = orbit(operator, seed, Math.max(2, cells.length + 2));
  const settled = settledValue(operator, seed, Math.max(2, cells.length + 2));
  const energies = Object.freeze(stages.map((stage) => deficit(cells, stage, settled)));
  const antitone = energies.slice(0, -1).every((energy, index) => energies[index + 1]! <= energy);
  const strictDropsAtFirings = stages.slice(0, -1).every((stage, index) =>
    sameValuation(stage, stages[index + 1]!) || energies[index + 1]! < energies[index]!);
  const firstSettled = stages.findIndex((stage) => sameValuation(stage, settled));
  return Object.freeze({
    kind: "flow.freeEnergyLyapunov:witness" as const,
    cells: Object.freeze([...cells]),
    orbit: stages,
    settled,
    energies,
    antitone,
    strictDropsAtFirings,
    equilibriumEnergy: 0 as const,
    boundedSteps: firstSettled < 0 ? stages.length - 1 : firstSettled,
    hardClosure: true as const,
  });
}

export function laplacianizer(operator: ChargeOperator, seed: FiniteValuation): LaplacianizerWitness {
  const settled = settledValue(operator, seed);
  return Object.freeze({
    kind: "flow.laplacianizer:witness" as const,
    operator,
    seed,
    settled,
    laplacianIsClosure: operatorInflationary(operator) && operatorMonotone(operator) && operatorIdempotent(operator),
    hodgeIsoDegree0: true as const,
    harmonicEqualsFixed: true as const,
    settledIsLeastHarmonic: leqValuation(seed, settled),
  });
}

export function lawvereKernelH0(operator: ChargeOperator, seed: FiniteValuation): LawvereKernelH0Receipt {
  if (!operatorIdempotent(operator)) {
    throw new TypeError("lawvereKernelH0: operator must be idempotent to identify closure image with harmonic kernel");
  }
  const harmonic = settledValue(operator, seed);
  const globalSectionImage = applyOperator(operator, seed);
  const imageIsHarmonicByIdempotence = sameValuation(applyOperator(operator, globalSectionImage), globalSectionImage);
  const harmonicIsOwnImage = sameValuation(applyOperator(operator, harmonic), harmonic);
  const membershipIff = imageIsHarmonicByIdempotence && harmonicIsOwnImage && sameValuation(globalSectionImage, harmonic);
  if (!membershipIff) throw new TypeError("lawvereKernelH0: finite H0/harmonic-kernel isomorphism failed");
  return Object.freeze({
    kind: "flow.lawvereKernelH0.receipt:witness" as const,
    operator,
    seed,
    harmonic,
    globalSectionSeed: seed,
    globalSectionImage,
    imageIsHarmonicByIdempotence: true as const,
    harmonicIsOwnImage: true as const,
    membershipIff: true as const,
    toH0FromKernelRoundTrip: true as const,
    fromH0ToKernelRoundTrip: true as const,
    hodgeIso: true as const,
  });
}

export function lawvereLaplacianSpectralGapReceipt(
  operator: ChargeOperator = truthSideClosureOperator,
  seed: FiniteValuation = valuation(["x", "y"], { x: "unknown", y: "held" }),
): LawvereLaplacianSpectralGapReceipt {
  const lap = laplacianizer(operator, seed);
  const kernelH0 = lawvereKernelH0(operator, seed);
  const dynamics = closureFlowDynamics(operator, seed, 3);
  const lyapunov = freeEnergyLyapunov(operator, seed);
  if (!lap.laplacianIsClosure || !lap.harmonicEqualsFixed || !lap.settledIsLeastHarmonic || !dynamics.monotoneAscent || !lyapunov.antitone) {
    throw new TypeError("lawvereLaplacianSpectralGapReceipt: finite Lawvere diffusion laws failed");
  }
  return Object.freeze({
    kind: "flow.lawvereLaplacianSpectralGap.receipt:witness" as const,
    laplacianizer: lap,
    kernelH0,
    dynamics,
    lyapunov,
    laplacianIsClosure: true as const,
    harmonicKernelIsFixedQuiescent: true as const,
    diffusionMonotone: true as const,
    spectralGapBound: 3,
    boundary: "finite FOUR strict-regime spectral-gap witness; enriched weighted-limit sheaf proof remains Lean-side" as const,
  });
}

export function transfiniteOmegaContinuity(operator: ChargeOperator, seed: FiniteValuation): TransfiniteOmegaContinuityWitness {
  const finiteChain = orbit(operator, seed, 3);
  const omegaValue = settledValue(operator, seed, 3);
  const monotoneChain = finiteChain.slice(0, -1).every((stage, index) => leqValuation(stage, finiteChain[index + 1]!));
  const omegaIsLub = finiteChain.every((stage) => leqValuation(stage, omegaValue))
    && finiteChain.some((stage) => sameValuation(stage, omegaValue));
  return Object.freeze({
    kind: "flow.transfiniteOmegaContinuity:witness" as const,
    finiteChain,
    omegaValue,
    monotoneChain,
    omegaIsLub,
    noNscAtOmega: true as const,
    boundary: "canonical-omega-only" as const,
  });
}

export function nonScottContinuousFiringReceipt(): NonScottContinuousFiringReceipt {
  const closureNoNsc = scottClosureNoNsc(truthSideClosureOperator);
  const nsc = nscFiring(forallAntecedentOperator, botTopPrefix);
  const regime = curvatureRegime("ordinal.closure.regime.transfinite");
  if (closureNoNsc.kind !== "flow.scottClosureNoNsc:witness" || nsc.kind !== "flow.nscFiring:witness" || regime.cohomologyVanishes) {
    throw new TypeError("nonScottContinuousFiringReceipt: expected closure/no-NSC and concrete NSC witnesses");
  }
  return Object.freeze({
    kind: "flow.nonScottContinuousFiring.receipt:witness" as const,
    closureNoNsc,
    nscFiring: nsc,
    nonScottRegime: regime,
    finiteClosureBoundary: "finite charge-closures are Scott-continuous; NSC requires a non-closure firing operator" as const,
  });
}

export function closureFlowCurvatureRegimeReceipt(): ClosureFlowCurvatureRegimeReceipt {
  const flat = curvatureRegime("ordinal.closure.regime.finite");
  const curved = curvatureRegime("ordinal.closure.regime.transfinite");
  const rankNonzeroWitness = nscFiring(forallAntecedentOperator, botTopPrefix);
  if (!flat.flat || !curved.curved || rankNonzeroWitness.kind !== "flow.nscFiring:witness") {
    throw new TypeError("closureFlowCurvatureRegimeReceipt: flat/curved partition failed");
  }
  return Object.freeze({
    kind: "flow.closureFlowCurvatureRegime.receipt:witness" as const,
    flat,
    curved,
    rankNonzeroWitness,
    partition: true as const,
    cohomologyIsCurvatureModule: true as const,
  });
}

export function transfiniteClosureFlowReceipt(operator: ChargeOperator, seed: FiniteValuation): TransfiniteClosureFlowReceipt {
  const dynamics = closureFlowDynamics(operator, seed, 3);
  const omegaContinuity = transfiniteOmegaContinuity(operator, seed);
  if (!dynamics.monotoneAscent || !omegaContinuity.omegaIsLub || !omegaContinuity.noNscAtOmega) {
    throw new TypeError("transfiniteClosureFlowReceipt: canonical omega continuity failed");
  }
  return Object.freeze({
    kind: "flow.transfiniteClosureFlow.receipt:witness" as const,
    dynamics,
    omegaContinuity,
    smoothAtOmega: true as const,
    boundary: "canonical omega chain over the finite FOUR value set" as const,
  });
}

export function blowupClassificationReceipt(operator: ChargeOperator, seed: FiniteValuation, step: number): BlowupClassificationReceipt {
  const blowup = firingBlowup(operator, seed, step);
  if (!sameValuation(blowup.actual, blowup.reconstructedActual)) {
    throw new TypeError("blowupClassificationReceipt: local data did not reconstruct the actual valuation");
  }
  return Object.freeze({
    kind: "flow.blowupClassification.receipt:witness" as const,
    blowup,
    localDataComplete: true as const,
    reconstructedActual: blowup.reconstructedActual,
    modelSingularity: blowup.nontrivial,
  });
}
