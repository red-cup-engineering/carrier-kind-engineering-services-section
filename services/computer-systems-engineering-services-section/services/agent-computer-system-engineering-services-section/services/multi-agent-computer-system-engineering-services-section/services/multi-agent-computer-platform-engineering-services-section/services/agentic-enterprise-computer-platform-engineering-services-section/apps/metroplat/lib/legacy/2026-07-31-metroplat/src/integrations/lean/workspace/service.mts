/**
 * @packageDocumentation
 *
 * integrations/lean/workspace/service - live Lean project host-mark scanning.
 *
 * This service owns filesystem and process boundaries for Lean workspaces. It
 * reads host files into the host-neutral Lean file plate codec surface in
 * `src/integrations/lean/codec`, asks `src/integrations/lean/view.mts`
 * for proof/configuration readouts, and keeps Lean/Lake command observations
 * in this service boundary.
 */
import path from "node:path";
import { canonicalBytes } from "../../../lib/identity/index.mts";

import { requirePackageManifest } from "../../../workspace/package-manifest.mts";
import { binSurfaceOfPackageManifest } from "../../../workspace/bins/index.mts";
import {
  leanBuildReportContract,
  leanRelationalConfigurationReportContract,
  leanWorkspaceCodexSessionReadContract,
  leanWorkspaceContentProjectionContract,
  leanWorkspaceContentReadContract,
  leanWorkspaceReadContract,
  leanWorkspaceTopicReadContract,
  leanWorkspaceRelationalConfigurationReportRequestContract,
  type LeanBuildReport,
  type LeanWorkspaceCodexSessionRead,
  type LeanWorkspaceRelationalConfigurationReportRequest,
  type LeanWorkspaceTopicRead,
} from "../schema.mts";
import { exportSurfaceOfPackageManifest } from "../../../workspace/exports/index.mts";
import { packageSurfaceOf } from "../../../workspace/package-surface.mts";
import { schemasOfOperations, type Operation } from "../../../rpc/index.mts";
import {
  jsonResource,
  parse,
  type JsonRecord,
} from "../../../lib/codecs/json/index.mts";
import type { ContractValue } from "../../../lib/contracts/index.mts";
import { decodeLeanToolchain, type LeanToolchain } from "../codec/toolchain.mts";
import { decodeLeanLakefileToml, type LeanLakefile } from "../codec/lakefile.mts";
import { decodeLeanModule, type LeanModule } from "../codec/module.mts";
import { decodeLeanDeclarationIndex, type LeanDeclarationIndex } from "../codec/declaration-index.mts";
import { leanEnvironment, type LeanEnvironment } from "../codec/environment.mts";
import {
  leanDeclarationCatalog,
  leanCapabilityAuthorityReport,
  leanCapabilityClaimsFromText,
  leanCapabilitySurfaceFromPackageSurface,
  leanImportGraph,
  leanObligationCoverage,
  leanRelationalConfigurationReport,
  leanTheoremReferenceCoverage,
  leanTheoremReferencesFromOpenAIChronicle,
  leanTheoremReferencesFromText,
  mergeLeanCapabilityClaimIndexes,
  mergeLeanTheoremReferenceIndexes,
  leanTheoremSpine,
  type LeanCapabilityAuthorityReport,
  type LeanCapabilityClaimIndex,
  type LeanCapabilitySurface,
  type LeanDeclarationCatalog,
  type LeanImportGraph,
  type LeanObligationCoverage,
  type LeanRelationalConfigurationReport,
  type LeanTheoremSpine,
  type LeanTheoremReferenceCoverage,
  type LeanTheoremReferenceIndex,
} from "../view.mts";
import {
  discoverCodexSessionTranscripts,
  readCodexSessionTranscript,
  type CodexSessionTranscriptRead,
} from "../../openai/codex/service.mts";
import {
  readTexWorkspace,
} from "../tex/workspace-service.mts";
import { decodeBlueprintTexPlate } from "../blueprint/codec.mts";
import { blueprintClaimGraph } from "../blueprint/view.mts";
import { decodeVersoTexPlate } from "../verso/codec.mts";
import { versoExpositionWeldReport } from "../verso/view.mts";
import { pathExists, readDirectoryEntries, readFileUtf8, statPathOrNull, walkFiles, writeFileAtomic } from "../../../lib/filesystem/index.mts";
import {
  processCommandExitCode,
  processCommandLifecycleRecord,
  processCommandOutputText,
  processDiagnosticLines,
  processIsoNow,
  runProcessCommand,
  type ProcessCommandRunner,
} from "../../process/services/index.mts";
import type { ServiceLifecycleEvent } from "../../process/services/lifecycle-schema/schema.mts";
import {
  recordServiceLifecycleRecord,
  type ServiceLifecyclePersistence,
} from "../../../dashboards/service-lifecycle/index.mts";
import { uniqueSortedStrings as uniqueSorted } from "../../../lib/values/unique-sorted-strings.mts";
import {
  leanWorkspaceContentArtifactAddress,
  leanWorkspaceContentReadArtifact,
  leanWorkspaceDefaultDeclarationIndexPaths,
  leanWorkspaceDefaultModuleRoots,
  leanWorkspaceDefaultReferenceExtensions,
  leanWorkspaceDefaultReferenceRoots,
  leanWorkspaceIgnoredDirectories,
  leanWorkspaceLakeLibraryRoots,
  leanWorkspaceModuleNameFromPath,
  leanWorkspaceReadOptionsFromReportRequest,
  leanWorkspaceRelationalConfigurationReportContract,
  leanWorkspaceRootModuleFromLakefile,
  leanWorkspaceScanRootCandidates,
  leanWorkspaceShouldSkipDirectory,
  leanWorkspaceShouldSkipSource,
  type LeanWorkspaceContentProjection,
  type LeanWorkspaceContentProjectionOptions,
  type LeanWorkspaceContentRead,
  type LeanWorkspaceModuleSource,
  type LeanWorkspaceRead,
  type LeanWorkspaceReadOptions,
} from "./index.mts";

