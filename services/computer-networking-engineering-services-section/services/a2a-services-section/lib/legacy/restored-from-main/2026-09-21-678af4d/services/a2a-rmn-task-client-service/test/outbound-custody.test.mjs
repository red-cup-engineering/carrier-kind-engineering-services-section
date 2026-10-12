import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { outboundRecordPath, readOutboundRecord, seatOutboundRecord } from "../src/outbound-custody.mjs";

const agentUrl = "https://market.example/.well-known/agent-card.json";
const inputNi = `ni:///sha-256;${"A".repeat(43)}`;

test("outbound custody distinguishes deliberate attempts without changing demand identity", () => {
  const root = mkdtempSync(join(tmpdir(), "a2a-outbound-custody-"));
  try {
    const first = outboundRecordPath(root, agentUrl, inputNi, "attempt:first");
    const replay = outboundRecordPath(root, agentUrl, inputNi, "attempt:first");
    const second = outboundRecordPath(root, agentUrl, inputNi, "attempt:second");
    assert.equal(first, replay);
    assert.notEqual(first, second);

    const record = { protocol: "A2A", protocolVersion: "1.0", agentUrl, inputNi, attemptId: "attempt:first", taskId: "task:first" };
    seatOutboundRecord(first, record);
    assert.deepEqual(readOutboundRecord(replay, agentUrl, inputNi, "attempt:first"), record);
    assert.equal(readOutboundRecord(second, agentUrl, inputNi, "attempt:second"), null);
    assert.equal(JSON.parse(readFileSync(first, "utf8")).inputNi, inputNi);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("custody refuses coordinate drift and concurrent task divergence", () => {
  const root = mkdtempSync(join(tmpdir(), "a2a-outbound-custody-"));
  try {
    const path = outboundRecordPath(root, agentUrl, inputNi, "attempt:first");
    const record = { protocol: "A2A", protocolVersion: "1.0", agentUrl, inputNi, attemptId: "attempt:first", taskId: "task:first" };
    seatOutboundRecord(path, record);
    assert.throws(() => readOutboundRecord(path, agentUrl, inputNi, "attempt:other"), /custody record drifted/u);
    assert.throws(() => seatOutboundRecord(path, { ...record, taskId: "task:other" }), /submissions diverged/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
