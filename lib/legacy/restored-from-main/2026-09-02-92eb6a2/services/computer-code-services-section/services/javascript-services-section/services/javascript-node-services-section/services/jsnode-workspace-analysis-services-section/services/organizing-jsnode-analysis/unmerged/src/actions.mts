/**
 * actions - TypeBox/IR boundary for organizing with JSNode.
 *
 * The filesystem readers under ./organizing admit real package/workspace data.
 * This file declares the stable carrier faces those readings project through:
 * one TypeBox declaration per carrier, registered as relating category objects,
 * with identity run-terms for the canonical carrier morphisms.
 */
import { action, carrierFrom, tm, type Action, type DataCarrier, type FromSchema, type JsonValue } from "@emsenn/relating";

export const JSNODE_CORE_PACKAGES = Object.freeze([
  "@emsenn/relating",
  "@emsenn/communicating",
  "@red-cup-engineering/knowing",
  "@red-cup-engineering/playing",
  "@red-cup-engineering/animating",
  "@red-cup-engineering/socializing",
  "@red-cup-engineering/computing",
  "@red-cup-engineering/gaming",
  "@red-cup-engineering/organizing",
] as const);

const corePackageNameSchema = { anyOf: [{ const: "@emsenn/relating" }, { const: "@emsenn/communicating" }, { const: "@red-cup-engineering/knowing" }, { const: "@red-cup-engineering/playing" }, { const: "@red-cup-engineering/animating" }, { const: "@red-cup-engineering/socializing" }, { const: "@red-cup-engineering/computing" }, { const: "@red-cup-engineering/gaming" }, { const: "@red-cup-engineering/organizing" }] } as const;
const identityTerm = tm.lam(tm.var(0));

export type JSNodeCorePackage = typeof JSNODE_CORE_PACKAGES[number];

export const ancestrySchema = { $id: "organizing-with-jsnode/ancestry", title: "OrganizingWithJSNodeAncestry", description: "The nine-package relating-through-organizing spine this JSNode organizer is derived from.", type: "object", required: ["kind", "spine", "substrate", "binder"], properties: { kind: { const: "organizing-with-jsnode.ancestry" }, spine: { minItems: JSNODE_CORE_PACKAGES.length, maxItems: JSNODE_CORE_PACKAGES.length, type: "array", items: corePackageNameSchema }, substrate: { const: "@emsenn/relating" }, binder: { const: "@red-cup-engineering/organizing" } }, additionalProperties: false } as const;

export const ancestryCarrier = carrierFrom(ancestrySchema);

export type OrganizingWithJSNodeAncestry = FromSchema<typeof ancestrySchema>;

export function organizingWithJSNodeAncestry(): OrganizingWithJSNodeAncestry {
  return ancestryCarrier.assert({
    kind: "organizing-with-jsnode.ancestry",
    spine: JSNODE_CORE_PACKAGES,
    substrate: "@emsenn/relating",
    binder: "@red-cup-engineering/organizing",
  });
}

export const packageSummarySchema = { $id: "organizing-with-jsnode/package-summary", title: "JSNodePackageSummary", description: "A public package-summary face over the richer JSNodePackage carrier.", type: "object", required: ["kind", "name", "version", "description", "layer", "lifecycle", "maturity", "dependencies"], properties: { kind: { const: "organizing-with-jsnode.package-summary" }, name: { minLength: 1, type: "string" }, version: { type: "string" }, description: { type: "string" }, layer: { anyOf: [{ const: "lib" }, { const: "apps" }, { const: "services" }, { const: "sites" }, { const: "ops" }] }, lifecycle: { anyOf: [{ const: "active" }, { const: "maintenance" }, { const: "deprecated" }, { const: "decommissioned" }, { const: "abandoned" }] }, maturity: { anyOf: [{ const: "experimental" }, { const: "alpha" }, { const: "beta" }, { const: "stable" }] }, dependencies: { type: "array", items: { type: "string" } } }, additionalProperties: false } as const;

