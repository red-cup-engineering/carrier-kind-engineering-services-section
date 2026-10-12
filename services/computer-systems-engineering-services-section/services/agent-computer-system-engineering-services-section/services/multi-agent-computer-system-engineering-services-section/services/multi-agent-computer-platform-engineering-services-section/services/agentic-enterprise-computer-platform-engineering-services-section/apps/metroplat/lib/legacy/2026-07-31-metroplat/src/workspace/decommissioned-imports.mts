/**
 * workspace/decommissioned-imports - live packages reaching quarry packages.
 *
 * The repository root `README.md` states the law directly: any `core/triage`
 * tree is "held as a read-only quarry... Nothing may depend on it; its
 * capabilities are re-earned into metroplat or FizzOS, never imported." A
 * package is read as decommissioned when its admitted root path carries a
 * `triage` path segment — the same signal `README.md` itself uses, not an
 * invented heuristic. This is the re-derivation seat for the deleted
 * `@emsenn/jsnode-ick` package's `decommissioned-imports` audit, at the
 * package-dependency grain (`src/monitoring/source-code/workspace`'s admitted
 * edges) rather than the file/import-specifier grain, which needs the
 * consumption reading in `src/monitoring/source-code/topology` to extend first.
 */
import path from "node:path";

import {
  decommissionedImportViolationContract,
  workspaceDecommissionedImportAuditContract,
  type DecommissionedImportViolation,
  type WorkspaceDecommissionedImportAudit,
  type WorkspaceDependencyGraph,
} from "../monitoring/source-code/workspace/schema.mts";

function isQuarryRoot(root: string): boolean {
  return root.split(path.sep).includes("triage");
}

/** Live (non-quarry) packages whose declared runtime dependencies reach a
 *  quarry package, read from an already-projected workspace dependency graph. */
export function workspaceDecommissionedImportAudit(graph: WorkspaceDependencyGraph): WorkspaceDecommissionedImportAudit {
  const rootByName = new Map(graph.nodes.map((node) => [node.name, node.root]));
  const decommissioned = new Set(graph.nodes.filter((node) => isQuarryRoot(node.root)).map((node) => node.name));

  const violations: DecommissionedImportViolation[] = [];
  for (const edge of graph.edges) {
    if (!decommissioned.has(edge.to) || decommissioned.has(edge.from)) continue;
    const providerRoot = rootByName.get(edge.to);
    if (providerRoot === undefined) continue;
    violations.push(decommissionedImportViolationContract.assert({
      consumer: edge.from,
      provider: edge.to,
      providerRoot,
    }, `decommissioned import violation ${edge.from}->${edge.to}`) as DecommissionedImportViolation);
  }

  return workspaceDecommissionedImportAuditContract.assert({
    kind: "metroplat.workspace-graph.decommissioned-import-audit" as const,
    decommissionedPackages: Object.freeze([...decommissioned].sort()),
    violations: Object.freeze(violations),
  }, "workspace decommissioned import audit") as WorkspaceDecommissionedImportAudit;
}
