import assert from "node:assert/strict";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { assaySemioticVoxelPackageBody } from "../src/assay-semiotic-voxel-package-body.mjs";

const carrier = "lib/emsenn/services/561-group/services/red-cup-engineering/services/example";

test("admits independently owned voxel carriers", async () => {
  const root = await mkdtemp(join(tmpdir(), "voxel-conformance-"));
  await mkdir(join(root, carrier), { recursive: true });
  await writeFile(join(root, carrier, "package.json"), `${JSON.stringify({ name: "@red-cup-engineering/example", version: "1.0.0", "x-semiotic-voxel": { profile: "org.harmonious-union.semiotic-voxel.v1", owner: "red-cup-engineering", package: "@red-cup-engineering/example" } })}\n`);
  assert.deepEqual(await assaySemioticVoxelPackageBody({ root }), { type: "SemioticVoxelPackageBodyConformanceReceipt", version: 1, conformant: true, carriers: 1, defects: [] });
});

test("refuses root authority and local provider protocols", async () => {
  const root = await mkdtemp(join(tmpdir(), "voxel-refusal-"));
  await mkdir(join(root, carrier), { recursive: true });
  await writeFile(join(root, "package.json"), "{}\n");
  await writeFile(join(root, carrier, "package.json"), `${JSON.stringify({ name: "@emsenn/example", dependencies: { "@emsenn/provider": "workspace:*" } })}\n`);
  await assert.rejects(() => assaySemioticVoxelPackageBody({ root }), (error) => error.receipt.defects.some(({ law }) => law === "no-local-provider-protocol"));
});

test("refuses package installs that symlink into another carrier", async () => {
  const root = await mkdtemp(join(tmpdir(), "voxel-install-refusal-"));
  await mkdir(join(root, carrier, "node_modules", "@red-cup-engineering"), { recursive: true });
  const provider = join(root, "lib/emsenn/services/561-group/services/red-cup-engineering/services/provider");
  await mkdir(provider, { recursive: true });
  await writeFile(join(root, carrier, "package.json"), `${JSON.stringify({ name: "@red-cup-engineering/example", version: "1.0.0", "x-semiotic-voxel": { profile: "org.harmonious-union.semiotic-voxel.v1", owner: "red-cup-engineering", package: "@red-cup-engineering/example" } })}\n`);
  await writeFile(join(provider, "package.json"), `${JSON.stringify({ name: "@red-cup-engineering/provider", version: "1.0.0", "x-semiotic-voxel": { profile: "org.harmonious-union.semiotic-voxel.v1", owner: "red-cup-engineering", package: "@red-cup-engineering/provider" } })}\n`);
  await symlink(provider, join(root, carrier, "node_modules", "@red-cup-engineering", "provider"));
  await assert.rejects(() => assaySemioticVoxelPackageBody({ root }), (error) => error.receipt.defects.some(({ law }) => law === "no-cross-package-install-symlink"));
});
