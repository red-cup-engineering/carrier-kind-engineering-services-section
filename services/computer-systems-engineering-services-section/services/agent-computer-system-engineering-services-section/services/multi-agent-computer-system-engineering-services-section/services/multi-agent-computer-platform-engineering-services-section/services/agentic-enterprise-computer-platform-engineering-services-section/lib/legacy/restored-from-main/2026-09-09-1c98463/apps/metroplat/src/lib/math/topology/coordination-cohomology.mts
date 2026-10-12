/**
 * analysis/coordination-cohomology - finite executable runtime surface.
 *
 * Lean models a federated cover nerve by Euler counts: entities |V|, cells |E|,
 * and components |C|. H0 is |C| and H1 is |E| - |V| + |C| under the carried
 * union-find invariant |V| <= |E| + |C|. This module makes that finite
 * coordination-cost receipt executable.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-type-engine/types";
import {
  detailedBalanceImpliesStationary,
  poissonKernel,
  poissonPi,
  ratStochSemiring,
  type DetailedBalanceStationaryWitness,
} from "../../fixpoint/stochastic.mts";

import { toCount } from "@lenticule-science/articulating/predicating/positing/settling/analysis/exact-number";
import type { Cohomology } from "../../fixpoint/cohomology.mts";

export interface CoverNerve {
  readonly kind: "coordinationCohomology.coverNerve";
  readonly entities: number;
  readonly cells: number;
  readonly components: number;
  readonly componentsLeEntities: true;
  readonly entitiesLeCellsAddComponents: true;
}

export const coverNerveObstructionSchema = {
  $id: "metroplat/closure/analysis/coordination-cohomology/cover-nerve-obstruction",
  type: "object",
  required: ["kind", "entities", "cells", "components", "reason"],
  properties: {
    kind: { const: "coordinationCohomology.coverNerve-obstruction" },
    entities: { type: "number" },
    cells: { type: "number" },
    components: { type: "number" },
    reason: { enum: ["negative-count", "empty-component-with-entities", "components-exceed-entities", "union-find-invariant-fails"] },
  },
  additionalProperties: false,
  title: "CoverNerveObstruction",
  description: "The cover nerve's entity/cell/component Euler counts violate the union-find invariant.",
} as const;

export type CoverNerveObstruction = FromJsonSchema<typeof coverNerveObstructionSchema>;

export type CoverNerveJudgment = CoverNerve | CoverNerveObstruction;

export interface CoordinationCostReceipt {
  readonly kind: "coordinationCohomology.cost:witness";
  readonly nerve: CoverNerve;
  readonly h0Rank: number;
  readonly h1Rank: number;
  readonly spanningForestEdges: number;
  readonly coordinationCost: number;
  readonly coordinationFree: boolean;
  readonly forestEquality: boolean;
  readonly h1VanishesIffForest: true;
  readonly h1RankIsCoordinationCost: true;
}

export interface LaplacianDualReceipt {
  readonly kind: "coordinationCohomology.laplacianDual:witness";
  readonly nerve: CoverNerve;
  readonly incidenceRank: number;
  readonly h0KernelRank: number;
  readonly h1CokernelRank: number;
  readonly h0EqualsKernel: true;
  readonly h1EqualsCokernel: true;
}

export interface TreeCoordinationReceipt {
  readonly kind: "coordinationCohomology.tree:witness";
  readonly vertices: number;
  readonly edges: number;
  readonly nerve: CoverNerve;
  readonly edgeCountIdentity: true;
  readonly h1Rank: 0;
  readonly coordinationFree: true;
}

export interface LandauerEntropyReceipt {
  readonly kind: "coordinationCohomology.landauerEntropy:witness";
  readonly nerve: CoverNerve;
  readonly bits: number;
  readonly coordinationCost: number;
  readonly reversible: boolean;
  readonly landauerFree: boolean;
  readonly zeroIffReversible: true;
  readonly equalsCoordinationCost: true;
  readonly stochasticFace: DetailedBalanceStationaryWitness;
  readonly reversibleIsLandauerFree: true;
  readonly bitScale: "one-bit-per-first-cohomology-class";
  readonly physicalScaleBoundary: "exact bit count only; kT-ln2 thermodynamic scaling remains an interpretation boundary";
}

export interface CoordinationCohomologyReceipt {
  readonly kind: "coordinationCohomology.receipt:witness";
  readonly cycle: CoordinationCostReceipt;
  readonly forest: CoordinationCostReceipt;
  readonly tree: TreeCoordinationReceipt;
  readonly laplacian: LaplacianDualReceipt;
  readonly landauer: LandauerEntropyReceipt;
  readonly openFrontier: readonly string[];
}

const assertNat = (name: string, value: number): number => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a safe natural number`);
  }
  return value;
};

export function coverNerveJudgment(entitiesInput: number, cellsInput: number, componentsInput: number): CoverNerveJudgment {
  const entities = assertNat("entities", entitiesInput);
  const cells = assertNat("cells", cellsInput);
  const components = assertNat("components", componentsInput);

  if (entities > 0 && components === 0) {
    return Object.freeze({
      kind: "coordinationCohomology.coverNerve-obstruction" as const,
      entities,
      cells,
      components,
      reason: "empty-component-with-entities" as const,
    });
  }
  if (components > entities) {
    return Object.freeze({
      kind: "coordinationCohomology.coverNerve-obstruction" as const,
      entities,
      cells,
      components,
      reason: "components-exceed-entities" as const,
    });
  }
  if (entities > cells + components) {
    return Object.freeze({
      kind: "coordinationCohomology.coverNerve-obstruction" as const,
      entities,
      cells,
      components,
      reason: "union-find-invariant-fails" as const,
    });
  }

  return Object.freeze({
    kind: "coordinationCohomology.coverNerve" as const,
    entities,
    cells,
    components,
    componentsLeEntities: true as const,
    entitiesLeCellsAddComponents: true as const,
  });
}

export function coverNerve(entities: number, cells: number, components: number): CoverNerve {
  const judgment = coverNerveJudgment(entities, cells, components);
  if (judgment.kind !== "coordinationCohomology.coverNerve") {
    throw new TypeError(`coverNerve: ${judgment.reason}`);
  }
  return judgment;
}

/**
 * The cover nerve of a real cohomology object (`cohomology.mjs`'s
 * `cohomologyOfCells`/`cohomologyOfEdgeGraph`) — the Euler counts read off
 * actual predication cells and their union-find components, not supplied by
 * hand. Every receipt below (`coordinationCostReceipt`, `landauerEntropyReceipt`,
 * `laplacianDualReceipt`, `treeCoordinationReceipt`) composes with this the
 * same way it composes with a hand-built `coverNerve`, but now grounded in
 * real data instead of counts a caller had to derive itself.
 */
