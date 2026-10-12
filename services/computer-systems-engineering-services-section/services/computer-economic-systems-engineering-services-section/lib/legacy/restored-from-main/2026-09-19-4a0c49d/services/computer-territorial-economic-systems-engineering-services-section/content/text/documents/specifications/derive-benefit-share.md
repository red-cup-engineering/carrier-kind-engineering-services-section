# derive-benefit-share
## Requirements
- `royalty-percent-of-named-base`: When record.share.kind is "royalty" and the request names royaltyBase, the operation must compute perUnit as the exact fraction record.share.value percent of royaltyBase.unitPrice; when the request does not name royaltyBase, the operation must return perUnit and total as null and basis as the literal string "unknown".
- `net-sales-percent-of-retail`: When record.share.kind is "net-sales", the operation must compute perUnit as the exact fraction record.share.value percent of the request's retailUnitPrice.unitPrice.
- `milestone-passthrough-null-per-unit`: When record.share.kind is "milestone", the operation must return perUnit and total as null and must carry record.share.value unchanged in the result's shareValue field, since a milestone payment is not priced per unit sold.
- `multiple-of-market-times-producer-price`: When record.share.kind is "multiple-of-market", the operation must compute perUnit as the exact fraction record.share.value multiplied by the producer's position's primary (first-listed) unit price from shares.positions[0].
- `none-zero-with-reason`: When record.share.kind is "none", the operation must return perUnit and total as the exact fraction zero and must state the reason in basis.
- `total-is-per-unit-times-units-sold`: Whenever perUnit is not null, the operation must compute total as the exact fraction perUnit multiplied by the request's unitsSold, and must return total as null exactly when perUnit is null.
- `floor-checked-against-producer-position-price`: Whenever record.floor is not null, the operation must compute floor.met by comparing the producer's position's primary unit price from shares.positions[0] against floor.amount, true when the producer price is greater than or equal to the floor amount in the same unit (floor.unit followed by " per " followed by floor.per, string-equal to the producer position's unit), and must set floor.met to false and add a notFound entry naming the mismatch when the units are not string-equal.
- `meets-agreement-combines-floor-and-share`: The operation must return meetsAgreement true exactly when (record.floor is null or floor.met is true) and the share reading was resolved (not the royalty-missing-royaltyBase "unknown" case).
- `evidence-label-every-figure-used`: The operation must append to evidenceLabels the composed evidence label of every priced figure it actually used to compute perUnit or floor.met (the producer position's evidenceLabel, the request's retailUnitPrice or royaltyBase source), with no duplicate label appearing twice.
- `not-found-for-unrepresentable-figures`: The operation must append to notFound a plain descriptive string for every figure it could not resolve or represent on its own, at minimum a missing royaltyBase for a "royalty" record and a unit-incompatible floor comparison.
- `contested-producer-position-uses-primary-price`: When shares.positions[0] carries two contested prices, the operation must use only its first-listed (primary) price for multiple-of-market and floor comparisons, matching derive-value-chain-shares-service's own "primary (first-listed) unit price" convention.
- `caller-supplied-not-found-inputs-passed-through`: When the request names notFoundInputs, the operation must include each named string in the result's notFound array unchanged, alongside any it derives itself, deduplicated.
## Prohibitions
- `no-float-arithmetic`: The operation must not convert any unit price, share value, floor amount, or unitsSold through a JavaScript floating-point number; all percent and multiple computation is exact BigInt-scaled fraction reduction.
- `no-nonpositive-units-sold`: The operation must not accept a zero or negative unitsSold.
- `no-nonpositive-retail-unit-price`: The operation must not accept a zero or negative retailUnitPrice.unitPrice or, when named, royaltyBase.unitPrice.
- `no-share-kind-outside-enum`: The operation must refuse a record.share.kind outside "royalty", "net-sales", "milestone", "multiple-of-market", "none".
- `no-nonpositive-share-value`: The operation must not accept a zero or negative record.share.value when record.share.kind is not "none", and must not accept a non-null record.share.value when record.share.kind is "none".
- `no-nonpositive-floor-amount`: The operation must not accept a zero or negative record.floor.amount when record.floor is not null.
- `no-fewer-than-two-share-positions`: The operation must not accept a shares.positions array with fewer than two positions, matching derive-value-chain-shares-service's own minimum.
## Laws
- `value-chain-share-definition` | Humanities and Social Sciences Communications (Nature) | 2023 | https://www.nature.com/articles/s41599-023-01770-3 | Applies to multiple-of-market-times-producer-price, floor-checked-against-producer-position-price, contested-producer-position-uses-primary-price, no-fewer-than-two-share-positions. | A value-chain markup is the exact ratio between a downstream position's unit price and an upstream position's unit price; the producer's own position price is the base a floor or a market-multiple share is measured against.
- `nagoya-protocol-monetary-benefits` | Convention on Biological Diversity | 2010 (adopted); in force 2014 | https://www.cbd.int/abs/doc/protocol/nagoya-protocol-en.pdf | Applies to royalty-percent-of-named-base, net-sales-percent-of-retail, milestone-passthrough-null-per-unit, none-zero-with-reason, meets-agreement-combines-floor-and-share, no-share-kind-outside-enum. | The Nagoya Protocol's Annex lists the monetary forms of benefit sharing, including up-front payments, milestone payments, royalties on sales, and licence fees upon commercialization; this operation's share.kind enumeration names exactly the sales-based forms (royalty, net-sales, milestone, a market-multiple, or none), and an unresolved or unnamed base is reported as unknown rather than assumed.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to evidence-label-every-figure-used, not-found-for-unrepresentable-figures, caller-supplied-not-found-inputs-passed-through. | The package uses one executable ESM operation source file with no runtime dependencies.
- `ieee-754-float-avoidance` | IEEE | 754-2019 | https://ieeexplore.ieee.org/document/8766229 | Applies to total-is-per-unit-times-units-sold, no-float-arithmetic, no-nonpositive-units-sold, no-nonpositive-retail-unit-price, no-nonpositive-share-value, no-nonpositive-floor-amount. | Binary floating-point arithmetic (IEEE 754) cannot represent most decimal fractions exactly, so exact per-unit and total benefit-share amounts use BigInt-scaled rational arithmetic instead of any floating-point conversion, and every positivity check operates on the same exact decimal-string parse.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-benefit-share-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-benefit-share.mjs
#!/usr/bin/env node
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
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "deriveBenefitShare — Derives what a benefit-sharing agreement returns to the territory per unit and for the request's unitsSold, computed by the record's share.kind: royalty and net-sales as the exact percent of a named base (the request's retailUnitPrice for net-sales; for royalty, the request's royaltyBase, or \"unknown\" when the request does not name one), milestone as the record's stated percent passed through with perUnit null (a milestone payment is not priced per unit sold), multiple-of-market as the record's multiple applied to the producer's position's primary unit price from shares, and none as the exact fraction zero with the reason. Also computes whether the record's floor (if any) is met against the producer's position price, an overall meetsAgreement boolean, the evidence label of every figure used, and a notFound list naming every figure the reading could not resolve or represent. Pure, no I/O, no clock; every amount is an exact reduced BigInt fraction, never a floating-point approximation.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length === 0) continue;
      try {
        process.stdout.write(`${JSON.stringify(deriveBenefitShare(JSON.parse(line)))}\n`);
      } catch (error) {
        process.stderr.write(`${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n`);
        process.exitCode = 1;
      }
    }
  }
}

