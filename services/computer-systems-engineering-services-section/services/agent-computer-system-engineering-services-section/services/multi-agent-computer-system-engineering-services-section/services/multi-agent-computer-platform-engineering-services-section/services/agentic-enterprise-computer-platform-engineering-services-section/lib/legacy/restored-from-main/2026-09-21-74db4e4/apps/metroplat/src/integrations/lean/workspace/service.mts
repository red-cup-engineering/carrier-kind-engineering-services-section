/**
 * @packageDocumentation
 *
 * integrations/lean/workspace/service - live Lean project host-mark scanning.
 *
 * This service owns metroplat's own filesystem and process boundaries for
 * Lean workspaces: package-capability-surface introspection, Codex session
 * transcript fibers, a durable content-artifact projection, and Lean/Lake
 * command observations. The portable Lean/TeX/Blueprint/Verso domain read
 * (file plate codecs, import/theorem/coverage readouts, and the core
 * filesystem walk) lives in `@red-cup-engineering/lean-system-services-section`
 * and is composed here through `readLeanWorkspaceCore`, not re-derived.
 */
import path from "node:path";
import { canonicalBytes } from "../../../lib/identity/index.mts";

import { requirePackageManifest } from "../../../workspace/package-manifest.mts";
import { binSurfaceOfPackageManifest } from "../../../workspace/bins/index.mts";
import {
  leanWorkspaceCodexSessionReadContract,
  leanWorkspaceContentProjectionContract,
  leanWorkspaceContentReadContract,
  leanWorkspaceReadContract,
  type LeanWorkspaceCodexSessionRead,
} from "../schema.mts";
import {
  leanWorkspaceTopicReadContract,
  type LeanWorkspaceTopicRead,
} from "@red-cup-engineering/lean-system-services-section";
import { exportSurfaceOfPackageManifest } from "../../../workspace/exports/index.mts";
import { packageSurfaceOf } from "../../../workspace/package-surface.mts";
import { schemasOfOperations, type Operation } from "../../../rpc/index.mts";
import {
  jsonResource,
  parse,
  type JsonRecord,
} from "../../../lib/codecs/json/index.mts";
import {
  decodeLeanLakefileToml,
  decodeLeanModule,
  type LeanLakefile,
} from "@red-cup-engineering/lean-system-services-section/codec";
import {
  leanBuildReportContract,
  leanCapabilityAuthorityReport,
  leanCapabilitySurfaceFromPackageSurface,
  leanDeclarationCatalog,
  leanTheoremReferenceCoverage,
  mergeLeanTheoremReferenceIndexes,
  readLeanWorkspaceCore,
  collectLeanSources,
  sourceReferenceFiles,
  type LeanBuildReport,
  type LeanCapabilitySurface,
  type LeanDeclarationIndex,
  type LeanTheoremSpine,
  type LeanTheoremReferenceIndex,
} from "@red-cup-engineering/lean-system-services-section";
import { leanWorkspaceRootModuleFromLakefile } from "@red-cup-engineering/lean-system-services-section/workspace";
import { leanRelationalConfigurationReport, leanTheoremReferencesFromOpenAIChronicle } from "../view.mts";
import {
  discoverCodexSessionTranscripts,
  readCodexSessionTranscript,
  type CodexSessionTranscriptRead,
} from "../../openai/codex/service.mts";
import { decodeBlueprintTexPlate } from "@red-cup-engineering/lean-system-services-section/blueprint/codec";
import { blueprintClaimGraph } from "@red-cup-engineering/lean-system-services-section/blueprint/view";
import { decodeVersoTexPlate } from "@red-cup-engineering/lean-system-services-section/verso/codec";
import { versoExpositionWeldReport } from "@red-cup-engineering/lean-system-services-section/verso/view";
import { readTexWorkspace } from "@red-cup-engineering/lean-system-services-section/tex/workspace-service";
import { pathExists, readFileUtf8, writeFileAtomic } from "../../../lib/filesystem/index.mts";
import { executeJavascriptNodeCommand } from "@red-cup-engineering/execute-javascript-node-command-service";
import {
  processCommandExitCode,
  processCommandLifecycleRecord,
  processDiagnosticLines,
  processIsoNow,
} from "@red-cup-engineering/node-process-services-section";
import type { ServiceLifecycleEvent } from "@red-cup-engineering/node-process-services-section/lifecycle-schema";
import {
  recordServiceLifecycleRecord,
  type ServiceLifecyclePersistence,
} from "../../../dashboards/service-lifecycle/index.mts";
import {
  leanWorkspaceContentArtifactAddress,
  leanWorkspaceContentReadArtifact,
  type LeanWorkspaceContentProjection,
  type LeanWorkspaceContentProjectionOptions,
  type LeanWorkspaceContentRead,
  type LeanWorkspaceModuleSource,
  type LeanWorkspaceRead,
  type LeanWorkspaceReadOptions,
} from "./index.mts";

