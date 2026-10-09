#!/usr/bin/env node
/**
 * Install the host-resource controller (`src/host-resource-hook.mjs`) for one user of a machine, for
 * the machines where no node projection (`claude-harness-project`) writes it: copy the hook to a
 * stable directory and name it in the user's Claude Code settings (or Codex `hooks.json`) as a
 * PreToolUse hook on Bash. The hook entry is built by the same `hookEntries` the projection uses.
 *
 *   install-host-resource-hook [--dest <dir>] [--settings <file>] [--provider claude|codex] [--dry-run]
 *
 * Every other key of the settings file, and every other hook in it, is kept as it is; an entry this
 * script wrote earlier is replaced, so running it again after the hook changes updates it in place
 * and running it twice changes nothing. A settings file that is not valid JSON is never touched.
 * The first time a settings file is changed its earlier text is kept beside it as
 * `<file>.before-host-resource-hook`.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hookEntries, hookSource } from "../src/host-resource-hook.mjs";

const HOOK_FILE = "host-resource-hook.mjs";

const isOurs = (entry) => (entry?.hooks ?? []).some((handler) => typeof handler?.command === "string" && handler.command.includes(HOOK_FILE));

/**
 * `{ hook, settings, provider, changed }`: the hook file written under `dest` and the settings file
 * now naming it. With `dryRun` nothing is written and `changed` says what would be.
 */
export function installHostResourceHook({ dest, settings, provider = "claude", environment = process.env, dryRun = false } = {}) {
  if (!["claude", "codex"].includes(provider)) throw new TypeError(`provider is claude or codex, not ${provider}`);
  const home = environment.HOME ?? homedir();
  const hookPath = path.resolve(dest ?? path.join(environment.XDG_DATA_HOME || path.join(home, ".local", "share"), "agent-harness"), HOOK_FILE);
  const settingsPath = path.resolve(settings ?? (provider === "codex"
    ? path.join(environment.CODEX_HOME || path.join(home, ".codex"), "hooks.json")
    : path.join(environment.CLAUDE_CONFIG_DIR || path.join(home, ".claude"), "settings.json")));

  const before = existsSync(settingsPath) ? readFileSync(settingsPath, "utf8") : undefined;
  let current = {};
  if (before !== undefined && before.trim() !== "") {
    try { current = JSON.parse(before); } catch (error) { throw new Error(`${settingsPath} is not valid JSON, so it was left alone: ${error.message}`); }
    if (current === null || typeof current !== "object" || Array.isArray(current)) throw new Error(`${settingsPath} is not a JSON object, so it was left alone`);
  }
  const ours = hookEntries(hookPath, { provider }).PreToolUse;
  const others = Array.isArray(current.hooks?.PreToolUse) ? current.hooks.PreToolUse.filter((entry) => !isOurs(entry)) : [];
  const next = { ...current, hooks: { ...current.hooks, PreToolUse: [...others, ...ours] } };
  const text = `${JSON.stringify(next, null, 2)}\n`;
  const hookChanged = !existsSync(hookPath) || readFileSync(hookPath, "utf8") !== hookSource();
  const changed = hookChanged || text !== before;
  if (dryRun || !changed) return Object.freeze({ hook: hookPath, settings: settingsPath, provider, changed });

  mkdirSync(path.dirname(hookPath), { recursive: true });
  const staged = `${hookPath}.${process.pid}.tmp`;
  writeFileSync(staged, hookSource());
  renameSync(staged, hookPath);
  if (text !== before) {
    mkdirSync(path.dirname(settingsPath), { recursive: true });
    const keep = `${settingsPath}.before-host-resource-hook`;
    if (before !== undefined && !existsSync(keep)) copyFileSync(settingsPath, keep);
    writeFileSync(settingsPath, text);
  }
  return Object.freeze({ hook: hookPath, settings: settingsPath, provider, changed });
}

function main(argv) {
  const option = (name) => { const at = argv.indexOf(name); return at < 0 ? undefined : argv[at + 1]; };
  const result = installHostResourceHook({ dest: option("--dest"), settings: option("--settings"), provider: option("--provider") ?? "claude", dryRun: argv.includes("--dry-run") });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

let invoked = false;
try { invoked = process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { invoked = false; }
if (invoked) main(process.argv.slice(2));
