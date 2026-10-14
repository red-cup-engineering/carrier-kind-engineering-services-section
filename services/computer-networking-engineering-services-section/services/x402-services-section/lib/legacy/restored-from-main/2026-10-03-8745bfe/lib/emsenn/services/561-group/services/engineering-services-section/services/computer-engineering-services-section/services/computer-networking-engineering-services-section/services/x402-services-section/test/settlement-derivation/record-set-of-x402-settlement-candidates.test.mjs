import assert from "node:assert/strict";
import test from "node:test";
import {
  GATEWAY,
  RECORD_CATEGORY,
  recordSetOfX402SettlementCandidates,
} from "../../src/settlement-derivation/record-set-of-x402-settlement-candidates.mjs";

const RECEIVER = "0x32886F6F361C1d570255c2762967A2e41D0E9B1a";
const TX_HASH = `0x${"a".repeat(64)}`;
const FIXED_NOW = new Date("2026-09-07T18:30:00.000Z");

function streams() {
  const out = [];
  const err = [];
  return { stdout: { write: (line) => out.push(line) }, stderr: { write: (line) => err.push(line) }, out, err };
}

function stubObserve(byWindow) {
  const calls = [];
  return {
    calls,
    fn: async (input) => {
      calls.push(input);
      const outcome = typeof byWindow === "function" ? byWindow(input) : byWindow;
      return outcome;
    },
  };
}

function stubJournal() {
  const calls = [];
  return {
    calls,
    createJournal: (init) => ({
      root: init.root,
      record: (args) => {
        calls.push({ init, args });
        return { id: "ni:///sha-256;FAKE00000000000000000000000000000000000000" };
      },
    }),
  };
}

function stubWriteDatedRecord() {
  const calls = [];
  return { calls, fn: async (payload, location) => { calls.push({ payload, location }); } };
}

const OK_EMPTY = Object.freeze({
  ok: true, network: "eip155:8453", fromBlock: 1, toBlock: 100, receiverTransferCandidates: [], disagreements: [],
});

test("--help prints usage and never calls the observer", async () => {
  const observe = stubObserve(OK_EMPTY);
  const { stdout, stderr, out } = streams();
  const result = await recordSetOfX402SettlementCandidates({
    argv: ["--help"], env: { X402_SETTLEMENT_OBSERVER_RECEIVER: RECEIVER },
    observe: observe.fn, stdout, stderr,
  });
  assert.equal(result.exitCode, 0);
  assert.equal(observe.calls.length, 0);
  assert.ok(out[0].includes("record-set-of-x402-settlement-candidates"));
});

test("a missing receiver env var exits 1 without calling the observer", async () => {
  const observe = stubObserve(OK_EMPTY);
  const { stdout, stderr, err } = streams();
  const result = await recordSetOfX402SettlementCandidates({
    argv: [], env: {}, observe: observe.fn, stdout, stderr,
  });
  assert.equal(result.ok, false);
  assert.equal(result.exitCode, 1);
  assert.equal(observe.calls.length, 0);
  assert.match(JSON.parse(err[0]).reason, /X402_SETTLEMENT_OBSERVER_RECEIVER/u);
});

test("an invalid --window exits 1 without calling the observer", async () => {
  const observe = stubObserve(OK_EMPTY);
  const { stdout, stderr, err } = streams();
  const result = await recordSetOfX402SettlementCandidates({
    argv: ["--window", "not-a-number"], env: { X402_SETTLEMENT_OBSERVER_RECEIVER: RECEIVER },
    observe: observe.fn, stdout, stderr,
  });
  assert.equal(result.exitCode, 1);
  assert.equal(observe.calls.length, 0);
  assert.match(JSON.parse(err[0]).reason, /--window must be a positive integer/u);
});

test("an explicit --window makes exactly one observe call at that window", async () => {
  const observe = stubObserve(OK_EMPTY);
  const { stdout, stderr } = streams();
  const journal = stubJournal();
  const result = await recordSetOfX402SettlementCandidates({
    argv: ["--window", "42", "--dry-run"], env: { X402_SETTLEMENT_OBSERVER_RECEIVER: RECEIVER },
    observe: observe.fn, createJournal: journal.createJournal, now: () => FIXED_NOW, stdout, stderr,
  });
  assert.equal(result.ok, true);
  assert.equal(observe.calls.length, 1);
  assert.equal(observe.calls[0].windowBlocks, 42);
  assert.equal(result.summary.windowBlocks, 42);
});

