#!/usr/bin/env node
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";
const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/u;
const SHARE_KINDS = ["royalty", "net-sales", "milestone", "multiple-of-market", "none"];

function nonEmptyString(value, context) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`derive-benefit-share: ${context} must be a nonempty string`);
  }
  return value;
}

function parseDecimalFraction(raw, context) {
  if (typeof raw !== "string" || !DECIMAL_PATTERN.test(raw)) {
    throw new TypeError(`derive-benefit-share: ${context} must be a decimal string, got ${JSON.stringify(raw)}`);
  }
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [whole, frac = ""] = unsigned.split(".");
  const magnitude = BigInt(`${whole}${frac}`);
  const numerator = negative ? -magnitude : magnitude;
  const denominator = 10n ** BigInt(frac.length);
  if (numerator <= 0n) {
    throw new RangeError(`derive-benefit-share: ${context} must be a positive decimal, got ${JSON.stringify(raw)}`);
  }
  return { numerator, denominator };
}

function gcdBigInt(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) { [x, y] = [y, x % y]; }
  return x === 0n ? 1n : x;
}

function reduceFraction(numerator, denominator) {
  if (denominator === 0n) throw new RangeError("derive-benefit-share: zero denominator in fraction reduction");
  let n = numerator;
  let d = denominator;
  if (d < 0n) { n = -n; d = -d; }
  const g = gcdBigInt(n, d);
  return { numerator: n / g, denominator: d / g };
}

function multiplyFractions(a, b) {
  return reduceFraction(a.numerator * b.numerator, a.denominator * b.denominator);
}

const HUNDRED_FRACTION = { numerator: 100n, denominator: 1n };
const ZERO_FRACTION = { numerator: 0n, denominator: 1n };

function percentOf(baseFraction, percentDecimalString) {
  const percentFraction = parseDecimalFraction(percentDecimalString, "record.share.value");
  const percentAsFraction = reduceFraction(percentFraction.numerator, percentFraction.denominator * HUNDRED_FRACTION.numerator);
  return multiplyFractions(percentAsFraction, baseFraction);
}

function compareFractionGte(a, b) {
  return a.numerator * b.denominator >= b.numerator * a.denominator;
}

function fractionToStrings(fraction) {
  return { numerator: fraction.numerator.toString(), denominator: fraction.denominator.toString() };
}

function composeEvidenceLabel(source) {
  const rangePart = source.rangeNote === undefined ? "" : `; ${source.rangeNote}`;
  return `${source.sourceTitle} (${source.sourceUrl})${rangePart}`;
}

function validateSource(source, context) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new TypeError(`derive-benefit-share: ${context}.source must be an object`);
  }
  nonEmptyString(source.sourceUrl, `${context}.source.sourceUrl`);
  nonEmptyString(source.sourceTitle, `${context}.source.sourceTitle`);
  if (source.rangeNote !== undefined) nonEmptyString(source.rangeNote, `${context}.source.rangeNote`);
  return source;
}

function validatePriceWithUnit(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`derive-benefit-share: ${context} must be an object`);
  }
  const unitPriceFraction = parseDecimalFraction(value.unitPrice, `${context}.unitPrice`);
  nonEmptyString(value.unit, `${context}.unit`);
  validateSource(value.source, context);
  return { unitPrice: value.unitPrice, unit: value.unit, source: value.source, fraction: unitPriceFraction };
}

function validateNotFoundInputs(notFoundInputs) {
  if (!Array.isArray(notFoundInputs)) {
    throw new TypeError("derive-benefit-share: input.notFoundInputs must be an array of strings");
  }
  notFoundInputs.forEach((entry, index) => nonEmptyString(entry, `input.notFoundInputs[${index}]`));
  return notFoundInputs;
}

function validateShares(shares) {
  if (!shares || typeof shares !== "object" || shares.type !== "ValueChainShareSet" || shares.version !== 1) {
    throw new TypeError("derive-benefit-share: input.shares must be a ValueChainShareSet@1 record");
  }
  if (!Array.isArray(shares.positions) || shares.positions.length < 2) {
    throw new RangeError("derive-benefit-share: input.shares.positions must carry at least two positions");
  }
  const producer = shares.positions[0];
  if (!producer || !Array.isArray(producer.prices) || producer.prices.length === 0) {
    throw new TypeError("derive-benefit-share: input.shares.positions[0].prices must be a nonempty array");
  }
  const primary = producer.prices[0];
  nonEmptyString(primary.unitPrice, "input.shares.positions[0].prices[0].unitPrice");
  nonEmptyString(primary.unit, "input.shares.positions[0].prices[0].unit");
  nonEmptyString(primary.evidenceLabel, "input.shares.positions[0].prices[0].evidenceLabel");
  return shares;
}

