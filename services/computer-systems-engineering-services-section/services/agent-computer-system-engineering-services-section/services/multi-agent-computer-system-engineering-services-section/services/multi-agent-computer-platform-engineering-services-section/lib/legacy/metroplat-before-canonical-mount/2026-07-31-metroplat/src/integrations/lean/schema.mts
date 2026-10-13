import { schemaFrom, type FromSchema } from "../../lib/schema/contract.mts";
import { blueprintClaimGraphSchema } from "./blueprint/schema.mts";
import { accountabilityReportSchema, accountableTransactionSchema } from "../accountable-transaction/schema.mts";
import { eavtTupleSchema, otlpTracesSchema } from "../../lib/codecs/json/otlp-schema.mts";
import { agentEventChronicleSchema } from "../../lib/codecs/json/otlp-schema.mts";
import { dataArtifactSchemaContractMaterial } from "../../lib/schema/data-artifact.mts";
import { agentStatusReadoutSchema, claimSessionContinuationSchema } from "../../claims/schema.mts";
import { texWorkspaceReadSchema } from "./tex/schema.mts";
import { versoExpositionWeldReportSchema } from "./verso/schema.mts";
import type { AgentEventChronicle } from "../../lib/codecs/json/otlp.mts";

const idSchema = { type: "string", minLength: 1 } as const;
const stringSequenceSchema = { type: "array", items: idSchema } as const;

export const leanWorkspaceCodexSessionTranscriptSchema = {
  type: "object",
  required: ["relative"],
  additionalProperties: false,
  properties: {
    root: { type: "string", minLength: 1 },
    relative: { type: "string", minLength: 1 },
    sessionId: { type: "string", minLength: 1 },
  },
} as const;

export const leanWorkspaceCodexSessionDiscoverySchema = {
  type: "object",
  required: ["root"],
  additionalProperties: false,
  properties: {
    root: { type: "string", minLength: 1 },
    sessionIds: stringSequenceSchema,
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    maxDepth: { type: "integer", minimum: 0 },
    limit: { type: "integer", minimum: 1 },
  },
} as const;

export const leanWorkspaceRelationalConfigurationReportRequestSchema = {
  $id: "metroplat/services/lean-workspace/relational-configuration-report-request",
  title: "LeanWorkspaceRelationalConfigurationReportRequest",
  description: "A filesystem-bounded request to read a Lean claim-occurrence workspace and optional Codex session transcript host marks as one relational configuration report.",
  type: "object",
  required: ["kind", "root"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.workspace-relational-configuration-report-request" },
    root: { type: "string", minLength: 1 },
    rootModule: { type: "string", minLength: 1 },
    maxDepth: { type: "integer", minimum: 0 },
    ignore: stringSequenceSchema,
    moduleRoots: stringSequenceSchema,
    declarationIndexPaths: stringSequenceSchema,
    referenceRoots: stringSequenceSchema,
    referenceExtensions: stringSequenceSchema,
    includeTexWorkspaceFibers: { type: "boolean" },
    texRoots: stringSequenceSchema,
    blueprintRoots: stringSequenceSchema,
    versoRoots: stringSequenceSchema,
    includePackageCapabilitySurface: { type: "boolean" },
    codexSessionTranscripts: { type: "array", items: leanWorkspaceCodexSessionTranscriptSchema },
    codexSessionDiscovery: { type: "array", items: leanWorkspaceCodexSessionDiscoverySchema },
  },
} as const;

export type LeanWorkspaceRelationalConfigurationReportRequest = FromSchema<typeof leanWorkspaceRelationalConfigurationReportRequestSchema>;
export const leanWorkspaceRelationalConfigurationReportRequestContract = schemaFrom(leanWorkspaceRelationalConfigurationReportRequestSchema);

export const leanToolchainSchema = {
  $id: "metroplat/lean/toolchain",
  title: "LeanToolchain",
  description: "A Lean toolchain declaration admitted as package material.",
  type: "object",
  required: ["kind", "toolchain"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.toolchain" },
    toolchain: idSchema,
    version: { type: "string" },
    channel: { type: "string" },
    mediaType: { type: "string" },
  },
} as const;

export type LeanToolchain = FromSchema<typeof leanToolchainSchema>;
export const leanToolchainContract = schemaFrom(leanToolchainSchema);

const lakeRequireSchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: idSchema,
    source: { type: "string" },
    scope: { type: "string" },
  },
} as const;

const lakeLibrarySchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: idSchema,
    roots: stringSequenceSchema,
    sourceDir: { type: "string" },
  },
} as const;

export const leanLakefileSchema = {
  $id: "metroplat/lean/lakefile",
  title: "LeanLakefile",
  description: "A Lake package declaration read as Lean project information.",
  type: "object",
  required: ["kind", "name", "defaultTargets", "requires", "libraries"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.lakefile" },
    name: idSchema,
    version: { type: "string" },
    defaultTargets: stringSequenceSchema,
    requires: { type: "array", items: lakeRequireSchema },
    libraries: { type: "array", items: lakeLibrarySchema },
    mediaType: { type: "string" },
  },
} as const;

