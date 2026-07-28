import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readlink, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promoteNodeRuntimeRelease } from "../src/promote-release.mjs";

async function release(root, value) {
  const relativePath = "app/server.mjs";
  const bytes = Buffer.from(`export default ${JSON.stringify(value)};\n`);
  const hash = createHash("sha256").update(relativePath).update("\0").update(bytes).update("\0").digest("hex");
  const directory = join(root, hash);
  await mkdir(join(directory, "app"), { recursive: true });
  await writeFile(join(directory, relativePath), bytes);
  await writeFile(join(directory, "release-receipt.json"), JSON.stringify({ artifactDigest: hash }));
  return hash;
}

test("promotes and rolls back verified releases with retained receipts", async () => {
  const root = await mkdtemp(join(tmpdir(), "node-release-promotion-"));
  try {
    const releases = join(root, "releases");
    const receipts = join(root, "receipts");
    await mkdir(releases, { recursive: true });
    const first = await release(releases, "first");
    const second = await release(releases, "second");
    const initial = await promoteNodeRuntimeRelease({ releaseRoot: releases, digest: first, receiptRoot: receipts });
    const advanced = await promoteNodeRuntimeRelease({ releaseRoot: releases, digest: second, receiptRoot: receipts });
    const rolledBack = await promoteNodeRuntimeRelease({ releaseRoot: releases, digest: first, receiptRoot: receipts });
    assert.equal(await readlink(join(releases, "current")), first);
    assert.equal(await readlink(join(releases, "previous")), second);
    assert.equal(initial.fromDigest, null);
    assert.equal(advanced.fromDigest, first);
    assert.equal(rolledBack.fromDigest, second);
    assert.equal(JSON.parse(await readFile(rolledBack.receiptPath, "utf8")).toDigest, first);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refuses a release whose bytes no longer satisfy its digest", async () => {
  const root = await mkdtemp(join(tmpdir(), "node-release-promotion-refusal-"));
  try {
    const releases = join(root, "releases");
    await mkdir(releases, { recursive: true });
    const digest = await release(releases, "admitted");
    await writeFile(join(releases, digest, "app", "server.mjs"), "export default 'mutated';\n");
    await assert.rejects(promoteNodeRuntimeRelease({ releaseRoot: releases, digest, receiptRoot: join(root, "receipts") }), /do not satisfy/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
