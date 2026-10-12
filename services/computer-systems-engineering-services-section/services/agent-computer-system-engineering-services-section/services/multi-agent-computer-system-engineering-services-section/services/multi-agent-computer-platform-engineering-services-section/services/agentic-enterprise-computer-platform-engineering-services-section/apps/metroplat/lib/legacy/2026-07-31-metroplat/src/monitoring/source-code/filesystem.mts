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

function sourceScriptKind(file: string): ts.ScriptKind {
  return file.endsWith(".tsx") ? ts.ScriptKind.TSX
    : file.endsWith(".jsx") ? ts.ScriptKind.JSX
      : /\.(?:mts|cts|ts)$/u.test(file) ? ts.ScriptKind.TS
        : ts.ScriptKind.JS;
}

/** One compiler view over the exact bytes admitted by a source corpus.
 * Repeated analyses of the same corpus share its immutable syntax trees. */
export function sourceModuleProgram(corpus: SourceModuleCorpus): ts.Program {
  const cached = programByCorpus.get(corpus);
  if (cached !== undefined) return cached;
  const options: ts.CompilerOptions = {
    allowJs: true,
    checkJs: false,
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
    return material === undefined
      ? fallback(fileName, languageVersion, onError, shouldCreateNewSourceFile)
      : ts.createSourceFile(fileName, material.content, languageVersion, true, sourceScriptKind(fileName));
  };
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
      pruneDirectory: (name) => name === "node_modules" || name === "dist" || name === ".tmp" || name === ".git",
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
