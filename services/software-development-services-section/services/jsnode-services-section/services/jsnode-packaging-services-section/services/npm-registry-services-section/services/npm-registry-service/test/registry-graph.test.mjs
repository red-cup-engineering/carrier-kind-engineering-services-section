import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolvePackageRegistryRequest } from "../src/package-registry.mjs";
import { deriveRegistryGraph, renderRegistryGraphDot } from "../src/registry-graph.mjs";

// The sandbox running these tests refuses TCP connections to listeners the
// test itself opens, so the HTTP face is exercised through an injected fetch
// backed by the registry server's own request resolver — the same URL and
// percent-encoding law a socket would see, minus the socket.
function registryFetch(registryDirectory) {
  return async (url) => {
    const target = await resolvePackageRegistryRequest({ registryDirectory, requestPath: new URL(url).pathname });
    if (target === null) return { ok: false, status: 404 };
    const body = await readFile(target);
    return { ok: true, status: 200, arrayBuffer: async () => body };
  };
}

async function writeFixtureRegistry(root, { danglingPin = false } = {}) {
  await mkdir(join(root, "metadata"), { recursive: true });
  const manifests = {
    "@union/leaf": {
      name: "@union/leaf",
      "dist-tags": { latest: "1.0.0" },
      versions: {
        "1.0.0": {
          name: "@union/leaf",
          version: "1.0.0",
          "x-semiotic-voxel": { actor: "urn:ame:union-leaf", owner: "union", kind: "actor" },
          "x-agentic-metro-enterprise": { "node-id": "leaf-node" },
          dist: { shasum: "leaf-sha", integrity: "sha512-leaf" },
        },
      },
    },
    "@union/stem": {
      name: "@union/stem",
      versions: {
        "2.0.0": {
          name: "@union/stem",
          version: "2.0.0",
          dependencies: { "@union/leaf": danglingPin ? "9.9.9" : "1.0.0" },
          devDependencies: { typescript: "^5.8.0" },
          "x-semiotic-voxel": { actor: "urn:ame:union-stem", owner: "union", kind: "actor" },
          dist: { shasum: "stem-sha", integrity: "sha512-stem" },
        },
      },
    },
  };
  for (const [name, metadata] of Object.entries(manifests)) {
    await writeFile(join(root, "metadata", `${encodeURIComponent(name)}.json`), `${JSON.stringify(metadata)}\n`);
  }
  await writeFile(join(root, "registry-receipt.json"), `${JSON.stringify({
    type: "SemioticVoxelPackageRegistryReceipt",
    version: 2,
    registry: "http://registry.union.test/",
    predecessor: null,
    reaction: null,
    scopes: ["union"],
    compute: { provider: "union-test", parallelism: 1 },
    packages: [
      { name: "@union/stem", version: "2.0.0", artifact: "tarballs/union/stem/-/stem-2.0.0.tgz", bytes: 2, shasum: "stem-sha", integrity: "sha512-stem" },
      { name: "@union/leaf", version: "1.0.0", artifact: "tarballs/union/leaf/-/leaf-1.0.0.tgz", bytes: 1, shasum: "leaf-sha", integrity: "sha512-leaf" },
    ],
  })}\n`);
}

