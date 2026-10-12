import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { jsonToTerm } from "@red-cup-engineering/relation-model-notation-json-codec";
import { readBusinessCatalog, readBusinessCatalogSources } from "../src/read-business-catalog.mjs";

async function fixture(t, files) {
  const root = await mkdtemp(join(tmpdir(), "moneyday-business-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [path, value] of Object.entries(files)) {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, typeof value === "string" ? value : JSON.stringify(value));
  }
  return root;
}

test("discovers arbitrary products under lib using nearest package and nested account evidence", async t => {
  const root = await fixture(t, {
    "package.json": { name: "root", version: "1.0.0" },
    "lib/public/shop/package.json": { name: "shop", version: "2.0.0", repository: { url: "https://github.com/example/shop" } },
    "lib/public/shop/catalog.json": { products: [{ id: "unknown-new-business", incomeAccount: "Income:Sales:Shop", url: "https://shop.example/" }, { url: "https://bad.example/?token=secret" }] },
    "lib/public/shop/services/child/package.json": { name: "child", version: "1.1.0" },
    "lib/public/shop/services/child/content/offers/test.json": { name: "New offer", accounts: ["Assets:Cash"] },
    "lib/legacy/old/catalog.json": { name: "Do not expose" },
    "node_modules/fake/catalog.json": { name: "Do not expose" },
  });
  const result = await readBusinessCatalog({ root, accountPrefix: "Income:" });
  assert.equal(result.total, 2);
  assert.equal(result.matched, 1);
  assert.equal(result.items[0].package.path, "lib/public/shop");
  assert.deepEqual(result.items[0].ids, ["unknown-new-business"]);
  assert.deepEqual(result.items[0].repositories, ["https://github.com/example/shop"]);
  assert.deepEqual(result.items[0].urls, ["https://shop.example/"]);
  assert.equal(result.items[0].live, "unobserved");
  const child = await readBusinessCatalog({ root, query: "New offer" });
  assert.equal(child.items[0].package.name, "child");
  assert.equal(child.items[0].package.version, "1.1.0");
});

test("founding receipts retain source lines without treating unrelated journal events as businesses", async t => {
  const root = await fixture(t, {
    "package.json": { name: "group", version: "1.0.0" },
    "data/logs/witness-journal-seavt.jsonl": [
      JSON.stringify({ e: jsonToTerm("ni:///source"), a: jsonToTerm("new-enterprise.founding"), t: "2026-09-07T00:00:00Z", v: jsonToTerm({ type: "561GroupProgramFoundingReceipt", program: "new-enterprise", seats: ["science/x", "public/x"] }) }),
      JSON.stringify({ type: "OtherEvent", name: "ignored" }),
    ].join("\n"),
    "content/config/science-channel.json": { channel: { name: "science-video" } },
  });
  const { records } = await readBusinessCatalogSources({ root });
  assert.equal(records.length, 2);
  const founding = records.find(record => record.kind === "founding");
  assert.ok(founding.sourcePath.endsWith("#line=1"));
  assert.deepEqual(founding.ids, ["new-enterprise", "public/x", "science/x"]);
});

test("missing ownership, malformed sources and size/entry limits remain visible", async t => {
  const root = await fixture(t, {
    "a/catalog.json": { id: "orphan" },
    "b/content/products/bad.json": "{bad",
    "c/catalog.json": " ".repeat(300),
  });
  const { scan, records } = await readBusinessCatalogSources({ root, maxBytes: 200 });
  assert.equal(records.length, 0);
  assert.deepEqual(scan.findings.map(item => item.reason).sort(), ["file-too-large", "malformed-source", "missing-package-owner"]);
  const limited = await readBusinessCatalogSources({ root, maxEntries: 1 });
  assert.equal(limited.scan.truncated, true);
  await assert.rejects(readBusinessCatalogSources({ root, maxBytes: 0 }), /positive safe integer/);
});

test("public service manifests need no product catalog or known business name", async t => {
  const root = await fixture(t, {
    "lib/public-services-section/services/new-service/package.json": { name: "arbitrary-public-service", version: "1.0.0", homepage: "https://new.example/" },
    "lib/public-services-section/services/new-channel/package.json": { name: "arbitrary-channel", version: "1.0.0" },
    "lib/public-services-section/services/new-channel/channel-spec.json": { name: "Cinematic lessons" },
  });
  const result = await readBusinessCatalog({ root });
  assert.equal(result.total, 2);
  assert.ok(result.items.some(x => x.ids.includes("Cinematic lessons")));
  assert.ok(result.items.some(x => x.urls.includes("https://new.example/")));
});
