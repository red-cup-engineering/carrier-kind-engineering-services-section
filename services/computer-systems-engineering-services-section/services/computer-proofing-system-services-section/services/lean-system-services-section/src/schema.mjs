import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { blueprintClaimGraphSchema } from "./blueprint/schema.mjs";
import { versoExpositionWeldReportSchema } from "./verso/schema.mjs";
const idSchema = { type: "string", minLength: 1 };
const stringSequenceSchema = { type: "array", items: idSchema };
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
};
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
};
const lakeLibrarySchema = {
    type: "object",
    required: ["name"],
    additionalProperties: false,
    properties: {
        name: idSchema,
        roots: stringSequenceSchema,
        sourceDir: { type: "string" },
    },
};
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
};
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
};
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
};
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
};
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
};
export const leanEnvironmentContract = schemaFrom(leanEnvironmentSchema);
export const leanBuildOracleSchema = {
    $id: "lean-system-services-section/build-oracle",
    title: "LeanBuildOracle",
    type: "object",
    required: ["kind", "command", "args", "exitCode", "stdout", "stderr", "succeeded", "errors", "warnings"],
    additionalProperties: false,
    properties: {
        kind: { const: "metroplat.lean.build-oracle" },
        command: { type: "string", minLength: 1 },
        args: { type: "array", items: { type: "string", minLength: 1 } },
        exitCode: { type: "integer" },
        stdout: { type: "string" },
        stderr: { type: "string" },
        succeeded: { type: "boolean" },
        errors: { type: "array", items: { type: "string", minLength: 1 } },
        warnings: { type: "array", items: { type: "string", minLength: 1 } },
        mediaType: { type: "string" },
    },
};
export const leanBuildOracleContract = schemaFrom(leanBuildOracleSchema);
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
};
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
};
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
};
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
};
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
};
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
};
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
};
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
};
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
};
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
};
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
};
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
};
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
};
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
};
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
};
export const leanFormalizationReportRequestContract = schemaFrom(leanFormalizationReportRequestSchema);
const leanCapabilityReferenceSchema = {
    type: "object",
    required: ["kind", "id"],
    additionalProperties: false,
    properties: {
        kind: { enum: ["action", "schema", "export"] },
        id: idSchema,
    },
};
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
};
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
};
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
};
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
};
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
};
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
};
export const leanCapabilityAuthorityReportRequestContract = schemaFrom(leanCapabilityAuthorityReportRequestSchema);
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
};
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
};
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
};
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
};
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
};
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
};
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
};
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
};
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
};
export const leanWorkspaceTopicReadContract = schemaFrom(leanWorkspaceTopicReadSchema);
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
};
export const leanBuildReportContract = schemaFrom(leanBuildReportSchema);
/**
 * Bare Lean-workspace read options: what a live filesystem scan needs to
 * find and bound a Lean project. Metroplat's own service boundary composes
 * this with its Codex-session and package-capability-surface options in its
 * own request schema; this shape names only the Lean/TeX/Blueprint/Verso
 * reading concerns this package's `readLeanWorkspaceCore` uses.
 */
export const leanWorkspaceReadOptionsSchema = {
    $id: "metroplat/lean/workspace-read-options",
    title: "LeanWorkspaceReadOptions",
    description: "Filesystem-bounded options for reading a Lean claim-occurrence workspace.",
    type: "object",
    additionalProperties: false,
    properties: {
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
    },
};
export const leanWorkspaceReadOptionsContract = schemaFrom(leanWorkspaceReadOptionsSchema);
