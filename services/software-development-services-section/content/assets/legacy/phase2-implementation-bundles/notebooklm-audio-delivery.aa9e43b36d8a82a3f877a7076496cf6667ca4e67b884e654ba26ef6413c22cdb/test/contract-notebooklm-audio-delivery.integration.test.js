import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { settleNotebookLMAudio } from "../src/contract-notebooklm.js";
import { contentId, digest, rawDigest, PROVIDER } from "../src/contract-notebooklm-audio-delivery.js";

function fixture() {
  const providerRoot = mkdtempSync(join(tmpdir(), "notebooklm-audio-integration-"));
  const dataRoot = join(providerRoot, "data");
  const receiptBody = {
    type: "NotebookLMSourceReconciliationReceipt",
    provider: PROVIDER,
    notebookId: "notebook-integrated",
    outcome: "reconciled",
    finalSourceIds: ["source-integrated"],
    settledAt: "2026-07-19T00:00:00.000Z",
  };
  const receipt = { id: contentId(receiptBody), ...receiptBody };
  const receiptPath = join(dataRoot, "receipts", "2026", "07", "19", "receipts.jsonl");
  mkdirSync(dirname(receiptPath), { recursive: true }); writeFileSync(receiptPath, `${JSON.stringify(receipt)}\n`);
  const audio = Buffer.concat([Buffer.from("ID3", "ascii"), Buffer.alloc(10), Buffer.from("integration audio")]);
  const audioPath = join(providerRoot, "artifacts", "generated.mp3");
  mkdirSync(dirname(audioPath), { recursive: true }); writeFileSync(audioPath, audio);
  const sourcePacket = {
    type: "HarmoniousUnionArtifactSourcePacket",
    documents: [{ name: "integrated.md", content: "Integrated source", digest: digest("Integrated source") }],
  };
  const sourcePacketDigest = digest(sourcePacket);
  const request = {
    sources: sourcePacket.documents.map((document) => ({ path: join(providerRoot, "sources", document.name), title: document.name, digest: rawDigest(Buffer.from(document.content)) })),
    prompt: "Generate the integrated audio.",
    artifactType: "audio",
    executionMode: "live",
    corpusMode: "reconciled-notebook",
    sourcePacket,
    sourcePacketDigest,
    notebookSourceReceiptId: receipt.id,
  };
  const generationOffer = {
    type: "Offer",
    actor: PROVIDER,
    object: { type: "ExecutableServiceOffer", request, requestDigest: digest(request) },
  };
  const generationInvocation = {
    type: "Accept",
    id: "urn:activity:notebooklm-audio-integration",
    actor: "urn:ame:leader-movement-team",
    target: PROVIDER,
    object: { offer: generationOffer },
  };
  const eventPath = join(dataRoot, "journals", "events", "2026", "07", "19", "events.jsonl");
  const harnessResult = { ok: true, outcome: "artifact", record: { artifact: { type: "audio", path: audioPath } } };
  const options = {
    providerRoot,
    dataRoot,
    generationOffer,
    generationInvocation,
    recordGenerationWitness: (result) => {
      const event = {
        source: PROVIDER,
        type: "org.emsenn.notebooklm-inference-team.contract.completed",
        subject: generationInvocation.id,
        data: { activityDigest: digest(generationInvocation), result: result.id },
      };
      mkdirSync(dirname(eventPath), { recursive: true });
      writeFileSync(eventPath, `${JSON.stringify(event)}\n`);
    },
  };
  return { providerRoot, dataRoot, receipt, audio, request, harnessResult, options, cleanup: () => rmSync(providerRoot, { recursive: true, force: true }) };
}

test("invoke-service audio settlement returns explicit bytes and never the provider-local path", () => {
  const f = fixture();
  try {
    const result = settleNotebookLMAudio(f.request, f.harnessResult, f.options);
    assert.equal(result.type, "NotebookLMAudioArtifact");
    assert.deepEqual(Buffer.from(result.audioBase64, "base64"), f.audio);
    assert.equal(result.audioDigest, digest(f.audio));
    assert.equal(result.byteLength, f.audio.length);
    assert.equal(result.mediaType, "audio/mpeg");
    assert.equal(result.sourcePacketDigest, f.request.sourcePacketDigest);
    assert.equal(result.notebookSourceReceiptId, f.receipt.id);
    assert.equal(Object.hasOwn(result, "path"), false);
    assert.equal(JSON.stringify(result).includes(f.harnessResult.record.artifact.path), false);
  } finally { f.cleanup(); }
});

test("invoke-service audio settlement refuses a harness binding that differs from the exact operation request", () => {
  const f = fixture();
  try {
    f.harnessResult.record.notebookSourceReceiptId = `urn:sha256:${"8".repeat(64)}`;
    const result = settleNotebookLMAudio(f.request, f.harnessResult, f.options);
    assert.equal(result.type, "NotebookLMAudioDeliveryRefusal");
    assert.equal(result.code, "generation-bindings-mismatch");
    assert.equal(Object.hasOwn(result, "path"), false);
  } finally { f.cleanup(); }
});