export const packageSummaryCarrier = carrierFrom(packageSummarySchema);

export type JSNodePackageSummary = FromSchema<typeof packageSummarySchema>;

export const workspaceSummarySchema = { $id: "organizing-with-jsnode/workspace-summary", title: "JSNodeWorkspaceSummary", description: "The JSNode workspace read as an organization of package carriers over the nine-package spine.", type: "object", required: ["kind", "root", "packageCount", "packages", "ancestry"], properties: { kind: { const: "organizing-with-jsnode.workspace-summary" }, root: { minLength: 1, type: "string" }, packageCount: { minimum: 0, type: "integer" }, packages: { type: "array", items: { type: "string" } }, ancestry: { type: "array", items: corePackageNameSchema } }, additionalProperties: false } as const;

export const workspaceSummaryCarrier = carrierFrom(workspaceSummarySchema);

export type JSNodeWorkspaceSummary = FromSchema<typeof workspaceSummarySchema>;

export const workspaceGraphSchema = { $id: "organizing-with-jsnode/workspace-graph", title: "JSNodeWorkspaceGraph", description: "The internal workspace dependency graph as an organizing carrier.", type: "object", required: ["kind", "term", "nodes", "edges"], properties: { kind: { const: "organizing-with-jsnode.workspace-graph" }, term: { minLength: 1, type: "string" }, nodes: { type: "array", items: { type: "string" } }, edges: { type: "array", items: { additionalProperties: false, type: "object", required: ["from", "to"], properties: { from: { minLength: 1, type: "string" }, to: { minLength: 1, type: "string" } } } } }, additionalProperties: false } as const;

export const workspaceGraphCarrier = carrierFrom(workspaceGraphSchema);

export type JSNodeWorkspaceGraphCarrier = FromSchema<typeof workspaceGraphSchema>;

export const workspaceSocialBoundarySchema = { $id: "organizing-with-jsnode/workspace-social-boundary", title: "JSNodeWorkspaceSocialBoundary", description: "A JSNode workspace projected into organizing's socializing/computing/gaming boundary faces.", type: "object", required: ["kind", "workspace", "packageCount", "ancestry", "socializing", "computing", "gaming"], properties: { kind: { const: "organizing-with-jsnode.workspace-social-boundary" }, workspace: { minLength: 1, type: "string" }, packageCount: { minimum: 0, type: "integer" }, ancestry: { type: "array", items: corePackageNameSchema }, socializing: { type: "array", items: { type: "string" } }, computing: { type: "array", items: { type: "string" } }, gaming: { type: "array", items: { type: "string" } } }, additionalProperties: false } as const;

export const workspaceSocialBoundaryCarrier = carrierFrom(workspaceSocialBoundarySchema);

export type JSNodeWorkspaceSocialBoundaryCarrier = FromSchema<typeof workspaceSocialBoundarySchema>;

export const workspaceOrganizationSummarySchema = { $id: "organizing-with-jsnode/workspace-organization-summary", title: "JSNodeWorkspaceOrganizationSummary", description: "The derived @red-cup-engineering/organizing organization read back as a compact JSNode workspace carrier.", type: "object", required: ["kind", "workspace", "identity", "packageCount", "members", "glued", "coordination", "socializing", "computing", "gaming", "dependencies", "ancestry"], properties: { kind: { const: "organizing-with-jsnode.workspace-organization-summary" }, workspace: { minLength: 1, type: "string" }, identity: { minLength: 1, type: "string" }, packageCount: { minimum: 0, type: "integer" }, members: { minimum: 0, type: "integer" }, glued: { type: "boolean" }, coordination: { anyOf: [{ const: "coordination-free" }, { const: "consensus-required" }] }, socializing: { minimum: 0, type: "integer" }, computing: { minimum: 0, type: "integer" }, gaming: { minimum: 0, type: "integer" }, dependencies: { minimum: 0, type: "integer" }, ancestry: { type: "array", items: corePackageNameSchema } }, additionalProperties: false } as const;

