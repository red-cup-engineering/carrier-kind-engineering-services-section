import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { discoverWorkspace, eachWorkspacePackageDir } from "./workspace.mjs";

// A fake workspace of four lib packages, plus one directory that has no
// manifest at all (an "archive" tree). Exclusion is a pure argument: the walk
// drops the names you hand it, exact or by `*` wildcard, and nothing else.
let root: string;

function pkg(dir: string, name: string): void {
  const pkgDir = path.join(root, dir);
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(path.join(pkgDir, "package.json"), JSON.stringify({ name, version: "0.0.0" }), "utf8");
}

before(() => {
  root = mkdtempSync(path.join(tmpdir(), "workspace-"));
  writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - lib/*\n", "utf8");
  pkg("lib/core", "@x/core");
  pkg("lib/keepme", "@x/keepme");
  pkg("lib/playground", "@x/playground");
  pkg("lib/foo-experimental", "@x/foo-experimental");
  // a manifest-less directory — must never surface as a package.
  mkdirSync(path.join(root, "lib", "archive", "deep"), { recursive: true });
  writeFileSync(path.join(root, "lib", "archive", "deep", "route.ts"), "export function POST() {}\n", "utf8");
});

after(() => {
  rmSync(root, { recursive: true, force: true });
});

function names(filter?: { exclude: readonly string[] }): string[] {
  return [...eachWorkspacePackageDir(root, filter)].map((p) => p.name).sort();
}

describe("eachWorkspacePackageDir exclusion", () => {
  it("excludes nothing by default, and skips manifest-less directories", () => {
    assert.deepEqual(names(), ["@x/core", "@x/foo-experimental", "@x/keepme", "@x/playground"]);
  });

  it("drops an exact name", () => {
    assert.deepEqual(names({ exclude: ["@x/playground"] }), [
      "@x/core",
      "@x/foo-experimental",
      "@x/keepme",
    ]);
  });

  it("drops names by `*` wildcard", () => {
    assert.deepEqual(names({ exclude: ["@x/*-experimental"] }), [
      "@x/core",
      "@x/keepme",
      "@x/playground",
    ]);
  });

  it("treats `[]` as exclude-nothing", () => {
    assert.equal(names({ exclude: [] }).length, 4);
  });
});

describe("discoverWorkspace honours the same exclusion", () => {
  it("omits excluded packages from the carrier set", async () => {
    const ws = await discoverWorkspace(root, { exclude: ["@x/playground", "@x/*-experimental"] });
    const got = ws.packages.map((p) => p.name).sort();
    assert.deepEqual(got, ["@x/core", "@x/keepme"]);
  });
});
