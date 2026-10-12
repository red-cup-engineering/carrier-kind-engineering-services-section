

import {
  dependencyGraphCarrier,
  resolutionCarrier,
  workspaceCarrier,

} from "./host-neutral-carriers.mjs";
import { dependencyCycles } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/causal";
import { coverNerve, h1Rank } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/coordination-cohomology";
import { createGraph, topologicalTiers, weaklyConnectedComponents } from "@red-cup-engineering/metrologic/models/graphs/directed-multigraph";

function yamlScalar(value) {
  const trimmed = value.trim();
  return trimmed.replace(/^["']|["']$/gu, "");
}

export function decodePnpmWorkspace(text, manifests = [], id = "workspace") {
  const packages = new Set();
  const lines = text.split(/\r?\n/u);
  let inPackages = false;
  for (const raw of lines) {
    const line = raw.replace(/\s+#.*$/u, "");
    if (/^\s*packages\s*:\s*$/u.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages && /^\S/u.test(line)) inPackages = false;
    if (!inPackages) continue;
    const match = /^\s*-\s*(.+?)\s*$/u.exec(line);
    if (match?.[1] !== undefined) packages.add(yamlScalar(match[1]));
  }
  const members = manifests.map((entry) => ({
    name: entry.manifest.name,
    manifest: entry.manifest.name,
    locator: entry.locator,
    packageManager: "pnpm",
  }));
  return workspaceCarrier.assert({
    kind: "organizing.workspace-carrier",
    id,
    packageManager: "pnpm",
    members: Object.freeze(members.sort((a, b) => a.name.localeCompare(b.name))),
    mediaType: "application/vnd.pnpm.workspace+yaml",
    ...(packages.size === 0 ? {} : { name: [...packages].sort().join(";") }),
  }, "pnpm-workspace.yaml");
}

export function encodePnpmWorkspace(workspace) {
  const locators = workspace.members.map((member) => member.locator).filter((value) => value !== undefined);
  const patterns = locators.length === 0 ? workspace.members.map((member) => member.name) : locators;
  return `packages:\n${[...new Set(patterns)].sort((a, b) => a.localeCompare(b)).map((pattern) => `  - ${JSON.stringify(pattern)}`).join("\n")}\n`;
}

export function decodePnpmLock(text, manifests = []) {
  const workspaceNames = new Set(manifests.map((manifest) => manifest.name));
  const decisions = Object.freeze(manifests.flatMap((manifest) =>
    manifest.dependencies.map((dep) => ({
      requester: manifest.name,
      dependency: dep.name,
      selected: dep.protocol === "workspace" || workspaceNames.has(dep.name) ? dep.name : `${dep.name}@${dep.range ?? "unresolved"}`,
      ...(dep.range === undefined ? {} : { range: dep.range }),
      reason: dep.protocol === "workspace" || workspaceNames.has(dep.name)
        ? "workspace"
        : lockMentions(text, dep.name, dep.range) ? "lockfile" : "unresolved",
    }))));
  const unresolved = decisions.filter((decision) => decision.reason === "unresolved").map((decision) => `${decision.requester}:${decision.dependency}`);
  const conflicts = dependencyConflicts(decisions);
  return resolutionCarrier.assert({
    kind: "organizing.resolution",
    decisions,
    unresolved: Object.freeze(unresolved.sort((a, b) => a.localeCompare(b))),
    conflicts,
    h1: conflicts.length,
  }, "pnpm-lock.yaml resolution");
}

export function encodePnpmLockResolution(resolution) {
  return `${JSON.stringify({
    kind: resolution.kind,
    decisions: resolution.decisions,
    unresolved: resolution.unresolved,
    conflicts: resolution.conflicts,
    h1: resolution.h1,
  }, null, 2)}\n`;
}

export function dependencyGraphFromManifests(manifests, resolution) {
  const workspaceNames = new Set(manifests.map((manifest) => manifest.name));
  const resolutionByRequest = new Map();
  for (const decision of resolution?.decisions ?? []) {
    resolutionByRequest.set(`${decision.requester}\0${decision.dependency}`, decision.selected);
  }
  const nodes = manifests.map((manifest) => ({
    id: manifest.name,
    manifest: manifest.name,
    workspaceMember: true,
  }));
  const edges = [];
  for (const manifest of manifests) {
    for (const dep of manifest.dependencies) {
      if (!workspaceNames.has(dep.name)) continue;
      edges.push(Object.freeze({
        from: manifest.name,
        to: dep.name,
        relationship: dep.relationship,
        ...(dep.range === undefined ? {} : { range: dep.range }),
        ...(resolutionByRequest.has(`${manifest.name}\0${dep.name}`) ? { resolvedBy: resolutionByRequest.get(`${manifest.name}\0${dep.name}`) } : {}),
      }));
    }
  }
  const graph = {
    kind: "organizing.dependency-graph",
    nodes: Object.freeze(nodes.sort((a, b) => a.id.localeCompare(b.id))),
    edges: Object.freeze(edges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to))),
    cycles: dependencyCycles(nodes.map((node) => node.id), edges),
  };
  return dependencyGraphCarrier.assert(graph, "workspace dependency graph");
}

/** The dependency graph's edges between its members, each run from provider to dependent. */
function providerGraph(graph) {
  const members = new Set(graph.nodes.map(({ id }) => id));
  const edges = graph.edges.filter(({ from, to }) => members.has(from) && members.has(to));
  return { members, edges, graph: createGraph({ nodes: [...members].map((id) => ({ id })), edges: edges.map(({ from, to }) => ({ from: to, to: from })) }) };
}

/** The members in tiers, each tier's providers all in earlier tiers; members on a cycle are left out. */
export function topologicalSortDependencyGraph(graph) {
  const { tiers } = topologicalTiers(providerGraph(graph).graph);
  return Object.freeze(tiers.map((tier) => Object.freeze([...tier].sort((left, right) => left.localeCompare(right)))));
}

/** The dependency graph's cycle rank |E| - |V| + |C|: how many dependencies close a loop. */
export function dependencyGraphH1(graph) {
  const provider = providerGraph(graph);
  return h1Rank(coverNerve(provider.members.size, provider.edges.length, weaklyConnectedComponents(provider.graph).length));
}

function dependencyConflicts(decisions) {
  const byDependency = new Map();
  for (const decision of decisions) {
    const byCandidate = byDependency.get(decision.dependency) ?? new Map();
    const requesters = byCandidate.get(decision.selected) ?? [];
    requesters.push(decision.requester);
    byCandidate.set(decision.selected, requesters);
    byDependency.set(decision.dependency, byCandidate);
  }
  return Object.freeze([...byDependency.entries()].flatMap(([dependency, candidates]) => {
    if (candidates.size <= 1) return [];
    return [{
      dependency,
      requesters: Object.freeze([...candidates.values()].flat().sort((a, b) => a.localeCompare(b))),
      candidates: Object.freeze([...candidates.keys()].sort((a, b) => a.localeCompare(b))),
    }];
  }).sort((a, b) => a.dependency.localeCompare(b.dependency)));
}

function lockMentions(lockText, name, range) {
  return lockText.includes(`${name}:`) || (range !== undefined && lockText.includes(`${name}@${range}`));
}
