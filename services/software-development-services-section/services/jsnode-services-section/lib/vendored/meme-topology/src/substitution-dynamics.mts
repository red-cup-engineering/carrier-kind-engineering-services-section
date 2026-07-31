import type { Lattice } from "./ordinal-closure.mjs";
import { gauge, sameChargeValue, type ChargeValue, type GaugeElementName } from "@emsenn/meme-algebra";
import { markCoincidenceHolds } from "@emsenn/meme-algebra";
import {
  charPoly as matrixCharPoly,
  determinant,
  fromNatural,
  intAdd,
  intEqual,
  intIsZero,
  intMultiply,
  intOne,
  intZero,
  intSubtract,
  isNegative,
  isPositive,
  magnitude,
  fromCount,
  matTranspose,
  matEqual,
  matmul,
  natEqual,
  natZero,
  quotient,
  rational,
  rank,
  smithNormalForm,
  toCount,
  type Integer,
  type Matrix,
  type Natural,
  type Rational,
} from "@emsenn/meme-algebra";
import type { Mark } from "@emsenn/meme-algebra";

export interface SubstitutionSymbol {
  readonly kind: "substitution.dynamics.symbol";
  readonly mark: Mark;
}

export type SubstitutionWord = readonly SubstitutionSymbol[];

export interface SubstitutionRuleEntry {
  readonly kind: "substitution.dynamics.ruleEntry";
  readonly symbol: SubstitutionSymbol;
  readonly word: SubstitutionWord;
}

export interface SubstitutionRule {
  readonly kind: "substitution.dynamics.rule";
  readonly entries: readonly SubstitutionRuleEntry[];
}

export type SubstitutionIncidenceMatrix = Matrix;

export type InfiniteWord = { readonly kind: "substitution.dynamics.fixedPoint" } | SubstitutionWord;

export interface SubstitutionCarrier {
  readonly kind: "substitution.dynamics.carrier";
  readonly rule: SubstitutionRule;
  readonly alphabet: readonly SubstitutionSymbol[];
}

export interface SubstitutionClosureCarrier {
  readonly kind: "substitution.dynamics.closure";
  readonly lattice: Lattice<InfiniteWord>;
  readonly phi: (word: InfiniteWord) => InfiniteWord;
}

export interface MatrixEquationWitness {
  readonly kind: "substitution.dynamics.matrixEquation:witness";
  readonly left: Matrix;
  readonly right: Matrix;
}

export interface MatrixEquationObstruction {
  readonly kind: "substitution.dynamics.matrixEquation-obstruction";
  readonly left: Matrix;
  readonly right: Matrix;
}

export type MatrixEquationJudgment = MatrixEquationWitness | MatrixEquationObstruction;

export interface GaugeLabelingCarrier {
  readonly kind: "substitution.dynamics.gaugeLabeling";
  readonly values: readonly ChargeValue[];
  readonly rank: Natural;
}

export interface GaugeImageCarrier {
  readonly kind: "substitution.dynamics.gaugeImage";
  readonly labeling: GaugeLabelingCarrier;
  readonly sigma: GaugeElementName;
  readonly values: readonly ChargeValue[];
  readonly rank: Natural;
}

export interface GaugePermutationMissingValue {
  readonly kind: "substitution.dynamics.gaugePermutationMissingValue";
  readonly value: ChargeValue;
  readonly image: GaugeImageCarrier;
}

export interface GaugePermutationEscapingValue {
  readonly kind: "substitution.dynamics.gaugePermutationEscapingValue";
  readonly value: ChargeValue;
  readonly image: GaugeImageCarrier;
}

export interface GaugePermutationWitness {
  readonly kind: "substitution.dynamics.gaugePermutation:witness";
  readonly labeling: GaugeLabelingCarrier;
  readonly image: GaugeImageCarrier;
  readonly matrix: SubstitutionIncidenceMatrix;
}

export interface GaugePermutationObstruction {
  readonly kind: "substitution.dynamics.gaugePermutation-obstruction";
  readonly labeling: GaugeLabelingCarrier;
  readonly image: GaugeImageCarrier;
  readonly missing: readonly GaugePermutationMissingValue[];
  readonly escaping: readonly GaugePermutationEscapingValue[];
  readonly rank: Natural;
}

