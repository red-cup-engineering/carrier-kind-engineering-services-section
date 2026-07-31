import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { searchPathForRelations } from "../src/search-path-for-relations.mjs";

test("the caller supplies relation semantics while traversal stays bounded", async () => {
  const root = await mkdtemp(join(tmpdir(), "path-relations-"));
  try {
    await mkdir(join(root, "nested"));
    await mkdir(join(root, "node_modules"));
    await writeFile(join(root, "nested", "consumer.txt"), "use Needle here\n");
    await writeFile(join(root, "node_modules", "excluded.txt"), "Needle\n");
    const result = await searchPathForRelations({
      path: root,
      relationFunction: ({ source }) => source.includes("Needle") ? { kind: "mention" } : [],
    });
    assert.deepEqual(result.relations, [{ path: "nested/consumer.txt", kind: "mention" }]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
