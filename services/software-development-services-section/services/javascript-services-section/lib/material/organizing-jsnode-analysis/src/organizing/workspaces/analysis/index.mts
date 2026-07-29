/**
 * @emsenn/organizing-with-jsnode/analysis — pure analytical invariants of the workspace
 * dependency graph.
 *
 * Combinatorial geometry and analysis of the package dependency DAG
 * (components, cycles, distance, centrality, strata, the role × domain
 * fibration grid, and the role quotient), the build order, the dependency
 * atlas, the domain atlas and quotient, the role catalogue, the lifecycle and
 * migration-debt view, the workspace consistency bands, and the exact and
 * numeric graph spectrum. Every export is a pure function of the
 * `WorkspaceDependencyGraph` (or `JSNodeWorkspace`) it is given — no
 * filesystem, process, network, or typescript dependency.
 */
export * from "./analysis.mjs";
export * from "./build-order.mjs";
export * from "./consistency.mjs";
export * from "./dependencies.mjs";
export * from "./decommission.mjs";
export * from "./domain.mjs";
export * from "./lifecycle.mjs";
export * from "./role-catalog.mjs";
export * from "./spectrum.mjs";
export * from "./type-flow.mjs";
export * from "./symbol-graph.mjs";
