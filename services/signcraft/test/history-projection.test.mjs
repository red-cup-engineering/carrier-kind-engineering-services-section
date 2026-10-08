import assert from "node:assert/strict";
import test from "node:test";
import { cell } from "@red-cup-engineering/signcell/cell";
import {
  captureHistoryReads, checkpointHistory, createHistory, historyChanges, historyDerivation,
  mergeHistories, observeHistory, queryHistory, restoreHistory, withFunctionalPredicates,
} from "@red-cup-engineering/signcraft/history";

const offered = (task, body, witness) => cell(task, "offered-to", body, { for: [witness] });

test("object-filtered derivation sees counterevidence from a concurrent functional alternative", () => {
  const base = createHistory(["offered-to"]);
  const left = observeHistory(base, [offered("task", "worker-a", "left")]);
  const right = observeHistory(base, [offered("task", "worker-b", "right")]);
  const joined = mergeHistories(left, right);
  const pattern = { predicate: "offered-to", object: "worker-a" };
  const read = historyDerivation((history) => queryHistory(history, pattern));
  const before = read(left);
  assert.deepEqual(before[0].against, []);
  assert.deepEqual(read(joined), queryHistory(joined, pattern));
  assert.deepEqual(read(joined)[0].against, ["right"]);
  assert.deepEqual(before[0].against, [], "the earlier reading remains immutable");
  assert.deepEqual(joined.revisions.flatMap(({ cells }) => cells).map((value) => value.against), [[], []],
    "projected counterevidence is never written into the raw witness carrier");
});

test("unrelated functional assignments preserve the narrow body-query frame", () => {
  const base = observeHistory(createHistory(["offered-to"]), [offered("task-a", "worker-a", "a")]);
  let calls = 0;
  const read = historyDerivation((history) => {
    calls++;
    return queryHistory(history, { predicate: "offered-to", object: "worker-a" });
  });
  const initial = read(base);
  const other = observeHistory(base, [offered("task-b", "worker-b", "b")]);
  assert.equal(read(other), initial);
  assert.equal(calls, 1, "another task's offer does not invalidate this body's query");
});

test("unrelated nonfunctional objects preserve the narrow query frame", () => {
  const base = observeHistory(createHistory(), [cell("task", "tag", "ready", { for: ["a"] })]);
  let calls = 0;
  const read = historyDerivation((history) => {
    calls++;
    return queryHistory(history, { subject: "task", predicate: "tag", object: "ready" });
  });
  const initial = read(base);
  const other = observeHistory(base, [cell("task", "tag", "waiting", { for: ["b"] })]);
  assert.equal(read(other), initial);
  assert.equal(calls, 1);
});

test("a functional correction removes the old query even when its replacement does not match", () => {
  const first = observeHistory(createHistory(["offered-to"]), [offered("task", "worker-a", "a")]);
  const corrected = observeHistory(first, [offered("task", "worker-b", "correction")]);
  const read = historyDerivation((history) => queryHistory(history, { object: "worker-a" }));
  assert.equal(read(first).length, 1);
  assert.deepEqual(read(corrected), []);
  assert.equal(first.revisions[0].cells[0].object, "worker-a");
  assert.equal(corrected.revisions.length, 2, "the superseded observation remains in ancestry");
});

test("semantic subject and object identity carries functional counterevidence across spellings", () => {
  const base = createHistory(["offered-to"]);
  const left = observeHistory(base, [offered("tâche", "équipe", "left")]);
  const right = observeHistory(base, [offered("ta\u0302che", "other", "right")]);
  const joined = mergeHistories(left, right);
  const pattern = { subject: "ta\u0302che", predicate: "offered-to", object: "e\u0301quipe" };
  const read = historyDerivation((history) => queryHistory(history, pattern));
  assert.deepEqual(read(left)[0].against, []);
  assert.deepEqual(read(joined), queryHistory(joined, pattern));
  assert.deepEqual(read(joined)[0].against, ["right"]);
});

