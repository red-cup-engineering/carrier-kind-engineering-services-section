import test from "node:test";
import assert from "node:assert/strict";
import { fabricateProofAndAccept } from "../src/drafting.mjs";

test("independent proof excludes every writer provider and closes existing EbookEditionProof acceptance", async () => {
  let request;
  const dispatch = async (input) => { request = input; return { outcome: "candidate-pending-customer-acceptance", provider: "proofer", model: "p1", receipt: { id: "ni:///sha-256;proof" }, candidate: { method: "Independent fixture proof of exact manuscript and artifact digests.", findings: [] } }; };
  const fabrication = { type: "EbookEditionFabricationResult", status: "fabricated-awaiting-acceptance", specification: { projections: [{ configuration: { editionInputDigest: "ni:///sha-256;edition" } }] }, artifacts: { epub: { sha256: "ni:///sha-256;epub" }, screenPdf: { sha256: "ni:///sha-256;pdf" } }, pendingAcceptanceObligationIds: ["editorial-proof", "epub-conformance", "accessibility-assessment"] };
  const draft = { status: "drafted", lint: { ok: true }, chapters: [], writerProviders: ["writer"], provenance: [{ role: "writer", provider: "writer", model: "w1" }] };
  const result = await fabricateProofAndAccept({ specification: {}, source: {}, draft, customerActor: "fixture", provedAt: "2026-09-29T00:00:00Z" }, { dispatch, fabricate: async () => fabrication });
  assert.deepEqual(request.excludeProviders, ["writer"]);
  assert.equal(result.status, "editorially-accepted");
  assert.equal(result.acceptance.status, "partially-accepted");
  assert.equal(result.acceptance.proof.proofer, "proofer/p1");
});
