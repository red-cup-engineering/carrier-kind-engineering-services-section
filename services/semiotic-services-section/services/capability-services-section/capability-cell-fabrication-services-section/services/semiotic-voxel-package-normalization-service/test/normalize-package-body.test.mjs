import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { classifyPackageVoxel, normalizePackageBody, ownerForPackagePath } from "../src/normalize-package-body.mjs";

test("derives sovereign owners from organizational territory", () => {
  assert.equal(ownerForPackagePath("lib/emsenn/services/561-group/services/red-cup-engineering/services/x"), "red-cup-engineering");
  assert.equal(ownerForPackagePath("lib/emsenn/services/561-group/services/lenticule-science/services/x"), "lenticule-science");
  assert.equal(ownerForPackagePath("lib/emsenn/services/561-group/services/board-of-directors/services/x"), "harmonious-union");
});

test("rewrites package ownership, workspace dependencies, and active imports together", async () => {
  const root = await mkdtemp(join(tmpdir(), "voxel-package-normalization-"));
  const provider = "lib/emsenn/services/561-group/services/red-cup-engineering/services/provider";
  const consumer = "lib/emsenn/services/561-group/services/board-of-directors/services/consumer";
  await mkdir(join(root, provider, "src"), { recursive: true });
  await mkdir(join(root, consumer, "src"), { recursive: true });
  await writeFile(join(root, "pnpm-workspace.yaml"), `packages:\n  - "${provider}"\n  - "${consumer}"\n`);
  await writeFile(join(root, provider, "package.json"), `${JSON.stringify({ name: "@emsenn/provider", version: "1.2.3", type: "module", exports: "./src/index.mjs", "x-agentic-metro-enterprise": { actor: "urn:ame:provider", "operation-catalog": { provide: {} } } })}\n`);
  await writeFile(join(root, provider, "src/index.mjs"), "export const value = 1;\n");
  await writeFile(join(root, consumer, "package.json"), `${JSON.stringify({ name: "@emsenn/consumer", version: "2.0.0", type: "module", dependencies: { "@emsenn/provider": "workspace:*" }, "x-agentic-metro-enterprise": { actor: "urn:ame:consumer", "operation-catalog": { consume: {} } } })}\n`);
  await writeFile(join(root, consumer, "src/index.mjs"), `import { value } from "@emsenn/provider"; export { value };\n`);
  const receipt = await normalizePackageBody({ root, apply: true });
  assert.equal(receipt.packages, 2);
  const providerManifest = JSON.parse(await readFile(join(root, provider, "package.json"), "utf8"));
  const consumerManifest = JSON.parse(await readFile(join(root, consumer, "package.json"), "utf8"));
  assert.equal(providerManifest.name, "@red-cup-engineering/provider");
  assert.equal(consumerManifest.name, "@harmonious-union/consumer");
  assert.equal(consumerManifest.dependencies["@red-cup-engineering/provider"], "1.2.3");
  assert.match(await readFile(join(root, consumer, "src/index.mjs"), "utf8"), /@red-cup-engineering\/provider/u);
  assert.equal(providerManifest["x-semiotic-voxel"].kind, "capability-cell");
});

