// documentation.mts — read the *documentary* surface of JavaScript source.
//
// introspect.mts projects declarations onto the type category (names, domains,
// codomains) — the algebraic skeleton. This reads the surface a documenter
// needs: each exported symbol's verbatim signature and its leading JSDoc, the
// two richest deterministic signals about what a symbol is for. Keeping this
// here (not in the pure @emsenn/javascript-algebra) is the same discipline
// introspect follows: the algebra's JsType/JsFn are identity-by-name carriers
// and must not grow doc text; the computer reads the prose off the source.
//
// Like imports.mts this is a purely syntactic read — a documenter wants the
// signature as written (param names, defaults, JSDoc), none of which needs type
// resolution — so it uses the cheap per-file `ts.createSourceFile`, never the
// heavy whole-program. A workspace sweep of 120+ packages stays cheap.

import { readFileSync } from "node:fs";
import ts from "typescript";

/** What kind of declaration a documented symbol is. Mirrors the TypeScript
 *  declaration forms a `.mts` source exports; `const`/`variable` split arrow
 *  consts (documentable like functions) from plain value exports. */
export type DocSymbolKind =
  | "function"
  | "class"
  | "interface"
  | "type-alias"
  | "const"
  | "variable";

/** One exported symbol's documentary surface: its name, what it is, the
 *  verbatim signature (declaration head, body elided), and its leading JSDoc
 *  description (delimiters and tag noise stripped; `""` when undocumented). */
export interface DocSymbol {
  readonly name: string;
  readonly kind: DocSymbolKind;
  /** The declaration head as written — params, type annotations, heritage —
   *  with any function/class/interface body elided. The literal signature is
   *  the richest non-hallucinatable fact a documenter has. */
  readonly signature: string;
  /** The leading JSDoc description: the comment text with `/**`, ` * `, and
   *  trailing `@tag` lines removed. `""` when the symbol carries no JSDoc. */
  readonly doc: string;
}

/** Parse one source file's exported declarations into documentary surfaces.
 *  `text` may be passed to read already-loaded source; otherwise the file is
 *  read from disk. Non-exported declarations are skipped — documentation is
 *  about the public surface. */
export function extractDocSurface(file: string, text?: string): readonly DocSymbol[] {
  const source = ts.createSourceFile(
    file,
    text ?? readFileSync(file, "utf8"),
    ts.ScriptTarget.ES2024,
    /* setParentNodes */ true,
  );
  const out: DocSymbol[] = [];
  source.forEachChild((node) => {
    if (!isExported(node)) return;
    if (ts.isFunctionDeclaration(node) && node.name) {
      out.push(symbol(node.name.text, "function", functionSignature(node, source), node, source));
    } else if (ts.isClassDeclaration(node) && node.name) {
      out.push(symbol(node.name.text, "class", classOrInterfaceHead(node, source), node, source));
    } else if (ts.isInterfaceDeclaration(node)) {
      out.push(symbol(node.name.text, "interface", classOrInterfaceHead(node, source), node, source));
    } else if (ts.isTypeAliasDeclaration(node)) {
      out.push(symbol(node.name.text, "type-alias", typeAliasSignature(node, source), node, source));
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        const isArrow =
          decl.initializer !== undefined &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer));
        out.push(
          symbol(
            decl.name.text,
            isArrow ? "const" : "variable",
            variableSignature(node, decl, source),
            // JSDoc on `export const x = …` attaches to the VariableStatement,
            // not the declaration — read the comment off the statement node.
            node,
            source,
          ),
        );
      }
    }
  });
  return Object.freeze(out);
}

function symbol(
  name: string,
  kind: DocSymbolKind,
  signature: string,
  docNode: ts.Node,
  source: ts.SourceFile,
): DocSymbol {
  return Object.freeze({ name, kind, signature: tidy(signature), doc: leadingDoc(docNode, source) });
}

function isExported(node: ts.Node): boolean {
  return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
}

// ---------- signatures (body elided, head preserved verbatim) ----------

function sliceTo(node: ts.Node, end: number | undefined, source: ts.SourceFile): string {
  const start = node.getStart(source);
  return source.text.slice(start, end ?? node.getEnd());
}

