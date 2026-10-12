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
