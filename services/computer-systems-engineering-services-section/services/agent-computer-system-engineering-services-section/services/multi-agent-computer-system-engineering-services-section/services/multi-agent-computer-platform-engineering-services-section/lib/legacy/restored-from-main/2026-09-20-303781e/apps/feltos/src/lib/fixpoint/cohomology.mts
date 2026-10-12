/**
 * settling/cohomology — the cohomology of a predication complex.
 *
 * Cells are 1-cells over the entity 0-cells; the zeroth coboundary is the
 * incidence matrix (+1 on object, −1 on subject). H⁰ counts connected components
 * (union-find over entities); H¹ is the cycle rank (cells − entities +
 * components). The Laplacian view (incidenceᵀ·incidence) and its rank/char-poly
 * confirm H⁰ = ker rank and H¹ = coker rank via Smith normal form. Exact
 * throughout over the integer matrix.
 */
import { charge, chargeValue } from "@red-cup-engineering/agentic-enterprise-computer-platform-engineering-services-section/claim-charge";
import { cell as predicationCell, entitySet, predicateOfClaim, predicationSite, termCoincides, type Cell, type PredicationTerm } from "../logic/predicating/predication.mts";
import {
  charPoly, count, fromCount, fromNatural, intAdd, intEqual, intNegate, intOne, intSubtract, intZero,
  magnitude, matTranspose, matmul, monus, natEqual, natIsZero, natLess, rank,
  type Integer, type Matrix, type Natural,
} from "@lenticule-science/articulating/predicating/positing/settling/analysis/exact-number";
import type { Valuation } from "../logic/predicating/evidence/fiber.mts";
import type { ValuationSheaf } from "./sheaf.mts";
import { claim, mark, token } from "../records/utterance/utterance.mts";
import { graphFirstBettiNumberOfEdgeList } from "@lenticule-science/articulating/predicating/positing/settling/analysis/laplacian";

/** Witness that two natural ranks coincide. */
export interface RankIdentityWitness {
  readonly kind: "predication.cohomology.rankIdentity:witness";
  readonly left: Natural;
  readonly right: Natural;
}

/** Obstruction recording that two natural ranks differ. */
export interface RankIdentityObstruction {
  readonly kind: "predication.cohomology.rankIdentity-obstruction";
  readonly left: Natural;
  readonly right: Natural;
}

/** The result of a rank-identity check. */
export type RankIdentityJudgment = RankIdentityWitness | RankIdentityObstruction;

/** Witness that a natural rank is zero. */
export interface RankVanishingWitness {
  readonly kind: "predication.cohomology.rankVanishing:witness";
  readonly rank: Natural;
}

/** Obstruction recording that a natural rank is nonzero. */
export interface RankVanishingObstruction {
  readonly kind: "predication.cohomology.rankVanishing-obstruction";
  readonly rank: Natural;
}

/** The result of a rank-vanishing check. */
export type RankVanishingJudgment = RankVanishingWitness | RankVanishingObstruction;

/** The left rank is strictly less than the right. */
export interface BelowRankComparison { readonly kind: "predication.cohomology.rankComparison.below"; readonly left: Natural; readonly right: Natural; }
/** The left and right ranks are equal. */
export interface SameRankComparison { readonly kind: "predication.cohomology.rankComparison.same"; readonly left: Natural; readonly right: Natural; }
/** The left rank is strictly greater than the right. */
export interface AboveRankComparison { readonly kind: "predication.cohomology.rankComparison.above"; readonly left: Natural; readonly right: Natural; }

/** The result of comparing two natural ranks. */
export type RankComparison = BelowRankComparison | SameRankComparison | AboveRankComparison;

/** The zeroth coboundary operator: entities, cells, and the incidence matrix. */
export interface ZeroCoboundaryMatrix {
  readonly kind: "predication.cohomology.zeroCoboundaryMatrix";
  readonly entities: readonly PredicationTerm[];
  readonly cells: readonly Cell[];
  readonly matrix: Matrix;
}