```
## Tests
```mjs path=test/derive-benefit-share.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { deriveBenefitShare } from "../scripts/derive-benefit-share.mjs";

const COCAINE_SHARES = {
  type: "ValueChainShareSet", version: 1, positionCount: 5,
  retailPositionName: "street-cut equivalent", retailUnitPrice: "150000", retailUnit: "USD per kilogram",
  positions: [
    { name: "coca paste", contested: false, prices: [{ unitPrice: "900", unit: "USD per kilogram", share: { numerator: "3", denominator: "500" }, multiplierFromPrevious: null, evidenceLabel: "Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)" }] },
    { name: "Colombian export", contested: false, prices: [{ unitPrice: "1654", unit: "USD per kilogram", share: { numerator: "827", denominator: "75000" }, multiplierFromPrevious: { numerator: "827", denominator: "450" }, evidenceLabel: "x" }] },
    { name: "transit", contested: false, prices: [{ unitPrice: "10000", unit: "USD per kilogram", share: { numerator: "1", denominator: "15" }, multiplierFromPrevious: { numerator: "5000", denominator: "827" }, evidenceLabel: "x" }] },
    { name: "United States wholesale", contested: false, prices: [{ unitPrice: "70000", unit: "USD per kilogram", share: { numerator: "7", denominator: "15" }, multiplierFromPrevious: { numerator: "7", denominator: "1" }, evidenceLabel: "x" }] },
    { name: "street-cut equivalent", contested: false, prices: [{ unitPrice: "150000", unit: "USD per kilogram", share: { numerator: "1", denominator: "1" }, multiplierFromPrevious: { numerator: "15", denominator: "7" }, evidenceLabel: "x" }] },
  ],
};

