/**
 * Exact graded money as market-game value.
 *
 * Money is a compact graded rational used by market and accounting games: exact
 * value carried in a commodity/asset/unit grade, stored as the reduced pair of
 * decimal strings and crossing to the exact-number tower at the analysis boundary.
 */
import { fromInt, rational, toBigInt } from "@red-cup-engineering/computer-data-engineering-services-section/number/exact-number";
import { flowNetwork, divergence, conserved, complete, gradedResidualBy, gradedConservedBy, gradedCompleteBy, gradedResidual as gradedResidual_2, gradedConserved, gradedComplete } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/conservation";
const conservation = Object.freeze({ flowNetwork, divergence, conserved, complete, gradedResidualBy, gradedConservedBy, gradedCompleteBy, gradedResidual: gradedResidual_2, gradedConserved, gradedComplete });

const integerFromBigInt = (value) => fromInt(value);
const bigIntFromInteger = (z) => toBigInt(z);
const bigIntPartsOfRational = (q) =>
  Object.freeze({ num: bigIntFromInteger(q.num), den: bigIntFromInteger(q.den) });

const gcdBigInt = (left, right) => {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
};

const normalize = (num, den) => {
  if (den === 0n) throw new RangeError("exact value: zero denominator");
  if (num === 0n) return Object.freeze({ num: 0n, den: 1n });
  const sign = den < 0n ? -1n : 1n;
  const factor = gcdBigInt(num, den);
  return Object.freeze({ num: sign * num / factor, den: sign * den / factor });
};

const asRecord = (value, label) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${label}: expected an object`);
  }
  return value;
};

const withExactKeys = (
  value,
  keys,
  label,
) => {
  const record = asRecord(value, label);
  const actual = Object.keys(record);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) {
    throw new TypeError(`${label}: expected exactly ${keys.join(", ")}`);
  }
  return record;
};

const admittedParts = (
  value,
  label,
) => {
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

const partsOf = (value) => {
  const parts = admittedParts(value, "exact value");
  return Object.freeze({ num: parts.num, den: parts.den });
};

const compact = (num, den, grade) => {
  if (grade.length === 0) throw new TypeError("exact value: grade must be a non-empty string");
  const reduced = normalize(num, den);
  return Object.freeze({
    kind: "exactNumber.gradedRational",
    value: Object.freeze({
      kind: "exactNumber.rational",
      num: reduced.num.toString(),
      den: reduced.den.toString(),
    }),
    grade,
  });
};

/** Admit and canonicalize an exact-value carrier received through a JSON boundary. */
export const admitExactValue = (value, label = "exact value") => {
  const parts = admittedParts(value, label);
  return compact(parts.num, parts.den, parts.grade);
};
export const admitMoney = admitExactValue;

const sameGrade = (left, right) => {
  if (left.grade !== right.grade) throw new TypeError(`exact value: grade mismatch ${left.grade} != ${right.grade}`);
};

export const exactValue = (value, grade) => {
  const parts = bigIntPartsOfRational(value);
  return compact(parts.num, parts.den, grade);
};
export const money = exactValue;

export const valueFromParts = (num, den, grade) =>
  compact(num, den, grade);
export const moneyFromParts = valueFromParts;

export const valueZero = (grade) => compact(0n, 1n, grade);
export const moneyZero = valueZero;

export const addValue = (left, right) => {
  sameGrade(left, right);
  const l = partsOf(left);
  const r = partsOf(right);
  return compact(l.num * r.den + r.num * l.den, l.den * r.den, left.grade);
};
export const addMoney = addValue;

export const subValue = (left, right) => addValue(left, negateValue(right));
export const subMoney = subValue;

export const negateValue = (value) => {
  const parts = partsOf(value);
  return compact(-parts.num, parts.den, value.grade);
};
export const negateMoney = negateValue;

export const isZeroValue = (value) => partsOf(value).num === 0n;
export const isZeroMoney = isZeroValue;

export const cmpValue = (left, right) => {
  sameGrade(left, right);
  const l = partsOf(left);
  const r = partsOf(right);
  const difference = l.num * r.den - r.num * l.den;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
};
export const cmpMoney = cmpValue;

export const scaleValue = (value, scalar) => {
  const v = partsOf(value);
  const s = "kind" in scalar ? bigIntPartsOfRational(scalar) : scalar;
  return compact(v.num * s.num, v.den * s.den, value.grade);
};
export const scaleMoney = scaleValue;

export const timesValue = (left, right, grade) =>
  compact(partsOf(left).num * partsOf(right).num, partsOf(left).den * partsOf(right).den, grade);
export const timesMoney = timesValue;

export const gradeOfValue = (value) => value.grade;
export const commodityOf = gradeOfValue;
export const valueRational = (value) => {
  const parts = partsOf(value);
  return rational(integerFromBigInt(parts.num), integerFromBigInt(parts.den));
};

export const ratioOf = (left, right) => {
  const l = partsOf(left);
  const r = partsOf(right);
  return normalize(l.num * r.den, l.den * r.num);
};

const valueParts = (value) => {
  const parts = partsOf(value);
  return Object.freeze({ num: parts.num, den: parts.den, grade: value.grade });
};

const terminatingPlaces = (den) => {
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

export const toDecimalString = (value) => {
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

export const toExactString = (value) => {
  const parts = valueParts(value);
  return `${parts.num}/${parts.den} ${parts.grade}`;
};

export const parseDecimalValue = (decimal, grade) => {
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
});
export const moneySchema = exactValueSchema;

export function balanceOf(section, flow) {
  return conservation.conserved(conservation.flowNetwork(section), flow);
}

export function completePosting(
  section,
  flow,
  holeIndex,
) {
  return conservation.complete(conservation.flowNetwork(section), flow, holeIndex);
}

export function gradedBalanceOf(amounts) {
  const residual = gradedResidual(amounts);
  if (residual.length === 0) {
    return Object.freeze({ kind: "meme-analysis.conservation.graded:witness", amounts: Object.freeze([...amounts]) });
  }
  return Object.freeze({
    kind: "meme-analysis.conservation.graded-obstruction",
    amounts: Object.freeze([...amounts]),
    residual,
  });
}

export function inferElidedValue(known) {
  const residual = gradedResidual(known);
  if (residual.length === 1) {
    return Object.freeze({
      kind: "meme-analysis.conservation.graded-completion:witness",
      known: Object.freeze([...known]),
      inferred: negateValue(residual[0]),
    });
  }
  return Object.freeze({
    kind: "meme-analysis.conservation.graded-completion-obstruction",
    known: Object.freeze([...known]),
    reason: residual.length === 0 ? "balanced" : "ambiguous",
    residual,
  });
}
export const inferElidedMoney = inferElidedValue;

function gradedResidual(amounts) {
  const order = [];
  const sums = new Map();
  for (const amount of amounts) {
    const prior = sums.get(amount.grade);
    if (prior === undefined) {
      order.push(amount.grade);
      sums.set(amount.grade, amount);
    } else {
      sums.set(amount.grade, addValue(prior, amount));
    }
  }
  return Object.freeze(order.map((grade) => sums.get(grade)).filter((amount) => !isZeroValue(amount)));
}
