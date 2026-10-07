import { createGraph } from "@red-cup-engineering/metrologic/models/graphs/directed-multigraph";

/** Derived topology of an admitted SignCell semantic graph; semantic admission remains upstream. */
export function projectSignGraphTopology(graph) { const topology = createGraph(); for (const cell of graph.cells) topology.addNode(cell.id, Object.freeze({ kind: cell.kind, type: cell.type })); for (const entry of graph.edges) topology.addEdge({ from: entry.edge.subject.id, to: entry.edge.object.id, kind: entry.edge.predicate, data: Object.freeze({ id: entry.id, witness: entry.edge.witness.id }) }); return topology; }
