/**
 * graph-theory holds graph incidence, coloring, port-graphs, and exact spectral graph readings.
 * It may import values, schema, records, and rational arithmetic, but it must not import
 * topology, order, tilings, physics, codecs, capability, rendering, search, integrations, or services.
 *
 * math/graphs/module-cohesion.mts was deliberately left in @red-cup-engineering/feltos and is
 * not re-exported here: it imports feltos's own math/topology/persistent-h0.mts, a module owned
 * by the sheaf/predication/topology cluster, not this generic graph-theory cluster.
 */
export * from "./coloring.mjs";
export * from "./discrete-set-number-graph.mjs";
export * as laplacian from "@lenticule-science/articulating/predicating/positing/settling/analysis/laplacian";
export type { RelationGraphCarrier as RelationGraph } from "@lenticule-science/articulating/predicating/positing/settling/analysis/laplacian";
export * from "./port-graph.mjs";
export * from "./spectral.mjs";
