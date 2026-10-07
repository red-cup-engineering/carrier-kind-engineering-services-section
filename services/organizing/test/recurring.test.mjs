import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { processLeaseCoordinator } from "@red-cup-engineering/computer-system-engine/rpc/coordination";
import { authorizationFromStanding } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { filesystemRpcFeedResponder, journalRpcWitness } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { createOperationCatalog, operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { dispatchProjectedSurface } from "@red-cup-engineering/computer-system-engine/rpc/wire-dispatch";
import { clockOperations, runClockHeartbeat } from "@red-cup-engineering/organizing/work/recurring";

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
      dataRoot,
      rootName: "heartbeat-test",
      intervalMs: 5,
      signal: abort.signal,
      // each tick reads a later instant, so an idle tick that were witnessed would leave its own row
      now: () => new Date(Date.parse(NOW) + (ticks += 1) * 1000).toISOString(),
    });
    await workStarted;
    const overlappingTick = dispatchProjectedSurface(surface, ["run-due"], "{}", dispatchOptions);
    releaseWork();
    assert.equal((await overlappingTick).code, 0);
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
