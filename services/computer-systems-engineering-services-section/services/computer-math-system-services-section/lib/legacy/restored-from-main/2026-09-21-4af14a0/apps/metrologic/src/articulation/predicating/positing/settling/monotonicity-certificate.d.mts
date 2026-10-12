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
import { type Cell } from "../../predication.mjs";
import { type Natural } from "./analysis/exact-number.mjs";
import { type CohomologyCarrier, type RankVanishingJudgment } from "./cohomology.mjs";
export declare const federatedCoverStatementSchema: {
    readonly $id: "relating/articulating/predicating/positing/settling/federated-cover-statement";
    readonly title: "FederatedCoverStatement";
    readonly description: "One source contribution to a logical cell in a federated cover; stance is the local section value.";
    readonly type: "object";
    readonly additionalProperties: false;
    readonly required: readonly ["source", "cell", "stance"];
    readonly properties: {
        readonly source: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly cell: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly stance: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly witness: {
            readonly type: "string";
            readonly minLength: 1;
        };
    };
};
export type FederatedCoverStatement = FromJsonSchema<typeof federatedCoverStatementSchema>;
export interface CoordinationObstructionClass {
    readonly kind: "predication.cohomology.coordinationObstruction";
    readonly cell: string;
    readonly rank: Natural;
    readonly vanishing: RankVanishingJudgment;
    readonly nerve: readonly Cell[];
    readonly cohomology: CohomologyCarrier;
}
export interface MonotonicityCertificate {
    readonly kind: "predication.cohomology.monotonicityCertificate";
    readonly rank: Natural;
    readonly vanishing: RankVanishingJudgment;
    readonly cells: readonly string[];
    readonly obstructions: readonly CoordinationObstructionClass[];
}
/**
 * Compute the monotonicity certificate of a federated cover.
 *
 * H¹ vanishes cellwise when the source-to-stance nerve has no cycle. A nonzero
 * class is returned as a coordination obstruction for that logical cell.
 */
export declare function monotonicityCertificateOfFederatedCover(statements: readonly FederatedCoverStatement[]): MonotonicityCertificate;
