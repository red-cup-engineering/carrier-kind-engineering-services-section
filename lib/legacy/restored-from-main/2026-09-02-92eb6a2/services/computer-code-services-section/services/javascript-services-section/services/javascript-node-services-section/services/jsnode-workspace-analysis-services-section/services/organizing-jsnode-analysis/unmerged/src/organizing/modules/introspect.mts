// introspect.mts — project a TypeScript declaration surface into the type
// category.
//
// Reading concrete declaration files into a TypeCatalog is the same move the
// holography packages make against their hosts: a concrete artifact projected
// onto an algebraic carrier. The TypeScript compiler is a heavy capability with
// real filesystem I/O, so it lives here in the computer — not in the pure
// @emsenn/javascript-algebra. The algebra defines the carrier; this projects
// onto it.

import path from "node:path";
import { readdirSync, statSync } from "node:fs";
import ts from "typescript";
import { isExportedDeclaration, parseJSNodeSourceFile } from "./syntax.mjs";
import {
  typeCatalog,
  jsType,
  jsFn,
  type TypeCatalog,
  type JsType,
  type JsFn,
  type SubtypeEdge,
} from "../typing/algebra/index.mjs";

function heritageNames(
  node: ts.ClassDeclaration | ts.InterfaceDeclaration,
): readonly string[] {
  const names: string[] = [];
  for (const clause of node.heritageClauses ?? []) {
    for (const t of clause.types) {
      if (ts.isIdentifier(t.expression)) names.push(t.expression.text);
    }
  }
  return names;
}

function typeNameOf(node: ts.TypeNode | undefined, source: ts.SourceFile): string {
  if (!node) return "unknown";
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    return node.typeName.text;
  }
  // Primitives (string, number, void, …) are keyword type nodes; getText needs
  // the owning source file to resolve their span.
  return node.getText(source);
}

function fnFrom(
  name: string,
  node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | ts.FunctionTypeNode,
  source: ts.SourceFile,
): JsFn {
  const domain = node.parameters.map((p) => typeNameOf(p.type, source));
  const codomain = node.type ? typeNameOf(node.type, source) : undefined;
  return jsFn(codomain === undefined ? { name, domain } : { name, domain, codomain });
}

// Collect the exported declarations directly authored in one source file.
function collectFromSource(source: ts.SourceFile): {
  types: JsType[];
  functions: JsFn[];
  subtypes: SubtypeEdge[];
} {
  const types: JsType[] = [];
  const functions: JsFn[] = [];
  const subtypes: SubtypeEdge[] = [];
  source.forEachChild((node) => {
    if (ts.isClassDeclaration(node) && node.name && isExportedDeclaration(node)) {
      types.push(jsType(node.name.text, "class"));
      for (const sup of heritageNames(node)) subtypes.push([node.name.text, sup]);
    } else if (ts.isInterfaceDeclaration(node) && isExportedDeclaration(node)) {
      types.push(jsType(node.name.text, "interface"));
      for (const sup of heritageNames(node)) subtypes.push([node.name.text, sup]);
    } else if (ts.isTypeAliasDeclaration(node) && isExportedDeclaration(node)) {
      types.push(jsType(node.name.text, "type-alias"));
    } else if (ts.isFunctionDeclaration(node) && node.name && isExportedDeclaration(node)) {
      functions.push(fnFrom(node.name.text, node, source));
    } else if (ts.isVariableStatement(node) && isExportedDeclaration(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        // Declaration form: `declare const f: (...) => T` — a function type annotation.
        if (decl.type && ts.isFunctionTypeNode(decl.type)) {
          functions.push(fnFrom(decl.name.text, decl.type, source));
        } else if (
          // source form: `const f = (...) => ...`
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
        ) {
          functions.push(fnFrom(decl.name.text, decl.initializer, source));
        }
      }
    }
  });
  return { types, functions, subtypes };
}

// Parse one entry file into a source AST, or undefined if it can't be read.
// `collectFromSource` is purely syntactic — declaration syntax and textual type
// names, never the type checker — so a per-file `createSourceFile` parse yields
// the same collection a resolved `ts.Program` would, without paying NodeNext
// module resolution (which would follow every import across the dependency graph
// and the standard library). Reading a package's own declarations is parsing,
// not type-checking.
function parseEntry(file: string): ts.SourceFile | undefined {
  try {
    return parseJSNodeSourceFile(file);
  } catch {
    return undefined;
  }
}

/** Per-entry-file projection: each entry file's own declarations are collected
 *  separately, letting the caller attribute types and functions to the package
 *  whose file they came from. */
export interface FileCatalog {
  readonly file: string;
  readonly catalog: TypeCatalog;
}

export function introspectDeclarationsByFile(
  entryFiles: readonly string[],
): readonly FileCatalog[] {
  const out: FileCatalog[] = [];
  for (const file of entryFiles) {
    const source = parseEntry(file);
    if (source === undefined) continue;
    const { types, functions, subtypes } = collectFromSource(source);
    out.push({ file, catalog: typeCatalog({ types, functions, subtypes }) });
  }
  return out;
}

// Project the exported declarations of the given entry files into one catalog.
export function introspectDeclarations(entryFiles: readonly string[]): TypeCatalog {
  const types: JsType[] = [];
  const functions: JsFn[] = [];
  const subtypes: SubtypeEdge[] = [];
  for (const file of entryFiles) {
    const source = parseEntry(file);
    if (source === undefined) continue;
    const part = collectFromSource(source);
    types.push(...part.types);
    functions.push(...part.functions);
    subtypes.push(...part.subtypes);
  }
  return typeCatalog({ types, functions, subtypes });
}

export interface DeclarationFileOptions {
  readonly recursive?: boolean;
}

export function declarationFiles(dir: string, options: DeclarationFileOptions = {}): readonly string[] {
  const out: string[] = [];
  let entries: readonly string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of [...entries].sort()) {
    const file = path.join(dir, entry);
    const stats = statSync(file);
    if (stats.isDirectory()) {
      if (options.recursive === true) out.push(...declarationFiles(file, options));
    } else if (entry.endsWith(".d.ts") || entry.endsWith(".d.mts")) {
      out.push(file);
    }
  }
  return out;
}

// A package's declaration surface is its whole `dist` tree, not just the
// top-level barrel: modules live in subdirectories, and a root `index.d.mts`
// that only re-exports carries no declarations of its own. Read recursively, the
// same surface the workspace type-index attributes per package.
export function introspectDirectory(dir: string): TypeCatalog {
  return introspectDeclarations(declarationFiles(dir, { recursive: true }));
}