export type { LeanWorkspaceCodexSessionRead, LeanWorkspaceRelationalConfigurationReportRequest } from "../schema.mts";

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

export interface LeanCommandRunner extends ProcessCommandRunner {}

export interface LeanWorkspaceTopicReadOptions extends LeanWorkspaceReadOptions {
  readonly terms: readonly string[];
  readonly aliases?: Readonly<Record<string, readonly string[]>>;
  readonly maxReferencesPerFile?: number;
}

export interface LeanCommandOptions extends LeanCommandRunner {
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

function lakefileFromRoot(root: string): LeanLakefile | undefined {
  const lakefileToml = readFirstExisting(root, ["lakefile.toml"]);
  if (lakefileToml !== undefined) return decodeLeanLakefileToml(lakefileToml.text);
  return undefined;
}

function defaultLeanScanRoots(root: string, lakefile: LeanLakefile | undefined): readonly string[] {
  const libraryRoots = leanWorkspaceLakeLibraryRoots(lakefile);
  const candidates = leanWorkspaceScanRootCandidates(root, lakefile);
  const existing = candidates.filter((candidate) => pathExists(candidate));
  if (libraryRoots.length === 0) return Object.freeze(existing.length === 0 ? [root] : existing);
  return Object.freeze(existing.length === 0 ? [root] : uniqueSorted(existing));
}

function collectLeanSources(root: string, lakefile: LeanLakefile | undefined, options: LeanWorkspaceReadOptions): readonly LeanWorkspaceModuleSource[] {
  const maxDepth = options.maxDepth ?? 8;
  const ignore = new Set(options.ignore ?? []);
  const moduleRoots = options.moduleRoots ?? leanWorkspaceDefaultModuleRoots();
  const scanRoots = options.moduleRoots === undefined ? defaultLeanScanRoots(root, lakefile) : [root];
  const sources: LeanWorkspaceModuleSource[] = [];

  const admitFile = (target: string): void => {
    if (!target.endsWith(".lean")) return;
    if (path.basename(target) === "lakefile.lean") return;
    if (leanWorkspaceShouldSkipSource(root, target)) return;
    sources.push(Object.freeze({
      module: leanWorkspaceModuleNameFromPath(root, target, moduleRoots),
      path: target,
      text: readFileUtf8(target),
    }));
  };

  const walk = (scanRoot: string): void => {
    const stat = statPathOrNull(scanRoot);
    if (stat === null) return;
    if (stat.isFile()) {
      admitFile(scanRoot);
      return;
    }
    if (!stat.isDirectory()) return;
    for (const target of walkFiles(scanRoot, {
      maxDepth,
      pruneDirectory: (name, full) =>
        leanWorkspaceShouldSkipDirectory(name, ignore) || leanWorkspaceShouldSkipSource(root, full),
      includeFile: (name) => name.endsWith(".lean"),
    })) admitFile(target);
  };

  for (const scanRoot of scanRoots) walk(scanRoot);
  return Object.freeze(sources.sort((left, right) => left.module.localeCompare(right.module)));
}

function collectLeanConformanceSources(root: string): readonly LeanWorkspaceModuleSource[] {
  const dir = path.join(root, "conformance");
  if (!pathExists(dir)) return Object.freeze([]);
  let entries;
  try {
    entries = readDirectoryEntries(dir);
  } catch {
    return Object.freeze([]);
  }
  return Object.freeze(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".lean"))
    .map((entry) => {
      const target = path.join(dir, entry.name);
      return Object.freeze({
        module: leanWorkspaceModuleNameFromPath(root, target, ["."]),
        path: target,
        text: readFileUtf8(target),
      });
    })
    .sort((left, right) => left.module.localeCompare(right.module)));
}

