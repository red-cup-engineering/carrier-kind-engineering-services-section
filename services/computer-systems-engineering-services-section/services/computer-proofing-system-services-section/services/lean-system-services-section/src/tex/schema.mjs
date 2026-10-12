import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { blueprintClaimGraphSchema } from "../blueprint/schema.mjs";
import { versoExpositionWeldReportSchema } from "../verso/schema.mjs";
const idSchema = { type: "string", minLength: 1 };
const stringSequenceSchema = { type: "array", items: idSchema };
const jsonValueSchema = {};
import { texPlateSchema } from "@red-cup-engineering/tex-engineering-services-section/schema";
export const blueprintTexClaimOccurrenceSchema = {
    $id: "metroplat/tex/blueprint-claim-occurrence",
    title: "BlueprintTexClaimOccurrence",
    description: "A Blueprint TeX claim occurrence with Lean witness incidence and dependency edges.",
    type: "object",
    required: ["kind", "label", "statementKind", "leanDeclarations", "status", "dependencies", "line"],
    additionalProperties: false,
    properties: {
        kind: { const: "metroplat.tex.blueprint.claim-occurrence" },
        label: idSchema,
        statementKind: idSchema,
        title: { type: "string" },
        leanDeclarations: stringSequenceSchema,
        status: { enum: ["settled", "frontier", "unstated"] },
        dependencies: stringSequenceSchema,
        line: { type: "integer", minimum: 1 },
    },
};
export const blueprintTexClaimOccurrenceContract = schemaFrom(blueprintTexClaimOccurrenceSchema);
export const blueprintTexPlateSchema = {
    $id: "metroplat/tex/blueprint-plate",
    title: "BlueprintTexPlate",
    description: "A Blueprint TeX plate admitted as claim-occurrence incidence, not as an app or build runtime.",
    type: "object",
    required: ["kind", "source", "tex", "claimOccurrences"],
    additionalProperties: false,
    properties: {
        kind: { const: "metroplat.tex.blueprint-plate" },
        source: idSchema,
        tex: texPlateSchema,
        claimOccurrences: { type: "array", items: blueprintTexClaimOccurrenceSchema },
        mediaType: { type: "string" },
    },
};
export const blueprintTexPlateContract = schemaFrom(blueprintTexPlateSchema);
export const versoTexPlateSchema = {
    $id: "metroplat/tex/verso-plate",
    title: "VersoTexPlate",
    description: "A Verso authoring plate admitted as exposition welds among imports, includes, Lean declarations, claim-occurrences, and Blueprint nodes.",
    type: "object",
    required: ["kind", "source", "tex", "imports", "includes", "leanDeclarations", "claimOccurrences", "blueprintNodes", "checkedLeanBlocks"],
    additionalProperties: false,
    properties: {
        kind: { const: "metroplat.tex.verso-plate" },
        source: idSchema,
        tex: texPlateSchema,
        imports: stringSequenceSchema,
        includes: stringSequenceSchema,
        leanDeclarations: stringSequenceSchema,
        claimOccurrences: stringSequenceSchema,
        blueprintNodes: stringSequenceSchema,
        checkedLeanBlocks: { type: "integer", minimum: 0 },
        mediaType: { type: "string" },
    },
};
export const versoTexPlateContract = schemaFrom(versoTexPlateSchema);
export const texToolReportSchema = {
    $id: "metroplat/tex/tool-report",
    title: "TexToolReport",
    description: "A TeX-family runtime/tool command observation returned from a service boundary.",
    type: "object",
    required: ["kind", "tool", "command", "args", "exitCode", "stdout", "stderr", "succeeded", "errors", "warnings"],
    additionalProperties: false,
    properties: {
        kind: { const: "metroplat.tex.tool-report" },
        tool: { enum: ["tex-engine", "blueprint-tool", "verso-tool"] },
        command: idSchema,
        args: stringSequenceSchema,
        exitCode: { type: "integer" },
        stdout: { type: "string" },
        stderr: { type: "string" },
        succeeded: { type: "boolean" },
        errors: stringSequenceSchema,
        warnings: stringSequenceSchema,
        mediaType: { type: "string" },
    },
};
export const texToolReportContract = schemaFrom(texToolReportSchema);
export const texWorkspaceSourceSchema = {
    type: "object",
    required: ["path", "text"],
    additionalProperties: false,
    properties: {
        path: idSchema,
        text: { type: "string" },
    },
};
export const texWorkspaceReadRequestSchema = {
    $id: "metroplat/services/tex-workspace/read-request",
    title: "TexWorkspaceReadRequest",
    description: "A filesystem-bounded request to admit TeX, Blueprint-TeX, and Verso authoring files as plates.",
    type: "object",
    required: ["kind", "root"],
    additionalProperties: false,
    properties: {
        kind: { const: "metroplat.tex.workspace-read-request" },
        root: idSchema,
        maxDepth: { type: "integer", minimum: 0 },
        ignore: stringSequenceSchema,
        texRoots: stringSequenceSchema,
        blueprintRoots: stringSequenceSchema,
        versoRoots: stringSequenceSchema,
        at: jsonValueSchema,
        caller: jsonValueSchema,
    },
};
export const texWorkspaceReadRequestContract = schemaFrom(texWorkspaceReadRequestSchema);
export const texWorkspaceReadSchema = {
    $id: "metroplat/services/tex-workspace/read",
    title: "TexWorkspaceRead",
    description: "A TeX-family workspace admitted as file plates plus Blueprint and Verso package projections with service boundary evidence.",
    type: "object",
    required: [
        "kind",
        "operation",
        "root",
        "texSources",
        "blueprintSources",
        "versoSources",
        "texPlates",
        "blueprintPlates",
        "versoPlates",
        "blueprintClaimGraph",
        "versoExpositionWeldReport",
    ],
    additionalProperties: false,
    properties: {
        kind: { const: "metroplat.tex.workspace" },
        operation: { const: "read-tex-workspace" },
        root: idSchema,
        texSources: { type: "array", items: texWorkspaceSourceSchema },
        blueprintSources: { type: "array", items: texWorkspaceSourceSchema },
        versoSources: { type: "array", items: texWorkspaceSourceSchema },
        texPlates: { type: "array", items: texPlateSchema },
        blueprintPlates: { type: "array", items: blueprintTexPlateSchema },
        versoPlates: { type: "array", items: versoTexPlateSchema },
        blueprintClaimGraph: blueprintClaimGraphSchema,
        versoExpositionWeldReport: versoExpositionWeldReportSchema,
    },
};
export const texWorkspaceReadContract = schemaFrom(texWorkspaceReadSchema);
export const texWorkspaceToolObservationRequestSchema = {
    $id: "metroplat/services/tex-workspace/tool-observation-request",
    title: "TexWorkspaceToolObservationRequest",
    description: "A filesystem-bounded request to run one TeX-family tool as a service-owned instrument observation.",
    type: "object",
    required: ["kind", "root", "tool"],
    additionalProperties: false,
    properties: {
        kind: { const: "metroplat.tex.workspace-tool-observation-request" },
        root: idSchema,
        tool: { enum: ["tex-engine", "blueprint-tool", "verso-tool"] },
        command: idSchema,
        args: stringSequenceSchema,
        at: jsonValueSchema,
        caller: jsonValueSchema,
    },
};
export const texWorkspaceToolObservationRequestContract = schemaFrom(texWorkspaceToolObservationRequestSchema);
export const texWorkspaceToolObservationSchema = {
    $id: "metroplat/services/tex-workspace/tool-observation",
    title: "TexWorkspaceToolObservation",
    description: "A TeX, Blueprint, or Verso runtime/tool report wrapped as a contract-lensed service boundary observation.",
    type: "object",
    required: ["kind", "operation", "root", "report"],
    additionalProperties: false,
    properties: {
        kind: { const: "metroplat.tex.workspace-tool-observation" },
        operation: { enum: ["run-tex-workspace-command", "run-blueprint-workspace-command", "run-verso-workspace-command"] },
        root: idSchema,
        report: texToolReportSchema,
    },
};
export const texWorkspaceToolObservationContract = schemaFrom(texWorkspaceToolObservationSchema);
