import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { builtinModules } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";

const OMIT_DIRECTORY = new Set([".git", "node_modules", "data", "test", "tests", "ops", ".tmp"]);
const FALLBACK_RUNTIME_CARRIERS = ["src", "dist", "bin", "lib", "content"];
const BUILTIN_MODULES = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));

function inside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== "..");
}

async function exists(path) {
  try { await stat(path); return true; } catch (error) { if (error?.code === "ENOENT") return false; throw error; }
}

async function copyTree(source, target) {
  const info = await stat(source);
  if (info.isDirectory()) {
    await mkdir(target, { recursive: true });
    for (const entry of await readdir(source, { withFileTypes: true })) {
      if (OMIT_DIRECTORY.has(entry.name)) continue;
      await copyTree(join(source, entry.name), join(target, entry.name));
    }
    return;
  }
  if (!info.isFile()) return;
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, await readFile(source));
}

async function admittedSource(directory) {
  const canonical = await realpath(directory);
  const manifest = JSON.parse(await readFile(join(canonical, "package.json"), "utf8"));
  if (typeof manifest.name !== "string" || !manifest.name) throw new Error(`provider source ${canonical} has no package identity`);
  if (!/^\d+\.\d+\.\d+$/u.test(manifest.version ?? "")) throw new Error(`provider source ${manifest.name} has no exact version`);
  return { directory: canonical, manifest };
}

function runtimeDependencies(manifest) {
  return Object.keys({ ...(manifest.dependencies ?? {}), ...(manifest.optionalDependencies ?? {}) }).sort();
}

async function copyPackage(source, target, manifest, entry = false) {
  await mkdir(target, { recursive: true });
  await copyTree(join(source, "package.json"), join(target, "package.json"));
  const carriers = Array.isArray(manifest.files) && manifest.files.length > 0
    ? manifest.files
    : FALLBACK_RUNTIME_CARRIERS;
  for (const carrier of carriers) {
    const sourcePath = resolve(source, carrier);
    if (!inside(source, sourcePath) || !(await exists(sourcePath))) continue;
    await copyTree(sourcePath, join(target, relative(source, sourcePath)));
  }
  if (entry && !(await exists(join(target, "src"))) && !(await exists(join(target, "dist")))) {
    throw new Error(`entry package ${manifest.name} exposes no src or dist runtime carrier`);
  }
}

async function artifactDigest(root) {
  const hash = createHash("sha256");
  let fileCount = 0;
  let byteCount = 0;
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (entry.name === "release-receipt.json") continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) {
        const bytes = await readFile(path);
        fileCount += 1;
        byteCount += bytes.byteLength;
        hash.update(relative(root, path)); hash.update("\0"); hash.update(bytes); hash.update("\0");
      }
    }
  }
  await visit(root);
  return { digest: hash.digest("hex"), fileCount, byteCount };
}

function packageName(specifier) {
  if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("#") || BUILTIN_MODULES.has(specifier)) return null;
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

async function unresolvedRuntimeImports(root) {
  const observed = new Map();
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && /\.(?:mjs|mts|js)$/u.test(entry.name) && !entry.name.endsWith(".d.mts")) {
        const source = await readFile(path, "utf8");
        const patterns = [
          /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/gu,
          /import\(\s*["']([^"']+)["']\s*\)/gu,
        ];
        for (const pattern of patterns) {
          for (const match of source.matchAll(pattern)) {
            const dependency = packageName(match[1]);
            if (dependency) {
              const carriers = observed.get(dependency) ?? new Set();
              carriers.add(relative(root, path));
              observed.set(dependency, carriers);
            }
          }
        }
      }
    }
  }
  await visit(join(root, "app"));
  const unresolved = [];
  for (const dependency of [...observed.keys()].sort()) {
    if (!(await exists(join(root, "app", "node_modules", ...dependency.split("/"), "package.json")))) {
      unresolved.push({ packageName: dependency, carriers: [...observed.get(dependency)].sort() });
    }
  }
  return unresolved;
}

