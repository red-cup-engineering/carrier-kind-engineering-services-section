import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { catchUpWorkPeer, workReplicationOperations } from "../src/work-replication.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const house = here.slice(0, here.indexOf("/services/engineering-services-section"));
const group = join(house, "services/561-group-services-section/services/561-group-operations-services-section");
const instance = JSON.parse(readFileSync(join(group, "sites/bare-cedar-fog.561.group/config/metroplat-instance.json"), "utf8"));

test("Bare Cedar Fog declares the work-peer catch-up as a node schedule, due on start and every 900 s, with a retry", () => {
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
