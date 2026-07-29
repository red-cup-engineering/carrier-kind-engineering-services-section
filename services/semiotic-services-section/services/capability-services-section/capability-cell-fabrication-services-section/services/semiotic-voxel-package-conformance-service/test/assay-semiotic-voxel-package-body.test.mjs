import assert from "node:assert/strict";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  assaySemioticVoxelPackageBody,
  semioticVoxelPackageDescriptorViolations,
} from "../src/assay-semiotic-voxel-package-body.mjs";

const carrier = "lib/emsenn/services/561-group/services/red-cup-engineering/services/example";

function descriptor(packageName, overrides = {}) {
  return {
    profile: "org.harmonious-union.semiotic-voxel.v1",
    owner: "red-cup-engineering",
    kind: "capability-cell",
    actor: "urn:ame:example",
    operations: ["do-example"],
    capabilities: [{ capability: "example", faces: ["do-example"] }],
    package: packageName,
    ...overrides,
  };
}

test("admits independently owned package/deployment carrier descriptors", async () => {
  const root = await mkdtemp(join(tmpdir(), "voxel-conformance-"));
  await mkdir(join(root, carrier), { recursive: true });
  await writeFile(join(root, carrier, "package.json"), `${JSON.stringify({ name: "@red-cup-engineering/example", version: "1.0.0", "x-semiotic-voxel": descriptor("@red-cup-engineering/example") })}\n`);
  assert.deepEqual(await assaySemioticVoxelPackageBody({ root }), { type: "SemioticVoxelPackageBodyConformanceReceipt", version: 1, conformant: true, carriers: 1, defects: [] });
});

test("keeps package descriptors distinct from semantic and active-voxel carriers", () => {
  const semanticOrActiveCarriers = [
    { id: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", polarity: "proponent", parentIds: [] },
    { kind: "utterance.mark", value: "example" },
    { kind: "utterance.carrier", token: {}, claim: {} },
    { kind: "utterance.articulation.cell", potentialAperiodicArticulationCell: [] },
    { position: { atoms: [] }, invocation: "current" },
  ];
  for (const value of semanticOrActiveCarriers) {
    assert.ok(semioticVoxelPackageDescriptorViolations({
      name: "@red-cup-engineering/example",
      "x-semiotic-voxel": value,
    }).length > 0);
  }
});

test("refuses incomplete or non-normalized package descriptor shapes", () => {
  const packageName = "@red-cup-engineering/example";
  assert.deepEqual(
    semioticVoxelPackageDescriptorViolations({
      name: packageName,
      "x-semiotic-voxel": {
        profile: "org.harmonious-union.semiotic-voxel.v1",
        owner: "red-cup-engineering",
        package: packageName,
      },
    }),
    ["descriptor-fields", "kind", "actor", "operations", "capabilities"],
  );
  assert.deepEqual(
    semioticVoxelPackageDescriptorViolations({
      name: packageName,
      "x-semiotic-voxel": descriptor(packageName, { kind: "service" }),
    }),
    ["kind"],
  );
  assert.deepEqual(
    semioticVoxelPackageDescriptorViolations({
      name: packageName,
      "x-semiotic-voxel": descriptor(packageName, {
        operations: ["do-example", "do-example"],
        capabilities: [{ capability: "example", faces: ["do-example"], semanticAtom: true }],
      }),
    }),
    ["operations", "capabilities"],
  );
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
  await writeFile(join(root, carrier, "package.json"), `${JSON.stringify({ name: "@red-cup-engineering/example", version: "1.0.0", "x-semiotic-voxel": descriptor("@red-cup-engineering/example") })}\n`);
  await writeFile(join(provider, "package.json"), `${JSON.stringify({ name: "@red-cup-engineering/provider", version: "1.0.0", "x-semiotic-voxel": descriptor("@red-cup-engineering/provider", { actor: "urn:ame:provider" }) })}\n`);
  await symlink(provider, join(root, carrier, "node_modules", "@red-cup-engineering", "provider"));
  await assert.rejects(() => assaySemioticVoxelPackageBody({ root }), (error) => error.receipt.defects.some(({ law }) => law === "no-cross-package-install-symlink"));
});
