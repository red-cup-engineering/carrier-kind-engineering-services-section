import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("agency public CLI operation returns JSON at the transport boundary", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-agency-json-"));
  try {
    const script = fileURLToPath(new URL("../scripts/metroplat.mjs", import.meta.url));
    const run = spawnSync(process.execPath, [script, "--data-root", dataRoot, "agency"], {
      input: "{}\n",
      encoding: "utf8",
      env: { ...process.env, METROPLAT_DATA_ROOT: dataRoot },
    });
    assert.equal(run.status, 0, run.stderr);
    const value = JSON.parse(run.stdout.trim());
    assert.equal(value.kind, "metroplat.agency");
    assert.ok(Array.isArray(value.records));
    assert.equal(typeof value.governance, "object");
    assert.doesNotThrow(() => JSON.stringify(value));
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});