export async function verifyNodeRuntimeRelease(releaseDirectory) {
  const receipt = JSON.parse(await readFile(join(releaseDirectory, "release-receipt.json"), "utf8"));
  const observed = await artifactDigest(releaseDirectory);
  const unresolvedRuntimeImportsObserved = await unresolvedRuntimeImports(releaseDirectory);
  const unresolvedRuntimePackages = unresolvedRuntimeImportsObserved.map(({ packageName }) => packageName);
  return {
    type: "NodeRuntimeReleaseVerificationObservation",
    ok: observed.digest === receipt.artifactDigest && unresolvedRuntimePackages.length === 0,
    expectedDigest: receipt.artifactDigest,
    observedDigest: observed.digest,
    fileCount: observed.fileCount,
    byteCount: observed.byteCount,
    unresolvedRuntimePackages,
    unresolvedRuntimeCarriers: Object.fromEntries(unresolvedRuntimeImportsObserved.map(({ packageName, carriers }) => [packageName, carriers])),
  };
}

export async function materializeNodeRuntimeRelease({ entryPackageDirectory, providerSources = {}, outputRoot }) {
  const entry = await admittedSource(entryPackageDirectory);
  const entryDirectory = entry.directory;
  const entryManifest = entry.manifest;
  const index = new Map([[entryManifest.name, entry]]);
  for (const [claimedName, source] of Object.entries(providerSources)) {
    const admitted = await admittedSource(source);
    if (admitted.manifest.name !== claimedName) throw new Error(`provider source claim ${claimedName} resolves to ${admitted.manifest.name}`);
    if (index.has(claimedName)) throw new Error(`duplicate provider source ${claimedName}`);
    index.set(claimedName, admitted);
  }

  const output = resolve(outputRoot);
  await mkdir(output, { recursive: true });
  const temporary = await mkdtemp(join(output, ".materializing-"));
  const packages = [];
  const visited = new Set();
  try {
    async function include(name, destination, entry = false) {
      if (visited.has(name)) return;
      const record = index.get(name);
      if (!record) throw new Error(`runtime dependency ${name} has no explicitly admitted provider source`);
      visited.add(name);
      await copyPackage(record.directory, destination, record.manifest, entry);
      packages.push({ name, version: record.manifest.version });
      for (const dependency of runtimeDependencies(record.manifest)) {
        const requested = record.manifest.dependencies?.[dependency] ?? record.manifest.optionalDependencies?.[dependency];
        if (!/^\d+\.\d+\.\d+$/u.test(requested ?? "")) throw new Error(`runtime dependency ${dependency} must use one exact provider version, received ${requested}`);
        const provider = index.get(dependency);
        if (provider && provider.manifest.version !== requested) throw new Error(`runtime dependency ${dependency} requested ${requested} but admitted provider is ${provider.manifest.version}`);
        await include(dependency, join(temporary, "app", "node_modules", ...dependency.split("/")));
      }
    }
    await include(entryManifest.name, join(temporary, "app"), true);
    packages.sort((left, right) => left.name.localeCompare(right.name));
    const unresolved = await unresolvedRuntimeImports(temporary);
    if (unresolved.length > 0) {
      throw new Error(`runtime import closure is missing ${unresolved.map(({ packageName, carriers }) => `${packageName} imported by ${carriers.join("+")}`).join(", ")}`);
    }
    const artifact = await artifactDigest(temporary);
    const artifactDigestValue = artifact.digest;
    const releaseDirectory = join(output, artifactDigestValue);
    const receipt = {
      type: "NodeRuntimeReleaseMaterializationReceipt",
      version: 1,
      entryPackage: entryManifest.name,
      entryCarrier: (await exists(join(temporary, "app", "src", "server.mts"))) ? "app/src/server.mts" : null,
      artifactDigest: artifactDigestValue,
      fileCount: artifact.fileCount,
      byteCount: artifact.byteCount,
      nodeVersion: process.version,
      packages,
      releaseDirectory,
    };
    await writeFile(join(temporary, "release-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
    if (await exists(releaseDirectory)) await rm(temporary, { recursive: true });
    else await rename(temporary, releaseDirectory);
    return receipt;
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}
