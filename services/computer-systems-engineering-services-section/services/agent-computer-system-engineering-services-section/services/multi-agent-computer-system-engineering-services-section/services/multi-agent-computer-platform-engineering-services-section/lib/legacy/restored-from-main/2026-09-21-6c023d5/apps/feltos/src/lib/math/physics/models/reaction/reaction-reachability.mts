/**
 * models/reaction/reaction-reachability - finite firing paths and coverability.
 *
 * This captures `Obsmetrologia.Relational.Reaction.Reachability`: reflexive,
 * one-step, transitive reachability, mass preservation across reachable paths,
 * support over-approximation by Datalog steps, and coverability.
 */

import {
  reachIn,
  reactionNetwork,
  reactionStep,
  totalCount,
  type ReactionNetwork,
  type ReactionStepWitness,
  type ReachInWitness,
} from "./free-energy-descent.mts";
import { type CountVector, type Reaction, reaction } from "./mass-action-rate.mts";
import { balanced } from "./reaction-network.mts";
import { ble, datalogStep, supp, supportFireLeDatalog } from "./support-projection.mts";

export interface ReachConservesMassWitness<Species extends string> {
  readonly kind: "relational.reaction.reachability.reach_conserves_mass:witness";
  readonly reachability: ReachInWitness<Species>;
  readonly initialTotal: number;
  readonly finalTotal: number;
  readonly conserved: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.reach_conserves_mass";
}

export interface StepSupportLeDatalogWitness<Species extends string> {
  readonly kind: "relational.reaction.reachability.step_support_le_datalog:witness";
  readonly step: ReactionStepWitness<Species>;
  readonly reaction: Reaction<Species>;
  readonly below: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.step_support_le_datalog";
}

export interface CoverableWitness<Species extends string> {
  readonly kind: "relational.reaction.reachability.coverable:witness";
  readonly network: ReactionNetwork<Species>;
  readonly initial: CountVector<Species>;
  readonly target: CountVector<Species>;
  readonly coveringState: CountVector<Species>;
  readonly coverable: true;
  readonly leanDefinition: "Obsmetrologia.Relational.Reaction.Coverable";
}

export interface ReactionReachabilityReceipt {
  readonly kind: "relational.reaction.reachability.receipt:witness";
  readonly reach: ReachInWitness<"A" | "B" | "C">;
  readonly massInvariant: ReachConservesMassWitness<"A" | "B" | "C">;
  readonly supportBelowDatalog: StepSupportLeDatalogWitness<"A" | "B" | "C">;
  readonly coverable: CoverableWitness<"A" | "B" | "C">;
  readonly selfCoverable: CoverableWitness<"A" | "B" | "C">;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Reaction.Reachability";
}

function dominates<Species extends string>(
  species: readonly Species[],
  state: CountVector<Species>,
  target: CountVector<Species>,
): boolean {
  return species.every((item) => target[item] <= state[item]);
}

export function reachConservesMass<Species extends string>(
  reachability: ReachInWitness<Species>,
): ReachConservesMassWitness<Species> {
  for (const r of reachability.network.reactions) balanced(reachability.network.species, r);
  const initialTotal = totalCount(reachability.network.species, reachability.initial);
  const finalTotal = totalCount(reachability.network.species, reachability.final);
  if (initialTotal !== finalTotal) throw new TypeError("reachConservesMass: total changed along reachability");
  return Object.freeze({
    kind: "relational.reaction.reachability.reach_conserves_mass:witness" as const,
    reachability,
    initialTotal,
    finalTotal,
    conserved: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.reach_conserves_mass" as const,
  });
}

export function stepSupportLeDatalog<Species extends string>(
  step: ReactionStepWitness<Species>,
): StepSupportLeDatalogWitness<Species> {
  const fireBelow = supportFireLeDatalog(step.network.species, step.reaction, step.before);
  const below = ble(step.network.species, supp(step.network.species, step.after), datalogStep(step.network.species, step.reaction, supp(step.network.species, step.before)));
  if (!below || !fireBelow.below) throw new TypeError("stepSupportLeDatalog: support containment failed");
  return Object.freeze({
    kind: "relational.reaction.reachability.step_support_le_datalog:witness" as const,
    step,
    reaction: step.reaction,
    below: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.step_support_le_datalog" as const,
  });
}

export function reachImpCoverable<Species extends string>(
  reachability: ReachInWitness<Species>,
  target: CountVector<Species>,
): CoverableWitness<Species> {
  if (!dominates(reachability.network.species, reachability.final, target)) {
    throw new TypeError("reachImpCoverable: target is not dominated by the reached state");
  }
  return Object.freeze({
    kind: "relational.reaction.reachability.coverable:witness" as const,
    network: reachability.network,
    initial: reachability.initial,
    target,
    coveringState: reachability.final,
    coverable: true as const,
    leanDefinition: "Obsmetrologia.Relational.Reaction.Coverable" as const,
  });
}

export function coverableSelf<Species extends string>(
  network: ReactionNetwork<Species>,
  state: CountVector<Species>,
): CoverableWitness<Species> {
  return Object.freeze({
    kind: "relational.reaction.reachability.coverable:witness" as const,
    network,
    initial: state,
    target: state,
    coveringState: state,
    coverable: true as const,
    leanDefinition: "Obsmetrologia.Relational.Reaction.Coverable" as const,
  });
}

export function reactionReachabilityReceipt(): ReactionReachabilityReceipt {
  const species = Object.freeze(["A", "B", "C"] as const);
  const combine = reaction(species, { A: 1, B: 1, C: 0 }, { A: 0, B: 0, C: 2 });
  const split = reaction(species, { A: 0, B: 0, C: 1 }, { A: 1, B: 0, C: 0 });
  const network = reactionNetwork(species, [combine, split]);
  const reach = reachIn(network, { A: 1, B: 1, C: 0 }, [combine]);
  const splitStep = reactionStep(network, split, { A: 0, B: 0, C: 1 });
  return Object.freeze({
    kind: "relational.reaction.reachability.receipt:witness" as const,
    reach,
    massInvariant: reachConservesMass(reach),
    supportBelowDatalog: stepSupportLeDatalog(splitStep),
    coverable: reachImpCoverable(reach, { A: 0, B: 0, C: 1 }),
    selfCoverable: coverableSelf(network, { A: 1, B: 1, C: 0 }),
    capturedLeanModule: "Obsmetrologia.Relational.Reaction.Reachability" as const,
  });
}
