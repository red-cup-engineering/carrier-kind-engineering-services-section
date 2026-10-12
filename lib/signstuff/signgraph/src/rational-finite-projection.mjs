/**
 * Project exact rationals to finite IEEE-754 binary64 values without first
 * rounding numerator and denominator individually. Ties go to even.
 * Nonzero underflow and overflow are explicit domain errors.
 */
export function rationalToFiniteNumber(numerator, denominator) {
  if (typeof numerator !== 'bigint' || typeof denominator !== 'bigint') {
    throw new TypeError('exact rational numerator and denominator must be BigInt');
  }
  if (denominator === 0n) throw new RangeError('zero rational denominator');
  if (numerator === 0n) return 0;
  const negative = (numerator < 0n) !== (denominator < 0n);
  const a = numerator < 0n ? -numerator : numerator;
  const b = denominator < 0n ? -denominator : denominator;
  let e = a.toString(2).length - b.toString(2).length;
  if (e >= 0 ? a < (b << BigInt(e)) : (a << BigInt(-e)) < b) e -= 1;
  if (e > 1023) throw new RangeError('exact rational exceeds finite binary64 range');
  if (e < -1075) throw new RangeError('nonzero rational underflows binary64');
  const s = e >= -1022 ? 52 - e : 1074;
  const scaledNumerator = s >= 0 ? a << BigInt(s) : a;
  const scaledDenominator = s < 0 ? b << BigInt(-s) : b;
  let k = scaledNumerator / scaledDenominator;
  const rem = scaledNumerator % scaledDenominator;
  const twice = rem << 1n;
  if (twice > scaledDenominator || (twice === scaledDenominator && (k & 1n) !== 0n)) k += 1n;
  if (k === 0n) throw new RangeError('nonzero rational underflows binary64');
  const result = Number(k) * 2 ** (-s);
  if (!Number.isFinite(result) || result === 0) {
    throw new RangeError('exact rational cannot be represented as a finite nonzero binary64 value');
  }
  return negative ? -result : result;
}
