/**
 * codecs/host/javascript/numbers - the lossy native-float and decimal-string boundary.
 *
 * The door where exact numbers (Natural / Integer / Rational / Matrix)
 * cross to and from machine floating-point and decimal strings — the crossings
 * that lose exactness or speak text. The *exact* native-integer lifts
 * (`fromInt`, `ratFromInt`, `fromRatio`, `fromCount`, `toInt`, `toCount`,
 * `fromInts`) are pure successor-based algebra and live in the exact-number algebra
 * itself; they are re-exported here so the boundary door still names them.
 */
import {
  intNegate,
  isNegative, magnitude, natAdd, natDivmod, natIsZero, natMultiply, natOne, natZero,
  rational, successor, fromNatural,
  toInt, fromCount, toCount,

} from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";

// The exact native-integer lifts are algebra; re-export them at the boundary door.
export {
  toCount, fromCount, toInt, fromInt, ratFromInt, fromRatio, fromInts,
} from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
/** Decode — a rational's native floating-point value (lossy). */
export const toNumber = (q) => toInt(q.num) / toInt(q.den);

const ten = (() => {
  let value = natZero;
  for (let index = 0; index < 10; index += 1) value = successor(value);
  return value;
})();

const naturalToDigits = (value) => {
  if (natIsZero(value)) return "0";
  const digits = [];
  let remaining = value;
  while (!natIsZero(remaining)) {
    const { quotient, remainder } = natDivmod(remaining, ten);
    digits.push(String(toCount(remainder)));
    remaining = quotient;
  }
  return digits.reverse().join("");
};

const naturalFromDigits = (digits) => {
  let value = natZero;
  for (const character of digits) value = natAdd(natMultiply(value, ten), fromCount(Number(character)));
  return value;
};

const tenToThe = (places) => {
  let value = natOne;
  for (let index = 0; index < places; index += 1) value = natMultiply(value, ten);
  return value;
};

/** Decode — an integer's exact decimal-string form. */
export const integerToDecimalString = (z) => (isNegative(z) ? "-" : "") + naturalToDigits(magnitude(z));

/** Decode — a rational's lossless audit form "num/den". */
export const ratToExactString = (q) => `${integerToDecimalString(q.num)}/${integerToDecimalString(q.den)}`;

/** Encode — an exact decimal string as a rational with its place-count. */
export const parseDecimal = (text) => {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(text.trim());
  if (match === null) throw new RangeError(`parseDecimal: not a decimal: ${JSON.stringify(text)}`);
  const fraction = match[3] ?? "";
  const places = fraction.length;
  const magnitudeNatural = naturalFromDigits(match[2] + fraction);
  const signedNumerator = match[1] === "-" ? intNegate(fromNatural(magnitudeNatural)) : fromNatural(magnitudeNatural);
  return { value: rational(signedNumerator, fromNatural(tenToThe(places))), places };
};

/** Encode — an exact decimal string as a rational, discarding the place-count. */
export const fromDecimalString = (text) => parseDecimal(text).value;

