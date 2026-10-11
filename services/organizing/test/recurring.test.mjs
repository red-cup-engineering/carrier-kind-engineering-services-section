import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { processLeaseCoordinator } from "@red-cup-engineering/computer-system-engine/rpc/coordination";
import { authorizationFromStanding } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { filesystemRpcFeedResponder, journalRpcWitness } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { createOperationCatalog, operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { dispatchProjectedSurface } from "@red-cup-engineering/computer-system-engine/rpc/wire-dispatch";
import { clockOperations, clockReading, reconcileDeclaredSchedules, runClockHeartbeat, wakeDelay } from "@red-cup-engineering/organizing/work/recurring";

const NOW = "2026-09-27T12:00:00.000Z";

test("the node heartbeat runs one due occurrence once across overlapping ticks and stops on abort", async () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-clock-heartbeat-"));
  const binding = defaultFilesystemBinding(dataRoot, { now: () => NOW });
  const abort = new AbortController();
  let releaseWork;
  let announceWork;
  const workStarted = new Promise((resolve) => { announceWork = resolve; });
  const workReleased = new Promise((resolve) => { releaseWork = resolve; });
  let runs = 0;
  let ticks = 0;
  const work = operation({
    verb: "heartbeat-fixture-work",
    run: async () => {
      runs += 1;
      announceWork();
      await workReleased;
      return { runs };
    },
  });
  let operations;
  let authorize;
  const clock = clockOperations(binding, () => operations, () => authorize);
  operations = Object.freeze([work, ...clock]);
  authorize = authorizationFromStanding(new Map(operations.map((item) => [item.ref, "held"])));
  const surface = Object.freeze({ catalog: createOperationCatalog(operations), authorize });
  const dispatchOptions = Object.freeze({
    subject: "clockkeeper:test",
    caller: Object.freeze({ transport: "test" }),
    now: () => NOW,
    witness: journalRpcWitness(dataRoot, { namespace: "heartbeat-test" }),
    coordinate: processLeaseCoordinator(dataRoot),
  });

  try {
    const admitted = await dispatchProjectedSurface(surface, ["schedule-admit"], JSON.stringify({
      id: "heartbeat-fixture",
      verb: work.verb,
      account: "scheduled-worker:test",
      everySeconds: 3600,
      firstDueAt: NOW,
    }), dispatchOptions);
    assert.equal(admitted.code, 0, admitted.stderr);

    const heartbeat = runClockHeartbeat(surface, {
      subject: "clockkeeper:test",
      witness: journalRpcWitness(dataRoot, { namespace: "heartbeat-test" }),
      coordinate: processLeaseCoordinator(dataRoot),
      intervalMs: 5,
      signal: abort.signal,
      // each tick reads a later instant, so an idle tick that were witnessed would leave its own row
      now: () => new Date(Date.parse(NOW) + (ticks += 1) * 1000).toISOString(),
    });
    await workStarted;
    const overlappingTick = dispatchProjectedSurface(surface, ["run-due"], "{}", dispatchOptions);
    releaseWork();
    const overlapped = await overlappingTick;
    assert.equal(overlapped.code, 0);
    // RQ-5: a tick witnesses what it started, never a listing of what was already in flight.
    assert.deepEqual(Object.keys(overlapped.receipt.value).sort(), ["kind", "now", "started"]);
    assert.deepEqual(overlapped.receipt.value.started, []);
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(runs, 1);

    abort.abort();
    await heartbeat;
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(runs, 1);
    const witnessFeed = filesystemRpcFeedResponder(dataRoot, "heartbeat-test", () => NOW)().response.body;
    // only the tick that ran the occurrence is witnessed; the idle ticks after it are not
    const clockAttempts = witnessFeed.split("\n").filter((line) => line.startsWith("id:") && line.includes("metroplat.rpc.attempt") && line.includes("metroplat-clock"));
    assert.equal(clockAttempts.length, 1);
    assert.match(witnessFeed, /scheduled-worker:test/u);
  } finally {
    abort.abort();
    releaseWork();
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

// --- Properties of the one clock reading (spec 2026-10-09 rpc-witness-volume, section 8.2) ---

const INSTANCE = "scheduled-worker:test";
const later = (seconds) => new Date(Date.parse(NOW) + seconds * 1000).toISOString();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One node's clock behind a governed surface; `clockStateRoot` set apart from the data root when given. */
function clockFixture({ clockStateRoot } = {}) {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-clock-reading-"));
  const binding = defaultFilesystemBinding(dataRoot, { now: () => NOW, ...(clockStateRoot === undefined ? {} : { clockStateRoot: path.join(dataRoot, clockStateRoot) }) });
  let runs = 0;
  const work = operation({ verb: "reading-fixture-work", run: () => ({ runs: (runs += 1) }) });
  let operations;
  let authorize;
  const clock = clockOperations(binding, () => operations, () => authorize);
  operations = Object.freeze([work, ...clock]);
  authorize = authorizationFromStanding(new Map(operations.map((item) => [item.ref, "held"])));
  const surface = Object.freeze({ catalog: createOperationCatalog(operations), authorize });
  const stateRoot = binding.clockStateRoot ?? path.join(dataRoot, "data", "state", "clock");
  const declare = (...schedules) => reconcileDeclaredSchedules(binding, INSTANCE, schedules.map((schedule) => ({ verb: work.verb, account: INSTANCE, ...schedule })), () => NOW);
  const reserveAs = (id, occurrence, attempt, pid, outcome) => {
    const dir = path.join(stateRoot, "reservations", id);
    mkdirSync(dir, { recursive: true });
    const name = `${occurrence}${attempt === 0 ? "" : `.${attempt}`}`;
    writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ schedule: id, occurrence, attempt, reservedAt: NOW, pid }));
    if (outcome !== undefined) writeFileSync(path.join(dir, `${name}.outcome.json`), JSON.stringify({ schedule: id, occurrence, attempt, ...outcome }));
  };
  // The RPC feed reads the data root's whole rpc journal; the namespace only labels it.
  const rows = (namespace) => {
    const feed = filesystemRpcFeedResponder(dataRoot, namespace, () => NOW)().response.body;
    return feed.split("\n").filter((line) => line.startsWith("id:")).length;
  };
  const tickRows = (namespace) => {
    const feed = filesystemRpcFeedResponder(dataRoot, namespace, () => NOW)().response.body;
    return feed.split("\n").filter((line) => line.startsWith("id:") && line.includes("metroplat.rpc.attempt") && line.includes("run-due")).length;
  };
  return { dataRoot, binding, surface, stateRoot, declare, reserveAs, rows, tickRows, runs: () => runs, close: () => rmSync(dataRoot, { recursive: true, force: true }) };
}