test("replaces stale release URLs and ranges with the exact admitted provider version", async () => {
  const root = await mkdtemp(join(tmpdir(), "voxel-provider-version-"));
  try {
    const provider = "lib/emsenn/services/561-group/services/red-cup-engineering/services/provider";
    const consumer = "lib/emsenn/services/561-group/services/red-cup-engineering/services/consumer";
    await mkdir(join(root, provider), { recursive: true });
    await mkdir(join(root, consumer), { recursive: true });
    await writeFile(join(root, provider, "package.json"), `${JSON.stringify({ name: "@red-cup-engineering/provider", version: "3.0.0" })}\n`);
    await writeFile(join(root, consumer, "package.json"), `${JSON.stringify({ name: "@red-cup-engineering/consumer", version: "1.0.0", dependencies: { "@red-cup-engineering/provider": "https://example.invalid/provider-2.0.0.tgz" }, devDependencies: { "@red-cup-engineering/provider": "^2.0.0" } })}\n`);
    await normalizePackageBody({ root, apply: true });
    const manifest = JSON.parse(await readFile(join(root, consumer, "package.json"), "utf8"));
    assert.equal(manifest.dependencies["@red-cup-engineering/provider"], "3.0.0");
    assert.equal(manifest.devDependencies["@red-cup-engineering/provider"], "3.0.0");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("removes pnpm as ambient package authority from carrier lifecycle scripts", async () => {
  const root = await mkdtemp(join(tmpdir(), "voxel-pnpm-authority-"));
  try {
    const carrier = "lib/emsenn/services/561-group/services/red-cup-engineering/services/example";
    await mkdir(join(root, carrier), { recursive: true });
    await writeFile(join(root, carrier, "package.json"), `${JSON.stringify({ name: "@red-cup-engineering/example", version: "1.0.0", packageManager: "pnpm@11.9.0", engines: { node: ">=22", pnpm: ">=11" }, scripts: { verify: "pnpm run check && pnpm test" } })}\n`);
    await normalizePackageBody({ root, apply: true });
    const manifest = JSON.parse(await readFile(join(root, carrier, "package.json"), "utf8"));
    assert.equal(manifest.packageManager, undefined);
    assert.deepEqual(manifest.engines, { node: ">=22" });
    assert.equal(manifest.scripts.verify, "npm run check && npm test");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("turns cross-carrier relative imports into exported package contracts", async () => {
  const root = await mkdtemp(join(tmpdir(), "voxel-cross-carrier-import-"));
  try {
    const base = "lib/emsenn/services/561-group/services/red-cup-engineering/services";
    const provider = `${base}/provider`;
    const consumer = `${base}/consumer`;
    await mkdir(join(root, provider, "src"), { recursive: true });
    await mkdir(join(root, consumer, "src"), { recursive: true });
    await writeFile(join(root, provider, "package.json"), `${JSON.stringify({ name: "@red-cup-engineering/provider", version: "3.0.0", exports: "./src/index.mjs" })}\n`);
    await writeFile(join(root, provider, "src/value.mjs"), "export const value = 3;\n");
    await writeFile(join(root, consumer, "package.json"), `${JSON.stringify({ name: "@red-cup-engineering/consumer", version: "1.0.0", exports: "./src/index.mjs" })}\n`);
    await writeFile(join(root, consumer, "src/index.mjs"), "export { value } from '../../provider/src/value.mjs';\n");
    const receipt = await normalizePackageBody({ root, apply: true });
    assert.equal(receipt.packageContractEdgesChanged, 1);
    const providerManifest = JSON.parse(await readFile(join(root, provider, "package.json"), "utf8"));
    const consumerManifest = JSON.parse(await readFile(join(root, consumer, "package.json"), "utf8"));
    assert.equal(providerManifest.exports["./src/value.mjs"], "./src/value.mjs");
    assert.equal(consumerManifest.dependencies["@red-cup-engineering/provider"], "3.0.0");
    assert.equal(await readFile(join(root, consumer, "src/index.mjs"), "utf8"), "export { value } from '@red-cup-engineering/provider/src/value.mjs';\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("treats solicit and invoke operations as faces of one capability", () => {
  const voxel = classifyPackageVoxel({ name: "@emsenn/weather-service", "x-agentic-metro-enterprise": { "operation-catalog": { "solicit-service": {}, "invoke-service": {} } } }, "lib/emsenn/services/561-group/services/red-cup-engineering/services/weather-service");
  assert.equal(voxel.kind, "capability-cell");
  assert.deepEqual(voxel.capabilities, [["weather-service", ["invoke-service", "solicit-service"]]]);
});

test("splits capabilities only when the operation catalog declares the boundary", () => {
  const voxel = classifyPackageVoxel({ name: "@emsenn/combined-service", "x-agentic-metro-enterprise": { "operation-catalog": { read: { capability: "reading" }, write: { capability: "writing" } } } }, "lib/emsenn/services/561-group/services/red-cup-engineering/services/combined-service");
  assert.equal(voxel.kind, "aggregate-capability-defect");
  assert.deepEqual(voxel.capabilities, [["reading", ["read"]], ["writing", ["write"]]]);
});

test("discovers the active package body after the root workspace has been abolished", async () => {
  const root = await mkdtemp(join(tmpdir(), "voxel-package-body-normalization-"));
  const provider = "lib/emsenn/services/561-group/services/red-cup-engineering/services/provider";
  const consumer = "lib/emsenn/services/561-group/services/board-of-directors/services/consumer";
  await mkdir(join(root, provider), { recursive: true });
  await mkdir(join(root, consumer), { recursive: true });
  await writeFile(join(root, provider, "package.json"), `${JSON.stringify({ name: "@emsenn/provider", version: "1.2.3", exports: "./index.mjs" })}\n`);
  await writeFile(join(root, consumer, "package.json"), `${JSON.stringify({ name: "@emsenn/consumer", dependencies: { "@emsenn/provider": `file:../../../../561-group/services/red-cup-engineering/services/provider` }, exports: "./index.mjs" })}\n`);
  const receipt = await normalizePackageBody({ root, apply: true });
  assert.equal(receipt.packages, 2);
  const manifest = JSON.parse(await readFile(join(root, consumer, "package.json"), "utf8"));
  assert.deepEqual(manifest.dependencies, { "@red-cup-engineering/provider": "1.2.3" });
});
