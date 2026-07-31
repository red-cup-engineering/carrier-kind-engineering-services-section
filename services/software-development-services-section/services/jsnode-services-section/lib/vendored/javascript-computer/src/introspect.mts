// introspect.mts — project a TypeScript declaration surface into the type
// category.
//
// Reading concrete .d.ts files into a TypeCatalog is the same move the
// holography packages make against their hosts: a concrete artifact projected
// onto an algebraic carrier. The TypeScript compiler is a heavy capability with
// real filesystem I/O, so it lives here in the computer — not in the pure
// @emsenn/javascript-algebra. The algebra defines the carrier; this projects
// onto it.

import path from "node:path";
import { readdirSync, statSync } from "node:fs";
import ts from "typescript";
import {
  typeCatalog,
  jsType,
  jsFn,
  type TypeCatalog,
  type JsType,
  type JsFn,
  type SubtypeEdge,
} from "@emsenn/javascript/algebra";

function isExported(node: ts.Node): boolean {
  return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
}

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
    if (ts.isClassDeclaration(node) && node.name && isExported(node)) {
      types.push(jsType(node.name.text, "class"));
      for (const sup of heritageNames(node)) subtypes.push([node.name.text, sup]);
    } else if (ts.isInterfaceDeclaration(node) && isExported(node)) {
      types.push(jsType(node.name.text, "interface"));
      for (const sup of heritageNames(node)) subtypes.push([node.name.text, sup]);
    } else if (ts.isTypeAliasDeclaration(node) && isExported(node)) {
      types.push(jsType(node.name.text, "type-alias"));
    } else if (ts.isFunctionDeclaration(node) && node.name && isExported(node)) {
      functions.push(fnFrom(node.name.text, node, source));
    } else if (ts.isVariableStatement(node) && isExported(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        // .d.ts form: `declare const f: (...) => T` — a function type annotation.
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

function programOver(entryFiles: readonly string[]): ts.Program {
  return ts.createProgram([...entryFiles], {
    target: ts.ScriptTarget.ES2024,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    skipLibCheck: true,
    noEmit: true,
  });
}

/** Per-entry-file projection. One TypeScript program is built over all entry
 *  files (so the standard library is loaded once), then each entry file's own
 *  declarations are collected separately — letting the caller attribute types
 *  and functions to the package whose file they came from. */
export interface FileCatalog {
  readonly file: string;
  readonly catalog: TypeCatalog;
}

export function introspectDeclarationsByFile(
  entryFiles: readonly string[],
): readonly FileCatalog[] {
  const program = programOver(entryFiles);
  const entrySet = new Set(entryFiles.map((f) => path.resolve(f)));
  const out: FileCatalog[] = [];
  for (const source of program.getSourceFiles()) {
    if (!entrySet.has(path.resolve(source.fileName))) continue;
    const { types, functions, subtypes } = collectFromSource(source);
    out.push({ file: source.fileName, catalog: typeCatalog({ types, functions, subtypes }) });
  }
  return out;
}

// Project the exported declarations of the given entry files into one catalog.
export function introspectDeclarations(entryFiles: readonly string[]): TypeCatalog {
  const program = programOver(entryFiles);
  const entrySet = new Set(entryFiles.map((f) => path.resolve(f)));
  const types: JsType[] = [];
  const functions: JsFn[] = [];
  const subtypes: SubtypeEdge[] = [];
  for (const source of program.getSourceFiles()) {
    if (!entrySet.has(path.resolve(source.fileName))) continue;
    const part = collectFromSource(source);
    types.push(...part.types);
    functions.push(...part.functions);
    subtypes.push(...part.subtypes);
  }
  return typeCatalog({ types, functions, subtypes });
}

// Convenience: every *.d.ts directly under `dir` (one level), projected.
export function introspectDirectory(dir: string): TypeCatalog {
  const entries = readdirSync(dir)
    .filter((f) => f.endsWith(".d.ts"))
    .map((f) => path.join(dir, f))
    .filter((f) => statSync(f).isFile());
  return introspectDeclarations(entries);
}
