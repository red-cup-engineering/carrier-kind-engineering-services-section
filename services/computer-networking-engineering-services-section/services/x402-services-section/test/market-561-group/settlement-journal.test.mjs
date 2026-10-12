import assert from "node:assert/strict";
import test from "node:test";

import { createSettlementJournal } from "../../apps/market-561-group/src/settlement-journal.mjs";
import { catalog } from "../../apps/market-561-group/src/market.mjs";

const AGENT_URL = "https://witness.example/.well-known/agent-card.json";
const PAY_TO = "0x32886F6F361C1d570255c2762967A2e41D0E9B1a";
const NETWORK = "eip155:8453";
const TRANSACTION = `0x${"ab".repeat(32)}`;
const PAYER = `0x${"11".repeat(20)}`;

// Resolved from the live catalog rather than hardcoded: which gateway owns
// this route is data/records/catalog.json's call, not this test's, and the
// catalog is under concurrent edit by another agent.
const SETTLED_OFFER = catalog().find((offer) => offer.declaration.route === "/v1/pacing/heart-rate-threshold" && offer.declaration.method === "POST");
assert.ok(SETTLED_OFFER, "the catalog still declares POST /v1/pacing/heart-rate-threshold");

function settledContext({ amount = "10000" } = {}) {
  return {
    transportContext: { request: { path: SETTLED_OFFER.declaration.route, method: "POST" } },
    result: { network: NETWORK, transaction: TRANSACTION, payer: PAYER, amount },
  };
}

test("createSettlementJournal requires the witness-journal document agent and a settlement account, but never a durable data root", () => {
  assert.throws(
    () => createSettlementJournal({ X402_PAY_TO: PAY_TO }),
    /WITNESS_JOURNAL_DOCUMENT_AGENT/u,
  );
  assert.throws(
    () => createSettlementJournal({ WITNESS_JOURNAL_DOCUMENT_AGENT: AGENT_URL }),
    /X402_SETTLEMENT_ACCOUNT or X402_PAY_TO/u,
  );
  // Regression: recordWitnessJournalBatch's remote path only ever consumes
  // {agentUrl, batch}; a data-root requirement here would refuse the one
  // deployment (the edge Worker) that has neither a filesystem nor a use for
  // one, while contributing nothing to the actual record call.
  assert.doesNotThrow(() => createSettlementJournal({ WITNESS_JOURNAL_DOCUMENT_AGENT: AGENT_URL, X402_PAY_TO: PAY_TO }));
});

test("appendSettlement posts only {agentUrl, batch} to the injected record dependency, with no root or nodeId", async () => {
  const calls = [];
  const record = async (call) => {
    calls.push(call);
    return { digest: "ni:///sha-256;test", documentNi: "ni:///sha-256;test-document" };
  };
  const appendSettlement = createSettlementJournal(
    { WITNESS_JOURNAL_DOCUMENT_AGENT: AGENT_URL, X402_PAY_TO: PAY_TO },
    { record, now: () => "2026-09-11T06:00:00.000Z" },
  );
  const receipt = await appendSettlement(settledContext());
  assert.equal(calls.length, 1);
  const [call] = calls;
  assert.deepEqual(Object.keys(call).sort(), ["agentUrl", "batch"]);
  assert.equal(call.agentUrl, AGENT_URL);
  assert.equal(call.batch.settlement, PAY_TO);
  assert.equal(call.batch.recordedAt, "2026-09-11T06:00:00.000Z");
  assert.equal(call.batch.document.type, "RelationalWitnessJournalDocument");
  assert.equal(call.batch.document.value.type, "X402SettlementWitness");
  // Which catalog entry the kernel's settlementWitness attributes this route
  // to is data/records/catalog.json's call (and, with overlapping route
  // templates, ambiguous by design); this test owns only the plumbing
  // between that attribution and the journaled document, so it asserts a
  // nonempty attributed gateway rather than a specific one.
  assert.equal(typeof call.batch.document.value.gateway, "string");
  assert.ok(call.batch.document.value.gateway.length > 0);
  assert.equal(call.batch.document.value.payment.transaction, TRANSACTION);
  assert.ok(call.batch.assertions.some((entry) => entry.predicate === "urn:x402:transaction" && entry.object.value === TRANSACTION));
  assert.ok(call.batch.assertions.some((entry) => entry.predicate === "urn:emsenn:market:gateway" && entry.object.value === call.batch.document.value.gateway));
  assert.deepEqual(receipt, { digest: "ni:///sha-256;test", documentNi: "ni:///sha-256;test-document" });
});

test("appendSettlement refuses a settled context that omitted the network or transaction", async () => {
  const appendSettlement = createSettlementJournal(
    { WITNESS_JOURNAL_DOCUMENT_AGENT: AGENT_URL, X402_PAY_TO: PAY_TO },
    { record: async () => ({}), now: () => "2026-09-11T06:00:00.000Z" },
  );
  await assert.rejects(
    appendSettlement({ transportContext: { request: { path: SETTLED_OFFER.declaration.route, method: "POST" } }, result: {} }),
    /omitted network or transaction/u,
  );
});

test("X402_SETTLEMENT_ACCOUNT overrides X402_PAY_TO as the journaled settlement account", async () => {
  const calls = [];
  const appendSettlement = createSettlementJournal(
    { WITNESS_JOURNAL_DOCUMENT_AGENT: AGENT_URL, X402_PAY_TO: PAY_TO, X402_SETTLEMENT_ACCOUNT: `${NETWORK}:${PAY_TO}` },
    { record: async (call) => { calls.push(call); return {}; }, now: () => "2026-09-11T06:00:00.000Z" },
  );
  await appendSettlement(settledContext());
  assert.equal(calls[0].batch.settlement, `${NETWORK}:${PAY_TO}`);
});
