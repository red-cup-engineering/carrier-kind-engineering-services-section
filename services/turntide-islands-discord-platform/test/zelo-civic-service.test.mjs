import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  authorityBoundary,
  civicState,
  formatZelo,
  loadZeloCivicContext,
  orientTurntider,
  receivedTeachingExamples,
  rehearseCivicMove,
  routineIntent,
  scheduledCivicReview,
} from "../src/turntide-software-system/zelo-civic-service.mjs";

// Small invented governance records that exercise the kernel's code paths. Turntide's real records
// live in their own checkout; the adapter integration test reads those through TURNTIDE_PUBLIC_ROOT.
const FIXTURE_ROOT = path.join(import.meta.dirname, "fixtures", "turntide-governance");

test("loadZeloCivicContext reads every governance record and the acts from the named root", async () => {
  const context = await loadZeloCivicContext(FIXTURE_ROOT);
  assert.equal(context.root, FIXTURE_ROOT);
  for (const key of ["standing", "protocol", "mandate", "routines", "runtime", "routinePatterns", "civicPlaces", "standingPathways", "tidepoolStatus", "tidepoolParticipantGovernance", "contestability", "decisionProcedures"]) {
    assert.equal(typeof context[key], "object", key);
  }
  assert.deepEqual(context.acts.map((act) => act.id), ["fixture-act-received", "fixture-act-unexecuted"]);
  assert.ok(Object.isFrozen(context));
  assert.ok(Object.isFrozen(context.acts));
});

test("loadZeloCivicContext refuses to guess where the governance records are", async () => {
  for (const root of [undefined, null, "", "   "]) {
    await assert.rejects(() => loadZeloCivicContext(root), (error) => error instanceof TypeError && /TURNTIDE_PUBLIC_ROOT/u.test(error.message));
  }
});

test("orientTurntider lists only active standing and binds nothing", async () => {
  const context = await loadZeloCivicContext(FIXTURE_ROOT);
  const orientation = orientTurntider(context);
  assert.equal(orientation.type, "ZeloCivicOrientation");
  assert.equal(orientation.governance, "turntide-governance");
  assert.deepEqual(orientation.activeStanding.map((entry) => entry.id), ["fixture-governor", "fixture-steward", "fixture-unbased-helper"]);
  assert.equal(orientation.bindingEffect, "informational-only");
  assert.match(formatZelo(orientation), /^Turntide is a DAO whose authority lives in recorded standing/u);
});

test("civicState answers from the protocol's transitions and rejects unknown kinds", async () => {
  const context = await loadZeloCivicContext(FIXTURE_ROOT);
  const initial = civicState(context, { artifactKind: "proposal" });
  assert.equal(initial.state, "draft-proposal");
  assert.deepEqual(initial.transitions.map((move) => move.to), ["proposed"]);
  assert.deepEqual(initial.transitions[0].requires, ["requested act", "evidence"]);
  assert.equal(initial.bindingEffect, "informational-only");
  assert.equal(
    formatZelo(initial),
    "proposal is currently draft-proposal. Lawful next move(s):\nproposed — by proposer; needs requested act, evidence",
  );

  const terminal = civicState(context, { artifactKind: "proposal", state: "enacted" });
  assert.deepEqual(terminal.transitions, []);
  assert.equal(formatZelo(terminal), "proposal is currently enacted; the enacted protocol names no automatic next transition from there.");

  assert.throws(() => civicState(context, { artifactKind: "spell" }), /unknown Turntide civic artifact kind "spell"/u);
});

test("authorityBoundary separates the authority domains and refuses unknown ones", async () => {
  const context = await loadZeloCivicContext(FIXTURE_ROOT);
  const tidepool = authorityBoundary(context, " Tidepool ");
  assert.equal(tidepool.subject, "tidepool");
  assert.equal(tidepool.authorityDomain, "tidepool-financial-membership");
  assert.equal(tidepool.standingMustBeRecorded, true);
  assert.equal(tidepool.bindingEffect, "informational-only");
  assert.equal(formatZelo(authorityBoundary(context, "discord")), "Discord participation and roles are civic instruments; they do not create Turntide governance standing.");
  assert.throws(() => authorityBoundary(context, "moon"), /unknown authority domain "moon"/u);
});

test("rehearseCivicMove is a nonbinding dry run that creates nothing", async () => {
  const context = await loadZeloCivicContext(FIXTURE_ROOT);
  const rehearsal = rehearseCivicMove(context, { artifactKind: "proposal", state: "proposed" });
  assert.equal(rehearsal.type, "ZeloGovernanceRehearsal");
  assert.equal(rehearsal.nonbinding, true);
  assert.deepEqual({ ...rehearsal.creates }, { standing: false, vote: false, decision: false, authority: false, execution: false });
  assert.deepEqual(rehearsal.scenario.transitions.map((move) => move.to), ["enacted"]);
  assert.match(formatZelo(rehearsal), /^DRY RUN — no standing, vote, decision, authority, or execution is created\.\nproposal is currently proposed\./u);
});

