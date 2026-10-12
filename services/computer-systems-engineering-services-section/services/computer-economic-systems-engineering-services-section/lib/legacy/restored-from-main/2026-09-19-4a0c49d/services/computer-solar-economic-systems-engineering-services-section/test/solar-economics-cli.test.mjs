import assert from "node:assert/strict";
import test from "node:test";
import { HELP_TEXT, runSolarEconomicsCommand } from "../apps/solar-economics-cli.mjs";

const SUBCOMMANDS = [
  "observe-irradiance",
  "derive-yield-projection",
  "value-ledger-in-kilowatt-hours",
  "derive-joules-per-settled-row",
  "derive-set-of-household-energy-price-directives",
  "derive-household-energy-barrier",
  "import-utility-statement",
  "settle-energy-exchange",
];

test("--help lists all eight subcommands", () => {
  for (const name of SUBCOMMANDS) {
    assert.ok(HELP_TEXT.includes(name), `HELP_TEXT must list ${name}`);
  }
});

test("an unknown subcommand returns a refusal datum", async () => {
  const result = await runSolarEconomicsCommand({ command: "not-a-real-command", input: {} });
  assert.deepStrictEqual(result, { refused: "UNKNOWN_COMMAND", command: "not-a-real-command" });
});

// observe-irradiance: the refusal example only, never the network (README "an unadmitted
// dataset refuses as data").
test("observe-irradiance refuses an unadmitted dataset without any network call", async () => {
  const result = await runSolarEconomicsCommand({
    command: "observe-irradiance",
    input: {
      place: { lat: 43.02, lon: -102.55 },
      startDate: "2026-01-01",
      endDate: "2026-01-01",
      dataset: "open-meteo",
    },
  });
  assert.deepStrictEqual(result, { refused: true, reason: "dataset-not-admitted", dataset: "open-meteo" });
});

// derive-yield-projection: README "projects yield with the default performance ratio".
test("derive-yield-projection round-trips its README example", async () => {
  const result = await runSolarEconomicsCommand({
    command: "derive-yield-projection",
    input: {
      place: { lat: 43.02, lon: -102.55 },
      irradianceObservations: [
        {
          place: { lat: 43.02, lon: -102.55 },
          dailyGhiKwhPerM2: "3.0",
          date: "2026-01-01",
          datasetName: "NASA POWER",
          datasetUrl: "https://power.larc.nasa.gov/api/temporal/daily/point",
          methodology: "satellite-reanalysis",
          asOf: "2026-09-05",
        },
      ],
      systemSizeKw: "5",
      periodDays: 1,
    },
  });
  assert.deepStrictEqual(result, {
    type: "YieldProjection",
    version: 1,
    label: "projection",
    projectedKwh: "12.0000",
    datasetName: "NASA POWER",
    datasetUrl: "https://power.larc.nasa.gov/api/temporal/daily/point",
    methodology: "satellite-reanalysis",
    asOf: "2026-09-05",
  });
});

// value-ledger-in-kilowatt-hours: README "fully priced journal values in USD with no unpriced
// commodities".
test("value-ledger-in-kilowatt-hours round-trips its README example", async () => {
  const result = await runSolarEconomicsCommand({
    command: "value-ledger-in-kilowatt-hours",
    input: {
      journal: {
        text: "option \"title\" \"Test\"\noption \"operating_currency\" \"USD\"\n\n2026-01-01 open Assets:Cash:Operating USD\n2026-01-01 open Equity:Opening-Balances\n\n2026-01-01 * \"Opening\"\n  Assets:Cash:Operating  1000.00 USD\n  Equity:Opening-Balances  -1000.00 USD\n",
      },
      asOf: "2026-09-05",
      now: "2026-09-05T00:00:00.000Z",
    },
  });
  assert.deepStrictEqual(result, {
    type: "KilowattHourValuation",
    version: 1,
    generatedAt: "2026-09-05T00:00:00.000Z",
    usdValuation: {
      rows: [
        {
          account: "Assets:Cash:Operating",
          units: {
            kind: "exactNumber.gradedRational",
            value: { kind: "exactNumber.rational", num: "1000", den: "1" },
            grade: "USD",
          },
          lot: null,
          bookValue: null,
          marketPrice: {
            kind: "exactNumber.gradedRational",
            value: { kind: "exactNumber.rational", num: "1", den: "1" },
            grade: "USD",
          },
          marketValue: {
            kind: "exactNumber.gradedRational",
            value: { kind: "exactNumber.rational", num: "1000", den: "1" },
            grade: "USD",
          },
          unrealized: null,
          priceDate: null,
        },
      ],
      end: "2026-09-05",
      reportingCommodity: "USD",
      kind: "ledger-report",
      report: "valuation",
      journal: { text: true, format: "beancount" },
      generatedAt: "2026-09-05T00:00:00.000Z",
    },
    kwhValuation: null,
    unpricedCommodities: [],
  });
});

