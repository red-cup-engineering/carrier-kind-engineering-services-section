import { claim, mark, token } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/utterance";
import { cell as predicationCell, predicateOfClaim } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { natAdd, natZero } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { cohomologyOfCells, rankVanishing } from "./cohomology.mjs";
export const federatedCoverStatementSchema = {
    $id: "relating/articulating/predicating/positing/settling/federated-cover-statement",
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
};
const coverPredicate = predicateOfClaim(claim(mark("federated-cover-nerve")));
function naturalSize(value) {
    return value.members.length;
}
function coverNerveCells(cellName, statements) {
    return Object.freeze(statements.map((statement) => predicationCell(token(mark(`source:${statement.source}`)), coverPredicate, token(mark(`cell:${cellName}:stance:${statement.stance}`)))));
}
/**
 * Compute the monotonicity certificate of a federated cover.
 *
 * H¹ vanishes cellwise when the source-to-stance nerve has no cycle. A nonzero
 * class is returned as a coordination obstruction for that logical cell.
 */
export function monotonicityCertificateOfFederatedCover(statements) {
    const byCell = new Map();
    for (const statement of statements)
        byCell.set(statement.cell, [...(byCell.get(statement.cell) ?? []), statement]);
    const obstructions = [];
    let totalRank = natZero;
    for (const [cellName, group] of [...byCell.entries()].sort(([left], [right]) => left.localeCompare(right))) {
        // A singleton cover has one edge and therefore no first cohomology.
        // Package-scale policy reads commonly contain thousands of independent
        // singleton cells; do not construct a full predication/cohomology object
        // merely to rediscover that each one is acyclic.
        if (group.length === 1)
            continue;
        const nerve = coverNerveCells(cellName, group);
        const cohomology = cohomologyOfCells(nerve);
        const rank = cohomology.firstCohomology.rank;
        if (naturalSize(rank) === 0)
            continue;
        totalRank = natAdd(totalRank, rank);
        obstructions.push(Object.freeze({
            kind: "predication.cohomology.coordinationObstruction",
            cell: cellName,
            rank,
            vanishing: cohomology.firstCohomology.vanishing,
            nerve,
            cohomology,
        }));
    }
    return Object.freeze({
        kind: "predication.cohomology.monotonicityCertificate",
        rank: totalRank,
        vanishing: rankVanishing(totalRank),
        cells: Object.freeze(obstructions.map((entry) => entry.cell)),
        obstructions: Object.freeze(obstructions),
    });
}