export type GaugePermutationJudgment = GaugePermutationWitness | GaugePermutationObstruction;

export interface SubstitutionSelfDualityWitness {
  readonly kind: "substitution.dynamics.selfDuality:witness";
  readonly permutation: GaugePermutationWitness;
  readonly commutation: MatrixEquationJudgment;
  readonly gaugeInvolution: MatrixEquationJudgment;
}

export interface SubstitutionSelfDualityObstruction {
  readonly kind: "substitution.dynamics.selfDuality-obstruction";
  readonly permutation: GaugePermutationObstruction;
}

export type SubstitutionSelfDualityJudgment = SubstitutionSelfDualityWitness | SubstitutionSelfDualityObstruction;

export interface ColimStructure {
  readonly kind: "substitution.dynamics.colim";
  readonly rank: Natural;
  readonly det: Integer;
  readonly smith: readonly Integer[];
  readonly stableDet: Integer;
  readonly module: LocalizedIntegerModule;
}

export interface LocalizedIntegerModule {
  readonly kind: "substitution.dynamics.localizedIntegerModule";
  readonly rank: Natural;
  readonly invertedPrimes: readonly Integer[];
}

export interface ColimitDualityWitness {
  readonly kind: "substitution.dynamics.colimDuality:witness";
  readonly sheaf: ColimStructure;
  readonly cosheaf: ColimStructure;
}

export interface ColimitDualityObstruction {
  readonly kind: "substitution.dynamics.colimDuality-obstruction";
  readonly sheaf: ColimStructure;
  readonly cosheaf: ColimStructure;
}

export type ColimitDualityJudgment = ColimitDualityWitness | ColimitDualityObstruction;

export interface SubstitutionDual {
  readonly kind: "substitution.dynamics.dual";
  readonly sheaf: ColimStructure;
  readonly cosheaf: ColimStructure;
  readonly duality: ColimitDualityJudgment;
}


export interface PrimitiveMatrixWitness {
  readonly kind: "substitution.dynamics.primitiveMatrix:witness";
  readonly matrix: Matrix;
  readonly exponent: Natural;
}

export type PrimitiveMatrixObstructionReason = "negative-entry" | "positive-power-not-found";

export interface PrimitiveMatrixObstruction {
  readonly kind: "substitution.dynamics.primitiveMatrix-obstruction";
  readonly matrix: Matrix;
  readonly reason: PrimitiveMatrixObstructionReason;
  readonly searchedThrough: Natural;
}

export type PrimitiveMatrixJudgment = PrimitiveMatrixWitness | PrimitiveMatrixObstruction;

export interface StepNInvariant {
  readonly kind: "substitution.dynamics.stepNInvariant";
  readonly rank: Natural;
  readonly module: LocalizedIntegerModule;
}

const fixedPointWord = (): InfiniteWord => Object.freeze({ kind: "substitution.dynamics.fixedPoint" as const });

const isInfinite = (word: InfiniteWord): word is { readonly kind: "substitution.dynamics.fixedPoint" } =>
  !Array.isArray(word);

export const sameSubstitutionSymbol = (left: SubstitutionSymbol, right: SubstitutionSymbol): boolean =>
  markCoincidenceHolds(left.mark, right.mark);

const isPrefix = (left: SubstitutionWord, right: SubstitutionWord): boolean =>
  left.every((letter, index) => sameSubstitutionSymbol(letter, right[index]!));

const identityMatrix = (n: number): SubstitutionIncidenceMatrix =>
  Object.freeze(Array.from({ length: n }, (_, row) =>
    Object.freeze(Array.from({ length: n }, (_, column) => row === column ? intOne : intZero))));

const matrixEquation = (left: Matrix, right: Matrix): MatrixEquationJudgment => matEqual(left, right)
  ? Object.freeze({
    kind: "substitution.dynamics.matrixEquation:witness" as const,
    left,
    right,
  })
  : Object.freeze({
    kind: "substitution.dynamics.matrixEquation-obstruction" as const,
    left,
    right,
  });