// derive-joules-per-settled-row: README "prices a matched row from a declared cpu-seconds
// factor".
test("derive-joules-per-settled-row round-trips its README example", async () => {
  const result = await runSolarEconomicsCommand({
    command: "derive-joules-per-settled-row",
    input: {
      settledRows: [
        { rowId: "row-1", intervalStart: "2026-09-05T00:00:00.000Z", intervalEnd: "2026-09-05T00:05:00.000Z" },
      ],
      resourceReceipts: [
        {
          type: "bare-cedar-fog.resource-metering/unit-resource-consumed",
          version: 1,
          host: "bare-cedar-fog",
          unit: "example.service",
          provider: "bare-cedar-fog",
          actor: "example.service",
          intervalStart: "2026-09-05T00:00:00.000Z",
          intervalEnd: "2026-09-05T00:05:00.000Z",
          derivedFrom: {},
          price: {
            denomination: { kind: "resource", asset: "cpu-seconds", unit: "second" },
            amount: { numerator: "2000000000", denominator: "1000000000" },
          },
        },
      ],
      conversionFactors: {
        cpuSecondsToJoules: { value: "65", sourceUrl: "https://example.org/tdp-note", asOf: "2026-09-01" },
        byteToJoules: { value: "0.0000001", sourceUrl: "https://example.org/network-energy-note", asOf: "2026-09-01" },
      },
      boundary: ["hosts"],
    },
  });
  assert.deepStrictEqual(result, {
    receipts: [
      {
        type: "SettledRowEnergyReceipt",
        version: 1,
        rowId: "row-1",
        joules: "130",
        boundary: ["hosts"],
        conversionFactors: {
          cpuSecondsToJoules: { value: "65", sourceUrl: "https://example.org/tdp-note", asOf: "2026-09-01" },
          byteToJoules: { value: "0.0000001", sourceUrl: "https://example.org/network-energy-note", asOf: "2026-09-01" },
        },
        sourceReceipts: [
          {
            type: "bare-cedar-fog.resource-metering/unit-resource-consumed",
            version: 1,
            host: "bare-cedar-fog",
            unit: "example.service",
            provider: "bare-cedar-fog",
            actor: "example.service",
            intervalStart: "2026-09-05T00:00:00.000Z",
            intervalEnd: "2026-09-05T00:05:00.000Z",
            derivedFrom: {},
            price: {
              denomination: { kind: "resource", asset: "cpu-seconds", unit: "second" },
              amount: { numerator: "2000000000", denominator: "1000000000" },
            },
          },
        ],
      },
    ],
    unmatchedRowIds: [],
  });
});