test("derives a tiered registry graph with two-leg node addresses", async () => {
  const root = await mkdtemp(join(tmpdir(), "union-registry-graph-"));
  try {
    await writeFixtureRegistry(root);
    const graph = await deriveRegistryGraph({ registryRoot: root });

    assert.equal(graph.type, "NpmRegistryGraph");
    assert.deepEqual(graph.nodes.map((node) => node.address.packageSurface), ["@union/leaf@1.0.0", "@union/stem@2.0.0"]);
    assert.equal(graph.nodes[0].address.contentIntegrity, "sha512-leaf");
    assert.match(graph.receiptSha256, /^sha256:[0-9a-f]{64}$/u);

    const internal = graph.tiers.dependency.edges.find((edge) => edge.resolution === "registry");
    assert.deepEqual(internal, {
      from: "@union/stem@2.0.0",
      to: "@union/leaf@1.0.0",
      constraint: "1.0.0",
      relation: "dependencies",
      resolution: "registry",
    });
    const external = graph.tiers.dependency.edges.find((edge) => edge.resolution === "external");
    assert.equal(external.to, "typescript");
    assert.equal(external.relation, "devDependencies");

    assert.deepEqual(graph.tiers.actor.edges.filter((edge) => edge.from === "@union/leaf@1.0.0").map((edge) => [edge.relation, edge.to]), [
      ["owned-by", "union"],
    ]);
    assert.deepEqual(graph.tiers.history, { predecessor: null, reaction: null, receiptVersion: 2 });
    assert.equal(graph.tiers.witness.compute.provider, "union-test");
    assert.equal(graph.tiers.witness.artifacts.length, 2);
    assert.equal(graph.defects.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports an unresolved internal pin as a defect, not an edge", async () => {
  const root = await mkdtemp(join(tmpdir(), "union-registry-graph-"));
  try {
    await writeFixtureRegistry(root, { danglingPin: true });
    const graph = await deriveRegistryGraph({ registryRoot: root });
    assert.deepEqual(graph.defects, [{
      kind: "unresolved-internal-dependency",
      from: "@union/stem@2.0.0",
      to: "@union/leaf@9.9.9",
      relation: "dependencies",
    }]);
    assert.equal(graph.tiers.dependency.edges.some((edge) => edge.to === "@union/leaf@9.9.9"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("derives the same graph over the registry HTTP face as from disk", async () => {
  const root = await mkdtemp(join(tmpdir(), "union-registry-graph-"));
  try {
    await writeFixtureRegistry(root);
    const overHttp = await deriveRegistryGraph({
      registryUrl: "http://registry.union.test",
      fetchImplementation: registryFetch(root),
    });
    const fromDisk = await deriveRegistryGraph({ registryRoot: root });
    assert.deepEqual(JSON.parse(JSON.stringify(overHttp)), JSON.parse(JSON.stringify(fromDisk)));
    await assert.rejects(
      deriveRegistryGraph({ registryRoot: root, registryUrl: "http://registry.union.test" }),
      /exactly one of registryRoot/u,
    );
    await assert.rejects(deriveRegistryGraph({}), /exactly one of registryRoot/u);
    await assert.rejects(
      deriveRegistryGraph({ registryUrl: "http://registry.union.test/absent/", fetchImplementation: registryFetch(root) }),
      /does not publish registry-receipt\.json/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("derives a graph from an explicit package list, no receipt needed", async () => {
  const root = await mkdtemp(join(tmpdir(), "union-registry-graph-"));
  try {
    await writeFixtureRegistry(root);
    await rm(join(root, "registry-receipt.json"));

    const graph = await deriveRegistryGraph({
      registryUrl: "http://registry.union.test",
      fetchImplementation: registryFetch(root),
      packages: ["@union/stem@2.0.0", "@union/leaf"],
      internalScopes: ["union"],
    });
    assert.deepEqual(graph.nodes.map((node) => node.address.packageSurface), ["@union/leaf@1.0.0", "@union/stem@2.0.0"]);
    assert.equal(graph.receiptSha256, null);
    assert.deepEqual(graph.tiers.history, { predecessor: null, reaction: null, receiptVersion: null });
    assert.equal(graph.tiers.dependency.edges.find((edge) => edge.resolution === "registry").to, "@union/leaf@1.0.0");
    assert.equal(graph.defects.length, 0);

    const external = await deriveRegistryGraph({
      registryUrl: "http://registry.union.test",
      fetchImplementation: registryFetch(root),
      packages: [{ name: "@union/stem", version: "2.0.0" }],
    });
    assert.equal(external.tiers.dependency.edges.every((edge) => edge.resolution === "external"), true);
    assert.equal(external.defects.length, 0);

    await assert.rejects(
      deriveRegistryGraph({ registryUrl: "http://registry.union.test", fetchImplementation: registryFetch(root), packages: ["@union/stem@9.9.9"] }),
      /registry has no @union\/stem@9\.9\.9/u,
    );
    await assert.rejects(
      deriveRegistryGraph({ registryUrl: "http://registry.union.test", fetchImplementation: registryFetch(root), packages: [] }),
      /non-empty array/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("renders dependency and actor tiers as Graphviz DOT", async () => {
  const root = await mkdtemp(join(tmpdir(), "union-registry-graph-"));
  try {
    await writeFixtureRegistry(root);
    const graph = await deriveRegistryGraph({ registryRoot: root });
    const dependencyDot = renderRegistryGraphDot(graph, { tier: "dependency" });
    assert.match(dependencyDot, /"@union\/stem@2\.0\.0" -> "@union\/leaf@1\.0\.0" \[label="dependencies"\];/u);
    assert.match(dependencyDot, /"typescript" \[shape=box, style=dashed\];/u);
    const actorDot = renderRegistryGraphDot(graph, { tier: "actor" });
    assert.match(actorDot, /"@union\/leaf@1\.0\.0" -> "union" \[label="owned-by"\];/u);
    assert.throws(() => renderRegistryGraphDot(graph, { tier: "settlement" }), /unknown registry graph tier/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