const primeFactors = (value: Integer): readonly Integer[] => {
  const factors: Integer[] = [];
  let remaining = value;
  let prime = intAdd(intOne, intOne);
  while (!isNegative(intSubtract(remaining, intMultiply(prime, prime)))) {
    while (!intIsZero(remaining) && intIsZero(intSubtract(remaining, intMultiply(quotient(remaining, prime), prime)))) {
      if (!factors.some((item) => intEqual(item, prime))) factors.push(prime);
      remaining = quotient(remaining, prime);
    }
    prime = intAdd(prime, intOne);
  }
  if (!intEqual(remaining, intOne)) factors.push(remaining);
  return Object.freeze(factors);
};

export function substitutionSymbol(mark: Mark): SubstitutionSymbol {
  return Object.freeze({ kind: "substitution.dynamics.symbol" as const, mark });
}

export function substitutionRuleEntry(symbol: SubstitutionSymbol, word: SubstitutionWord): SubstitutionRuleEntry {
  return Object.freeze({
    kind: "substitution.dynamics.ruleEntry" as const,
    symbol,
    word: Object.freeze([...word]),
  });
}

export function substitutionRule(entries: readonly SubstitutionRuleEntry[]): SubstitutionRule {
  return Object.freeze({
    kind: "substitution.dynamics.rule" as const,
    entries: Object.freeze([...entries]),
  });
}

const ruleEntryFor = (rule: SubstitutionRule, symbol: SubstitutionSymbol): SubstitutionRuleEntry | undefined =>
  rule.entries.find((entry) => sameSubstitutionSymbol(entry.symbol, symbol));

export function substitutionCarrier(rule: SubstitutionRule, alphabet: readonly SubstitutionSymbol[] = rule.entries.map((entry) => entry.symbol)): SubstitutionCarrier {
  return Object.freeze({
    kind: "substitution.dynamics.carrier" as const,
    rule,
    alphabet: Object.freeze([...alphabet]),
  });
}

export const substitute = (rule: SubstitutionRule, word: SubstitutionWord): SubstitutionWord => {
  return Object.freeze(word.flatMap((letter) => ruleEntryFor(rule, letter)?.word ?? [letter]));
};

export function iterateSubstitution(rule: SubstitutionRule, word: SubstitutionWord, n: Natural): SubstitutionWord {
  let current: SubstitutionWord = word;
  for (let index = 0; index < toCount(n); index += 1) current = substitute(rule, current);
  return Object.freeze([...current]);
}

export function* substitutionOrbit(rule: SubstitutionRule, seed: SubstitutionWord): Generator<SubstitutionWord> {
  let word: SubstitutionWord = seed;
  for (;;) {
    yield Object.freeze([...word]);
    word = substitute(rule, word);
  }
}

export function fixedPointClosure(rule: SubstitutionRule, seed: SubstitutionWord): SubstitutionClosureCarrier {
  const eq = (left: InfiniteWord, right: InfiniteWord): boolean =>
    isInfinite(left) ? isInfinite(right) : !isInfinite(right) && left.length === right.length && isPrefix(left, right);
  const lattice: Lattice<InfiniteWord> = Object.freeze({
    bottom: Object.freeze([...seed]),
    eq,
    leq: (left: InfiniteWord, right: InfiniteWord) =>
      isInfinite(right) || (!isInfinite(left) && !isInfinite(right) && left.length <= right.length && isPrefix(left, right)),
    join: (left: InfiniteWord, right: InfiniteWord) => {
      if (isInfinite(left) || isInfinite(right)) return fixedPointWord();
      return left.length >= right.length ? left : right;
    },
    sup: (sequence: (n: Natural) => InfiniteWord) => {
      let previous = sequence(fromCount(0));
      for (let index = 1; index <= 32; index += 1) {
        const current = sequence(fromCount(index));
        if (eq(current, previous)) return current;
        if (!isInfinite(current) && !isInfinite(previous) && current.length > previous.length) return fixedPointWord();
        previous = current;
      }
      return fixedPointWord();
    },
  });
  return Object.freeze({
    kind: "substitution.dynamics.closure" as const,
    lattice,
    phi: (word: InfiniteWord) => isInfinite(word) ? fixedPointWord() : substitute(rule, word),
  });
}