export function coverNerveOfCohomology(cohomology: Cohomology): CoverNerve {
  return coverNerve(
    cohomology.entities.length,
    cohomology.cells.length,
    toCount(cohomology.zeroCohomology.rank),
  );
}

export const h0Rank = (nerve: CoverNerve): number => nerve.components;

export const h1Rank = (nerve: CoverNerve): number =>
  nerve.cells + nerve.components - nerve.entities;

export const coordinationFree = (nerve: CoverNerve): boolean => h1Rank(nerve) === 0;

export const forestEquality = (nerve: CoverNerve): boolean =>
  nerve.entities === nerve.cells + nerve.components;

export const landauerBits = (nerve: CoverNerve): number => h1Rank(nerve);

export const landauerZeroIffReversible = (nerve: CoverNerve): boolean =>
  (landauerBits(nerve) === 0) === forestEquality(nerve);

export const landauerEqualsCoordinationCost = (nerve: CoverNerve): boolean =>
  landauerBits(nerve) === nerve.cells - (nerve.entities - nerve.components);

export function coordinationCostReceipt(nerve: CoverNerve): CoordinationCostReceipt {
  const h1 = h1Rank(nerve);
  const spanningForestEdges = nerve.entities - nerve.components;
  const coordinationCost = nerve.cells - spanningForestEdges;
  const h1VanishesIffForest = (h1 === 0) === forestEquality(nerve);
  const h1RankIsCoordinationCost = h1 === coordinationCost;

  if (!h1VanishesIffForest || !h1RankIsCoordinationCost) {
    throw new TypeError("coordinationCostReceipt: cover-nerve Euler laws failed");
  }

  return Object.freeze({
    kind: "coordinationCohomology.cost:witness" as const,
    nerve,
    h0Rank: h0Rank(nerve),
    h1Rank: h1,
    spanningForestEdges,
    coordinationCost,
    coordinationFree: h1 === 0,
    forestEquality: forestEquality(nerve),
    h1VanishesIffForest: true as const,
    h1RankIsCoordinationCost: true as const,
  });
}

