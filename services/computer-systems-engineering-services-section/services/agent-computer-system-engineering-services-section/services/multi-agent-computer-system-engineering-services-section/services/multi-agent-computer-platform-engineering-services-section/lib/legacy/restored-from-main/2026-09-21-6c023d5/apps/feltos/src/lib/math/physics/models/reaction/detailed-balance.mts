/**
 * models/reaction/detailed-balance - reversible reactions as fixed points.
 *
 * This captures `Obsmetrologia.Relational.Reaction.DetailedBalance`:
 * reverse reactions, canceling stoichiometry, forward/backward propensities,
 * net flux, detailed balance, and Euler fixedness at equilibrium.
 */

import {
  equilibriumIsFixed,
  netStoich,
  propensity,
  reaction,
  type Concentration,
  type Reaction,
} from "./mass-action-rate.mts";

export interface ReversibleReaction<Species extends string> {
  readonly kind: "relational.reaction.detailedBalance.reversible";
  readonly fwd: Reaction<Species>;
  readonly kf: number;
  readonly kb: number;
}

export interface StoichSumReverseWitness<Species extends string> {
  readonly kind: "relational.reaction.detailedBalance.stoich_sum_reverse:witness";
  readonly reaction: Reaction<Species>;
  readonly species: Species;
  readonly forwardNet: number;
  readonly reverseNet: number;
  readonly sum: 0;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.stoich_sum_reverse";
}

export interface ProceedsForwardWitness<Species extends string> {
  readonly kind: "relational.reaction.detailedBalance.proceeds_forward:witness";
  readonly reversible: ReversibleReaction<Species>;
  readonly concentration: Concentration<Species>;
  readonly forward: number;
  readonly backward: number;
  readonly netFlux: number;
  readonly proceedsForward: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.proceeds_forward";
}

export interface DetailedBalanceNetFluxZeroWitness<Species extends string> {
  readonly kind: "relational.reaction.detailedBalance.netFlux_zero:witness";
  readonly reversible: ReversibleReaction<Species>;
  readonly concentration: Concentration<Species>;
  readonly detailedBalance: true;
  readonly netFluxZero: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.detailedBalance_iff_netFlux_zero";
}

export interface DetailedBalanceEulerFixedWitness<Species extends string> {
  readonly kind: "relational.reaction.detailedBalance.euler_fixed:witness";
  readonly reversible: ReversibleReaction<Species>;
  readonly concentration: Concentration<Species>;
  readonly dt: number;
  readonly fixed: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Reaction.detailedBalance_is_equilibrium",
    "Obsmetrologia.Relational.Reaction.detailedBalance_euler_fixed",
  ];
}

export interface DetailedBalanceReceipt {
  readonly kind: "relational.reaction.detailedBalance.receipt:witness";
  readonly stoichCancel: StoichSumReverseWitness<"A" | "B">;
  readonly proceedsForward: ProceedsForwardWitness<"A" | "B">;
  readonly netFluxZero: DetailedBalanceNetFluxZeroWitness<"A" | "B">;
  readonly eulerFixed: DetailedBalanceEulerFixedWitness<"A" | "B">;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Reaction.DetailedBalance";
}

const EPSILON = 1e-10;
const closeEnough = (left: number, right: number): boolean => Math.abs(left - right) <= EPSILON;

export function reverseReaction<Species extends string>(r: Reaction<Species>): Reaction<Species> {
  return reaction(r.species, r.product, r.reactant);
}

export function reversibleReaction<Species extends string>(
  fwd: Reaction<Species>,
  kf: number,
  kb: number,
): ReversibleReaction<Species> {
  return Object.freeze({
    kind: "relational.reaction.detailedBalance.reversible" as const,
    fwd,
    kf,
    kb,
  });
}

export function stoichSumReverse<Species extends string>(
  r: Reaction<Species>,
  species: Species,
): StoichSumReverseWitness<Species> {
  const forwardNet = netStoich(r)[species];
  const reverseNet = netStoich(reverseReaction(r))[species];
  if (!closeEnough(forwardNet + reverseNet, 0)) throw new TypeError("stoichSumReverse: net stoichiometries did not cancel");
  return Object.freeze({
    kind: "relational.reaction.detailedBalance.stoich_sum_reverse:witness" as const,
    reaction: r,
    species,
    forwardNet,
    reverseNet,
    sum: 0 as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.stoich_sum_reverse" as const,
  });
}

export function forwardProp<Species extends string>(
  reversible: ReversibleReaction<Species>,
  concentration: Concentration<Species>,
): number {
  return propensity(reversible.fwd.species, reversible.kf, reversible.fwd, concentration);
}

