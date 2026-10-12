/**
 * settling/analysis/collatz — finite Collatz arithmetic shadows.
 *
 * This module mirrors the computable parts of the green Collatz-side Lean
 * files: accelerated step/orbit/parity words, affine traces, first-passage
 * coefficient crossings, 2-adic shortcut factoring, reached-set quiescence,
 * residue arithmetic, and the Padovan/Fibonacci slow-growth comparison. It
 * deliberately does not claim the two red frontier holes
 * `parentBarrierGap_holds` or `everyNonterminalHasCrossing_holds`.
 */
import type { FromSchema } from "../../schema/contract.mts";

export type CollatzBranch = "E" | "O";

export const collatzAffineTraceSchema = {
  $id: "metroplat/closure/analysis/collatz/affine-trace",
  type: "object",
  required: ["kind", "A", "B", "C"],
  properties: {
    kind: { const: "collatz.affineTrace" },
    A: { type: "number" },
    B: { type: "number" },
    C: { type: "number" },
  },
  additionalProperties: false,
  title: "CollatzAffineTrace",
  description: "The affine trace (A, B, C) of an accelerated Collatz step word.",
} as const;

export type CollatzAffineTrace = FromSchema<typeof collatzAffineTraceSchema>;

const nat = (value: number, label: string): number => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${label} must be a non-negative safe integer`);
  return value;
};

const posNat = (value: number, label: string): number => {
  nat(value, label);
  if (value === 0) throw new RangeError(`${label} must be positive`);
  return value;
};

const pow = (base: number, exponent: number): number => {
  nat(exponent, "exponent");
  return base ** exponent;
};

/** The accelerated Collatz map: even `n/2`, odd `(3n+1)/2`. */
export function step(n: number): number {
  nat(n, "n");
  return n % 2 === 0 ? n / 2 : (3 * n + 1) / 2;
}

/** The branch selected by the accelerated map. */
export function branch(n: number): CollatzBranch {
  nat(n, "n");
  return n % 2 === 0 ? "E" : "O";
}

/** The iterate `T^k(n)`. */
export function orbit(seed: number, length: number): number {
  nat(seed, "seed");
  nat(length, "length");
  let value = seed;
  for (let index = 0; index < length; index += 1) value = step(value);
  return value;
}

/** The parity word of the first `length` accelerated steps. */
export function parityWord(seed: number, length: number): readonly CollatzBranch[] {
  nat(seed, "seed");
  nat(length, "length");
  const word: CollatzBranch[] = [];
  let value = seed;
  for (let index = 0; index < length; index += 1) {
    word.push(branch(value));
    value = step(value);
  }
  return Object.freeze(word);
}

/** Count the odd branches in a parity word. */
export function oddCount(word: readonly CollatzBranch[]): number {
  return word.filter((item) => item === "O").length;
}

export const identityTrace: CollatzAffineTrace = Object.freeze({ kind: "collatz.affineTrace" as const, A: 1, B: 1, C: 0 });
export const evenTrace: CollatzAffineTrace = Object.freeze({ kind: "collatz.affineTrace" as const, A: 1, B: 2, C: 0 });
export const oddTrace: CollatzAffineTrace = Object.freeze({ kind: "collatz.affineTrace" as const, A: 3, B: 2, C: 1 });

/** Compose affine traces: `g.comp f` realizes "`f` then `g`". */
export function composeTrace(g: CollatzAffineTrace, f: CollatzAffineTrace): CollatzAffineTrace {
  return Object.freeze({
    kind: "collatz.affineTrace" as const,
    A: g.A * f.A,
    B: g.B * f.B,
    C: g.A * f.C + f.B * g.C,
  });
}

/** Advance an affine trace by one parity letter. */
export function traceStep(trace: CollatzAffineTrace, letter: CollatzBranch): CollatzAffineTrace {
  return Object.freeze(letter === "E"
    ? { kind: "collatz.affineTrace" as const, A: trace.A, B: 2 * trace.B, C: trace.C }
    : { kind: "collatz.affineTrace" as const, A: 3 * trace.A, B: 2 * trace.B, C: 3 * trace.C + trace.B });
}

/** Accumulate the affine trace of a finite parity word. */
export function traceOfWord(word: readonly CollatzBranch[]): CollatzAffineTrace {
  return word.reduce((trace, letter) => traceStep(trace, letter), identityTrace);
}

export interface AffineTraceOrbitWitness {
  readonly kind: "collatz.affineTraceParityWord:witness";
  readonly seed: number;
  readonly length: number;
  readonly word: readonly CollatzBranch[];
  readonly trace: CollatzAffineTrace;
  readonly iterate: number;
  readonly lhs: number;
  readonly rhs: number;
  readonly holds: boolean;
  readonly coefficientContracting: boolean;
  readonly descends: boolean;
}

/** Lean `affine_trace_parityWord`: `B_w*T^k(n)=A_w*n+C_w`, as a finite witness. */
export function affineTraceParityWord(seed: number, length: number): AffineTraceOrbitWitness {
  const word = parityWord(seed, length);
  const trace = traceOfWord(word);
  const iterate = orbit(seed, length);
  const lhs = trace.B * iterate;
  const rhs = trace.A * seed + trace.C;
  return Object.freeze({
    kind: "collatz.affineTraceParityWord:witness" as const,
    seed,
    length,
    word,
    trace,
    iterate,
    lhs,
    rhs,
    holds: lhs === rhs,
    coefficientContracting: trace.A < trace.B,
    descends: iterate < seed,
  });
}

export interface FirstPassageWitness {
  readonly kind: "collatz.firstPassage:witness";
  readonly word: readonly CollatzBranch[];
  readonly trace: CollatzAffineTrace;
  readonly contracting: boolean;
  readonly properPrefixesNoncontracting: boolean;
  readonly last: CollatzBranch;
  readonly endsInE: boolean;
  readonly lowerPower: number;
  readonly middlePower: number;
  readonly upperPower: number;
}

export interface FirstPassageObstruction {
  readonly kind: "collatz.firstPassage-obstruction";
  readonly word: readonly CollatzBranch[];
  readonly trace: CollatzAffineTrace;
  readonly contracting: boolean;
  readonly properPrefixesNoncontracting: boolean;
  readonly reason: "empty" | "not-contracting" | "prefix-contracts";
}

export type FirstPassageJudgment = FirstPassageWitness | FirstPassageObstruction;

export function coefficientContracting(word: readonly CollatzBranch[]): boolean {
  const trace = traceOfWord(word);
  return trace.A < trace.B;
}

export function coefficientNoncontracting(word: readonly CollatzBranch[]): boolean {
  const trace = traceOfWord(word);
  return trace.B <= trace.A;
}

const properPrefixesNoncontracting = (word: readonly CollatzBranch[]): boolean =>
  word.every((_, index) => coefficientNoncontracting(word.slice(0, index)));

/** Lean `FirstPassageWord`: the first prefix where `A < B`. */
export function firstPassageWord(word: readonly CollatzBranch[]): FirstPassageJudgment {
  const frozen = Object.freeze([...word]);
  const trace = traceOfWord(frozen);
  const contracting = trace.A < trace.B;
  const prefixes = properPrefixesNoncontracting(frozen);
  if (frozen.length === 0) {
    return Object.freeze({ kind: "collatz.firstPassage-obstruction" as const, word: frozen, trace, contracting, properPrefixesNoncontracting: prefixes, reason: "empty" as const });
  }
  if (!contracting) {
    return Object.freeze({ kind: "collatz.firstPassage-obstruction" as const, word: frozen, trace, contracting, properPrefixesNoncontracting: prefixes, reason: "not-contracting" as const });
  }
  if (!prefixes) {
    return Object.freeze({ kind: "collatz.firstPassage-obstruction" as const, word: frozen, trace, contracting, properPrefixesNoncontracting: prefixes, reason: "prefix-contracts" as const });
  }
  return Object.freeze({
    kind: "collatz.firstPassage:witness" as const,
    word: frozen,
    trace,
    contracting,
    properPrefixesNoncontracting: prefixes,
    last: frozen[frozen.length - 1]!,
    endsInE: frozen[frozen.length - 1] === "E",
    lowerPower: pow(2, frozen.length - 1),
    middlePower: pow(3, oddCount(frozen)),
    upperPower: pow(2, frozen.length),
  });
}

export interface ParentBarrierWitness {
  readonly kind: "collatz.parentBarrier:witness";
  readonly word: readonly CollatzBranch[];
  readonly trace: CollatzAffineTrace;
  readonly noncontracting: boolean;
  readonly belowNextEvenCrossing: boolean;
  readonly properPrefixesNoncontracting: boolean;
  readonly appendEFirstPassage: boolean;
  readonly D: number;
  readonly M: number;
}

export interface ParentBarrierObstruction {
  readonly kind: "collatz.parentBarrier-obstruction";
  readonly word: readonly CollatzBranch[];
  readonly trace: CollatzAffineTrace;
  readonly noncontracting: boolean;
  readonly belowNextEvenCrossing: boolean;
  readonly properPrefixesNoncontracting: boolean;
  readonly reason: "contracting" | "beyond-next-even-crossing" | "prefix-contracts";
}

export type ParentBarrierJudgment = ParentBarrierWitness | ParentBarrierObstruction;

/** Lean `ParentBarrier`: `B ≤ A < 2B`, with every proper prefix noncontracting. */
export function parentBarrier(word: readonly CollatzBranch[]): ParentBarrierJudgment {
  const frozen = Object.freeze([...word]);
  const trace = traceOfWord(frozen);
  const noncontracting = trace.B <= trace.A;
  const belowNextEvenCrossing = trace.A < 2 * trace.B;
  const prefixes = properPrefixesNoncontracting(frozen);
  if (noncontracting && belowNextEvenCrossing && prefixes) {
    return Object.freeze({
      kind: "collatz.parentBarrier:witness" as const,
      word: frozen,
      trace,
      noncontracting,
      belowNextEvenCrossing,
      properPrefixesNoncontracting: prefixes,
      appendEFirstPassage: firstPassageWord([...frozen, "E"]).kind === "collatz.firstPassage:witness",
      D: 2 * trace.B - trace.A,
      M: 2 * trace.B,
    });
  }
  return Object.freeze({
    kind: "collatz.parentBarrier-obstruction" as const,
    word: frozen,
    trace,
    noncontracting,
    belowNextEvenCrossing,
    properPrefixesNoncontracting: prefixes,
    reason: !noncontracting ? "contracting" as const : !belowNextEvenCrossing ? "beyond-next-even-crossing" as const : "prefix-contracts" as const,
  });
}

export const twoAdicFactorWitnessSchema = {
  $id: "metroplat/closure/analysis/collatz/two-adic-factor-witness",
  type: "object",
  required: ["kind", "value", "exponent", "oddPart", "holds"],
  properties: {
    kind: { const: "collatz.twoAdicFactor:witness" },
    value: { type: "number" },
    exponent: { type: "number" },
    oddPart: { type: "number" },
    holds: { type: "boolean" },
  },
  additionalProperties: false,
  title: "TwoAdicFactorWitness",
  description: "A positive integer factored as 2^exponent * oddPart.",
} as const;

export type TwoAdicFactorWitness = FromSchema<typeof twoAdicFactorWitnessSchema>;

/** Factor a positive integer as `2^k * odd`. */
export function twoAdicFactor(value: number): TwoAdicFactorWitness {
  posNat(value, "value");
  let exponent = 0;
  let oddPart = value;
  while (oddPart % 2 === 0) {
    exponent += 1;
    oddPart /= 2;
  }
  return Object.freeze({
    kind: "collatz.twoAdicFactor:witness" as const,
    value,
    exponent,
    oddPart,
    holds: pow(2, exponent) * oddPart === value && oddPart % 2 === 1,
  });
}

export const shortcutOddPartWitnessSchema = {
  $id: "metroplat/closure/analysis/collatz/shortcut-odd-part-witness",
  type: "object",
  required: ["kind", "seed", "expanded", "value", "exponent", "oddPart", "holds", "nonemptyHalvingRun"],
  properties: {
    kind: { const: "collatz.shortcutOddPart:witness" },
    seed: { type: "number" },
    expanded: { type: "number" },
    value: { type: "number" },
    exponent: { type: "number" },
    oddPart: { type: "number" },
    holds: { type: "boolean" },
    nonemptyHalvingRun: { type: "boolean" },
  },
  additionalProperties: false,
  title: "ShortcutOddPartWitness",
  description: "For odd seed n, the factoring of 3n+1 = 2^exponent * oddPart.",
} as const;

export type ShortcutOddPartWitness = FromSchema<typeof shortcutOddPartWitnessSchema>;

/** For odd `n`, factor `3n+1 = 2^k*m` with `k ≥ 1` and odd `m`. */
export function shortcutOddPart(seed: number): ShortcutOddPartWitness {
  posNat(seed, "seed");
  if (seed % 2 !== 1) throw new RangeError("shortcutOddPart: seed must be odd");
  const expanded = 3 * seed + 1;
  const factor = twoAdicFactor(expanded);
  return Object.freeze({
    kind: "collatz.shortcutOddPart:witness" as const,
    seed,
    expanded,
    value: expanded,
    exponent: factor.exponent,
    oddPart: factor.oddPart,
    holds: factor.holds,
    nonemptyHalvingRun: factor.exponent >= 1,
  });
}

/** Distinct values reached before stage `length`. */
export function reachedSet(seed: number, length: number): readonly number[] {
  nat(seed, "seed");
  nat(length, "length");
  const reached = new Set<number>();
  for (let index = 0; index < length; index += 1) reached.add(orbit(seed, index));
  return Object.freeze([...reached].sort((left, right) => left - right));
}

export const reachedQuiescenceWitnessSchema = {
  $id: "metroplat/closure/analysis/collatz/reached-quiescence-witness",
  type: "object",
  required: ["kind", "seed", "stage", "reached", "nextReached", "quiesces", "revisitAt", "terminal"],
  properties: {
    kind: { const: "collatz.reachedQuiescence:witness" },
    seed: { type: "number" },
    stage: { type: "number" },
    reached: { type: "array", items: { type: "number" } },
    nextReached: { type: "array", items: { type: "number" } },
    quiesces: { type: "boolean" },
    revisitAt: { type: "number" },
    terminal: { type: "boolean" },
  },
  additionalProperties: false,
  title: "ReachedQuiescenceWitness",
  description: "Stage k+1 of the reached-set reaches nothing new.",
} as const;

export type ReachedQuiescenceWitness = FromSchema<typeof reachedQuiescenceWitnessSchema>;

export const reachedQuiescenceObstructionSchema = {
  $id: "metroplat/closure/analysis/collatz/reached-quiescence-obstruction",
  type: "object",
  required: ["kind", "seed", "stage", "reached", "nextReached", "quiesces"],
  properties: {
    kind: { const: "collatz.reachedQuiescence-obstruction" },
    seed: { type: "number" },
    stage: { type: "number" },
    reached: { type: "array", items: { type: "number" } },
    nextReached: { type: "array", items: { type: "number" } },
    quiesces: { type: "boolean" },
  },
  additionalProperties: false,
  title: "ReachedQuiescenceObstruction",
  description: "Stage k+1 of the reached-set has not yet quiesced.",
} as const;

export type ReachedQuiescenceObstruction = FromSchema<typeof reachedQuiescenceObstructionSchema>;

export type ReachedQuiescenceJudgment = ReachedQuiescenceWitness | ReachedQuiescenceObstruction;

/** Finite reached-set quiescence: stage `k+1` reaches nothing new. */
export function reachedQuiescence(seed: number, stage: number): ReachedQuiescenceJudgment {
  posNat(seed, "seed");
  nat(stage, "stage");
  const reached = reachedSet(seed, stage);
  const nextReached = reachedSet(seed, stage + 1);
  const quiesces = reached.length === nextReached.length && reached.every((value, index) => value === nextReached[index]);
  if (!quiesces) {
    return Object.freeze({ kind: "collatz.reachedQuiescence-obstruction" as const, seed, stage, reached, nextReached, quiesces });
  }
  const value = orbit(seed, stage);
  const revisitAt = reached.indexOf(value);
  return Object.freeze({
    kind: "collatz.reachedQuiescence:witness" as const,
    seed,
    stage,
    reached,
    nextReached,
    quiesces,
    revisitAt,
    terminal: value === 1 || value === 2,
  });
}

/** Membership in the two-generator semigroup `<a,b>`, searched finitely up to `x`. */
export function inTwoGenSemigroup(x: number, a: number, b: number): boolean {
  nat(x, "x"); posNat(a, "a"); posNat(b, "b");
  for (let m = 0; a * m <= x; m += 1) {
    const rest = x - a * m;
    if (rest % b === 0) return true;
  }
  return false;
}

const gcd = (left: number, right: number): number => {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
};

export const residueCharacterizationWitnessSchema = {
  $id: "metroplat/closure/analysis/collatz/residue-characterization-witness",
  type: "object",
  required: ["kind", "C", "D", "M", "residue", "semigroupMember", "residueInequality", "equivalent", "gap"],
  properties: {
    kind: { const: "collatz.residueCharacterization:witness" },
    C: { type: "number" },
    D: { type: "number" },
    M: { type: "number" },
    residue: { type: "number" },
    semigroupMember: { type: "boolean" },
    residueInequality: { type: "boolean" },
    equivalent: { type: "boolean" },
    gap: { type: "number" },
  },
  additionalProperties: false,
  title: "ResidueCharacterizationWitness",
  description: "Finite residue characterization: C is in <D,M> iff D*r <= C for coprime D,M.",
} as const;

export type ResidueCharacterizationWitness = FromSchema<typeof residueCharacterizationWitnessSchema>;

/** Finite residue characterization: `C ∈ <D,M>` iff `D*r ≤ C` for coprime `D,M`. */
export function residueCharacterization(C: number, D: number, M: number): ResidueCharacterizationWitness {
  nat(C, "C"); posNat(D, "D"); posNat(M, "M");
  if (gcd(D, M) !== 1) throw new RangeError("residueCharacterization: D and M must be coprime");
  let residue = 0;
  while ((D * residue) % M !== C % M) residue += 1;
  const semigroupMember = inTwoGenSemigroup(C, D, M);
  const residueInequality = D * residue <= C;
  return Object.freeze({
    kind: "collatz.residueCharacterization:witness" as const,
    C,
    D,
    M,
    residue,
    semigroupMember,
    residueInequality,
    equivalent: semigroupMember === residueInequality,
    gap: D * residue - C,
  });
}

/** Padovan/Perrin sequence `1,1,1,2,2,3,...`. */
export function padovan(index: number): number {
  nat(index, "index");
  const values = [1, 1, 1];
  for (let current = 3; current <= index; current += 1) values[current] = values[current - 2]! + values[current - 3]!;
  return values[index]!;
}

/** Fibonacci sequence in the Lean convention `1,1,2,3,5,...`. */
export function fibSeq(index: number): number {
  nat(index, "index");
  const values = [1, 1];
  for (let current = 2; current <= index; current += 1) values[current] = values[current - 1]! + values[current - 2]!;
  return values[index]!;
}

export const padovanLeFibWitnessSchema = {
  $id: "metroplat/closure/analysis/collatz/padovan-le-fib-witness",
  type: "object",
  required: ["kind", "index", "padovan", "fibSeq", "holds"],
  properties: {
    kind: { const: "collatz.padovanLeFibSeq:witness" },
    index: { type: "number" },
    padovan: { type: "number" },
    fibSeq: { type: "number" },
    holds: { type: "boolean" },
  },
  additionalProperties: false,
  title: "PadovanLeFibWitness",
  description: "The Padovan/Perrin value at index is at most the Fibonacci value at index.",
} as const;

export type PadovanLeFibWitness = FromSchema<typeof padovanLeFibWitnessSchema>;

export interface SemigroupGapReceipt {
  readonly kind: "collatz.semigroupGap.receipt:witness";
  readonly provenTheorems: readonly [
    "nonDescent_iff_semigroup_certificate",
    "parentBarrierGap_implies_firstPassageDescent",
  ];
  readonly frontierTheorem: "parentBarrierGap_holds";
  readonly parent: ParentBarrierWitness;
  readonly residue: ResidueCharacterizationWitness;
  readonly conditionalDescent: true;
  readonly gapStatus: "frontier-sorry-in-Lean";
}

export const collatzContractingPrefixQuestionSchema = {
  $id: "metroplat/closure/analysis/collatz/contracting-prefix-question",
  type: "object",
  required: ["kind", "seed"],
  properties: {
    kind: { const: "collatz.contractingPrefixQuestion" },
    seed: { type: "number" },
  },
  additionalProperties: false,
  title: "CollatzContractingPrefixQuestion",
  description: "The question: does seed have a contracting parity-word prefix.",
} as const;

export type CollatzContractingPrefixQuestion = FromSchema<typeof collatzContractingPrefixQuestionSchema>;

export const collatzBoundedContractingPrefixQuestionSchema = {
  $id: "metroplat/closure/analysis/collatz/bounded-contracting-prefix-question",
  type: "object",
  required: ["kind", "seed", "bound"],
  properties: {
    kind: { const: "collatz.boundedContractingPrefixQuestion" },
    seed: { type: "number" },
    bound: { type: "number" },
  },
  additionalProperties: false,
  title: "CollatzBoundedContractingPrefixQuestion",
  description: "The question: does seed have a contracting parity-word prefix within bound.",
} as const;

export type CollatzBoundedContractingPrefixQuestion = FromSchema<typeof collatzBoundedContractingPrefixQuestionSchema>;

export interface CollatzContractingPrefixCore {
  readonly kind: "collatz.contractingPrefixCore:witness";
  readonly seed: number;
  readonly prefixLength: number;
  readonly word: readonly CollatzBranch[];
  readonly contracting: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_witness";
}

export interface CollatzBoundedContractingPrefixCore {
  readonly kind: "collatz.boundedContractingPrefixCore:witness";
  readonly seed: number;
  readonly bound: number;
  readonly prefixLength: number;
  readonly word: readonly CollatzBranch[];
  readonly withinBound: true;
  readonly contracting: true;
  readonly leanTheorem: "Obsmetrologia.Relational.Material.collatzBoundedContractingPrefixCore_witness";
}

export const collatzBoundedContractingPrefixObstructionSchema = {
  $id: "metroplat/closure/analysis/collatz/bounded-contracting-prefix-obstruction",
  type: "object",
  required: ["kind", "seed", "bound", "searchedLengths", "reason"],
  properties: {
    kind: { const: "collatz.boundedContractingPrefixCore-obstruction" },
    seed: { type: "number" },
    bound: { type: "number" },
    searchedLengths: { type: "array", items: { type: "number" } },
    reason: { const: "not-found-within-bound" },
  },
  additionalProperties: false,
  title: "CollatzBoundedContractingPrefixObstruction",
  description: "No contracting prefix was found for seed within the searched length bound.",
} as const;

export type CollatzBoundedContractingPrefixObstruction = FromSchema<typeof collatzBoundedContractingPrefixObstructionSchema>;

export type CollatzBoundedContractingPrefixJudgment =
  | CollatzBoundedContractingPrefixCore
  | CollatzBoundedContractingPrefixObstruction;

export interface CollatzBarrierDecidableCoreReceipt {
  readonly kind: "collatz.barrierDecidableCore.receipt:witness";
  readonly capturedLeanModule: "Obsmetrologia.Relational.Material.Contact.CollatzBarrierDecidableCore";
  readonly question: CollatzContractingPrefixQuestion;
  readonly boundedQuestion: CollatzBoundedContractingPrefixQuestion;
  readonly boundedCore: CollatzBoundedContractingPrefixCore;
  readonly core: CollatzContractingPrefixCore;
  readonly finiteSearchDecidable: true;
  readonly sampleNoPositiveInfiniteBarrierStream: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Material.collatzContractingPrefixQuestion_assertion_iff",
    "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_witness",
    "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_of_everyNonterminalContracts",
    "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_of_no_collatzBarrierKeratinFormation_and_decidable_assertion",
    "Obsmetrologia.Relational.Material.noPositiveInfiniteBarrierStream_of_no_collatzBarrierKeratinFormation_and_decidable_assertions",
    "Obsmetrologia.Relational.Material.collatzBoundedContractingPrefixQuestion_decidable",
    "Obsmetrologia.Relational.Material.boundedCollatzContractingPrefixCore_of_no_collatzBarrierKeratinFormation_and_bound",
    "Obsmetrologia.Relational.Material.collatzBoundedContractingPrefixCore_witness",
    "Obsmetrologia.Relational.Material.noPositiveInfiniteBarrierStream_of_no_collatzBarrierKeratinFormation_and_contractingPrefixBound",
    "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_of_antimatterBarrierBoundary_and_cylinderLift",
    "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_of_fullSharedKappaCarrier",
  ];
}

export interface CollatzBarrierPrefixLimitWitness {
  readonly kind: "collatz.barrierPrefixLimit:witness";
  readonly stage: number;
  readonly event: number;
  readonly presentAfterStage: true;
  readonly presentInLimit: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Material.runLockPrefix_collatzBarrierPrefixSeed",
    "Obsmetrologia.Relational.Material.collatzBarrierPrefix_mem_limit",
  ];
}

export interface CollatzBarrierKeratinFormationCandidate {
  readonly kind: "collatz.barrierKeratinFormation:bounded-candidate";
  readonly seed: number;
  readonly checkedThrough: number;
  readonly positiveSeed: boolean;
  readonly checkedPrefixes: readonly {
    readonly prefixLength: number;
    readonly word: readonly CollatzBranch[];
    readonly noncontracting: boolean;
  }[];
  readonly allCheckedPrefixesNoncontracting: boolean;
  readonly actualFormationStatus: "not-claimed";
}

export interface CollatzBarrierKeratinReceipt {
  readonly kind: "collatz.barrierKeratin.receipt:witness";
  readonly capturedLeanModule: "Obsmetrologia.Relational.Material.Contact.CollatzBarrierKeratin";
  readonly prefixLimit: CollatzBarrierPrefixLimitWitness;
  readonly boundedCandidate: CollatzBarrierKeratinFormationCandidate;
  readonly refutingCore: CollatzBoundedContractingPrefixCore;
  readonly formationRefutedByContractingPrefix: true;
  readonly actualFormationStatus: "not-claimed";
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Material.runLockPrefix_collatzBarrierPrefixSeed",
    "Obsmetrologia.Relational.Material.collatzBarrierPrefix_mem_limit",
    "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_iff_positive_infiniteBarrierStream",
    "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_iff_cylinderAvoidingBarrierStream",
    "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_excludes_noPositiveInfiniteBarrierStream",
    "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_of_no_contracting_prefix",
    "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_iff_positive_no_contracting_prefix",
    "Obsmetrologia.Relational.Material.noPositiveInfiniteBarrierStream_excludes_collatzBarrierKeratinFormation",
    "Obsmetrologia.Relational.Material.parentBarrierGap_and_oneLock_excludes_collatzBarrierKeratinFormation",
    "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_refutes_parentBarrierOneLockCollapse",
    "Obsmetrologia.Relational.Material.no_collatzBarrierKeratinFormation_implies_not_not_contracting_prefix",
    "Obsmetrologia.Relational.Material.no_collatzBarrierKeratinFormation_iff_pointwise_not_not_contracting_prefix",
  ];
}

/** Lean `padovan_le_fibSeq`: the plastic integer shadow is bounded by Fibonacci. */
export function padovanLeFibSeq(index: number): PadovanLeFibWitness {
  return Object.freeze({
    kind: "collatz.padovanLeFibSeq:witness" as const,
    index,
    padovan: padovan(index),
    fibSeq: fibSeq(index),
    holds: padovan(index) <= fibSeq(index),
  });
}

export function semigroupGapReceipt(word: readonly CollatzBranch[] = ["O"]): SemigroupGapReceipt {
  const parent = parentBarrier(word);
  if (parent.kind !== "collatz.parentBarrier:witness") {
    throw new TypeError("semigroupGapReceipt: expected a parent-barrier word");
  }
  const residue = residueCharacterization(parent.trace.C, parent.D, parent.M);
  return Object.freeze({
    kind: "collatz.semigroupGap.receipt:witness" as const,
    provenTheorems: Object.freeze([
      "nonDescent_iff_semigroup_certificate",
      "parentBarrierGap_implies_firstPassageDescent",
    ] as const),
    frontierTheorem: "parentBarrierGap_holds" as const,
    parent,
    residue,
    conditionalDescent: true as const,
    gapStatus: "frontier-sorry-in-Lean" as const,
  });
}

export function collatzContractingPrefixQuestion(seed: number): CollatzContractingPrefixQuestion {
  nat(seed, "seed");
  return Object.freeze({ kind: "collatz.contractingPrefixQuestion" as const, seed });
}

export function collatzBoundedContractingPrefixQuestion(seed: number, bound: number): CollatzBoundedContractingPrefixQuestion {
  nat(seed, "seed");
  nat(bound, "bound");
  return Object.freeze({ kind: "collatz.boundedContractingPrefixQuestion" as const, seed, bound });
}

export function collatzBoundedContractingPrefixCore(seed: number, bound: number): CollatzBoundedContractingPrefixJudgment {
  const boundedQuestion = collatzBoundedContractingPrefixQuestion(seed, bound);
  const searchedLengths: number[] = [];
  for (let prefixLength = 0; prefixLength < boundedQuestion.bound; prefixLength += 1) {
    searchedLengths.push(prefixLength);
    const word = parityWord(boundedQuestion.seed, prefixLength);
    if (coefficientContracting(word)) {
      return Object.freeze({
        kind: "collatz.boundedContractingPrefixCore:witness" as const,
        seed: boundedQuestion.seed,
        bound: boundedQuestion.bound,
        prefixLength,
        word,
        withinBound: true as const,
        contracting: true as const,
        leanTheorem: "Obsmetrologia.Relational.Material.collatzBoundedContractingPrefixCore_witness" as const,
      });
    }
  }
  return Object.freeze({
    kind: "collatz.boundedContractingPrefixCore-obstruction" as const,
    seed: boundedQuestion.seed,
    bound: boundedQuestion.bound,
    searchedLengths: Object.freeze(searchedLengths),
    reason: "not-found-within-bound" as const,
  });
}

export function collatzContractingPrefixCoreFromBounded(
  boundedCore: CollatzBoundedContractingPrefixCore,
): CollatzContractingPrefixCore {
  return Object.freeze({
    kind: "collatz.contractingPrefixCore:witness" as const,
    seed: boundedCore.seed,
    prefixLength: boundedCore.prefixLength,
    word: boundedCore.word,
    contracting: true as const,
    leanTheorem: "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_witness" as const,
  });
}

export function noPositiveInfiniteBarrierStreamForFiniteSample(
  seeds: readonly number[],
  bound: number | ((seed: number) => number),
): boolean {
  return seeds.every((seed) => {
    nat(seed, "seed");
    if (seed <= 2) return true;
    const seedBound = typeof bound === "function" ? bound(seed) : bound;
    return collatzBoundedContractingPrefixCore(seed, seedBound).kind === "collatz.boundedContractingPrefixCore:witness";
  });
}

export function collatzBarrierDecidableCoreReceipt(seed = 7, bound = 8): CollatzBarrierDecidableCoreReceipt {
  const question = collatzContractingPrefixQuestion(seed);
  const boundedQuestion = collatzBoundedContractingPrefixQuestion(seed, bound);
  const boundedCore = collatzBoundedContractingPrefixCore(seed, bound);
  if (boundedCore.kind !== "collatz.boundedContractingPrefixCore:witness") {
    throw new TypeError("collatzBarrierDecidableCoreReceipt: expected a bounded contracting-prefix core");
  }
  const core = collatzContractingPrefixCoreFromBounded(boundedCore);
  const sampleNoPositiveInfiniteBarrierStream = noPositiveInfiniteBarrierStreamForFiniteSample([3, 5, 7, 11], bound);
  if (!sampleNoPositiveInfiniteBarrierStream) {
    throw new TypeError("collatzBarrierDecidableCoreReceipt: finite sample did not contract within the supplied bound");
  }
  return Object.freeze({
    kind: "collatz.barrierDecidableCore.receipt:witness" as const,
    capturedLeanModule: "Obsmetrologia.Relational.Material.Contact.CollatzBarrierDecidableCore" as const,
    question,
    boundedQuestion,
    boundedCore,
    core,
    finiteSearchDecidable: true as const,
    sampleNoPositiveInfiniteBarrierStream: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Material.collatzContractingPrefixQuestion_assertion_iff",
      "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_witness",
      "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_of_everyNonterminalContracts",
      "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_of_no_collatzBarrierKeratinFormation_and_decidable_assertion",
      "Obsmetrologia.Relational.Material.noPositiveInfiniteBarrierStream_of_no_collatzBarrierKeratinFormation_and_decidable_assertions",
      "Obsmetrologia.Relational.Material.collatzBoundedContractingPrefixQuestion_decidable",
      "Obsmetrologia.Relational.Material.boundedCollatzContractingPrefixCore_of_no_collatzBarrierKeratinFormation_and_bound",
      "Obsmetrologia.Relational.Material.collatzBoundedContractingPrefixCore_witness",
      "Obsmetrologia.Relational.Material.noPositiveInfiniteBarrierStream_of_no_collatzBarrierKeratinFormation_and_contractingPrefixBound",
      "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_of_antimatterBarrierBoundary_and_cylinderLift",
      "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_of_fullSharedKappaCarrier",
    ] as const),
  });
}

export function runLockPrefixCollatzBarrierPrefixSeed(stage: number, event: number): boolean {
  nat(stage, "stage");
  nat(event, "event");
  return event < stage;
}

export function collatzBarrierPrefixLimit(stage: number, event = stage): CollatzBarrierPrefixLimitWitness {
  nat(stage, "stage");
  nat(event, "event");
  const witnessStage = Math.max(stage, event + 1);
  if (!runLockPrefixCollatzBarrierPrefixSeed(witnessStage, event)) {
    throw new TypeError("collatzBarrierPrefixLimit: event was not admitted by a finite prefix");
  }
  return Object.freeze({
    kind: "collatz.barrierPrefixLimit:witness" as const,
    stage: witnessStage,
    event,
    presentAfterStage: true as const,
    presentInLimit: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Material.runLockPrefix_collatzBarrierPrefixSeed",
      "Obsmetrologia.Relational.Material.collatzBarrierPrefix_mem_limit",
    ] as const),
  });
}

export function collatzBarrierKeratinFormationCandidate(
  seed: number,
  checkedThrough: number,
): CollatzBarrierKeratinFormationCandidate {
  nat(seed, "seed");
  nat(checkedThrough, "checkedThrough");
  const checkedPrefixes = Object.freeze(Array.from({ length: checkedThrough }, (_, prefixLength) => {
    const word = parityWord(seed, prefixLength);
    return Object.freeze({
      prefixLength,
      word,
      noncontracting: coefficientNoncontracting(word),
    });
  }));
  return Object.freeze({
    kind: "collatz.barrierKeratinFormation:bounded-candidate" as const,
    seed,
    checkedThrough,
    positiveSeed: 2 < seed,
    checkedPrefixes,
    allCheckedPrefixesNoncontracting: checkedPrefixes.every((prefix) => prefix.noncontracting),
    actualFormationStatus: "not-claimed" as const,
  });
}

export function collatzBarrierKeratinReceipt(seed = 7): CollatzBarrierKeratinReceipt {
  const prefixLimit = collatzBarrierPrefixLimit(4, 3);
  const boundedCandidate = collatzBarrierKeratinFormationCandidate(seed, 4);
  if (!boundedCandidate.positiveSeed || !boundedCandidate.allCheckedPrefixesNoncontracting) {
    throw new TypeError("collatzBarrierKeratinReceipt: expected a positive bounded noncontracting prefix candidate");
  }
  const refutingCore = collatzBoundedContractingPrefixCore(seed, 8);
  if (refutingCore.kind !== "collatz.boundedContractingPrefixCore:witness") {
    throw new TypeError("collatzBarrierKeratinReceipt: expected a later contracting prefix");
  }
  return Object.freeze({
    kind: "collatz.barrierKeratin.receipt:witness" as const,
    capturedLeanModule: "Obsmetrologia.Relational.Material.Contact.CollatzBarrierKeratin" as const,
    prefixLimit,
    boundedCandidate,
    refutingCore,
    formationRefutedByContractingPrefix: true as const,
    actualFormationStatus: "not-claimed" as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Material.runLockPrefix_collatzBarrierPrefixSeed",
      "Obsmetrologia.Relational.Material.collatzBarrierPrefix_mem_limit",
      "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_iff_positive_infiniteBarrierStream",
      "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_iff_cylinderAvoidingBarrierStream",
      "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_excludes_noPositiveInfiniteBarrierStream",
      "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_of_no_contracting_prefix",
      "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_iff_positive_no_contracting_prefix",
      "Obsmetrologia.Relational.Material.noPositiveInfiniteBarrierStream_excludes_collatzBarrierKeratinFormation",
      "Obsmetrologia.Relational.Material.parentBarrierGap_and_oneLock_excludes_collatzBarrierKeratinFormation",
      "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_refutes_parentBarrierOneLockCollapse",
      "Obsmetrologia.Relational.Material.no_collatzBarrierKeratinFormation_implies_not_not_contracting_prefix",
      "Obsmetrologia.Relational.Material.no_collatzBarrierKeratinFormation_iff_pointwise_not_not_contracting_prefix",
    ] as const),
  });
}
