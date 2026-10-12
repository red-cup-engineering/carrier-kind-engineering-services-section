/**
 * integrations/lean/schema - metroplat's own Lean workspace/dashboard schemas.
 *
 * The portable Lean file-plate and domain-report schemas
 * (`LeanEnvironment`, `LeanImportGraph`, `LeanTheoremSpine`, capability and
 * theorem-reference schemas, and the Blueprint/Verso/TeX plate schemas) now
 * live in `@red-cup-engineering/lean-system-services-section`; this module
 * composes them, together with metroplat's own accountable-transaction,
 * data-artifact, OTLP-trace, and agent-session schemas, into metroplat's own
 * request/read shapes: the joined relational-configuration report, the live
 * workspace read, and their service-boundary request/content-projection
 * envelopes.
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import {
  leanCapabilityAuthorityReportSchema,
  leanCapabilityClaimIndexSchema,
  leanCapabilitySurfaceSchema,
  leanDeclarationCatalogSchema,
  leanDeclarationIndexSchema,
  leanEnvironmentSchema,
  leanImportGraphSchema,
  leanLakefileSchema,
  leanModuleSchema,
  leanObligationCoverageSchema,
  leanTheoremReferenceCoverageSchema,
  leanTheoremReferenceIndexSchema,
  leanTheoremSpineSchema,
  leanToolchainSchema,
  leanWorkspaceModuleSourceSchema,
} from "@red-cup-engineering/lean-system-services-section/schema";
import { blueprintClaimGraphSchema } from "@red-cup-engineering/lean-system-services-section/blueprint/schema";
import { versoExpositionWeldReportSchema } from "@red-cup-engineering/lean-system-services-section/verso/schema";
import { texWorkspaceReadSchema } from "@red-cup-engineering/lean-system-services-section/tex/schema";
import { accountabilityReportSchema, accountableTransactionSchema } from "@red-cup-engineering/farolfi/accountable-transaction/schema";
import { eavtTupleSchema, otlpTracesSchema } from "@red-cup-engineering/computer-networking-engineering-services-section/otlp-schema";
import { agentEventChronicleSchema } from "@red-cup-engineering/computer-networking-engineering-services-section/otlp-schema";
import { dataArtifactSchemaContractMaterial } from "@red-cup-engineering/computer-system-engine/journal/data-artifact-schema";
import { claimSessionContinuationSchema } from "@red-cup-engineering/relating/running/session-schema";
import { agentStatusReadoutSchema } from "../../claims/schema.mjs";

const idSchema = { type: "string", minLength: 1 };
const stringSequenceSchema = { type: "array", items: idSchema };

export const leanWorkspaceCodexSessionTranscriptSchema = {
  type: "object",
  required: ["relative"],
  additionalProperties: false,
  properties: {
    root: { type: "string", minLength: 1 },
    relative: { type: "string", minLength: 1 },
    sessionId: { type: "string", minLength: 1 },
  },
};

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
};

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
};

export const leanWorkspaceRelationalConfigurationReportRequestContract = schemaFrom(leanWorkspaceRelationalConfigurationReportRequestSchema);

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
};

export const leanRelationalConfigurationReportContract = schemaFrom(leanRelationalConfigurationReportSchema);

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
};

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
};

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
};

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
};

export const leanRelationalConfigurationReportRequestContract = schemaFrom(leanRelationalConfigurationReportRequestSchema);
