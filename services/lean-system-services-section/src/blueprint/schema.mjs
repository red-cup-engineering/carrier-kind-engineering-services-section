import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
const idSchema = { type: "string", minLength: 1 };
const stringSequenceSchema = { type: "array", items: idSchema };
const blueprintClaimGraphNodeSchema = {
    type: "object",
    required: ["id", "source", "statementKind", "leanDeclarations", "status", "line"],
    additionalProperties: false,
    properties: {
        id: idSchema,
        source: idSchema,
        statementKind: idSchema,
        title: { type: "string" },
        leanDeclarations: stringSequenceSchema,
        status: { enum: ["settled", "frontier", "unstated"] },
        line: { type: "integer", minimum: 1 },
        part: { type: "string" },
        chapter: { type: "string" },
        chapterLabel: { type: "string" },
        section: { type: "string" },
        subsection: { type: "string" },
    },
};
const blueprintClaimGraphEdgeSchema = {
    type: "object",
    required: ["from", "to", "relationship", "source", "line"],
    additionalProperties: false,
    properties: {
        from: idSchema,
        to: idSchema,
        relationship: { const: "uses" },
        source: idSchema,
        line: { type: "integer", minimum: 1 },
    },
};
export const blueprintClaimGraphSchema = {
    $id: "metroplat/blueprint/claim-graph",
    title: "BlueprintClaimGraph",
    description: "A Blueprint claim-occurrence incidence graph projected from admitted Blueprint TeX plates.",
    type: "object",
    required: ["kind", "sources", "nodes", "edges", "settled", "frontier", "unstated", "missingDependencies"],
    additionalProperties: false,
    properties: {
        kind: { const: "metroplat.blueprint.claim-graph" },
        sources: stringSequenceSchema,
        nodes: { type: "array", items: blueprintClaimGraphNodeSchema },
        edges: { type: "array", items: blueprintClaimGraphEdgeSchema },
        settled: { type: "integer", minimum: 0 },
        frontier: { type: "integer", minimum: 0 },
        unstated: { type: "integer", minimum: 0 },
        missingDependencies: stringSequenceSchema,
        mediaType: { type: "string" },
    },
};
export const blueprintClaimGraphContract = schemaFrom(blueprintClaimGraphSchema);
export const blueprintClaimGraphFindingSchema = {
    $id: "metroplat/blueprint/claim-graph-finding",
    title: "BlueprintClaimGraphFinding",
    description: "A lint finding raised over a Blueprint claim-occurrence incidence graph, or over that graph welded against a Lean declaration catalog.",
    type: "object",
    required: ["code", "severity", "message"],
    additionalProperties: false,
    properties: {
        code: {
            enum: [
                "duplicate-label",
                "missing-upstream",
                "rootless-node",
                "unglued-node",
                "overboxed-definition",
                "label-kind-mismatch",
                "green-without-lean",
                "missing-status",
                "unmatched-lean-reference",
                "green-admitted",
                "red-settled",
            ],
        },
        severity: { enum: ["error", "warning"] },
        nodeId: idSchema,
        message: { type: "string", minLength: 1 },
        source: { type: "string" },
        line: { type: "integer", minimum: 1 },
    },
};
export const blueprintClaimGraphFindingContract = schemaFrom(blueprintClaimGraphFindingSchema);
