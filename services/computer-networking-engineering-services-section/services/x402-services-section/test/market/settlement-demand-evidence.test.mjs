import assert from "node:assert/strict";
import test from "node:test";
import { classifyCounterparty, projectSettlementDemandEvidence, summarizeSettlementDemandEvidence } from "../../src/market/settlement-demand-evidence.mjs";

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

// Original test vectors, recovered from emsenn/561-group PR #26;
// use the existing Red Cup market carrier and live classifier, not a duplicate.
const HOUSE = "0x1111111111111111111111111111111111111111";
const LINKED = "0x2222222222222222222222222222222222222222";
const EXTERNAL = "0x3333333333333333333333333333333333333333";
const UNKNOWN = "0x4444444444444444444444444444444444444444";

const evidence = Object.freeze([
  { payer: HOUSE, classification: "house-self", source: "urn:561:house-wallet-register:2026-10-01" },
  { payer: LINKED, classification: "linked-non-independent", source: "urn:561:linked-counterparty-register:2026-10-01" },
  { payer: EXTERNAL, classification: "independent-external", source: "urn:561:counterparty-attestation:external-1" },
]);

function settlement(payer, amountBaseUnits, suffix) {
  return {
    network: "eip155:8453",
    asset: "USDC",
    amountBaseUnits,
    transaction: `0x${suffix.padStart(64, "0")}`,
    payer,
    sku: "ephemeris/moment-essentials",
    operation: "paid-ephemeris-gateway:moment-essentials",
    witness: `ni:///sha-256;${suffix.padEnd(43, "x").slice(0, 43)}`,
  };
}


test("derived readings preserve raw settlement provenance without rewriting settlement state", () => {
  const reading = projectSettlementDemandEvidence(settlement(EXTERNAL, "40000", "1"), evidence);
  assert.equal(reading.settlementRecognized, true);
  assert.equal(reading.independentCustomerDemand, true);
  assert.equal(reading.counterpartyIndependence, "independent-external");
  assert.equal(reading.raw.payer, EXTERNAL);
  assert.equal(reading.raw.amountBaseUnits, "40000");
  assert.equal(reading.raw.sku, "ephemeris/moment-essentials");
  assert.equal(reading.raw.operation, "paid-ephemeris-gateway:moment-essentials");
  assert.match(reading.raw.witness, /^ni:\/\/\/sha-256;/u);
});

test("September-format settlement fixtures keep recognized money separate from demand evidence", () => {
  const readings = [
    projectSettlementDemandEvidence(settlement(HOUSE, "30000", "11"), evidence),
    projectSettlementDemandEvidence(settlement(LINKED, "30000", "12"), evidence),
    projectSettlementDemandEvidence(settlement(EXTERNAL, "40000", "13"), evidence),
    projectSettlementDemandEvidence(settlement(UNKNOWN, "40000", "14"), evidence),
  ];
  const summary = summarizeSettlementDemandEvidence(readings);

  assert.deepEqual(summary.recognizedSettlement, {
    count: 4,
    amountBaseUnitsByMarket: { "eip155:8453|USDC": "140000" },
  });
  assert.deepEqual(summary.independentCustomerDemand, {
    count: 1,
    amountBaseUnitsByMarket: { "eip155:8453|USDC": "40000" },
  });
  assert.deepEqual(summary.counterpartyClassificationCounts, {
    "independent-external": 1,
    "house-self": 1,
    "linked-non-independent": 1,
    unknown: 1,
  });
});
