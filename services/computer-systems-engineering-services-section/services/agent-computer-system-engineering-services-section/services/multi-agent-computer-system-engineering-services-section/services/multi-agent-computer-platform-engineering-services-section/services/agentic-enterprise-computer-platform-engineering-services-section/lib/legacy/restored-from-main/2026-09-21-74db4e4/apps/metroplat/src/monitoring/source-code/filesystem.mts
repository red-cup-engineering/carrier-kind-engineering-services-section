/**
 * @packageDocumentation
 *
 * Admitted source-corpus adapter and compiler view shared by MetroPlat's TypeScript monitors.
 *
 * @metroplatSubject source-code
 */
import path from "node:path";
import ts from "typescript";

import { canonicalBytes, contentAddress, type ArtifactRef, type ArtifactSource } from "../../lib/identity/index.mts";
import { pathExists, readFileUtf8, walkFiles } from "../../lib/filesystem/index.mts";

export const DEFAULT_SOURCE_DIRECTORIES: readonly string[] = Object.freeze(["lib", "src", "services"]);
export const DEFAULT_SOURCE_FILE_LIMIT = 2_000;

export interface SourceModuleMaterial {
  readonly path: string;
  readonly absolutePath: string;
  readonly content: string;
  readonly identity: ArtifactRef;
}

/** One exact, location-independent admission of the source corpus both monitors consume. */
export interface SourceModuleCorpus {
  readonly kind: "metroplat.monitoring.source-code.corpus";
  readonly root: string;
  readonly sourceDirs: readonly string[];
  readonly truncated: boolean;
  readonly files: readonly SourceModuleMaterial[];
  readonly source: ArtifactRef;
}

const programByCorpus = new WeakMap<SourceModuleCorpus, ts.Program>();
const admittedPathsByCorpus = new WeakMap<SourceModuleCorpus, ReadonlyMap<string, string>>();

const SOURCE_EXTENSIONS = Object.freeze([".mts", ".cts", ".ts", ".tsx", ".mjs", ".cjs", ".js", ".jsx"]);

function normalizedPath(value: string): string {
  return path.normalize(value);
}

function admittedPaths(corpus: SourceModuleCorpus): ReadonlyMap<string, string> {
  const cached = admittedPathsByCorpus.get(corpus);
  if (cached !== undefined) return cached;
  const indexed = new Map(corpus.files.map((file) => [normalizedPath(file.absolutePath), file.absolutePath] as const));
  admittedPathsByCorpus.set(corpus, indexed);
  return indexed;
}

function extensionCandidates(specifierPath: string): readonly string[] {
  const extension = path.extname(specifierPath);
  if (extension === ".mjs") return Object.freeze([specifierPath.slice(0, -4) + ".mts", specifierPath]);
  if (extension === ".cjs") return Object.freeze([specifierPath.slice(0, -4) + ".cts", specifierPath]);
  if (extension === ".js") return Object.freeze([
    specifierPath.slice(0, -3) + ".ts",
    specifierPath.slice(0, -3) + ".tsx",
    specifierPath,
    specifierPath.slice(0, -3) + ".jsx",
  ]);
  if (extension.length > 0) return Object.freeze([specifierPath]);
  return Object.freeze([...SOURCE_EXTENSIONS.map((candidate) => `${specifierPath}${candidate}`), ...SOURCE_EXTENSIONS.map((candidate) => path.join(specifierPath, `index${candidate}`))]);
}

/** Resolve only a relative specifier to bytes already admitted into this corpus.
 * This is deliberately an index lookup rather than Node's filesystem/package
 * resolver: a monitor read cannot pull an unbounded dependency graph into its
 * evidence boundary. */
export function sourceModuleResolvedPath(
  corpus: SourceModuleCorpus,
  specifier: string,
  containingFile: string,
): string | undefined {
  if (!specifier.startsWith(".")) return undefined;
  const admitted = admittedPaths(corpus);
  const base = normalizedPath(path.resolve(path.dirname(containingFile), specifier));
  for (const candidate of extensionCandidates(base)) {
    const resolved = admitted.get(normalizedPath(candidate));
    if (resolved !== undefined) return resolved;
  }
  return undefined;
}