const RETAIL_UNIT_PRICE = { unitPrice: "150000", unit: "USD per kilogram", source: { sourceUrl: "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html", sourceTitle: "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance" } };

const HOODIA_ROYALTY_RECORD = {
  type: "561GroupBenefitSharingRecord",
  holder: { kind: "nation", name: "South African San Council" },
  material: { commonName: "Hoodia gordonii", scientificName: "Hoodia gordonii", materialKind: "species" },
  territory: "lib/emsenn/services/561-group/services/science-services-section/services/natural-science-services-section",
  consentScope: { catalogue: true, sell: true, name: true, neverLeaves: [] },
  share: { kind: "royalty", value: "6" },
  floor: null, effectiveFrom: "2003-01-01", expiresOn: null, references: [], charge: { support: true, refutation: false },
};

const EQUAL_EXCHANGE_RECORD = {
  type: "561GroupBenefitSharingRecord",
  holder: { kind: "household", name: "withheld" },
  material: { commonName: "coffee", scientificName: "Coffea arabica", materialKind: "species" },
  territory: "lib/emsenn/services/561-group/services/science-services-section/services/natural-science-services-section",
  consentScope: { catalogue: true, sell: true, name: false, neverLeaves: [] },
  share: { kind: "multiple-of-market", value: "2" },
  floor: null, effectiveFrom: "1986-01-01", expiresOn: null, references: [], charge: { support: true, refutation: false },
};

const FAIRTRADE_SHARES = {
  type: "ValueChainShareSet", version: 1, positionCount: 2,
  retailPositionName: "Ghana Fairtrade cooperative, Minimum Price plus Premium", retailUnitPrice: "3775", retailUnit: "USD per tonne",
  positions: [
    { name: "Ghana Fairtrade cooperative, Minimum Price", contested: false, prices: [{ unitPrice: "3500", unit: "USD per tonne", share: { numerator: "140", denominator: "151" }, multiplierFromPrevious: null, evidenceLabel: "Comunicaffe (https://www.comunicaffe.com/fairtrade-boosts-support-for-cocoa-farmers-and-sets-new-minimum-price/)" }] },
    { name: "Ghana Fairtrade cooperative, Minimum Price plus Premium", contested: false, prices: [{ unitPrice: "3775", unit: "USD per tonne", share: { numerator: "1", denominator: "1" }, multiplierFromPrevious: { numerator: "151", denominator: "140" }, evidenceLabel: "x" }] },
  ],
};

const FAIRTRADE_RECORD = {
  type: "561GroupBenefitSharingRecord",
  holder: { kind: "household", name: "withheld" },
  material: { commonName: "cocoa", scientificName: "Theobroma cacao", materialKind: "species" },
  territory: "lib/emsenn/services/561-group/services/science-services-section/services/natural-science-services-section",
  consentScope: { catalogue: true, sell: true, name: false, neverLeaves: [] },
  share: { kind: "none", value: null },
  floor: { amount: "3500", unit: "USD", per: "tonne" },
  effectiveFrom: "2026-10-01", expiresOn: null, references: [], charge: { support: true, refutation: false },
};

function baseRequest(overrides = {}) {
  return {
    type: "DeriveBenefitShareRequest", version: 1,
    shares: COCAINE_SHARES, record: HOODIA_ROYALTY_RECORD, unitsSold: "1000", retailUnitPrice: RETAIL_UNIT_PRICE,
    ...overrides,
  };
}

test("refuses a non-DeriveBenefitShareRequest input", () => {
  assert.throws(() => deriveBenefitShare({}), /must be a DeriveBenefitShareRequest/u);
});

