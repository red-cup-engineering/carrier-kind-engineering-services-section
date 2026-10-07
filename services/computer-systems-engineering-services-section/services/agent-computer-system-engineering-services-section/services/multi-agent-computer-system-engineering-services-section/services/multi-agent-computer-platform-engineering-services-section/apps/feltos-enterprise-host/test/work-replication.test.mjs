import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { moveOf, workBoard } from "@red-cup-engineering/organizing/enterprise";
import { coordinatedMovesOf, decidedMovesOf, entriesOfJournal, failuresSaid, mergeMoves, replicableMovesOf, shipWorkSince } from "../src/work-replication.mjs";

const DAY = "2026-10-03";
const at = (hhmm) => `${DAY}T${hhmm}:00Z`;

/** A board is one journal in its own root, as a settlement keeps it. */
function board() {
  const root = mkdtempSync(join(tmpdir(), "work-replication-"));
  const journal = createSemanticRecordJournal({ root, objectKind: "work-arena-move" });
  const put = (move) => {
    journal.record({ category: "move", recordedAt: move.at, record: JSON.parse(JSON.stringify(move)), told: { for: true, against: false } });
    return move;
  };
  return { root, entries: () => entriesOfJournal(journal), put, drop: () => rmSync(root, { recursive: true, force: true }) };
}

const aim = moveOf({ move: "aim", by: "enterprise:alpha", purpose: "The harbour stays navigable", at: at("09:00") });
const observe = (value, hhmm) => moveOf({ move: "observe", thread: aim.id, by: "enterprise:alpha", measure: "depth", value, evidence: [`gauge-${value}`], at: at(hhmm) });
const withdraw = moveOf({ move: "withdraw", thread: aim.id, by: "enterprise:alpha", at: at("11:00") });

const permutations = (items) => (items.length <= 1 ? [items] : items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest])));
const reading = (entries) => JSON.stringify(workBoard(entries.map(({ record }) => record), at("23:00")).threads);

test("two boards converge to the same set whatever the delivery order and duplication", () => {
  const a = board();
  const b = board();
  try {
    const told = [aim, observe(3, "09:30"), observe(4, "10:00")];
    a.put(told[0]); a.put(told[1]);
    b.put(told[2]);
    const fromA = a.entries();
    const fromB = b.entries();
    const settled = mergeMoves(mergeMoves(fromA, fromB).moves, fromB).moves; // duplication
    assert.equal(settled.length, 3);
    for (const [first, second] of permutations([fromA, fromB])) {
      const one = mergeMoves(mergeMoves([], first).moves, second).moves;
      const two = mergeMoves(mergeMoves(fromB, fromA).moves, [...second, ...first]).moves;
      assert.deepEqual(one.map((entry) => entry.id), settled.map((entry) => entry.id));
      assert.deepEqual(two.map((entry) => entry.id), settled.map((entry) => entry.id));
      assert.equal(reading(one), reading(settled));
    }
    // Each side, given the other's replicable moves one move at a time in any order, reads the same board.
    for (const order of permutations(settled)) {
      const grown = order.reduce((held, entry) => mergeMoves(held, [entry, entry]).moves, []);
      assert.deepEqual(grown.map((entry) => entry.id), settled.map((entry) => entry.id));
    }
    assert.equal(mergeMoves(settled, settled).added.length, 0);
  } finally { a.drop(); b.drop(); }
});

test("a coordinated move is selected apart and is not replicated", () => {
  const a = board();
  try {
    [aim, observe(3, "09:30"), withdraw].forEach(a.put);
    const entries = a.entries();
    assert.deepEqual(replicableMovesOf(entries).map(({ record }) => record.move), ["aim", "observe"]);
    assert.deepEqual(coordinatedMovesOf(entries).map(({ record }) => record.move), ["withdraw"]);
    const merged = mergeMoves([], entries);
    assert.equal(merged.moves.length, 2);
    assert.deepEqual(merged.coordinated.map(({ record }) => record.move), ["withdraw"]);
    // A slice that lacks the opening is still classified by the whole.
    assert.deepEqual(replicableMovesOf(entries.filter(({ record }) => record.move === "observe"), { among: entries }).length, 1);
  } finally { a.drop(); }
});

test("a move of an edition the receiver does not know is kept unread, not refused", () => {
  const a = board();
  try {
    a.put(aim);
    const [opening] = a.entries();
    const future = { id: "future-address", record: { ...observe(5, "10:30"), edition: "work-arena:edition:9999" } };
    const merged = mergeMoves([opening], [future]);
    assert.deepEqual(merged.unread, [future]);
    assert.equal(merged.refused.length, 0);
    assert.equal(merged.moves.length, 2);
    assert.equal(mergeMoves(merged.moves, [future]).unread.length, 0, "held once, then a duplicate");
    // It is not shipped on, for nothing says whether it is coordination-free.
    assert.equal(replicableMovesOf(merged.moves).includes(future), false);
  } finally { a.drop(); }
});

test("a remote move its own edition does not admit is refused", () => {
  const a = board();
  try {
    a.put(aim);
    const [opening] = a.entries();
    const bad = { id: "bad-address", record: { ...observe(5, "10:30"), evidence: [] } };
    const merged = mergeMoves([opening], [bad]);
    assert.equal(merged.refused.length, 1);
    assert.equal(merged.moves.length, 1);
  } finally { a.drop(); }
});

test("shipping tracks what the peer received, not the move's time: a move recorded late with an early time still ships, a failure is sent again", async () => {
  const a = board();
  const b = board();
  try {
    [aim, observe(3, "09:30"), observe(4, "10:00")].forEach(a.put);
    let down = true;
    const received = [];
    const shipped = new Set();
    const ship = async (entry) => {
      if (down && entry.record.value === 4) throw new Error("peer away");
      received.push(entry);
    };
    const run = async () => {
      const result = await shipWorkSince({ entries: replicableMovesOf(a.entries()), shipped, ship });
      result.shipped.forEach(({ id }) => shipped.add(id));
      return result;
    };
    const first = await run();
    assert.equal(first.shipped.length, 2);
    assert.deepEqual(first.failed.map(({ record }) => record.value), [4], "a failed move does not hold back the others");
    assert.equal(first.failed[0].why, "peer away", "a failed move keeps why it failed");
    // A move played now but dated before everything already shipped: a time cursor would have passed it.
    a.put(observe(2, "09:10"));
    down = false;
    const second = await run();
    assert.deepEqual(second.shipped.map(({ record }) => record.value).sort(), [2, 4]);
    assert.equal((await run()).shipped.length, 0, "nothing is sent twice once received");
    assert.equal(mergeMoves(b.entries(), received).moves.length, 4);
  } finally { a.drop(); b.drop(); }
});

test("the moves a node decided are the coordinated ones on threads homed there", () => {
  const a = board();
  try {
    [aim, observe(3, "09:30"), withdraw].forEach(a.put);
    const entries = a.entries();
    assert.deepEqual(decidedMovesOf(entries, { homedHere: () => true }).map(({ record }) => record.move), ["withdraw"]);
    assert.equal(decidedMovesOf(entries, { homedHere: () => false }).length, 0, "a decision received from the home is not sent back");
  } finally { a.drop(); }
});

test("undelivered moves are said by their reasons, the most frequent first", () => {
  const failed = [{ why: "401 Unauthorized" }, { why: "not at home" }, { why: "401 Unauthorized" }, {}];
  assert.equal(failuresSaid(failed), "2 × 401 Unauthorized; 1 × not at home; 1 × no reason given");
  assert.equal(failuresSaid(failed, 1), "2 × 401 Unauthorized");
});