export type LeanLakefile = FromSchema<typeof leanLakefileSchema>;
export const leanLakefileContract = schemaFrom(leanLakefileSchema);

export const leanDeclarationSchema = {
  $id: "metroplat/lean/declaration",
  title: "LeanDeclaration",
  description: "A declared Lean name and its proof-status reading from source text.",
  type: "object",
  required: ["kind", "name"],
  additionalProperties: false,
  properties: {
    kind: { enum: ["theorem", "lemma", "def", "inductive", "structure", "class", "axiom", "opaque", "abbrev", "instance"] },
    name: idSchema,
    namespace: { type: "string" },
    line: { type: "integer", minimum: 1 },
    proofStatus: { enum: ["proved", "assumed", "admitted", "unknown"] },
  },
} as const;

export type LeanDeclaration = FromSchema<typeof leanDeclarationSchema>;
export const leanDeclarationContract = schemaFrom(leanDeclarationSchema);

export const leanModuleSchema = {
  $id: "metroplat/lean/module",
  title: "LeanModule",
  description: "A Lean module read as imports plus declarations.",
  type: "object",
  required: ["kind", "id", "imports", "declarations"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.module" },
    id: idSchema,
    path: { type: "string" },
    imports: stringSequenceSchema,
    declarations: { type: "array", items: leanDeclarationSchema },
    mediaType: { type: "string" },
  },
} as const;

export type LeanModule = FromSchema<typeof leanModuleSchema>;
export const leanModuleContract = schemaFrom(leanModuleSchema);

