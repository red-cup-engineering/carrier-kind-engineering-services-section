# derive-value-chain-shares
## Requirements
- `producer-price-first`: The operation must return the positions in the same order as the input, so the producer's position (the first input position) is named first in the output.
- `retail-anchor-share`: The operation must compute each priced entry's exact reduced-fraction share of the retail price as that entry's unit price divided by the final (retail) position's unit price.
- `adjacent-position-multiplier`: The operation must compute, for every position after the first, the exact reduced-fraction multiplier between each of that position's priced entries and the immediately preceding position's primary (first-listed) unit price, and must return `null` for the first position's multiplier.
- `contested-price-both-shares`: When a position carries two unit prices, the operation must compute a separate share and multiplier for each price and return both entries under that position, marking the position `contested`.
- `evidence-label-every-row`: The operation must return an evidence label composed from the source row's `sourceTitle` and `sourceUrl` for every priced entry in the output.
## Prohibitions
- `no-float-arithmetic`: The operation must not convert any unit price through a JavaScript floating-point number; all division is exact BigInt-scaled fraction reduction.
- `no-single-position-ladder`: The operation must not accept fewer than two positions, since a share or multiplier is undefined for a single position.
- `no-contested-retail-position`: The operation must not accept more than one unit price at the final (retail) position, since the retail anchor must be single-valued.
- `no-more-than-two-contested-prices`: The operation must not accept more than two unit prices at any position.
- `no-nonpositive-unit-price`: The operation must not accept a zero or negative unit price.
## Laws
- `value-chain-share-definition` | Humanities and Social Sciences Communications (Nature) | 2023 | https://www.nature.com/articles/s41599-023-01770-3 | Applies to retail-anchor-share, adjacent-position-multiplier, contested-price-both-shares, no-single-position-ladder, no-contested-retail-position, no-more-than-two-contested-prices. | A value-chain markup is the exact ratio between a downstream position's unit price and an upstream position's unit price; a position's share of the end price is the exact ratio between that position's unit price and the final (retail) position's unit price.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to producer-price-first, evidence-label-every-row. | The package uses one executable ESM operation source file with no runtime dependencies.
- `ieee-754-float-avoidance` | IEEE | 754-2019 | https://ieeexplore.ieee.org/document/8766229 | Applies to no-float-arithmetic, no-nonpositive-unit-price. | Binary floating-point arithmetic (IEEE 754) cannot represent most decimal fractions exactly, so exact share and multiplier computation uses BigInt-scaled rational arithmetic instead of any floating-point conversion.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-value-chain-shares-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-value-chain-shares.mjs
#!/usr/bin/env node
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
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "deriveValueChainShares — Derives each position's exact share of the retail price and the exact multiplier between adjacent positions along a farm-to-retail price ladder, carrying the evidence label of every priced input row; when a position carries two contested unit prices, both are computed and both are returned under that position. Pure, no I/O, no clock; every ratio is an exact reduced BigInt fraction, never a floating-point approximation.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length === 0) continue;
      try {
        process.stdout.write(`${JSON.stringify(deriveValueChainShares(JSON.parse(line)))}\n`);
      } catch (error) {
        process.stderr.write(`${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n`);
        process.exitCode = 1;
      }
    }
  }
}
```
## Tests
```mjs path=test/derive-value-chain-shares.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { deriveValueChainShares } from "../scripts/derive-value-chain-shares.mjs";

function withPrice(name, unitPrice, sourceUrl = "https://example.test/a", sourceTitle = "Example row") {
  return { name, prices: [{ unitPrice, unit: "USD per kilogram", source: { sourceUrl, sourceTitle } }] };
}

test("refuses a non-PriceLadder input", () => {
  assert.throws(() => deriveValueChainShares({}), /must be a PriceLadder/u);
});

test("refuses fewer than two positions", () => {
  assert.throws(() => deriveValueChainShares({
    type: "PriceLadder", version: 1, positions: [withPrice("coca paste", "900")],
  }), /at least two positions/u);
});

