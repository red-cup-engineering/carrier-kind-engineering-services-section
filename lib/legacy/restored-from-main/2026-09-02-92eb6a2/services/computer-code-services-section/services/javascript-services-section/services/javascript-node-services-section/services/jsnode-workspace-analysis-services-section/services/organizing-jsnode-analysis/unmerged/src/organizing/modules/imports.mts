// imports.mts — read the *demand* surface of JavaScript source.
//
// introspect.mts reads what a module *supplies* (its exported declarations).
// This reads what a module *demands*: the bindings it pulls in from other
// modules. Where introspect projects onto the type category, this projects onto
// the import relation — the dual half of the dependency graph at symbol
// granularity.
//
// This is a purely syntactic read, so it uses `ts.createSourceFile` per file
// rather than the heavy whole-program `ts.createProgram`: no type resolution is
// needed to see that `import { foo } from "x"` names `foo` from `"x"`. That
// keeps a workspace-wide sweep of 120+ packages cheap.

import { readFileSync } from "node:fs";
import ts from "typescript";
import { parseJSNodeSourceFile } from "./syntax.mjs";

/** One binding a source file pulls in from another module.
 *
 *  `mode` discriminates the precision of the read — this matters downstream:
 *  a `named` binding names exactly one provider symbol, but `namespace`,
 *  `star-reexport`, and `dynamic` reach a provider *without* naming which of
 *  its symbols are used. Any "is this symbol unused?" analysis must treat the
 *  coarse modes as usage-indeterminate, never as evidence of non-use. */
export interface ImportBinding {
  /** The module specifier as written, e.g. `"@emsenn/x"` or `"@emsenn/x/sub"`.
   *  `undefined` only for a dynamic import whose argument is not a literal. */
  readonly specifier: string | undefined;
  readonly mode: "named" | "default" | "namespace" | "star-reexport" | "dynamic";
  /** The provider-side symbol name. Present for `named` (and `"default"` for a
   *  default import); absent for the package-coarse modes. For `import { a as b }`
   *  this is `a` — the name as the provider exports it, not the local alias. */
  readonly name?: string;
  /** Whether the binding is type-only (`import type`, or a type-only specifier).
   *  A class is both a value and a type, so type-only imports still count as
   *  *using* the class — callers analysing class usage must not drop these. */
  readonly typeOnly: boolean;
}

export interface FileImports {
  readonly file: string;
  readonly bindings: readonly ImportBinding[];
}

function stringLiteralText(node: ts.Expression | undefined): string | undefined {
  return node && ts.isStringLiteralLike(node) ? node.text : undefined;
}

function collectImportDeclaration(node: ts.ImportDeclaration, out: ImportBinding[]): void {
  const specifier = stringLiteralText(node.moduleSpecifier);
  const clause = node.importClause;
  // `import "x"` — side-effect import, no bindings. Skip.
  if (!clause) return;
  const clauseTypeOnly = clause.isTypeOnly;
  // `import Foo from "x"`
  if (clause.name) {
    out.push({ specifier, mode: "default", name: "default", typeOnly: clauseTypeOnly });
  }
  const named = clause.namedBindings;
  if (named && ts.isNamespaceImport(named)) {
    // `import * as ns from "x"` — coarse: reaches the package, names no symbol.
    out.push({ specifier, mode: "namespace", typeOnly: clauseTypeOnly });
  } else if (named && ts.isNamedImports(named)) {
    for (const el of named.elements) {
      // `import { a as b }` → propertyName is `a`; otherwise the name itself.
      const providerName = (el.propertyName ?? el.name).text;
      out.push({
        specifier,
        mode: "named",
        name: providerName,
        typeOnly: clauseTypeOnly || el.isTypeOnly,
      });
    }
  }
}

function collectExportDeclaration(node: ts.ExportDeclaration, out: ImportBinding[]): void {
  // Only re-exports carry a module specifier; a plain `export { x }` does not.
  if (!node.moduleSpecifier) return;
  const specifier = stringLiteralText(node.moduleSpecifier);
  const clauseTypeOnly = node.isTypeOnly;
  const clause = node.exportClause;
  if (!clause) {
    // `export * from "x"` — coarse: re-exports everything, names no symbol.
    out.push({ specifier, mode: "star-reexport", typeOnly: clauseTypeOnly });
  } else if (ts.isNamespaceExport(clause)) {
    // `export * as ns from "x"` — coarse like a namespace import.
    out.push({ specifier, mode: "namespace", typeOnly: clauseTypeOnly });
  } else {
    for (const el of clause.elements) {
      const providerName = (el.propertyName ?? el.name).text;
      out.push({
        specifier,
        mode: "named",
        name: providerName,
        typeOnly: clauseTypeOnly || el.isTypeOnly,
      });
    }
  }
}

function isDynamicImportCall(node: ts.Node): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword
  );
}

/** Read every import/re-export/dynamic-import binding from one file's source
 *  text. Top-level imports and re-exports are direct children; dynamic imports
 *  can be nested anywhere, so the whole tree is walked. */
export function readImports(sourceText: string, fileName: string): readonly ImportBinding[] {
  const source = parseJSNodeSourceFile(fileName, sourceText);
  const out: ImportBinding[] = [];
  source.forEachChild((node) => {
    if (ts.isImportDeclaration(node)) collectImportDeclaration(node, out);
    else if (ts.isExportDeclaration(node)) collectExportDeclaration(node, out);
  });
  // Dynamic imports live in expression position, anywhere in the tree.
  const visit = (node: ts.Node): void => {
    if (isDynamicImportCall(node)) {
      out.push({ specifier: stringLiteralText(node.arguments[0]), mode: "dynamic", typeOnly: false });
    }
    node.forEachChild(visit);
  };
  source.forEachChild(visit);
  return out;
}

/** Read imports from a set of files on disk. Unreadable files are skipped (they
 *  contribute no demand), so a partial tree still yields a usable surface. */
export function introspectImports(files: readonly string[]): readonly FileImports[] {
  const out: FileImports[] = [];
  for (const file of files) {
    let text: string;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    out.push({ file, bindings: readImports(text, file) });
  }
  return out;
}