function validateRecord(record) {
  if (!record || typeof record !== "object" || record.type !== "561GroupBenefitSharingRecord") {
    throw new TypeError("derive-benefit-share: input.record must be a 561GroupBenefitSharingRecord");
  }
  if (!record.share || typeof record.share !== "object") {
    throw new TypeError("derive-benefit-share: input.record.share must be an object");
  }
  if (!SHARE_KINDS.includes(record.share.kind)) {
    throw new RangeError(`derive-benefit-share: input.record.share.kind must be one of ${JSON.stringify(SHARE_KINDS)}, got ${JSON.stringify(record.share.kind)}`);
  }
  if (record.share.kind === "none") {
    if (record.share.value !== null) {
      throw new TypeError("derive-benefit-share: input.record.share.value must be null when share.kind is \"none\"");
    }
  } else {
    parseDecimalFraction(record.share.value, "input.record.share.value");
  }
  if (record.floor !== null) {
    if (!record.floor || typeof record.floor !== "object") {
      throw new TypeError("derive-benefit-share: input.record.floor must be null or an object");
    }
    parseDecimalFraction(record.floor.amount, "input.record.floor.amount");
    nonEmptyString(record.floor.unit, "input.record.floor.unit");
    nonEmptyString(record.floor.per, "input.record.floor.per");
  }
  return record;
}

/**
 * Derives what a benefit-sharing agreement returns to the territory per unit and for the
 * request's unitsSold, computed by the record's share.kind: royalty and net-sales as the exact
 * percent of a named base (the request's retailUnitPrice for net-sales; for royalty, the
 * request's royaltyBase, or "unknown" when the request does not name one), milestone as the
 * record's stated percent passed through with perUnit null (a milestone payment is not priced
 * per unit sold), multiple-of-market as the record's multiple applied to the producer's
 * position's primary unit price from shares, and none as the exact fraction zero with the
 * reason. Also computes whether the record's floor (if any) is met against the producer's
 * position price, an overall meetsAgreement boolean, the evidence label of every figure used,
 * and a notFound list naming every figure the reading could not resolve or represent. Pure, no
 * I/O, no clock; every amount is an exact reduced BigInt fraction, never a floating-point
 * approximation.
 * @param {{ type: "DeriveBenefitShareRequest", version: 1,
 *   shares: { type: "ValueChainShareSet", version: 1, positions: readonly { prices: readonly
 *     { unitPrice: string, unit: string, evidenceLabel: string }[] }[] },
 *   record: { type: "561GroupBenefitSharingRecord", share: { kind: "royalty"|"net-sales"|
 *     "milestone"|"multiple-of-market"|"none", value: (string|null) }, floor: ({ amount: string,
 *     unit: string, per: string }|null) },
 *   unitsSold: string,
 *   retailUnitPrice: { unitPrice: string, unit: string, source: { sourceUrl: string,
 *     sourceTitle: string, rangeNote?: string } },
 *   royaltyBase?: { unitPrice: string, unit: string, source: { sourceUrl: string,
 *     sourceTitle: string, rangeNote?: string } },
 *   notFoundInputs?: readonly string[] }} input The value-chain reading, the benefit-sharing
 *   record, the units sold, the retail unit price (the net-sales base), a royalty record's
 *   licensee-named royalty base, and any caller-named figures that do not fit this schema at
 *   all (e.g. a flat per-unit premium the record's share.kind cannot represent), passed
 *   straight through into the result's notFound.
 * @returns {{ type: "BenefitShareReading", version: 1, shareKind: string, shareValue:
 *   (string|null), perUnit: ({ numerator: string, denominator: string }|null), total:
 *   ({ numerator: string, denominator: string }|null), basis: string, floor: ({ amount: string,
 *   unit: string, per: string, producerPositionUnitPrice: string, producerPositionUnit: string,
 *   met: boolean }|null), meetsAgreement: boolean, evidenceLabels: readonly string[], notFound:
 *   readonly string[] }} What the agreement returns per unit and in total, whether its floor is
 *   met, whether the reading as a whole meets the agreement, and the evidence trail.
 * @throws {TypeError} When `input` is not a `DeriveBenefitShareRequest`, `shares` is not a
 *   `ValueChainShareSet`, `record` is not a `561GroupBenefitSharingRecord`, or a required
 *   decimal string is malformed.
 * @throws {RangeError} When `shares.positions` carries fewer than two positions, `record.share.kind`
 *   is outside its enumeration, or a unit price, share value, floor amount, or unitsSold is zero
 *   or negative.
 */