test("refuses more than one unit price at the retail (final) position", () => {
  assert.throws(() => deriveValueChainShares({
    type: "PriceLadder", version: 1,
    positions: [withPrice("coca paste", "900"), {
      name: "street-cut equivalent",
      prices: [
        { unitPrice: "140000", unit: "USD per kilogram", source: { sourceUrl: "https://example.test/a", sourceTitle: "Example row" } },
        { unitPrice: "150000", unit: "USD per kilogram", source: { sourceUrl: "https://example.test/b", sourceTitle: "Example row two" } },
      ],
    }],
  }), /retail \(final\) position must carry exactly one unit price/u);
});

test("refuses more than two unit prices at one position", () => {
  assert.throws(() => deriveValueChainShares({
    type: "PriceLadder", version: 1,
    positions: [{
      name: "coca paste",
      prices: ["1", "2", "3"].map((unitPrice) => ({ unitPrice, unit: "USD per kilogram", source: { sourceUrl: "https://example.test/a", sourceTitle: "Example row" } })),
    }, withPrice("street-cut equivalent", "150000")],
  }), /at most two contested unit prices/u);
});

test("refuses a zero or negative unit price", () => {
  assert.throws(() => deriveValueChainShares({
    type: "PriceLadder", version: 1, positions: [withPrice("coca paste", "0"), withPrice("street-cut equivalent", "150000")],
  }), /must be a positive unit price/u);
  assert.throws(() => deriveValueChainShares({
    type: "PriceLadder", version: 1, positions: [withPrice("coca paste", "-900"), withPrice("street-cut equivalent", "150000")],
  }), /must be a positive unit price/u);
});

test("computes the exact five-position cocaine farm-to-street ladder, low ends of every stated range", () => {
  const result = deriveValueChainShares({
    type: "PriceLadder", version: 1,
    positions: [
      withPrice("coca paste", "900", "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html", "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"),
      withPrice("Colombian export", "1654", "https://www.statista.com/statistics/1376841/average-price-of-cocaine-products-by-region-colombia/", "Colombia: average price of cocaine 2021, Statista"),
      withPrice("transit", "10000", "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html", "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"),
      withPrice("United States wholesale", "70000", "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html", "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"),
      withPrice("street-cut equivalent", "150000", "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html", "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"),
    ],
  });
  assert.equal(result.positionCount, 5);
  assert.equal(result.retailPositionName, "street-cut equivalent");
  assert.equal(result.positions[0].name, "coca paste");
  assert.deepEqual(result.positions[0].prices[0].share, { numerator: "3", denominator: "500" });
  assert.equal(result.positions[0].prices[0].multiplierFromPrevious, null);
  assert.deepEqual(result.positions[1].prices[0].share, { numerator: "827", denominator: "75000" });
  assert.deepEqual(result.positions[1].prices[0].multiplierFromPrevious, { numerator: "827", denominator: "450" });
  assert.deepEqual(result.positions[2].prices[0].share, { numerator: "1", denominator: "15" });
  assert.deepEqual(result.positions[2].prices[0].multiplierFromPrevious, { numerator: "5000", denominator: "827" });
  assert.deepEqual(result.positions[3].prices[0].share, { numerator: "7", denominator: "15" });
  assert.deepEqual(result.positions[3].prices[0].multiplierFromPrevious, { numerator: "7", denominator: "1" });
  assert.deepEqual(result.positions[4].prices[0].share, { numerator: "1", denominator: "1" });
  assert.deepEqual(result.positions[4].prices[0].multiplierFromPrevious, { numerator: "15", denominator: "7" });
});

