import { readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

import type { UtteranceCarrier } from "@emsenn/relating";

import { extractDocSurface, type DocSymbol } from "./documentation.mjs";
import { introspectImports, type ImportBinding } from "./imports.mjs";
import { JSNODE_SOURCE_EXTENSIONS, JSNODE_SOURCE_SKIP_DIRS, isExportedDeclaration, parseJSNodeSourceFile } from "./syntax.mjs";
import { jsNodeFact, jsNodeObservation, type Observation } from "../facts.mjs";

export interface SourceModuleFileOptions {
  readonly includeTests?: boolean;
  readonly excludeDirs?: readonly string[];
}

export type SourceDeclarationKind = "function" | "class" | "interface" | "type-alias" | "const" | "variable";

export interface SourceDeclaration {
  readonly name: string;
  readonly kind: SourceDeclarationKind;
  readonly exported: boolean;
}

export interface SourceModuleCarrier {
  readonly kind: "organizing-with-jsnode.source-module";
  readonly term: string;
  readonly file: string;
  readonly utterances: readonly UtteranceCarrier[];
  readonly observation: Observation;
}

export interface SourceDirectoryCarrier {
  readonly kind: "organizing-with-jsnode.source-directory";
  readonly term: string;
  readonly directory: string;
  readonly files: readonly SourceModuleCarrier[];
  readonly utterances: readonly UtteranceCarrier[];
  readonly observation: Observation;
}

export function isJSNodeSourceFile(file: string, options: SourceModuleFileOptions = {}): boolean {
  if (
    !JSNODE_SOURCE_EXTENSIONS.includes(path.extname(file) as typeof JSNODE_SOURCE_EXTENSIONS[number]) ||
    file.endsWith(".d.ts") ||
    file.endsWith(".d.mts") ||
    file.endsWith(".d.cts")
  ) return false;
  return options.includeTests === true || !/\.(test|spec)\.[mc]?[tj]sx?$/.test(file);
}

export function sourceModuleTerm(file: string): string {
  return `jsnode.module.${path.resolve(file)}`;
}

export function sourceDirectoryTerm(dir: string): string {
  return `jsnode.source-directory.${path.resolve(dir)}`;
}

export function sourceModuleCarrier(file: string): SourceModuleCarrier {
  const utterances = Object.freeze([...sourceModuleUtterances(file)]);
  return Object.freeze({
    kind: "organizing-with-jsnode.source-module" as const,
    term: sourceModuleTerm(file),
    file: path.resolve(file),
    utterances,
    observation: jsNodeObservation(utterances),
  });
}

export function sourceModuleUtterances(file: string): readonly UtteranceCarrier[] {
  const imports = introspectImports([file]).flatMap((read) =>
    read.bindings.flatMap((binding, index) => importBindingUtterances(read.file, binding, index)),
  );
  const docs = extractDocSurface(file).flatMap((symbol) => docSymbolUtterances(file, symbol));
  const declarations = readSourceDeclarations(file).flatMap((declaration) => declarationUtterances(file, declaration));
  return [
    jsNodeFact(sourceModuleTerm(file), "jsnode.module.path", path.resolve(file)),
    ...imports,
    ...declarations,
    ...docs,
  ];
}

export function sourceDirectoryCarrier(dir: string, options: SourceModuleFileOptions = {}): SourceDirectoryCarrier {
  const files = Object.freeze(sourceModuleFiles(dir, options).map(sourceModuleCarrier));
  const utterances = Object.freeze([
    jsNodeFact(sourceDirectoryTerm(dir), "jsnode.source-directory.path", path.resolve(dir)),
    ...files.flatMap((file) => [
      jsNodeFact(sourceDirectoryTerm(dir), "jsnode.source-directory.has-module", file.term),
      ...file.utterances,
    ]),
  ]);
  return Object.freeze({
    kind: "organizing-with-jsnode.source-directory" as const,
    term: sourceDirectoryTerm(dir),
    directory: path.resolve(dir),
    files,
    utterances,
    observation: jsNodeObservation(utterances),
  });
}

export function sourceDirectoryUtterances(dir: string, options: SourceModuleFileOptions = {}): readonly UtteranceCarrier[] {
  return sourceDirectoryCarrier(dir, options).utterances;
}

export function sourceModuleFiles(dir: string, options: SourceModuleFileOptions = {}): readonly string[] {
  return walkSource(dir, options);
}

function walkSource(dir: string, options: SourceModuleFileOptions, out: string[] = []): string[] {
  const skipDirs = new Set([...JSNODE_SOURCE_SKIP_DIRS, ...(options.excludeDirs ?? [])]);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) walkSource(full, options, out);
    } else if (isJSNodeSourceFile(full, options)) {
      out.push(full);
    }
  }
  return out.sort();
}