export type {
  LeanWorkspaceCodexSessionDiscovery,
  LeanWorkspaceCodexSessionTranscript,
  LeanWorkspaceContentArtifactAddress,
  LeanWorkspaceContentProjection,
  LeanWorkspaceContentProjectionOptions,
  LeanWorkspaceContentRead,
  LeanWorkspaceModuleSource,
  LeanWorkspaceRead,
  LeanWorkspaceReadOptions,
} from "./index.mts";

export interface LeanWorkspaceTopicReadOptions extends LeanWorkspaceReadOptions {
  readonly terms: readonly string[];
  readonly aliases?: Readonly<Record<string, readonly string[]>>;
  readonly maxReferencesPerFile?: number;
}

export interface LeanCommandOptions {
  readonly command?: string;
  readonly args?: readonly string[];
  readonly at?: string;
  readonly lifecycle?: ((event: ServiceLifecycleEvent) => void) | undefined;
  readonly lifecyclePersistence?: ServiceLifecyclePersistence | undefined;
}

function readOptional(root: string, relativePath: string): string | undefined {
  const source = path.join(root, relativePath);
  if (!pathExists(source)) return undefined;
  return readFileUtf8(source);
}

function readFirstExisting(root: string, relativePaths: readonly string[]): Readonly<{ path: string; text: string }> | undefined {
  for (const relativePath of relativePaths) {
    const text = readOptional(root, relativePath);
    if (text !== undefined) return Object.freeze({ path: relativePath, text });
  }
  return undefined;
}

function leanWorkspaceContentOptions(options: LeanWorkspaceContentProjectionOptions): LeanWorkspaceContentProjectionOptions {
  return options.at === undefined ? { ...options, at: processIsoNow() } : options;
}

/** Read a workspace's `lakefile.toml`, if present. `readLeanWorkspaceTopic`'s
 *  bounded/filtered read cannot reuse `readLeanWorkspaceCore`'s own internal
 *  lakefile read, so it keeps this tiny host read locally; the Lake TOML
 *  decoding itself stays the package's `decodeLeanLakefileToml`. */
function lakefileFromRoot(root: string): LeanLakefile | undefined {
  const lakefileToml = readFirstExisting(root, ["lakefile.toml"]);
  if (lakefileToml !== undefined) return decodeLeanLakefileToml(lakefileToml.text);
  return undefined;
}

function readLeanCapabilitySurface(
  root: string,
  options: LeanWorkspaceReadOptions,
  operations: readonly Operation[],
): LeanCapabilitySurface | undefined {
  if (options.includePackageCapabilitySurface === false) return undefined;
  const manifestText = readOptional(root, "package.json");
  if (manifestText === undefined) return undefined;
  try {
    const manifest = requirePackageManifest(manifestText, "package.json");
    const exportSurface = exportSurfaceOfPackageManifest(manifest);
    const packageSurface = packageSurfaceOf(exportSurface, binSurfaceOfPackageManifest(manifest));
    return leanCapabilitySurfaceFromPackageSurface({
      actions: operations,
      schemas: schemasOfOperations(operations),
      packageSurface: {
        exports: {
          entries: (exportSurface.entries as readonly { readonly specifier: string }[])
            .map((entry) => ({ specifier: entry.specifier })),
        },
      },
    });
  } catch {
    return undefined;
  }
}