test("receivedTeachingExamples offers only received, teaching-eligible acts and never as precedent", async () => {
  const context = await loadZeloCivicContext(FIXTURE_ROOT);
  const examples = receivedTeachingExamples(context);
  assert.equal(examples.length, 1);
  assert.equal(examples[0].id, "fixture-act-received");
  assert.equal(examples[0].lesson, "Fixture lesson: execution and receiving are separate.");
  assert.equal(examples[0].precedentEffect, "none");
});

test("scheduledCivicReview baselines silently on first observation", async () => {
  const context = await loadZeloCivicContext(FIXTURE_ROOT);
  const now = "2026-01-10T12:00:00.000Z";
  const baseline = scheduledCivicReview(context, { state: {}, now });
  assert.deepEqual(baseline.outputs, []);
  assert.equal(baseline.nextState.initialized, true);
  assert.deepEqual(baseline.nextState.knownReceivedActIds, ["fixture-act-received"]);
  assert.deepEqual(baseline.nextState.pendingTeachingIds, []);
  assert.equal(baseline.nextState.lastRunAt["governance-rock-sweep"], now);
  assert.throws(() => scheduledCivicReview(context, { now: "not a time" }), /requires an ISO timestamp/u);
});

test("scheduledCivicReview stays silent when nothing is due and reports only what is", async () => {
  const context = await loadZeloCivicContext(FIXTURE_ROOT);
  const baseline = scheduledCivicReview(context, { state: {}, now: "2026-01-10T12:00:00.000Z" });

  const soon = scheduledCivicReview(context, { state: baseline.nextState, now: "2026-01-10T13:00:00.000Z" });
  assert.deepEqual(soon.outputs, []);

  const nextDay = scheduledCivicReview(context, { state: baseline.nextState, now: "2026-01-11T12:00:00.000Z" });
  assert.deepEqual(nextDay.outputs.map((output) => output.routine), ["decision-action-reconciliation"]);
  assert.equal(
    nextDay.outputs[0].content,
    "Decision/action reconciliation found 1 unsettled governance act(s): fixture-act-unexecuted [not-started] → name or confirm the authorized executor and execution receipt",
  );

  const nextWeek = scheduledCivicReview(context, { state: nextDay.nextState, now: "2026-01-17T12:00:00.000Z" });
  const review = nextWeek.outputs.find((output) => output.routine === "standing-delegation-review");
  assert.ok(review);
  assert.match(review.content, /fixture-unbased-helper/u);
  assert.match(review.content, /not an automatic revocation/u);
});

test("scheduledCivicReview teaches a newly received act once, weekly", async () => {
  const context = await loadZeloCivicContext(FIXTURE_ROOT);
  const baseline = scheduledCivicReview(context, { state: {}, now: "2026-01-10T12:00:00.000Z" });
  const before = { ...baseline.nextState, knownReceivedActIds: [] };
  const taught = scheduledCivicReview(context, { state: before, now: "2026-01-10T13:00:00.000Z" });
  assert.deepEqual(taught.outputs.map((output) => output.routine), ["received-act-teaching-example"]);
  assert.match(taught.outputs[0].content, /^How Turntide governed a real change: Adopt the fixture ledger\. Lesson: Fixture lesson/u);
  assert.deepEqual(taught.nextState.taughtActIds, ["fixture-act-received"]);
  const again = scheduledCivicReview(context, { state: taught.nextState, now: "2026-01-10T14:00:00.000Z" });
  assert.deepEqual(again.outputs, []);
});

test("routineIntent admits only runtime routines and grants no authority", async () => {
  const context = await loadZeloCivicContext(FIXTURE_ROOT);
  const intent = routineIntent(context, { routineId: "governance-rock-sweep" });
  assert.equal(intent.office, "zelo-civic-steward");
  assert.equal(intent.silenceWhenEmpty, true);
  assert.equal(intent.grantsAuthority, false);
  assert.equal(intent.deliveryAdapterIsAuthority, false);
  assert.throws(() => routineIntent(context, { routineId: "unlisted" }), /not admitted to the Zelo civic runtime/u);
});

test("formatZelo falls back to the value itself for an unknown answer", () => {
  assert.equal(formatZelo({ type: "Unknown", n: 1 }), JSON.stringify({ type: "Unknown", n: 1 }));
});
