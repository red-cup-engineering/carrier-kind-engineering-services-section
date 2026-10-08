/**
 * The Claude Code harness of a node, projected from the corpus by the node's MetroPlat. Nothing
 * here is authored by hand, and nothing projected is an authority (MetroPlat architecture §8.7):
 *
 * - no agency skill is a node skill: a session carries the skills of the offices it holds, named in
 *   `.claude/CLAUDE.md` and read from their records when a duty calls on them, and an agent carries
 *   its office's skills in its own file. A registry of every skill in the agency put tarot and Hive
 *   games in every session's context and the ecosystem in none (founder, 2026-10-06);
 * - every office seated at dignitas that holds skills is a named agent, `.claude/agents/<id>.md`
 *   (office + character + recognition + induction = officer; a vacant office is never projected,
 *   2026-08-27 note on operating the Claude and Codex harnesses);
 * - no lifecycle hooks: a hook on every lifecycle event put a token fetch and a node round trip in
 *   front of every tool call, and an unreachable node cost each call its full timeout (2026-10-06).
 *   The one hook projected is the host-resource controller (`src/host-resource-hook.mjs`): a
 *   PreToolUse hook on Bash that is a local file with no network and no node round trip, that fails
 *   open and exits in a few milliseconds, and that denies the commands that crashed the machine
 *   (find over the disk, unscoped status in a large repository, worktrees, clones into a working
 *   tree) and runs the disk- and CPU-heavy ones one at a time under a host-wide `flock`. It is
 *   copied to `.claude/hooks/` and named in `hooks`; the same file is projected for Codex as
 *   `.codex/hooks.json` and `.codex/hooks/` (Codex runs it once its user has reviewed it with /hooks);
 * - `.claude/CLAUDE.md` opens with the software ecosystem note, so every session knows what
 *   SignStuff, metrologic, the agent-organization-engine, FeltOS and MetroPlat are;
 * - the MetroPlat faces the node reaches are its MCP servers, and they are its only ones: a
 *   session's whole toolkit is MetroPlat, and the apps MetroPlat hosts (L-Space among them) are
 *   reached as its verbs, never as servers of their own beside it.
 *
 * `.claude/.claude-harness-manifest` lists what the projection wrote, budget `env` keys included, so
 * projecting again removes what the records no longer yield and a check reports drift. Of `.claude/settings.local.json` the
 * projection owns `hooks`, the `env` keys of its session budget and `permissions.deny`, and of
 * `.mcp.json` the whole server list; any server it does not name is removed on write and reported
 * as drift on check.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { incumbenciesOf, officeReading } from "@red-cup-engineering/organizing/agency";
import { agencyAt } from "@red-cup-engineering/organizing/agency/held";
import { hostResourceControl } from "../../../src/host-resource-hook.mjs";
import { projectOfficeAgent } from "./install-claude-as-an-agent.mjs";

const MANIFEST = ".claude/.claude-harness-manifest";
/** What the projection owns outright: every file it writes lives under one of these. */
const projected = (relative) => relative.startsWith(".claude/") || relative.startsWith(".codex/");
const SETTINGS = ".claude/settings.local.json";
const MCP = ".mcp.json";
const ECOSYSTEM_NOTE = "lib/emsenn/services/561-group/services/561-group-services-section/services/561-group-operations-services-section/services/561-group-board-of-directors/services/561-group-board-of-directors-leader-movement-team/content/text/documents/articles/notes/2026/09/23/2026-09-23-note-on-the-software-ecosystem.md";

/**
 * What a session may hold in context. A session keeps the model's full window: study that spans
 * the corpus loses its thread when it is compacted at 167k, and on 2026-10-02 the founder lifted the
 * 200k cap of 2026-09-28. Spend still grows with context, since every call re-reads all of it, so
 * tool output is cut before it lands, and the token-usage fold's `byContext` bands report the cost.
 */
export const SESSION_BUDGET = Object.freeze({
  BASH_MAX_OUTPUT_LENGTH: "20000",
  MAX_MCP_OUTPUT_TOKENS: "8000",
});

