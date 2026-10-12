import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { processLeaseCoordinator } from "@red-cup-engineering/computer-system-engine/rpc/coordination";
import { authorizationFromStanding } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { journalRpcWitness, rpcEvidenceType } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { createOperationCatalog, operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { dispatchProjectedSurface } from "@red-cup-engineering/computer-system-engine/rpc/wire-dispatch";
import { extend, heads, logDates, readHead, readLog } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import {
  clockOperations, clockReading, currentSchedules, lastRunOf, reconcileDeclaredSchedules, runClockHeartbeat, runType, scheduleType, tickClock, wakeDelay,
} from "@red-cup-engineering/organizing/work/recurring";

const NOW = "2026-09-27T12:00:00.000Z";
const INSTANCE = "scheduled-worker:test";
const later = (seconds) => new Date(Date.parse(NOW) + seconds * 1000).toISOString();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = async (until, what) => {
  const expires = Date.now() + 5_000;
  while (!until()) {
    assert.ok(Date.now() < expires, what);
    await sleep(5);
  }
};

/** One node's clock: a data root, its binding, a counting job verb and the catalog the clock runs it through. */
function clockFixture({ work } = {}) {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-clock-"));
  const binding = defaultFilesystemBinding(dataRoot, { now: () => NOW });
  let runs = 0;
  // An external effect, so the dispatch witnesses the call as it witnesses any act.
  const job = operation({
    verb: "clock-fixture-work",
    effects: { class: "external", replay: "idempotency-key", coordination: "coordination-free", deterministic: "unmeasured", totality: "unmeasured" },
    run: work ?? (() => ({ runs: (runs += 1) })),
  });
  let operations;
  let authorize;
  const clock = clockOperations(binding, () => operations, () => authorize);
  operations = Object.freeze([job, ...clock]);
  authorize = authorizationFromStanding(new Map(operations.map((item) => [item.ref, "held"])));
  const surface = Object.freeze({ catalog: createOperationCatalog(operations), authorize });
  const declare = (...schedules) => reconcileDeclaredSchedules(binding, INSTANCE, schedules.map((schedule) => ({ verb: job.verb, account: INSTANCE, ...schedule })), () => NOW);
  // A run the schedule had before: its record and the head of its runs, as a finished run leaves them.
  const ran = (id, occurrence, attempt, { ok, at }) => extend(dataRoot, runType, id, { at, schedule: id, occurrence, attempt, ok });
  const files = (...parts) => { const directory = path.join(dataRoot, ...parts); return existsSync(directory) ? readdirSync(directory).sort() : []; };
  const logLines = (type, date = NOW.slice(0, 10)) => [...readLog(dataRoot, type, date)].map(({ line }) => line);
  return { dataRoot, binding, job, surface, declare, ran, files, logLines, runs: () => runs, close: () => rmSync(dataRoot, { recursive: true, force: true }) };
}

/** Run a heartbeat for `ms`, at a fixed instant; returns the runs it told. */
async function heartbeatFor(fixture, ms, { at = later(30) } = {}) {
  const abort = new AbortController();
  const told = [];
  const run = runClockHeartbeat(fixture.binding, { intervalMs: 10, signal: abort.signal, now: () => at, onRun: (record) => told.push(record) });
  await sleep(ms);
  abort.abort();
  await run;
  return told;
}

test("the heartbeat runs one due occurrence once, holds its schedule while it runs, and stops on abort", async () => {
  let release;
  let announce;
  const started = new Promise((resolve) => { announce = resolve; });
  const released = new Promise((resolve) => { release = resolve; });
  let runs = 0;
  const fixture = clockFixture({ work: async () => { runs += 1; announce(); await released; return { runs }; } });
  const abort = new AbortController();
  let looks = 0;
  try {
    fixture.declare({ id: "heartbeat-fixture", everySeconds: 3600, firstDueAt: NOW });
    const heartbeat = runClockHeartbeat(fixture.binding, {
      intervalMs: 5,
      signal: abort.signal,
      // each look reads a later instant, so a look that wrote anything would leave a row of its own
      now: () => new Date(Date.parse(NOW) + (looks += 1) * 1000).toISOString(),
    });
    await started;
    // the run is in flight: the schedule reads running, not due, however often the clock looks
    const reading = clockReading(fixture.binding, later(60));
    assert.deepEqual(reading.due, []);
    assert.deepEqual(reading.blocked, [{ schedule: "heartbeat-fixture", occurrence: 0, reason: "running" }]);
    await sleep(60);
    release();
    await deadline(() => lastRunOf(fixture.binding, "heartbeat-fixture") !== undefined, "the run records its state");
    await sleep(100);
    abort.abort();
    await heartbeat;
    assert.equal(runs, 1);
    assert.equal(lastRunOf(fixture.binding, "heartbeat-fixture").ok, true);
    // one log line per run, and the job's own call witnessed; no tick witnessed: one attempt, the job's
    const lines = fixture.logLines(runType);
    assert.equal(lines.length, 1);
    assert.deepEqual({ schedule: lines[0].schedule, outcome: lines[0].outcome }, { schedule: "heartbeat-fixture", outcome: "ok" });
    const attempts = fixture.logLines(rpcEvidenceType).filter((line) => line.kind === "metroplat.rpc.attempt");
    assert.equal(attempts.length, 1);
  } finally {
    abort.abort();
    release();
    fixture.close();
  }
});

test("a tick that finds nothing due writes nothing", async () => {
  const fixture = clockFixture();
  try {
    // The current occurrence already ran, and a second schedule is not yet due.
    fixture.declare({ id: "ran", everySeconds: 3600, firstDueAt: NOW }, { id: "future", everySeconds: 3600, firstDueAt: later(1800) });
    fixture.ran("ran", 0, 0, { ok: true, at: NOW });
    const before = { data: fixture.files("data"), runs: fixture.files("data", "records", "schedule-run-records") };
    assert.deepEqual(clockReading(fixture.binding, later(30)).due, []);
    const ticked = tickClock(fixture.binding, later(30));
    assert.deepEqual(ticked.started, []);
    assert.deepEqual(await heartbeatFor(fixture, 150), []);
    assert.equal(fixture.runs(), 0);
    // nothing new under data/: no log of runs, no witness, no clock state
    assert.deepEqual({ data: fixture.files("data"), runs: fixture.files("data", "records", "schedule-run-records") }, before);
    assert.deepEqual(fixture.files("data", "logs"), []);
    assert.equal(existsSync(path.join(fixture.dataRoot, "data", "state", "clock")), false);
  } finally { fixture.close(); }
});

test("a due schedule runs once as its account; its state, its log line and its last run are the store's", async () => {
  const fixture = clockFixture();
  try {
    fixture.declare({ id: "once", everySeconds: 3600, firstDueAt: NOW });
    const told = await heartbeatFor(fixture, 150);
    assert.equal(fixture.runs(), 1);
    assert.deepEqual(told.map(({ schedule, occurrence, attempt, ok }) => ({ schedule, occurrence, attempt, ok })), [{ schedule: "once", occurrence: 0, attempt: 0, ok: true }]);
    // the schedule is a thread and its last run the head of the thread of runs
    assert.deepEqual(fixture.files("data", "state", "clock-schedule-state"), ["once.json"]);
    assert.deepEqual(fixture.files("data", "state", "schedule-run-state"), ["once.json"]);
    assert.equal(readHead(fixture.dataRoot, runType, "once").frontier.length, 1);
    assert.equal(fixture.logLines(runType).length, 1);
    // a later heartbeat in the same occurrence reads the last run and starts nothing
    assert.deepEqual(await heartbeatFor(fixture, 100), []);
    assert.equal(fixture.runs(), 1);
    assert.equal(fixture.logLines(runType).length, 1);
  } finally { fixture.close(); }
});

test("schedule-admit and schedules are operations over the same records", async () => {
  const fixture = clockFixture();
  try {
    const options = { subject: "clockkeeper:test", caller: Object.freeze({ transport: "test" }), now: () => later(30), witness: journalRpcWitness(fixture.dataRoot), coordinate: processLeaseCoordinator(fixture.dataRoot) };
    const admitted = await dispatchProjectedSurface(fixture.surface, ["schedule-admit"], JSON.stringify({ id: "by-verb", verb: fixture.job.verb, account: INSTANCE, everySeconds: 3600, firstDueAt: NOW }), options);
    assert.equal(admitted.code, 0, admitted.stderr);
    assert.deepEqual(currentSchedules(fixture.binding).map((schedule) => schedule.id), ["by-verb"]);
    const ticked = tickClock(fixture.binding, later(30));
    assert.deepEqual(ticked.started.map(({ schedule, occurrence, attempt }) => ({ schedule, occurrence, attempt })), [{ schedule: "by-verb", occurrence: 0, attempt: 0 }]);
    await ticked.settled();
    const listed = await dispatchProjectedSurface(fixture.surface, ["schedules"], "{}", options);
    assert.equal(listed.code, 0, listed.stderr);
    const [schedule] = listed.receipt.value.schedules;
    assert.equal(schedule.id, "by-verb");
    assert.deepEqual({ occurrence: schedule.last.occurrence, attempt: schedule.last.attempt, ok: schedule.last.ok }, { occurrence: 0, attempt: 0, ok: true });
    assert.equal("causes" in schedule, false);
    // retiring closes the thread: the schedule is no longer listed and no longer due
    const retired = await dispatchProjectedSurface(fixture.surface, ["schedule-admit"], JSON.stringify({ id: "by-verb", verb: fixture.job.verb, retired: true }), options);
    assert.equal(retired.code, 0, retired.stderr);
    assert.deepEqual(currentSchedules(fixture.binding), []);
    assert.equal([...heads(fixture.dataRoot, scheduleType)].find(({ name }) => name === "by-verb").head.closed, true);
    assert.deepEqual(clockReading(fixture.binding, later(7200)).due, []);
  } finally { fixture.close(); }
});

test("a failed run waits its retry and then gets the next attempt of the same occurrence, until the policy ends", async () => {
  let calls = 0;
  const fixture = clockFixture({ work: () => { calls += 1; throw new Error("the fixture work fails"); } });
  try {
    fixture.declare({ id: "flaky", everySeconds: 3600, firstDueAt: NOW, maxAttempts: 2, retryAfterSeconds: 60 });
    const first = tickClock(fixture.binding, later(30), { now: () => later(31) });
    assert.equal(first.started.length, 1);
    await first.settled();
    const failed = lastRunOf(fixture.binding, "flaky");
    assert.deepEqual({ occurrence: failed.occurrence, attempt: failed.attempt, ok: failed.ok, at: failed.at }, { occurrence: 0, attempt: 0, ok: false, at: later(31) });
    assert.match(failed.error, /fails/u);
    assert.equal(fixture.logLines(runType)[0].outcome, "failed");
    // the retry wait has not passed: blocked, and the wake is its end
    const waiting = clockReading(fixture.binding, later(60));
    assert.deepEqual(waiting.due, []);
    assert.deepEqual(waiting.blocked, [{ schedule: "flaky", occurrence: 0, reason: "retry-wait" }]);
    assert.equal(waiting.wakeAt, later(91));
    // after it, the second attempt; after that the occurrence is spent
    const second = tickClock(fixture.binding, later(100), { now: () => later(101) });
    assert.deepEqual(second.started.map(({ attempt }) => attempt), [1]);
    await second.settled();
    assert.equal(calls, 2);
    assert.deepEqual(clockReading(fixture.binding, later(500)).due, []);
    assert.deepEqual(clockReading(fixture.binding, later(500)).blocked, [{ schedule: "flaky", occurrence: 0, reason: "exhausted" }]);
  } finally { fixture.close(); }
});

test("a run whose process ended before it recorded left no state, so its occurrence is due again", () => {
  const fixture = clockFixture();
  try {
    fixture.declare({ id: "orphaned", everySeconds: 3600, firstDueAt: NOW });
    assert.deepEqual(clockReading(fixture.binding, later(30)).due, [{ schedule: "orphaned", occurrence: 0, attempt: 0 }]);
    // a later occurrence is untaken however the earlier one ended
    fixture.ran("orphaned", 0, 0, { ok: false, at: later(5) });
    assert.deepEqual(clockReading(fixture.binding, later(3700)).due, [{ schedule: "orphaned", occurrence: 1, attempt: 0 }]);
  } finally { fixture.close(); }
});

test("P-wake: every reading's wakeAt is strictly later than its instant, and every wait is longer than zero", () => {
  let seed = 561;
  const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = (items) => items[Math.floor(random() * items.length)];
  for (let round = 0; round < 40; round += 1) {
    const fixture = clockFixture();
    try {
      const schedules = Array.from({ length: 1 + Math.floor(random() * 4) }, (_, index) => {
        const id = `s${index}`;
        const kind = pick(["interval", "interval", "calendar", "demand"]);
        if (kind === "calendar") return { id, schedule: pick(["*/2 * * * *", "0 * * * *", "30 12 * * *"]) };
        if (kind === "demand") {
          const receipt = path.join(fixture.dataRoot, "demand", `${id}.json`);
          mkdirSync(path.dirname(receipt), { recursive: true });
          const shape = pick(["never", "pending", "next-past", "next-future", "idle"]);
          if (shape !== "never") {
            writeFileSync(receipt, JSON.stringify({ endedAt: later(-60), ok: true, demandAsked: true, demand: {
              pending: shape === "pending" ? 1 : 0,
              ...(shape === "next-past" ? { nextAt: later(-10) } : shape === "next-future" ? { nextAt: later(600) } : {}),
            } }));
          }
          return { id, demand: receipt, maxAttempts: 1 + Math.floor(random() * 3), retryAfterSeconds: pick([0, 60]) };
        }
        return { id, everySeconds: pick([60, 120, 3600]), firstDueAt: later(-Math.floor(random() * 7200) + 600), maxAttempts: 1 + Math.floor(random() * 3), retryAfterSeconds: pick([0, 30, 300]) };
      });
      fixture.declare(...schedules);
      const at = later(Math.floor(random() * 120));
      // Leave each due occurrence in some state: untaken, succeeded or failed.
      for (const { schedule, occurrence } of clockReading(fixture.binding, at).due) {
        const state = pick(["untaken", "succeeded", "failed"]);
        if (state === "succeeded") fixture.ran(schedule, occurrence, 0, { ok: true, at });
        if (state === "failed") fixture.ran(schedule, occurrence, 0, { ok: false, at: later(-5) });
      }
      const reading = clockReading(fixture.binding, at);
      assert.ok(Date.parse(reading.wakeAt) > Date.parse(at), `round ${round}: wakeAt ${reading.wakeAt} is not later than ${at}`);
      assert.ok(reading.due.length <= reading.freeSlots);
      for (const entry of reading.blocked) assert.ok(["capacity", "retry-wait", "running", "exhausted"].includes(entry.reason), entry.reason);
      assert.ok(wakeDelay(Date.parse(reading.wakeAt), Date.parse(at), 30_000) > 0);
    } finally { fixture.close(); }
  }
  for (let round = 0; round < 200; round += 1) {
    const at = Math.floor(random() * 1e12);
    const wakeAt = at + Math.floor((random() - 0.5) * 1e6);
    assert.ok(wakeDelay(pick([wakeAt, at, Infinity]), at + Math.floor(random() * 1000), 1 + Math.floor(random() * 60_000)) > 0);
  }
});

test("the store holds the days of runs it was given and no other clock state", async () => {
  const fixture = clockFixture();
  try {
    fixture.declare({ id: "a", everySeconds: 3600, firstDueAt: NOW }, { id: "b", everySeconds: 3600, firstDueAt: NOW });
    const ticked = tickClock(fixture.binding, later(30), { now: () => later(31) });
    assert.equal(ticked.started.length, 2);
    await ticked.settled();
    assert.deepEqual([...logDates(fixture.dataRoot, runType)], [NOW.slice(0, 10)]);
    assert.deepEqual(fixture.logLines(runType).map((line) => line.schedule).sort(), ["a", "b"]);
    assert.deepEqual(fixture.files("data", "state", "schedule-run-state"), ["a.json", "b.json"]);
    assert.equal(existsSync(path.join(fixture.dataRoot, "data", "state", "clock")), false);
  } finally { fixture.close(); }
});
