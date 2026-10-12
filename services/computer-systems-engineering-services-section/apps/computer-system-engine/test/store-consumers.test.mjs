import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { each, extend, get, readHead, readLog, walk } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { actorRequestProcessing, arrivalProcessingRecord, processingEntryValue, requestProcessingThread } from "../src/rpc/actor-processing.mjs";
import { ARRIVAL_FEED, ARRIVAL_PROCESS_FEED } from "../src/rpc/arrival.mjs";
import { appendArrivalAtRoot, readArrivalProjection } from "../src/rpc/arrival-store.mjs";
import { measureProgramContract } from "../src/rpc/contract.mjs";
import { admitProgramContractEvidence, readProgramContractEvidence } from "../src/rpc/contract-evidence.mjs";
import { operation } from "../src/rpc/operation.mjs";
import { filesystemServiceLifecycleSink, recordServiceLifecycleRecord, SERVICE_LIFECYCLE_TYPE } from "../src/journal/service-lifecycle/index.mjs";

const fixture = (t) => {
  const root = mkdtempSync(join(tmpdir(), "system-engine-store-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
};

const cloudEvent = (id, data = { evidence: "only" }, time = "2026-10-12T01:02:03.000Z") => ({
  specversion: "1.0", id, source: "urn:system:test", type: "org.emsenn.system.test.arrival", time, datacontenttype: "application/json", data,
});

test("an arrival is one record, one head entry and one log line, however often it is replayed", (t) => {
  const root = fixture(t);
  const first = appendArrivalAtRoot(root, cloudEvent("arrival-once"), { rootName: "ns" });
  const again = appendArrivalAtRoot(root, cloudEvent("arrival-once"), { rootName: "ns" });
  assert.deepEqual(again, first, "a replay carries the same content-addressed receipt");
  assert.equal(first.admission.type, ARRIVAL_FEED);
  assert.equal(first.admission.thread, "2026-10-12");
  assert.equal([...each(root, ARRIVAL_FEED)].length, 1);
  assert.deepEqual(readHead(root, ARRIVAL_FEED, "2026-10-12").frontier, [first.admission.address]);
  const lines = [...readLog(root, ARRIVAL_FEED, "2026-10-12")].map(({ line }) => line);
  assert.deepEqual(lines, [{ at: "2026-10-12T01:02:03.000Z", of: first.admission.address, from: "urn:system:test", kind: "org.emsenn.system.test.arrival" }]);
  const record = get(root, ARRIVAL_FEED, first.admission.address);
  assert.equal(record.packetDigest, first.packetDigest);
  assert.deepEqual(record.causes, []);
  assert.equal(existsSync(join(root, "custody")), false, "a packet that fits is held in its record");
  assert.equal(existsSync(join(root, "data", "journals")), false);
  assert.equal(existsSync(join(root, "data", "state", "log-state")), false);
});

test("the day's reading projects each arrival from its record, in order of time", (t) => {
  const root = fixture(t);
  appendArrivalAtRoot(root, cloudEvent("later", { n: 2 }, "2026-10-12T05:00:00.000Z"));
  appendArrivalAtRoot(root, cloudEvent("earlier", { n: 1 }, "2026-10-12T04:00:00.000Z"));
  const day = readArrivalProjection(root, "2026-10-12");
  assert.equal(day.rows, 2);
  assert.equal(day.truncated, false);
  assert.deepEqual(day.entries.map((entry) => entry.at), ["2026-10-12T04:00:00.000Z", "2026-10-12T05:00:00.000Z"]);
  assert.equal(day.validPackets, 2);
  assert.equal(readArrivalProjection(root, "2026-10-13").rows, 0);
});

test("a packet too large for a record is bytes in content custody, named by address from a small record", (t) => {
  const root = fixture(t);
  const receipt = appendArrivalAtRoot(root, cloudEvent("big", { body: "x".repeat(60 * 1024) }));
  const record = get(root, ARRIVAL_FEED, receipt.admission.address);
  assert.equal(record.packet, undefined);
  assert.match(record.packetNi, /^ni:\/\/\/sha-256;/u);
  assert.ok(JSON.stringify(record).length < 2048);
  const day = readArrivalProjection(root, "2026-10-12");
  assert.equal(day.rows, 1);
  assert.equal(day.entries[0].packetDigest, receipt.packetDigest);
  assert.equal(day.entries[0].obstructions.length, 0);
  rmSync(join(root, "custody"), { recursive: true, force: true });
  assert.match(readArrivalProjection(root, "2026-10-12").entries[0].obstructions.join(" "), /not held in content custody/u);
});

test("a request's processing is a thread of transitions read to its latest sequence", (t) => {
  const root = fixture(t);
  const identity = "ni:///sha-256;request-one";
  const entry = { cloudEventIdentity: identity, packetDigest: "d", dispatchEvent: { verb: "orientation" } };
  const transition = (sequence, state) => arrivalProcessingRecord({ ...processingEntryValue(entry, state, []), sequence }, "2026-10-12T00:00:00.000Z");
  assert.equal(actorRequestProcessing(root, identity), undefined);
  const thread = requestProcessingThread(identity);
  extend(root, ARRIVAL_PROCESS_FEED, thread, transition(1, "payment-required"));
  extend(root, ARRIVAL_PROCESS_FEED, thread, transition(2, "processed"));
  assert.equal(actorRequestProcessing(root, identity).state, "processed");
  assert.equal(actorRequestProcessing(root, identity).sequence, 2);
  assert.equal(actorRequestProcessing(root, "ni:///sha-256;request-two"), undefined, "another request is another thread");
  assert.deepEqual([...walk(root, ARRIVAL_PROCESS_FEED, readHead(root, ARRIVAL_PROCESS_FEED, thread).frontier)].map((step) => step.record.sequence), [2, 1], "effects first");
});

test("two transitions of one sequence that disagree are conflicting evidence", (t) => {
  const root = fixture(t);
  const identity = "ni:///sha-256;request-conflict";
  const entry = { cloudEventIdentity: identity, packetDigest: "d" };
  const thread = requestProcessingThread(identity);
  extend(root, ARRIVAL_PROCESS_FEED, thread, arrivalProcessingRecord({ ...processingEntryValue(entry, "processed", []), sequence: 1 }, "2026-10-12T00:00:00.000Z"));
  extend(root, ARRIVAL_PROCESS_FEED, thread, arrivalProcessingRecord({ ...processingEntryValue(entry, "obstructed", ["x"]), sequence: 1 }, "2026-10-12T00:00:01.000Z"));
  assert.throws(() => actorRequestProcessing(root, identity), /conflicting transition evidence/u);
});

test("program contract evidence is a thread read causes first", (t) => {
  const root = fixture(t);
  assert.deepEqual(readProgramContractEvidence(root), []);
  const first = measureProgramContract(operation({ verb: "evidence-one", run: () => null }), { seed: 1 });
  const second = measureProgramContract(operation({ verb: "evidence-two", run: () => null }), { seed: 2 });
  admitProgramContractEvidence(root, first, "2026-10-12T00:00:00.000Z");
  admitProgramContractEvidence(root, second, "2026-10-12T00:00:01.000Z");
  assert.deepEqual(readProgramContractEvidence(root), [first, second]);
});

test("service lifecycle events are plain lines of the day's log", (t) => {
  const root = fixture(t);
  const sink = filesystemServiceLifecycleSink(root, "ns");
  sink({ kind: "boundary", service: "node-a", boundary: "start", event: "started", at: "2026-10-12T00:00:00.000Z", ok: true, evidence: ["ni:///sha-256;a"] });
  recordServiceLifecycleRecord({ dataRoot: root, rootName: "ns" }, {
    service: "node-a", boundary: "stop",
    events: [{ kind: "boundary", service: "node-a", boundary: "stop", event: "stopped", at: "2026-10-12T00:00:05.000Z", ok: false, code: 1, detail: "d".repeat(5000), evidence: [] }],
  });
  const lines = [...readLog(root, SERVICE_LIFECYCLE_TYPE, "2026-10-12")].map(({ line }) => line);
  assert.equal(lines.length, 2);
  assert.deepEqual(lines[0], { at: "2026-10-12T00:00:00.000Z", service: "node-a", boundary: "start", event: "started", ok: true });
  assert.equal(lines[1].code, 1);
  assert.equal(lines[1].detail.length, 1024);
  assert.deepEqual(readdirSync(join(root, "data")).sort(), ["logs"], "a log is the only thing a lifecycle event writes");
});

test("no module of computer-system-engine reads the old store", () => {
  const facade = new Set();
  const src = new URL("../src/", import.meta.url);
  const old = /journal\/journal|openJournal|journal\/exchange|journal\/projections|journal\/section|journal\/frontier|journal\/filesystem\/(write-journal-store|source-owner|migrate|territory-cache|legacy-codec|types|heads)|semiotic-eavt-services-section\/journal\/|semiotic-eavt-services-section\/(query-|record-|read-semantic|read-seavt|append-seavt|admit-jsonl|term-index|field-index|iterate-|command|admit-semantic)/u;
  const offenders = [];
  for (const entry of readdirSync(src, { recursive: true })) {
    const name = String(entry).split("\\").join("/");
    if (!name.endsWith(".mjs")) continue;
    const relative = name.startsWith("journal/") ? name.slice("journal/".length) : null;
    if (relative !== null && facade.has(relative)) {
      assert.match(readFileSync(new URL(name, src), "utf8").split("\n", 1)[0], /old store's facade.*store\.md/u, `${name} says it is the old store's`);
      continue;
    }
    if (old.test(readFileSync(new URL(name, src), "utf8"))) offenders.push(name);
  }
  assert.deepEqual(offenders, []);
});
