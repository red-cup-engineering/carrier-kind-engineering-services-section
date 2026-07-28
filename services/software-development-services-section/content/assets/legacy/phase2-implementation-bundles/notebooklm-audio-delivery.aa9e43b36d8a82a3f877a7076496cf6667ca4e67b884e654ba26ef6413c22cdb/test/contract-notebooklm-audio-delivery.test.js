import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { contentId, deliverNotebookLMAudio, digest, rawDigest, PROVIDER } from "../src/contract-notebooklm-audio-delivery.js";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "notebooklm-audio-delivery-"));
  const dataRoot = join(root, "data");
  const body = {
    type: "NotebookLMSourceReconciliationReceipt",
    provider: PROVIDER,
    notebookId: "notebook-1",
    outcome: "reconciled",
    finalSourceIds: ["source-1"],
    settledAt: "2026-07-19T00:00:00.000Z",
  };
  const receipt = { id: contentId(body), ...body };
  const receiptPath = join(dataRoot, "receipts", "2026", "07", "19", "receipts.jsonl");
  mkdirSync(dirname(receiptPath), { recursive: true }); writeFileSync(receiptPath, `${JSON.stringify(receipt)}\n`);
  const bytes = Buffer.concat([Buffer.from("ID3", "ascii"), Buffer.from([4, 0, 0, 0, 0, 0, 0]), Buffer.from("bounded audio")]);
  const audioPath = join(root, "artifacts", "briefing.mp3"); mkdirSync(dirname(audioPath), { recursive: true }); writeFileSync(audioPath, bytes);
  const sourcePacket = {
    type: "HarmoniousUnionArtifactSourcePacket",
    documents: [
      { name: "current-manifest.json", content: "{\"period\":\"2026-07-19\"}" },
      { name: "narrative.txt", content: "Bounded state narrative." },
    ].map((document) => ({ ...document, digest: digest(document.content) })),
  };
  const generationRequest = {
    sources: sourcePacket.documents.map((document) => ({ path: join(root, "sources", document.name), digest: rawDigest(Buffer.from(document.content)), title: document.name })),
    prompt: "Produce a source-grounded audio briefing.", artifactType: "audio", executionMode: "live",
    corpusMode: "reconciled-notebook", notebookSourceReceiptId: receipt.id,
  };
  const offer = {
    type: "Offer", actor: PROVIDER, id: `urn:sha256:${"c".repeat(64)}`,
    object: { type: "ExecutableServiceOffer", request: generationRequest, requestDigest: digest(generationRequest) },
  };
  const invocation = { type: "Accept", target: PROVIDER, id: `urn:sha256:${"e".repeat(64)}`, object: { offer } };
  const resultObject = { type: "NotebookLMServiceResult", requestDigest: offer.object.requestDigest, notebookSourceReceiptId: receipt.id, artifact: { type: "audio", path: audioPath } };
  const generationResult = { type: "Accept", actor: PROVIDER, inReplyTo: invocation.id, object: resultObject };
  generationResult.id = contentId({ actor: generationResult.actor, type: generationResult.type, inReplyTo: generationResult.inReplyTo, object: resultObject });
  const eventPath = join(dataRoot, "journals", "events", "2026", "07", "19", "events.jsonl");
  mkdirSync(dirname(eventPath), { recursive: true });
  writeFileSync(eventPath, `${JSON.stringify({ source: PROVIDER, type: "org.emsenn.notebooklm-inference-team.contract.completed", subject: invocation.id, data: { activityDigest: digest(invocation), result: generationResult.id } })}\n`);
  const request = {
    type: "NotebookLMAudioDeliveryRequest",
    sourcePacket,
    sourcePacketDigest: digest(sourcePacket),
    notebookSourceReceiptId: receipt.id,
    generationOffer: offer,
    generationInvocation: invocation,
    generationResult,
  };
  return { root, dataRoot, receipt, bytes, sourcePacket, packetDigest: digest(sourcePacket), eventPath, request, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test("returns explicit bound MP3 bytes without exposing the provider-local path", () => {
  const f = fixture();
  try {
    const result = deliverNotebookLMAudio(f.request, { providerRoot: f.root, dataRoot: f.dataRoot });
    assert.equal(result.type, "NotebookLMAudioArtifact");
    assert.equal(result.mediaType, "audio/mpeg");
    assert.equal(result.byteLength, f.bytes.length);
    assert.equal(result.audioDigest, digest(f.bytes));
    assert.deepEqual(Buffer.from(result.audioBase64, "base64"), f.bytes);
    assert.equal(result.sourcePacketDigest, f.packetDigest);
    assert.equal(result.notebookSourceReceiptId, f.receipt.id);
    assert.equal(Object.hasOwn(result, "path"), false);
    assert.equal(Object.hasOwn(result, "providerLocalPath"), false);
  } finally { f.cleanup(); }
});

test("refuses absent, foreign, or mismatched receipt and generation bindings", () => {
  const f = fixture();
  try {
    const absent = structuredClone(f.request); absent.notebookSourceReceiptId = `urn:sha256:${"b".repeat(64)}`;
    assert.equal(deliverNotebookLMAudio(absent, { providerRoot: f.root, dataRoot: f.dataRoot }).code, "provider-local-source-reconciliation-receipt-absent-or-invalid");
    const mismatch = structuredClone(f.request); mismatch.generationOffer.object.request.sources[0].digest = `sha256:${"c".repeat(64)}`;
    assert.equal(deliverNotebookLMAudio(mismatch, { providerRoot: f.root, dataRoot: f.dataRoot }).code, "generation-bindings-mismatch");
    const receiptPath = join(f.dataRoot, "receipts", "2026", "07", "19", "receipts.jsonl");
    const record = JSON.parse(readFileSync(receiptPath, "utf8")); record.provider = "urn:ame:foreign";
    writeFileSync(receiptPath, `${JSON.stringify(record)}\n`);
    assert.equal(deliverNotebookLMAudio(f.request, { providerRoot: f.root, dataRoot: f.dataRoot }).code, "provider-local-source-reconciliation-receipt-absent-or-invalid");
  } finally { f.cleanup(); }
});

test("requires the exact content-valid generation envelope and provider-local completion witness", () => {
  const f = fixture();
  try {
    const forged = structuredClone(f.request); forged.generationResult.object.artifact.path = "/etc/passwd";
    assert.equal(deliverNotebookLMAudio(forged, { providerRoot: f.root, dataRoot: f.dataRoot }).code, "generation-bindings-mismatch");
    writeFileSync(f.eventPath, "");
    assert.equal(deliverNotebookLMAudio(f.request, { providerRoot: f.root, dataRoot: f.dataRoot }).code, "generation-bindings-mismatch");
  } finally { f.cleanup(); }
});

test("refuses path escape, non-MP3 bytes, media mismatch, byte mismatch, and digest mismatch", () => {
  const f = fixture();
  try {
    const escaped = structuredClone(f.request); escaped.generationResult.object.artifact.path = "/etc/passwd";
    escaped.generationResult.id = contentId({ actor: escaped.generationResult.actor, type: escaped.generationResult.type, inReplyTo: escaped.generationResult.inReplyTo, object: escaped.generationResult.object });
    writeFileSync(f.eventPath, `${JSON.stringify({ source: PROVIDER, type: "org.emsenn.notebooklm-inference-team.contract.completed", subject: escaped.generationInvocation.id, data: { activityDigest: digest(escaped.generationInvocation), result: escaped.generationResult.id } })}\n`);
    assert.equal(deliverNotebookLMAudio(escaped, { providerRoot: f.root, dataRoot: f.dataRoot }).code, "artifact-path-absent-or-outside-provider");
    const wrongMedia = structuredClone(f.request); wrongMedia.generationResult.object.artifact.mediaType = "audio/wav";
    wrongMedia.generationResult.id = contentId({ actor: wrongMedia.generationResult.actor, type: wrongMedia.generationResult.type, inReplyTo: wrongMedia.generationResult.inReplyTo, object: wrongMedia.generationResult.object });
    writeFileSync(f.eventPath, `${JSON.stringify({ source: PROVIDER, type: "org.emsenn.notebooklm-inference-team.contract.completed", subject: wrongMedia.generationInvocation.id, data: { activityDigest: digest(wrongMedia.generationInvocation), result: wrongMedia.generationResult.id } })}\n`);
    assert.equal(deliverNotebookLMAudio(wrongMedia, { providerRoot: f.root, dataRoot: f.dataRoot }).code, "artifact-media-type-mismatch");
    const wrongLength = structuredClone(f.request); wrongLength.generationResult.object.artifact.byteLength = f.bytes.length + 1;
    wrongLength.generationResult.id = contentId({ actor: wrongLength.generationResult.actor, type: wrongLength.generationResult.type, inReplyTo: wrongLength.generationResult.inReplyTo, object: wrongLength.generationResult.object });
    writeFileSync(f.eventPath, `${JSON.stringify({ source: PROVIDER, type: "org.emsenn.notebooklm-inference-team.contract.completed", subject: wrongLength.generationInvocation.id, data: { activityDigest: digest(wrongLength.generationInvocation), result: wrongLength.generationResult.id } })}\n`);
    assert.equal(deliverNotebookLMAudio(wrongLength, { providerRoot: f.root, dataRoot: f.dataRoot }).code, "artifact-byte-length-mismatch");
    const wrongDigest = structuredClone(f.request); wrongDigest.generationResult.object.artifact.audioDigest = `sha256:${"d".repeat(64)}`;
    wrongDigest.generationResult.id = contentId({ actor: wrongDigest.generationResult.actor, type: wrongDigest.generationResult.type, inReplyTo: wrongDigest.generationResult.inReplyTo, object: wrongDigest.generationResult.object });
    writeFileSync(f.eventPath, `${JSON.stringify({ source: PROVIDER, type: "org.emsenn.notebooklm-inference-team.contract.completed", subject: wrongDigest.generationInvocation.id, data: { activityDigest: digest(wrongDigest.generationInvocation), result: wrongDigest.generationResult.id } })}\n`);
    assert.equal(deliverNotebookLMAudio(wrongDigest, { providerRoot: f.root, dataRoot: f.dataRoot }).code, "artifact-digest-mismatch");
    writeFileSync(f.request.generationResult.object.artifact.path, "not an mp3");
    const nonMp3 = structuredClone(f.request); delete nonMp3.generationResult.object.artifact.byteLength; delete nonMp3.generationResult.object.artifact.audioDigest;
    writeFileSync(f.eventPath, `${JSON.stringify({ source: PROVIDER, type: "org.emsenn.notebooklm-inference-team.contract.completed", subject: nonMp3.generationInvocation.id, data: { activityDigest: digest(nonMp3.generationInvocation), result: nonMp3.generationResult.id } })}\n`);
    assert.equal(deliverNotebookLMAudio(nonMp3, { providerRoot: f.root, dataRoot: f.dataRoot }).code, "artifact-is-not-mp3");
  } finally { f.cleanup(); }
});

test("refuses a symlinked artifact and a symlinked ancestor even when both resolve inside the provider", () => {
  const f = fixture();
  try {
    const directLink = join(f.root, "artifacts", "linked.mp3");
    symlinkSync(f.request.generationResult.object.artifact.path, directLink);
    const direct = structuredClone(f.request); direct.generationResult.object.artifact.path = directLink;
    direct.generationResult.id = contentId({ actor: direct.generationResult.actor, type: direct.generationResult.type, inReplyTo: direct.generationResult.inReplyTo, object: direct.generationResult.object });
    writeFileSync(f.eventPath, `${JSON.stringify({ source: PROVIDER, type: "org.emsenn.notebooklm-inference-team.contract.completed", subject: direct.generationInvocation.id, data: { activityDigest: digest(direct.generationInvocation), result: direct.generationResult.id } })}\n`);
    assert.equal(deliverNotebookLMAudio(direct, { providerRoot: f.root, dataRoot: f.dataRoot }).code, "artifact-path-absent-or-outside-provider");
    const realDirectory = join(f.root, "real-audio"); mkdirSync(realDirectory); const realAudio = join(realDirectory, "briefing.mp3");
    writeFileSync(realAudio, f.bytes); const linkedDirectory = join(f.root, "linked-audio"); symlinkSync(realDirectory, linkedDirectory);
    const ancestor = structuredClone(f.request); ancestor.generationResult.object.artifact.path = join(linkedDirectory, "briefing.mp3");
    ancestor.generationResult.id = contentId({ actor: ancestor.generationResult.actor, type: ancestor.generationResult.type, inReplyTo: ancestor.generationResult.inReplyTo, object: ancestor.generationResult.object });
    writeFileSync(f.eventPath, `${JSON.stringify({ source: PROVIDER, type: "org.emsenn.notebooklm-inference-team.contract.completed", subject: ancestor.generationInvocation.id, data: { activityDigest: digest(ancestor.generationInvocation), result: ancestor.generationResult.id } })}\n`);
    assert.equal(deliverNotebookLMAudio(ancestor, { providerRoot: f.root, dataRoot: f.dataRoot }).code, "artifact-path-absent-or-outside-provider");
  } finally { f.cleanup(); }
});

test("all refusal paths preserve zero external and cross-settlement effects", () => {
  const result = deliverNotebookLMAudio({ type: "wrong" });
  assert.deepEqual(result, {
    type: "NotebookLMAudioDeliveryRefusal",
    code: "invalid-request-type",
    externalNetwork: false,
    externalSpend: 0,
    customerMutation: false,
    foreignMutation: false,
  });
});
