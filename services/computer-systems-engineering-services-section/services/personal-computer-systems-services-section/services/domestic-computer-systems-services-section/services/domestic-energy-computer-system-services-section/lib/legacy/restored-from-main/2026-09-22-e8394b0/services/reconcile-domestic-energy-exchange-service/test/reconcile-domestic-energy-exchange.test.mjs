import assert from "node:assert/strict";
import test from "node:test";
import { settleEnergyExchangeRecord } from "../scripts/settle-energy-exchange-record.mjs";

const settledInput = {"kind":"energy-exchange","period":{"start":"2026-08-01T00:00:00Z","end":"2026-08-31T23:59:59Z"},"commodity":"KWH","quantity":"412.5","from":{"id":"urn:example:household-a","role":"producer"},"to":{"id":"urn:example:utility-co","role":"grid"},"place":{"lat":44.9778,"lon":-93.265,"utilityId":"urn:example:utility-co"},"witnesses":[{"kind":"meter","value":"412.5","source":"urn:example:household-a-inverter-export-2026-08","asOf":"2026-09-01T00:00:00Z"},{"kind":"utility-statement","value":"412.5","source":"https://utility-co.example/statements/2026-08","asOf":"2026-09-03T00:00:00Z"}],"price":{"amount":"0.11","commodity":"USD","perUnit":true}};
const mismatchInput = {"kind":"energy-exchange","period":{"start":"2026-08-01T00:00:00Z","end":"2026-08-31T23:59:59Z"},"commodity":"KWH","quantity":"398.0","from":{"id":"urn:example:household-b","role":"producer"},"to":{"id":"urn:example:utility-co","role":"grid"},"place":{"lat":46.7296,"lon":-94.6859,"utilityId":"urn:example:utility-co"},"witnesses":[{"kind":"meter","value":"398.0","source":"urn:example:household-b-inverter-export-2026-08","asOf":"2026-09-01T00:00:00Z"},{"kind":"utility-statement","value":"371.2","source":"https://utility-co.example/statements/2026-08-household-b","asOf":"2026-09-03T00:00:00Z"}]};
const postedInput = {"kind":"energy-exchange","period":{"start":"2026-08-01T00:00:00Z","end":"2026-08-31T23:59:59Z"},"commodity":"PROPANE_GAL","quantity":"150","from":{"id":"did:example:propane-co","role":"producer"},"to":{"id":"urn:example:household-c","role":"consumer"},"place":{"lat":47.455,"lon":-95.5822},"witnesses":[{"kind":"bank-row","value":"150","source":"urn:example:household-c-bank-statement-2026-08","asOf":"2026-08-15T00:00:00Z"},{"kind":"bank-row","value":"150","source":"urn:example:household-c-bank-statement-2026-08-corrected","asOf":"2026-08-20T00:00:00Z"}],"price":{"amount":"2.79","commodity":"USD","perUnit":true}};

test("two witnesses of different kinds agreeing exactly settle at the later asOf", () => {
  const result = settleEnergyExchangeRecord({ record: settledInput });
  assert.deepEqual(result.settlement, { status: "settled", mismatch: null, settledAt: "2026-09-03T00:00:00Z" });
  assert.equal(result.id, "ni:///sha-256;hwS8YQPMpxlttQoauP1v-luJHmq1nCNNwZ0tmy5zvVA");
});

test("two witnesses of different kinds disagreeing beyond tolerance is a declared mismatch", () => {
  const result = settleEnergyExchangeRecord({ record: mismatchInput });
  assert.deepEqual(result.settlement, { status: "mismatch", mismatch: "26.8", settledAt: null });
  assert.equal(result.id, "ni:///sha-256;gz8u7e88tr7_hNiadFM0bw6aRlyH4DFIoMxHF_UQ8uQ");
});

test("two witnesses of the same kind leave the record posted, never settled", () => {
  const result = settleEnergyExchangeRecord({ record: postedInput });
  assert.deepEqual(result.settlement, { status: "posted", mismatch: null, settledAt: null });
  assert.equal(result.id, "ni:///sha-256;D-eG2-lgLhOhlncUb8vOXNtsPf0aLH6A-Qws8CTLdcE");
});

test("a declared tolerance settles a disagreement within it", () => {
  const result = settleEnergyExchangeRecord({ record: mismatchInput, tolerance: "30" });
  assert.equal(result.settlement.status, "settled");
});

test("the same input always yields the same output: no wall clock", () => {
  const first = settleEnergyExchangeRecord({ record: settledInput });
  const second = settleEnergyExchangeRecord({ record: settledInput });
  assert.deepEqual(first, second);
});

test("refuses a record that already carries id or settlement", () => {
  assert.throws(() => settleEnergyExchangeRecord({ record: { ...settledInput, id: "x" } }), /must not already carry id/u);
  assert.throws(() => settleEnergyExchangeRecord({ record: { ...settledInput, settlement: {} } }), /must not already carry settlement/u);
});

test("refuses fewer than two witnesses", () => {
  assert.throws(() => settleEnergyExchangeRecord({ record: { ...postedInput, witnesses: [postedInput.witnesses[0]] } }), /at least two entries/u);
});

test("refuses a non-decimal tolerance", () => {
  assert.throws(() => settleEnergyExchangeRecord({ record: settledInput, tolerance: "not-a-number" }), /tolerance must be a decimal string/u);
});

test("refuses a missing record", () => assert.throws(() => settleEnergyExchangeRecord({}), /record is required/u));
