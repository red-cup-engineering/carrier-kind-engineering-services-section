import assert from "node:assert/strict";
import test from "node:test";
import { cell } from "@red-cup-engineering/signcell/cell";
import { continueHistory, createHistory, historyHeads, historySize, observeHistory, queryHistory } from "../src/history.mjs";

const at = (subject, predicate, object, witness = "stable") => cell(subject, predicate, object, { for: [witness] });

/** A history as a durable save decodes it: plain revisions, no admitted values. */
function saved() {
  let history = createHistory(["location"]);
  for (const [place, source] of [["dock", "arrive"], ["inn", "move"], ["market", "move"], ["dock", "return"]]) {
    history = observeHistory(history, [at("alice", "location", place, source)], { source });
  }
  return { history, revisions: JSON.parse(JSON.stringify(history.revisions)) };
}

test("a decoded history continued in spans reads exactly as the history it was saved from", () => {
  const { history, revisions } = saved();
  const first = continueHistory(createHistory(["location"]), revisions.slice(0, 2));
  const whole = continueHistory(first, revisions.slice(2));
  assert.deepEqual(queryHistory(whole, {}), queryHistory(history, {}));
  assert.deepEqual(historyHeads(whole), historyHeads(history));
  assert.equal(historySize(whole), historySize(history));
});

test("a revision whose content no longer matches its address is refused", () => {
  const { revisions } = saved();
  const tampered = revisions.map((revision, index) => index === 1 ? { ...revision, source: "forged" } : revision);
  assert.throws(() => continueHistory(createHistory(["location"]), tampered), /content address/);
});

test("a revision admitted before its causal parents is refused", () => {
  const { revisions } = saved();
  assert.throws(() => continueHistory(createHistory(["location"]), revisions.slice(1)));
});