export const workspaceOrganizationSummaryCarrier = carrierFrom(workspaceOrganizationSummarySchema);

export type JSNodeWorkspaceOrganizationSummaryCarrier = FromSchema<typeof workspaceOrganizationSummarySchema>;

const decommissionReadinessSchema = { anyOf: [{ const: "ready-to-prove" }, { const: "blocked" }, { const: "held" }, { const: "investigate" }] } as const;

const decommissionInvestigationKindSchema = { anyOf: [{ const: "explicit-retirement-signal" }, { const: "blocked-live-use" }, { const: "provider-adapter" }, { const: "cockpit-specialization" }, { const: "archive-restoration" }, { const: "domain-fiber" }, { const: "unclassified-code-island" }] } as const;

const packageDeclaredDependentSchema = { additionalProperties: false, type: "object", required: ["package", "kind", "range"], properties: { package: { minLength: 1, type: "string" }, kind: { anyOf: [{ const: "runtime" }, { const: "dev" }, { const: "peer" }, { const: "optional" }] }, range: { type: "string" } } } as const;

const packageRetirementProofObligationSchema = { additionalProperties: false, type: "object", required: ["kind", "surface", "requirement"], properties: { kind: { anyOf: [{ const: "role-proof" }, { const: "workspace-membership" }, { const: "lockfile-importer" }, { const: "submodule-state" }, { const: "live-reference-scan" }, { const: "focused-verification" }, { const: "filesystem-cleanup" }] }, surface: { minLength: 1, type: "string" }, requirement: { minLength: 1, type: "string" } } } as const;

const packageRetirementProofEvidenceSchema = { additionalProperties: false, type: "object", required: ["kind", "surface", "state", "evidence", "gaps"], properties: { kind: { anyOf: [{ const: "role-proof" }, { const: "workspace-membership" }, { const: "lockfile-importer" }, { const: "submodule-state" }, { const: "live-reference-scan" }, { const: "focused-verification" }, { const: "filesystem-cleanup" }] }, surface: { minLength: 1, type: "string" }, state: { anyOf: [{ const: "observed" }, { const: "absent" }, { const: "requires-check" }] }, evidence: { type: "array", items: { type: "string" } }, gaps: { type: "array", items: { type: "string" } } } } as const;