test("refuses shares with fewer than two positions", () => {
  assert.throws(() => deriveBenefitShare(baseRequest({ shares: { ...COCAINE_SHARES, positions: [COCAINE_SHARES.positions[0]] } })), /at least two positions/u);
});

test("refuses an unsupported share.kind", () => {
  const record = { ...HOODIA_ROYALTY_RECORD, share: { kind: "bribery", value: "6" } };
  assert.throws(() => deriveBenefitShare(baseRequest({ record })), /share\.kind must be one of/u);
});

test("refuses a zero or negative unitsSold", () => {
  assert.throws(() => deriveBenefitShare(baseRequest({ unitsSold: "0" })), /input\.unitsSold must be a positive decimal/u);
  assert.throws(() => deriveBenefitShare(baseRequest({ unitsSold: "-5" })), /input\.unitsSold must be a positive decimal/u);
});

test("refuses a zero or negative retailUnitPrice.unitPrice", () => {
  assert.throws(() => deriveBenefitShare(baseRequest({ retailUnitPrice: { ...RETAIL_UNIT_PRICE, unitPrice: "0" } })), /input\.retailUnitPrice\.unitPrice must be a positive decimal/u);
});

test("refuses a zero or negative record.share.value for a percent- or multiple-based kind", () => {
  const record = { ...HOODIA_ROYALTY_RECORD, share: { kind: "royalty", value: "-1" } };
  assert.throws(() => deriveBenefitShare(baseRequest({ record, royaltyBase: RETAIL_UNIT_PRICE })), /input\.record\.share\.value must be a positive decimal/u);
});

test("refuses a zero or negative record.floor.amount", () => {
  const record = { ...FAIRTRADE_RECORD, floor: { amount: "0", unit: "USD", per: "tonne" } };
  assert.throws(() => deriveBenefitShare(baseRequest({ record, shares: FAIRTRADE_SHARES })), /input\.record\.floor\.amount must be a positive decimal/u);
});

test("refuses record.share.value not null when share.kind is \"none\"", () => {
  const record = { ...FAIRTRADE_RECORD, share: { kind: "none", value: "1" } };
  assert.throws(() => deriveBenefitShare(baseRequest({ record, shares: FAIRTRADE_SHARES })), /must be null when share\.kind is "none"/u);
});

test("royalty with a named royaltyBase computes the exact percent-of-base perUnit and total", () => {
  const result = deriveBenefitShare(baseRequest({
    royaltyBase: { unitPrice: "70000", unit: "USD per kilogram", source: { sourceUrl: "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html", sourceTitle: "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance", rangeNote: "the licensee's (United States wholesale) position price named as the royalty base" } },
  }));
  assert.equal(result.shareKind, "royalty");
  assert.equal(result.shareValue, "6");
  assert.deepEqual(result.perUnit, { numerator: "4200", denominator: "1" });
  assert.deepEqual(result.total, { numerator: "4200000", denominator: "1" });
  assert.equal(result.meetsAgreement, true);
  assert.equal(result.notFound.length, 0);
});

test("royalty with no named royaltyBase reports unknown and refuses to meet the agreement", () => {
  const result = deriveBenefitShare(baseRequest({}));
  assert.equal(result.perUnit, null);
  assert.equal(result.total, null);
  assert.equal(result.basis, "unknown");
  assert.equal(result.meetsAgreement, false);
  assert.deepEqual(result.notFound, ["input.royaltyBase"]);
});

test("milestone passes the record's stated percent through with perUnit and total null", () => {
  const record = { ...HOODIA_ROYALTY_RECORD, share: { kind: "milestone", value: "8" } };
  const result = deriveBenefitShare(baseRequest({ record }));
  assert.equal(result.shareValue, "8");
  assert.equal(result.perUnit, null);
  assert.equal(result.total, null);
  assert.equal(result.meetsAgreement, true);
  assert.match(result.basis, /not priced per unit sold/u);
});

test("multiple-of-market computes the exact multiple of the producer's position price", () => {
  const result = deriveBenefitShare({
    type: "DeriveBenefitShareRequest", version: 1,
    shares: COCAINE_SHARES, record: EQUAL_EXCHANGE_RECORD, unitsSold: "500", retailUnitPrice: RETAIL_UNIT_PRICE,
  });
  assert.deepEqual(result.perUnit, { numerator: "1800", denominator: "1" });
  assert.deepEqual(result.total, { numerator: "900000", denominator: "1" });
  assert.equal(result.meetsAgreement, true);
  assert.deepEqual(result.evidenceLabels, ["Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"]);
});