/** The stable coordinate for a relative edge. Existing admitted bytes win;
 * absent relative imports retain their NodeNext source-coordinate spelling so
 * policy can report them as unresolved instead of silently erasing them. */
export function sourceModuleSpecifierPath(
  corpus: SourceModuleCorpus,
  specifier: string,
  containingFile: string,
): string {
  const resolved = sourceModuleResolvedPath(corpus, specifier, containingFile);
  if (resolved !== undefined) return resolved;
  const base = normalizedPath(path.resolve(path.dirname(containingFile), specifier));
  return extensionCandidates(base)[0] ?? base;
}

function moduleExtension(fileName: string): ts.Extension {
  if (fileName.endsWith(".mts")) return ts.Extension.Mts;
  if (fileName.endsWith(".cts")) return ts.Extension.Cts;
  if (fileName.endsWith(".tsx")) return ts.Extension.Tsx;
  if (fileName.endsWith(".mjs")) return ts.Extension.Mjs;
  if (fileName.endsWith(".cjs")) return ts.Extension.Cjs;
  if (fileName.endsWith(".jsx")) return ts.Extension.Jsx;
  if (fileName.endsWith(".js")) return ts.Extension.Js;
  return ts.Extension.Ts;
}

function sourceScriptKind(file: string): ts.ScriptKind {
  return file.endsWith(".tsx") ? ts.ScriptKind.TSX
    : file.endsWith(".jsx") ? ts.ScriptKind.JSX
      : /\.(?:mts|cts|ts)$/u.test(file) ? ts.ScriptKind.TS
        : ts.ScriptKind.JS;
}

function unadmittedPackageSource(fileName: string, corpus: SourceModuleCorpus): boolean {
  const relative = path.relative(corpus.root, path.resolve(fileName));
  return relative !== ""
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
    && /\.(?:[cm]?ts|tsx|[cm]?js|jsx)$/u.test(relative)
    && !relative.includes(`${path.sep}node_modules${path.sep}`);
}

/** One compiler view over the exact bytes admitted by a source corpus.
 * Repeated analyses of the same corpus share its immutable syntax trees. */
export function sourceModuleProgram(corpus: SourceModuleCorpus): ts.Program {
  const cached = programByCorpus.get(corpus);
  if (cached !== undefined) return cached;
  const options: ts.CompilerOptions = {
    allowJs: true,
    checkJs: false,
    // This monitor reasons only over the corpus it explicitly admitted. Letting
    // TypeScript resolve every package declaration defeats that boundary and
    // turns a 64-module feedback pass into an unbounded dependency crawl.
    noResolve: true,
    noLib: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    skipLibCheck: true,
  };
  const byPath = new Map(corpus.files.map((file) => [path.resolve(file.absolutePath), file] as const));
  const host = ts.createCompilerHost(options, true);
  const fallback = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    const material = byPath.get(path.resolve(fileName));
    if (material !== undefined) {
      return ts.createSourceFile(fileName, material.content, languageVersion, true, sourceScriptKind(fileName));
    }
    return unadmittedPackageSource(fileName, corpus)
      ? undefined
      : fallback(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  };
  host.resolveModuleNames = (moduleNames, containingFile) => moduleNames.map((specifier) => {
    const resolvedFileName = sourceModuleResolvedPath(corpus, specifier, containingFile);
    return resolvedFileName === undefined ? undefined : Object.freeze({
      resolvedFileName,
      extension: moduleExtension(resolvedFileName),
      isExternalLibraryImport: false,
    });
  });
  const program = ts.createProgram({
    rootNames: corpus.files.map((file) => file.absolutePath),
    options,
    host,
  });
  programByCorpus.set(corpus, program);
  return program;
}

/** Recover one admitted module from its corpus program without reparsing it. */
export function sourceModuleSyntax(program: ts.Program, material: SourceModuleMaterial): ts.SourceFile {
  const source = program.getSourceFile(material.absolutePath);
  if (source === undefined) throw new TypeError(`admitted source module is absent from its compiler program: ${material.path}`);
  return source;
}

