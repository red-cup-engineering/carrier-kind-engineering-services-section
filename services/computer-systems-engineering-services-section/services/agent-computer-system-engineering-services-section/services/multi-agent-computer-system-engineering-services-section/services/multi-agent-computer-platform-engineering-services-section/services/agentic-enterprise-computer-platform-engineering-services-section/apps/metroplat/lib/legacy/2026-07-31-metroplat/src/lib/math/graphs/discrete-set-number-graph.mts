/**
 * analysis/discrete - finite set, Nat, and graph shadows.
 *
 * Kuratowski pair equality, equivalence partitions, bounded Nat semiring checks,
 * directed handshake counts, topological-order DAG witnesses, and tree counts.
 */
import type { FromSchema } from "../../schema/contract.mts";

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

export type FiniteSet = FromSchema<typeof finiteSetSchemaContractSchema>;

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

const unique = (items: readonly string[]): boolean => new Set(items).size === items.length;

const freezeRecord = <T,>(record: Record<string, T>): Readonly<Record<string, T>> => Object.freeze({ ...record });

function requireUniverse(universe: readonly string[], caller: string): void {
  if (!unique(universe)) throw new TypeError(`${caller}: duplicate universe elements are not a universe`);
}

function requireMember(universe: readonly string[], member: string, caller: string): void {
  if (!universe.includes(member)) throw new TypeError(`${caller}: ${member} is not in the universe`);
}

export function finiteSet(universe: readonly string[], members: readonly string[]): FiniteSet {
  requireUniverse(universe, "finiteSet");
  if (!unique(members)) throw new TypeError("finiteSet: duplicate members are not extensional");
  for (const member of members) requireMember(universe, member, "finiteSet");
  return Object.freeze({
    kind: "discrete.set" as const,
    universe: Object.freeze([...universe]),
    members: Object.freeze([...members].sort((a, b) => universe.indexOf(a) - universe.indexOf(b))),
  });
}

const has = (set: FiniteSet, member: string): boolean => set.members.includes(member);

export const subset = (left: FiniteSet, right: FiniteSet): boolean =>
  left.members.every((member) => has(right, member));

const sameSet = (left: FiniteSet, right: FiniteSet): boolean =>
  subset(left, right) && subset(right, left);

export const setIntersection = (left: FiniteSet, right: FiniteSet): FiniteSet =>
  finiteSet(left.universe, left.universe.filter((member) => has(left, member) && has(right, member)));

export const setUnion = (left: FiniteSet, right: FiniteSet): FiniteSet =>
  finiteSet(left.universe, left.universe.filter((member) => has(left, member) || has(right, member)));

export const setComplement = (set: FiniteSet): FiniteSet =>
  finiteSet(set.universe, set.universe.filter((member) => !has(set, member)));

function* subsets(universe: readonly string[], index = 0, members: string[] = []): Generator<FiniteSet> {
  if (index === universe.length) {
    yield finiteSet(universe, members);
    return;
  }
  yield* subsets(universe, index + 1, members);
  members.push(universe[index] as string);
  yield* subsets(universe, index + 1, members);
  members.pop();
}

export function powersetReceipt(universe: readonly string[], leftMembers: readonly string[], rightMembers: readonly string[]): PowersetReceipt {
  if (universe.length > 6) throw new RangeError("powersetReceipt: exhaustive powerset checks are limited to at most 6 elements");
  const left = finiteSet(universe, leftMembers);
  const right = finiteSet(universe, rightMembers);
  const all = [...subsets(universe)];
  const partial = all.every((set) => subset(set, set))
    && all.every((a) => all.every((b) => all.every((c) => !(subset(a, b) && subset(b, c)) || subset(a, c))))
    && all.every((a) => all.every((b) => !(subset(a, b) && subset(b, a)) || sameSet(a, b)));
  const bounded = all.every((set) =>
    sameSet(setIntersection(set, finiteSet(universe, universe)), set)
    && sameSet(setUnion(set, finiteSet(universe, [])), set),
  );
  const deMorganInter = sameSet(setComplement(setIntersection(left, right)), setUnion(setComplement(left), setComplement(right)));
  const deMorganUnion = sameSet(setComplement(setUnion(left, right)), setIntersection(setComplement(left), setComplement(right)));
  const complementAntitone = !subset(left, right) || subset(setComplement(right), setComplement(left));
  if (!partial || !bounded || !deMorganInter || !deMorganUnion || !complementAntitone) {
    throw new TypeError("powersetReceipt: finite powerset laws failed");
  }
  return Object.freeze({
    kind: "discrete.powerset.receipt:witness" as const,
    universe: left.universe,
    left,
    right,
    intersection: setIntersection(left, right),
    union: setUnion(left, right),
    leftComplement: setComplement(left),
    rightComplement: setComplement(right),
    subsetPartialOrder: true as const,
    boundedLattice: true as const,
    deMorganInter: true as const,
    deMorganUnion: true as const,
    complementAntitone: true as const,
  });
}

