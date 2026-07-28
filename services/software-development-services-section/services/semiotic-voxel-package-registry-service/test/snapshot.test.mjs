import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { obtainRegistrySnapshot } from "../src/snapshot.mjs";

test("supplies a current immutable snapshot only at its exact private registry face", async () => {
  const root = await mkdtemp(join(tmpdir(), "union-package-registry-"));
  try {
    await mkdir(root, { recursive: true });
    await writeFile(join(root, "registry-receipt.json"), `${JSON.stringify({ type: "SemioticVoxelPackageRegistryReceipt", scopes: ["union"], packages: [{ name: "@union/example", version: "1.0.0", artifact: "tarballs/union/example/-/example-1.0.0.tgz", bytes: 1, shasum: "one", integrity: "sha512-one" }] })}\n`);
    const snapshot = await obtainRegistrySnapshot({ type: "UnionPackageRegistrySnapshotDemand", requestId: "urn:demand:one", registry: "http://registry.union.test/" }, { registryRoot: root, registryUrl: "http://registry.union.test/" });
    assert.equal(snapshot.packages[0].tarball, "http://registry.union.test/tarballs/union/example/-/example-1.0.0.tgz");
    assert.match(snapshot.npmrc, /@union:registry=http:\/\/registry\.union\.test\//u);
    await assert.rejects(() => obtainRegistrySnapshot({ type: "UnionPackageRegistrySnapshotDemand", requestId: "urn:demand:two", registry: "http://foreign.example/" }, { registryRoot: root, registryUrl: "http://registry.union.test/" }), /exact private registry face/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});
