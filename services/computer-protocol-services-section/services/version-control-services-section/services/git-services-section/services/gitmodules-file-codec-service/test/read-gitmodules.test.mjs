import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { readGitmodules } from "../scripts/read-gitmodules.mjs";

const directory = dirname(fileURLToPath(import.meta.url));

test("readGitmodules reads the fixture through the script interface", async () => {
  const file = resolve(directory, "fixtures/sample.gitmodules");
  const result = await readGitmodules({ file });
  assert.equal(result.path, file);
  assert.equal(result.entries.length, 3);
});
