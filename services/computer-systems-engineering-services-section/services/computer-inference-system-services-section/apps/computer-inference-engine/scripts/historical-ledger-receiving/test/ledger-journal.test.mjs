import {createHash} from 'node:crypto';
import {admitSqlOnce,allowanceLedgerSqlRows,accountCapacitySqlRows} from '../receive.mjs';
import {openLedgerJournal} from '../../../src/media/ledger-journal.mjs';
const digest=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import {
  allowanceHold, allowanceLedgerDeclarations, allowanceLedgerEvidence, allowanceLedgerPools, allowanceLedgerUse,
  attemptAllowance, holdAllowance, readAllowanceLedger, recordAllowanceEvidence, releaseAllowance, settleAllowance,
} from "../../../src/media/allowance-ledger.mjs";
import { writeLegacySqlite } from "../../../test/media/write-legacy-sqlite.mjs";
import { allowanceBookText } from "../../../src/media/allowance-book.mjs";
import { openAccountArtifactCapacityStore } from "../../../src/media/account-artifact-capacity.mjs";
import { ledgerJournalRoot } from "../../../src/media/ledger-journal.mjs";
import { admitAllowance } from "@red-cup-engineering/organizing/enterprise";

const scratch = (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), "ledger-journal-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
};
// One daily budget of 50 and a 20-credit kind: two fit a day.
const declared = {
  id: "flow-credits", account: "google:fixture", product: "google-flow", unit: "credit", draws: "first",
  meters: [{ id: "daily", law: "period", every: "day", anchor: "2026-10-01T07:00:00Z", budget: 50 }],
  costs: { "veo:fast": 20, "veo:quality": 100 }, because: "fixture",
};
const flow = admitAllowance(declared);
const now = "2026-10-02T12:00:00.000Z";

test("the allowance ledger is a journal: holds, attempts, settlements and evidence, and no SQL", (t) => {
  const storePath = path.join(scratch(t), "allowance-ledger.sqlite");
  const first = holdAllowance(flow, { id: "a", kind: "veo:fast", principal: "studio" }, { storePath, now });
  const second = holdAllowance(flow, { id: "b", kind: "veo:fast", principal: "studio" }, { storePath, now });
  const third = holdAllowance(flow, { id: "c", kind: "veo:fast", principal: "studio" }, { storePath, now });
  assert.deepEqual([first.disposition, second.disposition, third.disposition], ["held", "held", "refused"]);
  assert.equal(holdAllowance(flow, { id: "a", kind: "veo:fast", principal: "studio" }, { storePath, now }).hold.state, "held", "a retried reservation is returned as it stands");
  assert.equal(attemptAllowance(flow, "a", { storePath, now }).disposition, "attempted");
  assert.equal(settleAllowance(flow, "a", { outcome: "spent", source: "studio:artifact-1", storePath, now }).hold.state, "settled");
  assert.equal(releaseAllowance(flow, "b", { storePath, now }).disposition, "released");
  assert.equal(allowanceHold("b", { storePath }).state, "released");
  assert.equal(recordAllowanceEvidence(flow, [{ type: "spend", kind: "veo:fast", at: now, source: "studio:artifact-1" }, { type: "spend", kind: "veo:fast", at: now, source: "sync:2" }], { storePath }), 1, "a spend already recorded under its source is one spend");
  assert.deepEqual(allowanceLedgerEvidence("flow-credits", { storePath }).map((entry) => entry.source), ["studio:artifact-1", "sync:2"]);
  assert.equal(readAllowanceLedger(flow, { storePath, now }).holds.length, 0);
  assert.deepEqual(allowanceLedgerPools({ storePath }), ["flow-credits"]);
  assert.equal(allowanceLedgerDeclarations({ storePath }).length, 1);
  const use = allowanceLedgerUse(flow, { storePath, since: "2026-10-02T00:00:00Z", now });
  assert.deepEqual(use.consumers.map((consumer) => [consumer.consumer, consumer.spent]), [["source:sync", 1], ["studio", 1]]);
  assert.match(allowanceBookText({ storePath, entity: "fixture", since: "2026-10-02T00:00:00Z", now }), /studio drew 1 veo:fast from flow-credits/u);
  assert.equal(existsSync(storePath), false, "no SQLite file is made");
  assert.ok(existsSync(ledgerJournalRoot(storePath)));
});

test("concurrent consumers on one host serialize: no more holds go through than fit", async (t) => {
  const storePath = path.join(scratch(t), "allowance-ledger.sqlite");
  const source = `
    import { workerData, parentPort } from "node:worker_threads";
    const { holdAllowance } = await import(workerData.module);
    const { admitAllowance } = await import("@red-cup-engineering/organizing/enterprise");
    parentPort.postMessage(holdAllowance(admitAllowance(workerData.flow), { id: workerData.id, kind: "veo:fast", principal: workerData.id }, { storePath: workerData.storePath, now: workerData.now }).disposition);`;
  const module = new URL("../../../src/media/allowance-ledger.mjs", import.meta.url).href;
  const outcomes = await Promise.all(Array.from({ length: 6 }, (_, index) => new Promise((resolve, reject) => {
    const worker = new Worker(source, { eval: true, type: "module", workerData: { module, flow: declared, storePath, now, id: `w${index}` } });
    worker.once("message", resolve);
    worker.once("error", reject);
  })));
  assert.equal(outcomes.filter((outcome) => outcome === "held").length, 2);
  assert.equal(outcomes.filter((outcome) => outcome === "refused").length, 4);
});

