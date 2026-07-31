import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  workspaceConsumptionIndex,
  consumersOfSymbol,
  exportedFunctionsAndClasses,
  classifyUnusedExports,
  resolveConsumptionEdges,
} from "./consumption.mjs";
import { workspaceTypeIndex } from "./type-index.mjs";

// A fake workspace: one provider exporting two functions, and consumers that
// reach it in different ways. The point is the fail-safe rule — a provider
// reached only by a coarse import (namespace/star/dynamic) must never be
// reported unused.
let root: string;

function pkg(dir: string, name: string, files: Record<string, string>): void {
  const pkgDir = path.join(root, dir);
  mkdirSync(path.join(pkgDir, "src"), { recursive: true });
  writeFileSync(path.join(pkgDir, "package.json"), JSON.stringify({ name, version: "0.0.0" }), "utf8");
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(pkgDir, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content, "utf8");
  }
}

before(() => {
  root = mkdtempSync(path.join(tmpdir(), "consumption-"));
  writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - lib/*\n", "utf8");

  // provider: exports alpha() and beta() (its built dist .d.ts is the surface).
  pkg("lib/provider", "@x/provider", {
    "src/index.mts": "export function alpha(): void {}\nexport function beta(): void {}\n",
    "dist/index.d.ts": "export declare function alpha(): void;\nexport declare function beta(): void;\n",
  });
  // named consumer: imports alpha by name only.
  pkg("lib/named", "@x/named", {
    "src/index.mts": `import { alpha } from "@x/provider";\nexport const u = alpha;\n`,
  });
});

after(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("workspaceConsumptionIndex (named reach)", () => {
  it("finds the consumer that imports alpha, and none for beta", () => {
    const index = workspaceConsumptionIndex(root);
    assert.deepEqual(
      consumersOfSymbol(index, "@x/provider", "alpha").map((c) => c.consumer),
      ["@x/named"],
    );
    assert.deepEqual(consumersOfSymbol(index, "@x/provider", "beta"), []);
  });

  it("classifies beta unused and alpha used when no coarse import reaches the provider", () => {
    const index = workspaceConsumptionIndex(root);
    const exports = exportedFunctionsAndClasses(workspaceTypeIndex(root), "@x/provider");
    const report = classifyUnusedExports(index, "@x/provider", exports, true);
    assert.equal(report.indeterminate, false);
    assert.deepEqual(report.unused.map((s) => s.name), ["beta"]);
    assert.deepEqual(report.used.map((s) => s.name), ["alpha"]);
  });
});

describe("resolveConsumptionEdges (graph enrichment)", () => {
  it("classifies a named edge against the provider's exports as uses-function", () => {
    const index = workspaceConsumptionIndex(root);
    const edges = resolveConsumptionEdges(index, workspaceTypeIndex(root));
    const e = edges.find((x) => x.consumer === "@x/named" && x.provider === "@x/provider");
    assert.ok(e);
    assert.equal(e.kind, "function"); // alpha is an exported function of the provider
    assert.equal(e.name, "alpha");
  });
});

describe("fail-safe: a namespace-imported provider is never reported unused", () => {
  it("marks the provider usage-indeterminate and reports zero unused", () => {
    // Add a consumer that does `import * as p` — reaches the package, names no
    // symbol. beta() is in truth not referenced, but we must NOT call it unused.
    pkg("lib/coarse", "@x/coarse", {
      "src/index.mts": `import * as p from "@x/provider";\nexport const u = p;\n`,
    });
    const index = workspaceConsumptionIndex(root);
    assert.ok(index.indeterminateProviders.has("@x/provider"));
    const exports = exportedFunctionsAndClasses(workspaceTypeIndex(root), "@x/provider");
    const report = classifyUnusedExports(index, "@x/provider", exports, true);
    assert.equal(report.indeterminate, true);
    assert.deepEqual(report.unused, []); // <- the safety property
  });
});
