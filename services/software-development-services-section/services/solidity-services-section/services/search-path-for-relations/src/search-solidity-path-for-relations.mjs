import { extname } from "node:path";
import { searchPathForRelations } from "../../../../search-path-for-relations/src/search-path-for-relations.mjs";

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
  const result = await searchPathForRelations({
    path,
    include: ({ path: candidate }) => TEXT_EXTENSIONS.has(extname(candidate).toLowerCase()),
    relationFunction: ({ source }) => source.split(/\r?\n/u).flatMap((line, index) => {
      if (!exact.test(line)) return [];
      return [{
        kind: relationKind(line, symbol, escaped),
        function: symbol,
        line: index + 1,
        column: line.indexOf(symbol) + 1,
        excerpt: line.trim(),
      }];
    }),
  });
  return Object.freeze({ ...result, type: "SolidityPathRelationSearch", function: symbol });
}
