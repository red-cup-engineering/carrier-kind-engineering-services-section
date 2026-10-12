import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("the key generator runs through an npm-style symlink", () => {
  const root = mkdtempSync(join(tmpdir(), "activitypub-key-command-"));
  const command = join(root, "generate-activitypub-keys");
  const output = join(root, "keys.json");
  symlinkSync(new URL("../src/keys.mjs", import.meta.url), command);

  const result = spawnSync(process.execPath, [command, output], { encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `${output}\n`);
  assert.equal(existsSync(output), true);
});
