import assert from "node:assert/strict";
import test from "node:test";
import { observeFilesystemCapacityAndRetentionEligibility } from "../src/filesystem-capacity-retention-eligibility.mjs";

const GIB = 1024 * 1024 * 1024;

test("filesystem capacity refuses registry release below the Cold Red Gate reserve", () => {
  const result = observeFilesystemCapacityAndRetentionEligibility({
    minimumRootAvailableBytes: 5 * GIB,
    rootAvailableBytes: 5 * GIB - 1,
    generations: [],
  });
  assert.equal(result.publication.admitted, false);
  assert.deepEqual(result.publication.refusals, [{ code: "root-capacity-below-release-reserve", subject: "rootAvailableBytes" }]);
});

test("only a fully observed inactive non-retained generation is deletion eligible", () => {
  const result = observeFilesystemCapacityAndRetentionEligibility({
    minimumRootAvailableBytes: 5 * GIB,
    rootAvailableBytes: 6 * GIB,
    generations: [
      { name: "current", current: true, previous: false, active: false, interrupted: false },
      { name: "previous", current: false, previous: true, active: false, interrupted: false },
      { name: "active", current: false, previous: false, active: true, interrupted: false },
      { name: "interrupted", current: false, previous: false, active: false, interrupted: true },
      { name: "unknown", current: false, previous: false, active: false },
      { name: "old", current: false, previous: false, active: false, interrupted: false },
    ],
  });
  assert.equal(result.publication.admitted, true);
  assert.deepEqual(result.generations.map(({ name, deletion }) => [name, deletion.admitted]), [
    ["current", false], ["previous", false], ["active", false], ["interrupted", false], ["unknown", false], ["old", true],
  ]);
  assert.equal(result.generations[0].deletion.refusals[0].code, "generation-current-or-unobserved");
  assert.equal(result.generations[1].deletion.refusals[0].code, "generation-previous-or-unobserved");
  assert.equal(result.generations[2].deletion.refusals[0].code, "generation-active-or-unobserved");
  assert.equal(result.generations[3].deletion.refusals[0].code, "generation-interrupted-or-unobserved");
  assert.equal(result.generations[4].deletion.refusals[0].code, "generation-interrupted-or-unobserved");
});

test("missing capacity or generation inventory never yields an authorization", () => {
  const result = observeFilesystemCapacityAndRetentionEligibility({
    minimumRootAvailableBytes: 5 * GIB,
    rootAvailableBytes: 6 * GIB,
  });
  assert.equal(result.publication.admitted, false);
  assert.equal(result.publication.refusals.at(-1).code, "release-generations-not-observed");
});
