import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { resolveRecordsRoot } from "../scripts/derive-leader-task-list.mjs";

test("resolveRecordsRoot honors an explicit CLI argument first", () => {
  assert.equal(resolveRecordsRoot(["/explicit/dir"], {}), "/explicit/dir");
});

test("resolveRecordsRoot falls back to OPS_DATA_DIR/records", () => {
  assert.equal(resolveRecordsRoot([], { OPS_DATA_DIR: "/data" }), "/data/records");
});

test("resolveRecordsRoot falls back to the repo's PM custody records path", () => {
  const resolved = resolveRecordsRoot([], {});
  assert.match(resolved, /561-group-enterprise-project-management-services-section\/data\/records$/);
  const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  assert.ok(resolved.startsWith(repoRoot));
});

test("the CLI prints a { recordsRoot, tasks } JSON document when run against a real records directory", () => {
  const scriptPath = fileURLToPath(new URL("../scripts/derive-leader-task-list.mjs", import.meta.url));
  const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const output = execFileSync("node", [scriptPath], { cwd: repoRoot, encoding: "utf8" });
  const parsed = JSON.parse(output);
  assert.ok(Array.isArray(parsed.tasks));
  assert.match(parsed.recordsRoot, /data\/records$/);
});