/**
 * What a session may never run in the node's checkout. The checkout is shared: many sessions and
 * timers hold uncommitted edits in it at once, and a command that acts on the whole worktree or
 * index takes all of theirs with it. On 2026-09-27 and again on 2026-10-02 a session's
 * `git rebase --autostash` stashed every other session's tracked edits and never gave them back.
 * A session lands its own files with `commit-paths` (computer-code-development-engine), which
 * commits exactly the named files and joins origin/main without touching anyone else's.
 */
export const SHARED_CHECKOUT_DENY = Object.freeze([
  "Bash(git stash:*)", "Bash(git rebase:*)", "Bash(git pull:*)", "Bash(git merge:*)", "Bash(git reset:*)",
  "Bash(git checkout:*)", "Bash(git switch:*)", "Bash(git restore:*)", "Bash(git clean:*)", "Bash(git cherry-pick:*)", "Bash(git revert:*)",
]);

const withoutFrontmatter = (text) => text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/u, "").trim();
const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {});


/**
 * The offices a session at the node holds, read from the records: the session is its harness
 * character's mask, so it holds every office that character is seated in at dignitas, each in full
 * with the skills realizing its duties (the projection installing-claude-as-an-agent renders).
 * Priming happens here, once, at projection time. The rules it acts under are not projected: the
 * rule store is settled at runtime (agency rules with rule-admit's beside them), so the session's
 * entry reads them live.
 */
