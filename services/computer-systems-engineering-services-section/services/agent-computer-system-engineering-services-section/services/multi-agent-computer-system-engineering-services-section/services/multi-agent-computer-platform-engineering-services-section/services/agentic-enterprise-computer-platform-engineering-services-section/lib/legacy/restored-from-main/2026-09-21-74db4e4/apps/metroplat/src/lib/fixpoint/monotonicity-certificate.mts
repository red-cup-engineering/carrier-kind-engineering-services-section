/**
 * settling/monotonicity-certificate — coordination cost from cover cohomology.
 *
 * A federated statement names a source, a logical cell, and the stance that source
 * contributes for that cell. For each logical cell we build the cover nerve as the
 * bipartite graph `source -- stance`, compute H¹ with the existing predication
 * cohomology reader, and expose exactly the nonzero H¹ cells as coordination
 * obstructions. No protocol operation names participate in this certificate.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";

import { claim, mark, token } from "@red-cup-engineering/computer-data-engine/utterance";
import { cell as predicationCell, predicateOfClaim, type Cell } from "@red-cup-engineering/computer-data-engine/predication";
import { natAdd, natZero, type Natural } from "@red-cup-engineering/computer-data-engine/exact-number";
import { cohomologyOfCells, rankVanishing, type CohomologyCarrier as Cohomology, type RankVanishingJudgment } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/cohomology";

export const federatedCoverStatementSchema = {
  $id: "metroplat/closure/federated-cover-statement",
  title: "FederatedCoverStatement",
  description: "One source contribution to a logical cell in a federated cover; stance is the local section value.",
  type: "object",
  additionalProperties: false,
  required: ["source", "cell", "stance"],
  properties: {
    source: { type: "string", minLength: 1 },
    cell: { type: "string", minLength: 1 },
    stance: { type: "string", minLength: 1 },
    witness: { type: "string", minLength: 1 },
  },
} as const;

export type FederatedCoverStatement = FromJsonSchema<typeof federatedCoverStatementSchema>;

export interface CoordinationObstructionClass {
  readonly kind: "predication.cohomology.coordinationObstruction";
  readonly cell: string;
  readonly rank: Natural;
  readonly vanishing: RankVanishingJudgment;
  readonly nerve: readonly Cell[];
  readonly cohomology: Cohomology;
}

export interface MonotonicityCertificate {
  readonly kind: "predication.cohomology.monotonicityCertificate";
  readonly rank: Natural;
  readonly vanishing: RankVanishingJudgment;
  readonly cells: readonly string[];
  readonly obstructions: readonly CoordinationObstructionClass[];
}

const coverPredicate = predicateOfClaim(claim(mark("federated-cover-nerve")));

function naturalSize(value: Natural): number {
  return value.members.length;
}

function coverNerveCells(cellName: string, statements: readonly FederatedCoverStatement[]): readonly Cell[] {
  return Object.freeze(statements.map((statement) => predicationCell(
    token(mark(`source:${statement.source}`)),
    coverPredicate,
    token(mark(`cell:${cellName}:stance:${statement.stance}`)),
  )));
}

/**
 * Compute the monotonicity certificate of a federated cover.
 *
 * H¹ vanishes cellwise when the source-to-stance nerve has no cycle. A nonzero
 * class is returned as a coordination obstruction for that logical cell.
 */
export function monotonicityCertificateOfFederatedCover(
  statements: readonly FederatedCoverStatement[],
): MonotonicityCertificate {
  const byCell = new Map<string, FederatedCoverStatement[]>();
  for (const statement of statements) byCell.set(statement.cell, [...(byCell.get(statement.cell) ?? []), statement]);

  const obstructions: CoordinationObstructionClass[] = [];
  let totalRank = natZero;
  for (const [cellName, group] of [...byCell.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    // A singleton cover has one edge and therefore no first cohomology.
    // Package-scale policy reads commonly contain thousands of independent
    // singleton cells; do not construct a full predication/cohomology object
    // merely to rediscover that each one is acyclic.
    if (group.length === 1) continue;
    const nerve = coverNerveCells(cellName, group);
    const cohomology = cohomologyOfCells(nerve);
    const rank = cohomology.firstCohomology.rank;
    if (naturalSize(rank) === 0) continue;
    totalRank = natAdd(totalRank, rank);
    obstructions.push(Object.freeze({
      kind: "predication.cohomology.coordinationObstruction" as const,
      cell: cellName,
      rank,
      vanishing: cohomology.firstCohomology.vanishing,
      nerve,
      cohomology,
    }));
  }

  return Object.freeze({
    kind: "predication.cohomology.monotonicityCertificate" as const,
    rank: totalRank,
    vanishing: rankVanishing(totalRank),
    cells: Object.freeze(obstructions.map((entry) => entry.cell)),
    obstructions: Object.freeze(obstructions),
  });
}
