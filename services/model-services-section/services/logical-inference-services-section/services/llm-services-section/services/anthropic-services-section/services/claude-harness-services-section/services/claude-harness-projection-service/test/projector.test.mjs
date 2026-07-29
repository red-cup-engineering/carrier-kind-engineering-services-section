import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkExactRoster, colleagueIds, loadPolicy, projectClaudeHarness } from "../src/projector.mjs";

test("loadPolicy refuses a policy naming its own root office as a colleague", () => {
  const scratch = mkdtempSync(join(tmpdir(), "claude-harness-policy-"));
  try {
    const policyPath = join(scratch, "policy.json");
    writeFileSync(
      policyPath,
      JSON.stringify({
        type: "ClaudeAgentHarnessProjection",
        actor: "urn:ame:test-actor",
        rootOffice: "test-office",
        colleagueOffices: ["content/offices/test-office.json"],
      }),
    );
    const policy = loadPolicy(policyPath);
    assert.deepEqual(colleagueIds(policy), ["test-office"]);
    assert.throws(() => projectClaudeHarness({ policyPath, repoRoot: scratch }), /rootOffice/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("loadPolicy refuses a policy with no colleagueOffices", () => {
  const scratch = mkdtempSync(join(tmpdir(), "claude-harness-policy-"));
  try {
    const policyPath = join(scratch, "policy.json");
    writeFileSync(
      policyPath,
      JSON.stringify({ type: "ClaudeAgentHarnessProjection", actor: "urn:ame:test-actor", rootOffice: "test-office", colleagueOffices: [] }),
    );
    assert.throws(() => loadPolicy(policyPath), /nonempty/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// .claude/agents/ is one shared directory a node's whole roster of
// independent offices populates, not a location one policy owns exclusively.
// A colleague another policy installed must never read as this policy's
// drift — reproduces the real bug found dogfooding this harness against
// /home/emsenn/info, where an unrelated office's obsmetrologia-consultant.md
// made checkExactRoster refuse a roster that was, in fact, exactly installed.
test("checkExactRoster ignores an unrelated agent installed by another policy", () => {
  const scratch = mkdtempSync(join(tmpdir(), "claude-harness-check-"));
  try {
    const policyPath = join(scratch, "policy.json");
    writeFileSync(
      policyPath,
      JSON.stringify({
        type: "ClaudeAgentHarnessProjection",
        actor: "urn:ame:test-actor",
        rootOffice: "test-root-office",
        colleagueOffices: ["content/offices/test-office.json"],
      }),
    );
    const agentDir = join(scratch, ".claude/agents");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(scratch, ".claude/.claude-agent-manifest"), "test-office\nunrelated-office\n");
    writeFileSync(join(agentDir, "test-office.md"), "# test office\n");
    writeFileSync(join(agentDir, "unrelated-office.md"), "# an unrelated office installed by a different policy\n");
    const result = checkExactRoster({ policyPath, repoRoot: scratch });
    assert.deepEqual(result.colleagues, ["test-office"]);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("checkExactRoster still refuses a colleague that never actually installed", () => {
  const scratch = mkdtempSync(join(tmpdir(), "claude-harness-check-"));
  try {
    const policyPath = join(scratch, "policy.json");
    writeFileSync(
      policyPath,
      JSON.stringify({
        type: "ClaudeAgentHarnessProjection",
        actor: "urn:ame:test-actor",
        rootOffice: "test-root-office",
        colleagueOffices: ["content/offices/test-office.json"],
      }),
    );
    assert.throws(() => checkExactRoster({ policyPath, repoRoot: scratch }), /missing from the manifest/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