export function abelianize(rule: SubstitutionRule, alphabet: readonly SubstitutionSymbol[]): SubstitutionIncidenceMatrix {
  return Object.freeze(alphabet.map((targetLetter) =>
    Object.freeze(alphabet.map((sourceLetter) =>
      fromNatural(fromCount((ruleEntryFor(rule, sourceLetter)?.word ?? []).filter((letter) => sameSubstitutionSymbol(letter, targetLetter)).length))))));
}

export function gaugeLabeling(values: readonly ChargeValue[]): GaugeLabelingCarrier {
  return Object.freeze({
    kind: "substitution.dynamics.gaugeLabeling" as const,
    values: Object.freeze([...values]),
    rank: fromCount(values.length),
  });
}

export function gaugeImage(labeling: GaugeLabelingCarrier, sigma: GaugeElementName): GaugeImageCarrier {
  return Object.freeze({
    kind: "substitution.dynamics.gaugeImage" as const,
    labeling,
    sigma,
    values: Object.freeze(labeling.values.map((value) => gauge(sigma, value))),
    rank: labeling.rank,
  });
}

export function inducedPermutation(values: readonly ChargeValue[], sigma: GaugeElementName): GaugePermutationJudgment {
  const labeling = gaugeLabeling(values);
  const image = gaugeImage(labeling, sigma);
  const missing = Object.freeze(labeling.values
    .filter((value) => !image.values.some((candidate) => sameChargeValue(candidate, value)))
    .map((value) => Object.freeze({
      kind: "substitution.dynamics.gaugePermutationMissingValue" as const,
      value,
      image,
    })));
  const escaping = Object.freeze(image.values
    .filter((value) => !labeling.values.some((candidate) => sameChargeValue(candidate, value)))
    .map((value) => Object.freeze({
      kind: "substitution.dynamics.gaugePermutationEscapingValue" as const,
      value,
      image,
    })));
  if (missing.length > 0 || escaping.length > 0) {
    return Object.freeze({
      kind: "substitution.dynamics.gaugePermutation-obstruction" as const,
      labeling,
      image,
      missing,
      escaping,
      rank: fromCount(missing.length + escaping.length),
    });
  }
  const permutation = identityMatrix(labeling.values.length).map((row) => [...row]);
  for (const row of permutation) row.fill(intZero);
  for (let index = 0; index < labeling.values.length; index += 1) {
    const target = gauge(sigma, labeling.values[index]!);
    const targetIndex = labeling.values.findIndex((value) => sameChargeValue(value, target));
    permutation[targetIndex]![index] = intOne;
  }
  const matrix = Object.freeze(permutation.map((row) => Object.freeze(row)));
  return Object.freeze({
    kind: "substitution.dynamics.gaugePermutation:witness" as const,
    labeling,
    image,
    matrix,
  });
}

export function substitutionRuleSelfDual(
  matrix: SubstitutionIncidenceMatrix,
  labeling: readonly ChargeValue[],
  sigma: GaugeElementName,
): SubstitutionSelfDualityJudgment {
  const permutation = inducedPermutation(labeling, sigma);
  if (permutation.kind === "substitution.dynamics.gaugePermutation-obstruction") {
    return Object.freeze({
      kind: "substitution.dynamics.selfDuality-obstruction" as const,
      permutation,
    });
  }
  const identity = identityMatrix(permutation.matrix.length);
  return Object.freeze({
    kind: "substitution.dynamics.selfDuality:witness" as const,
    permutation,
    commutation: matrixEquation(matmul(matrix, permutation.matrix), matmul(permutation.matrix, matrix)),
    gaugeInvolution: matrixEquation(matmul(permutation.matrix, permutation.matrix), identity),
  });
}

export function transposeSubstitutionMatrix(matrix: SubstitutionIncidenceMatrix): SubstitutionIncidenceMatrix {
  return matTranspose(matrix);
}

export const charPolyOver = (matrix: Matrix): readonly Integer[] => matrixCharPoly(matrix);

