/**
 * @packageDocumentation
 *
 * workspace/service - live Lean project host-mark scanning.
 *
 * This module owns the filesystem boundary for reading a Lean project
 * directory: it reads host files into the host-neutral Lean file plate
 * codec surface in `codec/`, asks `view.mts` for import/theorem/coverage
 * readouts, and optionally welds in a TeX/Blueprint/Verso workspace fiber
 * via `tex/workspace-service.mts`. It returns `LeanWorkspaceCore` — a plain
 * Lean-project reading with no dependency on any consuming application's
 * own operation host, package-capability introspection, session records,
 * or content-addressing scheme. A consuming application composes those
 * concerns on top of this reader; it does not belong inside it.
 */
import path from "node:path";

import { decodeLeanToolchain } from "../codec/toolchain.mts";
import { decodeLeanLakefileToml, type LeanLakefile } from "../codec/lakefile.mts";
import { decodeLeanModule } from "../codec/module.mts";
import { decodeLeanDeclarationIndex } from "../codec/declaration-index.mts";
import { leanEnvironment } from "../codec/environment.mts";
import {
  leanDeclarationCatalog,
  leanCapabilityClaimsFromText,
  leanImportGraph,
  leanObligationCoverage,
  leanTheoremReferenceCoverage,
  leanTheoremReferencesFromText,
  mergeLeanCapabilityClaimIndexes,
  mergeLeanTheoremReferenceIndexes,
  leanTheoremSpine,
  type LeanCapabilityClaimIndex,
  type LeanDeclarationCatalog,
  type LeanDeclarationIndex,
  type LeanEnvironment,
  type LeanImportGraph,
  type LeanObligationCoverage,
  type LeanTheoremSpine,
  type LeanTheoremReferenceCoverage,
  type LeanTheoremReferenceIndex,
} from "../view.mts";
import { readTexWorkspace, type TexWorkspaceRead } from "../tex/workspace-service.mts";
import { pathExists, readDirectoryEntries, readFileUtf8, statPathOrNull, walkFiles } from "../fs-effects.mts";

import {
  leanWorkspaceDefaultDeclarationIndexPaths,
  leanWorkspaceDefaultModuleRoots,
  leanWorkspaceDefaultReferenceExtensions,
  leanWorkspaceDefaultReferenceRoots,
  leanWorkspaceLakeLibraryRoots,
  leanWorkspaceModuleNameFromPath,
  leanWorkspaceRootModuleFromLakefile,
  leanWorkspaceScanRootCandidates,
  leanWorkspaceShouldSkipDirectory,
  leanWorkspaceShouldSkipSource,
  type LeanWorkspaceReadOptions,
} from "./index.mts";
import type { LeanWorkspaceModuleSource } from "../schema.mts";

export type { LeanWorkspaceReadOptions } from "./index.mts";
export type { LeanWorkspaceModuleSource } from "../schema.mts";

export interface LeanWorkspaceCore {
  readonly root: string;
  readonly rootModule: string;
  readonly moduleSources: readonly LeanWorkspaceModuleSource[];
  readonly conformanceSources: readonly LeanWorkspaceModuleSource[];
  readonly modules: LeanEnvironment["modules"];
  readonly conformanceModules: LeanEnvironment["modules"];
  readonly toolchain?: LeanEnvironment["toolchain"];
  readonly lakefile?: LeanLakefile;
  readonly declarationIndex?: LeanDeclarationIndex;
  readonly environment: LeanEnvironment;
  readonly declarationCatalog: LeanDeclarationCatalog;
  readonly importGraph: LeanImportGraph;
  readonly theoremSpine: LeanTheoremSpine;
  readonly obligationCoverage?: LeanObligationCoverage;
  readonly theoremReferences?: LeanTheoremReferenceIndex;
  readonly theoremReferenceCoverage?: LeanTheoremReferenceCoverage;
  readonly capabilityClaims?: LeanCapabilityClaimIndex;
  readonly texWorkspaceRead?: TexWorkspaceRead;
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
  return Object.freeze(existing.length === 0 ? [root] : [...new Set(existing)].sort());
}