test("a SQLite allowance ledger is admitted once, read-only, and reads as it did", (t) => {
  const directory=scratch(t),sourcePath=path.join(directory,"original.sqlite"),storePath=path.join(directory,"received-ledger");
  writeLegacySqlite(sourcePath, [
    `CREATE TABLE allowance_evidence (allowance TEXT NOT NULL, source TEXT NOT NULL, at TEXT NOT NULL, entry TEXT NOT NULL, PRIMARY KEY (allowance, source));
    CREATE TABLE allowance_hold (id TEXT PRIMARY KEY, allowance TEXT NOT NULL, state TEXT NOT NULL, hold TEXT NOT NULL);
    CREATE TABLE allowance_declaration (allowance TEXT PRIMARY KEY, at TEXT NOT NULL, declaration TEXT NOT NULL);`,
    ["INSERT INTO allowance_evidence VALUES (?, ?, ?, ?)", "flow-credits", "studio:old", "2026-10-02T08:00:00.000Z", JSON.stringify({ type: "spend", kind: "veo:fast", count: 1, at: "2026-10-02T08:00:00.000Z", source: "studio:old" })],
    ["INSERT INTO allowance_hold VALUES (?, ?, ?, ?)", "live", "flow-credits", "held", JSON.stringify({ id: "live", allowance: "flow-credits", account: "google:fixture", kind: "veo:fast", count: 1, at: now, state: "held", probe: false, principal: "studio", heldAt: now, expiresAt: "2026-10-02T12:15:00.000Z" })],
    ["INSERT INTO allowance_declaration VALUES (?, ?, ?)", "flow-credits", now, JSON.stringify(declared)],
  ]);
  const before = readFileSync(sourcePath);
  admitSqlOnce(openLedgerJournal(storePath,"inference.allowance-ledger"),sourcePath,allowanceLedgerSqlRows,{expectedSha256:digest(sourcePath)});

  // The old spend and the live hold both count: the next 20-credit hold does not fit the 50 budget.
  assert.equal(holdAllowance(flow, { id: "next", kind: "veo:fast", principal: "studio" }, { storePath, now }).disposition, "refused");
  assert.deepEqual(readAllowanceLedger(flow, { storePath, now }).holds.map((hold) => hold.id), ["live"]);
  assert.deepEqual(allowanceLedgerEvidence("flow-credits", { storePath }).map((entry) => entry.source), ["studio:old"]);
  assert.ok(readFileSync(sourcePath).equals(before), "the SQLite file is read, never written");
  const receipt = JSON.parse(readFileSync(path.join(ledgerJournalRoot(storePath), "sql-admission.json"), "utf8"));
  assert.deepEqual(receipt.counts, { evidence: 1, hold: 1, declaration: 1 });
  releaseAllowance(flow, "live", { storePath, now });
  assert.equal(allowanceLedgerEvidence("flow-credits", { storePath }).length, 1, "a second open does not admit again");
  assert.equal(allowanceHold("live", { storePath }).state, "released");
});

test("account capacity windows compare-and-set by version in the journal, and admit their SQLite once", async (t) => {
  const directory = scratch(t);
  const storePath = path.join(directory, "account-capacity.sqlite");
  const store = openAccountArtifactCapacityStore(storePath);
  assert.equal(await store.get("k"), null);
  assert.deepEqual(await store.compareAndSet("k", null, { type: "WorkResourceAccountWindow", reservations: [] }), { version: 1 });
  await assert.rejects(() => store.compareAndSet("k", null, { reservations: [1] }), /account-capacity-conflict/u);
  assert.deepEqual(await store.compareAndSet("k", 1, { type: "WorkResourceAccountWindow", reservations: [{ id: "r" }] }), { version: 2 });
  assert.deepEqual(await openAccountArtifactCapacityStore(storePath).get("k"), { type: "WorkResourceAccountWindow", reservations: [{ id: "r" }], version: 2 });

  const legacyPath = path.join(directory, "legacy.sqlite");
  writeLegacySqlite(legacyPath, [
    "CREATE TABLE account_capacity (key TEXT PRIMARY KEY, version INTEGER NOT NULL, value TEXT NOT NULL);",
    ["INSERT INTO account_capacity VALUES (?, ?, ?)", "acct", 7, JSON.stringify({ type: "WorkResourceAccountWindow", reservations: [] })],
  ]);
  const receivedPath=path.join(directory,"received-capacity");
  admitSqlOnce(openLedgerJournal(receivedPath,"inference.account-capacity"),legacyPath,accountCapacitySqlRows,{expectedSha256:digest(legacyPath)});
  const legacy = openAccountArtifactCapacityStore(receivedPath);
  assert.equal((await legacy.get("acct")).version, 7);
  assert.deepEqual(await legacy.compareAndSet("acct", 7, { reservations: [] }), { version: 8 });
  assert.equal((await openAccountArtifactCapacityStore(receivedPath).get("acct")).version, 8, "reopening does not admit the SQLite rows again");
  assert.ok(!readdirSync(ledgerJournalRoot(receivedPath)).includes(".lock"), "the writer lock is released");
});
