import { strictFinitePhase } from "@red-cup-engineering/signchain/contracts/phase";
import { boundaryEvidencePolicy } from "@red-cup-engineering/signchain/contracts/instrument";
import { materialContext, relationalContract, relationalMove, relationalPredicate } from "@red-cup-engineering/signchain/contracts/contract";
import { observationalLens } from "@red-cup-engineering/signchain/contracts/observation-lens";
import { phaseEnergeticObligation } from "@red-cup-engineering/signchain/contracts/energetics";

import { dataArtifactAddress, dataArtifactDescriptor } from "@red-cup-engineering/eavt-services-section/data-artifact-address";

import { identifierSlug } from "@red-cup-engineering/computer-text-content-engineering-services-section/slugify-text";

/**
 * Metroplat's own read options: the Lean-domain fields of
 * `@red-cup-engineering/lean-system-services-section`'s own
 * `LeanWorkspaceReadOptions` (`/workspace` subpath), extended with the
 * package-capability-surface and Codex-session concerns that belong to this
 * application's own service boundary, not the portable Lean/TeX/Blueprint/Verso
 * domain the package owns.
 */

/** Project a carried workspace report request to the pure read options used by the service boundary. */
export function leanWorkspaceReadOptionsFromReportRequest(
  request,
) {
  return Object.freeze({
    ...(request.rootModule === undefined ? {} : { rootModule: request.rootModule }),
    ...(request.maxDepth === undefined ? {} : { maxDepth: request.maxDepth }),
    ...(request.ignore === undefined ? {} : { ignore: request.ignore }),
    ...(request.moduleRoots === undefined ? {} : { moduleRoots: request.moduleRoots }),
    ...(request.declarationIndexPaths === undefined ? {} : { declarationIndexPaths: request.declarationIndexPaths }),
    ...(request.referenceRoots === undefined ? {} : { referenceRoots: request.referenceRoots }),
    ...(request.referenceExtensions === undefined ? {} : { referenceExtensions: request.referenceExtensions }),
    ...(request.includeTexWorkspaceFibers === undefined ? {} : { includeTexWorkspaceFibers: request.includeTexWorkspaceFibers }),
    ...(request.texRoots === undefined ? {} : { texRoots: request.texRoots }),
    ...(request.blueprintRoots === undefined ? {} : { blueprintRoots: request.blueprintRoots }),
    ...(request.versoRoots === undefined ? {} : { versoRoots: request.versoRoots }),
    ...(request.includePackageCapabilitySurface === undefined ? {} : { includePackageCapabilitySurface: request.includePackageCapabilitySurface }),
    ...(request.codexSessionTranscripts === undefined ? {} : { codexSessionTranscripts: request.codexSessionTranscripts }),
    ...(request.codexSessionDiscovery === undefined ? {} : { codexSessionDiscovery: request.codexSessionDiscovery }),
  });
}

export function leanWorkspaceContentArtifactAddress(
  dataRoot,
  rootModule,
  options = {},
) {
  if (options.at === undefined) {
    throw new TypeError("leanWorkspaceContentArtifactAddress: options.at is required; host clocks belong to @red-cup-engineering/node-process-services-section");
  }
  const subject = (identifierSlug(options.subject ?? rootModule) || "lean-workspace");
  const address = dataArtifactAddress({
    root: dataRoot,
    ...(options.rootName === undefined ? {} : { rootName: options.rootName }),
    tier: "content",
    encoding: "json",
    at: String(options.at),
    action: options.action ?? `lean-workspace-${subject}`,
    subject,
  });
  return Object.freeze({
    address,
    artifact: dataArtifactDescriptor("content", address.path, "json"),
  });
}

export function leanWorkspaceContentReadArtifact(contentPath) {
  return dataArtifactDescriptor("content", contentPath, "json");
}