function functionSignature(node: ts.FunctionDeclaration, source: ts.SourceFile): string {
  // Everything before the body block is the signature; an overload/ambient
  // declaration with no body is already body-free.
  return withExport(node, sliceTo(node, node.body?.getStart(source), source));
}

function classOrInterfaceHead(
  node: ts.ClassDeclaration | ts.InterfaceDeclaration,
  source: ts.SourceFile,
): string {
  // The member block opens at the first `{` after the (optional) heritage
  // clauses; the head is name + type params + heritage.
  const text = source.text.slice(node.getStart(source), node.getEnd());
  const brace = text.indexOf("{");
  return withExport(node, brace >= 0 ? text.slice(0, brace) : text);
}

function typeAliasSignature(node: ts.TypeAliasDeclaration, source: ts.SourceFile): string {
  // `type X = …`: keep the `type X =` head and the right-hand side, but the RHS
  // of a big object/union type is noise — truncate it to one legible line.
  const head = `type ${node.name.text}${node.typeParameters ? `<${node.typeParameters.map((p) => p.getText(source)).join(", ")}>` : ""}`;
  const rhs = tidy(node.type.getText(source));
  return withExport(node, `${head} = ${rhs}`);
}

function variableSignature(
  statement: ts.VariableStatement,
  decl: ts.VariableDeclaration,
  source: ts.SourceFile,
): string {
  const keyword = statement.declarationList.flags & ts.NodeFlags.Const ? "const" : statement.declarationList.flags & ts.NodeFlags.Let ? "let" : "var";
  if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
    const fn = decl.initializer;
    const params = fn.parameters.map((p) => p.getText(source)).join(", ");
    const ret = fn.type ? `: ${fn.type.getText(source)}` : "";
    const generics = fn.typeParameters ? `<${fn.typeParameters.map((p) => p.getText(source)).join(", ")}>` : "";
    return `export ${keyword} ${decl.name.getText(source)} = ${generics}(${params})${ret} => …`;
  }
  // Plain value export: keep the type annotation if present, elide the value.
  const ann = decl.type ? `: ${tidy(decl.type.getText(source))}` : "";
  return `export ${keyword} ${decl.name.getText(source)}${ann}`;
}

function withExport(node: ts.Node, sig: string): string {
  const trimmed = sig.trim();
  return /^export\b/.test(trimmed) ? trimmed : `export ${trimmed}`;
}

function tidy(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

// ---------- JSDoc ----------

/** The leading JSDoc description for a node: prefers the parsed comment text
 *  (TypeScript strips the `/**` and ` * ` framing), falling back to a raw
 *  block-comment scan. Plain `//` line comments are not documentation and are
 *  ignored. `@tag` lines are dropped — the prose description is the signal. */
function leadingDoc(node: ts.Node, source: ts.SourceFile): string {
  const jsDoc = (node as { jsDoc?: readonly ts.JSDoc[] }).jsDoc;
  if (jsDoc && jsDoc.length > 0) {
    const last = jsDoc[jsDoc.length - 1];
    const comment = last?.comment;
    if (typeof comment === "string" && comment.trim() !== "") return collapse(comment);
    if (Array.isArray(comment)) {
      const text = comment.map((part) => (typeof part.text === "string" ? part.text : "")).join("");
      if (text.trim() !== "") return collapse(text);
    }
  }
  // Fallback: a leading /** … */ block the parser did not attach (rare).
  const ranges = ts.getLeadingCommentRanges(source.text, node.getFullStart()) ?? [];
  for (const range of ranges.reverse()) {
    if (range.kind !== ts.SyntaxKind.MultiLineCommentTrivia) continue;
    const raw = source.text.slice(range.pos, range.end);
    if (!raw.startsWith("/**")) continue;
    return collapse(stripBlockComment(raw));
  }
  return "";
}

function stripBlockComment(raw: string): string {
  return raw
    .replace(/^\/\*\*?/, "")
    .replace(/\*\/$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*?\s?/, ""))
    .filter((line) => !/^@\w+/.test(line.trim()))
    .join("\n");
}

function collapse(value: string): string {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !/^@\w+/.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