test("a contested middle position returns both shares and both multipliers, marked contested", () => {
  const result = deriveValueChainShares({
    type: "PriceLadder", version: 1,
    positions: [
      withPrice("coca paste", "900", "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html", "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"),
      {
        name: "Colombian export",
        prices: [
          { unitPrice: "1654", unit: "USD per kilogram", source: { sourceUrl: "https://www.statista.com/statistics/1376841/average-price-of-cocaine-products-by-region-colombia/", sourceTitle: "Colombia: average price of cocaine 2021, Statista", rangeNote: "range $1,654-2,000 per kilogram; low end used" } },
          { unitPrice: "10000", unit: "USD per kilogram", source: { sourceUrl: "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html", sourceTitle: "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance", rangeNote: "range $10,000-20,000 per kilogram; low end used; contested against the Statista export figure for the same chain position" } },
        ],
      },
      withPrice("United States wholesale", "70000", "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html", "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"),
    ],
  });
  const exportPosition = result.positions[1];
  assert.equal(exportPosition.contested, true);
  assert.equal(exportPosition.prices.length, 2);
  assert.deepEqual(exportPosition.prices[0].share, { numerator: "827", denominator: "35000" });
  assert.deepEqual(exportPosition.prices[0].multiplierFromPrevious, { numerator: "827", denominator: "450" });
  assert.deepEqual(exportPosition.prices[1].share, { numerator: "1", denominator: "7" });
  assert.deepEqual(exportPosition.prices[1].multiplierFromPrevious, { numerator: "100", denominator: "9" });
  assert.deepEqual(result.positions[2].prices[0].multiplierFromPrevious, { numerator: "35000", denominator: "827" });
});

