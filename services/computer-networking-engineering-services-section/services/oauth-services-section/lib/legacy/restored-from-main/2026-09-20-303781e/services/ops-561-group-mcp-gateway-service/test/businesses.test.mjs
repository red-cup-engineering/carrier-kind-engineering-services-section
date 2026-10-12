import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { controlPlaneApp } from "../src/control-plane.mjs";

test("business room shares source grouping, keeps conflicting names and missing financial evidence", async t => {
  const root = await mkdtemp(join(tmpdir(), "ops-business-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "records"));
  const snapshot = { records: ["a", "b"].map(path => ({
    sourcePath: `${path}/catalog.json`, kind: "product", package: { path, name: "same", version: "1.0.0" }, accounts: ["Income:Sales"],
  })), scan: { scannedAt: "2026-09-07T00:00:00Z", truncated: true, findings: [{ reason: "file-too-large" }] } };
  await writeFile(join(root, "records/business-catalog.json"), JSON.stringify(snapshot));
  const room = controlPlaneApp(root).resources.find(x => x.match === "/businesses");
  const response = await room.handler({ url: new URL("https://ops.561.group/businesses?accountPrefix=Income%3A&limit=1") });
  const result = JSON.parse(response.body);
  assert.equal(result.matched, 2);
  assert.equal(result.nextOffset, 1);
  assert.equal(result.items[0].ambiguousName, true);
  assert.equal(result.items[0].revenue, "unobserved");
  assert.deepEqual(result.scan, snapshot.scan);
  for (const search of ["?limit=201", "?offset=-1", "?limit=", "?query=x&query=y", "?root=/etc"]) {
    assert.equal((await room.handler({ url: new URL(`https://ops.561.group/businesses${search}`) })).status, 400);
  }
  await rm(join(root, "records/business-catalog.json"));
  assert.equal((await room.handler()).status, 503);
});