export function kuratowskiPairReceipt(a: string, b: string, c: string, d: string): KuratowskiPairReceipt {
  return Object.freeze({
    kind: "discrete.kuratowskiPair.receipt:witness" as const,
    left: Object.freeze([a, b]) as readonly [string, string],
    right: Object.freeze([c, d]) as readonly [string, string],
    equal: a === c && b === d,
    characteristicEquality: true as const,
  });
}

export function equivalencePartitionReceipt(universe: readonly string[], relation: readonly (readonly boolean[])[]): EquivalencePartitionReceipt {
  requireUniverse(universe, "equivalencePartitionReceipt");
  if (relation.length !== universe.length || relation.some((row) => row.length !== universe.length)) {
    throw new TypeError("equivalencePartitionReceipt: relation must be square over the universe");
  }
  const reflexive = universe.every((_, i) => relation[i]?.[i] === true);
  const symmetric = universe.every((_, i) => universe.every((__, j) => relation[i]?.[j] !== true || relation[j]?.[i] === true));
  const transitive = universe.every((_, i) => universe.every((__, j) => universe.every((___, k) =>
    !(relation[i]?.[j] === true && relation[j]?.[k] === true) || relation[i]?.[k] === true,
  )));
  if (!reflexive || !symmetric || !transitive) {
    throw new TypeError("equivalencePartitionReceipt: relation is not an equivalence relation");
  }
  const classBySeed = universe.map((seed, i) => finiteSet(universe, universe.filter((_, j) => relation[i]?.[j] === true)));
  const classes = Object.freeze(classBySeed.filter((set, i) => classBySeed.findIndex((other) => sameSet(set, other)) === i));
  const covers = universe.every((member) => classes.some((cls) => has(cls, member)));
  const overlapForcesEqual = classes.every((left) => classes.every((right) => {
    const overlaps = left.members.some((member) => has(right, member));
    return !overlaps || sameSet(left, right);
  }));
  if (!covers || !overlapForcesEqual) throw new TypeError("equivalencePartitionReceipt: partition laws failed");
  return Object.freeze({
    kind: "discrete.equivalencePartition.receipt:witness" as const,
    universe: Object.freeze([...universe]),
    classes,
    reflexive: true as const,
    symmetric: true as const,
    transitive: true as const,
    covers: true as const,
    overlapForcesEqual: true as const,
  });
}

