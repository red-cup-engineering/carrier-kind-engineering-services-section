/**
 * models/reaction/reaction-network - counted reaction network invariants.
 *
 * This captures `Obsmetrologia.Relational.Reaction.Network`: count-vector markings,
 * enabled firing, mass balance/conservation, non-monotone consumption,
 * catalysis as a fixed coordinate, and mass-conserving network steps.
 */

import {
  reactionNetwork,
  reactionStep,
  totalCount,
  type ReactionNetwork,
  type ReactionStepWitness,
} from "./free-energy-descent.mts";
import { type CountVector, type Reaction, reaction } from "./mass-action-rate.mts";
import { enabled, fire } from "./support-projection.mts";

export interface TotalAddWitness<Species extends string> {
  readonly kind: "relational.reaction.network.total_add:witness";
  readonly species: readonly Species[];
  readonly left: CountVector<Species>;
  readonly right: CountVector<Species>;
  readonly totalSum: number;
  readonly sumOfTotals: number;
  readonly additive: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.total_add";
}

export interface BalancedWitness<Species extends string> {
  readonly kind: "relational.reaction.network.balanced:witness";
  readonly species: readonly Species[];
  readonly reaction: Reaction<Species>;
  readonly reactantTotal: number;
  readonly productTotal: number;
  readonly balanced: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Reaction.Balanced";
}

export interface MassConservedWitness<Species extends string> {
  readonly kind: "relational.reaction.network.mass_conserved:witness";
  readonly reaction: Reaction<Species>;
  readonly marking: CountVector<Species>;
  readonly fired: CountVector<Species>;
  readonly beforeTotal: number;
  readonly afterTotal: number;
  readonly conserved: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.mass_conserved";
}

export interface FireNotMonotoneWitness {
  readonly kind: "relational.reaction.network.fire_not_monotone:witness";
  readonly reaction: Reaction<"A" | "B">;
  readonly marking: CountVector<"A" | "B">;
  readonly species: "A";
  readonly before: 1;
  readonly after: 0;
  readonly strictlyDecreased: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.fire_not_monotone";
}

export interface CatalystFixedWitness<Species extends string> {
  readonly kind: "relational.reaction.network.catalyst_is_fixed:witness";
  readonly reaction: Reaction<Species>;
  readonly marking: CountVector<Species>;
  readonly species: Species;
  readonly before: number;
  readonly after: number;
  readonly fixed: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.catalyst_is_fixed";
}

export interface StepConservesMassWitness<Species extends string> {
  readonly kind: "relational.reaction.network.step_conserves_mass:witness";
  readonly network: ReactionNetwork<Species>;
  readonly step: ReactionStepWitness<Species>;
  readonly beforeTotal: number;
  readonly afterTotal: number;
  readonly conserved: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.step_conserves_mass";
}

export interface ReactionNetworkReceipt {
  readonly kind: "relational.reaction.network.receipt:witness";
  readonly totalAdd: TotalAddWitness<"A" | "B" | "C">;
  readonly massConserved: MassConservedWitness<"A" | "B" | "C">;
  readonly fireNotMonotone: FireNotMonotoneWitness;
  readonly catalystFixed: CatalystFixedWitness<"A" | "B" | "C">;
  readonly stepConserved: StepConservesMassWitness<"A" | "B" | "C">;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Reaction.Network";
}

function addMarkings<Species extends string>(
  species: readonly Species[],
  left: CountVector<Species>,
  right: CountVector<Species>,
): CountVector<Species> {
  return Object.freeze(Object.fromEntries(species.map((item) => [item, left[item] + right[item]])) as Record<Species, number>);
}

export function totalAdd<Species extends string>(
  species: readonly Species[],
  left: CountVector<Species>,
  right: CountVector<Species>,
): TotalAddWitness<Species> {
  const summed = addMarkings(species, left, right);
  const totalSum = totalCount(species, summed);
  const sumOfTotals = totalCount(species, left) + totalCount(species, right);
  if (totalSum !== sumOfTotals) throw new TypeError("totalAdd: coordinatewise-add total law failed");
  return Object.freeze({
    kind: "relational.reaction.network.total_add:witness" as const,
    species,
    left,
    right,
    totalSum,
    sumOfTotals,
    additive: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.total_add" as const,
  });
}