export function leanWorkspaceRelationalConfigurationReportContract(root) {
  const id = "metroplat.contract.lean-workspace.relational-configuration-report";
  const material = materialContext({
    id: "metroplat.material.lean-workspace.relational-configuration-report",
    loci: Object.freeze([
      "filesystem:lean-workspace",
      "Lean module source",
      "Blueprint document fiber",
      "Verso document fiber",
      "package capability surface",
      "Codex session transcript host marks",
      "Lean relational configuration report",
    ]),
    incidence: Object.freeze([
      "src/integrations/lean/workspace/service.mts confines the root and reads Lean host marks from the filesystem",
      "@red-cup-engineering/lean-system-services-section's codec admits toolchain, Lake, module, and declaration-index plates",
      "@red-cup-engineering/lean-system-services-section's view.mts joins environment, declaration catalog, import graph, theorem spine, capability authority, and theorem-reference coverage",
      "src/integrations/lean/tex/workspace-service.mts and src/integrations/openai/codex/service.mts provide optional Blueprint/Verso and session-record fibers without owning the Lean ontology",
      "the service action exposes the joined claim-occurrence report through CLI, HTTP, and MCP as one boundary projection",
    ]),
    fibers: Object.freeze([
      "workspace root",
      "root module",
      "Lean environment",
      "theorem spine",
      "reference coverage",
      "capability authority",
      "session records",
      "relational configuration report",
    ]),
    valueAlgebra: "filesystem-bounded Lean workspace read -> Lean relational configuration report",
    constraints: Object.freeze([
      "filesystem discovery and process-facing host reads remain in src/integrations/lean/workspace/service.mts",
      "Lean file interpretation remains in @red-cup-engineering/lean-system-services-section's codec",
      "configuration joins remain in @red-cup-engineering/lean-system-services-section's view.mts",
      "Codex transcript filesystem reads remain in src/integrations/openai/codex/service.mts",
      "the action refines one boundary contract rather than inventing a second report object",
    ]),
    closure: Object.freeze(["readLeanWorkspace", "readLeanWorkspaceRelationalConfigurationReportAction", "leanRelationalConfigurationReport"]),
    boundary: Object.freeze([root, "filesystem Lean project", "service operation boundary"]),
  });
  const lens = observationalLens({
    id: "metroplat.lens.lean-workspace.relational-configuration-report",
    domain: "metroplat/services/lean-workspace/relational-configuration-report-request",
    boundary: "read-lean-workspace-relational-configuration",
    output: "metroplat/lean/relational-configuration-report",
    preserves: Object.freeze([
      "workspace root",
      "root module",
      "Lean theorem spine",
      "declaration coverage",
      "optional Blueprint/Verso fibers",
      "optional Codex session records",
    ]),
    hides: Object.freeze(["file descriptors", "directory traversal order", "transcript file handles", "package-local process state"]),
    evidenceRequired: true,
  });
  const precondition = relationalPredicate({
    id: "metroplat.predicate.lean-workspace.relational-configuration-report.pre",
    description: "A filesystem-bounded Lean workspace relational-configuration report request is available at the service boundary.",
    entails: Object.freeze(["metroplat/services/lean-workspace/relational-configuration-report-request", "filesystem:lean-workspace"]),
  });
  const postcondition = relationalPredicate({
    id: "metroplat.predicate.lean-workspace.relational-configuration-report.post",
    description: "The Lean workspace, optional document fibers, package capability surface, and Codex session records are joined as one Lean relational configuration report.",
    entails: Object.freeze(["metroplat/lean/relational-configuration-report", "boundary-exposure"]),
  });
  return relationalContract({
    id,
    material,
    precondition,
    move: relationalMove({
      id: "metroplat.move.lean-workspace.relational-configuration-report",
      description: "Read a Lean workspace service request and expose the joined Lean relational configuration report.",
      domain: "metroplat/services/lean-workspace/relational-configuration-report-request",
      codomain: "metroplat/lean/relational-configuration-report",
      effects: Object.freeze(["boundary", "material", "evidence"]),
      partial: true,
      deterministic: true,
    }),
    postcondition,
    phase: strictFinitePhase,
    lens,
    evidencePolicy: boundaryEvidencePolicy,
    energetics: Object.freeze([
      phaseEnergeticObligation({
        id: "metroplat.energy.lean-workspace.relational-configuration-report",
        phase: strictFinitePhase,
        source: precondition.id,
        target: postcondition.id,
        invariant: "The service action spends finite filesystem and optional transcript/document reads while preserving the Lean claim-occurrence report as one boundary exposure.",
        measure: "module count plus document/session-record count",
        evidenceRequired: true,
      }),
    ]),
    refinements: Object.freeze([
      Object.freeze({
        id: "metroplat.refinement.lean-workspace.relational-configuration-report.service-action",
        implementation: "services/lean-workspace:readLeanWorkspaceRelationalConfigurationReportAction",
        refines: "function",
        preserves: Object.freeze([lens.id, boundaryEvidencePolicy.id, "Lean relational configuration report"]),
      }),
    ]),
  });
}
