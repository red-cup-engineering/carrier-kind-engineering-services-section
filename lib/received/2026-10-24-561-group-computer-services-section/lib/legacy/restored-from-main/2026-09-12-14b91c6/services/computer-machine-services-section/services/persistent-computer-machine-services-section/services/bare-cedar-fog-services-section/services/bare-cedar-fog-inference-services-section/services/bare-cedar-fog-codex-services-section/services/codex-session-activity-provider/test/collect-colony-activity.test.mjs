import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { collectCodexSessionActivity } from "../src/collect-colony-activity.mjs";

test("reports only privacy-bounded metadata inside the exact interval", async () => {
  const root = mkdtempSync(join(tmpdir(), "codex-session-pulse-")); const directory = join(root, "2026", "07", "19"); mkdirSync(directory, { recursive: true });
  const secret = "DO-NOT-DISCLOSE-TRANSCRIPT-TEXT";
  const rows = [
    { timestamp: "2026-07-20T01:59:59.000Z", type: "event_msg", payload: { type: "user_message", message: secret } },
    { timestamp: "2026-07-20T02:01:00.000Z", type: "event_msg", payload: { type: "user_message", message: secret } },
    { timestamp: "2026-07-20T02:02:00.000Z", type: "response_item", payload: { type: "custom_tool_call", name: "exec", input: secret } },
    { timestamp: "2026-07-20T02:03:00.000Z", type: "event_msg", payload: { type: "patch_apply_end", output: secret } },
    { timestamp: "2026-07-20T02:04:00.000Z", type: "event_msg", payload: { type: "task_complete" } }
  ];
  writeFileSync(join(directory, "rollout-test.jsonl"), `${rows.map(JSON.stringify).join("\n")}\n`, "utf8");
  const window = { fromExclusive: "2026-07-20T02:00:00.000Z", toInclusive: "2026-07-20T03:00:00.000Z", baseline: false };
  const pulse = await collectCodexSessionActivity({ window, recordedAt: window.toInclusive, sessionRoot: root });
  assert.equal(pulse.events.length, 2);
  assert.equal(pulse.events.find((event) => event.domain === "politics").quantities[0].amount, "1");
  assert.equal(pulse.events.find((event) => event.domain === "work").quantities.find((quantity) => quantity.label === "Codex tool invocations").amount, "1");
  assert.equal(JSON.stringify(pulse).includes(secret), false);
  assert.match(pulse.events.find((event) => event.domain === "politics").summary, /not automatically classified/u);
  assert.match(pulse.refusals.find((refusal) => refusal.domain === "work").reason, /cannot classify Leader corrections/u);
});

test("zero political and runtime counts are not promoted into consequential events", async () => {
  const root = mkdtempSync(join(tmpdir(), "codex-session-zero-events-")); const directory = join(root, "2026", "07", "19"); mkdirSync(directory, { recursive: true });
  const rows = [
    { timestamp: "2026-07-20T02:01:00.000Z", type: "response_item", payload: { type: "custom_tool_call", name: "exec" } },
    { timestamp: "2026-07-20T02:02:00.000Z", type: "event_msg", payload: { type: "patch_apply_end" } },
  ];
  writeFileSync(join(directory, "rollout-test.jsonl"), `${rows.map(JSON.stringify).join("\n")}\n`, "utf8");
  const window = { fromExclusive: "2026-07-20T02:00:00.000Z", toInclusive: "2026-07-20T03:00:00.000Z", baseline: false };
  const pulse = await collectCodexSessionActivity({ window, recordedAt: window.toInclusive, sessionRoot: root });
  assert.deepEqual(pulse.events.map((event) => event.domain), ["work"]);
});

test("a quiet interval emits no invented work event", async () => {
  const root = mkdtempSync(join(tmpdir(), "codex-session-quiet-"));
  const window = { fromExclusive: "2026-07-20T02:00:00.000Z", toInclusive: "2026-07-20T03:00:00.000Z", baseline: false };
  const pulse = await collectCodexSessionActivity({ window, recordedAt: window.toInclusive, sessionRoot: root });
  assert.deepEqual(pulse.events, []);
});
