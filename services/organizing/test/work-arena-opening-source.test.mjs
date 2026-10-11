import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { createWorkArenaReader, openingOf } from "../src/enterprise/work-arena.mjs";
import { SIXTEENTH_EDITION } from "../src/enterprise/work-arena-law.mjs";

const AT = "2026-10-11T00:00:00Z";
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "arena-opening-source-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const journal = createSemanticRecordJournal({ root, objectKind: "work-arena-move" });
  const record = (move, causes = []) => {
    const receipt = journal.record({ category: "move", recordedAt: move.at, record: move, told: { for: true, against: false }, causes });
    return journal.query({ category: "move" }).find(row => row.event === receipt.events[0]);
  };
  const cause = label => createSemanticRecordJournal({ root, objectKind: "fixture-admission" })
    .record({ category: "admitted", recordedAt: AT, record: { label }, told: { for: true, against: false } }).events;
  const opening = openingOf({ move: "ask", by: "fixture:asker", question: "Which record was observed?", at: AT }, { law: SIXTEENTH_EDITION });
  return { journal, record, cause, opening };
}
const sourceOf = row => ({ id: row.id, ...(row.event === undefined ? {} : { event: row.event }) });

test("source identity is captured at accepted replay, outside normalized opening and position", t => {
  const { record, opening, cause } = fixture(t);
  const { edition: _edition, ...legacy } = opening;
  const first = record(legacy), later = record(opening, cause("later"));
  const reader = createWorkArenaReader();
  const original = reader.boardAt([first], AT), position = original.position;
  const board = reader.boardAt([first, later], AT);
  assert.deepEqual(board.threads[0].opening, opening);
  assert.equal(board.position, position);
  assert.deepEqual(reader.openingSourcesAt([first, later], AT)[opening.id], sourceOf(first));
  assert.deepEqual(reader.inspectAt([first, later], AT, opening.id).openingSource, sourceOf(first));
  assert.equal(Object.hasOwn(board.threads[0].opening, "openingSource"), false);
  assert.deepEqual(createWorkArenaReader().openingSourcesAt([first, later], AT)[opening.id], sourceOf(first));
});

test("unread and refused rows cannot become opening sources or replace an accepted source", t => {
  const { record, opening } = fixture(t);
  const unread = record({ ...opening, edition: artifactId({ future: "law" }) });
  const refused = record({ ...opening, serves: ["fixture:missing-thread"] });
  const accepted = record(opening);
  const duplicate = record({ ...opening, at: "2026-10-11T00:00:01Z" });
  const reader = createWorkArenaReader(), rows = [unread, refused, accepted, duplicate];
  const board = reader.boardAt(rows, "2026-10-11T00:01:00Z");
  assert.equal(board.unread.length, 1);
  assert.equal(board.refused.length, 1);
  assert.deepEqual(reader.openingSourcesAt(rows, "2026-10-11T00:01:00Z"), { [opening.id]: sourceOf(accepted) });
});

test("source snapshots survive appends and reset on changed raw source event or prefix", t => {
  const { record, opening, cause } = fixture(t);
  const first = record(opening), second = record(opening, cause("other witness"));
  assert.equal(first.id, second.id);
  assert.notEqual(first.event, second.event);
  const reader = createWorkArenaReader();
  const original = reader.openingSourcesAt([first], AT);
  assert.ok(Object.isFrozen(original)); assert.ok(Object.isFrozen(original[opening.id]));
  assert.deepEqual(reader.openingSourcesAt([first, second], AT)[opening.id], sourceOf(first));
  assert.deepEqual(reader.openingSourcesAt([second], AT)[opening.id], sourceOf(second));
  assert.deepEqual(original[opening.id], sourceOf(first));
  assert.deepEqual(reader.openingSourcesAt([], AT), {});
  assert.deepEqual(reader.openingSourcesAt([first], AT)[opening.id], sourceOf(first));
});

test("the accepted normalized opening can derive its thread id without losing its raw source", t => {
  const { record, opening } = fixture(t);
  const { id: _id, ...withoutId } = opening;
  const row = record(withoutId), reader = createWorkArenaReader();
  const board = reader.boardAt([row], AT);
  assert.equal(board.threads[0].opening.id, opening.id);
  assert.deepEqual(reader.openingSourcesAt([row], AT)[opening.id], sourceOf(row));
});

test("a literal legacy source without an event is replaced only on an actual prefix change", async t => {
  const { record, opening, journal } = fixture(t);
  const { id: sourceId } = record(opening);
  // Derive a second, genuine legacy feed through the existing raw SEAVT format.
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const { jsonToTerm } = await import("@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec");
  const { seavtRow } = await import("@red-cup-engineering/semiotic-eavt-services-section/admit-seavt-row");
  const root = mkdtempSync(join(tmpdir(), "arena-legacy-source-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = join(root, "data/logs/legacy"); mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "witness-journal-seavt.jsonl"), JSON.stringify(seavtRow({
    e: jsonToTerm(sourceId), a: jsonToTerm("move"), v: jsonToTerm(opening), t: AT,
  })) + "\n");
  const legacy = createSemanticRecordJournal({ root, objectKind: "work-arena-move" }).query({ category: "move" })[0];
  const modern = journal.query({ category: "move" })[0];
  assert.equal(legacy.id, modern.id);
  assert.equal(Object.hasOwn(legacy, "event"), false);
  const reader = createWorkArenaReader(), original = reader.openingSourcesAt([legacy], AT);
  assert.deepEqual(original[opening.id], { id: sourceId });
  assert.deepEqual(reader.openingSourcesAt([modern], AT)[opening.id], sourceOf(modern));
  assert.deepEqual(original[opening.id], { id: sourceId });
});