/** The zeroth cohomology: component count and the indicator cocycle basis. */
export interface ZeroCohomology {
  readonly kind: "predication.cohomology.zeroCohomology";
  readonly rank: Natural;
  readonly cocycleBasis: Matrix;
}

/** The first cohomology: the cycle rank and its vanishing judgment. */
export interface FirstCohomology {
  readonly kind: "predication.cohomology.firstCohomology";
  readonly rank: Natural;
  readonly vanishing: RankVanishingJudgment;
}

/** The full cohomology of a predication complex. */
export interface Cohomology {
  readonly kind: "predication.cohomology";
  readonly entities: readonly PredicationTerm[];
  readonly cells: readonly Cell[];
  readonly zeroCoboundary: ZeroCoboundaryMatrix;
  readonly zeroCohomology: ZeroCohomology;
  readonly firstCohomology: FirstCohomology;
}

/** The graph-Laplacian view of a predication cohomology. */
export interface PredicationCohomologyLaplacian {
  readonly kind: "predication.cohomology.laplacian";
  readonly cohomology: Cohomology;
  readonly incidence: Matrix;
  readonly entityLaplacian: Matrix;
  readonly characteristicPolynomial: readonly Integer[];
  readonly incidenceRank: Natural;
  readonly laplacianRank: Natural;
  readonly zeroCohomologyKernelRank: RankIdentityJudgment;
  readonly firstCohomologyCokernelRank: RankIdentityJudgment;
}

/** Compare two natural ranks for identity. */
export function rankIdentity(left: Natural, right: Natural): RankIdentityJudgment {
  return natEqual(left, right)
    ? Object.freeze({ kind: "predication.cohomology.rankIdentity:witness" as const, left, right })
    : Object.freeze({ kind: "predication.cohomology.rankIdentity-obstruction" as const, left, right });
}

/** Whether a natural rank vanishes. */
export function rankVanishing(rankValue: Natural): RankVanishingJudgment {
  return natIsZero(rankValue)
    ? Object.freeze({ kind: "predication.cohomology.rankVanishing:witness" as const, rank: rankValue })
    : Object.freeze({ kind: "predication.cohomology.rankVanishing-obstruction" as const, rank: rankValue });
}

/** Order two natural ranks. */
export function rankComparison(left: Natural, right: Natural): RankComparison {
  if (natEqual(left, right)) return Object.freeze({ kind: "predication.cohomology.rankComparison.same" as const, left, right });
  return natLess(left, right)
    ? Object.freeze({ kind: "predication.cohomology.rankComparison.below" as const, left, right })
    : Object.freeze({ kind: "predication.cohomology.rankComparison.above" as const, left, right });
}

function uniqueBy<T>(values: readonly T[], same: (left: T, right: T) => boolean): readonly T[] {
  const out: T[] = [];
  for (const value of values) if (!out.some((item) => same(item, value))) out.push(value);
  return Object.freeze(out);
}

/**
 * The cohomology of a valuation: incidence, components (union-find), and cycle rank.
 *
 * `extraEntities` names entities that must be registered even when no cell
 * touches them — an isolated vertex is its own connected component (it
 * contributes to `zeroCohomology.rank` and to the Euler count `entities`),
 * not silently absent because it happens to name no cell. Default empty
 * preserves the exact prior behavior for every existing caller.
 */
