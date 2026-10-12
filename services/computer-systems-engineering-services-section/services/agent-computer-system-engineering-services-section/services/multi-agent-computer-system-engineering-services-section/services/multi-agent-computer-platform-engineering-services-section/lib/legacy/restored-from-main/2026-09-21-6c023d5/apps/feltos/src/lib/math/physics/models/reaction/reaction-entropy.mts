/**
 * models/reaction/reaction-entropy - reaction states through Boltzmann H.
 *
 * This captures `Obsmetrologia.Relational.Reaction.Entropy`: occupation
 * multisets, entropy H, permutation invariance, relaxation transport, and the
 * concrete A-to-B isomerization H-theorem witness.
 */

import {
  configH,
  configHPerm,
  equilibratingExchange,
  htheorem,
  htheoremEvolution,
  type ExchangeWitness,
  type HTheoremEvolutionWitness,
  type HTheoremWitness,
} from "../kinetic-theory/boltzmann-entropy.mts";
import { totalCount } from "./free-energy-descent.mts";
import { type CountVector, type Reaction, reaction } from "./mass-action-rate.mts";
import { enabled, fire } from "./support-projection.mts";

export interface OccupationSumWitness<Species extends string> {
  readonly kind: "relational.reaction.entropy.occupation_sum:witness";
  readonly species: readonly Species[];
  readonly state: CountVector<Species>;
  readonly occupation: readonly number[];
  readonly occupationSum: number;
  readonly total: number;
  readonly equal: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.occupation_sum";
}

export interface EntropyHPermWitness<Species extends string> {
  readonly kind: "relational.reaction.entropy.entropyH_perm:witness";
  readonly leftSpecies: readonly Species[];
  readonly rightSpecies: readonly Species[];
  readonly state: CountVector<Species>;
  readonly h: number;
  readonly permutationInvariant: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.entropyH_perm";
}

export interface EntropyHLeOfRelaxesWitness<Species extends string> {
  readonly kind: "relational.reaction.entropy.entropyH_le_of_relaxes:witness";
  readonly species: readonly Species[];
  readonly before: CountVector<Species>;
  readonly after: CountVector<Species>;
  readonly relaxation: HTheoremEvolutionWitness;
  readonly nonIncreasing: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.entropyH_le_of_relaxes";
}

export interface IsoEntropyWitness {
  readonly kind: "relational.reaction.entropy.iso_entropy_le:witness";
  readonly reaction: Reaction<"A" | "B">;
  readonly before: CountVector<"A" | "B">;
  readonly after: CountVector<"A" | "B">;
  readonly exchange: ExchangeWitness;
  readonly hTheorem: HTheoremWitness;
  readonly nonIncreasing: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Reaction.iso_entropy_le";
}

export interface ReactionEntropyReceipt {
  readonly kind: "relational.reaction.entropy.receipt:witness";
  readonly occupationSum: OccupationSumWitness<"A" | "B">;
  readonly entropyPerm: EntropyHPermWitness<"A" | "B">;
  readonly relaxes: EntropyHLeOfRelaxesWitness<"A" | "B">;
  readonly isoEntropy: IsoEntropyWitness;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Reaction.Entropy";
}

export function occupation<Species extends string>(
  species: readonly Species[],
  state: CountVector<Species>,
): readonly number[] {
  return Object.freeze(species.map((item) => state[item]));
}

export function occupationSum<Species extends string>(
  species: readonly Species[],
  state: CountVector<Species>,
): OccupationSumWitness<Species> {
  const occ = occupation(species, state);
  const occupationTotal = occ.reduce((total, count) => total + count, 0);
  const total = totalCount(species, state);
  if (occupationTotal !== total) throw new TypeError("occupationSum: occupation sum does not match total");
  return Object.freeze({
    kind: "relational.reaction.entropy.occupation_sum:witness" as const,
    species,
    state,
    occupation: occ,
    occupationSum: occupationTotal,
    total,
    equal: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.occupation_sum" as const,
  });
}

export function entropyH<Species extends string>(species: readonly Species[], state: CountVector<Species>): number {
  return configH(occupation(species, state));
}

export function entropyHPerm<Species extends string>(
  leftSpecies: readonly Species[],
  rightSpecies: readonly Species[],
  state: CountVector<Species>,
): EntropyHPermWitness<Species> {
  const perm = configHPerm(occupation(leftSpecies, state), occupation(rightSpecies, state));
  return Object.freeze({
    kind: "relational.reaction.entropy.entropyH_perm:witness" as const,
    leftSpecies,
    rightSpecies,
    state,
    h: perm.h,
    permutationInvariant: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.entropyH_perm" as const,
  });
}

export function entropyHLeOfRelaxes<Species extends string>(
  species: readonly Species[],
  before: CountVector<Species>,
  after: CountVector<Species>,
  exchanges: readonly ExchangeWitness[],
): EntropyHLeOfRelaxesWitness<Species> {
  const relaxation = htheoremEvolution(occupation(species, before), exchanges);
  const afterH = entropyH(species, after);
  if (Math.abs(afterH - relaxation.finalH) > 1e-10 || relaxation.finalH > relaxation.initialH + 1e-10) {
    throw new TypeError("entropyHLeOfRelaxes: relaxation did not land on after state or increased H");
  }
  return Object.freeze({
    kind: "relational.reaction.entropy.entropyH_le_of_relaxes:witness" as const,
    species,
    before,
    after,
    relaxation,
    nonIncreasing: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.entropyH_le_of_relaxes" as const,
  });
}

export function isoState(a: number, b: number): CountVector<"A" | "B"> {
  return Object.freeze({ A: a + 1, B: b });
}

export function isoRxn(): Reaction<"A" | "B"> {
  return reaction(["A", "B"], { A: 1, B: 0 }, { A: 0, B: 1 });
}

export function isoEnabled(a: number, b: number): boolean {
  return enabled(isoRxn(), isoState(a, b));
}

export function isoOccupationExchange(a: number, b: number): ExchangeWitness {
  return equilibratingExchange(a, b);
}

export function isoEntropyLe(a: number, b: number): IsoEntropyWitness {
  const before = isoState(a, b);
  const r = isoRxn();
  const after = fire(r, before);
  const exchange = isoOccupationExchange(a, b);
  const theorem = htheorem(exchange);
  if (entropyH(["A", "B"], after) > entropyH(["A", "B"], before) + 1e-10) {
    throw new TypeError("isoEntropyLe: isomerization increased H");
  }
  return Object.freeze({
    kind: "relational.reaction.entropy.iso_entropy_le:witness" as const,
    reaction: r,
    before,
    after,
    exchange,
    hTheorem: theorem,
    nonIncreasing: true as const,
    leanTheorem: "Obsmetrologia.Relational.Reaction.iso_entropy_le" as const,
  });
}

export function reactionEntropyReceipt(): ReactionEntropyReceipt {
  const before = isoState(3, 1);
  const after = fire(isoRxn(), before);
  const exchange = isoOccupationExchange(3, 1);
  return Object.freeze({
    kind: "relational.reaction.entropy.receipt:witness" as const,
    occupationSum: occupationSum(["A", "B"], before),
    entropyPerm: entropyHPerm(["A", "B"], ["B", "A"], before),
    relaxes: entropyHLeOfRelaxes(["A", "B"], before, after, [exchange]),
    isoEntropy: isoEntropyLe(3, 1),
    capturedLeanModule: "Obsmetrologia.Relational.Reaction.Entropy" as const,
  });
}
