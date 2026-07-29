import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { access, copyFile, cp, link, lstat, mkdir, mkdtemp, readFile, readdir, readlink, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { availableParallelism, tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
const PACKAGE_NAME = /^@[a-z0-9-]+\/[a-z0-9._-]+$/u;
const VERSION = /^\d+\.\d+\.\d+$/u;

function inside(root, candidate) {
  const displacement = relative(root, candidate);
  return displacement === "" || (displacement !== ".." && !displacement.startsWith(`..${sep}`));
}

async function exists(path) {
  try { await access(path); return true; } catch (error) { if (error?.code === "ENOENT") return false; throw error; }
}

function artifactNames(name, version) {
  const leaf = name.slice(name.indexOf("/") + 1);
  const scope = name.slice(1, name.indexOf("/"));
  return { leaf, relative: `tarballs/${scope}/${leaf}/-/${leaf}-${version}.tgz` };
}

function declaredOperationGraph(manifest) {
  const declarations = {};
  for (const field of ["x-semiotic-voxel", "x-agentic-metro-enterprise"]) {
    const declaration = manifest[field];
    if (declaration !== null && typeof declaration === "object" && !Array.isArray(declaration)) {
      declarations[field] = structuredClone(declaration);
    }
  }
  return declarations;
}

async function digest(path) {
  const bytes = await readFile(path);
  return {
    bytes: bytes.byteLength,
    shasum: createHash("sha1").update(bytes).digest("hex"),
    integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
  };
}

async function projectCarrier(source, target, manifest) {
  const instanceTerritories = [
    "/content/assets/legacy/",
    "/content/dispatches/",
    "/content/exchanges/",
    "/content/packets/",
    "/content/proposals/",
    "/content/requirement-events/",
    "/content/retired-carriers/",
    "/content/runtime/",
    "/content/tasks/",
  ];
  async function projectDirectory(from, to, root = false, relativePath = "") {
    await mkdir(to, { recursive: true });
    for (const entry of await readdir(from, { withFileTypes: true })) {
      if ([".git", "node_modules", "data", "test", "tests", "cache", ".tmp", ".archive"].includes(entry.name)) continue;
      const entryRelative = `${relativePath}/${entry.name}`;
      const framed = `${entryRelative}/`;
      if (instanceTerritories.some((territory) => framed.includes(territory))) continue;
      const sourcePath = join(from, entry.name);
      const targetPath = join(to, entry.name);
      if (entry.isDirectory()) {
        if (!root && await exists(join(sourcePath, "package.json"))) continue;
        await projectDirectory(sourcePath, targetPath, false, entryRelative);
      } else if (entry.isSymbolicLink()) {
        await symlink(await readlink(sourcePath), targetPath);
      } else if ((await lstat(sourcePath)).isFile()) {
        try { await link(sourcePath, targetPath); } catch (error) {
          if (error?.code !== "EXDEV") throw error;
          await copyFile(sourcePath, targetPath);
        }
      }
    }
  }
  await projectDirectory(source, target, true);
}

async function pack(directory, destination, manifest) {
  const working = await mkdtemp(join(destination, ".pack-"));
  const cache = await mkdtemp(join(tmpdir(), "semiotic-voxel-npm-cache-"));
  try {
    const projection = join(working, "carrier");
    await projectCarrier(directory, projection, manifest);
    const { stdout, stderr } = await execute("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", working], {
      cwd: projection,
      env: { ...process.env, npm_config_cache: cache, npm_config_update_notifier: "false", npm_config_loglevel: "error" },
      maxBuffer: 16 * 1024 * 1024,
    });
    const artifacts = (await readdir(working)).filter((entry) => entry.endsWith(".tgz"));
    if (artifacts.length !== 1) throw new Error(`npm pack artifact observation for ${directory} expected one .tgz, observed ${JSON.stringify({ artifacts, stdout, stderr })}`);
    const artifact = join(destination, `${randomUUID()}.tgz`);
    await rename(join(working, artifacts[0]), artifact);
    return artifact;
  } finally {
    await rm(working, { recursive: true, force: true });
    await rm(cache, { recursive: true, force: true });
  }
}

async function procureComputeLease({ computeMarket, packageCount, concurrency }) {
  const maximumParallelism = concurrency ?? Math.min(availableParallelism(), 32);
  if (!Number.isInteger(maximumParallelism) || maximumParallelism < 1 || maximumParallelism > 32) {
    throw new TypeError("concurrency must be an integer from 1 through 32");
  }
  if (!computeMarket) {
    return Object.freeze({
      provider: "urn:provider:local-node-process",
      parallelism: maximumParallelism,
      settlement: { type: "SelfSuppliedComputeCapacity", measuredAvailableParallelism: availableParallelism() },
    });
  }
  if (typeof computeMarket.procure !== "function") throw new TypeError("computeMarket.procure must be a function");
  const lease = await computeMarket.procure(Object.freeze({
    type: "ComputeCapacityDemand",
    resource: "cpu-process-slot",
    taskClass: "npm-package-artifact-fabrication",
    workUnits: packageCount,
    maximumParallelism,
  }));
  if (!Number.isInteger(lease?.parallelism) || lease.parallelism < 1 || lease.parallelism > maximumParallelism) {
    throw new Error("compute market returned an invalid parallelism lease");
  }
  if (typeof lease.provider !== "string" || !lease.provider || !lease.settlement) {
    throw new Error("compute market returned an unowned or unsettled lease");
  }
  return lease;
}

export async function fabricatePackageRegistry({ packageDirectories, outputDirectory, registryUrl, baseRegistryDirectory, concurrency, computeMarket }) {
  const base = new URL(registryUrl);
  if (!/^https?:$/u.test(base.protocol)) throw new TypeError("registryUrl must be absolute HTTP(S)");
  const output = resolve(outputDirectory);
  await mkdir(output, { recursive: true });
  if ((await readdir(output)).length) throw new Error("registry artifact territory must be empty");
  const baseRegistry = baseRegistryDirectory === undefined ? null : resolve(baseRegistryDirectory);
  if (baseRegistry === output) throw new Error("base registry and output registry must be different territories");
  const packages = [];
  for (const source of packageDirectories) {
    const directory = resolve(source);
    const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
    if (!PACKAGE_NAME.test(manifest.name ?? "") || manifest.name.startsWith("@emsenn/")) throw new Error(`package identity is not sovereign: ${manifest.name ?? directory}`);
    if (!VERSION.test(manifest.version ?? "")) throw new Error(`package version is not exact: ${manifest.name}`);
    if (manifest["x-semiotic-voxel"]?.package !== manifest.name) throw new Error(`package is not a declared semiotic voxel: ${manifest.name}`);
    packages.push({ directory, manifest });
  }
  const collisions = Object.entries(Object.groupBy(packages, ({ manifest }) => `${manifest.name}@${manifest.version}`)).filter(([, rows]) => rows.length > 1);
  if (collisions.length) throw new Error(`duplicate package versions: ${collisions.map(([identity]) => identity).join(", ")}`);
  packages.sort((left, right) => left.manifest.name.localeCompare(right.manifest.name));
  const computeLease = await procureComputeLease({ computeMarket, packageCount: packages.length, concurrency });
  let leaseReleased = false;
  async function releaseComputeLease() {
    if (leaseReleased) return;
    leaseReleased = true;
    if (typeof computeLease.release === "function") await computeLease.release();
  }
  const staging = await mkdtemp(join(output, ".fabricating-"));
  const baseReceipt = baseRegistry === null ? null : JSON.parse(await readFile(join(baseRegistry, "registry-receipt.json"), "utf8"));
  const entries = baseReceipt === null ? [] : structuredClone(baseReceipt.packages ?? []);
  try {
    if (baseRegistry !== null) {
      for (const entry of await readdir(baseRegistry)) await cp(join(baseRegistry, entry), join(staging, entry), { recursive: true, errorOnExist: true, force: false });
    }
    let nextPackage = 0;
    async function fabricateNext() {
      while (nextPackage < packages.length) {
        const { directory, manifest } = packages[nextPackage++];
      const temporaryArtifact = await pack(directory, staging, manifest);
      const names = artifactNames(manifest.name, manifest.version);
      const target = join(staging, names.relative);
      await mkdir(dirname(target), { recursive: true });
      await rename(temporaryArtifact, target);
      const measured = await digest(target);
      const tarball = new URL(names.relative, base).href;
      const versionMetadata = {
        ...manifest,
        dist: { tarball, shasum: measured.shasum, integrity: measured.integrity },
      };
      const metadataPath = join(staging, "metadata", `${encodeURIComponent(manifest.name)}.json`);
      const priorMetadata = await exists(metadataPath) ? JSON.parse(await readFile(metadataPath, "utf8")) : null;
      const priorVersion = priorMetadata?.versions?.[manifest.version];
      if (priorVersion && priorVersion.dist?.integrity !== measured.integrity) throw new Error(`package release collision: ${manifest.name}@${manifest.version}`);
      const metadata = {
        _id: manifest.name,
        name: manifest.name,
        "dist-tags": { latest: manifest.version },
        versions: { ...(priorMetadata?.versions ?? {}), [manifest.version]: versionMetadata },
      };
      await mkdir(dirname(metadataPath), { recursive: true });
      await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
      const priorEntry = entries.findIndex((entry) => entry.name === manifest.name && entry.version === manifest.version);
      if (priorEntry >= 0) entries.splice(priorEntry, 1);
      entries.push({
        name: manifest.name,
        version: manifest.version,
        tarball,
        artifact: names.relative,
        ...measured,
        ...declaredOperationGraph(manifest),
      });
      }
    }
    await Promise.all(Array.from({ length: Math.min(computeLease.parallelism, packages.length) }, () => fabricateNext()));
    entries.sort((left, right) => left.name.localeCompare(right.name));
    const scopes = [...new Set(entries.map(({ name }) => name.slice(1, name.indexOf("/"))))].sort();
    const npmrc = [`registry=https://registry.npmjs.org/`, ...scopes.map((scope) => `@${scope}:registry=${base.href}`), ""].join("\n");
    await writeFile(join(staging, "client.npmrc"), npmrc);
    const receipt = {
      type: "SemioticVoxelPackageRegistryReceipt",
      version: 2,
      registry: base.href,
      packages: entries,
      scopes,
      compute: {
        provider: computeLease.provider,
        parallelism: computeLease.parallelism,
        settlement: computeLease.settlement,
      },
    };
    await writeFile(join(staging, "registry-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
    for (const entry of await readdir(staging)) await rename(join(staging, entry), join(output, entry));
    await rm(staging, { recursive: true, force: true });
    await releaseComputeLease();
    return receipt;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    await releaseComputeLease();
    throw error;
  }
}

function contentType(path) {
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".tgz")) return "application/octet-stream";
  return "text/plain; charset=utf-8";
}

export function createPackageRegistryServer({ registryDirectory }) {
  const root = resolve(registryDirectory);
  return createServer(async (request, response) => {
    try {
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { allow: "GET, HEAD" }).end();
        return;
      }
      const url = new URL(request.url ?? "/", "http://registry.invalid");
      const target = await resolvePackageRegistryRequest({ registryDirectory: root, requestPath: url.pathname });
      if (!target) {
        response.writeHead(404, { "content-type": "application/json" }).end('{"error":"not_found"}\n');
        return;
      }
      const type = contentType(target);
      if (type === "application/json" && decodeURIComponent(url.pathname).startsWith("/@")) {
        const metadata = rewriteMetadataTarballOrigins(JSON.parse(await readFile(target, "utf8")), new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`).origin);
        const body = Buffer.from(`${JSON.stringify(metadata)}\n`, "utf8");
        response.writeHead(200, { "content-type": type, "content-length": body.byteLength, "cache-control": "no-cache" });
        response.end(request.method === "HEAD" ? undefined : body);
        return;
      }
      response.writeHead(200, { "content-type": type, "content-length": (await stat(target)).size, "cache-control": "public, immutable" });
      if (request.method === "HEAD") response.end();
      else createReadStream(target).pipe(response);
    } catch (error) {
      response.writeHead(500, { "content-type": "application/json" }).end(`${JSON.stringify({ error: error.message })}\n`);
    }
  });
}

export function rewriteMetadataTarballOrigins(metadata, origin) {
  const rewritten = structuredClone(metadata);
  for (const version of Object.values(rewritten.versions ?? {})) {
    if (typeof version?.dist?.tarball === "string") {
      const artifact = new URL(version.dist.tarball).pathname;
      version.dist.tarball = new URL(artifact, origin).href;
    }
  }
  return rewritten;
}

export async function resolvePackageRegistryRequest({ registryDirectory, requestPath }) {
  const root = resolve(registryDirectory);
  const decoded = decodeURIComponent(requestPath.replace(/^\/+/, ""));
  const target = decoded.startsWith("@") && !decoded.includes(".tgz")
    ? join(root, "metadata", `${encodeURIComponent(decoded)}.json`)
    : resolve(root, decoded);
  if (!inside(root, target) || !(await exists(target)) || !(await stat(target)).isFile()) return null;
  return target;
}