function readDeclarationIndex(root: string, paths: readonly string[]): LeanDeclarationIndex | undefined {
  const texts: string[] = [];
  const sources: string[] = [];
  for (const relativePath of paths) {
    const text = readOptional(root, relativePath);
    if (text === undefined) continue;
    texts.push(text);
    sources.push(relativePath);
  }
  if (texts.length === 0) return undefined;
  return decodeLeanDeclarationIndex(texts.join("\n"), sources.join("+"));
}

function sourceReferenceFiles(root: string, options: LeanWorkspaceReadOptions): readonly string[] {
  const roots = options.referenceRoots ?? leanWorkspaceDefaultReferenceRoots;
  const extensions = new Set(options.referenceExtensions ?? leanWorkspaceDefaultReferenceExtensions);
  const files: string[] = [];
  const scan = (current: string): void => {
    let entries;
    try {
      entries = readDirectoryEntries(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!leanWorkspaceShouldSkipDirectory(entry.name)) scan(target);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!extensions.has(path.extname(entry.name))) continue;
      const targetStat = statPathOrNull(target);
      if (targetStat === null || targetStat.size > 1024 * 1024) continue;
      files.push(target);
    }
  };
  for (const rootName of roots) {
    const dir = path.join(root, rootName);
    if (pathExists(dir)) scan(dir);
  }
  return Object.freeze(files.sort((left, right) => left.localeCompare(right)));
}

function knownLeanClaimNames(theoremSpine: LeanTheoremSpine, declarationIndex: LeanDeclarationIndex | undefined): readonly string[] {
  return Object.freeze(uniqueSorted([
    ...theoremSpine.entries.map((entry) => entry.name),
    ...(declarationIndex?.declarations ?? []),
  ]));
}

