import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

test("consumer-facing astronomy exports point to executable source files", () => {
  assert.equal(manifest.type, "module");
  assert.equal(manifest.name, "@lenticule-science/astronomy-position-computation-service");
  assert.equal(manifest.sideEffects, false);
  assert.ok(manifest.files.includes("src"));
  for (const [subpath, conditions] of Object.entries(manifest.exports)) {
    assert.equal(typeof conditions.import, "string", subpath + " has a module entry");
    assert.match(conditions.import, /^\.\/src\/[^/]+\.mjs$/, subpath + " points to included source");
    assert.equal(existsSync(resolve(root, conditions.import)), true, subpath + " exists");
  }
});

test("packing astronomical computations must not call missing build commands", () => {
  assert.equal(typeof manifest.scripts.prepack, "string");
  assert.equal(manifest.scripts.prepack, "npm test");
  assert.equal(manifest.scripts.rebuild, undefined);
  assert.equal(manifest.scripts.build, undefined);
});