function leanWorkspaceCodexSessionRead(read: CodexSessionTranscriptRead): LeanWorkspaceCodexSessionRead {
  return leanWorkspaceCodexSessionReadContract.assert(Object.freeze({
    root: read.root,
    relative: read.relative,
    source: read.source,
    bytes: read.bytes,
    events: read.events,
    chronicle: read.chronicle,
  }), "Lean workspace Codex session read fiber") as LeanWorkspaceCodexSessionRead;
}

function readLeanWorkspaceCodexSessions(root: string, options: LeanWorkspaceReadOptions): readonly LeanWorkspaceCodexSessionRead[] {
  const explicit = options.codexSessionTranscripts ?? [];
  const discovered = (options.codexSessionDiscovery ?? []).flatMap((entry) =>
    discoverCodexSessionTranscripts(entry.root, {
      ...(entry.sessionIds === undefined ? {} : { sessionIds: entry.sessionIds }),
      ...(entry.date === undefined ? {} : { date: entry.date }),
      ...(entry.maxDepth === undefined ? {} : { maxDepth: entry.maxDepth }),
      ...(entry.limit === undefined ? {} : { limit: entry.limit }),
      caller: { service: "services/lean-workspace", workspaceRoot: root },
    }).matches.map((match) => Object.freeze({
      root: match.root,
      relative: match.relative,
      sessionId: match.sessionId,
    })));
  return Object.freeze([...explicit, ...discovered].map((entry) =>
    leanWorkspaceCodexSessionRead(readCodexSessionTranscript(entry.root ?? root, entry.relative, {
      ...(entry.sessionId === undefined ? {} : { sessionId: entry.sessionId }),
      caller: { service: "services/lean-workspace", workspaceRoot: root },
    }))));
}

function readSessionTheoremReferences(
  sessionReads: readonly LeanWorkspaceCodexSessionRead[],
  rootName: string,
  theoremSpine: LeanTheoremSpine,
  declarationIndex: LeanDeclarationIndex | undefined,
): LeanTheoremReferenceIndex | undefined {
  const knownDeclarations = [...new Set([
    ...theoremSpine.entries.map((entry) => entry.name),
    ...(declarationIndex?.declarations ?? []),
  ])].sort();
  const indexes = sessionReads.map((read) => leanTheoremReferencesFromOpenAIChronicle(read.chronicle, {
    source: read.relative,
    knownDeclarations,
  })).filter((index) => index.references.length > 0);
  return indexes.length === 0 ? undefined : mergeLeanTheoremReferenceIndexes(indexes, `${rootName}:codex-sessions`);
}

function mergeOptionalTheoremReferences(
  rootName: string,
  indexes: readonly (LeanTheoremReferenceIndex | undefined)[],
): LeanTheoremReferenceIndex | undefined {
  const nonempty = indexes.filter((index): index is LeanTheoremReferenceIndex => index !== undefined && index.references.length > 0);
  return nonempty.length === 0 ? undefined : mergeLeanTheoremReferenceIndexes(nonempty, rootName);
}

function textMentionsTerm(text: string, terms: readonly string[]): boolean {
  const lowered = text.toLocaleLowerCase();
  return terms.some((term) => lowered.includes(term.toLocaleLowerCase()));
}

function topicSearchTerms(terms: readonly string[], aliases: Readonly<Record<string, readonly string[]>> | undefined): readonly string[] {
  const expanded = terms.flatMap((term) => {
    const aliasTerms = aliases?.[term] ?? [];
    return [term, ...aliasTerms];
  });
  return [...new Set(expanded.map((term) => term.trim()).filter((term) => term !== ""))].sort();
}

function topicReferences(
  root: string,
  file: string,
  text: string,
  terms: readonly string[],
  maxReferencesPerFile: number,
): readonly { readonly path: string; readonly line: number; readonly term: string; readonly snippet: string }[] {
  const out: { path: string; line: number; term: string; snippet: string }[] = [];
  const relative = path.relative(root, file).replace(/\\/gu, "/");
  const lines = text.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const lowered = line.toLocaleLowerCase();
    for (const term of terms) {
      if (!lowered.includes(term.toLocaleLowerCase())) continue;
      out.push(Object.freeze({
        path: relative,
        line: index + 1,
        term,
        snippet: line.trim().slice(0, 240),
      }));
      if (out.length >= maxReferencesPerFile) return Object.freeze(out);
    }
  }
  return Object.freeze(out);
}