export const leanDeclarationIndexSchema = {
  $id: "metroplat/lean/declaration-index",
  title: "LeanDeclarationIndex",
  description: "A declared obligation index for Lean names that should be present in an environment.",
  type: "object",
  required: ["kind", "source", "declarations"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.declaration-index" },
    source: idSchema,
    declarations: stringSequenceSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanDeclarationIndex = FromSchema<typeof leanDeclarationIndexSchema>;
export const leanDeclarationIndexContract = schemaFrom(leanDeclarationIndexSchema);

export const leanEnvironmentSchema = {
  $id: "metroplat/lean/environment",
  title: "LeanEnvironment",
  description: "A Lean project environment as admitted toolchain, Lake metadata, modules, and declared obligations.",
  type: "object",
  required: ["kind", "rootModule", "modules"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.environment" },
    rootModule: idSchema,
    toolchain: leanToolchainSchema,
    lakefile: leanLakefileSchema,
    declarationIndex: leanDeclarationIndexSchema,
    modules: { type: "array", items: leanModuleSchema },
    mediaType: { type: "string" },
  },
} as const;

export type LeanEnvironment = FromSchema<typeof leanEnvironmentSchema>;
export const leanEnvironmentContract = schemaFrom(leanEnvironmentSchema);

export const leanMetaprogrammingDeclarationSchema = {
  $id: "metroplat/lean/metaprogramming-declaration",
  title: "LeanMetaprogrammingDeclaration",
  description: "A typed Lean declaration intent, renderable as Lean source and readable through the Lean module codec.",
  type: "object",
  required: ["kind", "name", "signature", "body"],
  additionalProperties: false,
  properties: {
    kind: { enum: ["theorem", "lemma", "def", "abbrev"] },
    name: idSchema,
    signature: { type: "string" },
    body: { type: "string" },
    attributes: stringSequenceSchema,
    modifiers: {
      type: "array",
      items: { enum: ["noncomputable", "private", "protected"] },
    },
  },
} as const;

export type LeanMetaprogrammingDeclaration = FromSchema<typeof leanMetaprogrammingDeclarationSchema>;
export const leanMetaprogrammingDeclarationContract = schemaFrom(leanMetaprogrammingDeclarationSchema);

export const leanMetaprogrammingModuleRequestSchema = {
  $id: "metroplat/lean/metaprogramming-module-request",
  title: "LeanMetaprogrammingModuleRequest",
  description: "A pure Lean module-rendering request: imports, an optional namespace, and declarations to synthesize as source.",
  type: "object",
  required: ["kind", "module", "declarations"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.metaprogramming-module-request" },
    module: idSchema,
    path: { type: "string" },
    imports: stringSequenceSchema,
    namespace: { type: "string" },
    declarations: { type: "array", items: leanMetaprogrammingDeclarationSchema },
  },
} as const;

export type LeanMetaprogrammingModuleRequest = FromSchema<typeof leanMetaprogrammingModuleRequestSchema>;
export const leanMetaprogrammingModuleRequestContract = schemaFrom(leanMetaprogrammingModuleRequestSchema);

export const leanMetaprogrammingModuleSchema = {
  $id: "metroplat/lean/metaprogramming-module",
  title: "LeanMetaprogrammingModule",
  description: "A rendered Lean module source plus its decoded Lean module record.",
  type: "object",
  required: ["kind", "module", "text", "declarations", "decodedModule"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.metaprogramming-module" },
    module: idSchema,
    path: { type: "string" },
    text: { type: "string" },
    declarations: stringSequenceSchema,
    decodedModule: leanModuleSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanMetaprogrammingModule = FromSchema<typeof leanMetaprogrammingModuleSchema>;
export const leanMetaprogrammingModuleContract = schemaFrom(leanMetaprogrammingModuleSchema);

const leanDeclarationCatalogEntrySchema = {
  type: "object",
  required: ["module", "name", "kind"],
  additionalProperties: false,
  properties: {
    module: idSchema,
    name: idSchema,
    kind: { enum: ["theorem", "lemma", "def", "inductive", "structure", "class", "axiom", "opaque", "abbrev", "instance"] },
    namespace: { type: "string" },
    line: { type: "integer", minimum: 1 },
    proofStatus: { enum: ["proved", "assumed", "admitted", "unknown"] },
  },
} as const;

export const leanDeclarationCatalogSchema = {
  $id: "metroplat/lean/declaration-catalog",
  title: "LeanDeclarationCatalog",
  description: "A module-indexed catalog of Lean declarations read from admitted Lean modules.",
  type: "object",
  required: ["kind", "rootModule", "entries"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.declaration-catalog" },
    rootModule: idSchema,
    entries: { type: "array", items: leanDeclarationCatalogEntrySchema },
    mediaType: { type: "string" },
  },
} as const;

export type LeanDeclarationCatalog = FromSchema<typeof leanDeclarationCatalogSchema>;
export const leanDeclarationCatalogContract = schemaFrom(leanDeclarationCatalogSchema);

const leanImportGraphNodeSchema = {
  type: "object",
  required: ["id", "workspaceMember"],
  additionalProperties: false,
  properties: {
    id: idSchema,
    path: { type: "string" },
    workspaceMember: { type: "boolean" },
  },
} as const;

const leanImportGraphEdgeSchema = {
  type: "object",
  required: ["from", "to", "relationship", "resolvedBy"],
  additionalProperties: false,
  properties: {
    from: idSchema,
    to: idSchema,
    relationship: { const: "import" },
    resolvedBy: { const: "lean-import" },
  },
} as const;

export const leanImportGraphSchema = {
  $id: "metroplat/lean/import-graph",
  title: "LeanImportGraph",
  description: "A finite Lean import topology over project modules and imported module names.",
  type: "object",
  required: ["kind", "nodes", "edges", "cycles", "h1"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.import-graph" },
    nodes: { type: "array", items: leanImportGraphNodeSchema },
    edges: { type: "array", items: leanImportGraphEdgeSchema },
    cycles: { type: "array", items: stringSequenceSchema },
    h1: { type: "integer", minimum: 0 },
    mediaType: { type: "string" },
  },
} as const;

export type LeanImportGraph = FromSchema<typeof leanImportGraphSchema>;
export const leanImportGraphContract = schemaFrom(leanImportGraphSchema);

const leanTheoremSpineEntrySchema = {
  type: "object",
  required: ["module", "name", "kind"],
  additionalProperties: false,
  properties: {
    module: idSchema,
    name: idSchema,
    kind: { enum: ["theorem", "lemma"] },
    line: { type: "integer", minimum: 1 },
    proofStatus: { enum: ["proved", "assumed", "admitted", "unknown"] },
  },
} as const;

export const leanTheoremSpineSchema = {
  $id: "metroplat/lean/theorem-spine",
  title: "LeanTheoremSpine",
  description: "A theorem/lemma spine read from admitted Lean modules.",
  type: "object",
  required: ["kind", "rootModule", "entries", "admitted"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.theorem-spine" },
    rootModule: idSchema,
    entries: { type: "array", items: leanTheoremSpineEntrySchema },
    admitted: stringSequenceSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanTheoremSpine = FromSchema<typeof leanTheoremSpineSchema>;
export const leanTheoremSpineContract = schemaFrom(leanTheoremSpineSchema);

export const leanObligationCoverageRequestSchema = {
  $id: "metroplat/lean/obligation-coverage-request",
  title: "LeanObligationCoverageRequest",
  description: "A theorem spine paired with declared Lean obligations for coverage reading.",
  type: "object",
  required: ["kind", "spine", "declarationIndex"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.obligation-coverage-request" },
    spine: leanTheoremSpineSchema,
    declarationIndex: leanDeclarationIndexSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanObligationCoverageRequest = FromSchema<typeof leanObligationCoverageRequestSchema>;
export const leanObligationCoverageRequestContract = schemaFrom(leanObligationCoverageRequestSchema);

export const leanObligationCoverageSchema = {
  $id: "metroplat/lean/obligation-coverage",
  title: "LeanObligationCoverage",
  description: "Coverage of declared Lean obligations by an admitted theorem spine.",
  type: "object",
  required: ["kind", "declared", "present", "missing", "extra", "admitted"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.obligation-coverage" },
    declared: { type: "integer", minimum: 0 },
    present: { type: "integer", minimum: 0 },
    missing: stringSequenceSchema,
    extra: stringSequenceSchema,
    admitted: stringSequenceSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanObligationCoverage = FromSchema<typeof leanObligationCoverageSchema>;
export const leanObligationCoverageContract = schemaFrom(leanObligationCoverageSchema);

export const leanFormalizationClaimSchema = {
  $id: "metroplat/lean/formalization-claim",
  title: "LeanFormalizationClaim",
  description: "A claim that a named Lean theorem formalizes a certificate, action, or relational configuration.",
  type: "object",
  required: ["kind", "theorem"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.formalization-claim" },
    theorem: idSchema,
    source: { type: "string" },
    theoremMaturity: { type: "string" },
    environmentMaturity: { type: "string" },
    obligations: stringSequenceSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanFormalizationClaim = FromSchema<typeof leanFormalizationClaimSchema>;
export const leanFormalizationClaimContract = schemaFrom(leanFormalizationClaimSchema);

export const leanFormalizationReportSchema = {
  $id: "metroplat/lean/formalization-report",
  title: "LeanFormalizationReport",
  description: "A report checking a formalization claim against an admitted Lean theorem spine.",
  type: "object",
  required: ["kind", "theorem", "present", "proved", "accepted", "missing", "evidence"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.formalization-report" },
    theorem: idSchema,
    source: { type: "string" },
    present: { type: "boolean" },
    proved: { type: "boolean" },
    accepted: { type: "boolean" },
    proofStatus: { enum: ["proved", "assumed", "admitted", "unknown"] },
    theoremMaturity: { type: "string" },
    environmentMaturity: { type: "string" },
    obligations: stringSequenceSchema,
    missing: stringSequenceSchema,
    evidence: stringSequenceSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanFormalizationReport = FromSchema<typeof leanFormalizationReportSchema>;
export const leanFormalizationReportContract = schemaFrom(leanFormalizationReportSchema);

export const leanFormalizationReportRequestSchema = {
  $id: "metroplat/lean/formalization-report-request",
  title: "LeanFormalizationReportRequest",
  description: "A formalization claim paired with a Lean theorem spine for proof-status checking.",
  type: "object",
  required: ["kind", "claim", "spine"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.formalization-report-request" },
    claim: leanFormalizationClaimSchema,
    spine: leanTheoremSpineSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanFormalizationReportRequest = FromSchema<typeof leanFormalizationReportRequestSchema>;
export const leanFormalizationReportRequestContract = schemaFrom(leanFormalizationReportRequestSchema);

const leanCapabilityReferenceSchema = {
  type: "object",
  required: ["kind", "id"],
  additionalProperties: false,
  properties: {
    kind: { enum: ["action", "schema", "export"] },
    id: idSchema,
  },
} as const;

export const leanCapabilitySurfaceSchema = {
  $id: "metroplat/lean/capability-surface",
  title: "LeanCapabilitySurface",
  description: "Concrete package capabilities that Lean formalization claims may govern.",
  type: "object",
  required: ["kind", "actions", "schemas", "exports"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.capability-surface" },
    actions: stringSequenceSchema,
    schemas: stringSequenceSchema,
    exports: stringSequenceSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanCapabilitySurface = FromSchema<typeof leanCapabilitySurfaceSchema>;
export const leanCapabilitySurfaceContract = schemaFrom(leanCapabilitySurfaceSchema);

export const leanCapabilityClaimSchema = {
  $id: "metroplat/lean/capability-claim",
  title: "LeanCapabilityClaim",
  description: "A claim that a Lean theorem governs concrete package capability references.",
  type: "object",
  required: ["kind", "theorem", "governs"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.capability-claim" },
    theorem: idSchema,
    source: { type: "string" },
    governs: { type: "array", items: leanCapabilityReferenceSchema },
    mediaType: { type: "string" },
  },
} as const;

export type LeanCapabilityClaim = FromSchema<typeof leanCapabilityClaimSchema>;
export const leanCapabilityClaimContract = schemaFrom(leanCapabilityClaimSchema);

export const leanCapabilityClaimIndexSchema = {
  $id: "metroplat/lean/capability-claim-index",
  title: "LeanCapabilityClaimIndex",
  description: "Lean capability authority claims discovered in package text.",
  type: "object",
  required: ["kind", "source", "claims"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.capability-claim-index" },
    source: idSchema,
    claims: { type: "array", items: leanCapabilityClaimSchema },
    mediaType: { type: "string" },
  },
} as const;

export type LeanCapabilityClaimIndex = FromSchema<typeof leanCapabilityClaimIndexSchema>;
export const leanCapabilityClaimIndexContract = schemaFrom(leanCapabilityClaimIndexSchema);

const leanCapabilityAuthorityClaimReportSchema = {
  type: "object",
  required: ["theorem", "theoremPresent", "theoremProved", "proofStatus", "governs", "missingCapabilities"],
  additionalProperties: false,
  properties: {
    theorem: idSchema,
    source: { type: "string" },
    theoremPresent: { type: "boolean" },
    theoremProved: { type: "boolean" },
    proofStatus: { enum: ["proved", "assumed", "admitted", "unknown"] },
    governs: { type: "array", items: leanCapabilityReferenceSchema },
    missingCapabilities: stringSequenceSchema,
  },
} as const;

export const leanCapabilityAuthorityReportSchema = {
  $id: "metroplat/lean/capability-authority-report",
  title: "LeanCapabilityAuthorityReport",
  description: "A report checking Lean theorem authority claims against a theorem spine and real package capability surface.",
  type: "object",
  required: ["kind", "accepted", "claims", "missingTheorems", "unprovedTheorems", "missingCapabilities", "evidence"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.capability-authority-report" },
    accepted: { type: "boolean" },
    claims: { type: "array", items: leanCapabilityAuthorityClaimReportSchema },
    missingTheorems: stringSequenceSchema,
    unprovedTheorems: stringSequenceSchema,
    missingCapabilities: stringSequenceSchema,
    evidence: stringSequenceSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanCapabilityAuthorityReport = FromSchema<typeof leanCapabilityAuthorityReportSchema>;
export const leanCapabilityAuthorityReportContract = schemaFrom(leanCapabilityAuthorityReportSchema);

export const leanCapabilityAuthorityReportRequestSchema = {
  $id: "metroplat/lean/capability-authority-report-request",
  title: "LeanCapabilityAuthorityReportRequest",
  description: "Lean capability claims paired with a theorem spine and concrete package capability surface.",
  type: "object",
  required: ["kind", "claims", "spine", "surface"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.capability-authority-report-request" },
    claims: { type: "array", items: leanCapabilityClaimSchema },
    spine: leanTheoremSpineSchema,
    surface: leanCapabilitySurfaceSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanCapabilityAuthorityReportRequest = FromSchema<typeof leanCapabilityAuthorityReportRequestSchema>;
export const leanCapabilityAuthorityReportRequestContract = schemaFrom(leanCapabilityAuthorityReportRequestSchema);

export const leanRelationalConfigurationReportSchema = {
  $id: "metroplat/lean/relational-configuration-report",
  title: "LeanRelationalConfigurationReport",
  description: "A package-phase report reading a Lean environment, package capability surface, and Lean authority claims as one relational configuration.",
  type: "object",
  required: [
    "kind",
    "rootModule",
    "accepted",
    "modules",
    "theorems",
    "admitted",
    "importCycles",
    "importH1",
    "missingObligations",
    "extraObligations",
    "missingReferences",
    "unprovedReferences",
    "blueprintClaimOccurrences",
    "blueprintFrontier",
    "blueprintMissingDependencies",
    "blueprintMissingLeanDeclarations",
    "blueprintUnprovedLeanDeclarations",
    "versoClaimOccurrences",
    "versoMissingLeanDeclarations",
    "versoMissingBlueprintNodes",
    "documentFiberMissing",
    "accountableTransactions",
    "accountableTransactionReports",
    "accountableTransactionBoundaryClaims",
    "accountableTransactionDisputes",
    "dataArtifacts",
    "artifactBoundaryClaims",
    "artifactObstructions",
    "runtimeTraces",
    "runtimeTraceStatements",
    "runtimeTraceBoundaryClaims",
    "runtimeTraceObstructions",
    "capabilityClaims",
    "authorityAccepted",
    "agentSessionGoals",
    "agentSessionObligations",
    "agentSessionClaims",
    "agentSessionConflicts",
    "agentSessionContinuations",
    "agentSessionStatusSettlements",
    "agentSessionMissing",
    "missingCapabilityTheorems",
    "unprovedCapabilityTheorems",
    "missingCapabilities",
    "evidence",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.relational-configuration-report" },
    rootModule: idSchema,
    accepted: { type: "boolean" },
    modules: { type: "integer", minimum: 0 },
    theorems: { type: "integer", minimum: 0 },
    admitted: stringSequenceSchema,
    importCycles: { type: "array", items: stringSequenceSchema },
    importH1: { type: "integer", minimum: 0 },
    declaredObligations: { type: "integer", minimum: 0 },
    missingObligations: stringSequenceSchema,
    extraObligations: stringSequenceSchema,
    theoremReferences: { type: "integer", minimum: 0 },
    missingReferences: stringSequenceSchema,
    unprovedReferences: stringSequenceSchema,
    blueprintClaimGraph: blueprintClaimGraphSchema,
    blueprintClaimOccurrences: { type: "integer", minimum: 0 },
    blueprintFrontier: { type: "integer", minimum: 0 },
    blueprintMissingDependencies: stringSequenceSchema,
    blueprintMissingLeanDeclarations: stringSequenceSchema,
    blueprintUnprovedLeanDeclarations: stringSequenceSchema,
    versoExpositionWeldReport: versoExpositionWeldReportSchema,
    versoClaimOccurrences: { type: "integer", minimum: 0 },
    versoMissingLeanDeclarations: stringSequenceSchema,
    versoMissingBlueprintNodes: stringSequenceSchema,
    documentFiberMissing: stringSequenceSchema,
    accountableTransactions: { type: "integer", minimum: 0 },
    accountableTransactionReports: { type: "array", items: accountabilityReportSchema },
    accountableTransactionBoundaryClaims: stringSequenceSchema,
    accountableTransactionDisputes: stringSequenceSchema,
    dataArtifacts: { type: "array", items: dataArtifactSchemaContractMaterial.schema },
    artifactBoundaryClaims: stringSequenceSchema,
    artifactObstructions: stringSequenceSchema,
    runtimeTraces: { type: "integer", minimum: 0 },
    runtimeTraceStatements: { type: "array", items: eavtTupleSchema },
    runtimeTraceBoundaryClaims: stringSequenceSchema,
    runtimeTraceObstructions: stringSequenceSchema,
    capabilityActions: { type: "integer", minimum: 0 },
    capabilitySchemas: { type: "integer", minimum: 0 },
    capabilityExports: { type: "integer", minimum: 0 },
    capabilityClaims: { type: "integer", minimum: 0 },
    authorityAccepted: { type: "boolean" },
    agentSessionGoals: { type: "integer", minimum: 0 },
    agentSessionObligations: { type: "integer", minimum: 0 },
    agentSessionClaims: { type: "integer", minimum: 0 },
    agentSessionConflicts: stringSequenceSchema,
    agentSessionContinuations: { type: "array", items: claimSessionContinuationSchema },
    agentSessionStatusSettlements: { type: "array", items: agentStatusReadoutSchema },
    agentSessionMissing: stringSequenceSchema,
    missingCapabilityTheorems: stringSequenceSchema,
    unprovedCapabilityTheorems: stringSequenceSchema,
    missingCapabilities: stringSequenceSchema,
    evidence: stringSequenceSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanRelationalConfigurationReport = FromSchema<typeof leanRelationalConfigurationReportSchema>;
export const leanRelationalConfigurationReportContract = schemaFrom(leanRelationalConfigurationReportSchema);

const leanTheoremReferenceSchema = {
  type: "object",
  required: ["theorem", "source", "line"],
  additionalProperties: false,
  properties: {
    theorem: idSchema,
    source: idSchema,
    line: { type: "integer", minimum: 1 },
    context: { type: "string" },
  },
} as const;

export const leanTheoremReferenceIndexSchema = {
  $id: "metroplat/lean/theorem-reference-index",
  title: "LeanTheoremReferenceIndex",
  description: "Lean theorem names referenced by Node, Markdown, or other package text as formal grounding claims.",
  type: "object",
  required: ["kind", "source", "references"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.theorem-reference-index" },
    source: idSchema,
    references: { type: "array", items: leanTheoremReferenceSchema },
    mediaType: { type: "string" },
  },
} as const;

export type LeanTheoremReferenceIndex = FromSchema<typeof leanTheoremReferenceIndexSchema>;
export const leanTheoremReferenceIndexContract = schemaFrom(leanTheoremReferenceIndexSchema);

export const leanTheoremReferenceCoverageRequestSchema = {
  $id: "metroplat/lean/theorem-reference-coverage-request",
  title: "LeanTheoremReferenceCoverageRequest",
  description: "A theorem-reference index paired with a Lean theorem spine for grounding coverage.",
  type: "object",
  required: ["kind", "index", "spine"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.theorem-reference-coverage-request" },
    index: leanTheoremReferenceIndexSchema,
    spine: leanTheoremSpineSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanTheoremReferenceCoverageRequest = FromSchema<typeof leanTheoremReferenceCoverageRequestSchema>;
export const leanTheoremReferenceCoverageRequestContract = schemaFrom(leanTheoremReferenceCoverageRequestSchema);

export const leanTheoremReferenceCoverageSchema = {
  $id: "metroplat/lean/theorem-reference-coverage",
  title: "LeanTheoremReferenceCoverage",
  description: "Coverage of referenced Lean theorem names by an admitted theorem spine.",
  type: "object",
  required: ["kind", "referenced", "present", "proved", "missing", "unproved", "evidence"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.theorem-reference-coverage" },
    referenced: { type: "integer", minimum: 0 },
    present: { type: "integer", minimum: 0 },
    proved: { type: "integer", minimum: 0 },
    missing: stringSequenceSchema,
    unproved: stringSequenceSchema,
    evidence: stringSequenceSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanTheoremReferenceCoverage = FromSchema<typeof leanTheoremReferenceCoverageSchema>;
export const leanTheoremReferenceCoverageContract = schemaFrom(leanTheoremReferenceCoverageSchema);

const leanProjectTheoremLinkSchema = {
  type: "object",
  required: ["surface", "theorem", "proofStatus", "frontier", "evidence"],
  additionalProperties: false,
  properties: {
    surface: idSchema,
    theorem: idSchema,
    proofStatus: { enum: ["lean-proved", "runtime-finite-receipt", "documented-frontier"] },
    frontier: stringSequenceSchema,
    evidence: stringSequenceSchema,
  },
} as const;

export const leanProjectTheoremMapSchema = {
  $id: "metroplat/lean/project-theorem-map",
  title: "LeanProjectTheoremMap",
  description: "A project-root map from Node-carried package surfaces to the upstream Obsmetrologia theorem names they cite, keeping runtime-finite receipts and open theorem frontiers explicit.",
  type: "object",
  required: ["kind", "package", "rootModule", "links", "openFrontier", "evidence"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.project-theorem-map" },
    package: idSchema,
    rootModule: idSchema,
    links: { type: "array", items: leanProjectTheoremLinkSchema },
    openFrontier: stringSequenceSchema,
    evidence: stringSequenceSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanProjectTheoremMap = FromSchema<typeof leanProjectTheoremMapSchema>;
export const leanProjectTheoremMapContract = schemaFrom(leanProjectTheoremMapSchema);

export const leanWorkspaceModuleSourceSchema = {
  $id: "metroplat/lean/workspace-module-source",
  title: "LeanWorkspaceModuleSource",
  description: "A Lean module source mark read from a live workspace boundary.",
  type: "object",
  required: ["module", "path", "text"],
  additionalProperties: false,
  properties: {
    module: idSchema,
    path: idSchema,
    text: { type: "string" },
  },
} as const;

export type LeanWorkspaceModuleSource = FromSchema<typeof leanWorkspaceModuleSourceSchema>;
export const leanWorkspaceModuleSourceContract = schemaFrom(leanWorkspaceModuleSourceSchema);

const leanWorkspaceTopicReferenceSchema = {
  type: "object",
  required: ["path", "line", "term", "snippet"],
  additionalProperties: false,
  properties: {
    path: idSchema,
    line: { type: "integer", minimum: 1 },
    term: idSchema,
    snippet: { type: "string" },
  },
} as const;

export const leanWorkspaceTopicReadSchema = {
  $id: "metroplat/lean/workspace-topic-read",
  title: "LeanWorkspaceTopicRead",
  description: "A bounded Lean workspace read around selected terms: matching Lean modules plus Blueprint and Verso projections that mention the same material.",
  type: "object",
  required: ["kind", "root", "rootModule", "terms", "moduleSources", "modules", "references", "evidence"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.workspace-topic-read" },
    root: idSchema,
    rootModule: idSchema,
    terms: stringSequenceSchema,
    searchTerms: stringSequenceSchema,
    moduleSources: { type: "array", items: leanWorkspaceModuleSourceSchema },
    modules: { type: "array", items: leanModuleSchema },
    references: { type: "array", items: leanWorkspaceTopicReferenceSchema },
    blueprintClaimGraph: blueprintClaimGraphSchema,
    versoExpositionWeldReport: versoExpositionWeldReportSchema,
    evidence: stringSequenceSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanWorkspaceTopicRead = FromSchema<typeof leanWorkspaceTopicReadSchema>;
export const leanWorkspaceTopicReadContract = schemaFrom(leanWorkspaceTopicReadSchema);

export const leanWorkspaceCodexSessionReadSchema = {
  $id: "metroplat/lean/workspace-codex-session-read",
  title: "LeanWorkspaceCodexSessionRead",
  description: "A Codex session transcript read as a Lean workspace fiber: host path/count evidence plus the admitted OpenAI boundary chronicle.",
  type: "object",
  required: ["root", "relative", "source", "bytes", "events", "chronicle"],
  additionalProperties: false,
  properties: {
    root: idSchema,
    relative: idSchema,
    source: idSchema,
    bytes: { type: "integer", minimum: 0 },
    events: { type: "integer", minimum: 0 },
    chronicle: agentEventChronicleSchema,
  },
} as const;

export type LeanWorkspaceCodexSessionRead = Omit<FromSchema<typeof leanWorkspaceCodexSessionReadSchema>, "chronicle"> & {
  readonly chronicle: AgentEventChronicle;
};
export const leanWorkspaceCodexSessionReadContract = schemaFrom(leanWorkspaceCodexSessionReadSchema);

export const leanWorkspaceReadSchema = {
  $id: "metroplat/lean/workspace",
  title: "LeanWorkspaceRead",
  description: "A live Lean workspace admitted as module sources, decoded Lean module records, document/session fibers, and one relational configuration report.",
  type: "object",
  required: [
    "kind",
    "root",
    "rootModule",
    "moduleSources",
    "conformanceSources",
    "modules",
    "conformanceModules",
    "environment",
    "declarationCatalog",
    "importGraph",
    "theoremSpine",
    "relationalConfigurationReport",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.workspace" },
    root: idSchema,
    rootModule: idSchema,
    moduleSources: { type: "array", items: leanWorkspaceModuleSourceSchema },
    conformanceSources: { type: "array", items: leanWorkspaceModuleSourceSchema },
    modules: { type: "array", items: leanModuleSchema },
    conformanceModules: { type: "array", items: leanModuleSchema },
    codexSessionReads: { type: "array", items: leanWorkspaceCodexSessionReadSchema },
    theoremReferences: leanTheoremReferenceIndexSchema,
    theoremReferenceCoverage: leanTheoremReferenceCoverageSchema,
    capabilitySurface: leanCapabilitySurfaceSchema,
    capabilityClaims: leanCapabilityClaimIndexSchema,
    capabilityAuthorityReport: leanCapabilityAuthorityReportSchema,
    texWorkspaceRead: texWorkspaceReadSchema,
    environment: leanEnvironmentSchema,
    declarationCatalog: leanDeclarationCatalogSchema,
    importGraph: leanImportGraphSchema,
    theoremSpine: leanTheoremSpineSchema,
    relationalConfigurationReport: leanRelationalConfigurationReportSchema,
    obligationCoverage: leanObligationCoverageSchema,
    toolchain: leanToolchainSchema,
    lakefile: leanLakefileSchema,
    declarationIndex: leanDeclarationIndexSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanWorkspaceRead = FromSchema<typeof leanWorkspaceReadSchema>;
export const leanWorkspaceReadContract = schemaFrom(leanWorkspaceReadSchema);

export const leanWorkspaceContentProjectionSchema = {
  $id: "metroplat/lean/workspace-content-projection",
  title: "LeanWorkspaceContentProjection",
  description: "A service boundary receipt for projecting an admitted Lean workspace into a durable data/content artifact.",
  type: "object",
  required: [
    "kind",
    "operation",
    "root",
    "workspaceRoot",
    "path",
    "artifact",
    "bytes",
    "modules",
    "conformanceModules",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.workspace-content-projection" },
    operation: { const: "project-lean-workspace-content" },
    root: idSchema,
    workspaceRoot: idSchema,
    path: idSchema,
    artifact: dataArtifactSchemaContractMaterial.schema,
    bytes: { type: "integer", minimum: 0 },
    modules: { type: "integer", minimum: 0 },
    conformanceModules: { type: "integer", minimum: 0 },
  },
} as const;

export type LeanWorkspaceContentProjection = FromSchema<typeof leanWorkspaceContentProjectionSchema>;
export const leanWorkspaceContentProjectionContract = schemaFrom(leanWorkspaceContentProjectionSchema);

export const leanWorkspaceContentReadSchema = {
  $id: "metroplat/lean/workspace-content-read",
  title: "LeanWorkspaceContentRead",
  description: "A service boundary receipt for reading a durable Lean workspace data/content artifact back into its admitted workspace record.",
  type: "object",
  required: [
    "kind",
    "operation",
    "path",
    "artifact",
    "workspace",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.workspace-content-read" },
    operation: { const: "read-lean-workspace-content" },
    path: idSchema,
    artifact: dataArtifactSchemaContractMaterial.schema,
    workspace: leanWorkspaceReadSchema,
  },
} as const;

export type LeanWorkspaceContentRead = FromSchema<typeof leanWorkspaceContentReadSchema>;
export const leanWorkspaceContentReadContract = schemaFrom(leanWorkspaceContentReadSchema);

export const leanRelationalConfigurationReportRequestSchema = {
  $id: "metroplat/lean/relational-configuration-report-request",
  title: "LeanRelationalConfigurationReportRequest",
  description: "A Lean claim-occurrence environment and optional package/session readings joined as one relational configuration report.",
  type: "object",
  required: ["kind", "environment"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.relational-configuration-report-request" },
    environment: leanEnvironmentSchema,
    importGraph: leanImportGraphSchema,
    theoremSpine: leanTheoremSpineSchema,
    obligationCoverage: leanObligationCoverageSchema,
    theoremReferenceCoverage: leanTheoremReferenceCoverageSchema,
    blueprintClaimGraph: blueprintClaimGraphSchema,
    versoExpositionWeldReport: versoExpositionWeldReportSchema,
    accountableTransactions: { type: "array", items: accountableTransactionSchema },
    dataArtifacts: { type: "array", items: dataArtifactSchemaContractMaterial.schema },
    runtimeTraces: { type: "array", items: otlpTracesSchema },
    openaiChronicles: { type: "array", items: agentEventChronicleSchema },
    agentSessionContinuations: { type: "array", items: claimSessionContinuationSchema },
    agentSessionStatusSettlements: { type: "array", items: agentStatusReadoutSchema },
    capabilitySurface: leanCapabilitySurfaceSchema,
    capabilityClaims: leanCapabilityClaimIndexSchema,
    capabilityAuthorityReport: leanCapabilityAuthorityReportSchema,
    mediaType: { type: "string" },
  },
} as const;

export type LeanRelationalConfigurationReportRequest = FromSchema<typeof leanRelationalConfigurationReportRequestSchema>;
export const leanRelationalConfigurationReportRequestContract = schemaFrom(leanRelationalConfigurationReportRequestSchema);

export const leanBuildReportSchema = {
  $id: "metroplat/lean/build-report",
  title: "LeanBuildReport",
  description: "A Lean command result read as success, errors, and warnings.",
  type: "object",
  required: ["kind", "command", "args", "exitCode", "stdout", "stderr", "succeeded", "errors", "warnings"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.lean.build-report" },
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
} as const;

export type LeanBuildReport = FromSchema<typeof leanBuildReportSchema>;
export const leanBuildReportContract = schemaFrom(leanBuildReportSchema);
