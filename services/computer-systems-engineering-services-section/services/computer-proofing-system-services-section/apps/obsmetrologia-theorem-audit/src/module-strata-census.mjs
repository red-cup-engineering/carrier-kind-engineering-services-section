/**
 * Pure parsing and aggregation algebra for the whole-library Obsmetrologia
 * module-strata census. No I/O: callers read every `.lean` file under
 * `Obsmetrologia/` plus the root `Obsmetrologia.lean` and pass their
 * `{path, text}` pairs to `buildGraph`. Needs no Lean run — it parses
 * `import` lines as text.
 */
import { createGraph, stronglyConnectedComponents as graphStronglyConnectedComponents } from "@red-cup-engineering/metrologic/models/graphs/directed-multigraph";

/**
 * The session-declared four-stratum layering (owner's stated order:
 * algebra < language < geometry < dynamics/physics). Not owner-verified —
 * carried as data, never as prose, so a later session can diff it against
 * a ruling.
 *
 * @type {{
 *   algebra: string[],
 *   language: string[],
 *   geometry: string[],
 *   dynamics: string[],
 *   assignedBy: string,
 * }}
 */
export const DECLARED_STRATA = {
  algebra: ["Primitive", "Calculus"],
  language: ["Articulation", "Language", "Computing"],
  geometry: ["Site", "Closure", "Settlement", "Cohomology", "AperiodicOrder", "CausalSets"],
  dynamics: [
    "Dynamics",
    "Thermodynamics",
    "KineticTheory",
    "QuantumContextuality",
    "ReactionNetworks",
    "DenseMatter",
    "GameTheory",
  ],
  assignedBy: "session 2026-09-04, unverified against the owner",
};

/** Stratum names, lowest (algebra) to highest (dynamics). */
const STRATUM_ORDER = ["algebra", "language", "geometry", "dynamics"];

/**
 * Extract every `import <name>` line from one `.lean` file's text. Only a
 * line that begins with `import ` after optional leading whitespace
 * counts — prose or doc-comment text that merely contains the word
 * "import" (e.g. "this module does not import X") is not a match.
 *
 * @param {string} text - Full source text of one `.lean` file.
 * @returns {Array<{module: string, line: number}>} One entry per import line, in file order; `line` is 1-indexed.
 */
export function parseImports(text) {
  const lines = String(text).split(/\r?\n/);
  const results = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^\s*import\s+(\S+)/.exec(lines[index]);
    if (match) results.push({ module: match[1], line: index + 1 });
  }
  return results;
}

/**
 * The top-level module an import name (or a house file's own dotted
 * module name) belongs to: the second dot-segment of an
 * `Obsmetrologia.*` name (its first segment under the `Obsmetrologia`
 * namespace), or the first dot-segment of any other name (e.g.
 * `Lean.Elab.Tactic` -> `Lean`).
 *
 * @param {string} name - A dotted Lean module/import name.
 * @returns {string}
 */
export function topLevelOf(name) {
  const segments = String(name).split(".");
  if (segments[0] === "Obsmetrologia" && segments.length > 1) return segments[1];
  return segments[0];
}

/**
 * The top-level module a scanned file itself belongs to, from its path
 * relative to the Lean package root (forward-slash separated). A file
 * directly under `Obsmetrologia/<Name>.lean` or nested under
 * `Obsmetrologia/<Name>/...` belongs to top-level module `<Name>`. The
 * root `Obsmetrologia.lean` manifest (sibling of the `Obsmetrologia/`
 * directory, not under it) has no top-level module of its own — per the
 * stated rule ("first path component under Obsmetrologia/") it owns no
 * stratum, so its import lines are counted toward file/line totals but
 * excluded from the inter-module graph.
 *
 * @param {string} relativePath - e.g. "Obsmetrologia/Primitive/Mark.lean" or "Obsmetrologia.lean".
 * @returns {string|null}
 */
export function ownerModuleOf(relativePath) {
  const match = /^Obsmetrologia\/([^/]+)/.exec(relativePath);
  if (!match) return null;
  return match[1].replace(/\.lean$/, "");
}

