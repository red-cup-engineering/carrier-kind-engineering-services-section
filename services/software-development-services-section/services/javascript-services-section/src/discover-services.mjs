import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const readManifest = (root) => {
  const path = join(root, "package.json");
  if (!existsSync(path)) return { kind: "missing", path };
  try {
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    const nodeId = manifest?.["x-agentic-metro-enterprise"]?.["node-id"];
    if (typeof nodeId !== "string" || !nodeId) return { kind: "invalid", path, reason: "missing x-agentic-metro-enterprise.node-id" };
    const operations = manifest?.["x-semiotic-voxel"]?.operations;
    if (!Array.isArray(operations) || operations.length !== 1 || typeof operations[0] !== "string" || operations[0] === "") {
      return { kind: "invalid", path, reason: "direct JSNode actuator must declare exactly one named x-semiotic-voxel operation" };
    }
    return { kind: "settlement", path, manifest, nodeId };
  } catch (error) {
    return { kind: "invalid", path, reason: error instanceof Error ? error.message : String(error) };
  }
};

/** Discover only the direct child service membranes of this JSNode section. */
export function discoverJsnodeServices(sectionRoot) {
  if (typeof sectionRoot !== "string" || !sectionRoot) throw new TypeError("sectionRoot must be an explicit path");
  const root = resolve(sectionRoot), servicesRoot = join(root, "services");
  if (!existsSync(servicesRoot)) return { sectionRoot: root, services: [], refusals: [{ code: "missing-services-root" }] };
  const services = [], refusals = [];
  for (const entry of readdirSync(servicesRoot, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || entry.name === "node_modules") continue;
    const childRoot = join(servicesRoot, entry.name), result = readManifest(childRoot);
    if (result.kind === "settlement") services.push({ directory: entry.name, nodeId: result.nodeId, package: result.manifest.name ?? null, root: childRoot });
    else refusals.push({ directory: entry.name, ...result });
  }
  const byNodeId = new Map();
  for (const service of services) {
    const prior = byNodeId.get(service.nodeId);
    if (prior) refusals.push({ code: "duplicate-node-id", nodeId: service.nodeId, directories: [prior.directory, service.directory] });
    else byNodeId.set(service.nodeId, service);
  }
  return { sectionRoot: root, services, refusals };
}
