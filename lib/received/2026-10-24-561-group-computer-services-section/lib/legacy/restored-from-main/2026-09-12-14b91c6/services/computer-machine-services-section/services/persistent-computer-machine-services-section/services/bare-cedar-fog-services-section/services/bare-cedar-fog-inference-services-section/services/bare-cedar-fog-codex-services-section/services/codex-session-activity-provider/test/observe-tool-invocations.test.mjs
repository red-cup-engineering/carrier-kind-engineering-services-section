import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { observeCodexToolInvocations } from "../src/observe-tool-invocations.mjs";

function fixture(rows) {
  const root = mkdtempSync(join(tmpdir(), "codex-tool-observation-"));
  const directory = join(root, "2026", "07", "29"); mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "rollout.jsonl"), `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  return root;
}

const window = { fromExclusive: "2026-07-29T08:00:00.000Z", toInclusive: "2026-07-29T09:00:00.000Z" };

test("projects exact Codex tool dispatch as an observation carrier without transcript or actuator disclosure", async () => {
  const secret = "DO-NOT-DISCLOSE-PROMPT-OR-TOOL-INPUT";
  const root = fixture([
    { timestamp: "2026-07-29T08:01:00.000Z", type: "response_item", payload: { type: "custom_tool_call", name: "exec", call_id: "private-call-id", input: secret, status: "completed" } },
    { timestamp: "2026-07-29T08:02:00.000Z", type: "response_item", payload: { type: "function_call", name: "spawn_agent", call_id: "private-agent-call", arguments: secret } },
    { timestamp: "2026-07-29T08:03:00.000Z", type: "event_msg", payload: { type: "patch_apply_end", stdout: secret } },
  ]);
  const receipt = await observeCodexToolInvocations({ window, recordedAt: window.toInclusive, sessionRoot: root });
  assert.equal(receipt.type, "CodexToolInvocationObservationReceipt");
  assert.equal(receipt.observations.length, 2);
  assert.deepEqual(receipt.observations.map(({ requestedTool }) => requestedTool.name), ["exec", "spawn_agent"]);
  assert.equal(receipt.observations[0].actuator.status, "not-bound-by-transcript-observation");
  assert.equal(receipt.authority.execution, false);
  assert.equal(receipt.authority.restrictedMove, false);
  assert.equal(JSON.stringify(receipt).includes(secret), false);
  assert.equal(JSON.stringify(receipt).includes("private-call-id"), false);
});

test("a missing session store remains an explicit observation failure", async () => {
  await assert.rejects(observeCodexToolInvocations({ window, sessionRoot: join(tmpdir(), "not-a-codex-session-store") }), /unavailable/u);
});
