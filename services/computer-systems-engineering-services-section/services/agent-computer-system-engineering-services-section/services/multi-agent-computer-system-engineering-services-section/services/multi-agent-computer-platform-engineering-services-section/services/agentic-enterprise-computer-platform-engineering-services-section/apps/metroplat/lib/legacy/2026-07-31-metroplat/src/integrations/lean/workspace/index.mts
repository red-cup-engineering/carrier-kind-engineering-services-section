import path from "node:path";

import {
  boundaryOnlyPhase,
  boundaryEvidencePolicy,
  materialContext,
  observationalLens,
  phaseEnergeticObligation,
  relationalContract,
  relationalMove,
  relationalPredicate,
  type ContractValue,
  type RelationalContract,
} from "../../../lib/contracts/index.mts";
import type { DataArtifactAddress, DataArtifactDescriptor } from "../../../lib/addressing/index.mts";
import {
  dataArtifactAddress,
  dataArtifactDescriptor,
} from "../../../lib/addressing/index.mts";
import type { LeanLakefile } from "../codec/lakefile.mts";
import type { LeanWorkspaceRelationalConfigurationReportRequest } from "../schema.mts";
import { uniqueSortedStrings } from "../../../lib/values/unique-sorted-strings.mts";
import { projectionSegmentKey } from "../../../lib/codecs/javascript/segment-key.mts";

export type LeanWorkspaceContentOperation = "project-lean-workspace-content" | "read-lean-workspace-content";

export type {
  LeanWorkspaceContentProjection,
  LeanWorkspaceContentRead,
  LeanWorkspaceModuleSource,
  LeanWorkspaceRead,
  LeanWorkspaceRelationalConfigurationReportRequest,
} from "../schema.mts";


export interface LeanWorkspaceCodexSessionTranscript {
  readonly root?: string;
  readonly relative: string;
  readonly sessionId?: string;
}

export interface LeanWorkspaceCodexSessionDiscovery {
  readonly root: string;
  readonly sessionIds?: readonly string[];
  readonly date?: string;
  readonly maxDepth?: number;
  readonly limit?: number;
}

export interface LeanWorkspaceReadOptions {
  readonly rootModule?: string;
  readonly maxDepth?: number;
  readonly ignore?: readonly string[];
  readonly moduleRoots?: readonly string[];
  readonly declarationIndexPaths?: readonly string[];
  readonly referenceRoots?: readonly string[];
  readonly referenceExtensions?: readonly string[];
  readonly includeTexWorkspaceFibers?: boolean;
  readonly texRoots?: readonly string[];
  readonly blueprintRoots?: readonly string[];
  readonly versoRoots?: readonly string[];
  readonly includePackageCapabilitySurface?: boolean;
  readonly codexSessionTranscripts?: readonly LeanWorkspaceCodexSessionTranscript[];
  readonly codexSessionDiscovery?: readonly LeanWorkspaceCodexSessionDiscovery[];
}

export interface LeanWorkspaceContentProjectionOptions {
  readonly at?: ContractValue;
  readonly caller?: ContractValue;
  readonly rootName?: string;
  readonly action?: string;
  readonly subject?: string;
}

export interface LeanWorkspaceContentArtifactAddress {
  readonly address: DataArtifactAddress;
  readonly artifact: DataArtifactDescriptor;
}

export function leanWorkspaceRootModuleFromLakefile(lakefile: LeanLakefile | undefined, fallback: string): string {
  const firstLibrary = lakefile?.libraries[0];
  if (firstLibrary?.roots?.[0] !== undefined) return firstLibrary.roots[0];
  if (firstLibrary?.name !== undefined) return firstLibrary.name;
  return lakefile?.name ?? fallback;
}

