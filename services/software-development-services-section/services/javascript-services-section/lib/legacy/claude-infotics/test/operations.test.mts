import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { claudeArgv } from "../src/operations/run.mts";
import { parseClaudeEvents, summarizeRun } from "../src/operations/events.mts";
import { composeHarnessRunOptions } from "../src/operations/harness.mts";
import { buildCapsule } from "../src/operations/capsule.mts";
import { gitRepoRoot } from "../src/operations/session.mts";

test("claudeArgv puts flags first and the prompt as trailing positional", () => {
  const argv = claudeArgv({ prompt: "hello there", model: "opus", "output-format": "json", effort: "high" });
  assert.deepEqual([...argv].slice(0, 5), ["--print", "--output-format", "json", "--model", "opus"]);
  assert.equal(argv[argv.length - 1], "hello there");
  assert.ok(!argv.slice(0, -1).includes("hello there"));
});

test("events codec folds a run summary from json/jsonl", () => {
  const stream = [
    { type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "Read", input: {} }] } },
    { type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", is_error: false }] } },
    { type: "result", is_error: false, session_id: "s1", result: "done", usage: { input_tokens: 7, output_tokens: 9 } },
  ];
  const fromArray = summarizeRun(parseClaudeEvents(JSON.stringify(stream)));
  const fromJsonl = summarizeRun(parseClaudeEvents(stream.map((e) => JSON.stringify(e)).join("\n")));
  assert.deepEqual(fromArray, fromJsonl);
  assert.equal(fromArray.text, "done");
  assert.equal(fromArray.inputTokens, 7);
  assert.equal(fromArray.toolUses[0]?.name, "Read");
});

test("composeHarnessRunOptions composes MCP/hooks/context into run options", () => {
  const out = composeHarnessRunOptions({
    model: "opus",
    mcpServers: [{ name: "hub", type: "http", url: "http://x/mcp" }],
    hooks: [{ event: "Stop", command: "done.sh" }],
    context: { appendSystemPrompt: "be terse", capsules: ["ctx"] },
    allowedTools: ["Read"],
  });
  assert.equal(out["model"], "opus");
  assert.ok(String(out["mcp-config"]).includes("hub"));
  assert.ok(String(out["settings"]).includes("Stop"));
  assert.equal(out["append-system-prompt"], "ctx\n\nbe terse");
  assert.equal(out["allowed-tools"], "Read");
});

// Regression: claude-impact matched git paths (repo-relative) against module
// paths (root-relative) and always found nothing. Both must resolve to a common
// absolute basis, which requires finding the real repo root from a nested dir.
test("gitRepoRoot finds the repo root from a nested directory", () => {
  const repo = mkdtempSync(join(tmpdir(), "ci-repo-"));
  mkdirSync(join(repo, ".git"), { recursive: true });
  const nested = join(repo, "a", "b", "c");
  mkdirSync(nested, { recursive: true });
  assert.equal(gitRepoRoot(nested), repo, "walks up to the .git root");
  assert.equal(gitRepoRoot(repo), repo);
});

test("gitRepoRoot falls back to the given dir when no .git is above it", () => {
  const orphan = mkdtempSync(join(tmpdir(), "ci-orphan-"));
  // /tmp has no .git above it; must terminate and fall back, never loop.
  assert.equal(typeof gitRepoRoot(orphan), "string");
});

test("buildCapsule slices files under a root, confined and hashed", () => {
  const root = mkdtempSync(join(tmpdir(), "ci-capsule-"));
  writeFileSync(join(root, "a.txt"), "alpha");
  writeFileSync(join(root, "b.txt"), "beta");
  const out = buildCapsule({ root, files: ["a.txt", "b.txt", "../escape.txt"] }, root);
  assert.equal(out["ok"], true);
  const files = out["files"] as { path: string; sha256: string }[];
  assert.equal(files.length, 2, "escape path outside root is dropped");
  assert.ok(files.every((f) => f.sha256.length === 64));
});
