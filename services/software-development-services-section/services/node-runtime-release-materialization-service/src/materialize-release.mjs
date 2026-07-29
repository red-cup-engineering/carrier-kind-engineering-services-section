import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { builtinModules } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";

const OMIT_DIRECTORY = new Set([".git", "node_modules", "data", "test", "tests", "dist-tests", "benchmark", "benchmarks", "docs", "examples", "ops", ".tmp"]);
const BUILTIN_MODULES = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;

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
  if (/\.(?:test|spec)\.[cm]?[jt]s$/u.test(source.split("/").at(-1))) return;
  if (/(?:^|[.-])(?:eslint|rollup|webpack|vite|vitest)\.config\.[cm]?[jt]s$/u.test(source.split("/").at(-1))) return;
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, await readFile(source));
}

async function admittedSource(directory) {
  const canonical = await realpath(directory);
  const manifest = JSON.parse(await readFile(join(canonical, "package.json"), "utf8"));
  if (typeof manifest.name !== "string" || !manifest.name) throw new Error(`provider source ${canonical} has no package identity`);
  if (!EXACT_VERSION.test(manifest.version ?? "")) throw new Error(`provider source ${manifest.name} has no exact version`);
  return { directory: canonical, manifest };
}

function runtimeDependencies(manifest) {
  const dependencies = new Map(Object.entries(manifest.dependencies ?? {})
    .map(([name, requested]) => [name, { name, requested, optional: false }]));
  for (const [name, requested] of Object.entries(manifest.optionalDependencies ?? {})) {
    dependencies.set(name, { name, requested, optional: true });
  }
  for (const [name, requested] of Object.entries(manifest.peerDependencies ?? {})) {
    if (!dependencies.has(name)) {
      dependencies.set(name, { name, requested, optional: manifest.peerDependenciesMeta?.[name]?.optional === true });
    }
  }
  return [...dependencies.values()].sort((left, right) => left.name.localeCompare(right.name));
}

