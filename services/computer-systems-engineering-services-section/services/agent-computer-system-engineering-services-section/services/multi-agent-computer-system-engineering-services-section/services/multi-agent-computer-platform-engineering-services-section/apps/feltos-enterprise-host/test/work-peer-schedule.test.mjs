import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { catchUpWorkPeer, workReplicationOperations } from "../src/work-replication.mjs";

// The owning release supplies its exact reviewed machine declarations. Package
// placement is an installation detail and cannot identify a machine's schedule.
const snapshot = process.env.GUIX_MACHINE_SNAPSHOT;
const instance = snapshot ? JSON.parse(readFileSync(join(snapshot,"deployment/instance.json"),"utf8")) : undefined;

test("the machine snapshot declares peer catch-up due on start with retries", { skip: !snapshot && "work-peer schedule receiving requires GUIX_MACHINE_SNAPSHOT" }, () => {
  const [operation] = workReplicationOperations({ config: {}, binding: {}, provider: () => undefined, host: "bare-cedar-fog" });
  const schedule = instance.schedules.find((candidate) => candidate.verb === operation.verb);
  assert.equal(schedule?.id, "work-peer-catch-up");
  assert.equal(schedule.everySeconds, 900);
  assert.ok(Date.parse(schedule.firstDueAt) < Date.parse("2026-10-04"), "already due when the node starts");
  assert.ok(schedule.maxAttempts > 1 && schedule.retryAfterSeconds > 0, "a failed delivery is retried by the schedule");
  assert.ok(instance.capabilities.includes(operation.verb));
});

test("catching up does nothing on a node with no work peer", async () => {
  const binding = defaultFilesystemBinding(mkdtempSync(join(tmpdir(), "work-peer-schedule-")));
  const result = await catchUpWorkPeer({ config: {}, provider: undefined, binding, host: "bare-cedar-fog" });
  assert.equal(result.shipped.length + result.failed.length, 0);
});
