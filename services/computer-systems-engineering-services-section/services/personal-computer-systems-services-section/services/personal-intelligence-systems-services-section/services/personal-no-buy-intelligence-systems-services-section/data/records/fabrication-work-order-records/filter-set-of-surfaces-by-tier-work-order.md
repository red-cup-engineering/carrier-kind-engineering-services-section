# filter-set-of-surfaces-by-tier
## Requirements
- `tier-filter`: The operation returns the subset of `request.catalog.surfaces` admitted by `request.tier`, plus every excluded surface's id, provider, and reason.
- `no-purchase-rule`: For tier "no-purchase", the operation admits only a surface whose `requiresPurchase` is exactly `false`.
- `no-kyc-rule`: For tier "no-kyc", the operation admits only a surface whose `requiresIdentity` is exactly `"none"` or `"email"`.
- `never-guess`: A surface whose relevant field is `"unknown"` is excluded with reason `"unknown"`, never admitted by guess.
## Prohibitions
- `missing-catalog-refusal`: The operation must refuse a request whose `catalog.surfaces` is not an array.
- `bad-tier-refusal`: The operation must refuse a request whose `tier` is not `"no-purchase"` or `"no-kyc"`.
## Laws
- `no-buy-surface-schema` | personal-no-buy-intelligence-systems-services-section | v1 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/personal-computer-systems-services-section/services/personal-intelligence-systems-services-section/services/personal-no-buy-intelligence-systems-services-section/data/records/schema/no-buy-surface.schema.json | Applies to the shape of each surface object this operation reads and returns unmodified. | The record's properties, requiredness, and value shapes are the NoBuySurface JSON Schema (draft 2020-12) at the cited path.
- `scripts-import-scripts-and-src` | org-layering.md / import-stratification.md | v1 | .claude/rules/import-stratification.md | Applies to how this operation's own source file may be structured. | "scripts can import scripts and src. scripts cannot import apps." This operation imports no other package at all, so it trivially satisfies the stratification law.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/filter-set-of-surfaces-by-tier-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operation
```mjs path=scripts/filter-set-of-surfaces-by-tier.mjs
#!/usr/bin/env node

const IDENTITY_ADMITTED_FOR_NO_KYC = new Set(["none", "email"]);

/**
 * Filters a No Buy surface catalog to the subset admitted by one tier, with each excluded surface's reason as a datum. no-kyc admits only requiresIdentity none or email; no-purchase admits only requiresPurchase false. A surface whose relevant field is "unknown" is excluded with reason "unknown", never guessed into either tier.
 * @param {object} request A record with `catalog` (a NoBuySurfaceCatalog) and `tier` ("no-purchase" | "no-kyc").
 * @returns {object} `{tier, admitted: object[], excluded: {id, provider, reason}[]}` — admitted carries the surfaces satisfying the tier, in the catalog's own order; excluded names every other surface with its exclusion reason.
 * @throws {TypeError} When request.catalog does not carry a surfaces array, or request.tier is not "no-purchase" or "no-kyc".
 */
export function filterSetOfSurfacesByTier(request) {
  if (!request || typeof request !== "object" || !Array.isArray(request.catalog?.surfaces)) {
    throw new TypeError("request.catalog must carry a surfaces array");
  }
  if (request.tier !== "no-purchase" && request.tier !== "no-kyc") {
    throw new TypeError('request.tier must be "no-purchase" or "no-kyc"');
  }
  const admitted = [];
  const excluded = [];
  for (const surface of request.catalog.surfaces) {
    if (request.tier === "no-purchase") {
      if (surface.requiresPurchase === false) {
        admitted.push(surface);
      } else {
        excluded.push({ id: surface.id, provider: surface.provider, reason: surface.requiresPurchase === true ? "requires-purchase" : "unknown" });
      }
    } else {
      if (IDENTITY_ADMITTED_FOR_NO_KYC.has(surface.requiresIdentity)) {
        admitted.push(surface);
      } else {
        excluded.push({ id: surface.id, provider: surface.provider, reason: surface.requiresIdentity === "unknown" ? "unknown" : `requires-identity-${surface.requiresIdentity}` });
      }
    }
  }
  return { tier: request.tier, admitted, excluded };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("filterSetOfSurfacesByTier — Filters a No Buy surface catalog to the subset admitted by one tier, with each excluded surface's reason as a datum. no-kyc admits only requiresIdentity none or email; no-purchase admits only requiresPurchase false. A surface whose relevant field is \"unknown\" is excluded with reason \"unknown\", never guessed into either tier.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(filterSetOfSurfacesByTier(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/filter-set-of-surfaces-by-tier.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { filterSetOfSurfacesByTier } from "../scripts/filter-set-of-surfaces-by-tier.mjs";

const catalog = {
  surfaces: [
    { id: "a", provider: "A", requiresPurchase: false, requiresIdentity: "none" },
    { id: "b", provider: "B", requiresPurchase: true, requiresIdentity: "email" },
    { id: "c", provider: "C", requiresPurchase: "unknown", requiresIdentity: "phone" },
  ],
};

test("no-purchase admits only requiresPurchase false", () => {
  const result = filterSetOfSurfacesByTier({ catalog, tier: "no-purchase" });
  assert.deepEqual(result.admitted.map((s) => s.id), ["a"]);
  assert.deepEqual(result.excluded, [
    { id: "b", provider: "B", reason: "requires-purchase" },
    { id: "c", provider: "C", reason: "unknown" },
  ]);
});

test("no-kyc admits only none or email", () => {
  const result = filterSetOfSurfacesByTier({ catalog, tier: "no-kyc" });
  assert.deepEqual(result.admitted.map((s) => s.id), ["a", "b"]);
  assert.deepEqual(result.excluded, [{ id: "c", provider: "C", reason: "requires-identity-phone" }]);
});

test("refuses a request without a surfaces array", () => {
  assert.throws(() => filterSetOfSurfacesByTier({ catalog: {}, tier: "no-purchase" }), /surfaces array/u);
});

test("refuses an unknown tier", () => {
  assert.throws(() => filterSetOfSurfacesByTier({ catalog, tier: "no-such-tier" }), /must be/u);
});
```
## Examples
```json name="no-purchase filter"
{"input":{"catalog":{"surfaces":[{"id":"a","provider":"A","requiresPurchase":false,"requiresIdentity":"none"},{"id":"b","provider":"B","requiresPurchase":true,"requiresIdentity":"email"}]},"tier":"no-purchase"},"output":{"tier":"no-purchase","admitted":[{"id":"a","provider":"A","requiresPurchase":false,"requiresIdentity":"none"}],"excluded":[{"id":"b","provider":"B","reason":"requires-purchase"}]}}
```
## Traceability
- `tier-filter` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-buy-surface-schema`, `node-esm-operation`
- `no-purchase-rule` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-buy-surface-schema`, `node-esm-operation`
- `no-kyc-rule` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-buy-surface-schema`, `node-esm-operation`
- `never-guess` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-buy-surface-schema`, `node-esm-operation`
- `missing-catalog-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `bad-tier-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