/** Run a heartbeat for `ms` against `fixture`, at a fixed instant; returns what it looked at and obstructed. */
async function heartbeatFor(fixture, ms, { at = later(30), namespace = "clock" } = {}) {
  const abort = new AbortController();
  let looks = 0;
  const obstructions = [];
  const run = runClockHeartbeat(() => { looks += 1; return fixture.surface; }, {
    subject: "clockkeeper:test",
    witness: journalRpcWitness(fixture.dataRoot, { namespace }),
    coordinate: processLeaseCoordinator(fixture.dataRoot),
    intervalMs: 10,
    signal: abort.signal,
    now: () => at,
    onObstruction: (obstruction) => { obstructions.push(obstruction); },
  });
  await sleep(ms);
  abort.abort();
  await run;
  return { looks, obstructions };
}

const deadPid = () => spawnSync(process.execPath, ["-e", ""]).pid;

test("P-idle: a heartbeat whose reading names nothing startable dispatches no run-due and writes no journal row", async () => {
  const fixture = clockFixture();
  try {
    // The current occurrence already ran (succeeded), and a second schedule is not yet due.
    fixture.declare({ id: "ran", everySeconds: 3600, firstDueAt: NOW }, { id: "future", everySeconds: 3600, firstDueAt: later(1800) });
    fixture.reserveAs("ran", 0, 0, process.pid, { ok: true, ranAt: NOW });
    assert.deepEqual(clockReading(fixture.binding, later(30)).startable, []);
    const { looks, obstructions } = await heartbeatFor(fixture, 150);
    assert.ok(looks >= 2, `the heartbeat looked ${looks} times`);
    assert.equal(fixture.rows("clock"), 0);
    assert.equal(fixture.runs(), 0);
    assert.deepEqual(obstructions, []);
  } finally { fixture.close(); }
});

test("P-one-root: the heartbeat reads the reservations run-due writes, under the surface's binding alone", async () => {
  // A state root apart from <dataRoot>/data/state/clock: a heartbeat with a binding of its own would
  // read the default root, find the occurrence unreserved and tick on every look (the 2026-10-05 spin).
  const fixture = clockFixture({ clockStateRoot: "elsewhere/clock" });
  try {
    fixture.declare({ id: "once", everySeconds: 3600, firstDueAt: NOW });
    const first = await heartbeatFor(fixture, 150);
    assert.equal(fixture.runs(), 1);
    assert.equal(fixture.tickRows("clock"), 1);
    assert.deepEqual(first.obstructions, []);
    assert.ok(existsSync(path.join(fixture.stateRoot, "reservations", "once", "0.json")));
    assert.ok(existsSync(path.join(fixture.stateRoot, "reservations", "once", "0.outcome.json")));
    assert.equal(existsSync(path.join(fixture.dataRoot, "data", "state", "clock")), false);
    // A later heartbeat in the same occurrence sees the reservation and does not tick.
    const rowsBefore = fixture.rows("clock");
    await heartbeatFor(fixture, 100);
    assert.equal(fixture.rows("clock"), rowsBefore);
    assert.equal(fixture.runs(), 1);
  } finally { fixture.close(); }
});

