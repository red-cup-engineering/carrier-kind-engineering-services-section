import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

test("npm package includes every declared export target", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const cache = mkdtempSync(join(tmpdir(), "http-pack-check-"));
  try {
    const packed = JSON.parse(execFileSync("npm", ["pack", "--dry-run", "--json", "--offline", "--ignore-scripts", "--cache", cache], {
      cwd: root, encoding: "utf8", env: { ...process.env, npm_config_update_notifier: "false", npm_config_audit: "false" },
    }))[0];
    const files = new Set(packed.files.map(file => file.path));
    for (const [name, target] of Object.entries(manifest.exports)) {
      assert.equal(typeof target, "string", `export ${name} has a concrete package target`);
      assert.ok(files.has(target.replace(/^\.\//, "")), `export ${name} includes ${target}`);
    }
  } finally { rmSync(cache, { recursive: true, force: true }); }
});
