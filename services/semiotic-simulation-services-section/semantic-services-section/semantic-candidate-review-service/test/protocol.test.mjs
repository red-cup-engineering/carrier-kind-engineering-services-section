import assert from "node:assert/strict";
import test from "node:test";
import { decodeSemantic } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeReviewReceipt, performReview } from "../src/protocol.mjs";

const request = {
  kind: "SemanticCandidateReviewRequest",
  manifest: { id: "urn:test:semantic-subject", objective: "verify exact changed behavior", constraints: [], writablePaths: ["source.mjs"], testVectors: [] },
  candidate: { providers: ["urn:ame:author"], changes: [{ path: "source.mjs", after: "export const exact = true;" }], actions: [] },
  minimumReviews: 2,
  maximumReviews: 3,
};

test("one review operation returns an attributable evidence-bound canonical receipt", async () => {
  let slot = 0; const dispatch = async (jobs) => jobs.map((job) => { const index = ++slot; return { id: job.id, provider: `urn:ame:reviewer-${index}`, endpoint: `reviewer-${index}`, attempts: [{}], text: JSON.stringify({ accepted: true, reason: "the exact changed source establishes the requested behavior", missing: [], vectorVerdicts: [] }) }; });
  const result = await performReview(request, { dispatch });
  assert.equal(result.receipt.review.accepted, true);
  assert.equal(result.receipt.review.validReviews, 3);
  assert.deepEqual(result.receipt.review.authorProviders, ["urn:ame:author"]);
  const term = decodeSemantic(result.canonicalBytes), decoded = decodeReviewReceipt(term[1], term[2]);
  assert.equal(decoded.subject, result.receipt.subject);
  assert.equal(decoded.review.accepted, true);
});

test("review ingress refuses unbounded or non-text source before buying inference", async () => {
  await assert.rejects(() => performReview({ ...request, candidate: { ...request.candidate, changes: [{ path: "source.mjs", after: "x".repeat(20_001) }] } }), /bounded text source/u);
});
