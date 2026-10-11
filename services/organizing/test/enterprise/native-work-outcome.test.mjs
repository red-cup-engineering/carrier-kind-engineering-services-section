import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { skillSuccess, skillError } from "@red-cup-engineering/animating/becoming/doing/working/governing/skill";
import { workResultFromSkillResult, typedResultOf } from "../../src/work/schema.mjs";
import { outcomeOf, outcomeJournal, standingOf, standingOutcomes, deliveryReadingOf, acceptanceReadoutOf,
  marketJudgmentsIndexOf, judgedSettlementsOf, outcomePostingsOf } from "../../src/enterprise/outcomes.mjs";

const at = "2026-10-10T12:00:00.000Z";
const period = { from: "2026-10-10T00:00:00.000Z", to: "2026-10-11T00:00:00.000Z" };
const nativeError = () => workResultFromSkillResult(skillError("Unresolvable", "Missing evidence.", "inspect source", "obtain the witness"));
const nativeSuccess = () => workResultFromSkillResult(skillSuccess({ answer: 42 }));
const input = (delivery, reportedResult, verdict = "accepted", extra = {}) => ({
  source: "work-discharge", lot: "work-item:source", delivery, provider: "office:producer", judge: "office:receiver",
  verdict, at, evidence: [delivery], carrier: "model-a", ...(reportedResult === undefined ? {} : { reportedResult }),
  resources: [{ resource: "tokens", unit: "token", amount: "4", carrier: "model-a" }], ...extra,
});
const row = outcomes => acceptanceReadoutOf(outcomes, { ...period, priceOf: () => ({ amount: "1", currency: "USD" }) }).byCarrier[0];

test("accepted error reports retain their exact native value without crediting work or inventing rejection", () => {
  const reportedResult = nativeError();
  const outcome = outcomeOf(input("error-report", reportedResult));
  assert.equal(outcome.verdict, "accepted");
  assert.deepEqual(outcome.reportedResult, reportedResult);
  assert.deepEqual(standingOf([outcome]).get("model-a"), { accepted: 0, attempts: 1 });
  assert.equal(deliveryReadingOf([outcome]), "unknown");
  const measured = row([outcome]);
  assert.equal(measured.accepted, 0);
  assert.equal(measured.rejected, 0);
  assert.equal(measured.failed, 1);
  assert.equal(measured.judged, 1);
  assert.deepEqual(measured.reportJudgments, { accepted: 1, rejected: 0 });
  assert.deepEqual(measured.cost, { USD: "4" });
  assert.equal(measured.costPerAccepted, null);
  assert.equal(measured.attemptsPerAccepted, null);
  assert.equal(measured.posterior, 1 / 3);
});

test("failed attempt resources stay in cost per accepted work and replay does not double-count them", () => {
  const failed = outcomeOf(input("failed", nativeError()));
  const accepted = outcomeOf(input("accepted", nativeSuccess(), "accepted", {
    resources: [{ resource: "tokens", unit: "token", amount: "2", carrier: "model-a" }],
  }));
  const measured = row([failed, accepted, failed, accepted]);
  assert.equal(measured.accepted, 1);
  assert.equal(measured.judged, 2);
  assert.equal(measured.failed, 1);
  assert.equal(measured.attemptsPerAccepted, 2);
  assert.deepEqual(measured.cost, { USD: "6" });
  assert.deepEqual(measured.costPerAccepted, { USD: "6.000000" });
  assert.deepEqual(standingOf([failed, accepted, failed]).get("model-a"), { accepted: 1, attempts: 2 });
});

