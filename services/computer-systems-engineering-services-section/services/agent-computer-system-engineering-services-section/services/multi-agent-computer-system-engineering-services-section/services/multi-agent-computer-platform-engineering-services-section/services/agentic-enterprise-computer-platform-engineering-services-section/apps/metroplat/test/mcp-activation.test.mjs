import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { activateMcpRequestedCapabilities, mcpOptions, mcpProcessConfig } from "@red-cup-engineering/metroplat/mcp-options";
import { defaultMcpApex } from "@red-cup-engineering/metroplat/mcp-surface";
import { programMcpHandle } from "@red-cup-engineering/metroplat/presentation/serving";
import { grantAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { admitCapabilityAssertions, readCapabilityAssertions } from "@red-cup-engineering/computer-system-engine/rpc/capability-assertions";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { readCodexSessionEncounterHandle } from "@red-cup-engineering/feltos/agents/sessions/codex/service";

const AT = "2026-09-01T12:00:00.000Z";

function row(type, payload, timestamp) {
  return JSON.stringify({ timestamp, type, payload });
}

function message(role, text) {
  return {
    type: "message",
    role,
    content: [{ type: role === "assistant" ? "output_text" : "input_text", text }],
  };
}

function writeCodexSession(root, sessionId) {
  const dated = path.join(root, "2026", "09", "01");
  mkdirSync(dated, { recursive: true });
  writeFileSync(path.join(dated, `rollout-${sessionId}.jsonl`), [
    row("session_meta", { id: sessionId }, AT),
    row("response_item", message("user", "Admit this session to shared work."), "2026-09-01T12:00:01.000Z"),
    row("response_item", message("assistant", "Ready for customer assay."), "2026-09-01T12:00:02.000Z"),
  ].join("\n"));
}

async function callTool(dataRoot, apex, subject, name, input) {
  const response = await programMcpHandle(apex, {
    jsonrpc: "2.0",
    id: `${subject}:${name}`,
    method: "tools/call",
    params: { name, arguments: { input } },
  }, mcpOptions(dataRoot, apex, {}, subject));
  assert.notEqual(response, undefined);
  return response;
}

test("MCP process configuration accepts an explicit actor and Codex store", () => {
  const fromArgs = mcpProcessConfig(
    ["--subject", "codex", "--codex-session-root", "stores/codex"],
    {},
    "/srv/metroplat",
  );
  assert.deepEqual(fromArgs, {
    subject: "codex",
    codexSessionRoot: "/srv/metroplat/stores/codex",
    requestedCapabilityVerbs: [],
  });

  const fromEnv = mcpProcessConfig([], {
    METROPLAT_MCP_SUBJECT: "agent:remote",
    METROPLAT_CODEX_SESSION_ROOT: "/var/lib/codex-sessions",
  });
  assert.deepEqual(fromEnv, {
    subject: "agent:remote",
    codexSessionRoot: "/var/lib/codex-sessions",
    requestedCapabilityVerbs: [],
  });
  assert.equal(mcpProcessConfig([], {}).subject, "claude", "the existing Claude process default remains intact");
  assert.throws(() => mcpProcessConfig(["--subject"], {}), /requires a non-empty value/u);
  assert.throws(() => mcpProcessConfig(["--codex-session-root="], {}), /requires a non-empty value/u);
  assert.deepEqual(
    mcpProcessConfig([], { METROPLAT_MCP_CAPABILITIES: "term-intension,work-item" }).requestedCapabilityVerbs,
    ["term-intension", "work-item"],
  );
  assert.throws(
    () => mcpProcessConfig([], { METROPLAT_MCP_CAPABILITIES: "term-intension,,work-item" }),
    /comma-separated list of operation verbs/u,
  );
  assert.throws(
    () => mcpProcessConfig([], { METROPLAT_MCP_CAPABILITIES: "term-intension,term-intension" }),
    /must not repeat/u,
  );
});

test("MCP activation grants only requested catalog operations and is stable once held", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-mcp-capability-"));
  const subject = "actor:WWOM5azg-fTrn1Id0YVbz5AhppbnFny_W5Xl-rKgSs4";
  try {
    const apex = defaultMcpApex(dataRoot);
    const config = { subject, requestedCapabilityVerbs: ["term-intension"] };
    const activated = activateMcpRequestedCapabilities(dataRoot, apex, config, () => AT);
    assert.deepEqual(activated.granted, ["infograph#term-intension"]);
    assert.deepEqual(activated.alreadyHeld, []);
    assert.deepEqual(readCapabilityAssertions(dataRoot).map(({ holder, grants }) => ({ holder, grants })), [
      { holder: subject, grants: "infograph#term-intension" },
    ]);

    const repeated = activateMcpRequestedCapabilities(dataRoot, apex, config, () => "2026-09-01T12:01:00.000Z");
    assert.deepEqual(repeated.granted, []);
    assert.deepEqual(repeated.alreadyHeld, ["infograph#term-intension"]);
    assert.equal(readCapabilityAssertions(dataRoot).length, 1);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("MCP activation refuses unknown requested operations before journal mutation", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-mcp-capability-unknown-"));
  try {
    const apex = defaultMcpApex(dataRoot);
    assert.throws(
      () => activateMcpRequestedCapabilities(dataRoot, apex, {
        subject: "actor:WWOM5azg-fTrn1Id0YVbz5AhppbnFny_W5Xl-rKgSs4",
        requestedCapabilityVerbs: ["not-a-catalog-operation"],
      }, () => AT),
      /not catalog operations: not-a-catalog-operation/u,
    );
    assert.deepEqual(readCapabilityAssertions(dataRoot), []);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("default filesystem binding keeps host defaults and honors an explicit Codex store", () => {
  const root = path.join(tmpdir(), "metroplat-binding-default");
  assert.equal(defaultFilesystemBinding(root).codexSessionRoot, path.join(homedir(), ".codex", "sessions"));
  assert.equal(
    defaultFilesystemBinding(root, { codexSessionRoot: "/srv/codex/sessions" }).codexSessionRoot,
    "/srv/codex/sessions",
  );
});

test("a large lossless encounter has a bounded RPC handle", () => {
  const parent = mkdtempSync(path.join(tmpdir(), "metroplat-large-encounter-"));
  const sessionId = "large-encounter-session";
  const dated = path.join(parent, "2026", "09", "01");
  const large = "evidence ".repeat(50_000);
  try {
    mkdirSync(dated, { recursive: true });
    writeFileSync(path.join(dated, `rollout-${sessionId}.jsonl`), [
      row("session_meta", { id: sessionId }, AT),
      row("response_item", { type: "function_call", call_id: "large-1", name: "exec_command", arguments: large }, "2026-09-01T12:00:01.000Z"),
      row("response_item", { type: "function_call_output", call_id: "large-1", output: large }, "2026-09-01T12:00:02.000Z"),
      row("response_item", { type: "function_call", call_id: "large-2", name: "exec_command", arguments: large }, "2026-09-01T12:00:03.000Z"),
      row("response_item", { type: "function_call_output", call_id: "large-2", output: large }, "2026-09-01T12:00:04.000Z"),
    ].join("\n"));
    const handle = readCodexSessionEncounterHandle(parent, `2026/09/01/rollout-${sessionId}.jsonl`, { sessionId });
    assert.equal(handle.kind, "metroplat.codex-session.encounter-handle");
    assert.equal(handle.counts.toolActs, 2);
    assert.equal(handle.counts.toolOutcomes, 2);
    assert.ok(Buffer.byteLength(JSON.stringify(handle), "utf8") < 1024 * 1024);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("Claude and Codex MCP actors use their own held standing and the explicit Codex store", async () => {
  const parent = mkdtempSync(path.join(tmpdir(), "metroplat-mcp-activation-"));
  const dataRoot = path.join(parent, "settlement");
  const codexSessionRoot = path.join(parent, "codex-sessions");
  const claudeSessionRoot = path.join(parent, "claude-sessions");
  const sessionId = "mcp-activation-session";
  try {
    mkdirSync(dataRoot, { recursive: true });
    mkdirSync(claudeSessionRoot, { recursive: true });
    writeCodexSession(codexSessionRoot, sessionId);
    admitCapabilityAssertions({
      dataRoot,
      rootName: "test:mcp-activation",
      date: AT.slice(0, 10),
      assertions: [
        grantAssertion("test:bootstrap", "claude", "infograph#claude-session-status", AT),
        grantAssertion("test:bootstrap", "codex", "infograph#codex-session-encounter", AT),
        grantAssertion("test:bootstrap", "codex", "infograph#codex-session-admit", AT),
      ],
    });
    const apex = defaultMcpApex(dataRoot, { claudeSessionRoot, codexSessionRoot });

    const claude = await callTool(dataRoot, apex, "claude", "claude-session-status", { sessionId: "absent" });
    assert.equal(claude.result.isError, undefined);

    const encounter = await callTool(dataRoot, apex, "codex", "codex-session-encounter", { sessionId });
    assert.equal(encounter.result.isError, undefined);
    const encounterRead = JSON.parse(encounter.result.content[0].text);
    assert.equal(encounterRead.kind, "metroplat.codex-session.encounter-handle");
    assert.equal(encounterRead.root, path.resolve(codexSessionRoot));
    assert.equal(encounterRead.sessionId, sessionId);

    const admission = await callTool(dataRoot, apex, "codex", "codex-session-admit", { sessionId });
    assert.equal(admission.result.isError, undefined);
    const admitted = JSON.parse(admission.result.content[0].text);
    assert.equal(admitted.kind, "metroplat.holography.codex-session-admit");
    assert.equal(admitted.sessionId, sessionId);

    const refused = await callTool(dataRoot, apex, "claude", "codex-session-encounter", { sessionId });
    assert.equal(refused.result.isError, true, "Claude's grant does not become Codex standing");
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});
