/**
 * example-check — TypeScript-backed example fidelity for documentation cycles.
 *
 * The content gates are intentionally language-light: they can see prose and API
 * names, but not whether `encodeFrame(frame)` matches the declared signature.
 * This module lives at the jsnode edge, where a PackageSurface carries the
 * TypeScript signatures. It builds a tiny ambient program from those signatures,
 * strips imports from the model's example, and asks TypeScript whether the code
 * is even plausible against the documented package surface.
 */

import ts from "typescript";
import type { DocGate } from "@emsenn/content/topology/documentation";

import type { PackageSurface, SurfaceSymbol } from "./surface.mjs";

/** Type-check one example against the package surface used to prompt the model.
 *  This is a documentation gate, not a package compiler: it gives high-signal
 *  feedback for invented static helpers and wrong call shapes while staying
 *  hermetic and filesystem-free. */
export function exampleTypeScriptGates(surface: PackageSurface, example: string): readonly DocGate[] {
  const code = stripImports(example);
  const source = [
    ...surface.symbols.map(ambientDeclaration).filter((line) => line !== ""),
    code,
  ].join("\n");
  const diagnostics = compileInMemory(source);
  return Object.freeze([Object.freeze({
    gate: "example-typescript",
    charge: diagnostics.length === 0 ? "pass" : "fail",
    evidence: diagnostics.length === 0
      ? "the example type-checks against the package surface"
      : `${diagnostics.length} TypeScript error(s): ${diagnostics.slice(0, 3).join(" | ")}`,
  })]);
}

function stripImports(example: string): string {
  return example
    .split(/\r?\n/)
    .filter((line) => !/^\s*import(?:\s+type)?\b/.test(line))
    .join("\n");
}

function ambientDeclaration(symbol: SurfaceSymbol): string {
  const signature = symbol.signature.replace(/\s*=>\s*…\s*$/, "").trim();
  if (symbol.kind === "function") {
    return ensureSemicolon(stripParameterInitializers(
      signature.replace(/^export\s+(async\s+)?function\s+/, "declare function "),
    ));
  }
  if (symbol.kind === "class") return `declare class ${symbol.name} {}`;
  if (symbol.kind === "interface") {
    const body = signature.replace(/^export\s+/, "").trim();
    return /\{\s*}$/.test(body) || body.includes("{") ? body : `interface ${symbol.name} {}`;
  }
  if (symbol.kind === "type-alias") return ensureSemicolon(signature.replace(/^export\s+/, ""));
  if (symbol.kind === "const" || symbol.kind === "variable") {
    const typed = /^export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*(.+)$/.exec(signature);
    if (typed) return `declare const ${typed[1]}: ${typed[2]};`;
    return `declare const ${symbol.name}: unknown;`;
  }
  return "";
}

function ensureSemicolon(value: string): string {
  return /[;}]$/.test(value.trim()) ? value : `${value};`;
}

function stripParameterInitializers(signature: string): string {
  const open = signature.indexOf("(");
  const close = signature.lastIndexOf(")");
  if (open < 0 || close < open) return signature;
  const params = signature.slice(open + 1, close);
  const stripped = splitTopLevel(params).map(parameterDeclaration).join(", ");
  return `${signature.slice(0, open + 1)}${stripped}${signature.slice(close)}`;
}

function splitTopLevel(value: string): readonly string[] {
  const out: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | null = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index] ?? "";
    if (quote !== null) {
      if (char === quote && value[index - 1] !== "\\") quote = null;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(" || char === "[" || char === "{") depth += 1;
    else if (char === ")" || char === "]" || char === "}") depth -= 1;
    else if (char === "," && depth === 0) {
      out.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  const tail = value.slice(start).trim();
  if (tail !== "") out.push(tail);
  return Object.freeze(out);
}

function parameterDeclaration(param: string): string {
  const equals = param.indexOf("=");
  if (equals < 0) return param;
  const left = param.slice(0, equals).trim();
  const initializer = param.slice(equals + 1).trim();
  const typed = /^([A-Za-z_$][\w$]*)\s*:\s*(.+)$/.exec(left);
  if (typed) return `${typed[1]}?: ${typed[2]}`;
  const named = /^([A-Za-z_$][\w$]*)$/.exec(left);
  if (named) return `${named[1]}?: ${typeOfInitializer(initializer)}`;
  return left;
}

function typeOfInitializer(initializer: string): string {
  if (/^(true|false)$/.test(initializer)) return "boolean";
  if (/^-?\d+(?:\.\d+)?$/.test(initializer)) return "number";
  if (/^["'`]/.test(initializer)) return "string";
  return "unknown";
}

function compileInMemory(source: string): readonly string[] {
  const fileName = "documentation-example.ts";
  const options: ts.CompilerOptions = {
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
  };
  const host = ts.createCompilerHost(options);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (name === fileName) return ts.createSourceFile(name, source, languageVersion, true);
    return originalGetSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile);
  };
  host.fileExists = (name) => name === fileName || ts.sys.fileExists(name);
  host.readFile = (name) => name === fileName ? source : ts.sys.readFile(name);

  const program = ts.createProgram([fileName], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.file?.fileName === fileName)
    .map(formatDiagnostic);
  return Object.freeze(diagnostics);
}

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
  if (diagnostic.file === undefined || diagnostic.start === undefined) return message;
  const pos = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  return `${pos.line + 1}:${pos.character + 1} ${message}`;
}
