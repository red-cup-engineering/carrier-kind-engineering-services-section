import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { ACTOR, formNotebookBindingCandidate, notebookIdentity } from "../src/notebook.mjs";
import { CHANNEL, PROVIDER, VIDEO_CAPACITY_ALLOCATION, contentId, digest, exact as exactPredicate, formVideoDemand, nextPendingLesson, providerBinding, validLesson } from "../src/operations.mjs";
import { queryJournalRecords, recordJournalRecord, semanticJson } from "../src/record-journal.mjs";

const AT = "2026-07-22T12:00:00.000Z";
function lessonProduct() {
  const bytes = Buffer.from("# Cybernetics, computation, and symbolic AI\n");
  const prompt = "Trace cybernetics into symbolic AI without inventing continuity.";
  const body = { type: "ArtificialIntelligenceLessonProductAdmission", provider: "urn:ame:artificial-intelligence-curriculum-enterprise", courseId: "history-and-frontiers-of-machine-learning", courseRevision: 1, courseDigest: `sha256:${"1".repeat(64)}`, lessonId: "cybernetics-computation-symbolic-ai", sequence: 1, title: "Cybernetics, computation, and symbolic AI", prerequisites: [], researchProduct: "urn:research:cybernetics", researchSettlementReceipt: "urn:x402:paid", researchSettlementStatus: "settled", observedThrough: "2026-07-20T00:00:00.000Z", expiresAt: "2027-07-20T00:00:00.000Z", reuseGrant: ["notebooklm-transformation", "public-youtube-release"], sourcePacket: "urn:source:cybernetics", sourceCorpusDigest: `sha256:${"2".repeat(64)}`, source: { title: "Cybernetics research packet", digest: digest(bytes), mediaType: "text/markdown", byteLength: bytes.length, bytes }, correctionIdentity: "urn:correction:cybernetics-v1", notebookPrompt: prompt, notebookPromptDigest: digest(prompt), authorityWithheld: ["youtube-channel-authority", "upload-schedule-or-publication-authority"], admittedAt: AT };
  const id = identifyJsonSemanticContent({ objectKind: "emsweb.artificial-intelligence-curriculum.record", value: semanticJson(body), witnessRoot: EMPTY_WITNESS_ROOT }).token;
  return { id, ...body };
}
function exact(body) { return { id: contentId(body), ...body }; }

test("exact() delegates to the shared content-identity primitive and preserves identity for a record carrying a nested Uint8Array", () => {
  const body = { type: "ArtificialIntelligenceLessonProductAdmission", source: { title: "situated source", bytes: Buffer.from("ai research source bytes") } };
  const record = { id: contentId(body), ...body };
  assert.equal(exactPredicate(record), true);
  assert.equal(exactPredicate({ ...record, source: { ...record.source, bytes: Buffer.from("changed bytes") } }), false);
  assert.equal(exactPredicate(null), false);
  assert.equal(exactPredicate("not-an-object"), false);
});

test("AI/ML notebook identity is bound while effects remain separately gated", () => { const identity = notebookIdentity(); assert.equal(identity.actor, ACTOR); assert.equal(identity.notebookId, "9c3eed44-7fa3-4203-8b79-e0a20b91017f"); assert.match(identity.creationReceipt, /^urn:sha256:/u); const candidate = formNotebookBindingCandidate(identity.url); assert.equal(candidate.notebookId, identity.notebookId); assert.deepEqual(candidate.authorityGranted, []); assert.throws(() => formNotebookBindingCandidate("https://example.com/notebook/67510ce7-79b3-4caa-b25c-28e0d3911b5a"), /exact NotebookLM/u); });

test("standing provider binding is exact", () => {
  const binding = providerBinding();
  assert.equal(binding.customer, ACTOR);
  assert.equal(binding.provider, PROVIDER);
  assert.equal(binding.videoCustomer, CHANNEL);
  assert.equal(binding.videoCapacityAllocation, VIDEO_CAPACITY_ALLOCATION);
});