test("P-progress: a dispatched run-due that starts nothing records exactly one obstruction and is not repeated", async () => {
  const fixture = clockFixture();
  try {
    // An attempt whose process died unrecorded: the reading names it (the tick must record it
    // interrupted), the tick records it and, with no attempt left, starts nothing.
    fixture.declare({ id: "orphaned", everySeconds: 3600, firstDueAt: NOW });
    fixture.reserveAs("orphaned", 0, 0, deadPid());
    assert.deepEqual(clockReading(fixture.binding, later(30)).startable, [{ schedule: "orphaned", occurrence: 0, attempt: 0 }]);
    const { obstructions } = await heartbeatFor(fixture, 200);
    assert.equal(fixture.tickRows("clock"), 1);
    assert.equal(fixture.runs(), 0);
    assert.equal(obstructions.length, 1);
    assert.deepEqual({ ...obstructions[0], at: undefined }, { kind: "metroplat.clock.obstruction", schedule: "orphaned", occurrence: 0, reason: "exhausted", at: undefined });
    const outcome = JSON.parse(readFileSync(path.join(fixture.stateRoot, "reservations", "orphaned", "0.outcome.json"), "utf8"));
    assert.equal(outcome.interrupted, true);
  } finally { fixture.close(); }
});

test("P-progress: a productive tick starts what the reading named and witnesses only those triples", async () => {
  const fixture = clockFixture();
  try {
    fixture.declare({ id: "a", everySeconds: 3600, firstDueAt: NOW }, { id: "b", everySeconds: 3600, firstDueAt: NOW });
    const reading = clockReading(fixture.binding, later(30));
    const tick = await dispatchProjectedSurface(fixture.surface, ["run-due"], JSON.stringify({ now: later(30) }), {
      subject: "clockkeeper:test", caller: Object.freeze({ transport: "test" }), now: () => later(30),
      witness: journalRpcWitness(fixture.dataRoot, { namespace: "manual" }), coordinate: processLeaseCoordinator(fixture.dataRoot),
    });
    assert.equal(tick.code, 0, tick.stderr);
    assert.deepEqual(tick.receipt.value.started.map(({ schedule, occurrence, attempt }) => ({ schedule, occurrence, attempt })), reading.startable);
    assert.equal("inFlight" in tick.receipt.value, false);
  } finally { fixture.close(); }
});

test("clock-due is a derivation: reading through the surface leaves no journal row", async () => {
  const fixture = clockFixture();
  try {
    fixture.declare({ id: "a", everySeconds: 3600, firstDueAt: NOW });
    const looked = await dispatchProjectedSurface(fixture.surface, ["clock-due"], JSON.stringify({ now: later(30) }), {
      subject: "clockkeeper:test", caller: Object.freeze({ transport: "test" }), now: () => later(30),
      witness: journalRpcWitness(fixture.dataRoot, { namespace: "look" }),
    });
    assert.equal(looked.code, 0, looked.stderr);
    assert.equal(looked.receipt.value.kind, "metroplat.clock.reading");
    assert.deepEqual(looked.receipt.value.startable, [{ schedule: "a", occurrence: 0, attempt: 0 }]);
    assert.equal(fixture.rows("look"), 0);
    assert.equal(existsSync(path.join(fixture.stateRoot, "reservations")), false);
  } finally { fixture.close(); }
});

test("P-wake: every reading's wakeAt is strictly later than its instant, and every wait is longer than zero", () => {
  let seed = 561;
  const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = (items) => items[Math.floor(random() * items.length)];
  const dead = deadPid();
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
      // Leave each due occurrence in some state: untaken, running, succeeded, failed, or orphaned.
      const before = clockReading(fixture.binding, at);
      for (const { schedule, occurrence } of before.startable) {
        const state = pick(["untaken", "running", "succeeded", "failed", "orphaned"]);
        if (state === "running") fixture.reserveAs(schedule, occurrence, 0, process.pid);
        if (state === "succeeded") fixture.reserveAs(schedule, occurrence, 0, process.pid, { ok: true, ranAt: at });
        if (state === "failed") fixture.reserveAs(schedule, occurrence, 0, process.pid, { ok: false, ranAt: later(-5) });
        if (state === "orphaned") fixture.reserveAs(schedule, occurrence, 0, dead);
      }
      const reading = clockReading(fixture.binding, at);
      assert.ok(Date.parse(reading.wakeAt) > Date.parse(at), `round ${round}: wakeAt ${reading.wakeAt} is not later than ${at}`);
      assert.ok(reading.startable.length <= reading.freeSlots);
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
