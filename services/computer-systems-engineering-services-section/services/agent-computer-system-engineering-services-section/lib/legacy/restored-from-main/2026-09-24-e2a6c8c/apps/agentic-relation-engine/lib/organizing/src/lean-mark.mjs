import {
  dependencyGraphCarrier,

} from "./host-neutral-carriers.mjs";

export function leanDependencyGraphFromModules(modules) {
  const ids = new Set(modules.map((module) => module.id));
  for (const module of modules) for (const imported of module.imports) ids.add(imported);
  const nodes = [...ids].sort((left, right) => left.localeCompare(right)).map((id) => Object.freeze({
    id,
    manifest: id,
    workspaceMember: modules.some((module) => module.id === id),
  }));
  const edges = modules.flatMap((module) => module.imports.map((imported) => Object.freeze({
    from: module.id,
    to: imported,
    relationship: "build",
    resolvedBy: "lean-import",
  })));
  return dependencyGraphCarrier.assert({
    kind: "organizing.dependency-graph",
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges.sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to))),
    cycles: dependencyCycles(nodes.map((node) => node.id), edges),
  }, "Lean dependency graph");
}

export function topologicalSortLeanModules(graph) {
  const names = graph.nodes.map((node) => node.id);
  const outstanding = new Map(names.map((name) => [name, 0]));
  const dependents = new Map(names.map((name) => [name, []]));
  for (const edge of graph.edges) {
    if (!outstanding.has(edge.from) || !outstanding.has(edge.to)) continue;
    outstanding.set(edge.from, (outstanding.get(edge.from) ?? 0) + 1);
    dependents.get(edge.to)?.push(edge.from);
  }
  const tiers = [];
  let frontier = names.filter((name) => (outstanding.get(name) ?? 0) === 0).sort((left, right) => left.localeCompare(right));
  while (frontier.length > 0) {
    tiers.push(frontier);
    const next = [];
    for (const provider of frontier) {
      for (const dependent of dependents.get(provider) ?? []) {
        const remaining = (outstanding.get(dependent) ?? 0) - 1;
        outstanding.set(dependent, remaining);
        if (remaining === 0) next.push(dependent);
      }
    }
    frontier = next.sort((left, right) => left.localeCompare(right));
  }
  return Object.freeze(tiers.map((tier) => Object.freeze(tier)));
}

export function leanDependencyGraphH1(graph) {
  const components = componentCount(graph);
  return Math.max(0, graph.edges.length - graph.nodes.length + components);
}

export function leanTheoremSpine(
  modules,
  rootModule = "RelMath",
  names,
) {
  const wanted = names === undefined ? undefined : new Set(names);
  const entries = modules.flatMap((module) => module.declarations
    .filter((decl) => decl.kind === "theorem" || decl.kind === "lemma")
    .filter((decl) => wanted === undefined || wanted.has(decl.name))
    .map((decl) => Object.freeze({
      module: module.id,
      name: decl.name,
      kind: decl.kind,
      ...(decl.line === undefined ? {} : { line: decl.line }),
      ...(decl.proofStatus === undefined ? {} : { proofStatus: decl.proofStatus }),
    })));
  return Object.freeze({
    kind: "organizing.lean.theorem-spine",
    rootModule,
    entries: Object.freeze(entries.sort((left, right) => left.module.localeCompare(right.module) || left.name.localeCompare(right.name))),
    admitted: Object.freeze(entries.filter((entry) => entry.proofStatus === "admitted").map((entry) => entry.name).sort((left, right) => left.localeCompare(right))),
  });
}

export function leanTheoremSpineCoverage(
  spine,
  declarationIndex,
) {
  const declared = new Set(declarationIndex.declarations);
  const present = new Set(spine.entries.map((entry) => entry.name));
  return Object.freeze({
    kind: "organizing.lean.theorem-spine-coverage",
    declared: declared.size,
    present: [...declared].filter((name) => present.has(name)).length,
    missing: Object.freeze([...declared].filter((name) => !present.has(name)).sort((left, right) => left.localeCompare(right))),
    extra: Object.freeze([...present].filter((name) => !declared.has(name)).sort((left, right) => left.localeCompare(right))),
    admitted: spine.admitted,
  });
}

function componentCount(graph) {
  const parent = new Map(graph.nodes.map((node) => [node.id, node.id]));
  const find = (value) => {
    const current = parent.get(value) ?? value;
    if (current === value) return current;
    const root = find(current);
    parent.set(value, root);
    return root;
  };
  const union = (left, right) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent.set(a, b);
  };
  for (const edge of graph.edges) union(edge.from, edge.to);
  return new Set(graph.nodes.map((node) => find(node.id))).size;
}

export function dependencyCycles(nodes, edges) {
  const out = new Map(nodes.map((node) => [node, []]));
  for (const edge of edges) out.get(edge.from)?.push(edge.to);
  const cycles = [];
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const visit = (node) => {
    if (visiting.has(node)) {
      const offset = stack.indexOf(node);
      if (offset !== -1) cycles.push(stack.slice(offset));
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const next of out.get(node) ?? []) visit(next);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  };
  for (const node of nodes) visit(node);
  return Object.freeze(cycles.map((cycle) => Object.freeze(cycle)).sort((left, right) => right.length - left.length || (left[0] ?? "").localeCompare(right[0] ?? "")));
}
