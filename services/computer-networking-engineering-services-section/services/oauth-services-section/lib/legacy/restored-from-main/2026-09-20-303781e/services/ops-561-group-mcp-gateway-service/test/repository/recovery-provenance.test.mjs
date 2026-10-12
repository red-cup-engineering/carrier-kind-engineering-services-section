import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageUrl = new URL("../../", import.meta.url);
test("recovery provenance hashes still identify the captured evidence", async () => {
  const provenance = JSON.parse(await readFile(new URL("content/provenance/cold-red-gate-recovery.json", packageUrl)));
  const repositoryPath = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: fileURLToPath(packageUrl),
    encoding: "utf8",
  }).trim();
  const repositoryRoot = pathToFileURL(`${repositoryPath}/`);
  for (const captured of provenance.capturedFiles) {
    const bytes = await readFile(new URL(`${provenance.captureRoot}/${captured.path}`, repositoryRoot));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), captured.sha256, captured.path);
  }
});

