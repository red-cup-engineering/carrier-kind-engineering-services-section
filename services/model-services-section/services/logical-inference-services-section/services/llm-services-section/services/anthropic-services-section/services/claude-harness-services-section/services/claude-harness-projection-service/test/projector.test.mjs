import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { colleagueIds, loadPolicy, projectClaudeHarness } from "../src/projector.mjs";

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
