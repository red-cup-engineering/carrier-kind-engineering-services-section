import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { archiveDiscoveryNdjson, discoverArchives } from "../src/discover-archives.mjs";

const packageRoot = path.resolve(import.meta.dirname, "..");

test("discovers exact archive names and labels Git metadata without omitting it", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "archive-discovery-"));
  await mkdir(path.join(root, "archive"));
  await mkdir(path.join(root, "nested", "_archive"), { recursive: true });
  await mkdir(path.join(root, "nearly-archive"));
  await mkdir(path.join(root, ".git", "archive"), { recursive: true });
  await mkdir(path.join(root, ".git", "objects"));
  await mkdir(path.join(root, ".git", "refs"));
  await writeFile(path.join(root, ".git", "HEAD"), "ref: refs/heads/main\n");

  const report = await discoverArchives(root);
  assert.deepEqual(report.archives, [
    { path: ".git/archive", name: "archive", classification: "git-metadata", nestedUnder: null },
    { path: "archive", name: "archive", classification: "working-tree", nestedUnder: null },
    { path: "nested/_archive", name: "_archive", classification: "working-tree", nestedUnder: null }
  ]);
});

test("marks nested archive names while preserving both findings", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "archive-discovery-"));
  await mkdir(path.join(root, "archive", "child", "_archive"), { recursive: true });
  const report = await discoverArchives(root);
  assert.equal(report.archives.length, 2);
  assert.equal(report.archives[0].nestedUnder, null);
  assert.equal(report.archives[1].nestedUnder, "archive");
});

test("renders stable JSON-compatible NDJSON records", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "archive-discovery-"));
  await mkdir(path.join(root, "_archive"));
  const report = await discoverArchives(root);
  assert.deepEqual(archiveDiscoveryNdjson(report).trim().split("\n").map(JSON.parse), [
    { kind: "archive-discovery-entry/v1", root, path: "_archive", name: "_archive", classification: "working-tree", nestedUnder: null },
    { kind: "archive-discovery-root/v1", root }
  ]);
});

test("CLI requires an explicit root and writes machine-readable JSON", async () => {
  const missingRoot = spawnSync("node", ["scripts/archive-discovery"], { cwd: packageRoot, encoding: "utf8" });
  assert.equal(missingRoot.status, 2);
  assert.match(missingRoot.stderr, /--root PATH is required/);

  const root = await mkdtemp(path.join(os.tmpdir(), "archive-discovery-"));
  await mkdir(path.join(root, "archive"));
  const result = spawnSync("node", ["scripts/archive-discovery", "--root", root, "--format", "json"], { cwd: packageRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).archives, [
    { path: "archive", name: "archive", classification: "working-tree", nestedUnder: null }
  ]);
});
