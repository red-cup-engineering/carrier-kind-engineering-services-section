/**
 * analysis/persistent-h0 - finite H0 persistence over graph filtrations.
 *
 * Executable shadow of RelMath.Topology.PersistentH0. Lean proves that
 * undirected path connectivity is transitive, monotone under edge growth, and
 * therefore components only merge along a graph filtration. This finite carrier
 * computes the component partitions and records the derived component-count
 * monotonicity that Lean deliberately leaves to finite quotient infrastructure.
 */
export type GraphEdge = readonly [string, string];
export interface GraphFiltrationStage {
    readonly stage: number;
    readonly edges: readonly GraphEdge[];
}
export interface GraphFiltrationCarrier {
    readonly kind: "topology.persistentH0.filtration.carrier";
    readonly vertices: readonly string[];
    readonly stages: readonly GraphFiltrationStage[];
}
export interface ComponentPartitionStage {
    readonly stage: number;
    readonly components: readonly (readonly string[])[];
    readonly componentCount: number;
}
export interface PersistentH0Receipt {
    readonly kind: "topology.persistentH0.receipt:witness";
    readonly sourceModule: "RelMath.Topology.PersistentH0";
    readonly theorems: readonly [
        "RelMath.Topology.PathConn.trans",
        "RelMath.Topology.PathConn.mono",
        "RelMath.Topology.components_only_merge"
    ];
    readonly filtration: GraphFiltrationCarrier;
    readonly partitions: readonly ComponentPartitionStage[];
    readonly pathConnTransitive: true;
    readonly pathConnMonotone: true;
    readonly componentsOnlyMerge: true;
    readonly finiteComponentCountsNonIncreasing: true;
    readonly boundary: "Finite graph-filtration H0 shadow: components are computed by union-find; higher homology and metric alpha complexes are outside this carrier.";
}
export declare function graphFiltration(vertices: readonly string[], stages: readonly (readonly GraphEdge[])[]): GraphFiltrationCarrier;
export declare function pathConnected(filtration: GraphFiltrationCarrier, stage: number, left: string, right: string): boolean;
export declare function componentPartitions(filtration: GraphFiltrationCarrier): readonly ComponentPartitionStage[];
export declare function persistentH0Receipt(filtration: GraphFiltrationCarrier): PersistentH0Receipt;