test("nested derivations refresh evidence while capture preserves the actual query", () => {
  const base = createHistory(["offered-to"]);
  const left = observeHistory(base, [offered("task", "worker-a", "left")]);
  const right = observeHistory(base, [offered("task", "worker-b", "right")]);
  const joined = mergeHistories(left, right);
  const pattern = { predicate: "offered-to", object: "worker-a" };
  const inner = historyDerivation((history) => queryHistory(history, pattern));
  const outer = historyDerivation((history) => inner(history).map((value) => value.against));
  assert.deepEqual(outer(left), [[]]);
  const captured = captureHistoryReads(() => outer(joined));
  assert.deepEqual(captured.result, [["right"]]);
  assert.deepEqual(captured.reads, [pattern]);
});

test("branch divergence, correction, checkpoint and restore agree with fresh projected queries", () => {
  const base = createHistory(["offered-to"]);
  const left = observeHistory(base, [offered("task", "worker-a", "a"), cell("task", "tag", "ready", { for: ["a"] })]);
  const right = observeHistory(base, [offered("task", "worker-b", "b"), cell("task", "tag", "ready", { against: ["b"] })]);
  const joined = mergeHistories(left, right);
  const corrected = observeHistory(joined, [offered("task", "worker-a", "corrected")]);
  const checkpoint = checkpointHistory(corrected);
  const restored = restoreHistory(JSON.parse(JSON.stringify(checkpoint)));
  const patterns = [
    {}, { subject: "task" }, { predicate: "offered-to" },
    { predicate: "offered-to", object: "worker-a" }, { object: "worker-a" },
    { predicate: "tag" }, { predicate: "tag", object: "ready" },
  ];
  for (const pattern of patterns) {
    const read = historyDerivation((history) => queryHistory(history, pattern));
    for (const history of [base, left, joined, right, corrected, checkpoint, restored, base, joined]) {
      assert.deepEqual(read(history), queryHistory(history, pattern), JSON.stringify(pattern));
    }
  }
  assert.deepEqual(historyChanges(corrected, checkpoint), []);
});

test("bounded ancestry fallback still discovers a concurrent alternative's projected effect", () => {
  const base = createHistory(["offered-to"]);
  const left = observeHistory(base, [offered("task", "worker-a", "a")]);
  const right = observeHistory(base, [offered("task", "worker-b", "b")]);
  let next = mergeHistories(left, right);
  for (let index = 0; index < 260; index++) {
    next = observeHistory(next, [cell("unrelated", "sequence", index, { for: [index] })]);
  }
  const pattern = { predicate: "offered-to", object: "worker-a" };
  const read = historyDerivation((history) => queryHistory(history, pattern));
  assert.deepEqual(read(left)[0].against, []);
  assert.deepEqual(read(next), queryHistory(next, pattern));
});

test("removing a concurrent alternative removes its projected counterevidence", () => {
  const base = createHistory(["offered-to"]);
  const left = observeHistory(base, [offered("task", "worker-a", "left")]);
  const right = observeHistory(base, [offered("task", "worker-b", "right")]);
  const joined = mergeHistories(left, right);
  const read = historyDerivation((history) => queryHistory(history, { object: "worker-a" }));
  assert.deepEqual(read(joined)[0].against, ["right"]);
  assert.deepEqual(read(left)[0].against, [], "branch divergence retracts the alternative from this reading");
  assert.deepEqual(read(joined)[0].against, ["right"], "the joined history and both witnesses remain intact");
});

test("an empty conflict selection changes when functional counterevidence appears", () => {
  const base = createHistory(["offered-to"]);
  const left = observeHistory(base, [offered("task", "worker-a", "left")]);
  const right = observeHistory(base, [offered("task", "worker-b", "right")]);
  const joined = mergeHistories(left, right);
  const conflicted = historyDerivation((history) => queryHistory(history, { predicate: "offered-to", object: "worker-a" })
    .filter((value) => value.for.length > 0 && value.against.length > 0));
  assert.deepEqual(conflicted(left), []);
  assert.equal(conflicted(joined).length, 1);
});

test("declaring a functional predicate invalidates a prior nonfunctional reading", () => {
  const base = createHistory();
  const left = observeHistory(base, [offered("task", "worker-a", "left")]);
  const right = observeHistory(base, [offered("task", "worker-b", "right")]);
  const joined = mergeHistories(left, right);
  const functional = withFunctionalPredicates(joined, ["offered-to"]);
  const read = historyDerivation((history) => queryHistory(history, { object: "worker-a" }));
  assert.deepEqual(read(joined)[0].against, []);
  assert.equal(historyChanges(joined, functional), null);
  assert.deepEqual(read(functional)[0].against, ["right"]);
});

