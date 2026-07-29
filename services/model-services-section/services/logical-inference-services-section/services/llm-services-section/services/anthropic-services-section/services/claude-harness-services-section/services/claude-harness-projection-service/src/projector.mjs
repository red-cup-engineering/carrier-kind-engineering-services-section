import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";

// The projector never authors an agent file itself — it calls the one
// instrument that does, found by the same up-walk every sibling caller in
// this repo uses, never copied. See installing-claude-as-an-agent's own
// header for what it refuses and why.
const PROJECTOR_SHAPE =
  "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/lib/management/skills/installing-claude-as-an-agent/scripts/install-claude-as-an-agent.js";

export function resolveOfficeProjector(repoRoot) {
  const direct = join(repoRoot, PROJECTOR_SHAPE);
  if (existsSync(direct)) return direct;
  throw new Error(`office projector is absent at the expected repository shape: ${direct}`);
}

// A ClaudeAgentHarnessProjection: one machine actor's Claude harness policy.
// Validated the same way codex-agent-harness.json is validated by its own
// projector — an incomplete policy is refused, not patched with a default.
export function loadPolicy(policyPath) {
  const policy = JSON.parse(readFileSync(policyPath, "utf8"));
  if (policy.type !== "ClaudeAgentHarnessProjection") {
    throw new Error(`${policyPath} does not declare 'type: ClaudeAgentHarnessProjection'`);
  }
  if (typeof policy.actor !== "string" || !policy.actor.startsWith("urn:ame:")) {
    throw new Error(`${policyPath} names no valid actor urn`);
  }
  if (typeof policy.rootOffice !== "string" || !policy.rootOffice) {
    throw new Error(`${policyPath} names no rootOffice`);
  }
  if (!Array.isArray(policy.colleagueOffices) || policy.colleagueOffices.length === 0) {
    throw new Error(`${policyPath} requires a nonempty colleagueOffices roster`);
  }
  return Object.freeze(policy);
}

export function colleagueIds(policy) {
  return policy.colleagueOffices.map((office) => office.split("/").at(-1).replace(/\.json$/u, ""));
}

function manifestPath(target) {
  return join(target, ".claude/.claude-agent-manifest");
}

function readManifest(target) {
  const file = manifestPath(target);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
}

// Every office on the policy's roster, installed as a subagent at target by
// the office projector — never by writing .claude/agents/*.md here. The root
// office is never projected as a subordinate colleague: it is the identity a
// session already holds, not one it dispatches to.
export function projectClaudeHarness({ policyPath, repoRoot, target = repoRoot, dryRun = false }) {
  repoRoot = resolve(repoRoot);
  target = resolve(target);
  const policy = loadPolicy(resolve(policyPath));
  if (colleagueIds(policy).includes(policy.rootOffice)) {
    throw new Error(`policy roster names its own rootOffice '${policy.rootOffice}' as a colleague — the root office is not projected as a subordinate`);
  }
  const projector = resolveOfficeProjector(repoRoot);
  const flags = dryRun ? ["--dry-run"] : [];
  const receipts = [];
  for (const office of policy.colleagueOffices) {
    const officePath = join(repoRoot, office);
    if (!existsSync(officePath)) throw new Error(`policy names an office that seats nowhere: ${officePath}`);
    const result = spawnSync(process.execPath, [projector, officePath, target, "--root", repoRoot, ...flags], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    if (result.status !== 0) {
      throw new Error(`office projection failed for ${office}: ${result.stderr || result.stdout}`);
    }
    receipts.push(result.stdout.trim());
  }
  return Object.freeze({ actor: policy.actor, target, colleagues: colleagueIds(policy), receipts, dryRun });
}

// The roster-coverage check: the manifest and .claude/agents/ at target must
// each name every one of the policy's colleagues. This is deliberately a
// subset check, not exact-set equality — .claude/agents/ is one shared
// directory a node's whole roster of independent offices and enterprises
// populates, not a location this one policy owns exclusively. An entry this
// policy did not name is another office's installed colleague, never this
// policy's drift to flag.
export function checkExactRoster({ policyPath, repoRoot, target = repoRoot }) {
  repoRoot = resolve(repoRoot);
  target = resolve(target);
  const policy = loadPolicy(resolve(policyPath));
  const expected = [...colleagueIds(policy)].sort();
  const observed = new Set(readManifest(target));
  const missingFromManifest = expected.filter((id) => !observed.has(id));
  if (missingFromManifest.length > 0) {
    throw new Error(`projected colleague roster at ${target} is missing from the manifest: ${missingFromManifest.join(", ")}`);
  }
  const agentDir = join(target, ".claude/agents");
  const files = new Set(
    existsSync(agentDir)
      ? readdirSync(agentDir).filter((n) => n.endsWith(".md")).map((n) => n.replace(/\.md$/u, ""))
      : [],
  );
  const missingFiles = expected.filter((id) => !files.has(id));
  if (missingFiles.length > 0) {
    throw new Error(`projected agent files at ${agentDir} are missing for: ${missingFiles.join(", ")}`);
  }
  return Object.freeze({ actor: policy.actor, target, colleagues: expected });
}
