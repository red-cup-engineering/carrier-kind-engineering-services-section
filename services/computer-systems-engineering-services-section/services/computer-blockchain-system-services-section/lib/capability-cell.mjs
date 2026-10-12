import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const REQUIRED = Object.freeze({
  repo: [".git"],
  law: ["content/contracts"],
  schema: ["content/schemas"],
  executable: ["bin"],
  account: ["content/evm/accounts"],
  agentCard: ["content/agent-cards"],
  offer: ["content/offers"],
  deployment: ["ops"],
  tests: ["test"],
  book: ["data"]
});

function populated(path) {
  if (!existsSync(path)) return false;
  try { return readdirSync(path).length > 0; } catch { return true; }
}

export function assayBlockchainCapabilityCell(root) {
  const territory = resolve(root);
  const manifestPath = join(territory, "package.json");
  let manifest = null;
  try { manifest = JSON.parse(readFileSync(manifestPath, "utf8")); } catch {}
  const enterprise = manifest?.["x-agentic-metro-enterprise"];
  const operations = Object.keys(enterprise?.["operation-catalog"] ?? {});
  const organs = { package: manifest !== null };
  for (const [organ, candidates] of Object.entries(REQUIRED)) {
    organs[organ] = candidates.some((candidate) => populated(join(territory, candidate)));
  }
  const defects = [
    ...(typeof enterprise?.["node-id"] === "string" && enterprise["node-id"] ? [] : ["missing-node-id"]),
    ...(typeof enterprise?.actor === "string" && enterprise.actor.startsWith("urn:") ? [] : ["missing-actor"]),
    ...(operations.length === 1 ? [] : [`capability-count-${operations.length}`]),
    ...Object.entries(organs).flatMap(([organ, present]) => present ? [] : [`missing-${organ}`])
  ];
  return Object.freeze({
    type: "BlockchainCapabilityCellAssay",
    territory,
    nodeId: enterprise?.["node-id"] ?? null,
    actor: enterprise?.actor ?? null,
    capability: operations[0] ?? null,
    organs,
    defects,
    disposition: defects.length === 0 ? "admitted" : "cut-required"
  });
}

/** Discover only cells that explicitly carry the section's capcell manifest.
 * A package directory alone is not evidence that a fragment claims admission. */
export function discoverBlockchainCapabilityCells(sectionRoot) {
  const services = join(resolve(sectionRoot), "services");
  if (!existsSync(services)) return Object.freeze([]);
  const roots = [];
  function visit(directory) {
    if (existsSync(join(directory, "content/capcell/manifest.json"))) {
      roots.push(directory);
      return;
    }
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && ![".git", "data", "node_modules"].includes(entry.name)) visit(join(directory, entry.name));
    }
  }
  visit(services);
  return Object.freeze(roots.sort());
}
