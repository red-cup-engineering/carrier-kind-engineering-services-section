import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { allocateSettlementEnergy, deriveEnergyPriceDirectives, energyAccountingOperations } from "@red-cup-engineering/farolfi/energy/operations";
import { assembleDefaultService } from "@red-cup-engineering/metroplat/catalog";

const electricity = { usdPerKwh: "0.1423", sourceUrl: "https://www.example-coop.coop/rates", asOf: "2026-07-01" };
const propane = "Date,Price\n08/25/2026,1.234\n09/01/2026,1.245\n09/10/2026,1.3\n";
const diesel = "Date,Price\n2026-08-31,3.512\n2026-09-10,3.6\n";
const kwhPricedJournal = `option "title" "Metroplat energy valuation"
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

test("energy price directives preserve source, never select a future weekly price, and refuse secrets", () => {
  const result = deriveEnergyPriceDirectives({
    date: "2026-09-05", electricity,
    propane: { sourceKind: "fixture", seriesText: propane },
    diesel: { sourceKind: "fetched-csv", sourceUrl: "https://www.eia.gov/petroleum/gasdiesel/", seriesText: diesel },
  });
  const byCommodity = Object.fromEntries(result.priced.map((price) => [price.commodity, price]));
  assert.equal(result.directiveCount, 6);
  assert.equal(byCommodity.KWH.inversePrice, "7.0274068868");
  assert.equal(byCommodity.PROPANE_GAL.observedDate, "2026-09-01");
  assert.equal(byCommodity.DIESEL_GAL.observedDate, "2026-08-31");
  assert.match(byCommodity.KWH.directive, /source_url: "https:\/\/www\.example-coop\.coop\/rates"/u);
  assert.throws(() => deriveEnergyPriceDirectives({
    date: "2026-09-05", electricity,
    propane: { sourceKind: "fixture", seriesText: propane, apiKey: "secret" },
    diesel: { sourceKind: "fixture", seriesText: diesel },
  }), /apiKey is refused/u);
});

test("energy allocation attributes metered CPU use to the overlapping settlement row", () => {
  const result = allocateSettlementEnergy({
    settledRows: [{ rowId: "settlement-1", intervalStart: "2026-09-05T00:00:00.000Z", intervalEnd: "2026-09-05T00:05:00.000Z" }],
    resourceReceipts: [{ intervalStart: "2026-09-05T00:00:00.000Z", intervalEnd: "2026-09-05T00:05:00.000Z", price: { denomination: { asset: "cpu-seconds" }, amount: { numerator: "2000000000", denominator: "1000000000" } } }],
    conversionFactors: { cpuSecondsToJoules: { value: "65", sourceUrl: "https://example.test/tdp", asOf: "2026-09-01" } },
    boundary: ["hosts"],
  });
  assert.equal(result.receipts[0].joules, "130");
  assert.deepEqual(result.unmatchedRowIds, []);
});

test("Metroplat exposes energy accounting once through its public catalog and values only its configured book", async () => {
  const root = mkdtempSync(join(tmpdir(), "metroplat-energy-"));
  const previous = process.env.METROPLAT_LEDGER_JOURNAL;
  const book = join(root, "book.beancount");
  writeFileSync(book, kwhPricedJournal);
  process.env.METROPLAT_LEDGER_JOURNAL = book;
  try {
    const assembly = assembleDefaultService({ dataRoot: root });
    for (const verb of ["energy-price-directives", "settlement-energy-allocation", "ledger-energy-valuation"]) {
      assert.equal(assembly.operations.filter((operation) => operation.verb === verb).length, 1);
    }
    const valuation = energyAccountingOperations().find(({ verb }) => verb === "ledger-energy-valuation");
    const result = await valuation.execute({ asOf: "2026-09-05" }, {});
    assert.equal(result.kwhValuation.reportingCommodity, "KWH");
  } finally {
    if (previous === undefined) delete process.env.METROPLAT_LEDGER_JOURNAL;
    else process.env.METROPLAT_LEDGER_JOURNAL = previous;
    rmSync(root, { recursive: true, force: true });
  }
});
