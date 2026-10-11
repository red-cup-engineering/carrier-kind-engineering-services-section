import { readFile, stat } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { walkPosixPaths } from "@red-cup-engineering/computer-filepath-engineering-services-section/walk-posix-paths";

const EXCLUDED_DIRECTORIES = Object.freeze([".git", "cache", "node_modules", "out"]);

const TEXT_EXTENSIONS = Object.freeze(new Set([
  "", ".js", ".json", ".jsx", ".md", ".mjs", ".py", ".sol", ".toml", ".ts", ".tsx", ".yaml", ".yml",
]));

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function relationKind(line, symbol, escaped) {
  if (new RegExp(`\\b(?:contract|interface|library|function)\\s+${escaped}\\b`, "u").test(line)) return "declaration";
  if (/^\s*import\b/u.test(line)) return "source-import";
  if (line.includes(`${symbol}.sol:${symbol}`)) return "deployment-target";
  if (line.includes(`out/${symbol}.sol/${symbol}.json`)) return "compiled-artifact";
  if (new RegExp(`\\bnew\\s+${escaped}\\s*\\(`, "u").test(line)) return "construction";
  if (line.includes(`${symbol}.selector`)) return "selector-reference";
  if (new RegExp(`\\b${escaped}\\s*\\(`, "u").test(line)) return "call-or-cast";
  return "symbol-reference";
}

export async function searchSolidityPathForRelations({ path, function: symbol }) {
  if (typeof symbol !== "string" || !/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(symbol)) {
    throw new TypeError("function must be one Solidity identifier");
  }
  const escaped = escapeRegExp(symbol);
  const exact = new RegExp(`\\b${escaped}\\b`, "u");
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path must be nonempty text");
  const root = resolve(path);
  const isText = (candidate) => TEXT_EXTENSIONS.has(extname(candidate).toLowerCase());
  const files = (await stat(root)).isFile()
    ? (isText(root) ? [{ path: basename(root), absolutePath: root }] : [])
    : (await walkPosixPaths({ root, excludes: EXCLUDED_DIRECTORIES, symlinks: "skip", result: "entries", includeFile: ({ path: candidate }) => isText(candidate) }))
      .files.map((file) => ({ path: file.path, absolutePath: resolve(root, file.path) }));
  const relationsOf = (source) => source.split(/\r?\n/u).flatMap((line, index) => {
      if (!exact.test(line)) return [];
      return [{
        kind: relationKind(line, symbol, escaped),
        function: symbol,
        line: index + 1,
        column: line.indexOf(symbol) + 1,
        excerpt: line.trim(),
      }];
    });
  const relations = [];
  for (const file of files) {
    const source = await readFile(file.absolutePath, "utf8");
    if (source.includes("\0")) continue;
    for (const relation of relationsOf(source)) relations.push(Object.freeze({ path: file.path, ...relation }));
  }
  return Object.freeze({ type: "SolidityPathRelationSearch", root, relations: Object.freeze(relations), function: symbol });
}
