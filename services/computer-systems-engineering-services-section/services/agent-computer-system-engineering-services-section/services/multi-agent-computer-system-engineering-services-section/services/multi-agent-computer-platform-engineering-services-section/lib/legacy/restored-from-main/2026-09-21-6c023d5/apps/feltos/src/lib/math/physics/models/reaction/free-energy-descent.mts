/**
 * models/reaction/free-energy-descent - reaction-regime Lyapunov descent.
 *
 * This captures `Obsmetrologia.Relational.Reaction.FreeEnergyDescent`: for a
 * catabolic reaction network, total particle count is a natural-valued free
 * energy that strictly decreases at every firing and bounds reachability length.
 */
import { type CountVector, type Reaction } from "./mass-action-rate.mts";
import { enabled, fire } from "./support-projection.mts";

export interface ReactionNetwork<Species extends string> {
  readonly kind: "relational.reaction.network";
  readonly species: readonly Species[];
  readonly reactions: readonly Reaction<Species>[];
}

export interface TotalFireAddWitness<Species extends string> {
  readonly kind: "relational.reaction.freeEnergy.total_fire_add:witness";
  readonly reaction: Reaction<Species>;
  readonly state: CountVector<Species>;
  readonly fired: CountVector<Species>;
  readonly left: number;
  readonly right: number;
  readonly balancedBookkeeping: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.total_fire_add";
}

export interface CatabolicWitness<Species extends string> {
  readonly kind: "relational.reaction.freeEnergy.catabolic:witness";
  readonly network: ReactionNetwork<Species>;
  readonly decreasesEveryReaction: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Reaction.Catabolic";
}

export interface ReactionStepWitness<Species extends string> {
  readonly kind: "relational.reaction.freeEnergy.step:witness";
  readonly network: ReactionNetwork<Species>;
  readonly reaction: Reaction<Species>;
  readonly before: CountVector<Species>;
  readonly after: CountVector<Species>;
  readonly enabled: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Reaction.Step";
}

export interface StepStrictDecreaseWitness<Species extends string> {
  readonly kind: "relational.reaction.freeEnergy.step_strict_decrease:witness";
  readonly step: ReactionStepWitness<Species>;
  readonly beforeTotal: number;
  readonly afterTotal: number;
  readonly strictlyDecreases: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.step_strict_decrease";
}

export interface ReachInWitness<Species extends string> {
  readonly kind: "relational.reaction.freeEnergy.reachIn:witness";
  readonly network: ReactionNetwork<Species>;
  readonly initial: CountVector<Species>;
  readonly final: CountVector<Species>;
  readonly steps: readonly ReactionStepWitness<Species>[];
  readonly length: number;
  readonly leanDefinition: "Obsmetrologia.Relational.Reaction.ReachIn";
}

export interface CatabolicDescentWitness<Species extends string> {
  readonly kind: "relational.reaction.freeEnergy.catabolic_descent:witness";
  readonly reachability: ReachInWitness<Species>;
  readonly initialTotal: number;
  readonly finalTotal: number;
  readonly length: number;
  readonly lengthPlusFinalBelowInitial: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.catabolic_descent";
}

export interface CatabolicStepsBoundedWitness<Species extends string> {
  readonly kind: "relational.reaction.freeEnergy.catabolic_steps_bounded:witness";
  readonly reachability: ReachInWitness<Species>;
  readonly initialTotal: number;
  readonly length: number;
  readonly bounded: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.catabolic_steps_bounded";
}

export interface TerminalOfTotalZeroWitness<Species extends string> {
  readonly kind: "relational.reaction.freeEnergy.terminal_of_total_zero:witness";
  readonly network: ReactionNetwork<Species>;
  readonly state: CountVector<Species>;
  readonly total: 0;
  readonly terminal: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.terminal_of_total_zero";
}

export interface FreeEnergyDescentReceipt {
  readonly kind: "relational.reaction.freeEnergy.receipt:witness";
  readonly totalFireAdd: TotalFireAddWitness<"A" | "B" | "C">;
  readonly catabolic: CatabolicWitness<"A" | "B" | "C">;
  readonly strictDecrease: StepStrictDecreaseWitness<"A" | "B" | "C">;
  readonly descent: CatabolicDescentWitness<"A" | "B" | "C">;
  readonly bounded: CatabolicStepsBoundedWitness<"A" | "B" | "C">;
  readonly terminal: TerminalOfTotalZeroWitness<"A" | "B" | "C">;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Reaction.FreeEnergyDescent";
}