export function backwardProp<Species extends string>(
  reversible: ReversibleReaction<Species>,
  concentration: Concentration<Species>,
): number {
  const reverse = reverseReaction(reversible.fwd);
  return propensity(reversible.fwd.species, reversible.kb, reverse, concentration);
}

export function netFlux<Species extends string>(
  reversible: ReversibleReaction<Species>,
  concentration: Concentration<Species>,
): number {
  return forwardProp(reversible, concentration) - backwardProp(reversible, concentration);
}

export function pairField<Species extends string>(
  reversible: ReversibleReaction<Species>,
): (concentration: Concentration<Species>) => Concentration<Species> {
  return (concentration) => {
    const forward = forwardProp(reversible, concentration);
    const backward = backwardProp(reversible, concentration);
    const net = netStoich(reversible.fwd);
    const reverseNet = netStoich(reverseReaction(reversible.fwd));
    return Object.freeze(Object.fromEntries(reversible.fwd.species.map((item) => [
      item,
      forward * net[item] + backward * reverseNet[item],
    ])) as Record<Species, number>);
  };
}

export function detailedBalance<Species extends string>(
  reversible: ReversibleReaction<Species>,
  concentration: Concentration<Species>,
): boolean {
  return closeEnough(forwardProp(reversible, concentration), backwardProp(reversible, concentration));
}

export function proceedsForward<Species extends string>(
  reversible: ReversibleReaction<Species>,
  concentration: Concentration<Species>,
): ProceedsForwardWitness<Species> {
  const forward = forwardProp(reversible, concentration);
  const backward = backwardProp(reversible, concentration);
  const flux = netFlux(reversible, concentration);
  if (!(backward < forward) || !(flux > 0)) throw new TypeError("proceedsForward: flux is not strictly forward");
  return Object.freeze({
    kind: "relational.reaction.detailedBalance.proceeds_forward:witness" as const,
    reversible,
    concentration,
    forward,
    backward,
    netFlux: flux,
    proceedsForward: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.proceeds_forward" as const,
  });
}

export function detailedBalanceIffNetFluxZero<Species extends string>(
  reversible: ReversibleReaction<Species>,
  concentration: Concentration<Species>,
): DetailedBalanceNetFluxZeroWitness<Species> {
  if (!detailedBalance(reversible, concentration) || !closeEnough(netFlux(reversible, concentration), 0)) {
    throw new TypeError("detailedBalanceIffNetFluxZero: detailed balance/net-flux equivalence failed");
  }
  return Object.freeze({
    kind: "relational.reaction.detailedBalance.netFlux_zero:witness" as const,
    reversible,
    concentration,
    detailedBalance: true as const,
    netFluxZero: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.detailedBalance_iff_netFlux_zero" as const,
  });
}

export function detailedBalanceEulerFixed<Species extends string>(
  reversible: ReversibleReaction<Species>,
  concentration: Concentration<Species>,
  dt: number,
): DetailedBalanceEulerFixedWitness<Species> {
  detailedBalanceIffNetFluxZero(reversible, concentration);
  const fixed = equilibriumIsFixed(reversible.fwd.species, pairField(reversible), dt, concentration);
  if (!fixed.fixed) throw new TypeError("detailedBalanceEulerFixed: equilibrium moved");
  return Object.freeze({
    kind: "relational.reaction.detailedBalance.euler_fixed:witness" as const,
    reversible,
    concentration,
    dt,
    fixed: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Reaction.detailedBalance_is_equilibrium",
      "Obsmetrologia.Relational.Reaction.detailedBalance_euler_fixed",
    ] as const),
  });
}

export function detailedBalanceReceipt(): DetailedBalanceReceipt {
  const species = Object.freeze(["A", "B"] as const);
  const fwd = reaction(species, { A: 1, B: 0 }, { A: 0, B: 1 });
  const balancedPair = reversibleReaction(fwd, 2, 2);
  const forwardPair = reversibleReaction(fwd, 3, 1);
  const concentration = Object.freeze({ A: 1, B: 1 });
  return Object.freeze({
    kind: "relational.reaction.detailedBalance.receipt:witness" as const,
    stoichCancel: stoichSumReverse(fwd, "A"),
    proceedsForward: proceedsForward(forwardPair, concentration),
    netFluxZero: detailedBalanceIffNetFluxZero(balancedPair, concentration),
    eulerFixed: detailedBalanceEulerFixed(balancedPair, concentration, 0.25),
    capturedLeanModule: "Obsmetrologia.Relational.Reaction.DetailedBalance" as const,
  });
}
