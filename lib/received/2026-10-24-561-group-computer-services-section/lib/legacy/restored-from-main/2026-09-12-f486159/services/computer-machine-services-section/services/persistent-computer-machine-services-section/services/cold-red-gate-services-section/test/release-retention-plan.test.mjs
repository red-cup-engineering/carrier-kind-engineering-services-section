import assert from "node:assert/strict";
import test from "node:test";
import { planReleaseRetention, RELEASE_DEPLOYMENT_HEADROOM_BYTES } from "../src/release-retention-plan.mjs";

test("only fully observed unprotected generations count toward the release reserve", () => {
  const plan = planReleaseRetention({
    rootAvailableBytes: 4,
    minimumRootAvailableBytes: 10,
    deploymentHeadroomBytes: 0,
    generations: [
      { path: "/releases/current", bytes: 100, current: true, previous: false, active: false, interrupted: false },
      { path: "/releases/old", bytes: 6, current: false, previous: false, active: false, interrupted: false },
      { path: "/releases/unknown", bytes: 100, current: false, previous: false, active: false },
    ],
  });
  assert.equal(plan.admitted, true);
  assert.equal(plan.reclaimableBytes, 6);
  assert.deepEqual(plan.candidates.map(({ path, reclaimable }) => [path, reclaimable]), [["/releases/current", false], ["/releases/old", true], ["/releases/unknown", false]]);
});

test("hard floor alone does not admit a deployment without 512MiB staging headroom", () => {
  const plan = planReleaseRetention({ rootAvailableBytes: 10, minimumRootAvailableBytes: 10, generations: [] });
  assert.equal(plan.admitted, false);
  assert.equal(plan.deploymentHeadroomBytes, RELEASE_DEPLOYMENT_HEADROOM_BYTES);
  assert.equal(plan.requiredAvailableBytes, 10 + RELEASE_DEPLOYMENT_HEADROOM_BYTES);
});
