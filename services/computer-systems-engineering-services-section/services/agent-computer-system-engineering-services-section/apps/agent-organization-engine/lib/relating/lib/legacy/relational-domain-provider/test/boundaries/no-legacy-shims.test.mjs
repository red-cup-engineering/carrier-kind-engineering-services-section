import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("manifest excludes omnibus compatibility and effect providers", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  const names = Object.keys(manifest.dependencies);
  for (const fragment of ["semantic-content", "runtime", "rdf", "http", "file-codec", "witness-journal"]) {
    assert.equal(names.some((name) => name.includes(fragment)), false, fragment);
  }
});