/**
 * Build the whole-library import graph from every scanned file's raw
 * text. Self-imports (a file importing another file of its own top-level
 * module) are parsed and counted toward totals but excluded from the
 * inter-module edge set, since they carry no stratification information.
 *
 * @param {Array<{path: string, text: string}>} files - `path` relative to the Lean package root, forward-slash separated.
 * @returns {{
 *   files: Array<{path: string, ownerModule: string|null, imports: Array<{module: string, line: number, target: string}>}>,
 *   nodes: string[],
 *   moduleFileCounts: Record<string, number>,
 *   edges: Array<{from: string, to: string, count: number, examples: Array<{path: string, line: number}>}>,
 *   importsOf: Record<string, string[]>,
 *   importedByOf: Record<string, string[]>,
 *   totalFiles: number,
 *   totalImportLines: number,
 * }}
 */
export function buildGraph(files) {
  const sortedFiles = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const parsedFiles = sortedFiles.map(({ path, text }) => ({
    path,
    ownerModule: ownerModuleOf(path),
    imports: parseImports(text).map(({ module, line }) => ({ module, line, target: topLevelOf(module) })),
  }));

  const moduleFileCounts = {};
  for (const file of parsedFiles) {
    if (file.ownerModule) moduleFileCounts[file.ownerModule] = (moduleFileCounts[file.ownerModule] ?? 0) + 1;
  }

  const nodesSet = new Set(Object.keys(moduleFileCounts));
  const edgeMap = new Map();
  const importsOfSets = {};
  const importedBySets = {};

  for (const file of parsedFiles) {
    if (!file.ownerModule) continue;
    for (const imp of file.imports) {
      nodesSet.add(imp.target);
      if (imp.target === file.ownerModule) continue;
      const key = `${file.ownerModule}->${imp.target}`;
      let entry = edgeMap.get(key);
      if (!entry) {
        entry = { from: file.ownerModule, to: imp.target, count: 0, examples: [] };
        edgeMap.set(key, entry);
      }
      entry.count += 1;
      entry.examples.push({ path: file.path, line: imp.line });
      (importsOfSets[file.ownerModule] ??= new Set()).add(imp.target);
      (importedBySets[imp.target] ??= new Set()).add(file.ownerModule);
    }
  }

  const nodes = [...nodesSet].sort();
  const edges = [...edgeMap.values()].sort((a, b) =>
    a.from === b.from ? (a.to < b.to ? -1 : a.to > b.to ? 1 : 0) : (a.from < b.from ? -1 : 1),
  );
  const importsOf = {};
  const importedByOf = {};
  for (const node of nodes) {
    importsOf[node] = [...(importsOfSets[node] ?? new Set())].sort();
    importedByOf[node] = [...(importedBySets[node] ?? new Set())].sort();
  }

  const totalImportLines = parsedFiles.reduce((sum, file) => sum + file.imports.length, 0);

  return {
    files: parsedFiles,
    nodes,
    moduleFileCounts,
    edges,
    importsOf,
    importedByOf,
    totalFiles: sortedFiles.length,
    totalImportLines,
  };
}

/**
 * Invert the declared-strata config into a module -> stratum lookup.
 *
 * @param {{algebra: string[], language: string[], geometry: string[], dynamics: string[]}} config
 * @returns {{moduleStratum: Record<string, string>, order: string[]}} `order` is lowest-to-highest stratum name.
 */
export function strataOf(config) {
  const moduleStratum = {};
  for (const stratum of STRATUM_ORDER) {
    for (const moduleName of config[stratum] ?? []) moduleStratum[moduleName] = stratum;
  }
  return { moduleStratum, order: STRATUM_ORDER };
}

/**
 * Count upward inter-module imports (source stratum rank < target stratum
 * rank) over a graph's file-level imports, given one module -> stratum
 * assignment. A module absent from the assignment (unstratified) makes
 * every import touching it uncounted here, by design — this function
 * measures only stratified-to-stratified traffic.
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @param {Record<string, string>} moduleStratum
 * @param {string[]} order
 * @returns {number}
 */