test("explicit incurred error cost overrides its estimate, remains in economics and creates no sales receipt", () => {
  const failed = outcomeOf(input("incurred", nativeError(), "accepted", { value: { amount: "9", currency: "USD", basis: "cost" } }));
  const accepted = outcomeOf(input("completed", nativeSuccess(), "accepted", { resources: [] }));
  const measured = row([failed, accepted]);
  assert.deepEqual(measured.cost, { USD: "9" });
  assert.deepEqual(measured.costPerAccepted, { USD: "9.000000" });
  assert.deepEqual(outcomePostingsOf(failed, () => undefined), []);
  assert.deepEqual(judgedSettlementsOf([failed], { partyOf: actor => actor === failed.provider ? { enterprise: "provider" } : undefined }), {});
  assert.equal(acceptanceReadoutOf([failed], period).border.external.count, 0);
  const zero = outcomeOf(input("known-zero", nativeSuccess(), "accepted", { value: { amount: "0", currency: "USD", basis: "cost" } }));
  assert.deepEqual(row([zero]).costPerAccepted, { USD: "0.000000" });
});

test("receiver rejection cannot turn native success into accepted work and native assay failure remains a report", () => {
  const rejected = outcomeOf(input("rejected-success", nativeSuccess(), "rejected"));
  assert.equal(row([rejected]).accepted, 0);
  assert.equal(row([rejected]).rejected, 1);
  assert.equal(deliveryReadingOf([rejected]), "denied");
  const assayed = typedResultOf({ type: "integer" }, nativeSuccess());
  assert.equal(assayed.kind, "skill-error");
  assert.equal(assayed.skillOutcome.ok, true);
  const failed = outcomeOf(input("codomain-failure", assayed));
  assert.equal(row([failed]).failed, 1);
  assert.equal(row([failed]).accepted, 0);
});