export function leanWorkspaceModuleNameFromPath(root: string, file: string, moduleRoots: readonly string[]): string {
  const relative = path.relative(root, file).replace(/\\/gu, "/");
  const withoutExtension = relative.replace(/\.lean$/u, "");
  for (const moduleRoot of moduleRoots) {
    const prefix = `${moduleRoot.replace(/\\/gu, "/").replace(/\/+$/u, "")}/`;
    if (withoutExtension.startsWith(prefix)) return withoutExtension.slice(prefix.length).replace(/\//gu, ".");
  }
  return withoutExtension.replace(/\//gu, ".");
}

export function leanWorkspaceDefaultModuleRoots(): readonly string[] {
  return Object.freeze(["lean", "."]);
}

export const leanWorkspaceIgnoredDirectories = Object.freeze([
  ".git",
  ".lake",
  ".tmp",
  "build",
  "conformance",
  "dist",
  "node_modules",
]);

export const leanWorkspaceDefaultDeclarationIndexPaths = Object.freeze([
  "lean/docs/blueprint/lean_decls",
  "lean/docs/blueprint/src/lean_decls",
  "docs/blueprint/lean_decls",
  "docs/blueprint/src/lean_decls",
  "blueprint/lean_decls",
  "lean_decls",
  "lean-decls.txt",
  "declarations.txt",
]);

export const leanWorkspaceDefaultReferenceRoots = Object.freeze([
  "lean/docs/blueprint",
  "lean/docs/verso",
  "docs/blueprint",
  "docs/verso",
  "src",
  "lib",
  "services",
  "apps",
  "test",
  "dev",
]);

export const leanWorkspaceDefaultReferenceExtensions = Object.freeze([
  ".mts",
  ".ts",
  ".mjs",
  ".js",
  ".md",
  ".tex",
  ".lean",
]);

export function leanWorkspaceLakeLibraryRoots(lakefile: LeanLakefile | undefined): readonly string[] {
  return uniqueSortedStrings((lakefile?.libraries ?? []).flatMap((library) =>
    (library.roots ?? []).length === 0 ? [library.name] : [...(library.roots ?? [])]));
}

export function leanWorkspaceScanRootCandidates(root: string, lakefile: LeanLakefile | undefined): readonly string[] {
  if (leanWorkspaceLakeLibraryRoots(lakefile).length === 0) {
    return Object.freeze([path.join(root, "lean"), root]);
  }
  const roots: string[] = [];
  for (const library of lakefile?.libraries ?? []) {
    const names = (library.roots ?? []).length === 0 ? [library.name] : [...(library.roots ?? [])];
    const sourceDirs = library.sourceDir === undefined ? [".", "lean"] : [library.sourceDir];
    for (const sourceDir of sourceDirs) {
      for (const name of names) {
        roots.push(path.join(root, sourceDir, name));
        roots.push(path.join(root, sourceDir, `${name}.lean`));
      }
    }
  }
  return uniqueSortedStrings(roots);
}

export function leanWorkspaceShouldSkipDirectory(name: string, ignore: ReadonlySet<string> = new Set()): boolean {
  return leanWorkspaceIgnoredDirectories.includes(name) || ignore.has(name);
}

export function leanWorkspaceShouldSkipSource(root: string, target: string): boolean {
  const relative = path.relative(root, target).replace(/\\/gu, "/");
  return relative === "lean/docs" || relative.startsWith("lean/docs/");
}

/** Project a carried workspace report request to the pure read options used by the service boundary. */
export function leanWorkspaceReadOptionsFromReportRequest(
  request: LeanWorkspaceRelationalConfigurationReportRequest,
): LeanWorkspaceReadOptions {
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
  dataRoot: string,
  rootModule: string,
  options: LeanWorkspaceContentProjectionOptions = {},
): LeanWorkspaceContentArtifactAddress {
  if (options.at === undefined) {
    throw new TypeError("leanWorkspaceContentArtifactAddress: options.at is required; host clocks belong to integrations/process");
  }
  const subject = projectionSegmentKey(options.subject ?? rootModule, "lean-workspace");
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

export function leanWorkspaceContentReadArtifact(contentPath: string): DataArtifactDescriptor {
  return dataArtifactDescriptor("content", contentPath, "json");
}

export function leanWorkspaceRelationalConfigurationReportContract(root: string): RelationalContract {
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
      "src/integrations/lean/codec admits toolchain, Lake, module, and declaration-index plates",
      "src/integrations/lean/view.mts joins environment, declaration catalog, import graph, theorem spine, capability authority, and theorem-reference coverage",
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
      "Lean file interpretation remains in src/integrations/lean/codec",
      "configuration joins remain in src/integrations/lean/view.mts",
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
      effects: Object.freeze(["boundary", "material", "evidence"] as const),
      partial: true,
      deterministic: true,
    }),
    postcondition,
    phase: boundaryOnlyPhase,
    lens,
    evidencePolicy: boundaryEvidencePolicy,
    energetics: Object.freeze([
      phaseEnergeticObligation({
        id: "metroplat.energy.lean-workspace.relational-configuration-report",
        phase: boundaryOnlyPhase,
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
        refines: "function" as const,
        preserves: Object.freeze([lens.id, boundaryEvidencePolicy.id, "Lean relational configuration report"]),
      }),
    ]),
  });
}
