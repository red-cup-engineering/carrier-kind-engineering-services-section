import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { cutPackageRelease, RECEIPT_CATEGORY, RECEIPT_OBJECT_KIND, RELEASE_ENTRIES } from "../scripts/cut-package-release.mjs";

function makeFixturePackage(root) {
  const packageDir = join(root, "fixture-package");
  mkdirSync(join(packageDir, "scripts"), { recursive: true });
  mkdirSync(join(packageDir, "src"), { recursive: true });
  writeFileSync(join(packageDir, "package.json"), JSON.stringify({ name: "fixture-package", version: "1.0.0" }));
  writeFileSync(join(packageDir, "package-lock.json"), JSON.stringify({ name: "fixture-package", lockfileVersion: 3 }));
  writeFileSync(join(packageDir, "scripts", "run.mjs"), "export const ran = true;\n");
  writeFileSync(join(packageDir, "src", "lib.mjs"), "export const value = 1;\n");
  return packageDir;
}

function fakeRun(calls) {
  return (command, args, directory) => {
    calls.push({ command, args: [...args], directory });
    return "";
  };
}

test("cutPackageRelease: refuses a relative packageDir", async () => {
  const result = await cutPackageRelease({ packageDir: "relative/path" });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "usage");
});

test("cutPackageRelease: refuses when package.json is missing", async () => {
  const root = mkdtempSync(join(tmpdir(), "cut-package-release-"));
  try {
    const result = await cutPackageRelease({ packageDir: join(root, "does-not-exist") });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "package-json-missing");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("cutPackageRelease: refuses when package-lock.json is missing", async () => {
  const root = mkdtempSync(join(tmpdir(), "cut-package-release-"));
  try {
    const packageDir = join(root, "no-lockfile");
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(join(packageDir, "package.json"), "{}");
    const result = await cutPackageRelease({ packageDir });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "lockfile-missing");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("cutPackageRelease: copies runtime entries, installs, flips current, and journals a receipt", async () => {
  const root = mkdtempSync(join(tmpdir(), "cut-package-release-"));
  try {
    const packageDir = makeFixturePackage(root);
    const releasesRoot = join(root, "releases");
    const calls = [];
    const result = await cutPackageRelease({
      packageDir,
      releasesRoot,
      stamp: "2026-09-05T00-00-00-000Z",
      dataRoot: root,
      recordedAt: "2026-09-05T00:00:00.000Z",
      run: fakeRun(calls),
    });

    assert.equal(result.outcome, "released");
    assert.equal(result.releaseDirectory, join(releasesRoot, "fixture-package", "2026-09-05T00-00-00-000Z"));
    assert.equal(result.current, join(releasesRoot, "fixture-package", "current"));
    assert.deepEqual(result.filesCopied.sort(), ["package-lock.json", "package.json", "scripts", "src"].sort());

    const cpCalls = calls.filter((call) => call.command === "cp");
    assert.equal(cpCalls.length, result.filesCopied.length);
    for (const entry of RELEASE_ENTRIES) {
      if (result.filesCopied.includes(entry)) {
        assert.ok(cpCalls.some((call) => call.args.includes(join(packageDir, entry))), `cp was called for ${entry}`);
      }
    }

    const npmCall = calls.find((call) => call.command === "npm");
    assert.ok(npmCall, "npm ci was invoked");
    assert.ok(npmCall.args.includes("ci"));
    assert.ok(npmCall.args.includes("--ignore-scripts"));
    assert.equal(npmCall.directory, result.releaseDirectory);

    const lnCall = calls.find((call) => call.command === "ln");
    assert.deepEqual(lnCall.args, ["-sfn", result.releaseDirectory, result.current]);

    const journal = createSemanticRecordJournal({ root, objectKind: RECEIPT_OBJECT_KIND });
    const [found] = journal.query({ category: RECEIPT_CATEGORY }).filter((row) => row.id === result.receipt.id);
    assert.ok(found, "the receipt was persisted");
    assert.equal(found.record.releaseDirectory, result.releaseDirectory);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("cutPackageRelease: refuses cleanly (no partial mutation reported) when npm ci fails", async () => {
  const root = mkdtempSync(join(tmpdir(), "cut-package-release-"));
  try {
    const packageDir = makeFixturePackage(root);
    const releasesRoot = join(root, "releases");
    const result = await cutPackageRelease({
      packageDir,
      releasesRoot,
      dataRoot: root,
      run: (command, args, directory) => {
        if (command === "npm") {
          const error = new Error("npm ci failed");
          error.status = 1;
          error.stderr = "network unreachable";
          throw error;
        }
        return "";
      },
    });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "npm-ci-failed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
