import assert from "node:assert/strict";
import test from "node:test";

import { assayMarketGaps } from "../src/market-gap.mjs";

const works = [
  { id: "a", has: ["contemporary", "slow-burn"], lacks: ["low-heat"] },
  // A genre excludes the others, so a coder records the exclusion as a denial.
  { id: "b", has: ["fantasy", "slow-burn", "low-heat"], lacks: ["contemporary"] },
  { id: "c", has: ["contemporary", "slow-burn", "low-heat"] },
  { id: "d", has: ["contemporary"] },
];
const evidence = { for: [{ source: "https://example.test/request" }] };

test("a demand no work could satisfy, even counting the uncoded, is a gap; its missing ingredient is named", () => {
  const { readings, candidates } = assayMarketGaps({ works, demands: [{ id: "cozy-contemporary", wants: ["contemporary", "slow-burn", "low-heat"], evidence }] });
  const [reading] = readings;
  assert.deepEqual(reading.witnessed, ["c"]);
  assert.deepEqual(reading.agenda, [{ work: "d", unknown: ["slow-burn", "low-heat"] }]);
  assert.equal(reading.gap, "neither", "d is uncoded for two qualities, so the answer depends on reading it");
  assert.deepEqual(reading.missing.find((m) => m.dropped === "contemporary").supply, ["b", "c"]);
  assert.deepEqual(candidates, []);
});

test("when the uncoded works are ruled out the gap reads true; when two works are witnessed it reads false", () => {
  const coded = [...works.slice(0, 3), { id: "d", has: ["contemporary"], lacks: ["slow-burn"] }];
  const gap = assayMarketGaps({ works: coded, demands: [{ id: "x", wants: ["contemporary", "slow-burn", "low-heat"], evidence }] });
  assert.equal(gap.readings[0].gap, "true");
  assert.deepEqual(gap.candidates, ["x"]);
  const occupied = assayMarketGaps({ works: coded, demands: [{ id: "y", wants: ["slow-burn", "low-heat"], evidence }] });
  assert.equal(occupied.readings[0].gap, "false");
});

test("a demand can want a quality absent, and demand evidence is read in FOUR", () => {
  const { readings } = assayMarketGaps({ works, demands: [{ id: "no-heat", wants: ["contemporary", "¬low-heat"], evidence: { for: [{}], against: [{}] } }] });
  assert.deepEqual(readings[0].witnessed, ["a"]);
  assert.equal(readings[0].demand, "both");
  assert.throws(() => assayMarketGaps({ works: [{ id: "z", has: ["x"], lacks: ["x"] }], demands: [] }), /both has and lacks/);
});
