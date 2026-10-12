import assert from "node:assert/strict";
import test from "node:test";

import { declareCatalog } from "../../../src/offer.mjs";
import { COMPILED_OFFERS } from "../src/compiled-offers.mjs";
import { catalogDeclarations } from "../scripts/compile-catalog.mjs";
const declarations = await catalogDeclarations();

test("the compiled offers are what the declaration derives; run compile-catalog after a catalog change", () => {
  const derived = Object.fromEntries(declareCatalog(declarations, { admit: false }).map((offer) => [offer.routeKey, { sku: offer.sku, cell: offer.cell, law: offer.law, discovery: offer.discovery }]));
  assert.deepEqual(JSON.parse(JSON.stringify(COMPILED_OFFERS)), JSON.parse(JSON.stringify(derived)));
});

test("an edge declaration from compiled offers hashes and infers nothing and agrees with a full one", () => {
  const started = performance.now();
  const fast = declareCatalog(declarations, { admit: false, identities: COMPILED_OFFERS });
  fast.forEach((offer) => offer.x402Route({ payTo: "0x32886F6F361C1d570255c2762967A2e41D0E9B1a", network: "eip155:8453", asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" }));
  const elapsed = performance.now() - started;
  const full = declareCatalog(declarations, { admit: false });
  assert.deepEqual(fast.map((offer) => offer.sku), full.map((offer) => offer.sku));
  assert.ok(elapsed < 100, `declaring with compiled identities took ${elapsed.toFixed(1)} ms`);
});
