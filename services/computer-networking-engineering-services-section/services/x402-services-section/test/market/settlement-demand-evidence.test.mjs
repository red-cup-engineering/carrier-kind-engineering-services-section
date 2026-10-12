import assert from "node:assert/strict";
import test from "node:test";
import { classifyCounterparty } from "../../src/market/settlement-demand-evidence.mjs";

const PAYER = "0xAbCdEf0123456789abcdef0123456789ABCDEF01";
test("a payer found in no record stays unknown, never presumed external", () => {
  const reading = classifyCounterparty(PAYER);
  assert.equal(reading.classification, "unknown");
  assert.equal(reading.reason, "no-counterparty-evidence");
});

test("an undisclosed payer is unknown", () => {
  assert.equal(classifyCounterparty("undisclosed").reason, "payer-undisclosed");
  assert.equal(classifyCounterparty(null).reason, "payer-undisclosed");
});

test("relationship evidence is matched case-insensitively without claiming customer demand", () => {
  const reading = classifyCounterparty(PAYER, [{ payer: PAYER.toLowerCase(), classification: "independent-external", source: "buyer-contact:2026-10-03" }]);
  assert.equal(reading.classification, "independent-external");
  assert.deepEqual(reading.evidence, [{ classification: "independent-external", source: "buyer-contact:2026-10-03" }]);
});

test("conflicting evidence is unknown, and the house paying itself is not demand", () => {
  assert.equal(classifyCounterparty(PAYER, [
    { payer: PAYER, classification: "independent-external", source: "a" }, { payer: PAYER, classification: "house-self", source: "b" },
  ]).reason, "conflicting-counterparty-evidence");
  assert.equal(classifyCounterparty(PAYER, [{ payer: PAYER, classification: "house-self", source: "treasury" }]).classification, "house-self");
});

