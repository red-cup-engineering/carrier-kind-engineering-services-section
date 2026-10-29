/**
 * operations/harness — compose a powerful-session harness plan into claude run
 * options, as an operation. Pure config-generation (MCP servers + hooks +
 * context → `--mcp-config`/`--settings`/append-context), the claude-specific
 * "make a session powerful" surface with no platform home. Output feeds the
 * `claude-run` operation's request record.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { operation, type Operation } from "@red-cup-engineering/metroplat/operations";
import type { FilesystemBinding } from "@red-cup-engineering/metroplat/integrations/filesystem";

interface McpServer {
  readonly name: string;
  readonly type?: string;
  readonly url?: string;
  readonly command?: string;
  readonly args?: readonly string[];
  readonly env?: Record<string, string>;
  readonly headers?: Record<string, string>;
}
interface Hook {
  readonly event: string;
  readonly matcher?: string;
  readonly command: string;
  readonly timeout?: number;
}

function mcpConfigObject(servers: readonly McpServer[]): Record<string, unknown> {
  const mcpServers: Record<string, unknown> = {};
  for (const s of servers) {
    mcpServers[s.name] = s.type === "http" || s.type === "sse"
      ? { type: s.type, url: s.url, ...(s.headers ? { headers: s.headers } : {}) }
      : { type: "stdio", command: s.command, ...(s.args ? { args: [...s.args] } : {}), ...(s.env ? { env: s.env } : {}) };
  }
  return { mcpServers };
}

function hooksObject(hooks: readonly Hook[]): Record<string, unknown> {
  const byEvent = new Map<string, { matcher?: string; hooks: unknown[] }[]>();
  for (const h of hooks) {
    const command = { type: "command", command: h.command, ...(h.timeout === undefined ? {} : { timeout: h.timeout }) };
    const groups = byEvent.get(h.event) ?? byEvent.set(h.event, []).get(h.event)!;
    const existing = groups.find((g) => g.matcher === h.matcher);
    if (existing) existing.hooks.push(command);
    else groups.push({ ...(h.matcher === undefined ? {} : { matcher: h.matcher }), hooks: [command] });
  }
  return Object.fromEntries(byEvent.entries());
}

/** Pure: compose a harness plan record into a claude run-options fragment. */
export function composeHarnessRunOptions(input: unknown): Record<string, unknown> {
  const plan = input !== null && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const servers = Array.isArray(plan["mcpServers"]) ? (plan["mcpServers"] as McpServer[]) : [];
  const hooks = Array.isArray(plan["hooks"]) ? (plan["hooks"] as Hook[]) : [];
  const context = plan["context"] !== null && typeof plan["context"] === "object" ? (plan["context"] as Record<string, unknown>) : {};
  const capsules = Array.isArray(context["capsules"]) ? (context["capsules"] as string[]) : [];
  const appendParts = [...capsules, ...(typeof context["appendSystemPrompt"] === "string" ? [context["appendSystemPrompt"] as string] : [])]
    .map((p) => p.trim()).filter((p) => p.length > 0);
  const settings: Record<string, unknown> = {
    ...(plan["settings"] !== null && typeof plan["settings"] === "object" ? (plan["settings"] as Record<string, unknown>) : {}),
    ...(plan["permissions"] ? { permissions: plan["permissions"] } : {}),
    ...(hooks.length > 0 ? { hooks: hooksObject(hooks) } : {}),
  };
  return Object.freeze({
    ...(typeof plan["model"] === "string" ? { model: plan["model"] } : {}),
    ...(servers.length === 0 ? {} : { "mcp-config": JSON.stringify(mcpConfigObject(servers)) }),
    ...(plan["strictMcpConfig"] === true ? { "strict-mcp-config": true } : {}),
    ...(Object.keys(settings).length === 0 ? {} : { settings: JSON.stringify(settings) }),
    ...(typeof context["systemPrompt"] === "string" ? { "system-prompt": context["systemPrompt"] } : {}),
    ...(appendParts.length === 0 ? {} : { "append-system-prompt": appendParts.join("\n\n") }),
    ...(Array.isArray(context["addDirs"]) ? { "add-dir": context["addDirs"] } : {}),
    ...(Array.isArray(plan["allowedTools"]) ? { "allowed-tools": (plan["allowedTools"] as string[]).join(",") } : {}),
  });
}

// ---------- the live project substrate (.mcp.json / .claude/settings.json) ----------

