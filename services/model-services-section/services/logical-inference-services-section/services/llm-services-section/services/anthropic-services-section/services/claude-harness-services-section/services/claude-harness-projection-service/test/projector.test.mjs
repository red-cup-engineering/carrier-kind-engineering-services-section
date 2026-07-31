import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkExactRoster, colleagueIds, loadPolicy, projectClaudeHarness } from "../src/projector.mjs";

// A minimal, structurally-valid colleagueSeatings/rootSeating pair for a
// fixture named "test-office" / "test-root-office" — the paths need not
// resolve to real files unless the test is exercising the
// file-resolving half of the check (verifyIncumbency, inside
// projectClaudeHarness), since loadPolicy only validates structure.
function seatings(id = "test-office") {
  return {
    colleagueSeatings: {
      [id]: { character: `content/characters/${id}.json`, incumbency: `content/incumbencies/${id}-as-${id}.json` },
    },
    rootSeating: { character: "content/character.json", incumbency: "content/incumbencies/root.json" },
  };
}

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
        ...seatings(),
      }),
    );
    const policy = loadPolicy(policyPath);
    assert.deepEqual(colleagueIds(policy), ["test-office"]);
    assert.throws(() => projectClaudeHarness({ policyPath, repoRoot: scratch }), /rootOffice/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("loadPolicy refuses a colleague office with no seating reference", () => {
  const scratch = mkdtempSync(join(tmpdir(), "claude-harness-policy-"));
  try {
    const policyPath = join(scratch, "policy.json");
    writeFileSync(
      policyPath,
      JSON.stringify({
        type: "ClaudeAgentHarnessProjection",
        actor: "urn:ame:test-actor",
        rootOffice: "test-root-office",
        colleagueOffices: ["content/offices/test-office.json"],
        colleagueSeatings: {},
        rootSeating: { character: "content/character.json", incumbency: "content/incumbencies/root.json" },
      }),
    );
    assert.throws(() => loadPolicy(policyPath), /names no seating .*for colleague office 'test-office'/);
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
        ...seatings(),
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

// The inverse of the shared-directory case: a policy that declares it owns
// its target's agent directory (the single projecting policy there) gets
// exact-set semantics — a seated colleague it never named is drift, found
// dogfooding against /home/emsenn/info where an off-policy seat passed the
// subset check silently for two days.
test("checkExactRoster under ownsAgentDirectory refuses a seated colleague the policy never named", () => {
  const scratch = mkdtempSync(join(tmpdir(), "claude-harness-check-"));
  try {
    const policyPath = join(scratch, "policy.json");
    writeFileSync(
      policyPath,
      JSON.stringify({
        type: "ClaudeAgentHarnessProjection",
        actor: "urn:ame:test-actor",
        rootOffice: "test-root-office",
        ownsAgentDirectory: true,
        colleagueOffices: ["content/offices/test-office.json"],
        ...seatings(),
      }),
    );
    const agentDir = join(scratch, ".claude/agents");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(scratch, ".claude/.claude-agent-manifest"), "test-office\noff-policy-office\n");
    writeFileSync(join(agentDir, "test-office.md"), "# test office\n");
    writeFileSync(join(agentDir, "off-policy-office.md"), "# a seat the owning policy never named\n");
    assert.throws(() => checkExactRoster({ policyPath, repoRoot: scratch }), /seats colleagues the owning policy never named: off-policy-office/);
    writeFileSync(join(scratch, ".claude/.claude-agent-manifest"), "test-office\n");
    assert.throws(() => checkExactRoster({ policyPath, repoRoot: scratch }), /agent files at .* exist for colleagues the owning policy never named: off-policy-office/);
    rmSync(join(agentDir, "off-policy-office.md"));
    const result = checkExactRoster({ policyPath, repoRoot: scratch });
    assert.deepEqual(result.colleagues, ["test-office"]);
    assert.equal(result.ownsAgentDirectory, true);
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
        ...seatings(),
      }),
    );
    assert.throws(() => checkExactRoster({ policyPath, repoRoot: scratch }), /missing from the manifest/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// office + character + recognition + induction = officer: a colleague office
// named in colleagueOffices with a structurally-valid colleagueSeatings entry
// (so loadPolicy accepts the policy) but whose incumbency record does not
// actually exist at repoRoot is still a bare office at project time, and
// projectClaudeHarness — which alone holds repoRoot to resolve the seating
// paths — refuses it rather than dispatching an uncharactered subagent.
test("projectClaudeHarness refuses a colleague office whose incumbency does not resolve", () => {
  const scratch = mkdtempSync(join(tmpdir(), "claude-harness-project-"));
  try {
    const policyPath = join(scratch, "policy.json");
    writeFileSync(
      policyPath,
      JSON.stringify({
        type: "ClaudeAgentHarnessProjection",
        actor: "urn:ame:test-actor",
        rootOffice: "test-root-office",
        colleagueOffices: ["content/offices/test-office.json"],
        ...seatings(),
      }),
    );
    mkdirSync(join(scratch, "content/offices"), { recursive: true });
    writeFileSync(join(scratch, "content/offices/test-office.json"), JSON.stringify({ kind: "office", id: "test-office" }));
    // The seating check is required to trip before any office is ever
    // spawned to the installer, so a stub installer is seated here purely to
    // let execution reach that check — resolveOfficeProjector runs first and
    // would otherwise refuse the scratch repoRoot as an ⊥ absence of its own,
    // which is not the refusal this test is about.
    const installerPath = join(
      scratch,
      "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills/installing-claude-as-an-agent/scripts/install-claude-as-an-agent.js",
    );
    mkdirSync(dirname(installerPath), { recursive: true });
    writeFileSync(installerPath, `#!/usr/bin/env node\nprocess.exit(0);\n`);
    // Deliberately no content/incumbencies/test-office-as-test-office.json —
    // the seating reference names a record that was never actually seated.
    assert.throws(
      () => projectClaudeHarness({ policyPath, repoRoot: scratch }),
      /refusing to project a bare office with no officer behind it/,
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// The positive case: a colleague office backed by a real incumbency record
// (office matches) and a real character record (kind "session", id matches
// the incumbency's holder) projects — the projector hands the installer both
// paths via --character/--incumbency so it can render the animation framing.
test("projectClaudeHarness projects a colleague office that is seated", () => {
  const scratch = mkdtempSync(join(tmpdir(), "claude-harness-project-"));
  try {
    const policyPath = join(scratch, "policy.json");
    writeFileSync(
      policyPath,
      JSON.stringify({
        type: "ClaudeAgentHarnessProjection",
        actor: "urn:ame:test-actor",
        rootOffice: "test-root-office",
        colleagueOffices: ["content/offices/test-office.json"],
        ...seatings(),
      }),
    );
    mkdirSync(join(scratch, "content/offices"), { recursive: true });
    writeFileSync(join(scratch, "content/offices/test-office.json"), JSON.stringify({ kind: "office", id: "test-office" }));
    mkdirSync(join(scratch, "content/characters"), { recursive: true });
    writeFileSync(
      join(scratch, "content/characters/test-office.json"),
      JSON.stringify({ id: "test-office-session", name: "Test office session", kind: "session", disposition: "Does the test thing." }),
    );
    mkdirSync(join(scratch, "content/incumbencies"), { recursive: true });
    writeFileSync(
      join(scratch, "content/incumbencies/test-office-as-test-office.json"),
      JSON.stringify({
        id: "test-office-session-as-test-office",
        office: "test-office",
        holder: "test-office-session",
        recognition: "t",
        induction: "t",
        from: "2026-07-30",
      }),
    );
    // The real installer instrument is not present under this scratch
    // repoRoot; stand in a stub at the exact repository shape
    // resolveOfficeProjector requires, so this test exercises
    // projectClaudeHarness's own seating logic without invoking the real
    // installer (that instrument's behavior is exercised by its own tests).
    const installerPath = join(
      scratch,
      "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills/installing-claude-as-an-agent/scripts/install-claude-as-an-agent.js",
    );
    mkdirSync(dirname(installerPath), { recursive: true });
    writeFileSync(
      installerPath,
      `#!/usr/bin/env node\nconsole.log("stub-installed:", process.argv.slice(2).join(" "));\nprocess.exit(0);\n`,
    );
    const result = projectClaudeHarness({ policyPath, repoRoot: scratch, dryRun: true });
    assert.deepEqual(result.colleagues, ["test-office"]);
    assert.equal(result.receipts.length, 1);
    assert.match(result.receipts[0], /--character .*content[/\\]characters[/\\]test-office\.json/);
    assert.match(result.receipts[0], /--incumbency .*content[/\\]incumbencies[/\\]test-office-as-test-office\.json/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
