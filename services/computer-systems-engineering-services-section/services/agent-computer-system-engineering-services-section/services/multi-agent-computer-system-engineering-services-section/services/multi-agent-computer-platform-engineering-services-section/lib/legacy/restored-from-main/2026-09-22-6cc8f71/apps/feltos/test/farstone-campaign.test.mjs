import assert from "node:assert/strict";
import test from "node:test";
import { campaignReport, OFF_SEASON, stageAt } from "../src/farstone-campaign.mjs";

const view = (overrides = {}) => ({
  coin: 0, topSkill: 0, faculties: 0, ownsBuilt: false, permitResolved: false, topStanding: 0, thoughtsFixed: 0,
  ...overrides,
});

test("stages are thresholds read off a view, not fetch-flags", () => {
  assert.equal(OFF_SEASON.stages[0].done(view({ coin: 30 })), false, "60 coin not yet made");
  assert.equal(OFF_SEASON.stages[0].done(view({ coin: 70 })), true, "found your feet");
  assert.equal(OFF_SEASON.stages[1].done(view({ topSkill: 15 })), true, "apprentice trade");
  assert.equal(OFF_SEASON.stages[2].done(view({ thoughtsFixed: 1 })), true, "a Thought internalized");
  assert.equal(OFF_SEASON.stages[3].done(view({ ownsBuilt: true })), true, "a roof of one's own");
  assert.equal(OFF_SEASON.stages[4].done(view({ permitResolved: true })), true, "the dispute is settled");
  assert.equal(OFF_SEASON.stages[5].done(view({ topStanding: 40 })), true, "a pillar of the harbor");
  assert.equal(OFF_SEASON.stages.length, 6, "a six-stage arc spanning the systems");
});

test("stageAt reads by index and completion is past the last stage", () => {
  assert.equal(stageAt(OFF_SEASON, 0).id, "feet");
  assert.equal(stageAt(OFF_SEASON, 5).id, "pillar");
  assert.equal(stageAt(OFF_SEASON, 6), null, "past the last stage is completion");
});

test("campaignReport names the current stage, its task, and prior stages as done", () => {
  const report = campaignReport(OFF_SEASON, 2, view());
  assert.match(report, /stage 3\/6: A Keener Eye/);
  assert.match(report, /Internalize a Thought/);
  assert.match(report, /✓ Find Your Feet/);
  assert.match(report, /✓ A Trade in Hand/);
  assert.doesNotMatch(report, /✓ A Keener Eye/, "the current stage is not yet marked done");
});

test("campaignReport past the last stage announces completion", () => {
  assert.match(campaignReport(OFF_SEASON, 6, view()), /complete/);
});
