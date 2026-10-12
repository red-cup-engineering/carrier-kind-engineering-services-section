import assert from "node:assert/strict";
import test from "node:test";
import { valueLedgerInKilowattHours } from "../scripts/value-ledger-in-kilowatt-hours.mjs";

const fullyPricedJournal = `option "title" "Test"
option "operating_currency" "USD"

2026-01-01 open Assets:Cash:Operating USD
2026-01-01 open Equity:Opening-Balances

2026-01-01 * "Opening"
  Assets:Cash:Operating  1000.00 USD
  Equity:Opening-Balances  -1000.00 USD
`;

const unpricedJournal = `option "title" "Test"
option "operating_currency" "USD"

2026-01-01 open Assets:Cash:Operating USD
2026-01-01 open Assets:Solar:PVBank KWH
2026-01-01 open Equity:Opening-Balances

2026-01-01 * "Opening"
  Assets:Cash:Operating  1000.00 USD
  Equity:Opening-Balances  -1000.00 USD

2026-01-01 * "PV credit"
  Assets:Solar:PVBank  50.00 KWH
  Equity:Opening-Balances  -50.00 KWH
`;

const kwhPricedJournal = `option "title" "Test"
option "operating_currency" "USD"

2026-01-01 open Assets:Cash:Operating USD
2026-01-01 open Assets:Solar:PVBank KWH
2026-01-01 open Equity:Opening-Balances

2026-01-01 price KWH 0.15 USD
2026-01-01 price USD 6.666667 KWH

2026-01-01 * "Opening"
  Assets:Cash:Operating  1000.00 USD
  Equity:Opening-Balances  -1000.00 USD

2026-01-01 * "PV credit"
  Assets:Solar:PVBank  50.00 KWH
  Equity:Opening-Balances  -50.00 KWH
`;

test("returns a usdValuation and null kwhValuation when every commodity is priced", async () => {
  const result = await valueLedgerInKilowattHours({ journal: { text: fullyPricedJournal }, asOf: "2026-09-05" });
  assert.equal(result.type, "KilowattHourValuation");
  assert.equal(result.usdValuation.reportingCommodity, "USD");
  assert.equal(result.kwhValuation, null);
  assert.deepEqual(result.unpricedCommodities, []);
});

test("yields a non-null kwhValuation with reportingCommodity KWH when forward and inverse KWH/USD price directives are present", async () => {
  const result = await valueLedgerInKilowattHours({ journal: { text: kwhPricedJournal }, asOf: "2026-09-05" });
  assert.equal(result.type, "KilowattHourValuation");
  assert.ok(result.kwhValuation !== null);
  assert.equal(result.kwhValuation.reportingCommodity, "KWH");
});

test("refuses as data on an unpriced commodity, never fabricating a valuation", async () => {
  const result = await valueLedgerInKilowattHours({ journal: { text: unpricedJournal }, asOf: "2026-09-05" });
  assert.deepEqual(result, { refused: true, reason: "commodity-unpriced", commodity: "KWH", asOf: "2026-09-05" });
});

test("refuses a missing journal", async () => {
  await assert.rejects(() => valueLedgerInKilowattHours({ asOf: "2026-09-05" }), /journal is required/u);
});

test("refuses a missing asOf", async () => {
  await assert.rejects(() => valueLedgerInKilowattHours({ journal: { text: fullyPricedJournal } }), /asOf is required/u);
});