test("none with a met floor returns the exact zero share and floor.met true", () => {
  const result = deriveBenefitShare({
    type: "DeriveBenefitShareRequest", version: 1,
    shares: FAIRTRADE_SHARES, record: FAIRTRADE_RECORD, unitsSold: "10",
    retailUnitPrice: { unitPrice: "3775", unit: "USD per tonne", source: { sourceUrl: "https://www.comunicaffe.com/fairtrade-boosts-support-for-cocoa-farmers-and-sets-new-minimum-price/", sourceTitle: "Fairtrade sets new Minimum Price and Premium for cocoa farmers, Comunicaffe" } },
  });
  assert.deepEqual(result.perUnit, { numerator: "0", denominator: "1" });
  assert.deepEqual(result.total, { numerator: "0", denominator: "1" });
  assert.equal(result.floor.met, true);
  assert.equal(result.meetsAgreement, true);
});

test("a floor whose unit is not comparable to the producer position's unit is reported not met, with a notFound entry", () => {
  const result = deriveBenefitShare(baseRequest({ record: FAIRTRADE_RECORD }));
  assert.equal(result.floor.met, false);
  assert.equal(result.meetsAgreement, false);
  assert.match(result.notFound[0], /is not comparable to the producer position's unit/u);
});

test("a floor whose unit matches but whose amount is not reached is reported not met, with no notFound entry", () => {
  const belowFloorShares = {
    ...FAIRTRADE_SHARES,
    positions: [
      { name: "below-floor producer", contested: false, prices: [{ unitPrice: "3000", unit: "USD per tonne", share: { numerator: "1", denominator: "1" }, multiplierFromPrevious: null, evidenceLabel: "generic test evidence" }] },
      FAIRTRADE_SHARES.positions[1],
    ],
  };
  const result = deriveBenefitShare({
    type: "DeriveBenefitShareRequest", version: 1,
    shares: belowFloorShares, record: FAIRTRADE_RECORD, unitsSold: "10",
    retailUnitPrice: { unitPrice: "3775", unit: "USD per tonne", source: { sourceUrl: "https://example.test/generic", sourceTitle: "generic test source" } },
  });
  assert.equal(result.floor.met, false);
  assert.equal(result.meetsAgreement, false);
  assert.equal(result.notFound.length, 0);
});

test("notFoundInputs is passed straight through into the result's notFound", () => {
  const premiumNote = "record.share: a $275 per tonne Fairtrade Premium is cited in the source incumbent row but is outside this schema's share.kind representation; not computed by this reading";
  const result = deriveBenefitShare({
    type: "DeriveBenefitShareRequest", version: 1,
    shares: FAIRTRADE_SHARES, record: FAIRTRADE_RECORD, unitsSold: "10",
    retailUnitPrice: { unitPrice: "3775", unit: "USD per tonne", source: { sourceUrl: "https://www.comunicaffe.com/fairtrade-boosts-support-for-cocoa-farmers-and-sets-new-minimum-price/", sourceTitle: "Fairtrade sets new Minimum Price and Premium for cocoa farmers, Comunicaffe" } },
    notFoundInputs: [premiumNote],
  });
  assert.deepEqual(result.notFound, [premiumNote]);
});

test("a contested producer position uses only its primary (first-listed) price", () => {
  const contestedShares = {
    ...COCAINE_SHARES,
    positions: [
      { name: "coca paste", contested: true, prices: [
        { unitPrice: "900", unit: "USD per kilogram", share: { numerator: "3", denominator: "500" }, multiplierFromPrevious: null, evidenceLabel: "primary evidence" },
        { unitPrice: "950", unit: "USD per kilogram", share: { numerator: "19", denominator: "3000" }, multiplierFromPrevious: null, evidenceLabel: "secondary evidence" },
      ] },
      ...COCAINE_SHARES.positions.slice(1),
    ],
  };
  const result = deriveBenefitShare({
    type: "DeriveBenefitShareRequest", version: 1,
    shares: contestedShares, record: EQUAL_EXCHANGE_RECORD, unitsSold: "500", retailUnitPrice: RETAIL_UNIT_PRICE,
  });
  assert.deepEqual(result.perUnit, { numerator: "1800", denominator: "1" });
  assert.deepEqual(result.evidenceLabels, ["primary evidence"]);
});

test("evidenceLabels never repeats the same label when the producer position's price is used twice", () => {
  const record = { ...EQUAL_EXCHANGE_RECORD, floor: { amount: "100", unit: "USD", per: "kilogram" } };
  const result = deriveBenefitShare({
    type: "DeriveBenefitShareRequest", version: 1,
    shares: COCAINE_SHARES, record, unitsSold: "500", retailUnitPrice: RETAIL_UNIT_PRICE,
  });
  assert.equal(result.evidenceLabels.length, 1);
  assert.equal(result.floor.met, true);
});

```
## Examples
```json name="the CSIR/South African San Council Hoodia benefit-sharing agreement's 6 percent royalty, read over the value-chain lot's cocaine farm-to-street price ladder (the royalty base named as the licensee's United States wholesale position price)"
{"input":{"type":"DeriveBenefitShareRequest","version":1,"shares":{"type":"ValueChainShareSet","version":1,"positionCount":5,"retailPositionName":"street-cut equivalent","retailUnitPrice":"150000","retailUnit":"USD per kilogram","positions":[{"name":"coca paste","contested":false,"prices":[{"unitPrice":"900","unit":"USD per kilogram","share":{"numerator":"3","denominator":"500"},"multiplierFromPrevious":null,"evidenceLabel":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"}]},{"name":"Colombian export","contested":false,"prices":[{"unitPrice":"1654","unit":"USD per kilogram","share":{"numerator":"827","denominator":"75000"},"multiplierFromPrevious":{"numerator":"827","denominator":"450"},"evidenceLabel":"Colombia: average price of cocaine 2021, Statista (https://www.statista.com/statistics/1376841/average-price-of-cocaine-products-by-region-colombia/)"}]},{"name":"transit","contested":false,"prices":[{"unitPrice":"10000","unit":"USD per kilogram","share":{"numerator":"1","denominator":"15"},"multiplierFromPrevious":{"numerator":"5000","denominator":"827"},"evidenceLabel":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"}]},{"name":"United States wholesale","contested":false,"prices":[{"unitPrice":"70000","unit":"USD per kilogram","share":{"numerator":"7","denominator":"15"},"multiplierFromPrevious":{"numerator":"7","denominator":"1"},"evidenceLabel":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"}]},{"name":"street-cut equivalent","contested":false,"prices":[{"unitPrice":"150000","unit":"USD per kilogram","share":{"numerator":"1","denominator":"1"},"multiplierFromPrevious":{"numerator":"15","denominator":"7"},"evidenceLabel":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"}]}]},"record":{"type":"561GroupBenefitSharingRecord","holder":{"kind":"nation","name":"South African San Council"},"material":{"commonName":"Hoodia gordonii","scientificName":"Hoodia gordonii","materialKind":"species"},"territory":"lib/emsenn/services/561-group/services/science-services-section/services/natural-science-services-section","consentScope":{"catalogue":true,"sell":true,"name":true,"neverLeaves":[]},"share":{"kind":"royalty","value":"6"},"floor":null,"effectiveFrom":"2003-01-01","expiresOn":null,"references":[],"charge":{"support":true,"refutation":false}},"unitsSold":"1000","retailUnitPrice":{"unitPrice":"150000","unit":"USD per kilogram","source":{"sourceUrl":"https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html","sourceTitle":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"}},"royaltyBase":{"unitPrice":"70000","unit":"USD per kilogram","source":{"sourceUrl":"https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html","sourceTitle":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance","rangeNote":"the licensee's (United States wholesale) position price named as the royalty base"}}},"output":{"type":"BenefitShareReading","version":1,"shareKind":"royalty","shareValue":"6","perUnit":{"numerator":"4200","denominator":"1"},"total":{"numerator":"4200000","denominator":"1"},"basis":"6 percent of the licensee's named royalty base (70000 USD per kilogram)","floor":null,"meetsAgreement":true,"evidenceLabels":["Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html); the licensee's (United States wholesale) position price named as the royalty base"],"notFound":[]}}
```
```json name="Fairtrade International's Ghana cocoa Minimum Price floor of $3,500 per tonne, share.kind none, floor met; the $275 per tonne Premium is outside this schema and named in notFoundInputs"
{"input":{"type":"DeriveBenefitShareRequest","version":1,"shares":{"type":"ValueChainShareSet","version":1,"positionCount":2,"retailPositionName":"Ghana Fairtrade cooperative, Minimum Price plus Premium","retailUnitPrice":"3775","retailUnit":"USD per tonne","positions":[{"name":"Ghana Fairtrade cooperative, Minimum Price","contested":false,"prices":[{"unitPrice":"3500","unit":"USD per tonne","share":{"numerator":"140","denominator":"151"},"multiplierFromPrevious":null,"evidenceLabel":"Fairtrade sets new Minimum Price and Premium for cocoa farmers, Comunicaffe (https://www.comunicaffe.com/fairtrade-boosts-support-for-cocoa-farmers-and-sets-new-minimum-price/); The Fairtrade Minimum Price for conventional cocoa increases by 45% to US$3,500 per tonne in Ghana, effective 1 October 2026"}]},{"name":"Ghana Fairtrade cooperative, Minimum Price plus Premium","contested":false,"prices":[{"unitPrice":"3775","unit":"USD per tonne","share":{"numerator":"1","denominator":"1"},"multiplierFromPrevious":{"numerator":"151","denominator":"140"},"evidenceLabel":"Fairtrade sets new Minimum Price and Premium for cocoa farmers, Comunicaffe (https://www.comunicaffe.com/fairtrade-boosts-support-for-cocoa-farmers-and-sets-new-minimum-price/); Minimum Price $3,500 per tonne plus the Fairtrade Premium of $275 per tonne, both effective 1 October 2026 (Ghana/Côte d'Ivoire)"}]}]},"record":{"type":"561GroupBenefitSharingRecord","holder":{"kind":"household","name":"withheld"},"material":{"commonName":"cocoa","scientificName":"Theobroma cacao","materialKind":"species"},"territory":"lib/emsenn/services/561-group/services/science-services-section/services/natural-science-services-section","consentScope":{"catalogue":true,"sell":true,"name":false,"neverLeaves":[]},"share":{"kind":"none","value":null},"floor":{"amount":"3500","unit":"USD","per":"tonne"},"effectiveFrom":"2026-10-01","expiresOn":null,"references":[],"charge":{"support":true,"refutation":false}},"unitsSold":"10","retailUnitPrice":{"unitPrice":"3775","unit":"USD per tonne","source":{"sourceUrl":"https://www.comunicaffe.com/fairtrade-boosts-support-for-cocoa-farmers-and-sets-new-minimum-price/","sourceTitle":"Fairtrade sets new Minimum Price and Premium for cocoa farmers, Comunicaffe"}},"notFoundInputs":["record.share: a $275 per tonne Fairtrade Premium is cited in the source incumbent row (2026-09-05-hopeium-incumbent-measurement.json) but is outside this schema's share.kind representation (net-sales.value is a percent, not a flat currency amount, and floor is a single guaranteed amount, not a top-up); not computed by this reading"]},"output":{"type":"BenefitShareReading","version":1,"shareKind":"none","shareValue":null,"perUnit":{"numerator":"0","denominator":"1"},"total":{"numerator":"0","denominator":"1"},"basis":"the agreement carries no share term (share.kind is \"none\")","floor":{"amount":"3500","unit":"USD","per":"tonne","producerPositionUnitPrice":"3500","producerPositionUnit":"USD per tonne","met":true},"meetsAgreement":true,"evidenceLabels":["Fairtrade sets new Minimum Price and Premium for cocoa farmers, Comunicaffe (https://www.comunicaffe.com/fairtrade-boosts-support-for-cocoa-farmers-and-sets-new-minimum-price/); The Fairtrade Minimum Price for conventional cocoa increases by 45% to US$3,500 per tonne in Ghana, effective 1 October 2026"],"notFound":["record.share: a $275 per tonne Fairtrade Premium is cited in the source incumbent row (2026-09-05-hopeium-incumbent-measurement.json) but is outside this schema's share.kind representation (net-sales.value is a percent, not a flat currency amount, and floor is a single guaranteed amount, not a top-up); not computed by this reading"]}}
```
```json name="Equal Exchange's more-than-twice-the-going-rate benefit (2x), applied to the value-chain lot's cocaine ladder's producer position purely as a numeric fixture"
{"input":{"type":"DeriveBenefitShareRequest","version":1,"shares":{"type":"ValueChainShareSet","version":1,"positionCount":5,"retailPositionName":"street-cut equivalent","retailUnitPrice":"150000","retailUnit":"USD per kilogram","positions":[{"name":"coca paste","contested":false,"prices":[{"unitPrice":"900","unit":"USD per kilogram","share":{"numerator":"3","denominator":"500"},"multiplierFromPrevious":null,"evidenceLabel":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"}]},{"name":"Colombian export","contested":false,"prices":[{"unitPrice":"1654","unit":"USD per kilogram","share":{"numerator":"827","denominator":"75000"},"multiplierFromPrevious":{"numerator":"827","denominator":"450"},"evidenceLabel":"Colombia: average price of cocaine 2021, Statista (https://www.statista.com/statistics/1376841/average-price-of-cocaine-products-by-region-colombia/)"}]},{"name":"transit","contested":false,"prices":[{"unitPrice":"10000","unit":"USD per kilogram","share":{"numerator":"1","denominator":"15"},"multiplierFromPrevious":{"numerator":"5000","denominator":"827"},"evidenceLabel":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"}]},{"name":"United States wholesale","contested":false,"prices":[{"unitPrice":"70000","unit":"USD per kilogram","share":{"numerator":"7","denominator":"15"},"multiplierFromPrevious":{"numerator":"7","denominator":"1"},"evidenceLabel":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"}]},{"name":"street-cut equivalent","contested":false,"prices":[{"unitPrice":"150000","unit":"USD per kilogram","share":{"numerator":"1","denominator":"1"},"multiplierFromPrevious":{"numerator":"15","denominator":"7"},"evidenceLabel":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"}]}]},"record":{"type":"561GroupBenefitSharingRecord","holder":{"kind":"household","name":"withheld"},"material":{"commonName":"coffee","scientificName":"Coffea arabica","materialKind":"species"},"territory":"lib/emsenn/services/561-group/services/science-services-section/services/natural-science-services-section","consentScope":{"catalogue":true,"sell":true,"name":false,"neverLeaves":[]},"share":{"kind":"multiple-of-market","value":"2"},"floor":null,"effectiveFrom":"1986-01-01","expiresOn":null,"references":[],"charge":{"support":true,"refutation":false}},"unitsSold":"500","retailUnitPrice":{"unitPrice":"150000","unit":"USD per kilogram","source":{"sourceUrl":"https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html","sourceTitle":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"}}},"output":{"type":"BenefitShareReading","version":1,"shareKind":"multiple-of-market","shareValue":"2","perUnit":{"numerator":"1800","denominator":"1"},"total":{"numerator":"900000","denominator":"1"},"basis":"2x the producer's position price (900 USD per kilogram)","floor":null,"meetsAgreement":true,"evidenceLabels":["Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"],"notFound":[]}}
```
## Traceability
- `royalty-percent-of-named-base` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `nagoya-protocol-monetary-benefits`
- `net-sales-percent-of-retail` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `nagoya-protocol-monetary-benefits`
- `milestone-passthrough-null-per-unit` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `nagoya-protocol-monetary-benefits`
- `multiple-of-market-times-producer-price` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `value-chain-share-definition`
- `none-zero-with-reason` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `nagoya-protocol-monetary-benefits`
- `total-is-per-unit-times-units-sold` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `ieee-754-float-avoidance`
- `floor-checked-against-producer-position-price` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `value-chain-share-definition`
- `meets-agreement-combines-floor-and-share` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `nagoya-protocol-monetary-benefits`
- `evidence-label-every-figure-used` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `not-found-for-unrepresentable-figures` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `contested-producer-position-uses-primary-price` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `value-chain-share-definition`
- `caller-supplied-not-found-inputs-passed-through` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-float-arithmetic` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `ieee-754-float-avoidance`
- `no-nonpositive-units-sold` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `ieee-754-float-avoidance`
- `no-nonpositive-retail-unit-price` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `ieee-754-float-avoidance`
- `no-share-kind-outside-enum` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `nagoya-protocol-monetary-benefits`
- `no-nonpositive-share-value` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `ieee-754-float-avoidance`
- `no-nonpositive-floor-amount` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `ieee-754-float-avoidance`
- `no-fewer-than-two-share-positions` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `value-chain-share-definition`
