import { charge, chargeValue } from "@emsenn/meme-algebra";
import { predicationTermCoincidenceHolds } from "@emsenn/meme-algebra";
import { charPoly, fromCount, fromInt, intAdd, intZero, matTranspose, matmul, monus, natEqual, natIsZero, natLess, rank, type Integer, type Matrix, type Natural } from "@emsenn/meme-algebra";
import type { Valuation } from "./predication-fiber.mjs";
import { entitySet, predicationCarrier, type Cell, type PredicationTerm } from "@emsenn/meme-algebra";
import type { SheafCarrier } from "./predication-valuation-sheaf.mjs";
import { claim, mark } from "@emsenn/meme-algebra";

export interface RankIdentityWitness {
  readonly kind: "predication.cohomology.rankIdentity:witness";
  readonly left: Natural;
  readonly right: Natural;
}

export interface RankIdentityObstruction {
  readonly kind: "predication.cohomology.rankIdentity-obstruction";
  readonly left: Natural;
  readonly right: Natural;
}

export type RankIdentityJudgment = RankIdentityWitness | RankIdentityObstruction;

export interface RankVanishingWitness {
  readonly kind: "predication.cohomology.rankVanishing:witness";
  readonly rank: Natural;
}

export interface RankVanishingObstruction {
  readonly kind: "predication.cohomology.rankVanishing-obstruction";
  readonly rank: Natural;
}

export type RankVanishingJudgment = RankVanishingWitness | RankVanishingObstruction;

export interface BelowRankComparison {
  readonly kind: "predication.cohomology.rankComparison.below";
  readonly left: Natural;
  readonly right: Natural;
}

export interface SameRankComparison {
  readonly kind: "predication.cohomology.rankComparison.same";
  readonly left: Natural;
  readonly right: Natural;
}

export interface AboveRankComparison {
  readonly kind: "predication.cohomology.rankComparison.above";
  readonly left: Natural;
  readonly right: Natural;
}

export type RankComparison = BelowRankComparison | SameRankComparison | AboveRankComparison;

export interface ZeroCoboundaryMatrixCarrier {
  readonly kind: "predication.cohomology.zeroCoboundaryMatrix";
  readonly entities: readonly PredicationTerm[];
  readonly cells: readonly Cell[];
  readonly matrix: Matrix;
}

export interface ZeroCohomologyCarrier {
  readonly kind: "predication.cohomology.zeroCohomology";
  readonly rank: Natural;
  readonly cocycleBasis: Matrix;
}

export interface FirstCohomologyCarrier {
  readonly kind: "predication.cohomology.firstCohomology";
  readonly rank: Natural;
  readonly vanishing: RankVanishingJudgment;
}

export interface CohomologyCarrier {
  readonly kind: "predication.cohomology.carrier";
  readonly entities: readonly PredicationTerm[];
  readonly cells: readonly Cell[];
  readonly zeroCoboundary: ZeroCoboundaryMatrixCarrier;
  readonly zeroCohomology: ZeroCohomologyCarrier;
  readonly firstCohomology: FirstCohomologyCarrier;
}

export interface PredicationCohomologyLaplacian {
  readonly kind: "predication.cohomology.laplacian";
  readonly cohomology: CohomologyCarrier;
  readonly incidence: Matrix;
  readonly entityLaplacian: Matrix;
  readonly characteristicPolynomial: readonly Integer[];
  readonly incidenceRank: Natural;
  readonly laplacianRank: Natural;
  readonly zeroCohomologyKernelRank: RankIdentityJudgment;
  readonly firstCohomologyCokernelRank: RankIdentityJudgment;
}

export function rankIdentity(left: Natural, right: Natural): RankIdentityJudgment {
  return natEqual(left, right)
    ? Object.freeze({ kind: "predication.cohomology.rankIdentity:witness" as const, left, right })
    : Object.freeze({ kind: "predication.cohomology.rankIdentity-obstruction" as const, left, right });
}