test("composes the evidence label from sourceTitle, sourceUrl, and an optional rangeNote", () => {
  const result = deriveValueChainShares({
    type: "PriceLadder", version: 1,
    positions: [
      withPrice("coca paste", "900"),
      {
        name: "street-cut equivalent",
        prices: [{ unitPrice: "150000", unit: "USD per kilogram", source: { sourceUrl: "https://example.test/z", sourceTitle: "Example ladder row", rangeNote: "about $150,000/kg" } }],
      },
    ],
  });
  assert.equal(result.positions[1].prices[0].evidenceLabel, "Example ladder row (https://example.test/z); about $150,000/kg");
});
```
## Examples
```json name="five-position cocaine farm-to-street ladder, Medellín and Cali case, low ends of every stated range"
{"input":{"type":"PriceLadder","version":1,"positions":[{"name":"coca paste","prices":[{"unitPrice":"900","unit":"USD per kilogram","source":{"sourceUrl":"https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html","sourceTitle":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"}}]},{"name":"Colombian export","prices":[{"unitPrice":"1654","unit":"USD per kilogram","source":{"sourceUrl":"https://www.statista.com/statistics/1376841/average-price-of-cocaine-products-by-region-colombia/","sourceTitle":"Colombia: average price of cocaine 2021, Statista","rangeNote":"range $1,654-2,000 per kilogram; low end used"}}]},{"name":"transit","prices":[{"unitPrice":"10000","unit":"USD per kilogram","source":{"sourceUrl":"https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html","sourceTitle":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance","rangeNote":"range $10,000-20,000 per kilogram; low end used"}}]},{"name":"United States wholesale","prices":[{"unitPrice":"70000","unit":"USD per kilogram","source":{"sourceUrl":"https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html","sourceTitle":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance","rangeNote":"range $70,000-80,000 per kilogram; low end used"}}]},{"name":"street-cut equivalent","prices":[{"unitPrice":"150000","unit":"USD per kilogram","source":{"sourceUrl":"https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html","sourceTitle":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"}}]}]},"output":{"type":"ValueChainShareSet","version":1,"positionCount":5,"retailPositionName":"street-cut equivalent","retailUnitPrice":"150000","retailUnit":"USD per kilogram","positions":[{"name":"coca paste","contested":false,"prices":[{"unitPrice":"900","unit":"USD per kilogram","share":{"numerator":"3","denominator":"500"},"multiplierFromPrevious":null,"evidenceLabel":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"}]},{"name":"Colombian export","contested":false,"prices":[{"unitPrice":"1654","unit":"USD per kilogram","share":{"numerator":"827","denominator":"75000"},"multiplierFromPrevious":{"numerator":"827","denominator":"450"},"evidenceLabel":"Colombia: average price of cocaine 2021, Statista (https://www.statista.com/statistics/1376841/average-price-of-cocaine-products-by-region-colombia/); range $1,654-2,000 per kilogram; low end used"}]},{"name":"transit","contested":false,"prices":[{"unitPrice":"10000","unit":"USD per kilogram","share":{"numerator":"1","denominator":"15"},"multiplierFromPrevious":{"numerator":"5000","denominator":"827"},"evidenceLabel":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html); range $10,000-20,000 per kilogram; low end used"}]},{"name":"United States wholesale","contested":false,"prices":[{"unitPrice":"70000","unit":"USD per kilogram","share":{"numerator":"7","denominator":"15"},"multiplierFromPrevious":{"numerator":"7","denominator":"1"},"evidenceLabel":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html); range $70,000-80,000 per kilogram; low end used"}]},{"name":"street-cut equivalent","contested":false,"prices":[{"unitPrice":"150000","unit":"USD per kilogram","share":{"numerator":"1","denominator":"1"},"multiplierFromPrevious":{"numerator":"15","denominator":"7"},"evidenceLabel":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"}]}]}}
```
```json name="three-position ladder with the Colombian export position contested between the Statista and Yahoo Finance figures"
{"input":{"type":"PriceLadder","version":1,"positions":[{"name":"coca paste","prices":[{"unitPrice":"900","unit":"USD per kilogram","source":{"sourceUrl":"https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html","sourceTitle":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"}}]},{"name":"Colombian export","prices":[{"unitPrice":"1654","unit":"USD per kilogram","source":{"sourceUrl":"https://www.statista.com/statistics/1376841/average-price-of-cocaine-products-by-region-colombia/","sourceTitle":"Colombia: average price of cocaine 2021, Statista","rangeNote":"range $1,654-2,000 per kilogram; low end used"}},{"unitPrice":"10000","unit":"USD per kilogram","source":{"sourceUrl":"https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html","sourceTitle":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance","rangeNote":"range $10,000-20,000 per kilogram; low end used; contested against the Statista export figure for the same chain position"}}]},{"name":"United States wholesale","prices":[{"unitPrice":"70000","unit":"USD per kilogram","source":{"sourceUrl":"https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html","sourceTitle":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance","rangeNote":"range $70,000-80,000 per kilogram; low end used"}}]}]},"output":{"type":"ValueChainShareSet","version":1,"positionCount":3,"retailPositionName":"United States wholesale","retailUnitPrice":"70000","retailUnit":"USD per kilogram","positions":[{"name":"coca paste","contested":false,"prices":[{"unitPrice":"900","unit":"USD per kilogram","share":{"numerator":"9","denominator":"700"},"multiplierFromPrevious":null,"evidenceLabel":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"}]},{"name":"Colombian export","contested":true,"prices":[{"unitPrice":"1654","unit":"USD per kilogram","share":{"numerator":"827","denominator":"35000"},"multiplierFromPrevious":{"numerator":"827","denominator":"450"},"evidenceLabel":"Colombia: average price of cocaine 2021, Statista (https://www.statista.com/statistics/1376841/average-price-of-cocaine-products-by-region-colombia/); range $1,654-2,000 per kilogram; low end used"},{"unitPrice":"10000","unit":"USD per kilogram","share":{"numerator":"1","denominator":"7"},"multiplierFromPrevious":{"numerator":"100","denominator":"9"},"evidenceLabel":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html); range $10,000-20,000 per kilogram; low end used; contested against the Statista export figure for the same chain position"}]},{"name":"United States wholesale","contested":false,"prices":[{"unitPrice":"70000","unit":"USD per kilogram","share":{"numerator":"1","denominator":"1"},"multiplierFromPrevious":{"numerator":"35000","denominator":"827"},"evidenceLabel":"Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html); range $70,000-80,000 per kilogram; low end used"}]}]}}
```
## Traceability
- `producer-price-first` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `retail-anchor-share` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `value-chain-share-definition`
- `adjacent-position-multiplier` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `value-chain-share-definition`
- `contested-price-both-shares` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `value-chain-share-definition`
- `evidence-label-every-row` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-float-arithmetic` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `ieee-754-float-avoidance`
- `no-single-position-ladder` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `value-chain-share-definition`
- `no-contested-retail-position` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `value-chain-share-definition`
- `no-more-than-two-contested-prices` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `value-chain-share-definition`
- `no-nonpositive-unit-price` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `ieee-754-float-avoidance`
