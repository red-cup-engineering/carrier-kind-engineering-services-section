import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the communicating surface is an exact 70-symbol provenance closure", async () => {
  const receipt = JSON.parse(await readFile(new URL("../../../provenance/communicating-symbols.json", import.meta.url), "utf8"));
  assert.equal(Object.keys(receipt.symbols).length, 70);
  assert.equal(new Set(Object.keys(receipt.symbols)).size, 70);
});