/** Read a live Lean project directory into admitted Lean information records. */
export function readLeanWorkspace(
  root: string,
  options: LeanWorkspaceReadOptions = {},
  operations: readonly Operation[] = [],
): LeanWorkspaceRead {
  const absoluteRoot = path.resolve(root);
  const core = readLeanWorkspaceCore(absoluteRoot, options);
  const codexSessionReads = readLeanWorkspaceCodexSessions(absoluteRoot, options);
  const sessionTheoremReferences = readSessionTheoremReferences(codexSessionReads, path.basename(absoluteRoot), core.theoremSpine, core.declarationIndex);
  const theoremReferences = mergeOptionalTheoremReferences(path.basename(absoluteRoot), [
    core.theoremReferences,
    sessionTheoremReferences,
  ]);
  const theoremReferenceCoverage = theoremReferences === undefined ? undefined : leanTheoremReferenceCoverage(theoremReferences, core.theoremSpine);
  const capabilitySurface = readLeanCapabilitySurface(absoluteRoot, options, operations);
  const capabilityAuthorityReport = capabilitySurface === undefined || core.capabilityClaims === undefined
    ? undefined
    : leanCapabilityAuthorityReport(core.capabilityClaims.claims, capabilitySurface, core.theoremSpine);
  const relationalConfigurationReport = leanRelationalConfigurationReport({
    environment: core.environment,
    importGraph: core.importGraph,
    theoremSpine: core.theoremSpine,
    ...(core.obligationCoverage === undefined ? {} : { obligationCoverage: core.obligationCoverage }),
    ...(theoremReferenceCoverage === undefined ? {} : { theoremReferenceCoverage }),
    ...(core.texWorkspaceRead === undefined ? {} : { blueprintClaimGraph: core.texWorkspaceRead.blueprintClaimGraph }),
    ...(core.texWorkspaceRead === undefined ? {} : { versoExpositionWeldReport: core.texWorkspaceRead.versoExpositionWeldReport }),
    ...(codexSessionReads.length === 0 ? {} : { openaiChronicles: codexSessionReads.map((read) => read.chronicle) }),
    ...(capabilitySurface === undefined ? {} : { capabilitySurface }),
    ...(core.capabilityClaims === undefined ? {} : { capabilityClaims: core.capabilityClaims }),
    ...(capabilityAuthorityReport === undefined ? {} : { capabilityAuthorityReport }),
  });
  return leanWorkspaceReadContract.assert(Object.freeze({
    kind: "metroplat.lean.workspace" as const,
    root: core.root,
    rootModule: core.rootModule,
    moduleSources: core.moduleSources,
    conformanceSources: core.conformanceSources,
    modules: core.modules,
    conformanceModules: core.conformanceModules,
    ...(codexSessionReads.length === 0 ? {} : { codexSessionReads }),
    ...(theoremReferences === undefined ? {} : { theoremReferences }),
    ...(theoremReferenceCoverage === undefined ? {} : { theoremReferenceCoverage }),
    ...(capabilitySurface === undefined ? {} : { capabilitySurface }),
    ...(core.capabilityClaims === undefined ? {} : { capabilityClaims: core.capabilityClaims }),
    ...(capabilityAuthorityReport === undefined ? {} : { capabilityAuthorityReport }),
    ...(core.texWorkspaceRead === undefined ? {} : { texWorkspaceRead: core.texWorkspaceRead }),
    environment: core.environment,
    declarationCatalog: core.declarationCatalog,
    importGraph: core.importGraph,
    theoremSpine: core.theoremSpine,
    relationalConfigurationReport,
    ...(core.obligationCoverage === undefined ? {} : { obligationCoverage: core.obligationCoverage }),
    ...(core.toolchain === undefined ? {} : { toolchain: core.toolchain }),
    ...(core.lakefile === undefined ? {} : { lakefile: core.lakefile }),
    ...(core.declarationIndex === undefined ? {} : { declarationIndex: core.declarationIndex }),
  }), "Lean workspace read") as LeanWorkspaceRead;
}