async function copyPackage(source, target, manifest, entry = false) {
  await mkdir(target, { recursive: true });
  if (Array.isArray(manifest.files) && manifest.files.length > 0) {
    const carriers = [...new Set(manifest.files.filter((carrier) => typeof carrier === "string" && !carrier.startsWith("!"))
      .map((carrier) => carrier.split(/[?*[{]/u, 1)[0].replace(/\/$/u, ""))
      .filter(Boolean))];
    for (const carrier of carriers) {
      const sourcePath = resolve(source, carrier);
      if (!inside(source, sourcePath) || !(await exists(sourcePath))) continue;
      await copyTree(sourcePath, join(target, relative(source, sourcePath)));
    }
  } else {
    await copyTree(source, target);
  }
  await writeFile(join(target, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
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
  if (!/^(?:@[A-Za-z0-9][A-Za-z0-9._~-]*\/)?[A-Za-z0-9][A-Za-z0-9._~-]*(?:\/[A-Za-z0-9._~!$&()+,;=:@%-]+)*$/u.test(specifier)) return null;
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

async function unresolvedRuntimeImports(root, admittedAbsent = new Set()) {
  const observed = new Map();
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && /\.(?:mjs|mts|js)$/u.test(entry.name) && !entry.name.endsWith(".d.mts")) {
        const literals = [];
        const source = (await readFile(path, "utf8"))
          .replace(/`(?:\\[\s\S]|[^\\`])*`/gu, "__SXC_TEMPLATE_LITERAL__")
          .replace(/(["'])(?:\\[\s\S]|(?!\1)[^\\\r\n])*\1/gu, (literal) => {
            const index = literals.push(literal.slice(1, -1).replace(/\\([\\"'])/gu, "$1")) - 1;
            return `${literal[0]}__SXC_STRING_${index}__${literal.at(-1)}`;
          })
          .replace(/\/\*[\s\S]*?\*\//gu, "")
          .replace(/(^|\n)\s*\/\/[^\n]*/gu, "$1");
        const patterns = [
          /(?:^|\n)\s*(?:import|export)\s+(?:[^"'\r\n]*?\s+from\s+)?["']([^"'\\\r\n]+)["']/gu,
        ];
        for (const pattern of patterns) {
          for (const match of source.matchAll(pattern)) {
            const literal = /^__SXC_STRING_(\d+)__$/u.exec(match[1]);
            const dependency = packageName(literal ? literals[Number(literal[1])] : match[1]);
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
    if (admittedAbsent.has(dependency)) continue;
    if (!(await exists(join(root, "app", "node_modules", ...dependency.split("/"), "package.json")))) {
      unresolved.push({ packageName: dependency, carriers: [...observed.get(dependency)].sort() });
    }
  }
  return unresolved;
}

export async function verifyNodeRuntimeRelease(releaseDirectory) {
  const receipt = JSON.parse(await readFile(join(releaseDirectory, "release-receipt.json"), "utf8"));
  const observed = await artifactDigest(releaseDirectory);
  const unresolvedRuntimeImportsObserved = await unresolvedRuntimeImports(releaseDirectory, new Set(receipt.optionalRuntimePackagesAbsent ?? []));
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

export async function materializeNodeRuntimeRelease({ entryPackageDirectory, providerSources = {}, sourceCatalog = null, outputRoot }) {
  const entry = await admittedSource(entryPackageDirectory);
  const entryDirectory = entry.directory;
  const entryManifest = entry.manifest;
  const index = new Map([[entryManifest.name, entry]]);
  if (sourceCatalog !== null) {
    if (sourceCatalog?.type !== "NodePackageSourceCatalogReceipt" || sourceCatalog.version !== 1 || !Array.isArray(sourceCatalog.packages)) {
      throw new TypeError("sourceCatalog must be a NodePackageSourceCatalogReceipt v1");
    }
    if (sourceCatalog.entryPackage !== entryManifest.name) throw new Error(`source catalog entry ${sourceCatalog.entryPackage} does not match ${entryManifest.name}`);
    for (const item of sourceCatalog.packages) {
      if (item.name === entryManifest.name) continue;
      providerSources[item.name] = item.sourceDirectory;
    }
  }
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
  const optionalRuntimePackagesAbsent = new Set();
  try {
    async function include(name, destination, entry = false) {
      if (visited.has(name)) return;
      const record = index.get(name);
      if (!record) throw new Error(`runtime dependency ${name} has no explicitly admitted provider source`);
      visited.add(name);
      const normalizedManifest = structuredClone(record.manifest);
      const optionalDependencyNames = new Set(Object.keys(normalizedManifest.optionalDependencies ?? {}));
      for (const field of ["dependencies", "optionalDependencies", "peerDependencies"]) {
        if (!normalizedManifest[field]) continue;
        normalizedManifest[field] = Object.fromEntries(Object.keys(normalizedManifest[field]).sort().map((dependency) => {
          const provider = index.get(dependency);
          const optional = field === "optionalDependencies" || optionalDependencyNames.has(dependency)
            || (field === "peerDependencies" && normalizedManifest.peerDependenciesMeta?.[dependency]?.optional === true);
          if (!provider && optional) {
            optionalRuntimePackagesAbsent.add(dependency);
            return [dependency, normalizedManifest[field][dependency]];
          }
          if (!provider) throw new Error(`runtime dependency ${dependency} has no explicitly admitted provider source`);
          return [dependency, provider.manifest.version];
        }));
      }
      await copyPackage(record.directory, destination, normalizedManifest, entry);
      packages.push({ name, version: record.manifest.version });
      for (const { name: dependency, requested, optional } of runtimeDependencies(normalizedManifest)) {
        if (optional && !index.has(dependency)) continue;
        if (!EXACT_VERSION.test(requested ?? "")) throw new Error(`runtime dependency ${dependency} must use one exact provider version, received ${requested}`);
        const provider = index.get(dependency);
        if (provider && provider.manifest.version !== requested) throw new Error(`runtime dependency ${dependency} requested ${requested} but admitted provider is ${provider.manifest.version}`);
        await include(dependency, join(temporary, "app", "node_modules", ...dependency.split("/")));
      }
    }
    await include(entryManifest.name, join(temporary, "app"), true);
    packages.sort((left, right) => left.name.localeCompare(right.name));
    const unresolved = await unresolvedRuntimeImports(temporary, optionalRuntimePackagesAbsent);
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
      sourceCatalog: sourceCatalog?.id ?? null,
      optionalRuntimePackagesAbsent: [...optionalRuntimePackagesAbsent].sort(),
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