test("journal and market readback retain report versus work evidence, with legacy outcomes unchanged", t => {
  const root = mkdtempSync(path.join(tmpdir(), "native-work-outcomes-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const market = { provider: "provider:a", offer: "offer:a", taskClass: "source", receipt: "delivery:source" };
  const outcome = outcomeOf(input("received-error", nativeError(), "accepted", { market }));
  const journal = outcomeJournal(root);
  assert.equal(journal.record(outcome), 1);
  assert.equal(journal.record(outcome), 0);
  assert.deepEqual(outcomeJournal(root).read(), [outcome]);
  const indexed = marketJudgmentsIndexOf([outcome], { at, digest: "fixture" }).judgments[0];
  assert.equal(indexed.verdict, "accepted");
  assert.deepEqual(indexed.reportedResult, outcome.reportedResult);
  const legacy = outcomeOf(input("legacy", undefined));
  assert.equal(Object.hasOwn(legacy, "reportedResult"), false);
  assert.deepEqual(standingOf([legacy]).get("model-a"), { accepted: 1, attempts: 1 });
  assert.equal(deliveryReadingOf([legacy]), "held");
  assert.equal(outcomeOf(input("legacy", undefined)).id, legacy.id);
});

test("the outcome boundary admits the genuine result carrier and refuses malformed report substitutions", () => {
  assert.throws(() => outcomeOf(input("invalid", {})));
  const error = nativeError();
  assert.throws(() => outcomeOf(input("promoted", { kind: "skill-result", value: 42, skillOutcome: error.skillOutcome })));
  assert.throws(() => outcomeOf({ ...input("wrong-register", error), source: "customer" }), /work-discharge/);
});

test("reported results are detached deep-frozen JSON values, including literal legacy Unicode", t => {
  const root = mkdtempSync(path.join(tmpdir(), "detached-work-outcomes-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const samples = [
    { kind: "skill-result", value: { "e\u0301": [{ text: "e\u0301", nested: { count: 1 } }] } },
    { kind: "skill-error", error: "e\u0301 legacy error" },
    structuredClone(nativeSuccess()), structuredClone(nativeError()),
  ];
  const frozen = value => {
    if (value === null || typeof value !== "object") return;
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) frozen(child);
  };
  for (const [index, original] of samples.entries()) {
    const expected = structuredClone(original);
    const admitted = outcomeOf(input(`detached-${index}`, original));
    const id = admitted.id;
    const standing = standingOf([admitted]).get("model-a");
    assert.notEqual(admitted.reportedResult, original);
    frozen(admitted.reportedResult);
    if (index === 0) {
      original.value["e\u0301"][0].nested.count = 99;
      original.value["e\u0301"].push("mutated");
      assert.equal(Object.hasOwn(admitted.reportedResult.value, "é"), false);
      assert.equal(admitted.reportedResult.value["e\u0301"][0].text, "e\u0301");
      assert.throws(() => { admitted.reportedResult.value["e\u0301"][0].nested.count = 4; }, TypeError);
    }
    original.kind = expected.kind === "skill-result" ? "skill-error" : "skill-result";
    original.error = "changed after admission";
    delete original.value;
    assert.deepEqual(admitted.reportedResult, expected);
    assert.equal(admitted.id, id);
    assert.deepEqual(standingOf([admitted]).get("model-a"), standing);
    assert.throws(() => { admitted.reportedResult.kind = original.kind; }, TypeError);
    const journal = outcomeJournal(root);
    assert.equal(journal.record(admitted), 1);
    const replay = outcomeJournal(root).read().find(row => row.id === id);
    assert.deepEqual(replay, admitted);
    frozen(replay.reportedResult);
    assert.throws(() => { replay.reportedResult.kind = original.kind; }, TypeError);
    assert.equal(journal.record(replay), 0);
  }
});


test("historical timestamp-only replays preserve the original standing period without rewriting rows", () => {
  const root = mkdtempSync(path.join(tmpdir(), "historic-outcome-replays-"));
  try {
    for (const [index, result] of [undefined, { kind: "skill-result", value: "legacy" }, { kind: "skill-error", error: "failed" }, nativeSuccess(), nativeError()].entries()) {
      const first = outcomeOf(input(`historical-${index}`, result));
      const sameDay = outcomeOf({ ...first, at: "2026-10-10T13:00:00Z" });
      const later = outcomeOf({ ...first, at: "2026-10-12T14:00:00Z" });
      const journal = outcomeJournal(root);
      assert.equal(journal.record([first, sameDay, later]), 3);
      const rows = journal.read().filter(row => row.delivery === first.delivery);
      assert.equal(rows.length, 3, "all original content-addressed records remain available");
      assert.deepEqual(standingOutcomes([...rows].reverse()), [first]);
      assert.deepEqual(row(rows).cost, { USD: "4" });
      assert.equal(acceptanceReadoutOf(rows, { from: "2026-10-12T00:00:00Z", to: "2026-10-13T00:00:00Z" }).byCarrier.length, 0);
      const changed = outcomeOf({ ...first, verdict: "rejected", reason: "new review", at: "2026-10-11T12:00:00Z" });
      assert.deepEqual(standingOutcomes([later, changed, first, sameDay]), [later], "A -> B -> A is a genuine later revision, not a replay run");
      const withdrawn = outcomeOf({ ...changed, verdict: "voided", voids: changed.id, at: "2026-10-13T12:00:00Z" });
      assert.deepEqual(standingOutcomes([withdrawn, later, changed, first, sameDay]), [later], "voiding B must not erase that A2 is a later act");
      const distinct = outcomeOf({ ...first, receivingReceipt: "receiving:new-act", at: later.at });
      assert.deepEqual(standingOutcomes([first, distinct]), [distinct], "a distinct witnessed receiving act has its own time");
      const resourcesChanged = outcomeOf({ ...first, resources: [{ resource: "tokens", unit: "token", amount: "5", carrier: "model-a" }], at: later.at });
      assert.deepEqual(standingOutcomes([first, resourcesChanged]), [resourcesChanged], "different witnessed costs are not silently coalesced");
      const editorFirst = outcomeOf({ ...input("editor", undefined), source: "editor" });
      const editorLater = outcomeOf({ ...editorFirst, at: later.at });
      assert.deepEqual(standingOutcomes([editorLater, editorFirst]), [editorLater], "other judgment registers retain their existing latest-judgment semantics");
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