/** Read a bounded Lean project slice around selected terms, modules, and documents. */
export function readLeanWorkspaceTopic(root: string, options: LeanWorkspaceTopicReadOptions): LeanWorkspaceTopicRead {
  const absoluteRoot = path.resolve(root);
  const terms = [...new Set(options.terms.map((term) => term.trim()).filter((term) => term !== ""))].sort();
  if (terms.length === 0) throw new TypeError("readLeanWorkspaceTopic: at least one term is required");
  const searchTerms = topicSearchTerms(terms, options.aliases);
  const maxReferencesPerFile = options.maxReferencesPerFile ?? 12;
  const lakefile = lakefileFromRoot(absoluteRoot);
  const rootModule = options.rootModule ?? leanWorkspaceRootModuleFromLakefile(lakefile, path.basename(absoluteRoot));
  const moduleSources = collectLeanSources(absoluteRoot, lakefile, options)
    .filter((source) => textMentionsTerm(`${source.module}\n${source.text}`, searchTerms));
  const modules = Object.freeze(moduleSources.map((source) => decodeLeanModule(source.text, source.module, source.path)));
  const referenceFiles = sourceReferenceFiles(absoluteRoot, {
    ...options,
    referenceRoots: options.referenceRoots ?? Object.freeze(["docs/blueprint", "docs/verso", "dev/content/notes"]),
    referenceExtensions: options.referenceExtensions ?? Object.freeze([".lean", ".tex", ".md"]),
  });
  const matchingReferenceFiles = referenceFiles.flatMap((file) => {
    const text = readFileUtf8(file);
    return textMentionsTerm(text, searchTerms) ? [Object.freeze({ file, text })] : [];
  });
  const references = Object.freeze(matchingReferenceFiles.flatMap(({ file, text }) =>
    topicReferences(absoluteRoot, file, text, searchTerms, maxReferencesPerFile)));
  const blueprintPlates = matchingReferenceFiles
    .filter(({ file }) => path.relative(absoluteRoot, file).replace(/\\/gu, "/").startsWith("docs/blueprint/"))
    .map(({ file, text }) => decodeBlueprintTexPlate(text, path.relative(absoluteRoot, file).replace(/\\/gu, "/")));
  const versoPlates = matchingReferenceFiles
    .filter(({ file }) => path.relative(absoluteRoot, file).replace(/\\/gu, "/").startsWith("docs/verso/"))
    .map(({ file, text }) => decodeVersoTexPlate(text, path.relative(absoluteRoot, file).replace(/\\/gu, "/")));
  const declarationCatalog = leanDeclarationCatalog(modules);
  const blueprint = blueprintPlates.length === 0 ? undefined : blueprintClaimGraph(blueprintPlates);
  const verso = versoPlates.length === 0 ? undefined : versoExpositionWeldReport(versoPlates, {
    leanDeclarations: declarationCatalog,
    ...(blueprint === undefined ? {} : { blueprint }),
  });
  return leanWorkspaceTopicReadContract.assert(Object.freeze({
    kind: "metroplat.lean.workspace-topic-read" as const,
    root: absoluteRoot,
    rootModule,
    terms,
    searchTerms,
    moduleSources,
    modules,
    references,
    ...(blueprint === undefined ? {} : { blueprintClaimGraph: blueprint }),
    ...(verso === undefined ? {} : { versoExpositionWeldReport: verso }),
    evidence: Object.freeze([
      `lean-modules:${modules.length}`,
      `references:${references.length}`,
      `blueprint-plates:${blueprintPlates.length}`,
      `verso-plates:${versoPlates.length}`,
    ]),
    mediaType: "application/vnd.metroplat.lean.workspace-topic-read+json",
  }), "Lean workspace topic read") as LeanWorkspaceTopicRead;
}

