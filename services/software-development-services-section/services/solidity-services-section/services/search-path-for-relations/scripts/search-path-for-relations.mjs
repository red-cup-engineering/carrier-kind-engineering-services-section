#!/usr/bin/env node
import { searchSolidityPathForRelations } from "../src/search-solidity-path-for-relations.mjs";

const [path, functionName] = process.argv.slice(2);
if (!path || !functionName || process.argv.length !== 4) {
  process.stderr.write("usage: search-path-for-relations.mjs <path> <solidity-function-or-symbol>\n");
  process.exitCode = 64;
} else {
  const result = await searchSolidityPathForRelations({ path, function: functionName });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