/** Scan a Lean project directory into module sources. Exported so a consuming
 *  application's own workspace reads (e.g. a bounded topic read) can reuse
 *  the same scan-root and skip-directory laws without re-deriving them. */
export function collectLeanSources(root: string, lakefile: LeanLakefile | undefined, options: LeanWorkspaceReadOptions): readonly LeanWorkspaceModuleSource[] {
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

/** Scan reference source files (Node, Markdown, TeX, Lean) under a project's
 *  documentation/source roots for theorem-name mentions. Exported for the
 *  same reuse reason as `collectLeanSources`. */
export function sourceReferenceFiles(root: string, options: LeanWorkspaceReadOptions): readonly string[] {
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

function knownLeanClaimNames(theoremSpineValue: LeanTheoremSpine, declarationIndex: LeanDeclarationIndex | undefined): readonly string[] {
  return Object.freeze([...new Set([
    ...theoremSpineValue.entries.map((entry) => entry.name),
    ...(declarationIndex?.declarations ?? []),
  ])].sort());
}

function readLeanTheoremReferences(
  root: string,
  options: LeanWorkspaceReadOptions,
  theoremSpineValue: LeanTheoremSpine,
  declarationIndex: LeanDeclarationIndex | undefined,
): LeanTheoremReferenceIndex | undefined {
  const knownDeclarations = knownLeanClaimNames(theoremSpineValue, declarationIndex);
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
  theoremSpineValue: LeanTheoremSpine,
  declarationIndex: LeanDeclarationIndex | undefined,
): LeanCapabilityClaimIndex | undefined {
  const knownDeclarations = knownLeanClaimNames(theoremSpineValue, declarationIndex);
  const indexes = sourceReferenceFiles(root, options).map((file) =>
    leanCapabilityClaimsFromText(
      readFileUtf8(file),
      path.relative(root, file).replace(/\\/gu, "/"),
      { knownDeclarations },
    ));
  const nonempty = indexes.filter((index) => index.claims.length > 0);
  return nonempty.length === 0 ? undefined : mergeLeanCapabilityClaimIndexes(nonempty, path.basename(root));
}

/**
 * Read a live Lean project directory into its admitted core: environment,
 * declaration catalog, import graph, theorem spine, obligation/reference
 * coverage, source-text capability claims, and an optional TeX/Blueprint/Verso
 * workspace fiber. This is the whole portable Lean-workspace read; a
 * consuming application layers its own package-capability-surface,
 * session-record, and content-addressing concerns on top of the value this
 * returns.
 */
export function readLeanWorkspaceCore(root: string, options: LeanWorkspaceReadOptions = {}): LeanWorkspaceCore {
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
  const theoremSpineValue = leanTheoremSpine(environment);
  const obligationCoverage = declarationIndex === undefined ? undefined : leanObligationCoverage(theoremSpineValue, declarationIndex);
  const theoremReferences = readLeanTheoremReferences(absoluteRoot, options, theoremSpineValue, declarationIndex);
  const theoremReferenceCoverage = theoremReferences === undefined ? undefined : leanTheoremReferenceCoverage(theoremReferences, theoremSpineValue);
  const capabilityClaims = readLeanCapabilityClaims(absoluteRoot, options, theoremSpineValue, declarationIndex);
  return Object.freeze({
    root: absoluteRoot,
    rootModule,
    moduleSources,
    conformanceSources,
    modules,
    conformanceModules,
    ...(toolchain === undefined ? {} : { toolchain }),
    ...(lakefile === undefined ? {} : { lakefile }),
    ...(declarationIndex === undefined ? {} : { declarationIndex }),
    environment,
    declarationCatalog,
    importGraph,
    theoremSpine: theoremSpineValue,
    ...(obligationCoverage === undefined ? {} : { obligationCoverage }),
    ...(theoremReferences === undefined ? {} : { theoremReferences }),
    ...(theoremReferenceCoverage === undefined ? {} : { theoremReferenceCoverage }),
    ...(capabilityClaims === undefined ? {} : { capabilityClaims }),
    ...(texWorkspaceRead === undefined ? {} : { texWorkspaceRead }),
  });
}
