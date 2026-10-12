import type { BlueprintClaimGraph } from "../blueprint/schema.mjs";
import type { LeanDeclarationCatalog } from "../schema.mjs";
import type { VersoTexPlate } from "../tex/schema.mjs";
import { type VersoExpositionWeldReport } from "./schema.mjs";
export { versoExpositionWeldReportContract, versoExpositionWeldReportSchema, type VersoExpositionWeldReport, } from "./schema.mjs";
export type VersoExpositionWeldReportOptions = Readonly<{
    blueprint?: BlueprintClaimGraph;
    leanDeclarations?: LeanDeclarationCatalog;
}>;
export declare function versoExpositionWeldReport(input: VersoTexPlate | readonly VersoTexPlate[], options?: VersoExpositionWeldReportOptions): VersoExpositionWeldReport;
