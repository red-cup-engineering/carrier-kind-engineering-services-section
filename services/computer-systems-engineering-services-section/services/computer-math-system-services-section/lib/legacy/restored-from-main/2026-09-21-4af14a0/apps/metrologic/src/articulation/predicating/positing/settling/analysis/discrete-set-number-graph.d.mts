/**
 * analysis/discrete - finite set, Nat, and graph shadows.
 *
 * Executable shadow of RelMath.Order.SetNumberGraphTheory: finite powersets,
 * Kuratowski pair equality, equivalence partitions, bounded Nat semiring checks,
 * directed handshake counts, topological-order DAG witnesses, and tree counts.
 */
export interface FiniteSetCarrier {
    readonly kind: "discrete.set.carrier";
    readonly universe: readonly string[];
    readonly members: readonly string[];
}
export interface PowersetReceipt {
    readonly kind: "discrete.powerset.receipt:witness";
    readonly universe: readonly string[];
    readonly left: FiniteSetCarrier;
    readonly right: FiniteSetCarrier;
    readonly intersection: FiniteSetCarrier;
    readonly union: FiniteSetCarrier;
    readonly leftComplement: FiniteSetCarrier;
    readonly rightComplement: FiniteSetCarrier;
    readonly subsetPartialOrder: true;
    readonly boundedLattice: true;
    readonly deMorganInter: true;
    readonly deMorganUnion: true;
    readonly complementAntitone: true;
}
export interface KuratowskiPairReceipt {
    readonly kind: "discrete.kuratowskiPair.receipt:witness";
    readonly left: readonly [string, string];
    readonly right: readonly [string, string];
    readonly equal: boolean;
    readonly characteristicEquality: true;
}
export interface EquivalencePartitionReceipt {
    readonly kind: "discrete.equivalencePartition.receipt:witness";
    readonly carrier: readonly string[];
    readonly classes: readonly FiniteSetCarrier[];
    readonly reflexive: true;
    readonly symmetric: true;
    readonly transitive: true;
    readonly covers: true;
    readonly overlapForcesEqual: true;
}
export interface NatSemiringReceipt {
    readonly kind: "discrete.natSemiring.receipt:witness";
    readonly checkedThrough: number;
    readonly addCommutative: true;
    readonly addAssociative: true;
    readonly addZero: true;
    readonly mulCommutative: true;
    readonly mulAssociative: true;
    readonly mulOne: true;
    readonly zeroMul: true;
    readonly leftDistributive: true;
    readonly rightDistributive: true;
    readonly noAdditiveInverseOfOne: true;
}
export interface SuccessorAlgebraCarrier {
    readonly kind: "discrete.successorAlgebra.carrier";
    readonly elements: readonly string[];
    readonly zero: string;
    readonly successor: Readonly<Record<string, string>>;
}
export interface SuccessorAlgebraReceipt {
    readonly kind: "discrete.successorAlgebra.receipt:witness";
    readonly sourceModule: "RelMath.Order.SetNumberGraphTheory";
    readonly theorems: readonly [
        "RelMath.Discrete.natAlg",
        "RelMath.Discrete.natRec",
        "RelMath.Discrete.natRecHom",
        "RelMath.Discrete.nat_initial_exists",
        "RelMath.Discrete.nat_initial_unique",
        "RelMath.Discrete.nat_hom_unique"
    ];
    readonly algebra: SuccessorAlgebraCarrier;
    readonly checkedThrough: number;
    readonly recursor: readonly string[];
    readonly candidateMorphisms: readonly (readonly string[])[];
    readonly recursorPreservesZero: true;
    readonly recursorPreservesSuccessor: true;
    readonly initialExistsOnPrefix: true;
    readonly initialUniqueOnPrefix: true;
}
export interface FiniteDirectedGraphCarrier {
    readonly kind: "discrete.graph.directed.carrier";
    readonly vertices: readonly string[];
    readonly edges: readonly (readonly [string, string])[];
}
export interface DirectedHandshakeReceipt {
    readonly kind: "discrete.graph.handshake.receipt:witness";
    readonly graph: FiniteDirectedGraphCarrier;
    readonly edgeCount: number;
    readonly indegrees: Readonly<Record<string, number>>;
    readonly outdegrees: Readonly<Record<string, number>>;
    readonly sumIndegree: number;
    readonly sumOutdegree: number;
    readonly directedHandshake: true;
}
export interface TopologicalDagReceipt {
    readonly kind: "discrete.graph.topologicalDag.receipt:witness";
    readonly graph: FiniteDirectedGraphCarrier;
    readonly order: Readonly<Record<string, number>>;
    readonly irreflexive: true;
    readonly topological: true;
    readonly dag: true;
}
export interface TreeCountReceipt {
    readonly kind: "discrete.graph.treeCount.receipt:witness" | "discrete.graph.treeCount.receipt:obstruction";
    readonly graph: FiniteDirectedGraphCarrier;
    readonly vertexCount: number;
    readonly edgeCount: number;
    readonly edgeCountPlusOne: number;
    readonly spanningCount: boolean;
}
export declare function finiteSet(universe: readonly string[], members: readonly string[]): FiniteSetCarrier;
export declare const subset: (left: FiniteSetCarrier, right: FiniteSetCarrier) => boolean;
export declare const setIntersection: (left: FiniteSetCarrier, right: FiniteSetCarrier) => FiniteSetCarrier;
export declare const setUnion: (left: FiniteSetCarrier, right: FiniteSetCarrier) => FiniteSetCarrier;
export declare const setComplement: (set: FiniteSetCarrier) => FiniteSetCarrier;
export declare function powersetReceipt(universe: readonly string[], leftMembers: readonly string[], rightMembers: readonly string[]): PowersetReceipt;
export declare function kuratowskiPairReceipt(a: string, b: string, c: string, d: string): KuratowskiPairReceipt;
export declare function equivalencePartitionReceipt(carrier: readonly string[], relation: readonly (readonly boolean[])[]): EquivalencePartitionReceipt;
export declare function natSemiringReceipt(checkedThrough?: number): NatSemiringReceipt;
/** Finite prefix shadow of Nat's initiality as a successor algebra. */
export declare function successorAlgebraReceipt(algebra: SuccessorAlgebraCarrier, checkedThrough?: number): SuccessorAlgebraReceipt;
export declare function directedGraph(vertices: readonly string[], edges: readonly (readonly [string, string])[]): FiniteDirectedGraphCarrier;
export declare function directedHandshakeReceipt(graph: FiniteDirectedGraphCarrier): DirectedHandshakeReceipt;
export declare function topologicalDagReceipt(graph: FiniteDirectedGraphCarrier, order: Readonly<Record<string, number>>): TopologicalDagReceipt;
export declare function treeCountReceipt(graph: FiniteDirectedGraphCarrier): TreeCountReceipt;
