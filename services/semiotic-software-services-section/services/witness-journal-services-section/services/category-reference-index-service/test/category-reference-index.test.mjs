import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createCategoryReferenceIndex } from "../src/category-reference-index.mjs";

function niFor(bytes) { return `ni:///sha-256;${createHash("sha256").update(bytes).digest("base64url")}`; }

function fakeR2() {
  const store = new Map();
  return {
    async putCurrent(key, { body, byteLength, sha256 }) {
      assert.equal(byteLength, body.length);
      assert.equal(sha256, createHash("sha256").update(body).digest("hex"));
      store.set(key, { body });
    },
    async get(key) {
      const object = store.get(key);
      return object ? Object.freeze({ body: object.body }) : null;
    },
    async list(prefix) {
      const keys = [...store.keys()].filter((key) => key.startsWith(prefix));
      return Object.freeze({ keys, continuationToken: undefined });
    },
  };
}

test("add then query returns the indexed reference", async () => {
  const index = createCategoryReferenceIndex({ r2: fakeR2() });
  const ni = niFor(Buffer.from("semiotic foam"));
  await index.add({ category: "semiotic-foam", ni });
  const result = await index.query("semiotic-foam");
  assert.equal(result.references.length, 1);
  assert.equal(result.references[0].ni, ni);
});

test("query is scoped to its category", async () => {
  const index = createCategoryReferenceIndex({ r2: fakeR2() });
  await index.add({ category: "semiotic-foam", ni: niFor(Buffer.from("a")) });
  const result = await index.query("game-foam");
  assert.equal(result.references.length, 0);
});