function readJson(file: string): Record<string, unknown> | undefined {
  try {
    return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The predicate vocabulary of the archived claude-code-cli-harness topology,
 * carried forward verbatim. The archive expressed a harness as
 * subject–predicate–object utterances over these edges; the settlement math it
 * layered on top (`settleUtterances` / `fixedPointReadings`, `@emsenn/relating`
 * meme-topology) was never called by anything, even inside the archive — but the
 * FACT MODEL underneath it is the real capability, and this is it.
 */
export const HARNESS_PREDICATES = Object.freeze({
  hasMcpServer: "harness.has-mcp-server",
  pointsAt: "mcp-server.points-at",
  providesSkill: "harness.provides-skill",
  hasCommand: "harness.has-command",
  hasSubagent: "harness.has-subagent",
  firesHook: "harness.fires-hook",
  hasSetting: "harness.has-setting",
  hasModel: "claude-code.has-model",
  equipsAgent: "harness.equips-agent",
});

export interface HarnessFact {
  readonly subject: string;
  readonly predicate: string;
  readonly object: string;
}

function names(dir: string, strip?: string): readonly string[] {
  try {
    return Object.freeze(
      readdirSync(dir)
        .filter((name) => !name.startsWith("."))
        .map((name) => (strip !== undefined && name.endsWith(strip) ? name.slice(0, -strip.length) : name))
        .sort(),
    );
  } catch {
    return Object.freeze([]);
  }
}

/** What an mcp-server points at: its endpoint (http/sse) or its command (stdio). */
function serverPointsAt(config: unknown): string {
  if (config === null || typeof config !== "object") return "unknown";
  const record = config as Record<string, unknown>;
  if (typeof record["url"] === "string") return record["url"];
  if (typeof record["command"] === "string") {
    const args = Array.isArray(record["args"]) ? (record["args"] as unknown[]).map(String) : [];
    return [record["command"], ...args].join(" ");
  }
  return "unknown";
}

/**
 * The full fact-model of a project's live Claude harness: every slot the
 * archived topology modelled — mcp-servers (and what each points at), skills,
 * commands, subagents, hooks, settings, model — read from the real substrate
 * (.mcp.json, .claude/settings.json, .claude/{skills,commands,agents}/), and
 * emitted BOTH as resolved slots and as the topology's subject–predicate–object
 * facts.
 */
export function readProjectHarness(root: string, id = "this"): Record<string, unknown> {
  const mcp = readJson(path.join(root, ".mcp.json"));
  const settings = readJson(path.join(root, ".claude", "settings.json"));
  const servers = (mcp?.["mcpServers"] as Record<string, unknown> | undefined) ?? {};
  const hookEvents = Object.keys((settings?.["hooks"] as Record<string, unknown> | undefined) ?? {}).sort();
  const settingKeys = Object.keys(settings ?? {}).sort();
  const skills = names(path.join(root, ".claude", "skills"));
  const commands = names(path.join(root, ".claude", "commands"), ".md");
  const subagents = names(path.join(root, ".claude", "agents"), ".md");
  const model = typeof settings?.["model"] === "string" ? settings["model"] : undefined;
  const agent = typeof settings?.["agent"] === "string" ? settings["agent"] : id;

  const term = `claude-code-cli-harness.${id}`;
  const facts: HarnessFact[] = [];
  facts.push({ subject: term, predicate: HARNESS_PREDICATES.equipsAgent, object: `agent.${agent}` });
  if (model !== undefined) facts.push({ subject: term, predicate: HARNESS_PREDICATES.hasModel, object: `model.${model}` });
  const mcpServers = Object.keys(servers).sort().map((name) => {
    const pointsAt = serverPointsAt(servers[name]);
    facts.push({ subject: term, predicate: HARNESS_PREDICATES.hasMcpServer, object: `mcp-server.${name}` });
    // the archive's load-bearing edge, generalized off the retired hub constant
    facts.push({ subject: `mcp-server.${name}`, predicate: HARNESS_PREDICATES.pointsAt, object: pointsAt });
    return { id: name, pointsAt, type: typeof (servers[name] as Record<string, unknown>)?.["type"] === "string" ? (servers[name] as Record<string, unknown>)["type"] : "stdio" };
  });
  for (const skill of skills) facts.push({ subject: term, predicate: HARNESS_PREDICATES.providesSkill, object: `skill.${skill}` });
  for (const command of commands) facts.push({ subject: term, predicate: HARNESS_PREDICATES.hasCommand, object: `command.${command}` });
  for (const subagent of subagents) facts.push({ subject: term, predicate: HARNESS_PREDICATES.hasSubagent, object: `subagent.${subagent}` });
  for (const event of hookEvents) facts.push({ subject: term, predicate: HARNESS_PREDICATES.firesHook, object: `hook.${event}` });
  for (const key of settingKeys) facts.push({ subject: term, predicate: HARNESS_PREDICATES.hasSetting, object: `setting.${key}` });

  return Object.freeze({
    ok: true,
    root,
    term,
    agent,
    ...(model === undefined ? {} : { model }),
    hasMcpConfig: mcp !== undefined,
    hasSettings: settings !== undefined,
    mcpServers,
    skills,
    commands,
    subagents,
    hooks: hookEvents,
    settings: settingKeys,
    facts: Object.freeze(facts),
    factCount: facts.length,
    evidence: Object.freeze([
      "read:.mcp.json",
      "read:.claude/settings.json",
      "read:.claude/skills",
      "read:.claude/commands",
      "read:.claude/agents",
    ]),
  });
}

/** Merge servers/hooks/permissions into a project's substrate, never clobbering. */
export function applyProjectHarness(input: {
  readonly root: string;
  readonly mcpServers?: readonly McpServer[];
  readonly hooks?: readonly Hook[];
  readonly permissions?: Record<string, unknown>;
  readonly write: boolean;
}): Record<string, unknown> {
  const mcpPath = path.join(input.root, ".mcp.json");
  const settingsPath = path.join(input.root, ".claude", "settings.json");
  const mcpBefore = readJson(mcpPath);
  const settingsBefore = readJson(settingsPath);

  const addServers = (input.mcpServers ?? []).length > 0 ? mcpConfigObject(input.mcpServers ?? [])["mcpServers"] as Record<string, unknown> : {};
  const mcpAfter = { mcpServers: { ...((mcpBefore?.["mcpServers"] as Record<string, unknown>) ?? {}), ...addServers } };

  const addHooks = (input.hooks ?? []).length > 0
    ? { hooks: { ...((settingsBefore?.["hooks"] as Record<string, unknown>) ?? {}), ...hooksObject(input.hooks ?? []) } }
    : {};
  const addPerms = input.permissions
    ? { permissions: { ...((settingsBefore?.["permissions"] as Record<string, unknown>) ?? {}), ...input.permissions } }
    : {};
  const settingsAfter = { ...(settingsBefore ?? {}), ...addPerms, ...addHooks };

  const wroteMcp = input.write && Object.keys(addServers).length > 0;
  const wroteSettings = input.write && (Object.keys(addHooks).length > 0 || Object.keys(addPerms).length > 0);
  if (wroteMcp) writeFileSync(mcpPath, `${JSON.stringify(mcpAfter, null, 2)}\n`);
  if (wroteSettings) {
    mkdirSync(path.dirname(settingsPath), { recursive: true });
    writeFileSync(settingsPath, `${JSON.stringify(settingsAfter, null, 2)}\n`);
  }
  return Object.freeze({
    ok: true,
    root: input.root,
    wrote: wroteMcp || wroteSettings,
    dryRun: !input.write,
    mcpConfigPath: mcpPath,
    settingsPath,
    mcpAfter,
    settingsAfter,
  });
}

export function claudeHarnessOperations(binding: FilesystemBinding): readonly Operation[] {
  const defaultRoot = (): string => binding.packageRoot ?? process.cwd();
  return Object.freeze([
    operation({
      verb: "claude-harness-read",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read a project's live Claude harness as a fact model.",
      description: "Options: --root (default: package root), --id (harness term id). Reports every slot the archived cli-harness topology modelled — mcp-servers (+ what each points at), skills, commands, subagents, hooks, settings, model/agent — as resolved slots AND as subject/predicate/object facts.",
      options: Object.freeze(["root", "id"]),
      run: (input: unknown, args: Record<string, unknown>): unknown => {
        const record = { ...(input !== null && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {}), ...args };
        const root = typeof record["root"] === "string" ? path.resolve(record["root"]) : defaultRoot();
        return readProjectHarness(root, typeof record["id"] === "string" ? record["id"] : "this");
      },
    }),

    operation({
      verb: "claude-harness-apply",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Merge MCP servers / hooks / permissions into a project's substrate (never clobbers).",
      description: "Input JSON: { root?, mcpServers?, hooks?, permissions?, write? }. Defaults to a DRY RUN; pass write:true to persist.",
      options: Object.freeze(["root", "write"]),
      run: (input: unknown, args: Record<string, unknown>): unknown => {
        const record = { ...(input !== null && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {}), ...args };
        const root = typeof record["root"] === "string" ? path.resolve(record["root"]) : defaultRoot();
        return applyProjectHarness({
          root,
          ...(Array.isArray(record["mcpServers"]) ? { mcpServers: record["mcpServers"] as McpServer[] } : {}),
          ...(Array.isArray(record["hooks"]) ? { hooks: record["hooks"] as Hook[] } : {}),
          ...(record["permissions"] !== null && typeof record["permissions"] === "object" ? { permissions: record["permissions"] as Record<string, unknown> } : {}),
          write: record["write"] === true || record["write"] === "true",
        });
      },
    }),

    operation({
      verb: "claude-harness-plan",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Compose an MCP/hooks/context plan into claude run options.",
      description: "Input JSON: { model?, mcpServers?, hooks?, context?: { systemPrompt?, appendSystemPrompt?, addDirs?, capsules? }, allowedTools?, disallowedTools?, settings?, permissions?, strictMcpConfig? }. Output: a run-options fragment (spread into claude-run).",
      run: (input: unknown): unknown => composeHarnessRunOptions(input),
    }),
  ]);
}
