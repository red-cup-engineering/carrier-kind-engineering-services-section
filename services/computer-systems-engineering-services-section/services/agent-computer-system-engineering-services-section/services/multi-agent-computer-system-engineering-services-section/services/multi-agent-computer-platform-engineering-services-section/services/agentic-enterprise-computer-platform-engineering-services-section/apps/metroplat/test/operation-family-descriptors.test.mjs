import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { operationDescriptor } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { operationFamilyDescriptors } from "../src/generated/operation-family-descriptors.mjs";
import { loadOperationFamily } from "../src/operation-family-loaders.mjs";

test("generated family descriptors equal every owning implementation declaration", async () => {
  const binding = defaultFilesystemBinding(mkdtempSync(path.join(tmpdir(), "metroplat-descriptors-")));
  let operations = Object.freeze([]);
  let sources = Object.freeze([]);
  for (const [module, expected] of Object.entries(operationFamilyDescriptors)) {
    const family = Object.freeze(await loadOperationFamily(module, binding, { operationSource: () => operations, sourceSet: () => sources }));
    assert.deepEqual(family.map(operationDescriptor), expected, module);
    sources = Object.freeze([...sources, Object.freeze({ module, operations: family })]);
    operations = Object.freeze(sources.flatMap((source) => source.operations));
  }
});
