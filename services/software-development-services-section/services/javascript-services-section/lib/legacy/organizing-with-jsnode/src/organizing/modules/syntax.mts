import { readFileSync } from "node:fs";
import ts from "typescript";

export const JSNODE_SOURCE_EXTENSIONS = Object.freeze([".mts", ".ts", ".tsx", ".mjs", ".js", ".jsx", ".cts", ".cjs"] as const);
export const JSNODE_SOURCE_SKIP_DIRS = Object.freeze(["node_modules", "dist", ".tmp", ".git", "coverage"] as const);

export function isExportedDeclaration(node: ts.Node): boolean {
  return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
}

export function scriptKindOf(fileName: string): ts.ScriptKind {
  if (fileName.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (fileName.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (/\.[mc]?ts$/.test(fileName)) return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

export function parseJSNodeSourceFile(fileName: string, text = readFileSync(fileName, "utf8")): ts.SourceFile {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.ES2024, true, scriptKindOf(fileName));
}

export function stripBlockComment(raw: string): string {
  return raw
    .replace(/^\/\*\*?/, "")
    .replace(/\*\/$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*?\s?/, ""))
    .filter((line) => !/^@\w+/.test(line.trim()))
    .join("\n");
}

export function collapseDocText(value: string): string {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !/^@\w+/.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
