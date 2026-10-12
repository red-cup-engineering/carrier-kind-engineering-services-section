import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { ACTOR, formNotebookBindingCandidate, notebookIdentity } from "../src/notebook.mjs";
import { contentId, exact as exactPredicate } from "../src/operations.mjs";
import { queryJournalRecords, recordJournalRecord } from "../src/record-journal.mjs";

const AT = "2026-07-22T12:00:00.000Z";
function exact(body) { return { id: contentId(body), ...body }; }

test("exact() delegates to the shared content-identity primitive and preserves identity for a record carrying a nested Uint8Array", () => {
  const body = { type: "ModernBusinessNotebookTestRecord", source: { title: "situated source", bytes: Buffer.from("business research source bytes") } };
  const record = { id: contentId(body), ...body };
  assert.equal(exactPredicate(record), true);
  assert.equal(exactPredicate({ ...record, source: { ...record.source, bytes: Buffer.from("changed bytes") } }), false);
  assert.equal(exactPredicate(null), false);
  assert.equal(exactPredicate("not-an-object"), false);
});

test("modern-business notebook identity is bound while effects remain separately gated", () => { const identity = notebookIdentity(); assert.equal(identity.actor, ACTOR); assert.equal(identity.notebookId, "763fbe07-e786-4e23-9b33-b53f05230573"); assert.match(identity.creationReceipt, /^urn:sha256:/u); const candidate = formNotebookBindingCandidate(identity.url); assert.equal(candidate.notebookId, identity.notebookId); assert.deepEqual(candidate.authorityGranted, []); assert.throws(() => formNotebookBindingCandidate("https://example.com/notebook/67510ce7-79b3-4caa-b25c-28e0d3911b5a"), /exact NotebookLM/u); });

test("business notebook records remain in their explicit root and replay without journal growth", (t) => {
  const root = mkdtempSync(join(tmpdir(), "business-notebook-journal-"));
  const foreignRoot = mkdtempSync(join(tmpdir(), "business-notebook-foreign-journal-"));
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(foreignRoot, { recursive: true, force: true });
  });
  const category = "modern-business-notebook.test-record";
  const record = exact({ type: "ModernBusinessNotebookTestRecord", notebook: ACTOR, value: 1 });

  const first = recordJournalRecord(root, category, record, { recordedAt: AT, actor: ACTOR });
  const replay = recordJournalRecord(root, category, record, { recordedAt: AT, actor: ACTOR });

  assert.equal(first.appended, 2);
  assert.equal(replay.appended, 0);
  assert.deepEqual(queryJournalRecords(root, category), [record]);
  assert.deepEqual(queryJournalRecords(foreignRoot, category), []);
});

test("business notebook refuses a conflicting record identity in its custody root", (t) => {
  const root = mkdtempSync(join(tmpdir(), "business-notebook-conflict-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const category = "modern-business-notebook.test-record";
  createSemanticRecordJournal({ root, objectKind: "foreign.notebook.journal-record" }).record({
    category,
    record: exact({ type: "ModernBusinessNotebookTestRecord", notebook: ACTOR, value: 2 }),
    recordedAt: AT,
    charge: { support: true, refutation: false },
  });

  assert.throws(() => queryJournalRecords(root, category), /identity drift/u);
});
