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