export function cohomologyOfValuation(valuation: Valuation, extraEntities: readonly PredicationTerm[] = []): Cohomology {
  const cells = valuation.fibers.flatMap((fiber) => fiber.assignments.map((assignment) => assignment.cell));
  const entities = entitySet([...cells.flatMap((cell) => [cell.subject, cell.object]), ...extraEntities], termCoincides).entities;
  const entityIndex = (entity: PredicationTerm): number | undefined => {
    const index = entities.findIndex((candidate) => termCoincides(candidate, entity));
    return index < 0 ? undefined : index;
  };
  const zeroCoboundary = cells.map((cell) => {
    const row = Array.from({ length: entities.length }, () => intZero);
    const subject = entityIndex(cell.subject);
    const object = entityIndex(cell.object);
    if (object !== undefined) row[object] = intAdd(row[object] ?? intZero, intOne);
    if (subject !== undefined) row[subject] = intAdd(row[subject] ?? intZero, intNegate(intOne));
    return Object.freeze(row);
  });

  const parent = entities.map((_, index) => index);
  const find = (value: number): number => {
    if (parent[value] === value) return value;
    parent[value] = find(parent[value]!);
    return parent[value]!;
  };
  const union = (left: number, right: number): void => {
    parent[find(left)] = find(right);
  };
  for (const cell of cells) {
    const subject = entityIndex(cell.subject);
    const object = entityIndex(cell.object);
    if (subject !== undefined && object !== undefined) union(subject, object);
  }
  const roots = uniqueBy(entities.map((_, index) => find(index)), Object.is);

  const h1Rank = magnitude(intAdd(intSubtract(fromNatural(count(cells)), fromNatural(count(entities))), fromNatural(count(roots))));
  const zeroCoboundaryMatrix: Matrix = Object.freeze(zeroCoboundary);
  const zeroCocycleBasis: Matrix = Object.freeze(
    roots.map((root) => Object.freeze(entities.map((_, index) => find(index) === root ? intOne : intZero))),
  );

  return Object.freeze({
    kind: "predication.cohomology" as const,
    entities: Object.freeze([...entities]),
    cells: Object.freeze(cells),
    zeroCoboundary: Object.freeze({
      kind: "predication.cohomology.zeroCoboundaryMatrix" as const,
      entities: Object.freeze([...entities]),
      cells: Object.freeze(cells),
      matrix: zeroCoboundaryMatrix,
    }),
    zeroCohomology: Object.freeze({
      kind: "predication.cohomology.zeroCohomology" as const,
      rank: count(roots),
      cocycleBasis: zeroCocycleBasis,
    }),
    firstCohomology: Object.freeze({
      kind: "predication.cohomology.firstCohomology" as const,
      rank: h1Rank,
      vanishing: rankVanishing(h1Rank),
    }),
  });
}

/** Read only the first cohomology rank of cells without materializing its incidence matrix or cocycle basis. */
export function firstCohomologyRankOfCells(cells: readonly Cell[], extraEntities: readonly PredicationTerm[] = []): Natural {
  const entities = entitySet([...cells.flatMap((cell) => [cell.subject, cell.object]), ...extraEntities], termCoincides).entities;
  const indexOf = (entity: PredicationTerm): number | undefined => {
    const index = entities.findIndex((candidate) => termCoincides(candidate, entity));
    return index < 0 ? undefined : index;
  };
  const edges: [number, number][] = [];
  let loops = 0;
  for (const cell of cells) {
    const subject = indexOf(cell.subject);
    const object = indexOf(cell.object);
    if (subject === undefined || object === undefined) continue;
    if (subject === object) loops += 1;
    else edges.push([subject, object]);
  }
  return fromCount(graphFirstBettiNumberOfEdgeList(entities.length, edges) + loops);
}

/** The cohomology of a valuation sheaf (its section valuation). */
export function cohomology(sheaf: ValuationSheaf): Cohomology {
  return cohomologyOfValuation(sheaf.section);
}

/**
 * The actual connected components of a cohomology object — which entities
 * fell into which group, not just how many (`zeroCohomology.rank`). Decodes
 * the zero-cocycle basis (one row per component, one column per entity, 1
 * where that entity belongs to that component) back into real entity groups,
 * so a caller that needs "which symbols/nodes cluster together" (the same
 * question a hand-rolled union-find is usually reached for) can read it off
 * the real cohomology instead of re-deriving its own partition.
 */
