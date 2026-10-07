import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorkArenaReader, moveOf, operativeOf, orderOf, ordersToComplete,
  orderCompletionCodomainOf, orderCompletionIntentOf, orderCompletionOf,
  orderCompletionMovesOf, intentOfThread,
} from "../../src/enterprise/work-arena.mjs";
import { typedResultOf } from "../../src/work/schema.mjs";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { SIXTEENTH_EDITION } from "../../src/enterprise/work-arena-law.mjs";

// Controlled board, not a live appointment, demand, proof or received outcome.
const at = minute => new Date(Date.parse("2026-10-05T00:00:00Z") + minute * 60_000).toISOString();
const requirements = [{ id: "count", class: "functional", priority: "must", says: "The result shall carry a nonnegative integer count." }];
const conditions = [{ id: "typed", method: "inspection", says: "The count is a nonnegative integer.", verifies: ["count"] }];
const returns = {
  type: "object", required: ["count"], additionalProperties: false,
  properties: { count: { type: "integer", minimum: 0 } },
};
const examples = [{ says: "An empty input has no items.", input: [], output: { count: 0 } }];
const closed = { requirements, conditions, returns, examples };
const boardOf = moves => createWorkArenaReader().boardAt(moves.map((record, index) => ({ id: `fixture:${index}`, record })), at(20));

function missedOrder(closure = {}) {
  const opening = moveOf({ move: "request", by: "requester", need: "The output is a typed count.", requirements, conditions, ...closure, at: at(0) });
  const moves = [opening,
    moveOf({ move: "promise", thread: opening.id, by: "provider", at: at(1) }),
    moveOf({ move: "deliver", thread: opening.id, by: "provider", evidence: ["fixture:wrong-count"], at: at(2) }),
    moveOf({ move: "reject", thread: opening.id, by: "requester", of: "provider", unmet: ["typed"], reason: "The result has no typed count.", evidence: ["fixture:consumer-observation"], at: at(3) }),
  ];
  const board = boardOf(moves);
  assert.deepEqual(board.refused, []);
  const [entry] = ordersToComplete(board, player => player === "requester");
  assert.ok(entry);
  return { moves, entry };
}

test("a completed order carries its full result closure through replay to the next maker", () => {
  const { moves, entry } = missedOrder();
  const before = orderOf(entry.thread);
  const beforeIntent = intentOfThread(entry.thread);
  assert.ok(schemaFrom(orderCompletionCodomainOf(entry)).validate(closed));
  const completed = orderCompletionOf(closed);
  assert.deepEqual(completed, closed);
  const [refinement] = orderCompletionMovesOf([entry], () => completed);
  assert.ok(refinement, "adding only the closure changes the order and earns a refinement");
  const board = boardOf([...moves, moveOf({ ...refinement, at: at(4) })]);
  assert.deepEqual(board.refused, []);
  const thread = board.threads.find(item => item.id === entry.thread.id);
  const operative = operativeOf(thread);
  assert.deepEqual(operative.returns, returns);
  assert.deepEqual(operative.examples, examples);
  assert.notEqual(orderOf(thread), before);
  assert.equal(orderOf(thread, 0), before, "the previous delivery keeps its original contract");
  const maker = intentOfThread(thread);
  assert.notEqual(maker.id, beforeIntent.id);
  assert.equal(maker.items[0].order, orderOf(thread));
  assert.deepEqual(maker.items[0].returns, returns);
  assert.match(maker.items[0].text, /An empty input has no items/);
  assert.equal(typedResultOf(maker.items[0].returns, { kind: "skill-result", value: { count: "zero" } }).kind, "skill-error");
  assert.deepEqual(typedResultOf(maker.items[0].returns, { kind: "skill-result", value: { count: 0 } }).value.returned, { count: 0 });
  const next = { ...entry, thread, order: orderOf(thread), ordinal: 2 };
  const completionWork = orderCompletionIntentOf(next);
  assert.ok(completionWork.items[0].text.includes(JSON.stringify(returns)));
  assert.match(completionWork.items[0].text, /An empty input has no items/);
  assert.deepEqual(orderCompletionMovesOf([next], () => completed), [], "restating the exact closure earns no new work");
});

test("completion admission refuses ill-typed examples rather than erasing their contract", () => {
  assert.match(orderCompletionOf({ ...closed, examples: [{ output: { count: "zero" } }] }).refused, /outside the order's codomain/);
  assert.match(orderCompletionOf({ requirements, conditions, examples }).refused, /state returns/);
  assert.match(orderCompletionOf({ ...closed, returns: { ...returns, $id: "fixture:named" } }).refused, /anonymous/);
  assert.deepEqual(orderCompletionOf({ requirements, conditions }), { requirements, conditions });
});

test("refinement and agreed counter-offer preserve the same contract, with historical editions unchanged", () => {
  const opening = moveOf({ move: "request", by: "requester", need: "The output is a typed count.", requirements, conditions, at: at(0) });
  const refined = moveOf({ move: "refine", thread: opening.id, by: "requester", ...closed, at: at(1) });
  const counter = moveOf({ move: "counter", thread: opening.id, by: "provider", ...closed, at: at(1) });
  const agreed = moveOf({ move: "agree", thread: opening.id, by: "requester", to: "provider", at: at(2) });
  for (const moves of [[opening, refined], [opening, counter, agreed]]) {
    const board = boardOf(moves);
    assert.deepEqual(board.refused, []);
    const thread = board.threads.find(item => item.id === opening.id);
    assert.deepEqual(operativeOf(thread).returns, returns);
    assert.deepEqual(operativeOf(thread).examples, examples);
    assert.deepEqual(intentOfThread(thread).items[0].returns, returns);
  }
  const oldOpening = moveOf({ move: "request", by: "requester", need: "The output is a typed count.", ...closed, edition: SIXTEENTH_EDITION.address, at: at(0) });
  const oldRefinement = moveOf({ move: "refine", thread: oldOpening.id, by: "requester", ...closed, edition: SIXTEENTH_EDITION.address, at: at(1) });
  const oldBoard = boardOf([oldOpening, oldRefinement]);
  assert.deepEqual(oldBoard.refused, []);
  assert.equal(operativeOf(oldBoard.threads[0]).returns, undefined);
  assert.equal(operativeOf(oldBoard.threads[0]).examples, undefined);
});
