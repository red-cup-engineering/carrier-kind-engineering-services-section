import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { releasePackageOnHost, rewriteExecStartPrefix } from "../apps/release-package-on-host.mjs";

function makeFixturePackage(root, name = "sample-package") {
  const packageDir = join(root, name);
  mkdirSync(join(packageDir, "src"), { recursive: true });
  writeFileSync(join(packageDir, "package.json"), JSON.stringify({ name, version: "1.0.0" }));
  writeFileSync(join(packageDir, "package-lock.json"), JSON.stringify({ name, lockfileVersion: 3 }));
  writeFileSync(join(packageDir, "src", "service.mjs"), "export const service = true;\n");
  return packageDir;
}

function makeUnitFile(root, packageDir, { unitName = "sample.service" } = {}) {
  const unitFile = join(root, unitName);
  writeFileSync(unitFile, [
    "[Unit]",
    "Description=Sample",
    "",
    "[Service]",
    "Type=oneshot",
    `WorkingDirectory=${packageDir}`,
    "EnvironmentFile=-/home/emsenn/.config/emsenn/sample.env",
    `ExecStart=/home/emsenn/.local/bin/node ${packageDir}/src/service.mjs --operation run-due`,
    "",
  ].join("\n"));
  return unitFile;
}

function fakeRun({ unitFile, activeState = "inactive", calls = [] }) {
  return (command, args, directory) => {
    calls.push({ command, args: [...args], directory });
    if (command === "systemctl" && args[1] === "show") {
      return `FragmentPath=${unitFile}\nActiveState=${activeState}\n`;
    }
    return "";
  };
}

test("rewriteExecStartPrefix: rewrites a bare token and a nested-path token, leaves everything else, preserves whitespace", () => {
  const rewritten = rewriteExecStartPrefix(
    "/home/emsenn/.local/bin/node  /old/pkg/src/service.mjs --operation run-due",
    "/old/pkg",
    "/new/current",
  );
  assert.equal(rewritten, "/home/emsenn/.local/bin/node  /new/current/src/service.mjs --operation run-due");
});

test("rewriteExecStartPrefix: an exact-match token (no trailing path) is also rewritten", () => {
  assert.equal(rewriteExecStartPrefix("/old/pkg", "/old/pkg", "/new/current"), "/new/current");
});

test("rewriteExecStartPrefix: a sibling directory sharing the prefix as text is left untouched", () => {
  const rewritten = rewriteExecStartPrefix("/old/pkg-other/run.mjs", "/old/pkg", "/new/current");
  assert.equal(rewritten, "/old/pkg-other/run.mjs");
});

test("releasePackageOnHost: refuses when unit is not given", async () => {
  const result = await releasePackageOnHost({});
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "usage");
});

test("releasePackageOnHost: refuses when systemctl show reports no FragmentPath", async () => {
  const result = await releasePackageOnHost({ unit: "missing.service", run: () => "" });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "unit-not-found");
});

test("releasePackageOnHost: refuses when the unit carries no WorkingDirectory= and no packageDir was given", async () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-"));
  try {
    const unitFile = join(root, "no-wd.service");
    writeFileSync(unitFile, "[Service]\nExecStart=/bin/true\n");
    const result = await releasePackageOnHost({ unit: "no-wd.service", run: fakeRun({ unitFile }) });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "package-dir-undetermined");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: plan mode (apply=false, the default) reports the plan without any mutation", async () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-"));
  try {
    const packageDir = makeFixturePackage(root);
    const unitFile = makeUnitFile(root, packageDir);
    const calls = [];
    const result = await releasePackageOnHost({ unit: "sample.service", run: fakeRun({ unitFile, calls }) });

    assert.equal(result.outcome, "planned");
    assert.equal(result.packageDir, packageDir);
    assert.equal(result.currentWorkingDirectory, packageDir);
    assert.ok(result.currentExecStart.includes(packageDir));
    assert.equal(result.wasActive, false);
    assert.ok(!calls.some((call) => ["cp", "npm", "ln"].includes(call.command)), "plan mode performs no release effect");
    assert.equal(readFileSync(unitFile, "utf8").includes(`WorkingDirectory=${packageDir}`), true, "the unit file is untouched in plan mode");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: apply=true releases, repoints, and does not restart an inactive unit", async () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-"));
  try {
    const packageDir = makeFixturePackage(root);
    const unitFile = makeUnitFile(root, packageDir);
    const releasesRoot = join(root, "releases");
    const calls = [];
    const result = await releasePackageOnHost({
      unit: "sample.service",
      releasesRoot,
      apply: true,
      dataRoot: root,
      recordedAt: "2026-09-05T00:00:00.000Z",
      run: fakeRun({ unitFile, activeState: "inactive", calls }),
    });

    assert.equal(result.outcome, "released");
    assert.equal(result.release.outcome, "released");
    assert.equal(result.repoint.outcome, "repointed");
    assert.equal(result.wasActive, false);
    assert.equal(result.restarted, false);
    assert.ok(!calls.some((call) => call.command === "systemctl" && call.args[1] === "restart"), "an inactive unit is never restarted");

    const written = readFileSync(unitFile, "utf8");
    assert.ok(written.includes(`WorkingDirectory=${result.release.current}`));
    assert.ok(written.includes(`${result.release.current}/src/service.mjs`));
    assert.ok(written.includes("EnvironmentFile=-/home/emsenn/.config/emsenn/sample.env"), "EnvironmentFile line is untouched");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: apply=true restarts a unit that was already active", async () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-"));
  try {
    const packageDir = makeFixturePackage(root);
    const unitFile = makeUnitFile(root, packageDir);
    const releasesRoot = join(root, "releases");
    const calls = [];
    const result = await releasePackageOnHost({
      unit: "sample.service",
      releasesRoot,
      apply: true,
      dataRoot: root,
      run: fakeRun({ unitFile, activeState: "active", calls }),
    });

    assert.equal(result.outcome, "released");
    assert.equal(result.wasActive, true);
    assert.equal(result.restarted, true);
    assert.ok(calls.some((call) => call.command === "systemctl" && call.args.join(" ") === "--user restart sample.service"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releasePackageOnHost: a refused cut-package-release stops before any unit-file mutation", async () => {
  const root = mkdtempSync(join(tmpdir(), "release-package-on-host-"));
  try {
    const packageDir = join(root, "no-package-here");
    mkdirSync(packageDir, { recursive: true });
    const unitFile = makeUnitFile(root, packageDir);
    const before = readFileSync(unitFile, "utf8");
    const result = await releasePackageOnHost({
      unit: "sample.service",
      apply: true,
      dataRoot: root,
      run: fakeRun({ unitFile }),
    });

    assert.equal(result.outcome, "refused");
    assert.equal(result.stage, "cut-package-release");
    assert.equal(result.refusals[0].step, "package-json-missing");
    assert.equal(readFileSync(unitFile, "utf8"), before, "the unit file was not mutated");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