const assertNat = (value: number, caller: string): number => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${caller}: expected a safe natural number`);
  return value;
};

function normalizeSpecies<Species extends string>(species: readonly Species[], caller: string): readonly Species[] {
  const normalized = Object.freeze([...new Set(species.map((item) => {
    const trimmed = item.trim();
    if (trimmed.length === 0) throw new TypeError(`${caller}: species labels must be nonempty`);
    return trimmed as Species;
  }))]);
  if (normalized.length === 0) throw new TypeError(`${caller}: expected at least one species`);
  return normalized;
}

function normalizeState<Species extends string>(
  species: readonly Species[],
  state: CountVector<Species>,
  caller: string,
): CountVector<Species> {
  return Object.freeze(Object.fromEntries(species.map((item) => {
    if (!Object.hasOwn(state, item)) throw new TypeError(`${caller}: missing count for ${item}`);
    return [item, assertNat(state[item], caller)];
  })) as Record<Species, number>);
}

function sameState<Species extends string>(
  species: readonly Species[],
  left: CountVector<Species>,
  right: CountVector<Species>,
): boolean {
  return species.every((item) => left[item] === right[item]);
}

export function reactionNetwork<Species extends string>(
  species: readonly Species[],
  reactions: readonly Reaction<Species>[],
): ReactionNetwork<Species> {
  const admittedSpecies = normalizeSpecies(species, "reactionNetwork");
  if (reactions.length === 0) throw new TypeError("reactionNetwork: expected at least one reaction");
  return Object.freeze({
    kind: "relational.reaction.network" as const,
    species: admittedSpecies,
    reactions: Object.freeze([...reactions]),
  });
}

export function totalCount<Species extends string>(
  species: readonly Species[],
  state: CountVector<Species>,
): number {
  const admitted = normalizeState(species, state, "totalCount");
  return species.reduce((total, item) => total + admitted[item], 0);
}

export function totalFireAdd<Species extends string>(
  species: readonly Species[],
  r: Reaction<Species>,
  state: CountVector<Species>,
): TotalFireAddWitness<Species> {
  const admitted = normalizeState(species, state, "totalFireAdd");
  if (!enabled(r, admitted)) throw new TypeError("totalFireAdd: reaction is not enabled");
  const fired = fire(r, admitted);
  const left = totalCount(species, fired) + totalCount(species, r.reactant);
  const right = totalCount(species, admitted) + totalCount(species, r.product);
  if (left !== right) throw new TypeError("totalFireAdd: firing bookkeeping identity failed");
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.total_fire_add:witness" as const,
    reaction: r,
    state: admitted,
    fired,
    left,
    right,
    balancedBookkeeping: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.total_fire_add" as const,
  });
}

export function catabolic<Species extends string>(network: ReactionNetwork<Species>): CatabolicWitness<Species> {
  const ok = network.reactions.every((r) =>
    totalCount(network.species, r.product) < totalCount(network.species, r.reactant));
  if (!ok) throw new TypeError("catabolic: every reaction must strictly reduce total count");
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.catabolic:witness" as const,
    network,
    decreasesEveryReaction: true as const,
    leanDefinition: "Obsmetrologia.Relational.Reaction.Catabolic" as const,
  });
}

export function reactionStep<Species extends string>(
  network: ReactionNetwork<Species>,
  r: Reaction<Species>,
  before: CountVector<Species>,
): ReactionStepWitness<Species> {
  if (!network.reactions.includes(r)) throw new TypeError("reactionStep: reaction is not in the network");
  const admitted = normalizeState(network.species, before, "reactionStep");
  if (!enabled(r, admitted)) throw new TypeError("reactionStep: reaction is not enabled");
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.step:witness" as const,
    network,
    reaction: r,
    before: admitted,
    after: fire(r, admitted),
    enabled: true as const,
    leanDefinition: "Obsmetrologia.Relational.Reaction.Step" as const,
  });
}

export function stepStrictDecrease<Species extends string>(
  catabolicNetwork: CatabolicWitness<Species>,
  step: ReactionStepWitness<Species>,
): StepStrictDecreaseWitness<Species> {
  if (step.network !== catabolicNetwork.network) throw new TypeError("stepStrictDecrease: step is for a different network");
  const beforeTotal = totalCount(step.network.species, step.before);
  const afterTotal = totalCount(step.network.species, step.after);
  if (!(afterTotal < beforeTotal)) throw new TypeError("stepStrictDecrease: catabolic step did not strictly decrease total");
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.step_strict_decrease:witness" as const,
    step,
    beforeTotal,
    afterTotal,
    strictlyDecreases: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.step_strict_decrease" as const,
  });
}

export function reachIn<Species extends string>(
  network: ReactionNetwork<Species>,
  initial: CountVector<Species>,
  reactions: readonly Reaction<Species>[],
): ReachInWitness<Species> {
  let current = normalizeState(network.species, initial, "reachIn");
  const steps: ReactionStepWitness<Species>[] = [];
  for (const r of reactions) {
    const step = reactionStep(network, r, current);
    steps.push(step);
    current = step.after;
  }
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.reachIn:witness" as const,
    network,
    initial: normalizeState(network.species, initial, "reachIn"),
    final: current,
    steps: Object.freeze(steps),
    length: steps.length,
    leanDefinition: "Obsmetrologia.Relational.Reaction.ReachIn" as const,
  });
}

export function catabolicDescent<Species extends string>(
  catabolicNetwork: CatabolicWitness<Species>,
  reachability: ReachInWitness<Species>,
): CatabolicDescentWitness<Species> {
  if (reachability.network !== catabolicNetwork.network) throw new TypeError("catabolicDescent: reachability is for a different network");
  for (const step of reachability.steps) stepStrictDecrease(catabolicNetwork, step);
  const initialTotal = totalCount(reachability.network.species, reachability.initial);
  const finalTotal = totalCount(reachability.network.species, reachability.final);
  if (reachability.length + finalTotal > initialTotal) {
    throw new TypeError("catabolicDescent: length plus final total exceeds initial total");
  }
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.catabolic_descent:witness" as const,
    reachability,
    initialTotal,
    finalTotal,
    length: reachability.length,
    lengthPlusFinalBelowInitial: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.catabolic_descent" as const,
  });
}

export function catabolicStepsBounded<Species extends string>(
  catabolicNetwork: CatabolicWitness<Species>,
  reachability: ReachInWitness<Species>,
): CatabolicStepsBoundedWitness<Species> {
  const descent = catabolicDescent(catabolicNetwork, reachability);
  if (descent.length > descent.initialTotal) throw new TypeError("catabolicStepsBounded: length exceeds initial total");
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.catabolic_steps_bounded:witness" as const,
    reachability,
    initialTotal: descent.initialTotal,
    length: descent.length,
    bounded: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.catabolic_steps_bounded" as const,
  });
}

export function terminalOfTotalZero<Species extends string>(
  catabolicNetwork: CatabolicWitness<Species>,
  state: CountVector<Species>,
): TerminalOfTotalZeroWitness<Species> {
  const admitted = normalizeState(catabolicNetwork.network.species, state, "terminalOfTotalZero");
  if (totalCount(catabolicNetwork.network.species, admitted) !== 0) {
    throw new TypeError("terminalOfTotalZero: state total is not zero");
  }
  const enabledReaction = catabolicNetwork.network.reactions.find((r) => enabled(r, admitted));
  if (enabledReaction !== undefined) throw new TypeError("terminalOfTotalZero: a catabolic reaction is enabled at total zero");
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.terminal_of_total_zero:witness" as const,
    network: catabolicNetwork.network,
    state: admitted,
    total: 0 as const,
    terminal: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.terminal_of_total_zero" as const,
  });
}

export function freeEnergyDescentReceipt(): FreeEnergyDescentReceipt {
  const species = Object.freeze(["A", "B", "C"] as const);
  const combine: Reaction<"A" | "B" | "C"> = Object.freeze({
    kind: "relational.reaction.reaction" as const,
    species,
    reactant: Object.freeze({ A: 1, B: 1, C: 0 }),
    product: Object.freeze({ A: 0, B: 0, C: 1 }),
  });
  const decayC: Reaction<"A" | "B" | "C"> = Object.freeze({
    kind: "relational.reaction.reaction" as const,
    species,
    reactant: Object.freeze({ A: 0, B: 0, C: 1 }),
    product: Object.freeze({ A: 0, B: 0, C: 0 }),
  });
  const network = reactionNetwork(species, [combine, decayC]);
  const catabolicNetwork = catabolic(network);
  const initial = Object.freeze({ A: 1, B: 1, C: 0 });
  const firstStep = reactionStep(network, combine, initial);
  const reachability = reachIn(network, initial, [combine, decayC]);
  return Object.freeze({
    kind: "relational.reaction.freeEnergy.receipt:witness" as const,
    totalFireAdd: totalFireAdd(species, combine, initial),
    catabolic: catabolicNetwork,
    strictDecrease: stepStrictDecrease(catabolicNetwork, firstStep),
    descent: catabolicDescent(catabolicNetwork, reachability),
    bounded: catabolicStepsBounded(catabolicNetwork, reachability),
    terminal: terminalOfTotalZero(catabolicNetwork, Object.freeze({ A: 0, B: 0, C: 0 })),
    capturedLeanModule: "Obsmetrologia.Relational.Reaction.FreeEnergyDescent" as const,
  });
}