export function componentsOf(cohomologyObject: Cohomology): readonly (readonly PredicationTerm[])[] {
  const { entities, zeroCohomology } = cohomologyObject;
  return Object.freeze(zeroCohomology.cocycleBasis.map((row) =>
    Object.freeze(entities.filter((_, index) => intEqual(row[index] ?? intZero, intOne)))));
}

/** The cohomology of a list of cells (wrapped in a single potential-charged fiber).
 *  `extraEntities` — see {@link cohomologyOfValuation} — registers entities an
 *  isolated vertex names with no cell of its own. */
export function cohomologyOfCells(cells: readonly Cell[], extraEntities: readonly PredicationTerm[] = []): Cohomology {
  const predication = predicationSite(cells);
  const cohomologyPredicate = predicateOfClaim(claim(mark("cohomology")));
  const valuation: Valuation = Object.freeze({
    kind: "predication.fiber.valuation" as const,
    base: predication.base,
    fibers: Object.freeze([Object.freeze({
      kind: "predication.fiber.algebra" as const,
      predicate: cohomologyPredicate,
      entities: predication.cells.entities,
      assignments: Object.freeze(cells.map((cell) => Object.freeze({
        kind: "predication.fiber.meme" as const,
        cell,
        charge: charge(chargeValue("unknown")),
      }))),
    })]),
  });
  return cohomologyOfValuation(valuation, extraEntities);
}

const edgeGraphPredicate = predicateOfClaim(claim(mark("cohomology.edge-graph")));

/**
 * The cohomology of an undirected graph named by bare string node ids and
 * edge pairs — the shared shape behind every hand-rolled union-find this
 * package used to carry independently (an entity-reference `@graph`, an
 * ActivityPub camp-overlap graph, a wiki link graph): distinct vertices,
 * undirected deduplicated edges. Each edge becomes one real predication cell
 * (`predicationCell`, marks as the terms); every named node is registered as
 * an entity via `extraEntities` even when no edge touches it, so an isolated
 * vertex reads as its own component instead of silently vanishing.
 */
export function cohomologyOfEdgeGraph(
  nodes: readonly string[],
  edges: readonly (readonly [string, string])[],
): Cohomology {
  const cells = edges.map(([left, right]) => predicationCell(token(mark(left)), edgeGraphPredicate, token(mark(right))));
  const allNodes = nodes.map((node) => token(mark(node)));
  return cohomologyOfCells(cells, allNodes);
}

/** The Laplacian view of a cohomology object, with kernel/cokernel rank identities. */
export function cohomologyLaplacian(cohomologyObject: Cohomology): PredicationCohomologyLaplacian {
  const incidence = cohomologyObject.zeroCoboundary.matrix;
  const entityLaplacian: Matrix = incidence.length === 0 ? Object.freeze([]) : matmul(matTranspose(incidence), incidence);
  const incidenceRank = rank(incidence);
  const laplacianRank = rank(entityLaplacian);
  const entityRank = count(cohomologyObject.entities);
  const cellRank = count(cohomologyObject.cells);
  return Object.freeze({
    kind: "predication.cohomology.laplacian" as const,
    cohomology: cohomologyObject,
    incidence,
    entityLaplacian,
    characteristicPolynomial: charPoly(entityLaplacian),
    incidenceRank,
    laplacianRank,
    zeroCohomologyKernelRank: rankIdentity(cohomologyObject.zeroCohomology.rank, monus(entityRank, incidenceRank)),
    firstCohomologyCokernelRank: rankIdentity(cohomologyObject.firstCohomology.rank, monus(cellRank, incidenceRank)),
  });
}

/** The Laplacian of a list of cells. */
export function cohomologyLaplacianOfCells(cells: readonly Cell[]): PredicationCohomologyLaplacian {
  return cohomologyLaplacian(cohomologyOfCells(cells));
}