test("positive and negative witnesses stay separate under a paraconsistent functional alternative", () => {
  const base = createHistory(["offered-to"]);
  const left = observeHistory(base, [cell("task", "offered-to", "worker-a", { for: ["a"], against: ["deny-a"] })]);
  const right = observeHistory(base, [cell("task", "offered-to", "worker-b", { for: ["b"], against: ["deny-b"] })]);
  const joined = mergeHistories(left, right);
  const pattern = { predicate: "offered-to", object: "worker-a" };
  const read = historyDerivation((history) => queryHistory(history, pattern));
  read(left);
  assert.deepEqual(read(joined), queryHistory(joined, pattern));
  assert.deepEqual(new Set(read(joined)[0].against), new Set(["deny-a", "b"]));
  assert.deepEqual(read(joined)[0].for, ["a"]);
  assert.ok(!read(joined)[0].against.includes("deny-b"), "denial of an alternative is not support for that alternative");
});

test("an absent object range admits its first matching observation", () => {
  const base = createHistory(["offered-to"]);
  const read = historyDerivation((history) => queryHistory(history, { predicate: "offered-to", object: "worker-c" }));
  assert.deepEqual(read(base), []);
  const next = observeHistory(base, [offered("task", "worker-c", "first")]);
  assert.equal(read(next).length, 1);
});

const predicateCarriers = [
  ["NFC", "é", "e\u0301"],
  ["record", Object.freeze({ name: "p" }), Object.freeze({ name: "p" })],
  ["array", Object.freeze(["p"]), Object.freeze(["p"])],
];
for (const [name, declared, alternative] of predicateCarriers) {
  for (const direction of ["addition", "removal"]) {
    test(`${name} predicate identity refreshes alternative ${direction}`, () => {
      const base = createHistory([declared]);
      const left = observeHistory(base, [cell("task", declared, "worker-a", { for: ["a"] })]);
      const right = observeHistory(base, [cell("task", alternative, "worker-b", { for: ["b"] })]);
      const joined = mergeHistories(left, right);
      const patterns = [
        { subject: "task", predicate: declared, object: "worker-a" },
        { predicate: alternative, object: "worker-a" },
        { object: "worker-a" },
      ];
      for (const pattern of patterns) {
        const read = historyDerivation((history) => queryHistory(history, pattern));
        const [first, next] = direction === "addition" ? [left, joined] : [joined, left];
        assert.deepEqual(read(first), queryHistory(first, pattern));
        assert.deepEqual(read(next), queryHistory(next, pattern));
      }
    });
  }
  test(`${name} predicate identity retains the narrow functional frame`, () => {
    const base = observeHistory(createHistory([declared]), [cell("task", declared, "worker-a", { for: ["a"] })]);
    let calls = 0;
    const read = historyDerivation((history) => {
      calls++;
      return queryHistory(history, { predicate: declared, object: "worker-a" });
    });
    const first = read(base);
    const next = observeHistory(base, [cell("other", alternative, "worker-b", { for: ["b"] })]);
    assert.equal(read(next), first);
    assert.equal(calls, 1);
  });
}

test("NFC predicate alternatives cross nested capture, checkpoints, restore and bounded fallback", () => {
  const base = createHistory(["é"]);
  const left = observeHistory(base, [cell("task", "é", "worker-a", { for: ["a"] })]);
  const right = observeHistory(base, [cell("task", "e\u0301", "worker-b", { for: ["b"] })]);
  const joined = mergeHistories(left, right);
  const checkpoint = checkpointHistory(joined);
  const restored = restoreHistory(JSON.parse(JSON.stringify(checkpoint)));
  let tail = joined;
  for (let index = 0; index < 260; index++) {
    tail = observeHistory(tail, [cell("other", "tick", index, { for: [index] })]);
  }
  const pattern = { subject: "task", predicate: "e\u0301", object: "worker-a" };
  for (const target of [joined, checkpoint, restored, tail]) {
    const inner = historyDerivation((history) => queryHistory(history, pattern));
    const outer = historyDerivation((history) => inner(history).map((value) => value.against));
    assert.deepEqual(outer(left), [[]]);
    const captured = captureHistoryReads(() => outer(target));
    assert.deepEqual(captured.result, [["b"]]);
    assert.deepEqual(captured.reads, [pattern]);
  }
});
