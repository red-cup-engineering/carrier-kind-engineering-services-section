/**
 * Exact graded money as market-game value.
 *
 * Money is a compact graded rational used by market and accounting games: exact
 * value carried in a commodity/asset/unit grade. Relating's von Neumann
 * rationals remain the mathematical carrier at the explicit analysis boundary;
 * production money stores the same reduced pair as decimal strings so ordinary
 * ledger magnitudes do not materialize one set member per integer unit.
 */
import {
  conservation,
  fromNatural,
  integer,
  natAdd,
  natMultiply,
  natZero,
  rational,
  successor,
  type Integer,
  type Natural,
  type Rational,
} from "@lenticule-science/articulating/predicating/positing/settling/analysis";
import type { SectionCarrier } from "@lenticule-science/articulating/predicating/positing/settling";

export interface ExactValue {
  readonly kind: "exactNumber.gradedRational";
  readonly value: Readonly<{
    kind: "exactNumber.rational";
    num: string;
    den: string;
  }>;
  readonly grade: string;
}
export type Money = ExactValue;
export type { Rational, Integer, Natural };
export type ConservedJudgment = conservation.ConservedJudgment;
export type CompletionJudgment = conservation.CompletionJudgment;
export type GradedConservedJudgment =
  | Readonly<{ kind: "meme-analysis.conservation.graded:witness"; amounts: readonly ExactValue[] }>
  | Readonly<{ kind: "meme-analysis.conservation.graded-obstruction"; amounts: readonly ExactValue[]; residual: readonly ExactValue[] }>;
export type GradedCompletionJudgment =
  | Readonly<{ kind: "meme-analysis.conservation.graded-completion:witness"; known: readonly ExactValue[]; inferred: ExactValue }>
  | Readonly<{ kind: "meme-analysis.conservation.graded-completion-obstruction"; known: readonly ExactValue[]; reason: "balanced" | "ambiguous"; residual: readonly ExactValue[] }>;
export interface ExactRatio { readonly num: bigint; readonly den: bigint }

const naturalFromNonNegBigInt = (value: bigint): Natural => {
  if (value < 0n) throw new RangeError(`naturalFromNonNegBigInt: negative ${value}`);
  if (value === 0n) return natZero;
  const ten = (() => {
    let n = natZero;
    for (let i = 0; i < 10; i += 1) n = successor(n);
    return n;
  })();
  const digitNaturals = (() => {
    const out: Natural[] = [natZero];
    let n = natZero;
    for (let i = 1; i <= 9; i += 1) {
      n = successor(n);
      out.push(n);
    }
    return Object.freeze(out);
  })();
  let acc = natZero;
  for (const ch of value.toString()) {
    const digit = ch.charCodeAt(0) - 48;
    acc = natAdd(natMultiply(acc, ten), digitNaturals[digit] ?? natZero);
  }
  return acc;
};

const integerFromBigInt = (value: bigint): Integer => value < 0n
  ? integer(natZero, naturalFromNonNegBigInt(-value))
  : fromNatural(naturalFromNonNegBigInt(value));

const bigIntFromNatural = (n: Natural): bigint => BigInt(n.members.length);
const bigIntFromInteger = (z: Integer): bigint => bigIntFromNatural(z.pos) - bigIntFromNatural(z.neg);
const bigIntPartsOfRational = (q: Rational): { readonly num: bigint; readonly den: bigint } =>
  Object.freeze({ num: bigIntFromInteger(q.num), den: bigIntFromInteger(q.den) });

const gcdBigInt = (left: bigint, right: bigint): bigint => {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
};