export function laplacianDualReceipt(nerve: CoverNerve): LaplacianDualReceipt {
  const incidenceRank = nerve.entities - nerve.components;
  const h0KernelRank = nerve.entities - incidenceRank;
  const h1CokernelRank = nerve.cells - incidenceRank;
  const h0EqualsKernel = h0Rank(nerve) === h0KernelRank;
  const h1EqualsCokernel = h1Rank(nerve) === h1CokernelRank;

  if (!h0EqualsKernel || !h1EqualsCokernel) {
    throw new TypeError("laplacianDualReceipt: kernel/cokernel rank identities failed");
  }

  return Object.freeze({
    kind: "coordinationCohomology.laplacianDual:witness" as const,
    nerve,
    incidenceRank,
    h0KernelRank,
    h1CokernelRank,
    h0EqualsKernel: true as const,
    h1EqualsCokernel: true as const,
  });
}

export function treeCoordinationReceipt(verticesInput: number): TreeCoordinationReceipt {
  const vertices = assertNat("vertices", verticesInput);
  if (vertices === 0) throw new TypeError("treeCoordinationReceipt: a finite tree has at least one vertex");
  const edges = vertices - 1;
  const nerve = coverNerve(vertices, edges, 1);
  const h1 = h1Rank(nerve);
  if (h1 !== 0) throw new TypeError("treeCoordinationReceipt: tree H1 rank did not vanish");

  return Object.freeze({
    kind: "coordinationCohomology.tree:witness" as const,
    vertices,
    edges,
    nerve,
    edgeCountIdentity: true as const,
    h1Rank: 0 as const,
    coordinationFree: true as const,
  });
}

export function landauerEntropyReceipt(nerve: CoverNerve = coverNerve(3, 3, 1)): LandauerEntropyReceipt {
  const bits = landauerBits(nerve);
  const coordinationCost = nerve.cells - (nerve.entities - nerve.components);
  const zeroIffReversible = landauerZeroIffReversible(nerve);
  const equalsCoordinationCost = landauerEqualsCoordinationCost(nerve);
  const stochasticFace = detailedBalanceImpliesStationary(poissonKernel, ratStochSemiring, poissonPi);
  const reversibleIsLandauerFree = stochasticFace.detailedBalance && stochasticFace.rowsSumToOne && stochasticFace.stationary;

  if (!zeroIffReversible || !equalsCoordinationCost || !reversibleIsLandauerFree) {
    throw new TypeError("landauerEntropyReceipt: Landauer/cohomology reversibility laws failed");
  }

  return Object.freeze({
    kind: "coordinationCohomology.landauerEntropy:witness" as const,
    nerve,
    bits,
    coordinationCost,
    reversible: forestEquality(nerve),
    landauerFree: bits === 0,
    zeroIffReversible: true as const,
    equalsCoordinationCost: true as const,
    stochasticFace,
    reversibleIsLandauerFree: true as const,
    bitScale: "one-bit-per-first-cohomology-class" as const,
    physicalScaleBoundary: "exact bit count only; kT-ln2 thermodynamic scaling remains an interpretation boundary" as const,
  });
}

export function coordinationCohomologyReceipt(): CoordinationCohomologyReceipt {
  const cycle = coverNerve(3, 3, 1);
  const forest = coverNerve(4, 2, 2);
  return Object.freeze({
    kind: "coordinationCohomology.receipt:witness" as const,
    cycle: coordinationCostReceipt(cycle),
    forest: coordinationCostReceipt(forest),
    tree: treeCoordinationReceipt(5),
    laplacian: laplacianDualReceipt(cycle),
    landauer: landauerEntropyReceipt(cycle),
    openFrontier: Object.freeze([
      "General component counting from arbitrary graph reachability is still runtime-frontier work; this nerve requires the union-find invariant.",
      "A nonzero H1 rank is a coordination-cost count, not a runtime proof that a concrete monotone global section is obstructed without a total order.",
      "Cech gluing existence is read from finite settling cohomology; arbitrary cover sheaves are outside this runtime.",
      "Landauer entropy is reported as exact H1 bit count; physical kT ln2 scaling and entropy-production units remain outside this Node surface.",
    ]),
  });
}
