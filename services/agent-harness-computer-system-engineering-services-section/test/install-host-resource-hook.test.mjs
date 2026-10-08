// install-host-resource-hook.test: the user-level install of the host-resource controller keeps every
// other key and hook of a settings file, is idempotent, and never touches what it cannot read.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hookSource } from "../src/host-resource-hook.mjs";
import { installHostResourceHook } from "../scripts/install-host-resource-hook.mjs";

const SCRIPT = fileURLToPath(new URL("../scripts/install-host-resource-hook.mjs", import.meta.url));
const root = mkdtempSync(path.join(tmpdir(), "install-host-resource-hook-"));
process.on("exit", () => rmSync(root, { recursive: true, force: true }));
let count = 0;
const fresh = () => { count += 1; return { dest: path.join(root, `share-${count}`), settings: path.join(root, `settings-${count}.json`) }; };

const EXISTING = {
  respectGitignore: true,
  env: { MAX_MCP_OUTPUT_TOKENS: "8000" },
  permissions: { allow: ["Bash(git commit:*)"], defaultMode: "bypassPermissions" },
  hooks: {
    PreToolUse: [{ matcher: "Write", hooks: [{ type: "command", command: "node /other/audit.mjs" }] }],
    PostToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "node /other/after.mjs" }] }],
  },
  model: "opus",
};

test("the hook is copied to the stable directory and named for Bash, every other setting kept", () => {
  const { dest, settings } = fresh();
  writeFileSync(settings, `${JSON.stringify(EXISTING, null, 2)}\n`);
  const result = installHostResourceHook({ dest, settings });
  assert.equal(result.changed, true);
  assert.equal(result.hook, path.join(dest, "host-resource-hook.mjs"));
  assert.equal(readFileSync(result.hook, "utf8"), hookSource());
  const written = JSON.parse(readFileSync(settings, "utf8"));
  assert.deepEqual({ ...written, hooks: undefined }, { ...EXISTING, hooks: undefined });
  assert.deepEqual(Object.keys(written), Object.keys(EXISTING), "key order is kept");
  assert.deepEqual(written.hooks.PostToolUse, EXISTING.hooks.PostToolUse);
  assert.deepEqual(written.hooks.PreToolUse[0], EXISTING.hooks.PreToolUse[0]);
  assert.equal(written.hooks.PreToolUse.length, 2);
  assert.equal(written.hooks.PreToolUse[1].matcher, "Bash");
  assert.equal(written.hooks.PreToolUse[1].hooks[0].command, `node '${result.hook}'`);
  assert.equal(JSON.parse(readFileSync(`${settings}.before-host-resource-hook`, "utf8")).model, "opus", "the earlier text is kept");
});

test("installing again changes nothing, and an older entry of the script's own is replaced, not doubled", () => {
  const { dest, settings } = fresh();
  writeFileSync(settings, JSON.stringify(EXISTING));
  installHostResourceHook({ dest, settings });
  const once = readFileSync(settings, "utf8");
  assert.equal(installHostResourceHook({ dest, settings }).changed, false);
  assert.equal(readFileSync(settings, "utf8"), once);
  const moved = path.join(root, "elsewhere");
  installHostResourceHook({ dest: moved, settings });
  const entries = JSON.parse(readFileSync(settings, "utf8")).hooks.PreToolUse;
  assert.equal(entries.filter((entry) => JSON.stringify(entry).includes("host-resource-hook.mjs")).length, 1);
  assert.ok(JSON.stringify(entries).includes(moved));
});

test("a changed hook file is updated in place even when the settings already name it", () => {
  const { dest, settings } = fresh();
  const { hook } = installHostResourceHook({ dest, settings });
  writeFileSync(hook, "// stale\n");
  assert.equal(installHostResourceHook({ dest, settings }).changed, true);
  assert.equal(readFileSync(hook, "utf8"), hookSource());
});

test("a missing settings file is created; a settings file that is not JSON is left alone", () => {
  const made = fresh();
  assert.equal(installHostResourceHook(made).changed, true);
  assert.equal(JSON.parse(readFileSync(made.settings, "utf8")).hooks.PreToolUse.length, 1);
  assert.equal(existsSync(`${made.settings}.before-host-resource-hook`), false);

  for (const broken of ["{ not json", "[]", "null", "42"]) {
    const bad = fresh();
    writeFileSync(bad.settings, broken);
    assert.throws(() => installHostResourceHook(bad), /left alone/u);
    assert.equal(readFileSync(bad.settings, "utf8"), broken);
    assert.equal(existsSync(bad.dest), false, "no hook was written either");
  }
});

test("--dry-run writes nothing, and the Codex install names the hook for Codex", () => {
  const dry = fresh();
  const result = installHostResourceHook({ ...dry, dryRun: true });
  assert.equal(result.changed, true);
  assert.equal(existsSync(dry.settings), false);
  assert.equal(existsSync(dry.dest), false);

  const codex = fresh();
  const installed = installHostResourceHook({ ...codex, provider: "codex" });
  assert.equal(JSON.parse(readFileSync(codex.settings, "utf8")).hooks.PreToolUse[0].hooks[0].command, `node '${installed.hook}' --provider codex`);
  assert.throws(() => installHostResourceHook({ ...fresh(), provider: "other" }), /claude or codex/u);
});

test("default places follow the environment", () => {
  const environment = { HOME: path.join(root, "home"), XDG_DATA_HOME: path.join(root, "data") };
  const claude = installHostResourceHook({ environment, dryRun: true });
  assert.equal(claude.hook, path.join(root, "data", "agent-harness", "host-resource-hook.mjs"));
  assert.equal(claude.settings, path.join(root, "home", ".claude", "settings.json"));
  assert.equal(installHostResourceHook({ environment, provider: "codex", dryRun: true }).settings, path.join(root, "home", ".codex", "hooks.json"));
  assert.equal(installHostResourceHook({ environment: { ...environment, CLAUDE_CONFIG_DIR: path.join(root, "cfg") }, dryRun: true }).settings, path.join(root, "cfg", "settings.json"));
});

test("the command line installs and prints what it did", () => {
  const { dest, settings } = fresh();
  const result = spawnSync(process.execPath, [SCRIPT, "--dest", dest, "--settings", settings], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { hook: path.join(dest, "host-resource-hook.mjs"), settings, provider: "claude", changed: true });
  assert.equal(JSON.parse(readFileSync(settings, "utf8")).hooks.PreToolUse[0].matcher, "Bash");
});
