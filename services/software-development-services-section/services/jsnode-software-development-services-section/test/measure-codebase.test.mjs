import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { measureJsnodeCodebase } from "../src/measure-codebase.mjs";

test("measures source cost and reports exact normalized duplicate groups without writing", () => {
  const root = mkdtempSync(join(tmpdir(), "jsnode-measure-"));
  try {
    writeFileSync(join(root, "one.mjs"), "export const value = 1;\n");
    writeFileSync(join(root, "two.mjs"), "  export const value = 1;\n\n");
    writeFileSync(join(root, "unique.mjs"), "export const other = 2;\n");
    const measurement = measureJsnodeCodebase(root);
    assert.equal(measurement.totals.files, 3);
    assert.equal(measurement.totals.duplicateGroups, 1);
    assert.deepEqual(measurement.duplicateGroups[0].files, ["one.mjs", "two.mjs"]);
    assert.equal(measurement.nextActuator, "function-movement-service");
    assert.equal(measurement.writeAuthority, "receiver-only");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