export function balanced<Species extends string>(
  species: readonly Species[],
  r: Reaction<Species>,
): BalancedWitness<Species> {
  const reactantTotal = totalCount(species, r.reactant);
  const productTotal = totalCount(species, r.product);
  if (reactantTotal !== productTotal) throw new TypeError("balanced: reaction is not mass-balanced");
  return Object.freeze({
    kind: "relational.reaction.network.balanced:witness" as const,
    species,
    reaction: r,
    reactantTotal,
    productTotal,
    balanced: true as const,
    leanDefinition: "Obsmetrologia.Relational.Reaction.Balanced" as const,
  });
}

export function massConserved<Species extends string>(
  species: readonly Species[],
  r: Reaction<Species>,
  marking: CountVector<Species>,
): MassConservedWitness<Species> {
  balanced(species, r);
  if (!enabled(r, marking)) throw new TypeError("massConserved: reaction is not enabled");
  const fired = fire(r, marking);
  const beforeTotal = totalCount(species, marking);
  const afterTotal = totalCount(species, fired);
  if (beforeTotal !== afterTotal) throw new TypeError("massConserved: total changed");
  return Object.freeze({
    kind: "relational.reaction.network.mass_conserved:witness" as const,
    reaction: r,
    marking,
    fired,
    beforeTotal,
    afterTotal,
    conserved: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.mass_conserved" as const,
  });
}

export function fireNotMonotone(): FireNotMonotoneWitness {
  const r = reaction(["A", "B"], { A: 1, B: 0 }, { A: 0, B: 0 });
  const marking = Object.freeze({ A: 1, B: 0 });
  const fired = fire(r, marking);
  if (!(fired.A < marking.A)) throw new TypeError("fireNotMonotone: witness did not decrease A");
  return Object.freeze({
    kind: "relational.reaction.network.fire_not_monotone:witness" as const,
    reaction: r,
    marking,
    species: "A" as const,
    before: 1 as const,
    after: 0 as const,
    strictlyDecreased: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.fire_not_monotone" as const,
  });
}

export function catalystIsFixed<Species extends string>(
  r: Reaction<Species>,
  marking: CountVector<Species>,
  species: Species,
): CatalystFixedWitness<Species> {
  if (r.reactant[species] !== r.product[species]) throw new TypeError("catalystIsFixed: species is not catalytic");
  if (r.reactant[species] > marking[species]) throw new TypeError("catalystIsFixed: catalyst count underflows");
  const fired = fire(r, marking);
  if (fired[species] !== marking[species]) throw new TypeError("catalystIsFixed: catalytic coordinate changed");
  return Object.freeze({
    kind: "relational.reaction.network.catalyst_is_fixed:witness" as const,
    reaction: r,
    marking,
    species,
    before: marking[species],
    after: fired[species],
    fixed: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.catalyst_is_fixed" as const,
  });
}

export function stepConservesMass<Species extends string>(
  network: ReactionNetwork<Species>,
  step: ReactionStepWitness<Species>,
): StepConservesMassWitness<Species> {
  for (const r of network.reactions) balanced(network.species, r);
  const beforeTotal = totalCount(network.species, step.before);
  const afterTotal = totalCount(network.species, step.after);
  if (beforeTotal !== afterTotal) throw new TypeError("stepConservesMass: total changed");
  return Object.freeze({
    kind: "relational.reaction.network.step_conserves_mass:witness" as const,
    network,
    step,
    beforeTotal,
    afterTotal,
    conserved: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.step_conserves_mass" as const,
  });
}

export function reactionNetworkReceipt(): ReactionNetworkReceipt {
  const species = Object.freeze(["A", "B", "C"] as const);
  const combine = reaction(species, { A: 1, B: 1, C: 0 }, { A: 0, B: 0, C: 2 });
  const catalytic = reaction(species, { A: 1, B: 0, C: 1 }, { A: 0, B: 1, C: 1 });
  const network = reactionNetwork(species, [combine]);
  const marking = Object.freeze({ A: 1, B: 1, C: 0 });
  const step = reactionStep(network, combine, marking);
  return Object.freeze({
    kind: "relational.reaction.network.receipt:witness" as const,
    totalAdd: totalAdd(species, { A: 1, B: 0, C: 2 }, { A: 0, B: 3, C: 1 }),
    massConserved: massConserved(species, combine, marking),
    fireNotMonotone: fireNotMonotone(),
    catalystFixed: catalystIsFixed(catalytic, { A: 1, B: 0, C: 3 }, "C"),
    stepConserved: stepConservesMass(network, step),
    capturedLeanModule: "Obsmetrologia.Relational.Reaction.Network" as const,
  });
}
