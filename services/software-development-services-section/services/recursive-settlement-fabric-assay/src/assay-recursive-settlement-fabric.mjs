#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { parseRml } from "@red-cup-engineering/rmn-semantic-conformance";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";
import { circuitInterfaceFromAgentCard, hierarchicalCircuitId, verifyCircuitRealization } from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { loadSettlementAccount } from "@lenticule-science/rwil-rdf-projection-service/client";

export const RECURSIVE_SETTLEMENT_FABRIC_PROFILE = "org.emsenn.sdss.recursive-settlement-fabric.v1";
const SKIP = new Set([".git", "node_modules", "content", "data", "src", "test", "tests", "assets", "_archive"]);
const bytewise = (left, right) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
const portable = (root, path) => relative(root, path).split(sep).join("/") || ".";

function manifestAt(root) {
  const path = join(root, "package.json");
  if (!existsSync(path)) return { kind: "absent" };
  try {
    const value = JSON.parse(readFileSync(path, "utf8"));
    if (typeof value?.["x-agentic-metro-enterprise"]?.["node-id"] !== "string" || value["x-agentic-metro-enterprise"]["node-id"].length === 0) return { kind: "invalid", message: "package.json does not declare one nonempty x-agentic-metro-enterprise.node-id" };
    return { kind: "settlement", value };
  } catch (error) { return { kind: "invalid", message: `package.json is unreadable or malformed: ${error instanceof Error ? error.message : String(error)}` }; }
}

function discoverRoots(territoryRoot) {
  const roots = [], violations = [];
  const visit = (path) => {
    const manifest = manifestAt(path);
    if (manifest.kind === "settlement") roots.push({ root: path, manifest: manifest.value });
    if (manifest.kind === "invalid") violations.push({ path: portable(territoryRoot, path), code: "invalid-settlement-manifest", message: manifest.message });
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => bytewise(a.name, b.name))) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || SKIP.has(entry.name)) continue;
      visit(join(path, entry.name));
    }
  };
  visit(territoryRoot);
  return { roots: roots.sort((a, b) => bytewise(a.root, b.root)), violations };
}

function nearestParent(entry, entries) {
  return entries.filter((candidate) => candidate !== entry && entry.root.startsWith(`${candidate.root}${sep}`)).sort((a, b) => b.root.length - a.root.length)[0] ?? null;
}

function files(root, directoryName, suffix) {
  const directory = join(root, "content", directoryName);
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isFile() && !entry.isSymbolicLink() && entry.name.endsWith(suffix)).map((entry) => join(directory, entry.name)).sort(bytewise);
}

