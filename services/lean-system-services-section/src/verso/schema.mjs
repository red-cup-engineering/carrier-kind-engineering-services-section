import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
const idSchema = { type: "string", minLength: 1 };
const stringSequenceSchema = { type: "array", items: idSchema };
export const versoExpositionWeldReportSchema = {
    $id: "metroplat/verso/exposition-weld-report",
    title: "VersoExpositionWeldReport",
    description: "A Verso exposition weld report over admitted Verso plates, optional Blueprint claim graph material, and optional Lean declaration catalog material.",
    type: "object",
    required: [
        "kind",
        "sources",
        "imports",
        "includes",
        "leanDeclarations",
        "claimOccurrences",
        "blueprintNodes",
        "checkedLeanBlocks",
        "leanCatalogChecked",
        "blueprintGraphChecked",
        "missingLeanDeclarations",
        "missingBlueprintNodes",
        "ok",
        "evidence",
    ],
    additionalProperties: false,
    properties: {
        kind: { const: "metroplat.verso.exposition-weld-report" },
        sources: stringSequenceSchema,
        imports: stringSequenceSchema,
        includes: stringSequenceSchema,
        leanDeclarations: stringSequenceSchema,
        claimOccurrences: stringSequenceSchema,
        blueprintNodes: stringSequenceSchema,
        checkedLeanBlocks: { type: "integer", minimum: 0 },
        leanCatalogChecked: { type: "boolean" },
        blueprintGraphChecked: { type: "boolean" },
        missingLeanDeclarations: stringSequenceSchema,
        missingBlueprintNodes: stringSequenceSchema,
        ok: { type: "boolean" },
        evidence: stringSequenceSchema,
        mediaType: { type: "string" },
    },
};
export const versoExpositionWeldReportContract = schemaFrom(versoExpositionWeldReportSchema);
