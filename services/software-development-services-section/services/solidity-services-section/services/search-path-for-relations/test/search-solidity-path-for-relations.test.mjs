import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { searchSolidityPathForRelations } from "../src/search-solidity-path-for-relations.mjs";

test("Solidity parameterization distinguishes declarations, imports, and construction", async () => {
  const root = await mkdtemp(join(tmpdir(), "solidity-relations-"));
  try {
    await writeFile(join(root, "Exchange.sol"), "contract Exchange { function move() external {} }\n");
    await writeFile(join(root, "Consumer.sol"), 'import { Exchange } from "./Exchange.sol";\ncontract Consumer { Exchange value = new Exchange(); }\n');
    const result = await searchSolidityPathForRelations({ path: root, function: "Exchange" });
    assert.deepEqual(result.relations.map(({ kind }) => kind), ["source-import", "construction", "declaration"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