// derive-set-of-household-energy-price-directives: README "derives KWH from the household's
// tariff and PROPANE_GAL/DIESEL_GAL from the weekly series".
test("derive-set-of-household-energy-price-directives round-trips its README example", async () => {
  const result = await runSolarEconomicsCommand({
    command: "derive-set-of-household-energy-price-directives",
    input: {
      date: "2026-09-05",
      household: {
        energyTariff: {
          utility: "Example Coop",
          rateScheduleName: "Residential",
          usdPerKwhTiers: [{ usdPerKwh: "0.1423" }],
          sourceUrl: "https://www.example-coop.coop/rates",
          asOf: "2026-07-01",
        },
      },
      propane: {
        sourceKind: "fixture",
        seriesText: "Date,Weekly Midwest (PADD 2) Propane Residential Price (Dollars per Gallon)\n08/25/2026,1.234\n09/01/2026,1.245\n",
      },
      diesel: {
        sourceKind: "fetched-csv",
        sourceUrl: "https://www.eia.gov/petroleum/gasdiesel/",
        seriesText: "Date,Weekly U.S. No 2 Diesel Retail Prices (Dollars per Gallon)\n2026-08-31,3.512\n",
      },
    },
  });
  assert.deepStrictEqual(result, {
    type: "EnergyPriceDirectiveSet",
    version: 1,
    date: "2026-09-05",
    directiveCount: 6,
    priced: [
      {
        commodity: "KWH",
        usdPrice: "0.1423",
        inversePrice: "7.0274068868",
        sourceKind: "declared",
        sourceUrl: "https://www.example-coop.coop/rates",
        observedDate: "2026-07-01",
        directive: "2026-09-05 price KWH 0.1423 USD\n  source_kind: \"declared\"\n  source_url: \"https://www.example-coop.coop/rates\"\n  observed_date: \"2026-07-01\"",
        inverseDirective: "2026-09-05 price USD 7.0274068868 KWH\n  source_kind: \"declared\"\n  source_url: \"https://www.example-coop.coop/rates\"\n  observed_date: \"2026-07-01\"\n  inverse_of: \"KWH\"",
      },
      {
        commodity: "PROPANE_GAL",
        usdPrice: "1.245",
        inversePrice: "0.8032128514",
        sourceKind: "fixture",
        sourceUrl: null,
        observedDate: "2026-09-01",
        directive: "2026-09-05 price PROPANE_GAL 1.245 USD\n  source_kind: \"fixture\"\n  source_url: \"\"\n  observed_date: \"2026-09-01\"",
        inverseDirective: "2026-09-05 price USD 0.8032128514 PROPANE_GAL\n  source_kind: \"fixture\"\n  source_url: \"\"\n  observed_date: \"2026-09-01\"\n  inverse_of: \"PROPANE_GAL\"",
      },
      {
        commodity: "DIESEL_GAL",
        usdPrice: "3.512",
        inversePrice: "0.284738041",
        sourceKind: "fetched-csv",
        sourceUrl: "https://www.eia.gov/petroleum/gasdiesel/",
        observedDate: "2026-08-31",
        directive: "2026-09-05 price DIESEL_GAL 3.512 USD\n  source_kind: \"fetched-csv\"\n  source_url: \"https://www.eia.gov/petroleum/gasdiesel/\"\n  observed_date: \"2026-08-31\"",
        inverseDirective: "2026-09-05 price USD 0.284738041 DIESEL_GAL\n  source_kind: \"fetched-csv\"\n  source_url: \"https://www.eia.gov/petroleum/gasdiesel/\"\n  observed_date: \"2026-08-31\"\n  inverse_of: \"DIESEL_GAL\"",
      },
    ],
    unpriced: [],
  });
});

// derive-household-energy-barrier: README "sums propane heating and kcal food energy into one
// joule barrier".
test("derive-household-energy-barrier round-trips its README example", async () => {
  const result = await runSolarEconomicsCommand({
    command: "derive-household-energy-barrier",
    input: {
      heatingEnergy: { amount: "0", unit: "JOULES" },
      foodEnergy: { amount: "3600000", unit: "JOULES" },
      tariff: { usdPerKwhTiers: [{ usdPerKwh: "0.1423" }] },
      asOf: "2026-09-05",
    },
  });
  assert.deepStrictEqual(result, {
    amount: "3600000.000",
    unit: "joules",
    kwh: "1.000000",
    usdPerKwh: "0.1423",
    usdTotal: "0.1423",
    asOf: "2026-09-05",
  });
});

