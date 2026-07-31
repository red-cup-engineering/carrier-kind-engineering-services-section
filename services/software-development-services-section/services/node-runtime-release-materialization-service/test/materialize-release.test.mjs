import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { materializeNodeRuntimeRelease, verifyNodeRuntimeRelease } from "../src/materialize-release.mjs";

test("materializes a deterministic isolated local runtime closure", async () => {
  const root = await mkdtemp(join(tmpdir(), "node-release-materialization-test-"));
  try {
    const app = join(root, "workspace", "app");
    const library = join(root, "workspace", "library");
    await mkdir(join(app, "src"), { recursive: true });
    await mkdir(join(library, "dist"), { recursive: true });
    await writeFile(join(app, "package.json"), JSON.stringify({ name: "@test/app", version: "1.0.0", type: "module", dependencies: { "@test/library": "1.0.0" } }));
    await writeFile(join(app, "src", "server.mts"), 'import { value } from "@test/library"; console.log(value);\n');
    await writeFile(join(library, "package.json"), JSON.stringify({ name: "@test/library", version: "1.0.0", type: "module", files: ["dist"], exports: "./dist/index.mjs" }));
    await writeFile(join(library, "dist", "index.mjs"), 'export const value = "closed";\n');

    const first = await materializeNodeRuntimeRelease({ entryPackageDirectory: app, providerSources: { "@test/library": library }, outputRoot: join(root, "releases") });
    const second = await materializeNodeRuntimeRelease({ entryPackageDirectory: app, providerSources: { "@test/library": library }, outputRoot: join(root, "releases") });
    assert.equal(first.artifactDigest, second.artifactDigest);
    assert.deepEqual(first.packages.map(({ name }) => name), ["@test/app", "@test/library"]);
    assert.equal((await verifyNodeRuntimeRelease(first.releaseDirectory)).ok, true);
    assert.match(await readFile(join(first.releaseDirectory, "app", "node_modules", "@test", "library", "dist", "index.mjs"), "utf8"), /closed/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("hoists one admitted transitive provider for sibling consumers", async () => {
  const root = await mkdtemp(join(tmpdir(), "node-release-hoisted-transitive-"));
  try {
    const app = join(root, "workspace", "app");
    const one = join(root, "workspace", "one");
    const two = join(root, "workspace", "two");
    const shared = join(root, "workspace", "shared");
    for (const directory of [app, one, two, shared]) await mkdir(join(directory, "src"), { recursive: true });
    await writeFile(join(app, "package.json"), JSON.stringify({ name: "@test/app", version: "1.0.0", dependencies: { "@test/one": "1.0.0", "@test/two": "1.0.0" } }));
    await writeFile(join(app, "src", "server.mts"), 'import "@test/one"; import "@test/two";\n');
    for (const [directory, name] of [[one, "@test/one"], [two, "@test/two"]]) {
      await writeFile(join(directory, "package.json"), JSON.stringify({ name, version: "1.0.0", type: "module", exports: "./src/index.mjs", dependencies: { "@test/shared": "1.0.0" } }));
      await writeFile(join(directory, "src", "index.mjs"), 'import "@test/shared";\n');
    }
    await writeFile(join(shared, "package.json"), JSON.stringify({ name: "@test/shared", version: "1.0.0", type: "module", exports: "./src/index.mjs" }));
    await writeFile(join(shared, "src", "index.mjs"), "export {};\n");
    const release = await materializeNodeRuntimeRelease({
      entryPackageDirectory: app,
      providerSources: { "@test/one": one, "@test/two": two, "@test/shared": shared },
      outputRoot: join(root, "releases"),
    });
    assert.equal((await verifyNodeRuntimeRelease(release.releaseDirectory)).ok, true);
    assert.match(await readFile(join(release.releaseDirectory, "app", "node_modules", "@test", "shared", "src", "index.mjs"), "utf8"), /export/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("copies root export carriers selected by root-level files globs", async () => {
  const root = await mkdtemp(join(tmpdir(), "node-release-root-glob-"));
  try {
    const app = join(root, "workspace", "app");
    const library = join(root, "workspace", "library");
    await mkdir(join(app, "src"), { recursive: true });
    await mkdir(join(library, "src"), { recursive: true });
    await writeFile(join(app, "package.json"), JSON.stringify({ name: "@test/app", version: "1.0.0", dependencies: { "@test/library": "1.0.0" } }));
    await writeFile(join(app, "src", "server.mts"), 'import "@test/library";\n');
    await writeFile(join(library, "package.json"), JSON.stringify({ name: "@test/library", version: "1.0.0", type: "module", files: ["src", "**/*.mjs"], exports: "./index.mjs" }));
    await writeFile(join(library, "index.mjs"), "export {};\n");
    const release = await materializeNodeRuntimeRelease({ entryPackageDirectory: app, providerSources: { "@test/library": library }, outputRoot: join(root, "releases") });
    assert.equal((await verifyNodeRuntimeRelease(release.releaseDirectory)).ok, true);
    assert.match(await readFile(join(release.releaseDirectory, "app", "node_modules", "@test", "library", "index.mjs"), "utf8"), /export/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("verifies conventional main targets that omit the dot slash prefix", async () => {
  const root = await mkdtemp(join(tmpdir(), "node-release-conventional-main-"));
  try {
    const app = join(root, "workspace", "app");
    const library = join(root, "workspace", "library");
    await mkdir(join(app, "src"), { recursive: true });
    await mkdir(library, { recursive: true });
    await writeFile(join(app, "package.json"), JSON.stringify({ name: "@test/app", version: "1.0.0", dependencies: { conventional: "1.0.0" } }));
    await writeFile(join(app, "src", "server.mts"), 'import "conventional";\n');
    await writeFile(join(library, "package.json"), JSON.stringify({ name: "conventional", version: "1.0.0", files: ["index.js"], main: "index.js" }));
    await writeFile(join(library, "index.js"), "module.exports = {};\n");
    const release = await materializeNodeRuntimeRelease({ entryPackageDirectory: app, providerSources: { conventional: library }, outputRoot: join(root, "releases") });
    assert.equal((await verifyNodeRuntimeRelease(release.releaseDirectory)).ok, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("verification detects post-materialization mutation", async () => {
  const root = await mkdtemp(join(tmpdir(), "node-release-materialization-tamper-"));
  try {
    const app = join(root, "workspace", "app");
    await mkdir(join(app, "src"), { recursive: true });
    await writeFile(join(app, "package.json"), JSON.stringify({ name: "@test/app", version: "1.0.0" }));
    await writeFile(join(app, "src", "server.mts"), "export const state = 'admitted';\n");
    const release = await materializeNodeRuntimeRelease({ entryPackageDirectory: app, outputRoot: join(root, "releases") });
    await writeFile(join(release.releaseDirectory, "app", "src", "server.mts"), "export const state = 'mutated';\n");
    const observation = await verifyNodeRuntimeRelease(release.releaseDirectory);
    assert.equal(observation.ok, false);
    assert.notEqual(observation.expectedDigest, observation.observedDigest);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refuses undeclared external runtime dependencies instead of consulting ambient state", async () => {
  const root = await mkdtemp(join(tmpdir(), "node-release-materialization-refusal-"));
  try {
    const app = join(root, "workspace", "app");
    await mkdir(join(app, "src"), { recursive: true });
    await writeFile(join(app, "package.json"), JSON.stringify({ name: "@test/app", version: "1.0.0", dependencies: { external: "1.0.0" } }));
    await writeFile(join(app, "src", "server.mts"), "export {};\n");
    await assert.rejects(
      materializeNodeRuntimeRelease({ entryPackageDirectory: app, outputRoot: join(root, "releases") }),
      /runtime dependency external has no explicitly admitted provider source/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refuses stale build output that imports a package absent from the admitted closure", async () => {
  const root = await mkdtemp(join(tmpdir(), "node-release-runtime-import-refusal-"));
  try {
    const app = join(root, "workspace", "app");
    const library = join(root, "workspace", "library");
    await mkdir(join(app, "src"), { recursive: true });
    await mkdir(join(library, "dist"), { recursive: true });
    await writeFile(join(app, "package.json"), JSON.stringify({ name: "@test/app", version: "1.0.0", dependencies: { "@test/library": "1.0.0" } }));
    await writeFile(join(app, "src", "server.mts"), 'import "@test/library";\n');
    await writeFile(join(library, "package.json"), JSON.stringify({ name: "@test/library", version: "1.0.0", files: ["dist"], exports: "./dist/index.mjs" }));
    await writeFile(join(library, "dist", "index.mjs"), 'import "@obsolete/missing";\n');
    await assert.rejects(
      materializeNodeRuntimeRelease({ entryPackageDirectory: app, providerSources: { "@test/library": library }, outputRoot: join(root, "releases") }),
      /runtime import closure is missing @obsolete\/missing/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refuses an admitted package whose runtime export carrier is absent", async () => {
  const root = await mkdtemp(join(tmpdir(), "node-release-runtime-export-refusal-"));
  try {
    const app = join(root, "workspace", "app");
    const library = join(root, "workspace", "library");
    await mkdir(join(app, "src"), { recursive: true });
    await mkdir(join(library, "dist", "types"), { recursive: true });
    await writeFile(join(app, "package.json"), JSON.stringify({ name: "@test/app", version: "1.0.0", dependencies: { "@test/library": "1.0.0" } }));
    await writeFile(join(app, "src", "server.mts"), 'import "@test/library";\n');
    await writeFile(join(library, "package.json"), JSON.stringify({
      name: "@test/library",
      version: "1.0.0",
      files: ["dist"],
      exports: { ".": { types: "./dist/types/index.d.ts", default: "./dist/runtime/index.mjs" } },
    }));
    await writeFile(join(library, "dist", "types", "index.d.ts"), "export {};\n");
    await assert.rejects(
      materializeNodeRuntimeRelease({ entryPackageDirectory: app, providerSources: { "@test/library": library }, outputRoot: join(root, "releases") }),
      /runtime import closure is missing @test\/library export \. -> \.\/dist\/runtime\/index\.mjs/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("verification identifies a runtime export carrier removed from a release", async () => {
  const root = await mkdtemp(join(tmpdir(), "node-release-runtime-export-verification-"));
  try {
    const app = join(root, "workspace", "app");
    const library = join(root, "workspace", "library");
    await mkdir(join(app, "src"), { recursive: true });
    await mkdir(join(library, "dist"), { recursive: true });
    await writeFile(join(app, "package.json"), JSON.stringify({ name: "@test/app", version: "1.0.0", dependencies: { "@test/library": "1.0.0" } }));
    await writeFile(join(app, "src", "server.mts"), 'import "@test/library";\n');
    await writeFile(join(library, "package.json"), JSON.stringify({ name: "@test/library", version: "1.0.0", files: ["dist"], exports: "./dist/index.mjs" }));
    await writeFile(join(library, "dist", "index.mjs"), "export {};\n");
    const release = await materializeNodeRuntimeRelease({ entryPackageDirectory: app, providerSources: { "@test/library": library }, outputRoot: join(root, "releases") });
    await rm(join(release.releaseDirectory, "app", "node_modules", "@test", "library", "dist", "index.mjs"));
    const observation = await verifyNodeRuntimeRelease(release.releaseDirectory);
    assert.equal(observation.ok, false);
    assert.deepEqual(observation.unresolvedRuntimePackages, ["@test/library"]);
    assert.deepEqual(observation.unresolvedRuntimeTargets["@test/library"], [{
      specifier: "@test/library",
      subpath: ".",
      target: "./dist/index.mjs",
    }]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("materializes a proof-carried catalog and normalizes only the fabricated dependency edge", async () => {
  const root = await mkdtemp(join(tmpdir(), "node-release-catalog-"));
  try {
    const app = join(root, "workspace", "app");
    const library = join(root, "workspace", "library");
    await mkdir(join(app, "src"), { recursive: true });
    await mkdir(join(library, "dist"), { recursive: true });
    await writeFile(join(app, "package.json"), JSON.stringify({ name: "@test/app", version: "1.0.0", dependencies: { "@test/library": "workspace:*" } }));
    await writeFile(join(app, "src", "server.mts"), 'import "@test/library";\n');
    await writeFile(join(library, "package.json"), JSON.stringify({ name: "@test/library", version: "2.0.0-beta.1", exports: "./dist/index.mjs" }));
    await writeFile(join(library, "dist", "index.mjs"), "export {};\n");
    const sourceCatalog = {
      type: "NodePackageSourceCatalogReceipt", version: 1, id: "ni:///sha-256;catalog", entryPackage: "@test/app",
      packages: [
        { name: "@test/app", version: "1.0.0", sourceDirectory: app },
        { name: "@test/library", version: "2.0.0-beta.1", sourceDirectory: library },
      ],
    };
    const release = await materializeNodeRuntimeRelease({ entryPackageDirectory: app, sourceCatalog, outputRoot: join(root, "releases") });
    const carried = JSON.parse(await readFile(join(release.releaseDirectory, "app", "package.json"), "utf8"));
    assert.equal(carried.dependencies["@test/library"], "2.0.0-beta.1");
    assert.equal(JSON.parse(await readFile(join(app, "package.json"), "utf8")).dependencies["@test/library"], "workspace:*");
    assert.equal(release.sourceCatalog, sourceCatalog.id);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("types an absent platform-conditional dependency while preserving required closure", async () => {
  const root = await mkdtemp(join(tmpdir(), "node-release-platform-optional-"));
  try {
    const app = join(root, "workspace", "app");
    await mkdir(join(app, "src"), { recursive: true });
    await writeFile(join(app, "package.json"), JSON.stringify({
      name: "@test/app",
      version: "1.0.0",
      optionalDependencies: { fsevents: "2.3.3" },
    }));
    await writeFile(join(app, "src", "server.mts"), 'import("fsevents").catch(() => undefined);\n');
    const release = await materializeNodeRuntimeRelease({ entryPackageDirectory: app, outputRoot: join(root, "releases") });
    assert.deepEqual(release.optionalRuntimePackagesAbsent, ["fsevents"]);
    assert.equal((await verifyNodeRuntimeRelease(release.releaseDirectory)).ok, true);

    await writeFile(join(app, "package.json"), JSON.stringify({
      name: "@test/app",
      version: "1.0.0",
      dependencies: { fsevents: "2.3.3" },
    }));
    await assert.rejects(
      materializeNodeRuntimeRelease({ entryPackageDirectory: app, outputRoot: join(root, "releases") }),
      /runtime dependency fsevents has no explicitly admitted provider source/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("does not project a multiline code fragment as an import specifier", async () => {
  const root = await mkdtemp(join(tmpdir(), "node-release-import-recognizer-"));
  try {
    const app = join(root, "workspace", "app");
    await mkdir(join(app, "src"), { recursive: true });
    await writeFile(join(app, "package.json"), JSON.stringify({ name: "@test/app", version: "1.0.0" }));
    await writeFile(join(app, "src", "server.mts"), 'const source = /import \\\"unterminated\ncode package.json\"/u;\nexport { source };\n');
    const release = await materializeNodeRuntimeRelease({ entryPackageDirectory: app, outputRoot: join(root, "releases") });
    assert.equal((await verifyNodeRuntimeRelease(release.releaseDirectory)).ok, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
