import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { allocateChannelCapacity, humanBoundaryTypeFor, interventionMetrics, recordAutonomyIncident, recordHumanBoundary, recordTitleCost, titleCostRecords } from "../src/publication-control.mjs";

const profile = { type: "ChannelCapacity", version: 1, channel: "kdp", newTitlesPerFormatPerWeek: 2, observedAt: "2026-09-21", source: "https://kdp.amazon.com/en_US/help/topic/G201857950" };

test("KDP ChannelCapacity allocates two weekly format slots by expected contribution", () => {
  const decision = allocateChannelCapacity({ profile, now: "2026-09-29T12:00:00Z", candidates: [
    { book: "low", format: "EPUB", expectedContribution: 1 },
    { book: "high", format: "EPUB", expectedContribution: 9 },
    { book: "middle", format: "EPUB", expectedContribution: 5 },
    { book: "print", format: "PAPERBACK", expectedContribution: 2 },
  ] });
  assert.deepEqual(decision.allocated.map(({ book }) => book), ["high", "middle", "print"]);
  assert.deepEqual(decision.queued.map(({ book }) => book), ["low"]);
});

test("all KDP human-only cases map to exactly one boundary type", () => {
  assert.equal(humanBoundaryTypeFor("two-factor-challenge"), "EXTERNAL_PROVIDER_REQUIRES_HUMAN");
  assert.equal(humanBoundaryTypeFor("provider-terms-acceptance-required"), "EXTERNAL_PROVIDER_REQUIRES_HUMAN");
  assert.equal(humanBoundaryTypeFor("tax-attestation-required"), "LEGAL_NONDELEGABLE");
  assert.equal(humanBoundaryTypeFor("policy-declaration-required"), "RESERVED_HUMAN_AUTHORITY_REQUIRED");
  assert.throws(() => humanBoundaryTypeFor("bad-form-selector"), /unclassified human boundary/u);
});

test("control records type human boundaries, incidents, repairs, recurrence, and title cost", async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), "kindle-control-"));
  recordHumanBoundary(dataRoot, { book: "ice-out", step: "publish", reason: "captcha-challenge", boundaryType: "EXTERNAL_PROVIDER_REQUIRES_HUMAN", at: "2026-09-29T00:00:00Z" });
  recordHumanBoundary(dataRoot, { book: "ice-out", step: "publish", reason: "captcha-challenge", boundaryType: "EXTERNAL_PROVIDER_REQUIRES_HUMAN", at: "2026-09-29T00:01:00Z" });
  const repair = recordAutonomyIncident(dataRoot, { run: "fixture", cycle: 1, book: "ice-out", stage: "validate", code: "kindle-validation-failed", at: "2026-09-29T00:02:00Z" });
  assert.equal(repair.incident.failureClass, "VALIDATION_FAILURE");
  assert.equal(repair.repairRequest.status, "open");
  assert.equal(interventionMetrics(dataRoot).repeatInterventionRate, 0.5);
  recordTitleCost(dataRoot, { book: "ice-out", commissionedAt: "2026-09-29T00:00:00Z", updatedAt: "2026-09-29T00:00:00Z", throughStage: "plan", delta: { inferenceDollars: 5, wallClockProductionMs: 10 } });
  recordTitleCost(dataRoot, { book: "ice-out", commissionedAt: "ignored", updatedAt: "2026-09-29T00:03:00Z", throughStage: "publish", delta: { channelFeesDollars: 1 } });
  const cost = titleCostRecords(dataRoot, "ice-out").at(-1);
  assert.equal(cost.commissionedAt, "2026-09-29T00:00:00Z");
  assert.equal(cost.frozenAtCommission.costs.inferenceDollars, 5);
  assert.equal(cost.costs.inferenceDollars, 5);
  assert.equal(cost.costs.channelFeesDollars, 1);
});
