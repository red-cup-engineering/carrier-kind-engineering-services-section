#!/usr/bin/env node
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";
const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/u;

function nonEmptyString(value, context) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`derive-value-chain-shares: ${context} must be a nonempty string`);
  }
  return value;
}

function parsePositivePriceFraction(raw, context) {
  if (typeof raw !== "string" || !DECIMAL_PATTERN.test(raw)) {
    throw new TypeError(`derive-value-chain-shares: ${context} must be a decimal string, got ${JSON.stringify(raw)}`);
  }
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [whole, frac = ""] = unsigned.split(".");
  const magnitude = BigInt(`${whole}${frac}`);
  const numerator = negative ? -magnitude : magnitude;
  const denominator = 10n ** BigInt(frac.length);
  if (numerator <= 0n) throw new RangeError(`derive-value-chain-shares: ${context} must be a positive unit price, got ${JSON.stringify(raw)}`);
  return { numerator, denominator };
}

function gcdBigInt(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) { [x, y] = [y, x % y]; }
  return x === 0n ? 1n : x;
}

function reduceFraction(numerator, denominator) {
  if (denominator === 0n) throw new RangeError("derive-value-chain-shares: zero denominator in fraction reduction");
  let n = numerator;
  let d = denominator;
  if (d < 0n) { n = -n; d = -d; }
  const g = gcdBigInt(n, d);
  return { numerator: (n / g).toString(), denominator: (d / g).toString() };
}

function divideFractions(a, b) {
  return reduceFraction(a.numerator * b.denominator, a.denominator * b.numerator);
}

function validateSource(source, context) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new TypeError(`derive-value-chain-shares: ${context}.source must be an object`);
  }
  nonEmptyString(source.sourceUrl, `${context}.source.sourceUrl`);
  nonEmptyString(source.sourceTitle, `${context}.source.sourceTitle`);
  if (source.rangeNote !== undefined) nonEmptyString(source.rangeNote, `${context}.source.rangeNote`);
  return source;
}

function composeEvidenceLabel(source) {
  const rangePart = source.rangeNote === undefined ? "" : `; ${source.rangeNote}`;
  return `${source.sourceTitle} (${source.sourceUrl})${rangePart}`;
}

function validatePriceEntry(priceEntry, context) {
  if (!priceEntry || typeof priceEntry !== "object" || Array.isArray(priceEntry)) {
    throw new TypeError(`derive-value-chain-shares: ${context} must be an object`);
  }
  parsePositivePriceFraction(priceEntry.unitPrice, `${context}.unitPrice`);
  nonEmptyString(priceEntry.unit, `${context}.unit`);
  validateSource(priceEntry.source, context);
  return priceEntry;
}

function validatePosition(position, index, isLast) {
  const context = `positions[${index}]`;
  if (!position || typeof position !== "object" || Array.isArray(position)) {
    throw new TypeError(`derive-value-chain-shares: ${context} must be an object`);
  }
  nonEmptyString(position.name, `${context}.name`);
  if (!Array.isArray(position.prices) || position.prices.length === 0) {
    throw new TypeError(`derive-value-chain-shares: ${context}.prices must be a nonempty array`);
  }
  if (position.prices.length > 2) {
    throw new RangeError(`derive-value-chain-shares: ${context}.prices must carry at most two contested unit prices`);
  }
  if (isLast && position.prices.length !== 1) {
    throw new RangeError("derive-value-chain-shares: the retail (final) position must carry exactly one unit price");
  }
  position.prices.forEach((priceEntry, priceIndex) => validatePriceEntry(priceEntry, `${context}.prices[${priceIndex}]`));
  return position;
}

/**
 * Derives each position's exact share of the retail price and the exact multiplier between
 * adjacent positions along a farm-to-retail price ladder, carrying the evidence label of every
 * priced input row; when a position carries two contested unit prices, both are computed and
 * both are returned under that position. Pure, no I/O, no clock; every ratio is an exact
 * reduced BigInt fraction, never a floating-point approximation.
 * @param {{ type: "PriceLadder", version: 1, positions: readonly { name: string, prices: readonly
 *   { unitPrice: string, unit: string, source: { sourceUrl: string, sourceTitle: string,
 *   rangeNote?: string } }[] }[] }} input The named positions from producer to retail, each
 *   carrying one or two (contested) unit prices with their unit and citing source row; the
 *   final position is the retail anchor and must carry exactly one unit price.
 * @returns {{ type: "ValueChainShareSet", version: 1, positionCount: number,
 *   retailPositionName: string, retailUnitPrice: string, retailUnit: string, positions:
 *   readonly { name: string, contested: boolean, prices: readonly { unitPrice: string,
 *   unit: string, share: { numerator: string, denominator: string }, multiplierFromPrevious:
 *   ({ numerator: string, denominator: string } | null), evidenceLabel: string }[] }[] }}
 *   The producer's position first, the retail position last; each priced entry's exact share
 *   of the retail unit price, its exact multiplier against the previous position's primary
 *   (first-listed) unit price (null for the first position), and its evidence label.
 * @throws {TypeError} When `input` is not a `PriceLadder`, a position or price entry is
 *   malformed, or a unit price is not a decimal string.
 * @throws {RangeError} When fewer than two positions are given, any position carries more than
 *   two unit prices, the retail (final) position carries more than one unit price, or a unit
 *   price is zero or negative.
 */
export function deriveValueChainShares(input) {
  if (!input || typeof input !== "object" || input.type !== "PriceLadder" || input.version !== 1) {
    throw new TypeError("derive-value-chain-shares: input must be a PriceLadder@1 record");
  }
  if (!Array.isArray(input.positions)) {
    throw new TypeError("derive-value-chain-shares: input.positions must be an array");
  }
  if (input.positions.length < 2) {
    throw new RangeError("derive-value-chain-shares: input.positions must carry at least two positions (producer through retail)");
  }
  const lastIndex = input.positions.length - 1;
  input.positions.forEach((position, index) => validatePosition(position, index, index === lastIndex));

  const retailPosition = input.positions[lastIndex];
  const retailPriceFraction = parsePositivePriceFraction(retailPosition.prices[0].unitPrice, "retail position unit price");

  let previousPrimaryFraction = null;
  const positions = input.positions.map((position) => {
    const prices = position.prices.map((priceEntry) => {
      const thisFraction = parsePositivePriceFraction(priceEntry.unitPrice, "position unit price");
      const share = divideFractions(thisFraction, retailPriceFraction);
      const multiplierFromPrevious = previousPrimaryFraction === null ? null : divideFractions(thisFraction, previousPrimaryFraction);
      return {
        unitPrice: priceEntry.unitPrice,
        unit: priceEntry.unit,
        share,
        multiplierFromPrevious,
        evidenceLabel: composeEvidenceLabel(priceEntry.source),
      };
    });
    previousPrimaryFraction = parsePositivePriceFraction(position.prices[0].unitPrice, "position primary unit price");
    return { name: position.name, contested: position.prices.length === 2, prices: Object.freeze(prices) };
  });

  return Object.freeze({
    type: "ValueChainShareSet",
    version: 1,
    positionCount: input.positions.length,
    retailPositionName: retailPosition.name,
    retailUnitPrice: retailPosition.prices[0].unitPrice,
    retailUnit: retailPosition.prices[0].unit,
    positions: Object.freeze(positions),
  });
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "derive-value-chain-shares", description: "Derives each position's exact share of the retail price and the exact multiplier between adjacent positions along a farm-to-retail price ladder, carrying the evidence label of every priced input row; when a position carries two contested unit prices, both are computed and both are returned under that position.", operation: deriveValueChainShares }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
