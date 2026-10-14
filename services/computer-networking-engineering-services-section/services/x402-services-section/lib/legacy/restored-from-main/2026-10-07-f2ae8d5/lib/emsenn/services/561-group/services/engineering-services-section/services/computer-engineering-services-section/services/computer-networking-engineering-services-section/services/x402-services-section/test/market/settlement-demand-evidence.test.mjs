import assert from "node:assert/strict";
import test from "node:test";
import { classifyCounterparty, settlementDemandReading, summarizeDemand } from "../../src/market/settlement-demand-evidence.mjs";

const PAYER = "0xAbCdEf0123456789abcdef0123456789ABCDEF01";
const witness = (payer, amount = "10000", transaction = "0x01") => ({ type: "X402SettlementWitness", gateway: "astronomy", operation: "astronomy-positions",
  payment: { network: "eip155:8453", transaction, payer, amount } });

test("a payer found in no record stays unknown, never presumed external", () => {
  const reading = settlementDemandReading(witness(PAYER));
  assert.equal(reading.settled, true);
  assert.equal(reading.counterparty, "unknown");
  assert.equal(reading.independentCustomerDemand, false);
  assert.equal(reading.reason, "no-counterparty-evidence");
});

test("an undisclosed payer is unknown", () => {
  assert.equal(settlementDemandReading(witness("undisclosed")).reason, "payer-undisclosed");
  assert.equal(settlementDemandReading(witness(null)).reason, "payer-undisclosed");
});

test("evidence that the payer is independent counts as customer demand, matched case-insensitively", () => {
  const reading = settlementDemandReading(witness(PAYER), [{ payer: PAYER.toLowerCase(), classification: "independent-external", source: "buyer-contact:2026-10-03" }]);
  assert.equal(reading.independentCustomerDemand, true);
  assert.deepEqual(reading.provenance, [{ classification: "independent-external", source: "buyer-contact:2026-10-03" }]);
});

test("conflicting evidence is unknown, and the house paying itself is not demand", () => {
  assert.equal(classifyCounterparty(PAYER, [
    { payer: PAYER, classification: "independent-external", source: "a" }, { payer: PAYER, classification: "house-self", source: "b" },
  ]).reason, "conflicting-counterparty-evidence");
  assert.equal(settlementDemandReading(witness(PAYER), [{ payer: PAYER, classification: "house-self", source: "treasury" }]).independentCustomerDemand, false);
});

test("the summary keeps settled money and independent demand apart", () => {
  const evidence = [{ payer: PAYER, classification: "independent-external", source: "contact" }];
  const summary = summarizeDemand([
    settlementDemandReading(witness(PAYER, "10000", "0x01"), evidence),
    settlementDemandReading(witness("0x1111111111111111111111111111111111111111", "5000", "0x02"), evidence),
  ]);
  assert.deepEqual(summary.settledByNetwork, { "eip155:8453": "15000" });
  assert.deepEqual(summary.independentByNetwork, { "eip155:8453": "10000" });
  assert.equal(summary.counts.unknown, 1);
  assert.equal(summary.independentSettlements, 1);
});
