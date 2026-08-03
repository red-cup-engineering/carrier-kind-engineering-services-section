import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { searchPathForSchema } from "../src/search-path-for-schema.mjs";

test("searches a path for admitted schemas and maps each into canonical assertions", async () => {
  const root = await mkdtemp(join(tmpdir(), "search-schema-"));
  try {
    await mkdir(join(root, "nested"));
    await writeFile(join(root, "nested", "example.schema.json"), JSON.stringify({ $schema: "https://json-schema.org/draft/2020-12/schema", $id: "urn:test:example", type: "object", properties: { name: { type: "string" } }, required: ["name"] }));
    await writeFile(join(root, "broken.schema.json"), "{");
    const result = await searchPathForSchema(root);
    assert.equal(result.searched, 2);
    assert.equal(result.schemas[0].schema, "urn:test:example");
    assert.ok(result.schemas[0].assertions.some(({ e, a, v }) => e === "urn:test:example#/properties/name" && a === "type" && v === "string"));
    assert.equal(result.refusals.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
