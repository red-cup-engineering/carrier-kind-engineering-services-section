import assert from "node:assert/strict";
import { test } from "node:test";
import {
  customerFunnelChannels,
  findHostingTier,
  listHostingTiers,
  planTenantProvisioning,
  quoteHostingTenant,
} from "../src/world-hosting.mjs";

test("listHostingTiers: every tier has a positive price and ceiling", () => {
  const tiers = listHostingTiers();
  assert.equal(tiers.length, 3);
  for (const tier of tiers) {
    assert.ok(Number.isFinite(tier.monthlyUsd) && tier.monthlyUsd > 0, `${tier.name} monthlyUsd must be positive`);
    assert.ok(Number.isInteger(tier.concurrentSessionCeiling) && tier.concurrentSessionCeiling > 0, `${tier.name} ceiling must be a positive integer`);
    assert.ok(typeof tier.rationale === "string" && tier.rationale.length > 0, `${tier.name} must carry a pricing rationale`);
  }
});

test("listHostingTiers: every capability entry is honestly grounded or marked needs-building", () => {
  for (const tier of listHostingTiers()) {
    for (const entry of tier.capabilities) {
      assert.ok(["built", "needs-building"].includes(entry.status));
      if (entry.status === "built") {
        assert.equal(typeof entry.groundedIn, "string");
        assert.match(entry.groundedIn, /^apps\/feltos\/src\/.+\.mjs#\w+$/);
      } else {
        assert.equal(entry.groundedIn, null);
      }
    }
  }
});

test("findHostingTier: throws on an unknown tier name", () => {
  assert.throws(() => findHostingTier("Enterprise"), TypeError);
});

test("quoteHostingTenant: computes a quote within a tier's ceiling", () => {
  const quote = quoteHostingTenant({ tierName: "Community", estimatedConcurrentPlayers: 30 });
  assert.equal(quote.tier, "Community");
  assert.equal(quote.monthlyUsd, 24);
  assert.equal(quote.fitsWithinCeiling, true);
  assert.equal(quote.recommendedTier, "Community");
});

test("quoteHostingTenant: recommends a bigger tier when the estimate exceeds the requested tier's ceiling", () => {
  const quote = quoteHostingTenant({ tierName: "Starter", estimatedConcurrentPlayers: 30 });
  assert.equal(quote.fitsWithinCeiling, false);
  assert.equal(quote.recommendedTier, "Community");
});

test("quoteHostingTenant: recommendedTier is null when no tier's ceiling is high enough", () => {
  const quote = quoteHostingTenant({ tierName: "Starter", estimatedConcurrentPlayers: 10_000 });
  assert.equal(quote.fitsWithinCeiling, false);
  assert.equal(quote.recommendedTier, null);
});

test("quoteHostingTenant: throws on an unknown tier", () => {
  assert.throws(() => quoteHostingTenant({ tierName: "Nope", estimatedConcurrentPlayers: 5 }), TypeError);
});

test("quoteHostingTenant: throws on a negative player count", () => {
  assert.throws(() => quoteHostingTenant({ tierName: "Starter", estimatedConcurrentPlayers: -1 }), TypeError);
});

test("planTenantProvisioning: builds a namespaced plan under the caller-supplied dataRoot", () => {
  const plan = planTenantProvisioning({ tenantId: "acme-guild", tier: "Starter", dataRoot: "/tmp/example-data-root" });
  assert.equal(plan.tenantId, "acme-guild");
  assert.equal(plan.tier, "Starter");
  assert.equal(plan.workspaceDirectory, "/tmp/example-data-root/tenants/acme-guild");
  assert.equal(plan.snapshotPath, "/tmp/example-data-root/tenants/acme-guild/world-snapshot.json");
  assert.equal(plan.feltosPrimitives.createWorld, "@red-cup-engineering/feltos#createWorld");
});

test("planTenantProvisioning: rejects a non-absolute dataRoot", () => {
  assert.throws(() => planTenantProvisioning({ tenantId: "acme-guild", tier: "Starter", dataRoot: "relative/path" }), TypeError);
});

test("planTenantProvisioning: rejects a missing dataRoot", () => {
  assert.throws(() => planTenantProvisioning({ tenantId: "acme-guild", tier: "Starter" }), TypeError);
});

test("planTenantProvisioning: rejects an invalid tenantId", () => {
  assert.throws(() => planTenantProvisioning({ tenantId: "Not_Valid!", tier: "Starter", dataRoot: "/tmp/x" }), TypeError);
});

test("customerFunnelChannels: exactly one channel is marked recommendedFirst", () => {
  const channels = customerFunnelChannels();
  assert.ok(channels.length >= 5);
  const recommended = channels.filter((channel) => channel.recommendedFirst);
  assert.equal(recommended.length, 1);
});