test("window discovery tries candidates largest-first and keeps the first success", async () => {
  const observe = stubObserve(({ windowBlocks }) => (
    windowBlocks <= 200 ? { ...OK_EMPTY, fromBlock: 1000 - windowBlocks, toBlock: 1000 } : { ok: false, reason: "too large" }
  ));
  const { stdout, stderr } = streams();
  const journal = stubJournal();
  const result = await recordSetOfX402SettlementCandidates({
    argv: ["--dry-run"], env: { X402_SETTLEMENT_OBSERVER_RECEIVER: RECEIVER },
    observe: observe.fn, createJournal: journal.createJournal, now: () => FIXED_NOW,
    windowCandidates: [5000, 1000, 500, 200, 100], stdout, stderr,
  });
  assert.equal(result.ok, true);
  assert.equal(result.summary.windowBlocks, 200);
  assert.deepEqual(observe.calls.map((c) => c.windowBlocks), [5000, 1000, 500, 200]);
});

test("window discovery reports the last failure when every candidate is refused", async () => {
  const observe = stubObserve(({ windowBlocks }) => ({ ok: false, reason: `refused at ${windowBlocks}` }));
  const { stdout, stderr, err } = streams();
  const result = await recordSetOfX402SettlementCandidates({
    argv: [], env: { X402_SETTLEMENT_OBSERVER_RECEIVER: RECEIVER },
    observe: observe.fn, windowCandidates: [500, 200, 100], stdout, stderr,
  });
  assert.equal(result.ok, false);
  assert.equal(result.exitCode, 1);
  const printed = JSON.parse(err[0]);
  assert.equal(printed.reason, "refused at 100");
  assert.equal(printed.windowDiscovery.length, 3);
});

