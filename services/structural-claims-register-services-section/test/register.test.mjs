import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DELAY_COST_PER_MW_DAY, admitOptionValueRequest, claimClass, dailyDelayCost, engagementState, interestReading, optionValue, optionValueRequest } from "../src/register.mjs";
import { structuralClaimsOperations } from "../src/operations.mjs";

test("a claim's class is read from what it constrains and what its violation does", () => {
  assert.equal(claimClass({ constrains: "rezoning-vote", consequence: "deny" }), "structural");
  assert.equal(claimClass({ constrains: "environmental-review", consequence: "redo" }), "structural");
  assert.equal(claimClass({ constrains: "environmental-review", consequence: "consulted" }), "aspirational");
  assert.equal(claimClass({ constrains: "none" }), "decorative");
  assert.equal(claimClass({ constrains: "permit-issuance" }), "unclassified");
  assert.throws(() => claimClass({ constrains: "vibes", consequence: "pause" }), /unknown operation/);
});

test("a structural claim is worth its delay times the developer's daily cost of delay; unknown stays unknown", () => {
  assert.equal(dailyDelayCost({ capacityMw: 60 }).usd, Math.round(60 * DELAY_COST_PER_MW_DAY));
  assert.equal(dailyDelayCost({}).usd, null);
  const structural = { constrains: "court-review", consequence: "court", delayDays: 90 };
  assert.equal(optionValue(structural, { dailyDelayCostUsd: 100_000 }).usd, 9_000_000);
  assert.equal(optionValue({ ...structural, delayDays: undefined }, { dailyDelayCostUsd: 100_000 }).usd, null);
  assert.equal(optionValue(structural, {}).usd, null);
  assert.equal(optionValue({ constrains: "none" }, { dailyDelayCostUsd: 100_000 }).usd, 0);
});


test("the paid option-value boundary returns a numeric stateless reading and refuses incomplete or negative inputs", () => {
  const request = {
    claim: { constrains: "tribal-consultation", consequence: "pause", delayDays: 14 },
    project: { capacityMw: 60 },
  };
  assert.deepEqual(admitOptionValueRequest(request), request);
  assert.deepEqual(optionValueRequest(request), {
    class: "structural",
    usd: 6_626_662,
    delayDays: 14,
    dailyDelayCostUsd: 473_333,
    basis: "capacity at STL Partners' $14.2M per month for 60 MW",
  });
  assert.throws(() => optionValueRequest({ claim: request.claim, project: {} }), /requires nonnegative/);
  assert.throws(() => optionValueRequest({ claim: { ...request.claim, delayDays: -1 }, project: request.project }), /delayDays/);
  assert.throws(() => optionValueRequest({ claim: request.claim, project: { capacityMw: -60 } }), /capacityMw/);
});

test("interest is the FOUR reading of a party's contacts", () => {
  assert.equal(interestReading([]), interestReading([{ outcome: "voicemail" }]));
  assert.notEqual(interestReading([{ outcome: "discovery call set" }]), interestReading([]));
  assert.notEqual(interestReading([{ outcome: "interested" }, { outcome: "remove" }]), interestReading([{ outcome: "interested" }]));
});

test("a paid engagement owes its caller the fee times their share", () => {
  const paid = engagementState([
    { stage: "proposal", feeUsd: 30_000, callerShare: 0.2, caller: "caller", recordedAt: "2026-10-01T00:00:00Z" },
    { stage: "paid", recordedAt: "2026-11-01T00:00:00Z" },
  ]);
  assert.equal(paid.stage, "paid");
  assert.equal(paid.callerOwedUsd, 6_000);
  assert.equal(paid.callerExpectedUsd, null);
  const open = engagementState([{ stage: "engaged", feeUsd: 30_000, callerShare: 0.2, recordedAt: "2026-10-01T00:00:00Z" }]);
  assert.equal(open.callerOwedUsd, null);
  assert.equal(open.callerExpectedUsd, 6_000);
});

test("the operation family records a project and its claims, queues the holder, scores a forecast, and pays the caller", async (t) => {
  const dataRoot = mkdtempSync(join(tmpdir(), "claims-register-"));
  t.after(() => rmSync(dataRoot, { recursive: true, force: true }));
  const ops = Object.fromEntries(structuralClaimsOperations({ dataRoot }).map((op) => [op.verb, op]));
  const run = async (verb, input) => { const out = await ops[verb].execute(input, {}, { invocation: { subject: "password:test" } }); return out?.value !== undefined && out?.ok !== undefined ? out.value : out; };
  assert.ok((await run("claims-watch-list", {})).parties.length >= 3);
  await run("claims-project-record", { name: "Example Hyperscale Campus", developer: "Example Dev LLC", kind: "data-center", status: "permitting", county: "Example", state: "MN", capacityMw: 120 });
  await run("claims-claim-record", { project: "example-hyperscale-campus", holder: "Example Band", kind: "water", statement: "Reserved water rights in the aquifer the campus would draw.", constrains: "water-appropriation", consequence: "court", delayDays: 180 });
  await run("claims-claim-record", { project: "example-hyperscale-campus", holder: "Example Dev LLC", kind: "other", statement: "The campus will bring 50 jobs.", constrains: "none" });
  const register = await run("claims-register", {});
  assert.equal(register.byClass.structural, 1);
  assert.equal(register.byClass.decorative, 1);
  assert.equal(register.claims[0].option.usd, Math.round(180 * Math.round(120 * DELAY_COST_PER_MW_DAY)));
  const queue = await run("claims-call-queue", {});
  assert.equal(queue.queue[0].party, "Example Band");
  await run("claims-contact-log", { party: "Example Band", project: "example-hyperscale-campus", outcome: "discovery call set" });
  const forecast = await run("claims-forecast-record", { project: "example-hyperscale-campus", outcome: "delayed", by: "2027-06-30", probability: 0.7, rationale: "The water claim reaches court before the permit.", sources: ["example docket"] });
  const resolved = await run("claims-forecast-resolve", { question: forecast.question, happened: true });
  assert.equal(resolved.brier, (0.7 - 1) ** 2);
  await run("claims-engagement-record", { party: "Example Band", project: "example-hyperscale-campus", stage: "engaged", feeUsd: 40_000, callerShare: 0.25, caller: "caller" });
  await run("claims-engagement-record", { party: "Example Band", project: "example-hyperscale-campus", stage: "paid" });
  const pipeline = await run("claims-pipeline", {});
  assert.equal(pipeline.paidFeesUsd, 40_000);
  assert.deepEqual(pipeline.callers, [{ caller: "caller", owedUsd: 10_000, expectedUsd: 0 }]);
  const project = await run("claims-project", { project: "example-hyperscale-campus" });
  assert.equal(project.claims.length, 2);
  assert.equal(project.forecasts.length, 1);
});