export function readSourceDeclarations(file: string, text?: string): readonly SourceDeclaration[] {
  const source = parseJSNodeSourceFile(file, text);
  const out: SourceDeclaration[] = [];
  source.forEachChild((node) => {
    const exported = isExportedDeclaration(node);
    if (ts.isFunctionDeclaration(node) && node.name) {
      out.push({ name: node.name.text, kind: "function", exported });
    } else if (ts.isClassDeclaration(node) && node.name) {
      out.push({ name: node.name.text, kind: "class", exported });
    } else if (ts.isInterfaceDeclaration(node)) {
      out.push({ name: node.name.text, kind: "interface", exported });
    } else if (ts.isTypeAliasDeclaration(node)) {
      out.push({ name: node.name.text, kind: "type-alias", exported });
    } else if (ts.isVariableStatement(node)) {
      const variableKind = node.declarationList.flags & ts.NodeFlags.Const ? "const" : "variable";
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) out.push({ name: declaration.name.text, kind: variableKind, exported });
      }
    }
  });
  return Object.freeze(out);
}

function importBindingTerm(file: string, binding: ImportBinding, index: number): string {
  const specifier = binding.specifier ?? "dynamic";
  const name = binding.name ?? "_";
  return `jsnode.import.${path.resolve(file)}:${index}:${binding.mode}:${specifier}:${name}`;
}

function importBindingUtterances(file: string, binding: ImportBinding, index: number): readonly UtteranceCarrier[] {
  const subject = sourceModuleTerm(file);
  const bindingTerm = importBindingTerm(file, binding, index);
  const out: UtteranceCarrier[] = [];
  out.push(jsNodeFact(subject, "jsnode.module.has-import", bindingTerm));
  if (binding.specifier !== undefined) out.push(jsNodeFact(bindingTerm, "jsnode.import.specifier", binding.specifier));
  out.push(jsNodeFact(bindingTerm, "jsnode.import.mode", binding.mode));
  out.push(jsNodeFact(bindingTerm, "jsnode.import.type-only", binding.typeOnly));
  if (binding.name !== undefined) out.push(jsNodeFact(bindingTerm, "jsnode.import.symbol", binding.name));
  return out;
}

function declarationTerm(file: string, declaration: SourceDeclaration): string {
  return `jsnode.declaration.${path.resolve(file)}:${declaration.name}`;
}

function declarationUtterances(file: string, declaration: SourceDeclaration): readonly UtteranceCarrier[] {
  const subject = declarationTerm(file, declaration);
  return [
    jsNodeFact(sourceModuleTerm(file), "jsnode.module.declares-symbol", subject),
    jsNodeFact(subject, "jsnode.declaration.identity", declaration),
    jsNodeFact(subject, "jsnode.declaration.name", declaration.name),
    jsNodeFact(subject, "jsnode.declaration.kind", declaration.kind),
    jsNodeFact(subject, "jsnode.declaration.exported", declaration.exported),
  ];
}

function docSymbolUtterances(file: string, symbol: DocSymbol): readonly UtteranceCarrier[] {
  const subject = `jsnode.symbol.${path.resolve(file)}:${symbol.name}`;
  return [
    jsNodeFact(sourceModuleTerm(file), "jsnode.module.exports-symbol", subject),
    jsNodeFact(subject, "jsnode.symbol.name", symbol.name),
    jsNodeFact(subject, "jsnode.symbol.kind", symbol.kind),
    jsNodeFact(subject, "jsnode.symbol.signature", symbol.signature),
    jsNodeFact(subject, "jsnode.symbol.has-doc", symbol.doc.trim() !== ""),
  ];
}
