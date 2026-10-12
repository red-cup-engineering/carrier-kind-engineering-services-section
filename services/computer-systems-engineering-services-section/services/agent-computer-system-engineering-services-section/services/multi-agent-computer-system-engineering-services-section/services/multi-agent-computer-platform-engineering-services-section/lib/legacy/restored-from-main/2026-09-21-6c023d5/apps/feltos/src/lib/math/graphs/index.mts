/**
 * graphs now holds only module-topology graph readings (module-cohesion), which import this
 * app's own math/topology/persistent-h0.mts and so are not part of the generic graph-theory
 * cluster cannibalized into @lenticule-science/graph-theory-services-section on 2026-09-11
 * (coloring, discrete-set-number-graph, port-graph, spectral, and the Laplacian re-export).
 * A consumer wanting exact coloring, discrete-set-number graphs, port-graphs, or spectral reads
 * imports that package directly; nothing here re-exports it.
 */
export * from "./module-cohesion.mts";