export function primitiveMatrix(matrix: Matrix): PrimitiveMatrixJudgment {
  const n = matrix.length;
  if (matrix.some((row) => row.some(isNegative))) {
    return Object.freeze({
      kind: "substitution.dynamics.primitiveMatrix-obstruction" as const,
      matrix,
      reason: "negative-entry" as const,
      searchedThrough: natZero,
    });
  }
  const allPositive = (candidate: Matrix): boolean => candidate.every((row) => row.every(isPositive));
  let power = matrix;
  for (let index = 1; index <= (n - 1) * (n - 1) + 1; index += 1) {
    if (allPositive(power)) {
      return Object.freeze({
        kind: "substitution.dynamics.primitiveMatrix:witness" as const,
        matrix,
        exponent: fromCount(index),
      });
    }
    power = matmul(power, matrix);
  }
  return allPositive(power)
    ? Object.freeze({
      kind: "substitution.dynamics.primitiveMatrix:witness" as const,
      matrix,
      exponent: fromCount((n - 1) * (n - 1) + 2),
    })
    : Object.freeze({
      kind: "substitution.dynamics.primitiveMatrix-obstruction" as const,
      matrix,
      reason: "positive-power-not-found" as const,
      searchedThrough: fromCount((n - 1) * (n - 1) + 2),
    });
}

export function perronConvergent(matrix: Matrix, iterations = 4): Rational {
  const n = matrix.length;
  let vector: readonly Integer[] = Object.freeze(Array.from({ length: n }, () => intOne));
  const total = (items: readonly Integer[]): Integer => items.reduce((sum, item) => intAdd(sum, item), intZero);
  for (let index = 0; index < iterations; index += 1) {
    const next = matrix.map((row) =>
      row.reduce((sum, item, column) => intAdd(sum, intMultiply(item, vector[column]!)), intZero),
    );
    if (index === iterations - 1) return rational(fromNatural(magnitude(total(next))), fromNatural(magnitude(total(vector))));
    vector = Object.freeze(next);
  }
  return rational(intOne, intOne);
}


export function colimStructure(matrix: Matrix): ColimStructure {
  const polynomial = matrixCharPoly(matrix);
  const firstNonzero = polynomial.findIndex((coefficient) => !intIsZero(coefficient));
  const firstIndex = firstNonzero < 0 ? polynomial.length - 1 : firstNonzero;
  const moduleRank = fromCount(matrix.length - firstIndex);
  const stableDet = fromNatural(magnitude(polynomial[firstIndex]!));
  const module = localizedIntegerModule(moduleRank, stableDet);
  return Object.freeze({
    kind: "substitution.dynamics.colim" as const,
    rank: moduleRank,
    det: determinant(matrix),
    smith: smithNormalForm(matrix),
    stableDet,
    module,
  });
}

export function substitutionDual(matrix: Matrix): SubstitutionDual {
  const sheaf = colimStructure(matTranspose(matrix));
  const cosheaf = colimStructure(matrix);
  const duality = natEqual(sheaf.rank, cosheaf.rank)
    && intEqual(sheaf.det, cosheaf.det)
    && sheaf.smith.length === cosheaf.smith.length
    && sheaf.smith.every((factor, index) => intEqual(factor, cosheaf.smith[index]!))
    ? Object.freeze({
      kind: "substitution.dynamics.colimDuality:witness" as const,
      sheaf,
      cosheaf,
    })
    : Object.freeze({
      kind: "substitution.dynamics.colimDuality-obstruction" as const,
      sheaf,
      cosheaf,
    });
  return Object.freeze({
    kind: "substitution.dynamics.dual" as const,
    sheaf,
    cosheaf,
    duality,
  });
}

export const localizedIntegerModule = (moduleRank: Natural, stableDet: Integer): LocalizedIntegerModule => Object.freeze({
  kind: "substitution.dynamics.localizedIntegerModule" as const,
  rank: moduleRank,
  invertedPrimes: intEqual(stableDet, intOne) ? Object.freeze([]) : primeFactors(stableDet),
});

export const stepNInvariant = (matrix: Matrix): StepNInvariant => {
  const colimit = colimStructure(matrix);
  return Object.freeze({
    kind: "substitution.dynamics.stepNInvariant" as const,
    rank: rank(matrix),
    module: colimit.module,
  });
};