function sourceModuleManifest(corpus: Pick<SourceModuleCorpus, "sourceDirs" | "truncated" | "files">): Readonly<{
  kind: "metroplat.monitoring.source-code.corpus";
  sourceDirs: readonly string[];
  truncated: boolean;
  files: readonly Readonly<{ path: string; content: ArtifactRef }>[];
}> {
  return Object.freeze({
    kind: "metroplat.monitoring.source-code.corpus" as const,
    sourceDirs: corpus.sourceDirs,
    truncated: corpus.truncated,
    files: Object.freeze(corpus.files.map((file) => Object.freeze({ path: file.path, content: file.identity }))),
  });
}

/** Discover source modules once under one explicit filesystem policy. */
export function sourceModuleFiles(root: string, sourceDirectories: readonly string[]): readonly string[] {
  const files: string[] = [];
  for (const sourceDirectory of sourceDirectories) {
    const start = path.join(root, sourceDirectory);
    if (!pathExists(start)) continue;
    files.push(...walkFiles(start, {
      skipSymbolicLinks: true,
      pruneDirectory: (name, full) =>
        name === "node_modules"
        || name === "dist"
        || name === ".tmp"
        || name === ".git"
        || path.resolve(full) === path.resolve(root, "lib", "legacy"),
      includeFile: (_name, full) =>
        /\.(?:[cm]?ts|tsx|[cm]?js|jsx)$/u.test(full)
        && !full.endsWith(".d.ts")
        && !full.includes(`${path.sep}test${path.sep}`),
    }));
  }
  return Object.freeze(files.sort((left, right) => left.localeCompare(right)));
}

export function sourceModuleRelativePath(root: string, full: string): string {
  return path.relative(path.resolve(root), full).split(path.sep).join("/");
}

/** Discover and read source files once, content-addressing the exact admitted corpus. */
export function readSourceModuleCorpus(
  root: string,
  sourceDirectories: readonly string[],
  maxFiles: number,
): SourceModuleCorpus {
  const rootAbsolute = path.resolve(root);
  const discovered = sourceModuleFiles(rootAbsolute, sourceDirectories);
  const truncated = discovered.length > maxFiles;
  const selected = truncated ? discovered.slice(0, maxFiles) : discovered;
  const files: SourceModuleMaterial[] = [];
  for (const absolutePath of selected) {
    try {
      const content = readFileUtf8(absolutePath);
      files.push(Object.freeze({
        path: sourceModuleRelativePath(rootAbsolute, absolutePath),
        absolutePath,
        content,
        identity: contentAddress(content),
      }));
    } catch {
      // Unreadable material is not falsely included in the admitted corpus.
    }
  }
  const sourceDirs = Object.freeze([...new Set(sourceDirectories)].sort());
  const frozenFiles = Object.freeze(files);
  const source = contentAddress(sourceModuleManifest({ sourceDirs, truncated, files: frozenFiles }));
  return Object.freeze({
    kind: "metroplat.monitoring.source-code.corpus" as const,
    root: rootAbsolute,
    sourceDirs,
    truncated,
    files: frozenFiles,
    source,
  });
}

/** Exact canonical source-string artifacts already admitted by this corpus read. */
export function sourceModuleArtifacts(corpus: SourceModuleCorpus): readonly ArtifactSource[] {
  const byIdentity = new Map<ArtifactRef, ArtifactSource>();
  byIdentity.set(corpus.source, Object.freeze({
    ref: corpus.source,
    canonicalText: canonicalBytes(sourceModuleManifest(corpus)),
  }));
  for (const file of corpus.files) {
    if (!byIdentity.has(file.identity)) {
      byIdentity.set(file.identity, Object.freeze({
        ref: file.identity,
        canonicalText: canonicalBytes(file.content),
      }));
    }
  }
  return Object.freeze([...byIdentity.values()].sort((left, right) => left.ref.localeCompare(right.ref)));
}

export function sourceModuleConfinedPath(root: string, relative: string): string {
  const rootAbsolute = path.resolve(root);
  const full = path.resolve(rootAbsolute, relative);
  if (full !== rootAbsolute && !full.startsWith(rootAbsolute + path.sep)) {
    throw new TypeError("source module path escapes the monitored package root");
  }
  return full;
}
