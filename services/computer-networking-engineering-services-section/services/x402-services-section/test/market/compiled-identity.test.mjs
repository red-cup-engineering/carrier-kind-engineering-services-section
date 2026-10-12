import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COMPILED_DECLARATIONS } from "../../apps/market-561-group/src/compiled-offers.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const declarations = JSON.parse(readFileSync(resolve(root, "data/market-561-group/records/catalog.json"), "utf8"));
const identity = row => row.method + " " + row.route;

test("nonpublication offer identities, inputs, prices and source bindings exactly match compiled runtime", () => {
  const current = new Map(declarations.filter(row => !row.publication).map(row => [identity(row), row]));
  const publicationRoutes = new Set(declarations.filter(row => row.publication).map(identity));
  const compiled = new Map(COMPILED_DECLARATIONS.filter(row => !publicationRoutes.has(identity(row))).map(row => [identity(row), row]));
  assert.deepEqual([...current.keys()].sort(), [...compiled.keys()].sort());
  for (const [name, source] of current) {
    const built = compiled.get(name);
    const selected = row => ({ operation: row.operation, gateway: row.gateway, price: row.price,
      listed: row.listed !== false, compute: row.compute, validate: row.validate });
    assert.deepEqual(selected(built), selected(source), name + " has a stale compiled binding or price");
  }
});