export function deriveBenefitShare(input) {
  if (!input || typeof input !== "object" || input.type !== "DeriveBenefitShareRequest" || input.version !== 1) {
    throw new TypeError("derive-benefit-share: input must be a DeriveBenefitShareRequest@1 record");
  }
  const shares = validateShares(input.shares);
  const record = validateRecord(input.record);
  const unitsSoldFraction = parseDecimalFraction(input.unitsSold, "input.unitsSold");
  const retailUnitPrice = validatePriceWithUnit(input.retailUnitPrice, "input.retailUnitPrice");
  const royaltyBase = input.royaltyBase === undefined ? null : validatePriceWithUnit(input.royaltyBase, "input.royaltyBase");
  const notFoundInputs = input.notFoundInputs === undefined ? [] : validateNotFoundInputs(input.notFoundInputs);

  const producerPrice = shares.positions[0].prices[0];
  const producerFraction = parseDecimalFraction(producerPrice.unitPrice, "input.shares.positions[0].prices[0].unitPrice");

  const evidenceLabels = [];
  const notFound = [...notFoundInputs];
  const kind = record.share.kind;
  const shareValue = record.share.value;
  let perUnit = null;
  let basis;

  if (kind === "royalty") {
    if (royaltyBase === null) {
      basis = "unknown";
      notFound.push("input.royaltyBase");
    } else {
      perUnit = percentOf(royaltyBase.fraction, shareValue);
      basis = `${shareValue} percent of the licensee's named royalty base (${royaltyBase.unitPrice} ${royaltyBase.unit})`;
      evidenceLabels.push(composeEvidenceLabel(royaltyBase.source));
    }
  } else if (kind === "net-sales") {
    perUnit = percentOf(retailUnitPrice.fraction, shareValue);
    basis = `${shareValue} percent of the retail price (${retailUnitPrice.unitPrice} ${retailUnitPrice.unit})`;
    evidenceLabels.push(composeEvidenceLabel(retailUnitPrice.source));
  } else if (kind === "milestone") {
    perUnit = null;
    basis = `${shareValue} percent of milestone payments; milestone payments are not priced per unit sold and are passed through, not computed`;
  } else if (kind === "multiple-of-market") {
    const multipleFraction = parseDecimalFraction(shareValue, "input.record.share.value");
    perUnit = multiplyFractions(multipleFraction, producerFraction);
    basis = `${shareValue}x the producer's position price (${producerPrice.unitPrice} ${producerPrice.unit})`;
    evidenceLabels.push(producerPrice.evidenceLabel);
  } else {
    perUnit = ZERO_FRACTION;
    basis = "the agreement carries no share term (share.kind is \"none\")";
  }

  const total = perUnit === null ? null : multiplyFractions(perUnit, unitsSoldFraction);

  let floor = null;
  let floorMet = true;
  if (record.floor !== null) {
    const expectedUnit = `${record.floor.unit} per ${record.floor.per}`;
    const producerUnit = producerPrice.unit;
    if (expectedUnit === producerUnit) {
      const floorFraction = parseDecimalFraction(record.floor.amount, "input.record.floor.amount");
      floorMet = compareFractionGte(producerFraction, floorFraction);
    } else {
      floorMet = false;
      notFound.push(`floor comparison: record.floor's unit ${JSON.stringify(expectedUnit)} is not comparable to the producer position's unit ${JSON.stringify(producerUnit)}`);
    }
    floor = {
      amount: record.floor.amount,
      unit: record.floor.unit,
      per: record.floor.per,
      producerPositionUnitPrice: producerPrice.unitPrice,
      producerPositionUnit: producerPrice.unit,
      met: floorMet,
    };
    evidenceLabels.push(producerPrice.evidenceLabel);
  }

  const shareResolved = !(kind === "royalty" && royaltyBase === null);
  const meetsAgreement = floorMet && shareResolved;

  return Object.freeze({
    type: "BenefitShareReading",
    version: 1,
    shareKind: kind,
    shareValue,
    perUnit: perUnit === null ? null : fractionToStrings(perUnit),
    total: total === null ? null : fractionToStrings(total),
    basis,
    floor,
    meetsAgreement,
    evidenceLabels: Object.freeze([...new Set(evidenceLabels)]),
    notFound: Object.freeze([...new Set(notFound)]),
  });
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "derive-benefit-share", description: "Derives what a benefit-sharing agreement returns to the territory per unit and for the request's unitsSold, computed by the record's share.kind: royalty and net-sales as the exact percent of a named base (the request's retailUnitPrice for net-sales; for royalty, the request's royaltyBase, or \"unknown\" when the request does not name one), milestone as the record's stated percent passed through with perUnit null (a milestone payment is not priced per unit sold), multiple-of-market as the record's multiple applied to the producer's position's primary unit price from shares, and none as the exact fraction zero with the reason.", operation: deriveBenefitShare }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
