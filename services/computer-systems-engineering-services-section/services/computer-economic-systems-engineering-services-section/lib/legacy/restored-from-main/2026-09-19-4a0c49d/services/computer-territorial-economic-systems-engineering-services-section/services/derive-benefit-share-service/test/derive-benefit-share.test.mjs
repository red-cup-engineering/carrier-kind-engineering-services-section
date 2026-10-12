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