const packageDecommissionCandidateSchema = { additionalProperties: false, type: "object", required: ["package", "packageDir", "manifestPath", "layer", "lifecycle", "maturity", "readiness", "investigationKind", "investigationSignals", "reasons", "blockers", "markers", "runtimeDependents", "activeRuntimeDependents", "declaredDependents", "activeDeclaredDependents", "sourceConsumers", "sourceImports", "sourceImportFiles", "activeSourceConsumers", "coarseSourceConsumers", "sourceMarkers", "exports", "runtimeDependencies", "declaredDependencies", "bins", "scripts", "proofObligations", "proofEvidence", "nextEvidence"], properties: { package: { minLength: 1, type: "string" }, packageDir: { anyOf: [{ minLength: 1, type: "string" }, { type: "null" }] }, manifestPath: { anyOf: [{ minLength: 1, type: "string" }, { type: "null" }] }, layer: { anyOf: [{ const: "lib" }, { const: "apps" }, { const: "services" }, { const: "sites" }, { const: "ops" }] }, lifecycle: { anyOf: [{ const: "active" }, { const: "maintenance" }, { const: "deprecated" }, { const: "decommissioned" }, { const: "abandoned" }] }, maturity: { anyOf: [{ const: "experimental" }, { const: "alpha" }, { const: "beta" }, { const: "stable" }] }, readiness: decommissionReadinessSchema, investigationKind: decommissionInvestigationKindSchema, investigationSignals: { type: "array", items: { type: "string" } }, reasons: { type: "array", items: { type: "string" } }, blockers: { type: "array", items: { type: "string" } }, markers: { type: "array", items: { type: "string" } }, runtimeDependents: { type: "array", items: { type: "string" } }, activeRuntimeDependents: { type: "array", items: { type: "string" } }, declaredDependents: { type: "array", items: packageDeclaredDependentSchema }, activeDeclaredDependents: { type: "array", items: packageDeclaredDependentSchema }, sourceConsumers: { type: "array", items: { type: "string" } }, sourceImports: { type: "array", items: { additionalProperties: false, type: "object", required: ["consumer", "file", "specifier", "mode", "typeOnly"], properties: { consumer: { minLength: 1, type: "string" }, file: { minLength: 1, type: "string" }, specifier: { minLength: 1, type: "string" }, mode: { minLength: 1, type: "string" }, typeOnly: { type: "boolean" }, name: { minLength: 1, type: "string" } } } }, sourceImportFiles: { type: "array", items: { additionalProperties: false, type: "object", required: ["consumer", "file", "imports", "typeOnlyImports", "specifiers", "symbols"], properties: { consumer: { minLength: 1, type: "string" }, file: { minLength: 1, type: "string" }, imports: { minimum: 0, type: "integer" }, typeOnlyImports: { minimum: 0, type: "integer" }, specifiers: { type: "array", items: { minLength: 1, type: "string" } }, symbols: { type: "array", items: { minLength: 1, type: "string" } } } } }, activeSourceConsumers: { type: "array", items: { type: "string" } }, coarseSourceConsumers: { type: "array", items: { type: "string" } }, sourceMarkers: { type: "array", items: { additionalProperties: false, type: "object", required: ["package", "file", "line", "term", "excerpt"], properties: { package: { minLength: 1, type: "string" }, file: { minLength: 1, type: "string" }, line: { minimum: 1, type: "integer" }, term: { minLength: 1, type: "string" }, excerpt: { type: "string" } } } }, exports: { minimum: 0, type: "integer" }, runtimeDependencies: { type: "array", items: { minLength: 1, type: "string" } }, declaredDependencies: { type: "array", items: { additionalProperties: false, type: "object", required: ["name", "range", "kind"], properties: { name: { minLength: 1, type: "string" }, range: { type: "string" }, kind: { anyOf: [{ const: "runtime" }, { const: "dev" }, { const: "peer" }, { const: "optional" }] } } } }, bins: { type: "array", items: { type: "string" } }, scripts: { type: "array", items: { type: "string" } }, proofObligations: { type: "array", items: packageRetirementProofObligationSchema }, proofEvidence: { type: "array", items: packageRetirementProofEvidenceSchema }, nextEvidence: { type: "array", items: { type: "string" } } } } as const;

export const workspaceDecommissionReadinessSchema = { $id: "organizing-with-jsnode/workspace-decommission-readiness", title: "JSNodeWorkspaceDecommissionReadiness", description: "A conservative package-retirement readiness read over lifecycle, dependency, and source-demand evidence.", type: "object", required: ["kind", "packageCount", "candidateCount", "readyToProve", "blocked", "held", "investigate", "migrationDebt", "candidates"], properties: { kind: { const: "jsnode.decommission-readiness" }, packageCount: { minimum: 0, type: "integer" }, candidateCount: { minimum: 0, type: "integer" }, readyToProve: { minimum: 0, type: "integer" }, blocked: { minimum: 0, type: "integer" }, held: { minimum: 0, type: "integer" }, investigate: { minimum: 0, type: "integer" }, migrationDebt: { type: "array", items: { additionalProperties: false, type: "object", required: ["from", "to"], properties: { from: { minLength: 1, type: "string" }, to: { minLength: 1, type: "string" } } } }, candidates: { type: "array", items: packageDecommissionCandidateSchema } }, additionalProperties: false } as const;

export const workspaceDecommissionReadinessCarrier = carrierFrom(workspaceDecommissionReadinessSchema);