function heldOffices(agency, readings, harness, obstructions) {
  const characters = new Set([...agency.characters.values()].filter((character) => character.kind === "harness" && character.harness === harness).map((character) => character.id));
  const offices = [];
  for (const reading of readings) {
    if (!reading.seats.some((seat) => seat.state === "dignitas" && characters.has(seat.holder))) continue;
    try {
      const text = withoutFrontmatter(projectOfficeAgent({ repoRoot: path.dirname(agency.root), agency, office: reading.office }).text);
      offices.push(text.split(/\n## Skills\n/u)[0].trim());
    } catch (error) {
      obstructions.push({ office: reading.office, reason: `the session's own office does not project: ${error.message}` });
    }
  }
  return offices.length ? ["# The offices this session holds", ...offices].join("\n\n") : "";
}

/**
 * The harness a node's sessions open into, read from the agency records under `agencyRoot`,
 * with no effect. `settlementRoot` is the MetroPlat settlement the hooks admit into;
 * `hookCommand` is the complete thin hook command supplied by the host (without it no hooks are
 * projected); `mcpServers` are the MetroPlat faces
 * the node reaches, by server name. `standing`, when the host has it, is the always-loaded context
 * every session at the node opens with (the host's settled knowledge of what it has been told),
 * written as `.claude/CLAUDE.md`, which the harness loads without any hook. `budget` is the
 * session environment the node's sessions run under, `SESSION_BUDGET` unless the host holds another;
 * `deny` the commands they may never run, `SHARED_CHECKOUT_DENY` unless the host holds another.
 * `hostResource` (on unless the host says `false`) projects the host-resource controller for the
 * node's Claude Code and Codex sessions.
 */
export function projectClaudeHarness({ node, agencyRoot, settlementRoot, hookCommand, harness = "claude", mcpServers = {}, standing, budget = SESSION_BUDGET, deny = [], hostResource = true }) {
  node = path.resolve(node);
  const agency = agencyAt(path.resolve(agencyRoot));
  const obstructions = [];
  const files = new Map();

  const readings = [...agency.offices.keys()].map((key) => officeReading(agency, key));
  const providers = new Map();
  for (const reading of readings) {
    for (const skill of reading.skills) providers.set(skill.id, [...(providers.get(skill.id) ?? []), reading.id]);
  }
  const seenAgents = new Set();
  for (const reading of readings) {
    if (!incumbenciesOf(agency, reading.office).some((seat) => seat.state === "dignitas")) continue;
    if (reading.skills.length === 0) continue;
    if (seenAgents.has(reading.id)) { obstructions.push({ office: reading.office, reason: `office id '${reading.id}' is seated at dignitas in several sections` }); continue; }
    try {
      const agent = projectOfficeAgent({ repoRoot: path.dirname(agency.root), agency, office: reading.office });
      seenAgents.add(agent.id);
      files.set(`.claude/agents/${agent.id}.md`, agent.text);
    } catch (error) {
      obstructions.push({ office: reading.office, reason: error.message });
    }
  }

  const held = heldOffices(agency, readings, harness, obstructions);
  const ecosystem = path.join(path.dirname(agency.root), ECOSYSTEM_NOTE);
  if (existsSync(ecosystem)) standing = [withoutFrontmatter(readFileSync(ecosystem, "utf8")), String(standing ?? "").trim()].filter(Boolean).join("\n\n");
  else obstructions.push({ standing: ECOSYSTEM_NOTE, reason: "the software ecosystem note is absent" });
  if ((typeof standing === "string" && standing.trim() !== "") || held !== "") {
    files.set(".claude/CLAUDE.md", `<!-- Projected by claude-harness-project from this MetroPlat's standing instructions and the agency records. Never edit it: change what it is projected from, and project again. -->\n\n${[String(standing ?? "").trim(), held].filter(Boolean).join("\n\n")}\n`);
  }

  // The host-resource controller: the only hook, a local file that never waits on the node.
  const control = hostResource === false ? undefined : hostResourceControl({ node });
  for (const [relative, text] of control?.files ?? []) files.set(relative, text);
  const hooks = control?.hooks ?? {};

  return Object.freeze({
    kind: "claude-harness.projection",
    node,
    settlementRoot: path.resolve(settlementRoot),
    files,
    hooks,
    env: Object.freeze({ ...budget }),
    deny: Object.freeze([...deny]),
    mcpServers,
    counts: { agents: seenAgents.size, events: Object.keys(hooks).length, mcpServers: Object.keys(mcpServers).length, standing: files.has(".claude/CLAUDE.md"), budget: Object.keys(budget).length, deny: deny.length, hostResource: control !== undefined },
    obstructions: Object.freeze(obstructions),
  });
}

function manifestOf(node) {
  const file = path.join(node, MANIFEST);
  return existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean) : [];
}

/** Write a projection at its node: its files, `hooks`, its budget's `env` and `permissions.deny` in the settings, its servers in `.mcp.json`;
 *  files an earlier projection wrote that this one does not yield are removed. */
export function writeClaudeHarness(projection) {
  const { node } = projection;
  const prior = manifestOf(node);
  const written = [];
  for (const [relative, text] of projection.files) {
    const file = path.join(node, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text);
    written.push(relative);
  }
  const removed = prior.filter((relative) => projected(relative) && !projection.files.has(relative));
  for (const relative of removed) {
    rmSync(path.join(node, relative), { force: true });
    const dir = path.dirname(path.join(node, relative));
    try { rmSync(dir, { recursive: false }); } catch { /* a directory still holding something stays */ }
  }
  const settingsFile = path.join(node, SETTINGS);
  mkdirSync(path.dirname(settingsFile), { recursive: true });
  const settings = readJson(settingsFile);
  // A budget key an earlier projection wrote and this one no longer yields is retracted, so a lifted
  // limit leaves the node with the projection that lifted it.
  const retired = prior.filter((entry) => entry.startsWith("env:")).map((entry) => entry.slice(4)).filter((key) => !(key in projection.env));
  const env = Object.fromEntries(Object.entries({ ...settings.env, ...projection.env }).filter(([key]) => !retired.includes(key)));
  writeFileSync(settingsFile, `${JSON.stringify({ ...settings, env, hooks: projection.hooks, permissions: { ...settings.permissions, deny: projection.deny } }, null, 2)}\n`);
  const mcpFile = path.join(node, MCP);
  const mcp = readJson(mcpFile);
  const foreign = Object.keys(mcp.mcpServers ?? {}).filter((name) => !(name in projection.mcpServers));
  writeFileSync(mcpFile, `${JSON.stringify({ ...mcp, mcpServers: projection.mcpServers }, null, 2)}\n`);
  // A face's environment carries the credentials MetroPlat presents to the apps it hosts.
  chmodSync(mcpFile, 0o600);
  removed.push(...foreign.map((name) => `mcp:${name}`), ...retired.map((key) => `env:${key}`));
  const manifest = [...written, ...Object.keys(projection.mcpServers).map((name) => `mcp:${name}`), ...Object.keys(projection.env).map((key) => `env:${key}`)].sort();
  writeFileSync(path.join(node, MANIFEST), `${manifest.join("\n")}\n`);
  return Object.freeze({ kind: "claude-harness.written", node, counts: projection.counts, written: written.length, removed, obstructions: projection.obstructions });
}

/** What differs between a projection and its node, with no effect. */
export function checkClaudeHarness(projection) {
  const { node } = projection;
  const drift = [];
  for (const [relative, text] of projection.files) {
    const file = path.join(node, relative);
    if (!existsSync(file)) drift.push({ path: relative, reason: "absent" });
    else if (readFileSync(file, "utf8") !== text) drift.push({ path: relative, reason: "differs" });
  }
  for (const relative of manifestOf(node)) {
    if (projected(relative) && !projection.files.has(relative) && existsSync(path.join(node, relative))) drift.push({ path: relative, reason: "no longer projected" });
  }
  const settings = readJson(path.join(node, SETTINGS));
  if (JSON.stringify(settings.hooks) !== JSON.stringify(projection.hooks)) drift.push({ path: SETTINGS, reason: "hooks differ" });
  for (const [key, value] of Object.entries(projection.env)) {
    if (settings.env?.[key] !== value) drift.push({ path: SETTINGS, reason: `env ${key} is not ${value}` });
  }
  if (JSON.stringify(settings.permissions?.deny ?? []) !== JSON.stringify(projection.deny)) drift.push({ path: SETTINGS, reason: "permissions.deny differs" });
  const servers = readJson(path.join(node, MCP)).mcpServers ?? {};
  for (const [name, server] of Object.entries(projection.mcpServers)) {
    if (JSON.stringify(servers[name]) !== JSON.stringify(server)) drift.push({ path: MCP, reason: `server '${name}' differs` });
  }
  for (const name of Object.keys(servers).filter((name) => !(name in projection.mcpServers))) drift.push({ path: MCP, reason: `server '${name}' is not a MetroPlat face` });
  return Object.freeze({ kind: "claude-harness.check", node, current: drift.length === 0, drift: Object.freeze(drift), obstructions: projection.obstructions });
}

const nodeInput = (id) => schemaFrom({ $id: `claude-harness/${id}`, type: "object", properties: { node: { type: "string", description: "The directory whose sessions open into the harness; the repository by default." } }, additionalProperties: false });

/** The harness projection as a MetroPlat operation family. `host` is what the MetroPlat hosting
 *  it knows: `repoRoot`, `agencyRoot`, its settlement `dataRoot`, its `hookCommand` if any, and
 *  `mcpServers()`, the faces a node reaches it through, `standing()` if it holds settled knowledge,
 *  and `deny` if it holds its own deny list in place of SHARED_CHECKOUT_DENY. */
export function claudeHarnessOperations(host) {
  const project = ({ node } = {}) => projectClaudeHarness({
    node: node ?? host.repoRoot,
    agencyRoot: host.agencyRoot,
    settlementRoot: host.dataRoot,
    hookCommand: host.hookCommand,
    harness: host.harness,
    mcpServers: host.mcpServers(),
    standing: host.standing?.(),
    ...(host.deny === undefined ? {} : { deny: host.deny }),
    ...(host.hostResource === undefined ? {} : { hostResource: host.hostResource }),
  });
  return Object.freeze([
    operation({
      verb: "claude-harness-project",
      summary: "Project a node's Claude Code harness from the corpus: skills, seated officers as agents, lifecycle hooks into this settlement, its session token budget, the shared-checkout commands it denies, and this MetroPlat's faces as MCP servers.",
      description: "Rewrites .claude/CLAUDE.md (the host's standing knowledge), .claude/skills, .claude/agents, the hooks, budget env and permissions.deny of .claude/settings.local.json and this MetroPlat's servers in .mcp.json at the node, removing what an earlier projection wrote and the records no longer yield.",
      domain: nodeInput("project"),
      reads: ["agency/skills", "agency/offices", "agency/incumbencies"],
      writes: ["node/.claude", "node/.mcp.json"],
      effects: { class: "local", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "unmeasured" },
      run: (input) => writeClaudeHarness(project(input)),
    }),
    operation({
      verb: "claude-harness-check",
      summary: "Read how a node's Claude Code harness differs from its projection from the corpus.",
      domain: nodeInput("check"),
      reads: ["agency/skills", "agency/offices", "agency/incumbencies", "node/.claude", "node/.mcp.json"],
      run: (input) => checkClaudeHarness(project(input)),
    }),
  ]);
}
