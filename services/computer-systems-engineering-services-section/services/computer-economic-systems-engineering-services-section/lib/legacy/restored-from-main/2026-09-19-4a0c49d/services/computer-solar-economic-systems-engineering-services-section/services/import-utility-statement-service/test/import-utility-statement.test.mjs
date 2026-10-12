import assert from "node:assert/strict";
import test from "node:test";
import { importUtilityStatement } from "../scripts/import-utility-statement.mjs";

const TARIFF = { utility: "Example Coop", rateScheduleName: "Residential", usdPerKwhTiers: [{ usdPerKwh: "0.1423" }], sourceUrl: "https://www.example-coop.coop/rates", asOf: "2026-07-01" };
const CSV_HEADER = "Account,From,To,kWh Used,kWh Generated";
const COLUMN_MAP = { householdId: "Account", periodStart: "From", periodEnd: "To", kwhUsed: "kWh Used", kwhGenerated: "kWh Generated" };

test("imports a CSV row into a HouseholdEnergyRecord with no mismatch when the meter agrees", () => {
  const statementText = `${CSV_HEADER}\n12345,2026-08-01,2026-08-31,450.00,120.00\n`;
  const [record] = importUtilityStatement({
    statementText, format: "csv",
    parserConfig: { utility: "Example Coop", columnMap: COLUMN_MAP, dateFormat: "YYYY-MM-DD", sourceUrl: "https://www.example-coop.coop/statement" },
    tariff: TARIFF,
    meterReadings: [{ date: "2026-08-31", kwh: "450.00" }],
  });
  assert.equal(record.type, "HouseholdEnergyRecord");
  assert.equal(record.householdId, "12345");
  assert.equal(record.kwhUsed.mismatch, false);
  assert.equal(record.kwhGenerated.statementValue, "120.00");
  assert.deepEqual(record.tariff, TARIFF);
});

test("holds a meter mismatch open with the exact difference, never resolving it silently", () => {
  const statementText = `${CSV_HEADER}\n12345,2026-08-01,2026-08-31,450.00,120.00\n`;
  const [record] = importUtilityStatement({
    statementText, format: "csv",
    parserConfig: { utility: "Example Coop", columnMap: COLUMN_MAP, dateFormat: "YYYY-MM-DD", sourceUrl: "https://www.example-coop.coop/statement" },
    tariff: TARIFF,
    meterReadings: [{ date: "2026-08-31", kwh: "448.50" }],
  });
  assert.equal(record.kwhUsed.mismatch, true);
  assert.equal(record.kwhUsed.mismatchAmount, "1.5");
});

test("falls back to a bank row when no meter reading matches the period end", () => {
  const statementText = `${CSV_HEADER}\n12345,2026-08-01,2026-08-31,450.00,120.00\n`;
  const [record] = importUtilityStatement({
    statementText, format: "csv",
    parserConfig: { utility: "Example Coop", columnMap: COLUMN_MAP, dateFormat: "YYYY-MM-DD", sourceUrl: "https://www.example-coop.coop/statement" },
    tariff: TARIFF,
    bankRows: [{ date: "2026-08-31", amount: "450.00" }],
  });
  assert.equal(record.kwhUsed.meterOrBankValue, "450.00");
  assert.equal(record.kwhUsed.mismatch, false);
});

test("reads a headerless text-format row by column index", () => {
  const statementText = "12345,2026-08-01,2026-08-31,450.00\n";
  const [record] = importUtilityStatement({
    statementText, format: "text",
    parserConfig: { utility: "Example Coop", columnMap: { householdId: 0, periodStart: 1, periodEnd: 2, kwhUsed: 3 }, dateFormat: "YYYY-MM-DD", sourceUrl: "https://www.example-coop.coop/statement" },
    tariff: TARIFF,
  });
  assert.equal(record.householdId, "12345");
  assert.equal(record.kwhUsed.statementValue, "450.00");
  assert.equal(record.kwhGenerated.statementValue, "0");
});

test("reports an unparseable row at its position instead of dropping it", () => {
  const statementText = `${CSV_HEADER}\n12345,2026-08-01\n`;
  const [refusal] = importUtilityStatement({
    statementText, format: "csv",
    parserConfig: { utility: "Example Coop", columnMap: COLUMN_MAP, dateFormat: "YYYY-MM-DD", sourceUrl: "https://www.example-coop.coop/statement" },
    tariff: TARIFF,
  });
  assert.equal(refusal.refused, true);
  assert.equal(refusal.reason, "unparseable-row");
  assert.equal(refusal.rowText, "12345,2026-08-01");
});

test("refuses a row whose line items do not foot against its declared total", () => {
  const header = "Account,From,To,kWh Used,kWh Generated,Energy Charge,Delivery Charge,Total";
  const columnMap = { ...COLUMN_MAP, lineItems: ["Energy Charge", "Delivery Charge"], totalCharge: "Total" };
  const statementText = `${header}\n12345,2026-09-01,2026-09-30,300.00,80.00,40.00,10.00,60.00\n`;
  const [refusal] = importUtilityStatement({
    statementText, format: "csv",
    parserConfig: { utility: "Example Coop", columnMap, dateFormat: "YYYY-MM-DD", sourceUrl: "https://www.example-coop.coop/statement" },
    tariff: TARIFF,
  });
  assert.equal(refusal.refused, true);
  assert.equal(refusal.reason, "statement-does-not-foot");
  assert.equal(refusal.declaredTotal, "60.00");
  assert.equal(refusal.summedTotal, "50");
});

test("accepts a row whose line items do foot against its declared total", () => {
  const header = "Account,From,To,kWh Used,kWh Generated,Energy Charge,Delivery Charge,Total";
  const columnMap = { ...COLUMN_MAP, lineItems: ["Energy Charge", "Delivery Charge"], totalCharge: "Total" };
  const statementText = `${header}\n12345,2026-08-01,2026-08-31,450.00,120.00,60.00,15.00,75.00\n`;
  const [record] = importUtilityStatement({
    statementText, format: "csv",
    parserConfig: { utility: "Example Coop", columnMap, dateFormat: "YYYY-MM-DD", sourceUrl: "https://www.example-coop.coop/statement" },
    tariff: TARIFF,
  });
  assert.equal(record.type, "HouseholdEnergyRecord");
});

test("normalizes MM/DD/YYYY dates to YYYY-MM-DD", () => {
  const statementText = `${CSV_HEADER}\n12345,08/01/2026,08/31/2026,450.00,120.00\n`;
  const [record] = importUtilityStatement({
    statementText, format: "csv",
    parserConfig: { utility: "Example Coop", columnMap: COLUMN_MAP, dateFormat: "MM/DD/YYYY", sourceUrl: "https://www.example-coop.coop/statement" },
    tariff: TARIFF,
  });
  assert.equal(record.periodStart, "2026-08-01");
  assert.equal(record.periodEnd, "2026-08-31");
});

test("throws TypeError when columnMap names a header column the statement does not have", () => {
  assert.throws(
    () => importUtilityStatement({
      statementText: `${CSV_HEADER}\n12345,2026-08-01,2026-08-31,450.00,120.00\n`,
      format: "csv",
      parserConfig: { utility: "Example Coop", columnMap: { ...COLUMN_MAP, kwhUsed: "Usage (kWh)" }, dateFormat: "YYYY-MM-DD", sourceUrl: "https://www.example-coop.coop/statement" },
      tariff: TARIFF,
    }),
    TypeError,
  );
});
