import assert from "node:assert/strict";
import test from "node:test";
import { reviewCandidate } from "../src/review.mjs";

function fixedDispatch(capture = [], { refusal = null, text = "bounded advisory evidence" } = {}) {
  return async (jobs) => {
    capture.push(jobs);
    return jobs.map((job) => refusal
      ? { id: job.id, refusal, attempts: [{ outcome: "refusal" }] }
      : {
          id: job.id,
          provider: "urn:ame:advisory-provider",
          endpoint: "advisory-provider",
          cost: { amount: 1, unit: "test-resolution" },
          procurement: { selectionRule: "cheapest-feasible", rankedFeasibleOffers: [] },
          attempts: [{ provider: "urn:ame:advisory-provider", outcome: "completion" }],
          text,
        });
  };
}

function candidate(after = "export const value = true") {
  return { providers: ["urn:ame:author"], changes: [{ path: "source.mjs", after: Buffer.from(after) }], actions: [] };
}

test("semantic advice is one bounded market lot and cannot accept without the executable assay", async () => {
  const batches = [];
  const result = await reviewCandidate({
    manifest: {
      id: "urn:test:review",
      objective: "prove refusal reset",
      constraints: [],
      writablePaths: ["source.mjs"],
      routingProfile: "extended",
      extendedRoutingRationale: "The exact changed source and acceptance vectors exceed the bounded carrier.",
      testVectors: [{ id: "reset-wave", given: ["a refusal"], when: "a valid action occurs", then: ["the refusal count resets"], forbidden: ["a stale refusal count"] }],
    },
    candidate: candidate(),
  }, { dispatch: fixedDispatch(batches) });

  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 1);
  assert.equal("excludeProviders" in batches[0][0], false);
  assert.equal(result.requestedReviews, 1);
  assert.equal(result.validReviews, 1);
  assert.equal(result.accepted, false);
  assert.equal(result.acceptanceBasis, "missing-protected-executable-behavioral-assay");
});

test("the protected executable assay controls acceptance regardless of advisory provider identity", async () => {
  const result = await reviewCandidate({
    manifest: {
      id: "urn:test:assay",
      objective: "set exported value",
      constraints: [],
      writablePaths: ["source.mjs"],
      testVectors: [],
      acceptanceCapsule: {
        oracleReview: { accepted: true },
        redWitness: { passed: false },
        command: "node --test protected.test.mjs",
        artifacts: [{ path: "protected.test.mjs", digest: "sha256:x", text: "assert.equal(value,true)" }],
      },
    },
    candidate: candidate(),
  }, { dispatch: fixedDispatch([], { text: "the candidate author may also have supplied this advisory" }) });

  assert.equal(result.accepted, true);
  assert.equal(result.acceptanceBasis, "protected-executable-behavioral-assay");
});

test("semantic review carries exact changed spans instead of a whole unchanged file", async () => {
  const batches = [];
  const prefix = Array.from({ length: 300 }, (_, i) => `const prefix${i} = ${i};`).join("\n");
  const suffix = Array.from({ length: 300 }, (_, i) => `const suffix${i} = ${i};`).join("\n");
  const before = `${prefix}\nexport const value = false;\n${suffix}\n`;
  const after = `${prefix}\nexport const value = true;\n${suffix}\n`;
  await reviewCandidate({
    manifest: { id: "urn:test:compact", objective: "set exported value", constraints: [], writablePaths: ["source.mjs"], testVectors: [] },
    candidate: { providers: [], changes: [{ path: "source.mjs", before: { bytes: Buffer.from(before) }, after: Buffer.from(after) }], actions: [] },
  }, { dispatch: fixedDispatch(batches) });

  const packet = batches[0][0].messages[1].content;
  assert.match(packet, /exact-changed-span-with-context/u);
  assert.match(packet, /export const value = false/u);
  assert.match(packet, /export const value = true/u);
  assert.doesNotMatch(packet, /const prefix0/u);
  assert.doesNotMatch(packet, /const suffix299/u);
});

test("an advisory-provider refusal is retained but does not counterfeit an assay verdict", async () => {
  const result = await reviewCandidate({
    manifest: { id: "urn:test:refusal", objective: "review", constraints: [], writablePaths: ["source.mjs"], testVectors: [] },
    candidate: candidate(),
  }, { dispatch: fixedDispatch([], { refusal: { type: "selected-provider-refused" } }) });

  assert.equal(result.validReviews, 0);
  assert.equal(result.refusals.length, 1);
  assert.equal(result.accepted, false);
  assert.equal(result.acceptanceBasis, "missing-protected-executable-behavioral-assay");
});
