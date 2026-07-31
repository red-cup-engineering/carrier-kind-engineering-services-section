import { access, lstat, readFile, readdir, readlink } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

const PROFILE = "org.harmonious-union.semiotic-voxel.v1";
const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
const SKIP_DIRECTORY = new Set([".git", ".archive", ".cache", ".venv", "build", "dist", "venv"]);
const DESCRIPTOR_FIELDS = Object.freeze(["actor", "capabilities", "kind", "operations", "owner", "package", "profile"]);
const CAPABILITY_FIELDS = Object.freeze(["capability", "faces"]);
const PACKAGE_KINDS = new Set(["actor", "aggregate-capability-defect", "capability-cell", "inert-material"]);

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactFields(value, fields) {
  return Object.keys(value).sort().join(",") === fields.join(",");
}

function uniqueNonemptyStrings(value) {
  return Array.isArray(value)
    && value.every((item) => typeof item === "string" && item.length > 0)
    && new Set(value).size === value.length;
}

/**
 * `x-semiotic-voxel` is package/deployment manifest metadata. Its exact shape
 * keeps it mechanically distinct from a network SemioticAtom, Mark, Utterance,
 * ArticulationCell, or the active-only voxel reconstructed by an invocation.
 */
export function semioticVoxelPackageDescriptorViolations(manifest) {
  const descriptor = manifest?.["x-semiotic-voxel"];
  if (!record(descriptor)) return Object.freeze(["descriptor-object"]);
  const violations = [];
  if (!hasExactFields(descriptor, DESCRIPTOR_FIELDS)) violations.push("descriptor-fields");
  if (descriptor.profile !== PROFILE) violations.push("profile");
  if (typeof descriptor.owner !== "string" || descriptor.owner.length === 0) violations.push("owner");
  if (!PACKAGE_KINDS.has(descriptor.kind)) violations.push("kind");
  if (typeof descriptor.actor !== "string" || descriptor.actor.length === 0) violations.push("actor");
  if (!uniqueNonemptyStrings(descriptor.operations)) violations.push("operations");
  if (!Array.isArray(descriptor.capabilities)
      || descriptor.capabilities.some((capability) => !record(capability)
        || !hasExactFields(capability, CAPABILITY_FIELDS)
        || typeof capability.capability !== "string"
        || capability.capability.length === 0
        || !uniqueNonemptyStrings(capability.faces))
      || new Set(descriptor.capabilities.map((capability) => capability.capability)).size !== descriptor.capabilities.length) {
    violations.push("capabilities");
  }
  if (descriptor.package !== manifest?.name) violations.push("package");
  return Object.freeze(violations);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function inside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== "..");
}

function excludedTerritory(path) {
  const framed = `/${path.replaceAll("\\", "/")}/`;
  return framed.includes("/content/assets/legacy/")
    || framed.includes("/src/content/assets/legacy/")
    || framed.includes("/data/runtime-images/")
    || framed.includes("/dev/content/triage/prior-app/");
}

async function packageBodyInventory(root) {
  const inventory = { manifests: [], workspaces: [], pnpmLocks: [], packageLocks: [], crossInstallLinks: [] };
  async function inspectInstallEntry(installRoot, absolute, path) {
    if (!(await lstat(absolute)).isSymbolicLink()) return;
    const target = resolve(dirname(absolute), await readlink(absolute));
    if (!inside(installRoot, target)) inventory.crossInstallLinks.push({ path, target });
  }
  async function inspectInstallRoot(absolute, path) {
    for (const entry of await readdir(absolute, { withFileTypes: true })) {
      const entryAbsolute = join(absolute, entry.name);
      const entryPath = `${path}/${entry.name}`;
      if (entry.name.startsWith("@") && entry.isDirectory()) {
        for (const child of await readdir(entryAbsolute, { withFileTypes: true })) await inspectInstallEntry(absolute, join(entryAbsolute, child.name), `${entryPath}/${child.name}`);
      } else await inspectInstallEntry(absolute, entryAbsolute, entryPath);
    }
  }
  async function visit(absolute, path) {
    for (const entry of await readdir(absolute, { withFileTypes: true })) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;
      if (excludedTerritory(entryPath)) continue;
      const entryAbsolute = join(absolute, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRECTORY.has(entry.name)) continue;
        if (entry.name === "node_modules") await inspectInstallRoot(entryAbsolute, entryPath);
        else await visit(entryAbsolute, entryPath);
      } else if (entry.name === "package.json") inventory.manifests.push(entryPath);
      else if (entry.name === "pnpm-workspace.yaml") inventory.workspaces.push(entryPath);
      else if (entry.name === "pnpm-lock.yaml") inventory.pnpmLocks.push(entryPath);
      else if (entry.name === "package-lock.json") inventory.packageLocks.push(entryPath);
    }
  }
  await visit(resolve(root, "lib/emsenn/services"), "lib/emsenn/services");
  for (const values of Object.values(inventory)) if (Array.isArray(values)) values.sort((left, right) => String(left.path ?? left).localeCompare(String(right.path ?? right)));
  return inventory;
}

export async function assaySemioticVoxelPackageBody({ root = process.cwd() } = {}) {
  const absoluteRoot = resolve(root);
  const defects = [];
  if (await exists(resolve(absoluteRoot, "package.json"))) defects.push({ law: "root-is-territory", path: "package.json" });
  if (await exists(resolve(absoluteRoot, "node_modules"))) defects.push({ law: "no-root-install-authority", path: "node_modules" });
  const inventory = await packageBodyInventory(absoluteRoot);
  for (const path of inventory.workspaces) defects.push({ law: "no-workspace-authority", path });
  for (const path of inventory.pnpmLocks) defects.push({ law: "no-federated-lock", path });
  for (const path of inventory.packageLocks) defects.push({ law: "no-ambient-install-lock", path });
  let carriers = 0;
  for (const path of inventory.manifests) {
    const manifest = JSON.parse(await readFile(resolve(absoluteRoot, path), "utf8"));
    if (typeof manifest.name !== "string" || manifest.name.length === 0) continue;
    carriers += 1;
    if (!/^@[a-z0-9-]+\/[a-z0-9._-]+$/u.test(manifest.name) || manifest.name.startsWith("@emsenn/")) defects.push({ law: "sovereign-owner-identity", path, package: manifest.name });
    const descriptorViolations = semioticVoxelPackageDescriptorViolations(manifest);
    if (descriptorViolations.length) defects.push({
      law: "package-deployment-carrier-descriptor",
      path,
      package: manifest.name,
      violations: descriptorViolations,
    });
    for (const field of DEPENDENCY_FIELDS) {
      for (const [dependency, value] of Object.entries(manifest[field] ?? {})) {
        if (dependency.startsWith("@emsenn/")) defects.push({ law: "sovereign-provider-identity", path, field, dependency });
        if (typeof value === "string" && /^(?:workspace:|file:|link:)/u.test(value)) defects.push({ law: "no-local-provider-protocol", path, field, dependency, value });
      }
    }
  }
  for (const link of inventory.crossInstallLinks) defects.push({ law: "no-cross-package-install-symlink", ...link });
  const receipt = Object.freeze({ type: "SemioticVoxelPackageBodyConformanceReceipt", version: 1, conformant: defects.length === 0, carriers, defects });
  if (defects.length) throw Object.assign(new Error(`semiotic voxel package body refused: ${defects.length} defect(s)`), { receipt });
  return receipt;
}
