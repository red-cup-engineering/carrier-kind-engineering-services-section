import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
const idSchema = { type: "string", minLength: 1 };
const stringSequenceSchema = { type: "array", items: idSchema };
export const appOpticDescriptorSchema = {
    $id: "metroplat/apps/optic",
    title: "AppOpticDescriptor",
    description: "An authored app optic: a chosen workbench, inspector, atlas, cockpit, visual field, or workflow over admitted package material.",
    type: "object",
    required: ["kind", "id", "app", "optic", "mode", "domain", "codomain", "evidence"],
    properties: {
        kind: { const: "metroplat.apps.optic" },
        id: idSchema,
        app: { enum: ["blueprint", "verso"] },
        optic: idSchema,
        mode: { enum: ["workbench", "inspector", "atlas", "cockpit", "visual-field", "workflow"] },
        domain: idSchema,
        codomain: idSchema,
        evidence: stringSequenceSchema,
    },
    additionalProperties: false,
};
export const appOpticRegistrySchema = {
    $id: "metroplat/apps/optic-registry",
    title: "AppOpticRegistry",
    description: "The package-level atlas of authored app optics exposed from apps/ without making src/ import app modules.",
    type: "object",
    required: ["kind", "package", "optics", "evidence"],
    properties: {
        kind: { const: "metroplat.apps.optic-registry" },
        package: idSchema,
        optics: { type: "array", items: appOpticDescriptorSchema },
        evidence: stringSequenceSchema,
    },
    additionalProperties: false,
};
const blueprintAppNodeSchema = {
    type: "object",
    required: ["id", "statementKind", "status", "source", "line", "leanDeclarations", "uses", "usedBy"],
    properties: {
        id: idSchema,
        title: { type: "string" },
        statementKind: idSchema,
        status: { enum: ["settled", "frontier", "unstated"] },
        source: idSchema,
        line: { type: "integer", minimum: 1 },
        leanDeclarations: stringSequenceSchema,
        uses: stringSequenceSchema,
        usedBy: stringSequenceSchema,
    },
    additionalProperties: false,
};
const blueprintAppSectionSchema = {
    type: "object",
    required: ["status", "nodes"],
    properties: {
        status: { enum: ["settled", "frontier", "unstated"] },
        nodes: { type: "array", items: blueprintAppNodeSchema },
    },
    additionalProperties: false,
};
const blueprintClaimGraphEdgeSchema = {
    type: "object",
    required: ["from", "to", "relationship", "source", "line"],
    properties: {
        from: idSchema,
        to: idSchema,
        relationship: { const: "uses" },
        source: idSchema,
        line: { type: "integer", minimum: 1 },
    },
    additionalProperties: false,
};
export const blueprintAppDocumentSchema = {
    $id: "metroplat/apps/blueprint/document",
    title: "BlueprintAppDocument",
    description: "Authored Blueprint claim-frontier optic over an admitted Blueprint claim graph.",
    type: "object",
    required: ["kind", "optic", "sources", "settled", "frontier", "unstated", "missingDependencies", "sections", "edges", "evidence"],
    properties: {
        kind: { const: "metroplat.apps.blueprint.document" },
        optic: { const: "blueprint-claim-frontier" },
        sources: stringSequenceSchema,
        settled: { type: "integer", minimum: 0 },
        frontier: { type: "integer", minimum: 0 },
        unstated: { type: "integer", minimum: 0 },
        missingDependencies: stringSequenceSchema,
        sections: { type: "array", items: blueprintAppSectionSchema },
        edges: { type: "array", items: blueprintClaimGraphEdgeSchema },
        evidence: stringSequenceSchema,
    },
    additionalProperties: false,
};
const versoAppCheckSchema = {
    type: "object",
    required: ["name", "checked", "missing"],
    properties: {
        name: { enum: ["lean-catalog", "blueprint-graph"] },
        checked: { type: "boolean" },
        missing: stringSequenceSchema,
    },
    additionalProperties: false,
};
export const versoAppDocumentSchema = {
    $id: "metroplat/apps/verso/document",
    title: "VersoAppDocument",
    description: "Authored Verso exposition-weld optic over an admitted Verso weld report.",
    type: "object",
    required: ["kind", "optic", "sources", "imports", "includes", "theoremReferences", "claimOccurrences", "blueprintNodes", "checkedLeanBlocks", "checks", "ok", "obstructions", "evidence"],
    properties: {
        kind: { const: "metroplat.apps.verso.document" },
        optic: { const: "verso-exposition-weld" },
        sources: stringSequenceSchema,
        imports: stringSequenceSchema,
        includes: stringSequenceSchema,
        theoremReferences: stringSequenceSchema,
        claimOccurrences: stringSequenceSchema,
        blueprintNodes: stringSequenceSchema,
        checkedLeanBlocks: { type: "integer", minimum: 0 },
        checks: { type: "array", items: versoAppCheckSchema },
        ok: { type: "boolean" },
        obstructions: stringSequenceSchema,
        evidence: stringSequenceSchema,
    },
    additionalProperties: false,
};
export const appOpticDescriptorContract = schemaFrom(appOpticDescriptorSchema);
export const appOpticRegistryContract = schemaFrom(appOpticRegistrySchema);
export const blueprintAppDocumentContract = schemaFrom(blueprintAppDocumentSchema);
export const versoAppDocumentContract = schemaFrom(versoAppDocumentSchema);
