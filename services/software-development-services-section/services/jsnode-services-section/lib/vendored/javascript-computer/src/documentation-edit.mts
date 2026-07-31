// documentation-edit.mts — read full declaration source and rewrite the
// documentary layer (JSDoc) of exported symbols, without touching code.
//
// documentation.mts reads the *surface* a documenter needs (signature + leading
// JSDoc). This goes one step further so the doc layer can be *managed* through
// the computer: it locates each exported declaration with its exact character
// spans, hands back the *full* declaration text (body and all), and offers a
// pure `setJsDoc(source, name, doc)` that returns new source with the symbol's
// JSDoc inserted or replaced. The transform is purely textual — it splices a
// freshly formatted `/** … */` block above the declaration and leaves every
// other byte, including the code body, exactly as written. That invariant is
// what makes this safe to run at scale: a documenter (human or agent) reads a
// function through the computer and writes its docstring back through the
// computer; the code itself is never in the edit path.
//
// Like documentation.mts this is a per-file syntactic read (`ts.createSourceFile`,
// never the heavy whole-program), so a workspace sweep stays cheap.

import { readFileSync } from "node:fs";
import ts from "typescript";
import type { DocSymbolKind } from "./documentation.mjs";

/** An exported declaration located in source, with the spans needed to read its
 *  full text and to splice its JSDoc. Offsets are character indices into the
 *  file text. `jsDocStart`/`jsDocEnd` are present only when a leading `/** … *​/`
 *  block is already attached. */
export interface DeclaredSymbol {
  readonly name: string;
  readonly kind: DocSymbolKind;
  /** The current leading JSDoc description, collapsed to one line (`""` when
   *  the symbol is undocumented). The same value `extractDocSurface` reports. */
  readonly doc: string;
  readonly documented: boolean;
  /** Full declaration text as written — head *and* body — excluding any leading
   *  JSDoc. This is the "read the whole function" surface. */
  readonly text: string;
  /** Declaration start offset (after any leading comments/trivia). */
  readonly start: number;
  /** Declaration end offset. */
  readonly end: number;
  /** Leading whitespace of the declaration's line — the indent a rewritten
   *  JSDoc block must match. */
  readonly indent: string;
  readonly jsDocStart?: number;
  readonly jsDocEnd?: number;
}

/** Locate every exported top-level declaration in a source file, with the spans
 *  and text needed to read or re-document it. `text` may be passed to operate on
 *  already-loaded source; otherwise the file is read from disk. */
export function locateDocSymbols(file: string, text?: string): readonly DeclaredSymbol[] {
  const src = text ?? readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, src, ts.ScriptTarget.ES2024, /* setParentNodes */ true);
  const out: DeclaredSymbol[] = [];

  source.forEachChild((node) => {
    if (!isExported(node)) return;
    if (ts.isFunctionDeclaration(node) && node.name) {
      out.push(declared(node.name.text, "function", node, source));
    } else if (ts.isClassDeclaration(node) && node.name) {
      out.push(declared(node.name.text, "class", node, source));
    } else if (ts.isInterfaceDeclaration(node)) {
      out.push(declared(node.name.text, "interface", node, source));
    } else if (ts.isTypeAliasDeclaration(node)) {
      out.push(declared(node.name.text, "type-alias", node, source));
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        const isArrow =
          decl.initializer !== undefined &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer));
        // JSDoc on `export const x = …` attaches to the VariableStatement, so all
        // spans are the statement's; each declared name maps to that one block.
        out.push(declared(decl.name.text, isArrow ? "const" : "variable", node, source));
      }
    }
  });

  return Object.freeze(out);
}

function declared(
  name: string,
  kind: DocSymbolKind,
  node: ts.Node,
  source: ts.SourceFile,
): DeclaredSymbol {
  const start = node.getStart(source);
  const end = node.getEnd();
  const indent = leadingIndent(source.text, start);
  const jsDoc = leadingJsDocRange(source.text, node.getFullStart());
  const doc = jsDoc ? collapseDoc(stripBlockComment(source.text.slice(jsDoc.pos, jsDoc.end))) : "";
  const base = {
    name,
    kind,
    doc,
    documented: doc.trim() !== "",
    text: source.text.slice(start, end),
    start,
    end,
    indent,
  } as const;
  return Object.freeze(jsDoc ? { ...base, jsDocStart: jsDoc.pos, jsDocEnd: jsDoc.end } : base);
}