const normalize = (num: bigint, den: bigint): ExactRatio => {
  if (den === 0n) throw new RangeError("exact value: zero denominator");
  if (num === 0n) return Object.freeze({ num: 0n, den: 1n });
  const sign = den < 0n ? -1n : 1n;
  const factor = gcdBigInt(num, den);
  return Object.freeze({ num: sign * num / factor, den: sign * den / factor });
};

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${label}: expected an object`);
  }
  return value as Record<string, unknown>;
};

const withExactKeys = (
  value: unknown,
  keys: readonly string[],
  label: string,
): Record<string, unknown> => {
  const record = asRecord(value, label);
  const actual = Object.keys(record);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) {
    throw new TypeError(`${label}: expected exactly ${keys.join(", ")}`);
  }
  return record;
};

const admittedParts = (
  value: unknown,
  label: string,
): Readonly<{ num: bigint; den: bigint; grade: string }> => {
  const outer = withExactKeys(value, ["kind", "value", "grade"], label);
  if (outer.kind !== "exactNumber.gradedRational") {
    throw new TypeError(`${label}: invalid kind`);
  }
  if (typeof outer.grade !== "string" || outer.grade.length === 0) {
    throw new TypeError(`${label}: grade must be a non-empty string`);
  }
  const rationalValue = withExactKeys(outer.value, ["kind", "num", "den"], `${label}.value`);
  if (rationalValue.kind !== "exactNumber.rational") {
    throw new TypeError(`${label}.value: invalid kind`);
  }
  if (typeof rationalValue.num !== "string" || !/^-?[0-9]+$/.test(rationalValue.num)) {
    throw new TypeError(`${label}.value.num: expected an integer decimal string`);
  }
  if (typeof rationalValue.den !== "string" || !/^[1-9][0-9]*$/.test(rationalValue.den)) {
    throw new TypeError(`${label}.value.den: expected a positive integer decimal string`);
  }
  return Object.freeze({
    num: BigInt(rationalValue.num),
    den: BigInt(rationalValue.den),
    grade: outer.grade,
  });
};

const partsOf = (value: ExactValue): ExactRatio => {
  const parts = admittedParts(value, "exact value");
  return Object.freeze({ num: parts.num, den: parts.den });
};

const compact = (num: bigint, den: bigint, grade: string): ExactValue => {
  if (grade.length === 0) throw new TypeError("exact value: grade must be a non-empty string");
  const reduced = normalize(num, den);
  return Object.freeze({
    kind: "exactNumber.gradedRational" as const,
    value: Object.freeze({
      kind: "exactNumber.rational" as const,
      num: reduced.num.toString(),
      den: reduced.den.toString(),
    }),
    grade,
  });
};

/** Admit and canonicalize an exact-value carrier received through a JSON boundary. */
export const admitExactValue = (value: unknown, label = "exact value"): ExactValue => {
  const parts = admittedParts(value, label);
  return compact(parts.num, parts.den, parts.grade);
};
export const admitMoney = admitExactValue;

const sameGrade = (left: ExactValue, right: ExactValue): void => {
  if (left.grade !== right.grade) throw new TypeError(`exact value: grade mismatch ${left.grade} != ${right.grade}`);
};

export const exactValue = (value: Rational, grade: string): ExactValue => {
  const parts = bigIntPartsOfRational(value);
  return compact(parts.num, parts.den, grade);
};
export const money = exactValue;

export const valueFromParts = (num: bigint, den: bigint, grade: string): ExactValue =>
  compact(num, den, grade);
export const moneyFromParts = valueFromParts;

export const valueZero = (grade: string): ExactValue => compact(0n, 1n, grade);
export const moneyZero = valueZero;

export const addValue = (left: ExactValue, right: ExactValue): ExactValue => {
  sameGrade(left, right);
  const l = partsOf(left);
  const r = partsOf(right);
  return compact(l.num * r.den + r.num * l.den, l.den * r.den, left.grade);
};
export const addMoney = addValue;

export const subValue = (left: ExactValue, right: ExactValue): ExactValue => addValue(left, negateValue(right));
export const subMoney = subValue;

export const negateValue = (value: ExactValue): ExactValue => {
  const parts = partsOf(value);
  return compact(-parts.num, parts.den, value.grade);
};
export const negateMoney = negateValue;

export const isZeroValue = (value: ExactValue): boolean => partsOf(value).num === 0n;
export const isZeroMoney = isZeroValue;

export const cmpValue = (left: ExactValue, right: ExactValue): -1 | 0 | 1 => {
  sameGrade(left, right);
  const l = partsOf(left);
  const r = partsOf(right);
  const difference = l.num * r.den - r.num * l.den;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
};
export const cmpMoney = cmpValue;

export const scaleValue = (value: ExactValue, scalar: Rational | ExactRatio): ExactValue => {
  const v = partsOf(value);
  const s = "kind" in scalar ? bigIntPartsOfRational(scalar) : scalar;
  return compact(v.num * s.num, v.den * s.den, value.grade);
};
export const scaleMoney = scaleValue;

export const timesValue = (left: ExactValue, right: ExactValue, grade: string): ExactValue =>
  compact(partsOf(left).num * partsOf(right).num, partsOf(left).den * partsOf(right).den, grade);
export const timesMoney = timesValue;

export const gradeOfValue = (value: ExactValue): string => value.grade;
export const commodityOf = gradeOfValue;
export const valueRational = (value: ExactValue): Rational => {
  const parts = partsOf(value);
  return rational(integerFromBigInt(parts.num), integerFromBigInt(parts.den));
};

export const ratioOf = (left: ExactValue, right: ExactValue): { readonly num: bigint; readonly den: bigint } => {
  const l = partsOf(left);
  const r = partsOf(right);
  return normalize(l.num * r.den, l.den * r.num);
};

const valueParts = (value: ExactValue): { readonly num: bigint; readonly den: bigint; readonly grade: string } => {
  const parts = partsOf(value);
  return Object.freeze({ num: parts.num, den: parts.den, grade: value.grade });
};

const terminatingPlaces = (den: bigint): number | null => {
  let d = den < 0n ? -den : den;
  if (d === 0n) return null;
  let twos = 0;
  let fives = 0;
  while (d % 2n === 0n) {
    d /= 2n;
    twos += 1;
  }
  while (d % 5n === 0n) {
    d /= 5n;
    fives += 1;
  }
  return d === 1n ? Math.max(twos, fives) : null;
};

export const toDecimalString = (value: ExactValue): string => {
  const { num, den } = partsOf(value);
  const places = terminatingPlaces(den);
  if (places === null) return `${num}/${den}`;
  const negative = num < 0n;
  const magnitude = negative ? -num : num;
  const whole = magnitude / den;
  let remainder = magnitude % den;
  if (places === 0 || remainder === 0n) return `${negative ? "-" : ""}${whole}`;
  let fraction = "";
  for (let index = 0; index < places; index += 1) {
    remainder *= 10n;
    fraction += (remainder / den).toString();
    remainder %= den;
  }
  fraction = fraction.replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
};

export const toExactString = (value: ExactValue): string => {
  const parts = valueParts(value);
  return `${parts.num}/${parts.den} ${parts.grade}`;
};

export const parseDecimalValue = (decimal: string, grade: string): ExactValue => {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(decimal.trim());
  if (!match) throw new TypeError(`exact value: invalid decimal ${decimal}`);
  const fraction = match[3] ?? "";
  const sign = match[1] === "-" ? -1n : 1n;
  const num = sign * BigInt(`${match[2]}${fraction}`);
  return compact(num, 10n ** BigInt(fraction.length), grade);
};
export const parseDecimalMoney = parseDecimalValue;

export const exactValueSchema = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "gaming/market/exact-value",
  title: "ExactValue",
  description: "Compact exact graded value: a reduced rational carried in a market-game grade. Numerator and denominator use decimal strings at the JSON boundary.",
  type: "object",
  required: ["kind", "value", "grade"],
  additionalProperties: false,
  properties: {
    kind: { const: "exactNumber.gradedRational" },
    grade: { type: "string", minLength: 1 },
    value: { $ref: "#/$defs/Rational" },
  },
  $defs: {
    Rational: {
      type: "object",
      required: ["kind", "num", "den"],
      additionalProperties: false,
      properties: {
        kind: { const: "exactNumber.rational" },
        num: { type: "string", pattern: "^-?[0-9]+$" },
        den: { type: "string", pattern: "^[1-9][0-9]*$" },
      },
    },
  },
} as const);
export const moneySchema = exactValueSchema;

export function balanceOf(section: SectionCarrier, flow: readonly Rational[]): ConservedJudgment {
  return conservation.conserved(conservation.flowNetwork(section), flow);
}

export function completePosting(
  section: SectionCarrier,
  flow: readonly Rational[],
  holeIndex: number,
): CompletionJudgment {
  return conservation.complete(conservation.flowNetwork(section), flow, holeIndex);
}

export function gradedBalanceOf(amounts: readonly ExactValue[]): GradedConservedJudgment {
  const residual = gradedResidual(amounts);
  if (residual.length === 0) {
    return Object.freeze({ kind: "meme-analysis.conservation.graded:witness" as const, amounts: Object.freeze([...amounts]) });
  }
  return Object.freeze({
    kind: "meme-analysis.conservation.graded-obstruction" as const,
    amounts: Object.freeze([...amounts]),
    residual,
  });
}

export function inferElidedValue(known: readonly ExactValue[]): GradedCompletionJudgment {
  const residual = gradedResidual(known);
  if (residual.length === 1) {
    return Object.freeze({
      kind: "meme-analysis.conservation.graded-completion:witness" as const,
      known: Object.freeze([...known]),
      inferred: negateValue(residual[0]!),
    });
  }
  return Object.freeze({
    kind: "meme-analysis.conservation.graded-completion-obstruction" as const,
    known: Object.freeze([...known]),
    reason: residual.length === 0 ? "balanced" as const : "ambiguous" as const,
    residual,
  });
}
export const inferElidedMoney = inferElidedValue;

function gradedResidual(amounts: readonly ExactValue[]): readonly ExactValue[] {
  const order: string[] = [];
  const sums = new Map<string, ExactValue>();
  for (const amount of amounts) {
    const prior = sums.get(amount.grade);
    if (prior === undefined) {
      order.push(amount.grade);
      sums.set(amount.grade, amount);
    } else {
      sums.set(amount.grade, addValue(prior, amount));
    }
  }
  return Object.freeze(order.map((grade) => sums.get(grade)!).filter((amount) => !isZeroValue(amount)));
}