function countUpwardForAssignment(graph, moduleStratum, order) {
  const rankOf = new Map(order.map((stratum, index) => [stratum, index]));
  let count = 0;
  for (const file of graph.files) {
    if (!file.ownerModule) continue;
    const sourceStratum = moduleStratum[file.ownerModule];
    if (sourceStratum === undefined) continue;
    for (const imp of file.imports) {
      if (imp.target === file.ownerModule) continue;
      const targetStratum = moduleStratum[imp.target];
      if (targetStratum === undefined) continue;
      if (rankOf.get(targetStratum) > rankOf.get(sourceStratum)) count += 1;
    }
  }
  return count;
}

/**
 * Every upward import in the graph (a file in a lower stratum importing a
 * module in a higher stratum), grouped by importing top-level module, plus
 * every import from a stratified module into an unstratified one.
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @param {{algebra: string[], language: string[], geometry: string[], dynamics: string[]}} config
 * @returns {{
 *   byModule: Record<string, Array<{file: string, line: number, target: string}>>,
 *   perStratumPair: Record<string, number>,
 *   total: number,
 *   intoUnstratified: Array<{file: string, line: number, source: string, target: string}>,
 *   totalIntoUnstratified: number,
 * }}
 */
export function upwardImports(graph, config) {
  const { moduleStratum, order } = strataOf(config);
  const rankOf = new Map(order.map((stratum, index) => [stratum, index]));

  const byModule = {};
  const perStratumPair = {};
  const intoUnstratified = [];
  let total = 0;
  let totalIntoUnstratified = 0;

  for (const file of graph.files) {
    if (!file.ownerModule) continue;
    const sourceStratum = moduleStratum[file.ownerModule];
    if (sourceStratum === undefined) continue;
    for (const imp of file.imports) {
      if (imp.target === file.ownerModule) continue;
      const targetStratum = moduleStratum[imp.target];
      if (targetStratum === undefined) {
        intoUnstratified.push({ file: file.path, line: imp.line, source: file.ownerModule, target: imp.target });
        totalIntoUnstratified += 1;
        continue;
      }
      if (rankOf.get(targetStratum) > rankOf.get(sourceStratum)) {
        (byModule[file.ownerModule] ??= []).push({ file: file.path, line: imp.line, target: imp.target });
        const pairKey = `${sourceStratum}->${targetStratum}`;
        perStratumPair[pairKey] = (perStratumPair[pairKey] ?? 0) + 1;
        total += 1;
      }
    }
  }

  return { byModule, perStratumPair, total, intoUnstratified, totalIntoUnstratified };
}

/**
 * The minimal consistent layering the observed DAG itself admits: each
 * top-level module's longest-path rank in the graph's SCC condensation
 * (rank 0 = imports nothing house-internal; rank N = 1 + the highest rank
 * among its distinct imported top-level modules). A real cycle collapses
 * its members to one SCC sharing one rank, and is reported explicitly with
 * the files that realize each of its edges.
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @returns {{
 *   ranks: Record<string, number>,
 *   acyclic: boolean,
 *   cycles: Array<{modules: string[], edges: Array<{from: string, to: string, files: string[]}>}>,
 * }}
 */
export function condensationRanks(graph) {
  const dependencyGraph = createGraph({ nodes: graph.nodes.map((id) => ({ id })) });
  for (const edge of graph.edges) dependencyGraph.addEdge({ from: edge.from, to: edge.to });

  const components = graphStronglyConnectedComponents(dependencyGraph);
  const sccOf = new Map();
  components.forEach((component, id) => {
    for (const node of component) sccOf.set(node, id);
  });

  const sccAdjacency = components.map(() => new Set());
  for (const edge of graph.edges) {
    const fromId = sccOf.get(edge.from);
    const toId = sccOf.get(edge.to);
    if (fromId !== toId) sccAdjacency[fromId].add(toId);
  }

  const rankCache = new Array(components.length).fill(null);
  function rankOfScc(id) {
    if (rankCache[id] !== null) return rankCache[id];
    const neighbors = [...sccAdjacency[id]];
    rankCache[id] = neighbors.length === 0 ? 0 : 1 + Math.max(...neighbors.map(rankOfScc));
    return rankCache[id];
  }
  for (let id = 0; id < components.length; id += 1) rankOfScc(id);

  const ranks = {};
  for (const node of graph.nodes) ranks[node] = rankOfScc(sccOf.get(node));

  const cycles = components
    .filter((component) => component.length > 1)
    .map((component) => {
      const members = new Set(component);
      const edgesWithin = graph.edges
        .filter((edge) => members.has(edge.from) && members.has(edge.to))
        .map((edge) => ({
          from: edge.from,
          to: edge.to,
          files: edge.examples.map((example) => `${example.path}:${example.line}`),
        }));
      return { modules: [...component].sort(), edges: edgesWithin };
    })
    .sort((a, b) => (a.modules[0] < b.modules[0] ? -1 : a.modules[0] > b.modules[0] ? 1 : 0));

  return { ranks, acyclic: cycles.length === 0, cycles };
}