/** Read the full source text of one exported symbol. `includeDoc` prepends the
 *  symbol's existing JSDoc block. Returns `undefined` when no such export
 *  exists. This is "show me this whole function/class/type" through the computer. */
export function readSymbolSource(
  file: string,
  name: string,
  opts: { readonly includeDoc?: boolean } = {},
  text?: string,
): string | undefined {
  const sym = locateDocSymbols(file, text).find((s) => s.name === name);
  if (!sym) return undefined;
  const src = text ?? readFileSync(file, "utf8");
  const from = opts.includeDoc && sym.jsDocStart !== undefined ? sym.jsDocStart : sym.start;
  return src.slice(from, sym.end);
}

/** Pure: return new source text with `name`'s leading JSDoc set to `doc`,
 *  replacing any existing block or inserting a fresh one above the declaration.
 *  The code body and every other byte are preserved verbatim. Throws when the
 *  file has no exported symbol of that name. `width` controls prose wrapping
 *  (default 80 columns). */
export function setJsDoc(
  source: string,
  name: string,
  doc: string,
  opts: { readonly width?: number } = {},
): string {
  const sym = locateDocSymbols("<memory>.mts", source).find((s) => s.name === name);
  if (!sym) throw new Error(`no exported symbol named "${name}"`);
  const block = formatJsDoc(doc, sym.indent, opts.width ?? 80);

  // The line on which the declaration starts; its indent lives between here and
  // sym.start. The new block replaces everything from the start of the existing
  // JSDoc's line (if any) up to this line — collapsing stray blank lines and
  // re-indenting the comment to match the declaration.
  const declLineStart = source.lastIndexOf("\n", sym.start - 1) + 1;
  const replaceFrom =
    sym.jsDocStart !== undefined ? source.lastIndexOf("\n", sym.jsDocStart - 1) + 1 : declLineStart;
  return source.slice(0, replaceFrom) + block + "\n" + source.slice(declLineStart);
}

/** Pure: format a JSDoc description into a `/** … *​/` block at `indent`. A
 *  description that fits one line becomes `/** text *​/`; longer prose is word-
 *  wrapped into ` * ` continuation lines. Explicit newlines in `doc` are honored
 *  as hard breaks. */
export function formatJsDoc(doc: string, indent: string, width = 80): string {
  const text = doc.trim();
  if (text === "") return `${indent}/** */`;

  const inner = Math.max(20, width - indent.length - 3); // " * " framing
  const wrapped: string[] = [];
  for (const para of text.split("\n")) wrapped.push(...wrapLine(para.trim(), inner));

  if (wrapped.length === 1) {
    const only = wrapped[0] ?? "";
    if (indent.length + only.length + 7 <= width) return `${indent}/** ${only} */`;
  }
  const body = wrapped.map((line) => (line === "" ? `${indent} *` : `${indent} * ${line}`)).join("\n");
  return `${indent}/**\n${body}\n${indent} */`;
}

function wrapLine(line: string, width: number): readonly string[] {
  if (line === "") return [""];
  const words = line.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const word of words) {
    if (cur === "") cur = word;
    else if (cur.length + 1 + word.length <= width) cur += " " + word;
    else {
      out.push(cur);
      cur = word;
    }
  }
  if (cur !== "") out.push(cur);
  return out;
}

// ---------- shared syntactic helpers ----------

function isExported(node: ts.Node): boolean {
  return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
}

function leadingIndent(text: string, start: number): string {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const slice = text.slice(lineStart, start);
  const m = /^\s*/.exec(slice);
  return m ? m[0] : "";
}

/** The character range of the JSDoc block immediately preceding a node, if any:
 *  the last `/** … *​/` block among the node's leading comments. */
function leadingJsDocRange(text: string, fullStart: number): { pos: number; end: number } | undefined {
  const ranges = ts.getLeadingCommentRanges(text, fullStart) ?? [];
  for (const range of [...ranges].reverse()) {
    if (range.kind !== ts.SyntaxKind.MultiLineCommentTrivia) continue;
    if (!text.slice(range.pos, range.end).startsWith("/**")) continue;
    return { pos: range.pos, end: range.end };
  }
  return undefined;
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

function collapseDoc(value: string): string {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !/^@\w+/.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