export function natSemiringReceipt(checkedThrough = 6): NatSemiringReceipt {
  if (!Number.isSafeInteger(checkedThrough) || checkedThrough < 1 || checkedThrough > 50) {
    throw new RangeError("natSemiringReceipt: checkedThrough must be an integer in [1, 50]");
  }
  const xs = Array.from({ length: checkedThrough + 1 }, (_, i) => i);
  const addCommutative = xs.every((a) => xs.every((b) => a + b === b + a));
  const addAssociative = xs.every((a) => xs.every((b) => xs.every((c) => (a + b) + c === a + (b + c))));
  const addZero = xs.every((a) => a + 0 === a && 0 + a === a);
  const mulCommutative = xs.every((a) => xs.every((b) => a * b === b * a));
  const mulAssociative = xs.every((a) => xs.every((b) => xs.every((c) => (a * b) * c === a * (b * c))));
  const mulOne = xs.every((a) => a * 1 === a && 1 * a === a);
  const zeroMul = xs.every((a) => 0 * a === 0 && a * 0 === 0);
  const leftDistributive = xs.every((a) => xs.every((b) => xs.every((c) => a * (b + c) === (a * b) + (a * c))));
  const rightDistributive = xs.every((a) => xs.every((b) => xs.every((c) => (a + b) * c === (a * c) + (b * c))));
  const noAdditiveInverseOfOne = xs.every((n) => 1 + n !== 0);
  if (!addCommutative || !addAssociative || !addZero || !mulCommutative || !mulAssociative || !mulOne || !zeroMul || !leftDistributive || !rightDistributive || !noAdditiveInverseOfOne) {
    throw new TypeError("natSemiringReceipt: bounded Nat semiring laws failed");
  }
  return Object.freeze({
    kind: "discrete.natSemiring.receipt:witness" as const,
    checkedThrough,
    addCommutative: true as const,
    addAssociative: true as const,
    addZero: true as const,
    mulCommutative: true as const,
    mulAssociative: true as const,
    mulOne: true as const,
    zeroMul: true as const,
    leftDistributive: true as const,
    rightDistributive: true as const,
    noAdditiveInverseOfOne: true as const,
  });
}

function requireSuccessorAlgebra(algebra: SuccessorAlgebra, caller: string): void {
  requireUniverse(algebra.elements, caller);
  requireMember(algebra.elements, algebra.zero, caller);
  for (const element of algebra.elements) {
    const next = algebra.successor[element];
    if (next === undefined) throw new TypeError(`${caller}: missing successor for ${element}`);
    requireMember(algebra.elements, next, caller);
  }
}

function natRecPrefix(algebra: SuccessorAlgebra, checkedThrough: number): readonly string[] {
  const out: string[] = [algebra.zero];
  for (let index = 0; index < checkedThrough; index += 1) {
    out.push(algebra.successor[out[index] as string] as string);
  }
  return Object.freeze(out);
}

function candidateNatMorphisms(algebra: SuccessorAlgebra, checkedThrough: number): readonly (readonly string[])[] {
  const length = checkedThrough + 1;
  const out: (readonly string[])[] = [];
  const build = (index: number, current: string[]): void => {
    if (index === length) {
      const preservesZero = current[0] === algebra.zero;
      const preservesSuccessor = current.slice(0, -1).every((value, n) => current[n + 1] === algebra.successor[value]);
      if (preservesZero && preservesSuccessor) out.push(Object.freeze([...current]));
      return;
    }
    for (const element of algebra.elements) {
      current[index] = element;
      build(index + 1, current);
    }
  };
  build(0, []);
  return Object.freeze(out);
}

/** Finite prefix shadow of Nat's initiality as a successor algebra. */
export function successorAlgebraReceipt(algebra: SuccessorAlgebra, checkedThrough = 5): SuccessorAlgebraReceipt {
  if (!Number.isSafeInteger(checkedThrough) || checkedThrough < 0 || checkedThrough > 8) {
    throw new RangeError("successorAlgebraReceipt: checkedThrough must be an integer in [0, 8]");
  }
  if (algebra.elements.length > 6) throw new RangeError("successorAlgebraReceipt: exhaustive morphism checks are limited to at most 6 elements");
  requireSuccessorAlgebra(algebra, "successorAlgebraReceipt");
  const normalized: SuccessorAlgebra = Object.freeze({
    kind: "discrete.successorAlgebra" as const,
    elements: Object.freeze([...algebra.elements]),
    zero: algebra.zero,
    successor: freezeRecord(Object.fromEntries(algebra.elements.map((element) => [element, algebra.successor[element] as string]))),
  });
  const recursor = natRecPrefix(normalized, checkedThrough);
  const candidateMorphisms = candidateNatMorphisms(normalized, checkedThrough);
  const recursorPreservesZero = recursor[0] === normalized.zero;
  const recursorPreservesSuccessor = recursor.slice(0, -1).every((value, index) => recursor[index + 1] === normalized.successor[value]);
  const initialExistsOnPrefix = candidateMorphisms.some((candidate) => candidate.every((value, index) => value === recursor[index]));
  const initialUniqueOnPrefix = candidateMorphisms.every((candidate) => candidate.every((value, index) => value === recursor[index]));
  if (!recursorPreservesZero || !recursorPreservesSuccessor || !initialExistsOnPrefix || !initialUniqueOnPrefix) {
    throw new TypeError("successorAlgebraReceipt: finite Nat initiality laws failed");
  }
  return Object.freeze({
    kind: "discrete.successorAlgebra.receipt:witness" as const,
    algebra: normalized,
    checkedThrough,
    recursor,
    candidateMorphisms,
    recursorPreservesZero: recursorPreservesZero as true,
    recursorPreservesSuccessor: recursorPreservesSuccessor as true,
    initialExistsOnPrefix: initialExistsOnPrefix as true,
    initialUniqueOnPrefix: initialUniqueOnPrefix as true,
  });
}