export type JSNodeWorkspaceDecommissionReadinessCarrier = FromSchema<typeof workspaceDecommissionReadinessSchema>;

export const admissionSchema = { $id: "organizing-with-jsnode/admission", title: "JSNodeOrganizerAdmission", description: "The stable carrier face of an organizing-with-jsnode admission or obstruction.", type: "object", required: ["kind", "term", "action", "admitted", "status", "charge"], properties: { kind: { const: "organizing-with-jsnode.organization" }, term: { minLength: 1, type: "string" }, action: { minLength: 1, type: "string" }, admitted: { type: "boolean" }, status: { type: "string" }, charge: {} }, additionalProperties: false } as const;

export const admissionCarrier = carrierFrom(admissionSchema);

export type JSNodeAdmissionCarrier = FromSchema<typeof admissionSchema>;

const packageBinEndpointSchema = { additionalProperties: false, type: "object", required: ["name", "href", "method", "input", "output", "argsQuery", "target", "executable", "protocol", "carrier"], properties: { name: { minLength: 1, type: "string" }, href: { minLength: 1, type: "string" }, method: { const: "POST" }, input: { minLength: 1, type: "string" }, output: { minLength: 1, type: "string" }, argsQuery: { const: "arg" }, target: { minLength: 1, type: "string" }, executable: { minLength: 1, type: "string" }, summary: { type: "string" }, description: { type: "string" }, inputSchema: { type: "object", additionalProperties: {} }, outputSchema: { type: "object", additionalProperties: {} }, annotations: { type: "object", additionalProperties: {} }, protocol: { minLength: 1, type: "string" }, carrier: {} } } as const;

export const packageBinDiscoverySchema = { $id: "organizing-with-jsnode/package-bin-discovery", title: "JSNodePackageBinDiscovery", description: "The package binary discovery face lifted into the current Action/RMN carrier layer.", type: "object", required: ["kind", "package", "protocol", "mediaTypes", "utterances", "observation", "bins"], properties: { kind: { const: "organizing-with-jsnode.package-bin.discovery" }, package: { minLength: 1, type: "string" }, protocol: { minLength: 1, type: "string" }, mediaTypes: { additionalProperties: false, type: "object", required: ["input", "output"], properties: { input: { minLength: 1, type: "string" }, output: { minLength: 1, type: "string" } } }, utterances: { type: "array", items: {} }, observation: {}, bins: { type: "array", items: packageBinEndpointSchema } }, additionalProperties: false } as const;

export const packageBinDiscoveryCarrier = carrierFrom(packageBinDiscoverySchema);

export type JSNodePackageBinDiscoveryCarrier = FromSchema<typeof packageBinDiscoverySchema>;

const packageScriptSchema = { additionalProperties: false, type: "object", required: ["kind", "name", "href", "method", "input", "output", "argsQuery", "target", "executable", "protocol", "term", "strategyTerm", "sessionTerm", "facts"], properties: { kind: { const: "organizing-with-jsnode.package-script" }, name: { minLength: 1, type: "string" }, href: { minLength: 1, type: "string" }, method: { const: "POST" }, input: { minLength: 1, type: "string" }, output: { minLength: 1, type: "string" }, argsQuery: { const: "arg" }, target: { minLength: 1, type: "string" }, executable: { minLength: 1, type: "string" }, summary: { type: "string" }, description: { type: "string" }, inputSchema: { type: "object", additionalProperties: {} }, outputSchema: { type: "object", additionalProperties: {} }, annotations: { type: "object", additionalProperties: {} }, protocol: { minLength: 1, type: "string" }, term: { minLength: 1, type: "string" }, strategyTerm: { minLength: 1, type: "string" }, sessionTerm: { minLength: 1, type: "string" }, facts: { type: "array", items: {} } } } as const;