function readInterface(entry, violations, territoryRoot) {
  const paths = files(entry.root, "agent-cards", ".json");
  if (paths.length !== 1) {
    violations.push({ path: portable(territoryRoot, entry.root), code: "public-interface-cardinality", message: `a settlement must expose exactly one public Agent Card; found ${paths.length}` });
    return null;
  }
  try { return circuitInterfaceFromAgentCard(JSON.parse(readFileSync(paths[0], "utf8"))); }
  catch (error) {
    violations.push({ path: portable(territoryRoot, paths[0]), code: error?.code ?? "malformed-public-interface", message: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

function readLaws(entry, violations, territoryRoot) {
  const laws = [];
  for (const path of files(entry.root, "contracts", ".rml")) {
    try { laws.push({ path, law: compileRmlLaw(readFileSync(path, "utf8")) }); }
    catch (error) { violations.push({ path: portable(territoryRoot, path), code: "malformed-law", message: error instanceof Error ? error.message : String(error) }); }
  }
  return laws;
}

function readContractedFamily(entry, violations, territoryRoot, lawIds) {
  const path = join(entry.root, "content", "circuits", "family.rml");
  if (!existsSync(path)) {
    violations.push({ path: portable(territoryRoot, entry.root), code: "unfabricated-contracted-board", message: "a contracted circuit board must carry content/circuits/family.rml" });
    return null;
  }
  try {
    const value = parseRml(readFileSync(path, "utf8"));
    const roles = value?.providerRoles;
    if (value?.profile !== "org.emsenn.rmn.contracted-circuit-family.v1" || value.law !== lawIds[0] || !Array.isArray(roles) || roles.length === 0 || roles.some((role) => typeof role !== "string" || role.length === 0) || new Set(roles).size !== roles.length || value.synthesisRequired !== true || value.independentEquivalenceRequired !== true || value.localMaterialAccess !== false) throw new Error("contracted circuit family profile, law, provider roles, synthesis, equivalence, or material boundary is malformed");
    return { realized: "per-contract", profile: value.profile, providerRoles: roles };
  } catch (error) {
    violations.push({ path: portable(territoryRoot, path), code: "invalid-contracted-circuit-family", message: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

const membraneOf = (value) => ({ account: value.account, authority: value.authority, custody: value.custody, territory: value.territory });
const sameMembrane = (left, right) => left.account === right.account && left.authority === right.authority && left.custody === right.custody && left.territory === right.territory;

export function assayRecursiveSettlementFabric(territoryRoot) {
  if (typeof territoryRoot !== "string" || territoryRoot.length === 0) throw new TypeError("territoryRoot must be an explicit filesystem path");
  const territory = resolve(territoryRoot), stat = lstatSync(territory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new TypeError("territoryRoot must be a real directory");
  const discovered = discoverRoots(territory), entries = discovered.roots, violations = [...discovered.violations];
  for (const entry of entries) entry.parent = nearestParent(entry, entries);
  for (const entry of entries) entry.children = entries.filter((candidate) => candidate.parent === entry);
  for (const entry of entries) {
    entry.interface = readInterface(entry, violations, territory);
    entry.laws = readLaws(entry, violations, territory);
    try { entry.account = loadSettlementAccount(entry.root); }
    catch (error) {
      entry.account = null;
      violations.push({ path: portable(territory, entry.root), code: "missing-smart-account", message: error instanceof Error ? error.message : String(error) });
    }
  }

  const settlements = [];
  for (const entry of entries) {
    const path = portable(territory, entry.root), declaration = entry.manifest["x-agentic-metro-enterprise"], nodeId = declaration["node-id"];
    const contractedBoard = entry.children.length === 0 && declaration["organizational-kind"] === "circuit-board-nation";
    const kind = entry.children.length === 0 && !contractedBoard ? "die" : "board", composition = contractedBoard ? "contracted" : kind === "board" ? "owned" : "irreducible";
    const operations = declaration["operation-catalog"];
    if (kind === "die") {
      const operationEntries = operations && Object.getPrototypeOf(operations) === Object.prototype ? Object.entries(operations) : [];
      if (operationEntries.length !== 1) violations.push({ path, code: "die-operation-cardinality", message: `one irreducible die must advertise exactly one independently contractable operation; found ${operationEntries.length}` });
    }
    const lawIds = [...new Set(entry.laws.map(({ law }) => law.id))];
    if (lawIds.length !== 1) violations.push({ path, code: "mixed-law-settlement", message: `one die boundary must enact exactly one RMN law; found ${lawIds.length}` });
    if (entry.interface && lawIds.length === 1 && entry.interface.component.law !== lawIds[0]) violations.push({ path, code: "boundary-law-mismatch", message: "the public circuit law is not the settlement's sole RMN law" });
    if (entry.account && entry.interface && entry.account.settlement !== entry.interface.account) violations.push({ path, code: "boundary-account-mismatch", message: "the public circuit account differs from the settlement's ERC-4337 binding" });
    if (entry.account && entry.manifest["x-agentic-metro-enterprise"].actor !== entry.account.actor) violations.push({ path, code: "boundary-actor-mismatch", message: "the settlement actor differs from its ERC-4337 binding" });

    let realization = contractedBoard ? readContractedFamily(entry, violations, territory, lawIds) : null;
    const implementationPath = join(entry.root, "content", "circuits", "implementation.rml"), assemblyPath = join(entry.root, "content", "circuits", "assembly.rml");
    if (kind === "die") {
      if (existsSync(implementationPath) || existsSync(assemblyPath)) violations.push({ path, code: "leaf-carries-board-material", message: "a die cannot carry a board implementation or assembly" });
    } else if (!contractedBoard && (!existsSync(implementationPath) || !existsSync(assemblyPath))) {
      violations.push({ path, code: "unfabricated-board", message: "a settlement containing child settlements must carry content/circuits/implementation.rml and assembly.rml" });
    } else if (!contractedBoard && entry.interface && entry.children.every((child) => child.interface)) {
      try {
        const circuit = parseRml(readFileSync(implementationPath, "utf8")), assembly = parseRml(readFileSync(assemblyPath, "utf8"));
        const distinctComponents = new Map(entry.children.map((child) => [hierarchicalCircuitId(child.interface.component), child.interface.component]));
        realization = verifyCircuitRealization({ interface: entry.interface.component, circuit, components: [...distinctComponents.values()], assembly });
        const rootPlacement = assembly.placements?.find((placement) => Array.isArray(placement.address) && placement.address.length === 0);
        if (!rootPlacement || !sameMembrane(rootPlacement.membrane, membraneOf(entry.interface))) throw Object.assign(new Error("board root placement does not equal its public membrane"), { code: "root-placement-mismatch" });
        const childMembranes = entry.children.map((child) => membraneOf(child.interface));
        const directPlacements = assembly.placements?.filter((placement) => Array.isArray(placement.address) && placement.address.length === 1).map(({ membrane }) => membrane) ?? [];
        if (directPlacements.length !== childMembranes.length || childMembranes.some((wanted) => directPlacements.filter((candidate) => sameMembrane(candidate, wanted)).length !== 1)) throw Object.assign(new Error("board assembly must place every direct child settlement exactly once"), { code: "child-placement-mismatch" });
      } catch (error) { violations.push({ path, code: error?.code ?? "invalid-board-realization", message: error instanceof Error ? error.message : String(error) }); }
    }
    settlements.push({ path, nodeId, kind, composition, children: entry.children.map((child) => child.manifest["x-agentic-metro-enterprise"]["node-id"]).sort(bytewise), laws: lawIds.sort(bytewise), account: entry.account?.settlement ?? null, interface: entry.interface ? hierarchicalCircuitId(entry.interface.component) : null, realization });
  }
  violations.sort((a, b) => bytewise(a.path, b.path) || bytewise(a.code, b.code));
  const frontier = [...new Set(violations.map(({ path }) => path))].sort((a, b) => b.split("/").length - a.split("/").length || bytewise(a, b));
  return { profile: RECURSIVE_SETTLEMENT_FABRIC_PROFILE, territory, settlementCount: settlements.length, conforming: violations.length === 0, settlements, violations, frontier };
}

function main() {
  const enforce = process.argv.includes("--enforce"), root = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
  if (!root) throw new TypeError("usage: verify-recursive-settlement-fabric <territory-root> [--enforce]");
  const result = assayRecursiveSettlementFabric(root);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (enforce && !result.conforming) process.exitCode = 1;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