test("a successful run maps a witness graph id onto every settlement from its network and transaction hash", async () => {
  const observed = {
    ok: true, network: "eip155:8453", fromBlock: 1, toBlock: 100, disagreements: [],
    receiverTransferCandidates: [
      { transactionHash: TX_HASH, payer: "0xpayer", amount: "510000", blockTime: "2026-09-05T14:00:00Z", network: "eip155:8453", logIndex: "0x0" },
    ],
  };
  const observe = stubObserve(observed);
  const { stdout, stderr } = streams();
  const journal = stubJournal();
  const writeDatedRecord = stubWriteDatedRecord();
  const witnessCalls = [];
  const witnessGraphIdFor = ({ network, transaction }) => { witnessCalls.push({ network, transaction }); return "ni:///sha-256;WITNESS"; };
  const result = await recordSetOfX402SettlementCandidates({
    argv: ["--window", "100"], env: { X402_SETTLEMENT_OBSERVER_RECEIVER: RECEIVER },
    observe: observe.fn, witnessGraphIdFor, createJournal: journal.createJournal,
    writeDatedRecord: writeDatedRecord.fn, now: () => FIXED_NOW, root: "/pkg-root", stdout, stderr,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(witnessCalls, [{ network: "eip155:8453", transaction: TX_HASH }]);
  assert.equal(result.record.settlements[0].witnessGraphId, "ni:///sha-256;WITNESS");
  assert.equal(result.record.settlements[0].hash, TX_HASH);
});

test("a successful run derives market-level revenue for the env receiver, booking via minimal spot-sale recognition", async () => {
  const observed = {
    ok: true, network: "eip155:8453", fromBlock: 1, toBlock: 100, disagreements: [],
    receiverTransferCandidates: [
      { transactionHash: TX_HASH, payer: "0xpayer", amount: "510000", blockTime: "2026-09-05T14:00:00Z", network: "eip155:8453", logIndex: "0x0" },
    ],
  };
  const observe = stubObserve(observed);
  const { stdout, stderr } = streams();
  const journal = stubJournal();
  const writeDatedRecord = stubWriteDatedRecord();
  const result = await recordSetOfX402SettlementCandidates({
    argv: ["--window", "100"], env: { X402_SETTLEMENT_OBSERVER_RECEIVER: RECEIVER },
    observe: observe.fn, witnessGraphIdFor: () => "ni:///sha-256;WITNESS",
    createJournal: journal.createJournal, writeDatedRecord: writeDatedRecord.fn,
    now: () => FIXED_NOW, root: "/pkg-root", stdout, stderr,
  });
  assert.equal(result.record.gateway, GATEWAY);
  assert.equal(result.record.receiver, RECEIVER);
  // The recorder supplies the minimal honest recognition a chain-only observation can
  // support (see spotSaleRecognition/RECOGNITION_LIMITATION), so a witnessed settlement
  // books rather than being refused.
  assert.equal(result.record.refusals.length, 0);
  assert.equal(result.record.transactionCount, 1);
  assert.equal(result.record.settlements[0].recognition.kind, "revenue");
  assert.equal(result.record.settlements[0].recognition.contractId, TX_HASH);
  assert.equal(result.record.settlements[0].evidenceId, `evm:eip155:8453:tx:${TX_HASH}`);
  assert.match(result.record.beancountTransactionCandidates[0], /Income:Sales:X402:Market-561-group/u);
  assert.equal(typeof result.record.recognitionLimitation, "string");
});

test("a successful run journals one record under category x402-settlement-candidates with a charge reflecting disagreements", async () => {
  const observed = {
    ok: true, network: "eip155:8453", fromBlock: 1, toBlock: 100,
    disagreements: [{ key: "x", reason: "duplicate-event-key" }],
    receiverTransferCandidates: [],
  };
  const observe = stubObserve(observed);
  const { stdout, stderr } = streams();
  const journal = stubJournal();
  const writeDatedRecord = stubWriteDatedRecord();
  const result = await recordSetOfX402SettlementCandidates({
    argv: ["--window", "100"], env: { X402_SETTLEMENT_OBSERVER_RECEIVER: RECEIVER },
    observe: observe.fn, createJournal: journal.createJournal, writeDatedRecord: writeDatedRecord.fn,
    now: () => FIXED_NOW, root: "/pkg-root", stdout, stderr,
  });
  assert.equal(result.ok, true);
  assert.equal(journal.calls.length, 1);
  assert.equal(journal.calls[0].init.root, "/pkg-root");
  assert.equal(journal.calls[0].args.category, RECORD_CATEGORY);
  assert.equal(journal.calls[0].args.recordedAt, FIXED_NOW.toISOString());
  assert.deepEqual(journal.calls[0].args.charge, { support: true, refutation: true });
  assert.equal(writeDatedRecord.calls.length, 1);
  assert.equal(writeDatedRecord.calls[0].location.recordsDir, "/pkg-root/data/records");
  assert.equal(writeDatedRecord.calls[0].payload.journalId, "ni:///sha-256;FAKE00000000000000000000000000000000000000");
});

test("the journaled record carries the gateway attribution limitation and Beancount candidates as text", async () => {
  const observed = {
    ok: true, network: "eip155:8453", fromBlock: 1, toBlock: 100, disagreements: [],
    receiverTransferCandidates: [],
  };
  const observe = stubObserve(observed);
  const { stdout, stderr } = streams();
  const journal = stubJournal();
  const writeDatedRecord = stubWriteDatedRecord();
  const derive = () => ({ transactionCount: 1, transactions: [{ directive: "2026-09-05 * \"x402 sale\"\n  fake: directive" }], refusals: [], accountsToOpen: [] });
  const result = await recordSetOfX402SettlementCandidates({
    argv: ["--window", "100"], env: { X402_SETTLEMENT_OBSERVER_RECEIVER: RECEIVER },
    observe: observe.fn, derive, createJournal: journal.createJournal, writeDatedRecord: writeDatedRecord.fn,
    now: () => FIXED_NOW, root: "/pkg-root", stdout, stderr,
  });
  assert.match(result.record.gatewayAttributionLimitation, /market\.561\.group catalog groups/u);
  assert.deepEqual(result.record.beancountTransactionCandidates, ["2026-09-05 * \"x402 sale\"\n  fake: directive"]);
});

test("--dry-run skips the journal and the dated-record write while still printing a summary", async () => {
  const observe = stubObserve(OK_EMPTY);
  const { stdout, stderr, out } = streams();
  const journal = stubJournal();
  const writeDatedRecord = stubWriteDatedRecord();
  const result = await recordSetOfX402SettlementCandidates({
    argv: ["--window", "100", "--dry-run"], env: { X402_SETTLEMENT_OBSERVER_RECEIVER: RECEIVER },
    observe: observe.fn, createJournal: journal.createJournal, writeDatedRecord: writeDatedRecord.fn,
    now: () => FIXED_NOW, stdout, stderr,
  });
  assert.equal(result.ok, true);
  assert.equal(journal.calls.length, 0);
  assert.equal(writeDatedRecord.calls.length, 0);
  const summary = JSON.parse(out[0]);
  assert.equal(summary.journaled, false);
  assert.equal(summary.recordId, null);
});

test("a zero-settlement run still exits 0 with ok true in the summary", async () => {
  const observe = stubObserve(OK_EMPTY);
  const { stdout, stderr, out } = streams();
  const result = await recordSetOfX402SettlementCandidates({
    argv: ["--window", "100", "--dry-run"], env: { X402_SETTLEMENT_OBSERVER_RECEIVER: RECEIVER },
    observe: observe.fn, now: () => FIXED_NOW, stdout, stderr,
  });
  assert.equal(result.exitCode, 0);
  const summary = JSON.parse(out[0]);
  assert.equal(summary.ok, true);
  assert.equal(summary.settlementCount, 0);
});
