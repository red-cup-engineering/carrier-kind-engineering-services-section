/**
 * analysis/discrete - finite set, Nat, and graph shadows.
 *
 * Kuratowski pair equality, equivalence partitions, bounded Nat semiring checks,
 * directed handshake counts, topological-order DAG witnesses, and tree counts.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-type-engine/types";
import * as canonical from "@lenticule-science/articulating/predicating/positing/settling/analysis/discrete-set-number-graph";


export const finiteSetSchemaContractSchema = {
  $id: "metroplat/closure/analysis/discrete/finite-set",
  type: "object",
  required: ["kind", "universe", "members"],
  properties: {
    kind: { const: "discrete.set" },
    universe: { type: "array", items: { type: "string" } },
    members: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  title: "FiniteSet",
  description: "A finite set: its universe and its members, each a sorted string array.",
} as const;

export type FiniteSet = FromJsonSchema<typeof finiteSetSchemaContractSchema>;

export interface PowersetReceipt {
  readonly kind: "discrete.powerset.receipt:witness";
  readonly universe: readonly string[];
  readonly left: FiniteSet;
  readonly right: FiniteSet;
  readonly intersection: FiniteSet;
  readonly union: FiniteSet;
  readonly leftComplement: FiniteSet;
  readonly rightComplement: FiniteSet;
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
  readonly universe: readonly string[];
  readonly classes: readonly FiniteSet[];
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

export interface SuccessorAlgebra {
  readonly kind: "discrete.successorAlgebra";
  readonly elements: readonly string[];
  readonly zero: string;
  readonly successor: Readonly<Record<string, string>>;
}

export interface SuccessorAlgebraReceipt {
  readonly kind: "discrete.successorAlgebra.receipt:witness";
  readonly algebra: SuccessorAlgebra;
  readonly checkedThrough: number;
  readonly recursor: readonly string[];
  readonly candidateMorphisms: readonly (readonly string[])[];
  readonly recursorPreservesZero: true;
  readonly recursorPreservesSuccessor: true;
  readonly initialExistsOnPrefix: true;
  readonly initialUniqueOnPrefix: true;
}

export interface FiniteDirectedGraph {
  readonly kind: "discrete.graph.directed";
  readonly vertices: readonly string[];
  readonly edges: readonly (readonly [string, string])[];
}

export interface DirectedHandshakeReceipt {
  readonly kind: "discrete.graph.handshake.receipt:witness";
  readonly graph: FiniteDirectedGraph;
  readonly edgeCount: number;
  readonly indegrees: Readonly<Record<string, number>>;
  readonly outdegrees: Readonly<Record<string, number>>;
  readonly sumIndegree: number;
  readonly sumOutdegree: number;
  readonly directedHandshake: true;
}

export interface TopologicalDagReceipt {
  readonly kind: "discrete.graph.topologicalDag.receipt:witness";
  readonly graph: FiniteDirectedGraph;
  readonly order: Readonly<Record<string, number>>;
  readonly irreflexive: true;
  readonly topological: true;
  readonly dag: true;
}

export interface TreeCountReceipt {
  readonly kind: "discrete.graph.treeCount.receipt:witness" | "discrete.graph.treeCount.receipt:obstruction";
  readonly graph: FiniteDirectedGraph;
  readonly vertexCount: number;
  readonly edgeCount: number;
  readonly edgeCountPlusOne: number;
  readonly spanningCount: boolean;
}



const toSet = (s: FiniteSet): canonical.FiniteSetCarrier => ({ ...s, kind: "discrete.set.carrier" });
const fromSet = (s: canonical.FiniteSetCarrier): FiniteSet => Object.freeze({ ...s, kind: "discrete.set" });
const toGraph = (g: FiniteDirectedGraph): canonical.FiniteDirectedGraphCarrier => ({ ...g, kind: "discrete.graph.directed.carrier" });
export const finiteSet = (universe: readonly string[], members: readonly string[]): FiniteSet => fromSet(canonical.finiteSet(universe, members));
export const subset = (a: FiniteSet, b: FiniteSet): boolean => canonical.subset(toSet(a), toSet(b));
export const setIntersection = (a: FiniteSet, b: FiniteSet): FiniteSet => fromSet(canonical.setIntersection(toSet(a), toSet(b)));
export const setUnion = (a: FiniteSet, b: FiniteSet): FiniteSet => fromSet(canonical.setUnion(toSet(a), toSet(b)));
export const setComplement = (s: FiniteSet): FiniteSet => fromSet(canonical.setComplement(toSet(s)));
export function powersetReceipt(universe: readonly string[], left: readonly string[], right: readonly string[]): PowersetReceipt {
  const r = canonical.powersetReceipt(universe, left, right);
  return Object.freeze({ ...r, left: fromSet(r.left), right: fromSet(r.right), intersection: fromSet(r.intersection), union: fromSet(r.union), leftComplement: fromSet(r.leftComplement), rightComplement: fromSet(r.rightComplement) });
}
export const kuratowskiPairReceipt = canonical.kuratowskiPairReceipt;
export function equivalencePartitionReceipt(universe: readonly string[], relation: readonly (readonly boolean[])[]): EquivalencePartitionReceipt {
  const {carrier, classes, ...r} = canonical.equivalencePartitionReceipt(universe, relation);
  return Object.freeze({...r, universe: carrier, classes: Object.freeze(classes.map(fromSet))});
}
export const natSemiringReceipt = canonical.natSemiringReceipt;
export function successorAlgebraReceipt(algebra: SuccessorAlgebra, checkedThrough = 5): SuccessorAlgebraReceipt {
  const {sourceModule, theorems, ...r} = canonical.successorAlgebraReceipt({...algebra, kind:"discrete.successorAlgebra.carrier"}, checkedThrough);
  return Object.freeze({...r, algebra:Object.freeze({...r.algebra,kind:"discrete.successorAlgebra"})});
}
export const directedGraph = (vertices: readonly string[], edges: readonly (readonly [string,string])[]): FiniteDirectedGraph =>
  Object.freeze({...canonical.directedGraph(vertices,edges),kind:"discrete.graph.directed"});
export const directedHandshakeReceipt = (graph: FiniteDirectedGraph): DirectedHandshakeReceipt =>
  Object.freeze({...canonical.directedHandshakeReceipt(toGraph(graph)),graph});
export const topologicalDagReceipt = (graph: FiniteDirectedGraph, order: Readonly<Record<string,number>>): TopologicalDagReceipt =>
  Object.freeze({...canonical.topologicalDagReceipt(toGraph(graph),order),graph});
export const treeCountReceipt = (graph: FiniteDirectedGraph): TreeCountReceipt =>
  Object.freeze({...canonical.treeCountReceipt(toGraph(graph)),graph});
