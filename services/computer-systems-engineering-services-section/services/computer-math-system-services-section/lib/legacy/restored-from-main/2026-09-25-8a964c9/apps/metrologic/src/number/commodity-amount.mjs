/** Exact, commodity-tagged rational amounts for ledger transformations. */
const absolute = (value) => (value < 0n ? -value : value);

function greatestCommonDivisor(left, right) {
  let a = absolute(left);
  let b = absolute(right);
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function reduced(numerator, denominator) {
  if (denominator === 0n) throw new RangeError("exact amount: zero denominator");
  if (numerator === 0n) return [0n, 1n];
  if (denominator < 0n) return reduced(-numerator, -denominator);
  const divisor = greatestCommonDivisor(numerator, denominator);
  return [numerator / divisor, denominator / divisor];
}

export function amount(numerator, denominator, commodity) {
  if (typeof commodity !== "string" || commodity === "") {
    throw new TypeError("exact amount: commodity must be a non-empty string");
  }
  const [num, den] = reduced(BigInt(numerator), BigInt(denominator));
  return { num, den, commodity };
}

export function zeroAmount(commodity) {
  return amount(0n, 1n, commodity);
}

function assertSameCommodity(left, right) {
  if (left.commodity !== right.commodity) {
    throw new TypeError(`exact amount: commodity mismatch: ${left.commodity} vs ${right.commodity}`);
  }
}

export function addAmounts(left, right) {
  assertSameCommodity(left, right);
  return amount(left.num * right.den + right.num * left.den, left.den * right.den, left.commodity);
}

export function subtractAmounts(left, right) {
  assertSameCommodity(left, right);
  return amount(left.num * right.den - right.num * left.den, left.den * right.den, left.commodity);
}

export function negateAmount(value) {
  return amount(-value.num, value.den, value.commodity);
}

export function isZeroAmount(value) {
  return value.num === 0n;
}

export function exactAmountString(value) {
  return `${value.num}/${value.den} ${value.commodity}`;
}

/** Decode a decimal magnitude without floating point; grouping commas are accepted. */
export function parseDecimalAmount(text) {
  if (typeof text !== "string") return undefined;
  let body = text.trim();
  if (body === "") return undefined;
  let sign = 1n;
  if (body.startsWith("+")) body = body.slice(1);
  else if (body.startsWith("-")) {
    sign = -1n;
    body = body.slice(1);
  }
  body = body.replaceAll(",", "");
  const match = /^(?:(\d+)(?:\.(\d*))?|\.(\d+))$/u.exec(body);
  if (!match) return undefined;
  const whole = match[1] ?? "0";
  const fraction = match[2] ?? match[3] ?? "";
  const denominator = 10n ** BigInt(fraction.length);
  const numerator = sign * BigInt(`${whole}${fraction}` || "0");
  const [num, den] = reduced(numerator, denominator);
  return { num, den, places: fraction.length };
}

function terminatingPlaces(denominator) {
  let rest = denominator;
  let twos = 0;
  let fives = 0;
  while (rest % 2n === 0n) {
    rest /= 2n;
    twos += 1;
  }
  while (rest % 5n === 0n) {
    rest /= 5n;
    fives += 1;
  }
  return rest === 1n ? Math.max(twos, fives) : undefined;
}

/** Render an amount using the historical half-up decimal boundary. */
export function formatAmount(value, { places, grouping = true } = {}) {
  const renderedPlaces = places ?? terminatingPlaces(value.den) ?? 2;
  if (!Number.isInteger(renderedPlaces) || renderedPlaces < 0) {
    throw new RangeError(`exact amount: invalid decimal places: ${renderedPlaces}`);
  }
  const negative = value.num < 0n;
  const magnitude = negative ? -value.num : value.num;
  const scale = 10n ** BigInt(renderedPlaces);
  let quotient = (magnitude * scale) / value.den;
  const remainder = (magnitude * scale) % value.den;
  if (2n * remainder >= value.den) quotient += 1n;
  let digits = quotient.toString();
  if (renderedPlaces > 0) digits = digits.padStart(renderedPlaces + 1, "0");
  let whole = renderedPlaces === 0 ? digits : digits.slice(0, -renderedPlaces);
  const fraction = renderedPlaces === 0 ? "" : digits.slice(-renderedPlaces);
  if (grouping) whole = whole.replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
  const number = renderedPlaces === 0 ? whole : `${whole}.${fraction}`;
  return `${negative && quotient !== 0n ? "-" : ""}${number} ${value.commodity}`;
}

/** A commodity-free exact rational for transformations that choose the output commodity separately. */
export function rational(numerator, denominator = 1n) {
  const [num, den] = reduced(BigInt(numerator), BigInt(denominator));
  return { num, den };
}

/** Scale a tagged amount by a dimensionless exact rational. */
export function scaleAmount(value, factor) {
  return amount(value.num * factor.num, value.den * factor.den, value.commodity);
}

/** Multiply two magnitudes only when the caller explicitly supplies the resulting commodity. */
export function multiplyAmounts(left, right, commodity) {
  return amount(left.num * right.num, left.den * right.den, commodity);
}