test("the admitted curriculum product crosses the boundary as fresh path-free bytes", () => {
  const lesson = lessonProduct();
  assert.equal(validLesson(lesson, AT), true);
  assert.equal(validLesson(lesson, "2037-01-01T00:00:00.000Z"), false);
  assert.equal(Buffer.from(lesson.source.bytes).length, lesson.source.byteLength);
  assert.equal(digest(Buffer.from(lesson.source.bytes)), lesson.source.digest);
  assert.equal(Object.hasOwn(lesson.source, "path"), false);
});

test("video demand deterministically binds the curriculum, source receipt, and alternating explainer allocation", () => {
  const lesson = lessonProduct();
  const sourceBody = { type: "ArtificialIntelligenceNotebookSourceStateAdmission", notebook: `urn:emsenn:notebooklm-notebook:${notebookIdentity().notebookId}`, curriculumProduct: lesson.id, sourcePacket: lesson.sourcePacket, sourceDigest: lesson.source.digest, provider: PROVIDER, providerOperation: `urn:sha256:${"1".repeat(64)}`, providerRequestDigest: `sha256:${"2".repeat(64)}`, providerReceipt: `urn:sha256:${"3".repeat(64)}`, desiredSources: [{ title: lesson.source.title, digest: lesson.source.digest, mediaType: lesson.source.mediaType, byteLength: lesson.source.byteLength }], finalSourceIds: ["source-id"], finalSourceSetDigest: `sha256:${"4".repeat(64)}`, admittedAt: AT };
  const sourceAdmission = exact(sourceBody), demand = formVideoDemand(lesson, sourceAdmission, AT);
  assert.equal(demand.customer, CHANNEL);
  assert.equal(demand.provider, PROVIDER);
  assert.equal(demand.sourceAdmission, sourceAdmission.id);
  assert.equal(demand.providerRequest.notebookSourceReceiptId, sourceAdmission.providerReceipt);
  assert.equal(demand.providerRequest.videoFormat, "explainer");
  assert.equal(demand.providerRequest.videoCapacityAllocation, VIDEO_CAPACITY_ALLOCATION);
  assert.equal(demand.id, contentId(Object.fromEntries(Object.entries(demand).filter(([key]) => key !== "id"))));
});

test("the notebook runner advances over an ordered curriculum instead of hard-coding lesson one", () => {
  const first = lessonProduct();
  assert.equal(nextPendingLesson([first], [], AT).id, first.id);
  assert.equal(nextPendingLesson([first], [{ curriculumProduct: first.id }], AT), null);
});

test("AI notebook records remain in their explicit root and replay without journal growth", (t) => {
  const root = mkdtempSync(join(tmpdir(), "ai-notebook-journal-"));
  const foreignRoot = mkdtempSync(join(tmpdir(), "ai-notebook-foreign-journal-"));
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(foreignRoot, { recursive: true, force: true });
  });
  const category = "artificial-intelligence-notebook.test-record";
  const record = exact({ type: "ArtificialIntelligenceNotebookTestRecord", notebook: ACTOR, value: 1 });

  const first = recordJournalRecord(root, category, record, { recordedAt: AT, actor: ACTOR });
  const replay = recordJournalRecord(root, category, record, { recordedAt: AT, actor: ACTOR });

  assert.equal(first.appended, 1);
  assert.equal(replay.appended, 0);
  assert.deepEqual(queryJournalRecords(root, category), [record]);
  assert.deepEqual(queryJournalRecords(foreignRoot, category), []);
});

test("AI notebook refuses records read under a conflicting journal identity law", (t) => {
  const root = mkdtempSync(join(tmpdir(), "ai-notebook-conflict-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const category = "artificial-intelligence-notebook.test-record";
  const record = exact({ type: "ArtificialIntelligenceNotebookTestRecord", notebook: ACTOR, value: 2 });
  recordJournalRecord(root, category, record, { recordedAt: AT, actor: ACTOR });

  assert.throws(
    () => queryJournalRecords(root, category, { objectKind: "foreign.notebook.journal-record" }),
    /identity drift/u,
  );
});