function readLeanTheoremReferences(
  root: string,
  options: LeanWorkspaceReadOptions,
  theoremSpine: LeanTheoremSpine,
  declarationIndex: LeanDeclarationIndex | undefined,
): LeanTheoremReferenceIndex | undefined {
  const knownDeclarations = knownLeanClaimNames(theoremSpine, declarationIndex);
  const indexes = sourceReferenceFiles(root, options).map((file) =>
    leanTheoremReferencesFromText(
      readFileUtf8(file),
      path.relative(root, file).replace(/\\/gu, "/"),
      { knownDeclarations },
    ));
  const nonempty = indexes.filter((index) => index.references.length > 0);
  return nonempty.length === 0 ? undefined : mergeLeanTheoremReferenceIndexes(nonempty, path.basename(root));
}

function readLeanCapabilityClaims(
  root: string,
  options: LeanWorkspaceReadOptions,
  theoremSpine: LeanTheoremSpine,
  declarationIndex: LeanDeclarationIndex | undefined,
): LeanCapabilityClaimIndex | undefined {
  const knownDeclarations = knownLeanClaimNames(theoremSpine, declarationIndex);
  const indexes = sourceReferenceFiles(root, options).map((file) =>
    leanCapabilityClaimsFromText(
      readFileUtf8(file),
      path.relative(root, file).replace(/\\/gu, "/"),
      { knownDeclarations },
    ));
  const nonempty = indexes.filter((index) => index.claims.length > 0);
  return nonempty.length === 0 ? undefined : mergeLeanCapabilityClaimIndexes(nonempty, path.basename(root));
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
  const knownDeclarations = uniqueSorted([
    ...theoremSpine.entries.map((entry) => entry.name),
    ...(declarationIndex?.declarations ?? []),
  ]);
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
  return uniqueSorted(expanded.map((term) => term.trim()).filter((term) => term !== ""));
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
  const toolchainText = readOptional(absoluteRoot, "lean-toolchain");
  const toolchain = toolchainText === undefined ? undefined : decodeLeanToolchain(toolchainText);
  const lakefile = lakefileFromRoot(absoluteRoot);
  const moduleSources = collectLeanSources(absoluteRoot, lakefile, options);
  const conformanceSources = collectLeanConformanceSources(absoluteRoot);
  const modules = Object.freeze(moduleSources.map((source) => decodeLeanModule(source.text, source.module, source.path)));
  const conformanceModules = Object.freeze(conformanceSources.map((source) => decodeLeanModule(source.text, source.module, source.path)));
  const declarationIndex = readDeclarationIndex(absoluteRoot, options.declarationIndexPaths ?? leanWorkspaceDefaultDeclarationIndexPaths);
  const rootModule = options.rootModule ?? leanWorkspaceRootModuleFromLakefile(lakefile, moduleSources[0]?.module ?? path.basename(absoluteRoot));
  const environment = leanEnvironment({
    rootModule,
    modules,
    ...(toolchain === undefined ? {} : { toolchain }),
    ...(lakefile === undefined ? {} : { lakefile }),
    ...(declarationIndex === undefined ? {} : { declarationIndex }),
  });
  const declarationCatalog = leanDeclarationCatalog(environment);
  const texWorkspaceRead = options.includeTexWorkspaceFibers === false
    ? undefined
    : readTexWorkspace(absoluteRoot, {
      leanDeclarations: declarationCatalog,
      ...(options.texRoots === undefined ? {} : { texRoots: options.texRoots }),
      ...(options.blueprintRoots === undefined ? {} : { blueprintRoots: options.blueprintRoots }),
      ...(options.versoRoots === undefined ? {} : { versoRoots: options.versoRoots }),
    });
  const importGraph = leanImportGraph(environment);
  const theoremSpine = leanTheoremSpine(environment);
  const obligationCoverage = declarationIndex === undefined ? undefined : leanObligationCoverage(theoremSpine, declarationIndex);
  const codexSessionReads = readLeanWorkspaceCodexSessions(absoluteRoot, options);
  const sourceTheoremReferences = readLeanTheoremReferences(absoluteRoot, options, theoremSpine, declarationIndex);
  const sessionTheoremReferences = readSessionTheoremReferences(codexSessionReads, path.basename(absoluteRoot), theoremSpine, declarationIndex);
  const theoremReferences = mergeOptionalTheoremReferences(path.basename(absoluteRoot), [
    sourceTheoremReferences,
    sessionTheoremReferences,
  ]);
  const theoremReferenceCoverage = theoremReferences === undefined ? undefined : leanTheoremReferenceCoverage(theoremReferences, theoremSpine);
  const capabilitySurface = readLeanCapabilitySurface(absoluteRoot, options, operations);
  const capabilityClaims = readLeanCapabilityClaims(absoluteRoot, options, theoremSpine, declarationIndex);
  const capabilityAuthorityReport = capabilitySurface === undefined || capabilityClaims === undefined
    ? undefined
    : leanCapabilityAuthorityReport(capabilityClaims.claims, capabilitySurface, theoremSpine);
  const relationalConfigurationReport = leanRelationalConfigurationReport({
    environment,
    importGraph,
    theoremSpine,
    ...(obligationCoverage === undefined ? {} : { obligationCoverage }),
    ...(theoremReferenceCoverage === undefined ? {} : { theoremReferenceCoverage }),
    ...(texWorkspaceRead === undefined ? {} : { blueprintClaimGraph: texWorkspaceRead.blueprintClaimGraph }),
    ...(texWorkspaceRead === undefined ? {} : { versoExpositionWeldReport: texWorkspaceRead.versoExpositionWeldReport }),
    ...(codexSessionReads.length === 0 ? {} : { openaiChronicles: codexSessionReads.map((read) => read.chronicle) }),
    ...(capabilitySurface === undefined ? {} : { capabilitySurface }),
    ...(capabilityClaims === undefined ? {} : { capabilityClaims }),
    ...(capabilityAuthorityReport === undefined ? {} : { capabilityAuthorityReport }),
  });
  return leanWorkspaceReadContract.assert(Object.freeze({
    kind: "metroplat.lean.workspace" as const,
    root: absoluteRoot,
    rootModule,
    moduleSources,
    conformanceSources,
    modules,
    conformanceModules,
    ...(codexSessionReads.length === 0 ? {} : { codexSessionReads }),
    ...(theoremReferences === undefined ? {} : { theoremReferences }),
    ...(theoremReferenceCoverage === undefined ? {} : { theoremReferenceCoverage }),
    ...(capabilitySurface === undefined ? {} : { capabilitySurface }),
    ...(capabilityClaims === undefined ? {} : { capabilityClaims }),
    ...(capabilityAuthorityReport === undefined ? {} : { capabilityAuthorityReport }),
    ...(texWorkspaceRead === undefined ? {} : { texWorkspaceRead }),
    environment,
    declarationCatalog,
    importGraph,
    theoremSpine,
    relationalConfigurationReport,
    ...(obligationCoverage === undefined ? {} : { obligationCoverage }),
    ...(toolchain === undefined ? {} : { toolchain }),
    ...(lakefile === undefined ? {} : { lakefile }),
    ...(declarationIndex === undefined ? {} : { declarationIndex }),
  }), "Lean workspace read") as LeanWorkspaceRead;
}

/** Read a bounded Lean project slice around selected terms, modules, and documents. */
export function readLeanWorkspaceTopic(root: string, options: LeanWorkspaceTopicReadOptions): LeanWorkspaceTopicRead {
  const absoluteRoot = path.resolve(root);
  const terms = uniqueSorted(options.terms.map((term) => term.trim()).filter((term) => term !== ""));
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
  const commandOptions = {
    command,
    args,
    cwd: path.resolve(root),
    ...(options.spawnSync === undefined ? {} : { spawnSync: options.spawnSync }),
  };
  const result = runProcessCommand(commandOptions);
  const lifecycle = processCommandLifecycleRecord(
    commandOptions,
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
    stdout: processCommandOutputText(result.stdout),
    stderr: processCommandOutputText(result.stderr) || result.error?.message || "",
  });
}
