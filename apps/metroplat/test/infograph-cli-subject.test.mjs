import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { INFOGRAPH_PROCESS_OPTION_FLAGS, resolveInfographProcessOptions } from "@red-cup-engineering/metroplat/process-options";
import { grantAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { admitCapabilityAssertions } from "@red-cup-engineering/computer-system-engine/rpc/capability-assertions";

const packageRoot = path.resolve(import.meta.dirname, "..");
const AT = "2026-09-02T00:00:00.000Z";
const SUBJECT = "actor:bZH6KBOlPVWbYpqp04izN_Xtwykn0XgsMBStm_FkPPw";
const STANDING_REFUSAL = /subject standing is unknown; held standing is required/u;

// The full catalog's import graph makes each cold invocation of the CLI
// dispatcher slow (observed 10-15s on this box); give it real headroom
// rather than racing it.
function runInfograph(dataRoot, args, env, input = "{}\n") {
  return spawnSync(process.execPath, [...process.execArgv.filter((flag) => !flag.startsWith("--test")), "scripts/metroplat.mjs", ...args], {
    cwd: packageRoot,
    env: { ...process.env, METROPLAT_DATA_ROOT: dataRoot, ...env },
    input,
    encoding: "utf8",
    timeout: 60_000,
  });
}

test("resolveInfographProcessOptions gives the CLI dispatcher and the MCP server the same precedence, different defaults", () => {
  assert.deepEqual(resolveInfographProcessOptions([], "anonymous", {}), {
    subject: "anonymous",
    requestedCapabilityVerbs: [],
  });
  assert.deepEqual(resolveInfographProcessOptions([], "claude", {}), {
    subject: "claude",
    requestedCapabilityVerbs: [],
  });
  assert.equal(
    resolveInfographProcessOptions([], "anonymous", { METROPLAT_MCP_SUBJECT: SUBJECT }).subject,
    SUBJECT,
  );
  assert.equal(
    resolveInfographProcessOptions(["--subject", "actor:flag"], "anonymous", { METROPLAT_MCP_SUBJECT: SUBJECT }).subject,
    "actor:flag",
    "--subject outranks METROPLAT_MCP_SUBJECT, same precedence as the MCP boundary",
  );
  assert.deepEqual(
    resolveInfographProcessOptions([], "anonymous", { METROPLAT_MCP_CAPABILITIES: "agent-work-dispatch,work-item" })
      .requestedCapabilityVerbs,
    ["agent-work-dispatch", "work-item"],
  );
});

test("resolveInfographProcessOptions resolves --claude-session-root/METROPLAT_CLAUDE_SESSION_ROOT the same way it already resolves the codex pair", () => {
  assert.equal(
    resolveInfographProcessOptions([], "claude", {}).claudeSessionRoot,
    undefined,
    "absent by default, same as codexSessionRoot",
  );
  assert.equal(
    resolveInfographProcessOptions([], "claude", { METROPLAT_CLAUDE_SESSION_ROOT: "/home/emsenn/.claude/projects/-home-emsenn-info" }).claudeSessionRoot,
    "/home/emsenn/.claude/projects/-home-emsenn-info",
  );
  assert.equal(
    resolveInfographProcessOptions(
      ["--claude-session-root", "/flag/root"],
      "claude",
      { METROPLAT_CLAUDE_SESSION_ROOT: "/env/root" },
    ).claudeSessionRoot,
    "/flag/root",
    "--claude-session-root outranks METROPLAT_CLAUDE_SESSION_ROOT, same precedence as the codex pair",
  );
  assert.ok(
    INFOGRAPH_PROCESS_OPTION_FLAGS.includes("--claude-session-root"),
    "the flag is named among the process-boundary flags a domain dispatcher never sees",
  );
});

test("infograph CLI still refuses the anonymous default when nothing is supplied", { timeout: 60_000 }, () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-infograph-cli-subject-default-"));
  try {
    const result = runInfograph(dataRoot, ["agent-work-dispatch"], {});
    assert.equal(result.status, 1);
    assert.match(result.stderr, STANDING_REFUSAL);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("infograph CLI resolves the real actor from METROPLAT_MCP_SUBJECT and dispatches once that actor holds standing", { timeout: 120_000 }, () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-infograph-cli-subject-held-"));
  try {
    admitCapabilityAssertions({
      dataRoot,
      rootName: "test:infograph-cli-subject",
      date: AT.slice(0, 10),
      assertions: [grantAssertion("test:bootstrap", SUBJECT, "infograph#agent-work-dispatch", AT)],
    });

    // Before the fix this call always ran as "anonymous" and refused
    // regardless of who the caller actually was.
    const held = runInfograph(dataRoot, ["agent-work-dispatch"], { METROPLAT_MCP_SUBJECT: SUBJECT });
    assert.equal(held.status, 0, held.stderr);
    const readout = JSON.parse(held.stdout);
    assert.equal(readout.kind, "metroplat.agent-work.dispatch-settlement");

    // The grant is scoped to SUBJECT, not to whichever caller happens to ask;
    // the anonymous default still gets the standing refusal on the same root.
    const anonymous = runInfograph(dataRoot, ["agent-work-dispatch"], {});
    assert.equal(anonymous.status, 1);
    assert.match(anonymous.stderr, STANDING_REFUSAL);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("infograph CLI activates a requested capability the same way the MCP boundary does", { timeout: 60_000 }, () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-infograph-cli-capabilities-"));
  try {
    const result = runInfograph(dataRoot, ["agent-work-dispatch"], {
      METROPLAT_MCP_SUBJECT: SUBJECT,
      METROPLAT_MCP_CAPABILITIES: "agent-work-dispatch",
    });
    assert.equal(result.status, 0, result.stderr);
    const readout = JSON.parse(result.stdout);
    assert.equal(readout.kind, "metroplat.agent-work.dispatch-settlement");
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("infograph CLI threads METROPLAT_CLAUDE_SESSION_ROOT into its binding, same as the MCP boundary", { timeout: 60_000 }, () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-infograph-cli-session-root-"));
  const dataRoot = path.join(root, "data-root");
  const claudeSessionRoot = path.join(root, "claude");
  try {
    mkdirSync(dataRoot, { recursive: true });
    mkdirSync(claudeSessionRoot, { recursive: true });
    writeFileSync(path.join(claudeSessionRoot, "cli-session-root-test.jsonl"), `${JSON.stringify({
      type: "assistant",
      sessionId: "cli-session-root-test",
      requestId: "request-cli-session-root-test",
      timestamp: AT,
      message: {
        id: "message-cli-session-root-test",
        model: "claude-test",
        role: "assistant",
        usage: { input_tokens: 5, output_tokens: 2 },
      },
    })}\n`);

    // Before the fix, infograph.mts built its binding before resolving
    // --claude-session-root/METROPLAT_CLAUDE_SESSION_ROOT, so this always
    // read `sessions: 0` against the real home directory regardless of what
    // was configured here.
    const result = runInfograph(dataRoot, ["agent-session-token-usage-admit"], {
      METROPLAT_MCP_SUBJECT: SUBJECT,
      METROPLAT_MCP_CAPABILITIES: "agent-session-token-usage-admit",
      METROPLAT_CLAUDE_SESSION_ROOT: claudeSessionRoot,
    }, `${JSON.stringify({ provider: "claude" })}\n`);
    assert.equal(result.status, 0, result.stderr);
    const readout = JSON.parse(result.stdout);
    assert.equal(readout.sessions, 1);
    assert.equal(readout.results[0].relative, "cli-session-root-test.jsonl");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