export function rankVanishing(rankValue: Natural): RankVanishingJudgment {
  return natIsZero(rankValue)
    ? Object.freeze({ kind: "predication.cohomology.rankVanishing:witness" as const, rank: rankValue })
    : Object.freeze({ kind: "predication.cohomology.rankVanishing-obstruction" as const, rank: rankValue });
}

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

export function cohomologyOfValuation(valuation: Valuation): CohomologyCarrier {
  const cells = valuation.fibers.flatMap((fiber) => fiber.assignments.map((assignment) => assignment.cell));
  const entities = entitySet(cells.flatMap((cell) => [cell.subject, cell.object]), predicationTermCoincidenceHolds).entities;
  const entityIndex = (entity: PredicationTerm): number | undefined => {
    const index = entities.findIndex((candidate) => predicationTermCoincidenceHolds(candidate, entity));
    return index < 0 ? undefined : index;
  };
  const zeroCoboundary = cells.map((cell) => {
    const row = Array.from({ length: entities.length }, () => intZero);
    const subject = entityIndex(cell.subject);
    const object = entityIndex(cell.object);
    if (object !== undefined) row[object] = intAdd(row[object] ?? intZero, fromInt(1));
    if (subject !== undefined) row[subject] = intAdd(row[subject] ?? intZero, fromInt(-1));
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
  const h1Rank = cells.length - entities.length + roots.length;
  const h1RankCarrier = fromCount(h1Rank);
  const zeroCoboundaryMatrix: Matrix = Object.freeze(zeroCoboundary);
  const zeroCocycleBasis: Matrix = Object.freeze(
    roots.map((root) => Object.freeze(entities.map((_, index) => find(index) === root ? fromInt(1) : intZero))),
  );

  return Object.freeze({
    kind: "predication.cohomology.carrier" as const,
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
      rank: fromCount(roots.length),
      cocycleBasis: zeroCocycleBasis,
    }),
    firstCohomology: Object.freeze({
      kind: "predication.cohomology.firstCohomology" as const,
      rank: h1RankCarrier,
      vanishing: rankVanishing(h1RankCarrier),
    }),
  });
}

export function cohomology(sheaf: SheafCarrier): CohomologyCarrier {
  return cohomologyOfValuation(sheaf.section);
}

export function cohomologyOfCells(cells: readonly Cell[]): CohomologyCarrier {
  const predication = predicationCarrier(cells);
  const cohomologyPredicate = claim(mark("cohomology"));
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
        charge: charge(chargeValue("potential")),
      }))),
    })]),
  });
  return cohomologyOfValuation(valuation);
}


export function cohomologyLaplacian(cohomologyCarrier: CohomologyCarrier): PredicationCohomologyLaplacian {
  const incidence = cohomologyCarrier.zeroCoboundary.matrix;
  const entityLaplacian: Matrix = incidence.length === 0
    ? Object.freeze([])
    : matmul(matTranspose(incidence), incidence);
  const incidenceRank = rank(incidence);
  const laplacianRank = rank(entityLaplacian);
  const entityRank = fromCount(cohomologyCarrier.entities.length);
  const cellRank = fromCount(cohomologyCarrier.cells.length);
  return Object.freeze({
    kind: "predication.cohomology.laplacian" as const,
    cohomology: cohomologyCarrier,
    incidence,
    entityLaplacian,
    characteristicPolynomial: charPoly(entityLaplacian),
    incidenceRank,
    laplacianRank,
    zeroCohomologyKernelRank: rankIdentity(cohomologyCarrier.zeroCohomology.rank, monus(entityRank, incidenceRank)),
    firstCohomologyCokernelRank: rankIdentity(cohomologyCarrier.firstCohomology.rank, monus(cellRank, incidenceRank)),
  });
}

export function cohomologyLaplacianOfCells(cells: readonly Cell[]): PredicationCohomologyLaplacian {
  return cohomologyLaplacian(cohomologyOfCells(cells));
}