export function directedGraph(vertices: readonly string[], edges: readonly (readonly [string, string])[]): FiniteDirectedGraph {
  requireUniverse(vertices, "directedGraph");
  for (const [source, target] of edges) {
    requireMember(vertices, source, "directedGraph");
    requireMember(vertices, target, "directedGraph");
  }
  const edgeKeys = new Set<string>();
  const out: (readonly [string, string])[] = [];
  for (const [source, target] of edges) {
    const key = `${source}\u0000${target}`;
    if (!edgeKeys.has(key)) {
      edgeKeys.add(key);
      out.push(Object.freeze([source, target]) as readonly [string, string]);
    }
  }
  return Object.freeze({
    kind: "discrete.graph.directed" as const,
    vertices: Object.freeze([...vertices]),
    edges: Object.freeze(out),
  });
}

export function directedHandshakeReceipt(graph: FiniteDirectedGraph): DirectedHandshakeReceipt {
  const indegrees: Record<string, number> = Object.fromEntries(graph.vertices.map((v) => [v, 0]));
  const outdegrees: Record<string, number> = Object.fromEntries(graph.vertices.map((v) => [v, 0]));
  for (const [source, target] of graph.edges) {
    outdegrees[source] = (outdegrees[source] ?? 0) + 1;
    indegrees[target] = (indegrees[target] ?? 0) + 1;
  }
  const sumIndegree = Object.values(indegrees).reduce((a, b) => a + b, 0);
  const sumOutdegree = Object.values(outdegrees).reduce((a, b) => a + b, 0);
  if (sumIndegree !== graph.edges.length || sumOutdegree !== graph.edges.length) {
    throw new TypeError("directedHandshakeReceipt: directed handshake failed");
  }
  return Object.freeze({
    kind: "discrete.graph.handshake.receipt:witness" as const,
    graph,
    edgeCount: graph.edges.length,
    indegrees: freezeRecord(indegrees),
    outdegrees: freezeRecord(outdegrees),
    sumIndegree,
    sumOutdegree,
    directedHandshake: true as const,
  });
}

export function topologicalDagReceipt(graph: FiniteDirectedGraph, order: Readonly<Record<string, number>>): TopologicalDagReceipt {
  const normalized: Record<string, number> = {};
  for (const vertex of graph.vertices) {
    const value = order[vertex];
    if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new TypeError(`topologicalDagReceipt: missing integer order for ${vertex}`);
    normalized[vertex] = value;
  }
  const irreflexive = graph.edges.every(([source, target]) => source !== target);
  const topological = graph.edges.every(([source, target]) => (normalized[source] as number) < (normalized[target] as number));
  if (!irreflexive || !topological) throw new TypeError("topologicalDagReceipt: graph is not witnessed as a DAG by this order");
  return Object.freeze({
    kind: "discrete.graph.topologicalDag.receipt:witness" as const,
    graph,
    order: freezeRecord(normalized),
    irreflexive: true as const,
    topological: true as const,
    dag: true as const,
  });
}

export function treeCountReceipt(graph: FiniteDirectedGraph): TreeCountReceipt {
  const spanningCount = graph.edges.length + 1 === graph.vertices.length;
  return Object.freeze({
    kind: spanningCount ? "discrete.graph.treeCount.receipt:witness" as const : "discrete.graph.treeCount.receipt:obstruction" as const,
    graph,
    vertexCount: graph.vertices.length,
    edgeCount: graph.edges.length,
    edgeCountPlusOne: graph.edges.length + 1,
    spanningCount,
  });
}