// import-utility-statement: README "imports a CSV row with a held-open meter mismatch".
test("import-utility-statement round-trips its README example", async () => {
  const result = await runSolarEconomicsCommand({
    command: "import-utility-statement",
    input: {
      statementText: "Account,From,To,kWh Used,kWh Generated\n12345,2026-08-01,2026-08-31,450.00,120.00\n",
      format: "csv",
      parserConfig: {
        utility: "Example Coop",
        columnMap: {
          householdId: "Account",
          periodStart: "From",
          periodEnd: "To",
          kwhUsed: "kWh Used",
          kwhGenerated: "kWh Generated",
        },
        dateFormat: "YYYY-MM-DD",
        sourceUrl: "https://www.example-coop.coop/statement",
      },
      tariff: {
        utility: "Example Coop",
        rateScheduleName: "Residential",
        usdPerKwhTiers: [{ usdPerKwh: "0.1423" }],
        sourceUrl: "https://www.example-coop.coop/rates",
        asOf: "2026-07-01",
      },
      meterReadings: [{ date: "2026-08-31", kwh: "448.50" }],
    },
  });
  assert.deepStrictEqual(result, [
    {
      type: "HouseholdEnergyRecord",
      version: 1,
      householdId: "12345",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
      kwhUsed: { statementValue: "450.00", meterOrBankValue: "448.50", mismatch: true, mismatchAmount: "1.5" },
      kwhGenerated: { statementValue: "120.00", meterOrBankValue: null, mismatch: null, mismatchAmount: null },
      tariff: {
        utility: "Example Coop",
        rateScheduleName: "Residential",
        usdPerKwhTiers: [{ usdPerKwh: "0.1423" }],
        sourceUrl: "https://www.example-coop.coop/rates",
        asOf: "2026-07-01",
      },
    },
  ]);
});

// settle-energy-exchange: README "a settled KWH record with two distinct witnesses names the
// exact mint call".
test("settle-energy-exchange round-trips its README example", async () => {
  const result = await runSolarEconomicsCommand({
    command: "settle-energy-exchange",
    input: {
      record: {
        id: "ni:///sha-256;hwS8YQPMpxlttQoauP1v-luJHmq1nCNNwZ0tmy5zvVA",
        kind: "energy-exchange",
        period: { start: "2026-08-01T00:00:00Z", end: "2026-08-31T23:59:59Z" },
        commodity: "KWH",
        quantity: "412.5",
        from: { id: "urn:example:household-a", role: "producer" },
        to: { id: "urn:example:utility-co", role: "grid" },
        place: { lat: 44.9778, lon: -93.265, utilityId: "urn:example:utility-co" },
        witnesses: [
          { kind: "meter", value: "412.5", source: "urn:example:household-a-inverter-export-2026-08", asOf: "2026-09-01T00:00:00Z" },
          { kind: "utility-statement", value: "412.5", source: "https://utility-co.example/statements/2026-08", asOf: "2026-09-03T00:00:00Z" },
        ],
        price: { amount: "0.11", commodity: "USD", perUnit: true },
        settlement: { status: "settled", mismatch: null, settledAt: "2026-09-03T00:00:00Z" },
      },
      to: "0x0000000000000000000000000000000000000a11",
    },
  });
  assert.equal(result.record.id, "ni:///sha-256;hwS8YQPMpxlttQoauP1v-luJHmq1nCNNwZ0tmy5zvVA");
  assert.deepStrictEqual(result.unit, {
    commodity: "KWH",
    quantity: "412.5",
    digest: "0x8704bc6103cca7196db50a1ab8fd6ffa5b891e6ab59c234dc19d2d9b2e73bd50",
    witnesses: [
      "0x1f5a3e864abe16da1beb603b95f860f07cb2e8cf1b66ab27357d0f9d8250ab63",
      "0x91acdfca05b31ddc8a46414fcc93225b3ca068aae7410de4c8f296b6d3304003",
    ],
  });
  assert.deepStrictEqual(result.call, {
    contract: "WitnessedKilowattHour",
    function: "mint",
    args: [
      "0x8704bc6103cca7196db50a1ab8fd6ffa5b891e6ab59c234dc19d2d9b2e73bd50",
      "0x1f5a3e864abe16da1beb603b95f860f07cb2e8cf1b66ab27357d0f9d8250ab63",
      "0x91acdfca05b31ddc8a46414fcc93225b3ca068aae7410de4c8f296b6d3304003",
      "412500",
      "0x0000000000000000000000000000000000000a11",
    ],
  });
});