export const packageScriptCatalogSchema = { $id: "organizing-with-jsnode/package-script-catalog", title: "JSNodePackageScriptCatalog", description: "The package script catalog face lifted into the current Action/RMN carrier layer.", type: "object", required: ["kind", "package", "packageDir", "protocol", "mediaTypes", "utterances", "observation", "discovery", "scripts"], properties: { kind: { const: "organizing-with-jsnode.package-script.catalog" }, package: { minLength: 1, type: "string" }, packageDir: { minLength: 1, type: "string" }, protocol: { minLength: 1, type: "string" }, mediaTypes: { additionalProperties: false, type: "object", required: ["input", "output"], properties: { input: { minLength: 1, type: "string" }, output: { minLength: 1, type: "string" } } }, utterances: { type: "array", items: {} }, observation: {}, discovery: packageBinDiscoveryCarrier.schema, scripts: { type: "array", items: packageScriptSchema } }, additionalProperties: false } as const;

export const packageScriptCatalogCarrier = carrierFrom(packageScriptCatalogSchema);

export type JSNodePackageScriptCatalogCarrier = FromSchema<typeof packageScriptCatalogSchema>;

function identityAction(name: string, domain: DataCarrier<unknown>): Action {
  return action({
    verb: name,
    summary: `Canonicalize ${domain.id} through the relational IR.`,
    description: "Domain and codomain are the same JSON-Schema carrier. Body: the CHL identity term.",
    domain,
    codomain: domain,
    runTerm: identityTerm,
    run: (input: unknown): JsonValue => domain.assert(input) as JsonValue,
  });
}

export const canonicalizeAncestryAction = identityAction(
  "organizing-with-jsnode.canonicalize-ancestry",
  ancestryCarrier,
);

export const canonicalizePackageSummaryAction = identityAction(
  "organizing-with-jsnode.canonicalize-package-summary",
  packageSummaryCarrier,
);

export const canonicalizeWorkspaceSummaryAction = identityAction(
  "organizing-with-jsnode.canonicalize-workspace-summary",
  workspaceSummaryCarrier,
);

export const canonicalizeWorkspaceGraphAction = identityAction(
  "organizing-with-jsnode.canonicalize-workspace-graph",
  workspaceGraphCarrier,
);

export const canonicalizeWorkspaceSocialBoundaryAction = identityAction(
  "organizing-with-jsnode.canonicalize-workspace-social-boundary",
  workspaceSocialBoundaryCarrier,
);

export const canonicalizeWorkspaceOrganizationSummaryAction = identityAction(
  "organizing-with-jsnode.canonicalize-workspace-organization-summary",
  workspaceOrganizationSummaryCarrier,
);

export const canonicalizeWorkspaceDecommissionReadinessAction = identityAction(
  "organizing-with-jsnode.canonicalize-workspace-decommission-readiness",
  workspaceDecommissionReadinessCarrier,
);

export const canonicalizeAdmissionAction = identityAction(
  "organizing-with-jsnode.canonicalize-admission",
  admissionCarrier,
);

export const canonicalizePackageBinDiscoveryAction = identityAction(
  "organizing-with-jsnode.canonicalize-package-bin-discovery",
  packageBinDiscoveryCarrier,
);

export const canonicalizePackageScriptCatalogAction = identityAction(
  "organizing-with-jsnode.canonicalize-package-script-catalog",
  packageScriptCatalogCarrier,
);

export const actions: readonly Action[] = Object.freeze([
  canonicalizeAncestryAction,
  canonicalizePackageSummaryAction,
  canonicalizeWorkspaceSummaryAction,
  canonicalizeWorkspaceGraphAction,
  canonicalizeWorkspaceSocialBoundaryAction,
  canonicalizeWorkspaceOrganizationSummaryAction,
  canonicalizeWorkspaceDecommissionReadinessAction,
  canonicalizeAdmissionAction,
  canonicalizePackageBinDiscoveryAction,
  canonicalizePackageScriptCatalogAction,
]);