/** Read a Lean project and write that Lean information surface as a `content/` artifact. */
export function projectLeanWorkspaceContentAtRoot(
  dataRoot: string,
  workspaceRoot: string,
  readOptions: LeanWorkspaceReadOptions = {},
  options: LeanWorkspaceContentProjectionOptions = {},
): LeanWorkspaceContentProjection {
  const workspace = readLeanWorkspace(workspaceRoot, readOptions);
  const addressOptions = leanWorkspaceContentOptions(options);
  const { address, artifact } = leanWorkspaceContentArtifactAddress(dataRoot, workspace.rootModule, addressOptions);
  const serialized = `${canonicalBytes(jsonResource(workspace, "Lean workspace content artifact"))}\n`;
  writeFileAtomic(address.path, serialized);
  return leanWorkspaceContentProjectionContract.assert(Object.freeze({
    kind: "metroplat.lean.workspace-content-projection" as const,
    operation: "project-lean-workspace-content" as const,
    root: dataRoot,
    workspaceRoot: workspace.root,
    path: address.path,
    artifact,
    bytes: Buffer.byteLength(serialized, "utf8"),
    modules: workspace.modules.length,
    conformanceModules: workspace.conformanceModules.length,
  }), "Lean workspace content projection") as LeanWorkspaceContentProjection;
}

/** Explicit hot readback for a Lean workspace content artifact path. */
export function readLeanWorkspaceContentPath(
  contentPath: string,
  options: LeanWorkspaceContentProjectionOptions = {},
): LeanWorkspaceContentRead {
  const parsed = parse(readFileUtf8(contentPath));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new TypeError("readLeanWorkspaceContentPath: workspace artifact must be a JSON object");
  }
  const workspace = parsed as JsonRecord as unknown as LeanWorkspaceRead;
  const artifact = leanWorkspaceContentReadArtifact(contentPath);
  return leanWorkspaceContentReadContract.assert(Object.freeze({
    kind: "metroplat.lean.workspace-content-read" as const,
    operation: "read-lean-workspace-content" as const,
    path: contentPath,
    artifact,
    workspace,
  }), "Lean workspace content read") as LeanWorkspaceContentRead;
}

// No service verb lives here: workspace reports are derived views for the
// filesystem `read` (state-tier cut addresses over `readLeanWorkspace`), and
// Lean/Lake commands run through the lifecycle-recorded process boundary.

/** Read a Lean/Lake command result as a service-bound diagnostic observation. */
export function leanWorkspaceCommandReport(input: Readonly<{
  command: string;
  args: readonly string[];
  exitCode: number;
  stdout?: string;
  stderr?: string;
}>): LeanBuildReport {
  const stdout = input.stdout ?? "";
  const stderr = input.stderr ?? "";
  const combined = `${stdout}\n${stderr}`;
  const errors = processDiagnosticLines(combined, "error");
  const warnings = processDiagnosticLines(combined, "warning");
  return leanBuildReportContract.assert({
    kind: "metroplat.lean.build-report",
    command: input.command,
    args: Object.freeze([...input.args]),
    exitCode: input.exitCode,
    stdout,
    stderr,
    succeeded: input.exitCode === 0 && errors.length === 0,
    errors,
    warnings,
    mediaType: "application/vnd.metroplat.lean.build-report+json",
  }, "Lean workspace command report") as LeanBuildReport;
}

/** Run a Lean-family command at a workspace boundary and decode its diagnostics. */
export function runLeanWorkspaceCommand(root: string, options: LeanCommandOptions = {}): LeanBuildReport {
  const command = options.command ?? "lake";
  const args = options.args ?? ["build"];
  const cwd = path.resolve(root);
  const commandContext = { command, args, cwd };
  const receipt = executeJavascriptNodeCommand({
    type: "JavascriptNodeCommandExecutionRequest",
    version: 1,
    command,
    arguments: [...args],
    directory: cwd,
    environment: null,
    input: null,
  });
  const { result } = receipt;
  const lifecycle = processCommandLifecycleRecord(
    commandContext,
    result,
    options.at ?? processIsoNow(),
    "services/lean-workspace:runLeanWorkspaceCommand",
  );
  for (const event of lifecycle.events) options.lifecycle?.(event);
  if (options.lifecyclePersistence !== undefined) {
    recordServiceLifecycleRecord(options.lifecyclePersistence, lifecycle);
  }
  return leanWorkspaceCommandReport({
    command,
    args,
    exitCode: processCommandExitCode(result),
    stdout: result.stdout,
    stderr: result.stderr || result.error || "",
  });
}
