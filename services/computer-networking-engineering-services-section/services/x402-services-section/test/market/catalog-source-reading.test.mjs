import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { catalogDeclarations } from "../../apps/market-561-group/src/catalog-source.mjs";

const section = "lib/emsenn/services/561-group/services/engineering-services-section";
const sellerPath = `${section}/lib/agency/enterprises/engineering.json`;
const sellerBytes = `${JSON.stringify({ id: "engineering", entity: "group-entity" })}\n`;
const declaration = {
  name: "A source-owned operation",
  section: `${section}/services/computer-engineering-services-section`,
  operation: "unchanged-operation",
  seller: {
    enterprise: "engineering",
    entity: "group-entity",
    record: { path: sellerPath, sha256: createHash("sha256").update(sellerBytes).digest("hex") },
  },
};

test("a supplier-independent injected reader preserves the declared operation and seller", async () => {
  const reads = [];
  const result = await catalogDeclarations({ records: [declaration], read: path => {
    reads.push(path);
    return sellerBytes;
  } });
  assert.deepEqual(reads, [sellerPath]);
  assert.equal(result[0], declaration);
});

test("an explicit composition root receives the original hashed seller bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "x402-catalog-source-"));
  try {
    await mkdir(join(root, section, "lib/agency/enterprises"), { recursive: true });
    await writeFile(join(root, sellerPath), sellerBytes);
    assert.equal((await catalogDeclarations({ records: [declaration], sourceRoot: root }))[0], declaration);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("moving a catalog to a supplied reader does not waive source hash or commercial identity", async () => {
  await assert.rejects(catalogDeclarations({ records: [declaration], read: () => `${sellerBytes} ` }), /seller record digest/);
  const changed = { ...declaration, seller: { ...declaration.seller, entity: "another-entity" } };
  await assert.rejects(catalogDeclarations({ records: [changed], read: () => sellerBytes }), /seller record digest/);
});

test("record selectors cannot escape a caller's source custody before the reader is invoked", async () => {
  for (const path of ["../outside.json", "/outside.json", "lib/../outside.json", "lib\\outside.json", "lib//outside.json", "lib/./outside.json", "lib/\0outside.json"]) {
    let reads = 0;
    const changed = { ...declaration, seller: { ...declaration.seller, record: { ...declaration.seller.record, path } } };
    await assert.rejects(catalogDeclarations({ records: [changed], read: () => { reads++; return sellerBytes; } }), /relative source-record path/);
    assert.equal(reads, 0);
  }
});

test("relative source roots and non-callable source readers are refused", async () => {
  await assert.rejects(catalogDeclarations({ records: [declaration], sourceRoot: "another-checkout" }), /absolute path/);
  await assert.rejects(catalogDeclarations({ records: [declaration], read: "another-reader" }), /reader must be a function/);
});

test("publication selectors retain accepted-edition and artifact identity through an injected reader", async () => {
  const digest = value => `ni:///sha-256;${Buffer.alloc(32, value).toString("base64url")}`;
  const services = "lib/emsenn/services/561-group/services";
  const paths = {
    "lib/book-offers.json": { offerings: [{ id: "accepted-book", title: "Accepted book", currency: "usd", priceCents: 500, release: "original-release", status: "live", book: { manuscript: "public-services-section/book", acceptance: "public-services-section/book/acceptance.json" } }] },
    [`${services}/public-services-section/book/ebook.json`]: { title: "Accepted book" },
    [`${services}/public-services-section/book/acceptance.json`]: { type: "EbookEditionAcceptance", status: "accepted", editionInputDigest: digest(1), artifacts: { epub: { sha256: digest(2) }, screenPdf: { sha256: digest(3) } } },
  };
  const result = await catalogDeclarations({ records: [{ name: "Original", publication: { catalog: "lib/book-offers.json", id: "accepted-book" } }], read: path => JSON.stringify(paths[path]) });
  assert.equal(result[0].operation, "original-release");
  assert.equal(result[0].price, "$5.00");
  assert.equal(result[0].compute.configuration.release, digest(1));
  assert.equal(result[0].compute.configuration.artifacts.epub, Buffer.alloc(32, 2).toString("hex"));
  assert.equal(result[0].compute.configuration.artifacts.screenPdf, Buffer.alloc(32, 3).toString("hex"));
});
