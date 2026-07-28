import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { compileBoundedInferenceIntent } from "../content/templates/bounded-inference-intent-compiler.mjs";
import { ACTOR, bidForOffer, fulfillAward, record } from "../src/supplier.mjs";

const policy = { minimumAsk: { amount: 5, unit: "q" }, capabilities: ["software-engineering", "json-schema-output"], maximumConcurrentLots: 4 };
function lot(territory) { return { type: "SoftwareDevelopmentWorkLot", id: "urn:lot:test", consumer: "urn:customer", productContract: { type: "BoundedInferenceIntentCompiler" }, ownedTargetRoots: ["src/generated-resolvers"], forbiddenRoots: ["content"], acceptanceArtifacts: [{ path: "content/oracle.mjs", digest: `sha256:${"a".repeat(64)}` }], acceptanceCommands: [{ runner: "node", argv: ["content/oracle.mjs"] }], sourceDigests: [`sha256:${"a".repeat(64)}`], resourceCeilings: { maximumFiles: 1, maximumBytes: 16384, runtimeMs: 3000 }, boardTerms: { territory, requiredCapabilities: policy.capabilities } }; }
test("template clamps expensive intents downward and rejects model selection", () => {
  const result = compileBoundedInferenceIntent({ taskType: "analysis", objective: "o", desiredUse: "d", context: { sourceDigests: ["sha256:x"] }, outputSchema: { type: "object" }, considerationPolicy: { type: "ConsiderationPolicy", acceptableAlternatives: [{ id: "credit", obligations: [{ kind: "credit", asset: "urn:credit:q", maximumAmount: 17, unit: "q", settlementAdapters: ["urn:adapter:direct"] }] }] }, maxTokens: 4000, difficulty: 0.9 });
  assert.equal(result.constraints.maxTokens, 700); assert.equal(result.constraints.difficulty, 0.45); assert.equal(result.constraints.upwardEscalationAuthorized, false);
  assert.throws(() => compileBoundedInferenceIntent({ ...result, requestedModel: "large" }), /model selection/u);
});
test("supplier bids below model route and returns only independently reviewed proposal bytes", async () => {
  const territory = mkdtempSync(join(tmpdir(), "intent-supplier-test-")), work = lot(territory), quote = { type: "ImprovementBuyerQuote", id: "urn:quote", lot: work.id, consideration: { amount: 9, unit: "q" } };
  const bid = bidForOffer({ "@context": "https://www.w3.org/ns/activitystreams", type: "Offer", object: work, attachment: [quote] }, policy); assert.equal(bid.object.estimatedInferenceCalls, 0); assert.equal(bid.object.consideration.amount, 5);
  const award = record({ "@context": "https://www.w3.org/ns/activitystreams", type: "Accept", actor: work.consumer, target: ACTOR, object: { type: "ImprovementProposalAward", bid: bid.id, lot: work.id, supplier: ACTOR, customerMutationAuthorized: false, bidSnapshot: bid } });
  const activity = await fulfillAward(award, bid, { policy, templatePath: resolve(import.meta.dirname, "../content/templates/bounded-inference-intent-compiler.mjs"), recordedAt: "2026-07-21T00:00:00.000Z", reviewProposal: async ({ candidate }) => ({ type: "ImprovementCandidateReview", actor: "urn:independent-assay", candidate: candidate.id, accepted: true }) });
  assert.equal(activity.object.type, "SoftwareChangeProposal"); assert.equal(activity.object.resources.inferenceAttempts, 0); assert.equal(activity.object.changes[0].path, "src/generated-resolvers/bounded-inference-intent-compiler.mjs"); assert.equal(activity.attachment[0].actor, "urn:independent-assay");
});