/**
 * The single reassignment of one declared module to one other declared
 * stratum that removes the most upward imports, computed by brute force
 * over every (module, candidate-stratum) pair. Reported as data — never a
 * recommendation.
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @param {{algebra: string[], language: string[], geometry: string[], dynamics: string[]}} config
 * @returns {{
 *   baselineUpward: number,
 *   bestMove: {module: string, fromStratum: string, toStratum: string, upwardImportsRemoved: number}|null,
 * }}
 */
export function bestSingleMove(graph, config) {
  const { moduleStratum, order } = strataOf(config);
  const baselineUpward = countUpwardForAssignment(graph, moduleStratum, order);

  const modules = Object.keys(moduleStratum).sort();
  let bestMove = null;
  for (const moduleName of modules) {
    const fromStratum = moduleStratum[moduleName];
    for (const toStratum of order) {
      if (toStratum === fromStratum) continue;
      const modifiedAssignment = { ...moduleStratum, [moduleName]: toStratum };
      const modifiedUpward = countUpwardForAssignment(graph, modifiedAssignment, order);
      const upwardImportsRemoved = baselineUpward - modifiedUpward;
      if (bestMove === null || upwardImportsRemoved > bestMove.upwardImportsRemoved) {
        bestMove = { module: moduleName, fromStratum, toStratum, upwardImportsRemoved };
      }
    }
  }

  return { baselineUpward, bestMove };
}

/**
 * Assemble the final module-strata census record document.
 *
 * @param {{
 *   checkedAt: string,
 *   packageRoot: string,
 *   graph: ReturnType<typeof buildGraph>,
 *   config?: typeof DECLARED_STRATA,
 * }} options
 * @returns {object} The `ObsmetrologiaModuleStrataCensus` record.
 */
export function assembleRecord({ checkedAt, packageRoot, graph, config = DECLARED_STRATA }) {
  const { moduleStratum } = strataOf(config);
  const { ranks, acyclic, cycles } = condensationRanks(graph);
  const upward = upwardImports(graph, config);
  const { baselineUpward, bestMove } = bestSingleMove(graph, config);

  const unstratifiedModules = graph.nodes.filter((node) => moduleStratum[node] === undefined).sort();

  const modules = {};
  for (const node of graph.nodes) {
    modules[node] = {
      fileCount: graph.moduleFileCounts[node] ?? 0,
      stratum: moduleStratum[node] ?? "unstratified",
      imports: graph.importsOf[node] ?? [],
      importedBy: graph.importedByOf[node] ?? [],
      rank: ranks[node],
    };
  }

  const totalImportEdges = graph.edges.reduce((sum, edge) => sum + edge.count, 0);

  return {
    type: "ObsmetrologiaModuleStrataCensus",
    checkedAt,
    packageRoot,
    strata: config,
    modules,
    dag: {
      edges: graph.edges.map(({ from, to, count }) => ({ from, to, count })),
      acyclic,
      cycles,
    },
    upward,
    bestMove: { baselineUpward, ...bestMove },
    reading: {
      totalFiles: graph.totalFiles,
      totalImportLines: graph.totalImportLines,
      totalImportEdges,
      upwardPerStratumPair: upward.perStratumPair,
      totalUpward: upward.total,
      totalIntoUnstratified: upward.totalIntoUnstratified,
      unstratifiedModules,
      consistent: upward.total === 0,
      bestSingleMove: bestMove,
    },
  };
}
