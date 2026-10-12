import assert from "node:assert/strict";
import test from "node:test";

import { valueQuantity, x402Challenge, paymentFromChallenge, receiptFromPayment } from "../src/codec.mjs";
import { webSubPublication, webSubLinkHeader, valueSettlementLog } from "../src/settlement-log.mjs";

function buildReceipt() {
  const challenge = x402Challenge({
    id: "challenge-1",
    resource: "https://example.test/resource",
    payee: "payee-1",
    amount: valueQuantity(100, 1, "USD"),
    rails: ["x402", "ap2"],
    issuedAt: "2026-09-11T00:00:00Z",
  });
  const payment = paymentFromChallenge(challenge, { payer: "payer-1", authorization: "sig", rail: "ap2" });
  return receiptFromPayment(challenge, payment);
}

test("webSubPublication admits updates and derives eventIds", () => {
  const publication = webSubPublication({
    topic: "https://example.test/topic",
    hub: "https://example.test/hub",
    self: "https://example.test/self",
    updates: [["e1", "a1", "v1", "2026-09-11T00:00:00Z"]],
  });
  assert.equal(publication.kind, "websub.publication");
  assert.equal(publication.eventIds.length, 1);
  assert.equal(publication.contentType, "application/eavt+jsonl; charset=utf-8");
});

test("webSubLinkHeader forms the RFC 8288 hub/self Link field", () => {
  const header = webSubLinkHeader({ hub: "https://example.test/hub", self: "https://example.test/self" });
  assert.equal(header, '<https://example.test/hub>; rel="hub", <https://example.test/self>; rel="self"');
});

test("valueSettlementLog over no evidence reports every required face missing", () => {
  const log = valueSettlementLog({ rows: [] });
  assert.equal(log.ok, false);
  assert.deepEqual([...log.missing].sort(), ["AP2 rail receipt", "EAVT settlement-filtration rows", "WebSub publication face"].sort());
});

test("valueSettlementLog over one AP2 receipt's statement rows clears the ap2 and filtration faces", () => {
  const receipt = buildReceipt();
  const log = valueSettlementLog({ rows: [], receipts: [receipt] });
  assert.equal(log.ap2Receipts.length, 1);
  assert.equal(log.settlement.valueConserved, true);
  assert.ok(!log.missing.includes("AP2 rail receipt"));
  assert.ok(!log.missing.includes("EAVT settlement-filtration rows"));
  assert.ok(log.missing.includes("WebSub publication face"));
});

test("valueSettlementLog surfaces a real cross-writer conflict on the same attribute", () => {
  const t = "2026-09-11T00:00:00Z";
  const rows = [
    ["writer-a", "resource.price", 10, t],
    ["writer-b", "resource.price", 20, t],
  ];
  const log = valueSettlementLog({ rows, requiredFaces: [] });
  assert.equal(log.settlement.conflicts.length, 1);
  assert.equal(log.ok, false);
});
