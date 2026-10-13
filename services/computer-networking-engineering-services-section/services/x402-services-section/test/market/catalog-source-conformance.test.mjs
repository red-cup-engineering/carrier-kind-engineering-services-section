// Source-of-truth invariant independent of private registry and x402 facilitator:
// every source offer must use a package that this merchant can import, and
// edge binding specifiers must match the actual compiled import map.
// This catches forest/superrepo rename drift before exposing false SKUs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = relative => readFileSync(resolve(root, relative), "utf8");
const catalog = JSON.parse(read("data/market-561-group/records/catalog.json"));
const manifest = JSON.parse(read("package.json"));
const bindingsSource = read("apps/market-561-group/src/edge-bindings.mjs");
const generatedImports = new Set([...bindingsSource.matchAll(/^\s*\[("[^"]+"), binding\d+\],?$/gm)].map(match => JSON.parse(match[1])));
const specifier = binding => binding.package + (binding.subpath ? "/" + binding.subpath.slice(2) : "");
const refs = offer => ["compute", "validate"].filter(k => offer[k]).map(kind => ({ kind, binding: offer[kind], specifier: specifier(offer[kind]) }));
const edge = catalog.filter(offer => offer.runtime !== "node");
const STATIC_EXTERNAL_PUBLICATIONS = new Set([
  "@red-cup-engineering/digital-goods-storefront-services-section/paid-release",
]);

test("the packed merchant retains the offer schema required by its native admission module", () => {
  const cache = mkdtempSync(resolve(tmpdir(), "x402-pack-cache-"));
  try {
    const packed = JSON.parse(execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts", "--offline", "--cache", cache], {
      cwd: root, encoding: "utf8", timeout: 30_000, maxBuffer: 16 * 1024 * 1024,
    }));
    assert.equal(packed.length, 1);
    const paths = new Set(packed[0].files.map(file => file.path));
    assert.ok(paths.has("src/offer.mjs"), "the native offer admission module must be packed");
    assert.match(read("src/offer.mjs"), /\.\.\/schemas\/offer\.schema\.json/u);
    assert.ok(paths.has("schemas/offer.schema.json"), "the packed offer admission module must retain its JSON schema");
    assert.doesNotThrow(() => JSON.parse(read("schemas/offer.schema.json")));
  } finally {
    rmSync(cache, { recursive: true, force: true });
  }
});

test("market is one canonical merchant and source catalog operations have unique paid URLs", () => {
  assert.ok(catalog.length >= 131, "the merchant should not lose its existing inventory");
  const keys = catalog.map(x => x.method + " " + x.route);
  assert.equal(new Set(keys).size, keys.length, "duplicate method+route");
  assert.ok(catalog.every(x => x.origin === "https://market.561.group"), "no second merchant origin");
});

test("every source binding resolves through a declared merchant dependency or self", () => {
  const dependencies = new Set(Object.keys(manifest.dependencies));
  const undeclared = catalog.flatMap(offer => refs(offer)
    .filter(x => x.binding.package !== manifest.name && !dependencies.has(x.binding.package))
    .map(x => offer.route + " (" + x.kind + "): " + x.binding.package));
  assert.deepEqual(undeclared, [], "missing provider workspace dependency in merchant manifest");
});

test("compiled edge binding imports cover every source-declared edge compute and admission function", () => {
  const absent = edge.flatMap(offer => refs(offer)
    .filter(x => !generatedImports.has(x.specifier))
    .map(x => offer.route + " (" + x.kind + ") -> " + x.specifier));
  assert.deepEqual(absent, [], "regenerate the compiled edge bindings or correct stale source package names");

  const used = new Set(edge.flatMap(offer => refs(offer).map(x => x.specifier)));
  const unexplained = [...generatedImports].filter(spec => !used.has(spec) && !STATIC_EXTERNAL_PUBLICATIONS.has(spec));
  assert.deepEqual(unexplained, [], "stale compiled imports must be removed or explained");
});

test("ephemeris is the downstream semantic product, astronomy is the independent computation owner", () => {
  const a = catalog.filter(x => x.gateway === "astronomy");
  const d = catalog.filter(x => x.gateway === "ephemeris");
  assert.equal(a.length, 2);
  assert.equal(d.length, 2);
  for (const offer of a) {
    assert.equal(offer.compute.package, "@lenticule-science/astronomy-position-computation-service");
    assert.equal(offer.validate.package, "@lenticule-science/astronomy-position-computation-service");
    assert.ok(!offer.route.startsWith("/v1/ephemeris/"));
  }
  for (const offer of d) {
    assert.equal(offer.compute.package, "@lenticule-science/divination-computer-system-service");
    assert.equal(offer.validate.package, "@lenticule-science/divination-computer-system-service");
  }
});

test("all listings have explicit prior-payment admission and runnable probe surfaces", () => {
  const malformed = catalog.filter(o => o.listed !== false).flatMap(o => [
    ...(!o.compute && !o.publication ? [o.route + ": missing compute binding or publication selector"] : []),
    ...(o.method === "POST" && !o.bodyExample ? [o.route + ": missing POST discovery request"] : []),
    ...(!o.probeUrl && o.method === "GET" && o.route.includes("{") ? [o.route + ": unresolved GET path"] : []),
  ]);
  assert.deepEqual(malformed, []);
});

