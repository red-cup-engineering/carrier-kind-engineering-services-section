import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("narrow provider deliberately advertises no process bins", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(Object.hasOwn(manifest, "bin"), false);
});
