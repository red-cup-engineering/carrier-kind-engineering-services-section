import { resolutionCreditPolicy } from "@harmonious-union/inference-work-lot-service/consideration";
import { dispatchReviewLots as defaultDispatch } from "./market-dispatch.mjs";

function reviewSchema(testVectorIds) {
  const required = ["accepted", "reason", "missing"];
  const properties = {
    accepted: { type: "boolean" },
    reason: { type: "string", minLength: 5, maxLength: 4000 },
    missing: { type: "array", maxItems: 16, items: { type: "string", minLength: 2, maxLength: 300 } },
  };
  if (testVectorIds.length) {
    required.push("vectorVerdicts");
    properties.vectorVerdicts = {
      type: "array", minItems: testVectorIds.length, maxItems: testVectorIds.length,
      items: {
        type: "object", required: ["id", "accepted", "missing"],
        properties: {
          id: { type: "string", enum: testVectorIds },
          accepted: { type: "boolean" },
          missing: { type: "array", maxItems: 8, items: { type: "string", minLength: 2, maxLength: 300 } },
        },
        additionalProperties: false,
      },
    };
  }
  return { type: "object", required, properties, additionalProperties: false };
}

function changedSourceProjection(change) {
  const after = Buffer.from(change.after).toString("utf8");
  if (!change.before?.bytes) return { path: change.path, after, projection: "complete-after-source" };
  const before = Buffer.from(change.before.bytes).toString("utf8"), beforeLines = before.split("\n"), afterLines = after.split("\n");
  let prefix = 0;
  while (prefix < beforeLines.length && prefix < afterLines.length && beforeLines[prefix] === afterLines[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < beforeLines.length - prefix && suffix < afterLines.length - prefix
    && beforeLines[beforeLines.length - 1 - suffix] === afterLines[afterLines.length - 1 - suffix]) suffix += 1;
  const beforeStart = prefix, afterStart = prefix;
  const beforeEnd = beforeLines.length - suffix;
  const afterEnd = afterLines.length - suffix;
  return {
    path: change.path,
    projection: "exact-changed-span-with-context",
    beforeStartLine: beforeStart + 1,
    before: beforeLines.slice(beforeStart, beforeEnd).join("\n"),
    afterStartLine: afterStart + 1,
    after: afterLines.slice(afterStart, afterEnd).join("\n"),
    omittedUnchangedPrefixLines: beforeStart,
    omittedUnchangedSuffixLines: Math.min(beforeLines.length - beforeEnd, afterLines.length - afterEnd),
  };
}

export async function reviewCandidate({ manifest, candidate }, {
  dispatch = defaultDispatch,
} = {}) {
  const changed = candidate.changes.map((change) => changedSourceProjection(change));
  const testVectors = Array.isArray(manifest.testVectors) ? manifest.testVectors : [];
  const testVectorIds = testVectors.map((vector) => vector.id);
  const packet = JSON.stringify({
    objective: manifest.objective,
    constraints: manifest.constraints,
    writablePaths: manifest.writablePaths,
    testVectors,
    reviewRule: "For every test vector, identify concrete changed-source or protected executable-oracle evidence for its given/when/then behavior and every forbidden observation. A marker, test title, or comment is not evidence. Reject globally if any vector is incomplete. Do not invent a resolver, architecture artifact, or requirement absent from the stated objective, constraints, and vectors.",
    changed,
    protectedAcceptance: manifest.acceptanceCapsule ? {
      command: manifest.acceptanceCapsule.command,
      executionPassing: true,
      artifacts: manifest.acceptanceCapsule.artifacts.map((artifact) => ({ path: artifact.path, digest: artifact.digest, text: artifact.text })),
    } : null,
    actions: (candidate.actions ?? []).map((action) => ({ action: action.action, path: action.args?.path ?? null, reason: action.reason ?? null })),
    verificationPassing: true,
  });
  const authorProviders = [...new Set((candidate.providers || []).filter((provider) => typeof provider === "string" && provider))];
  const reviews = [], refusals = [], selections = [];
  const jobs = [{
      id: `${manifest.id}:semantic-advisory`,
      workType: "code-review",
      requiredCapabilities: ["code-review"],
      difficulty: Number.isFinite(manifest.difficulty) ? manifest.difficulty : 0.4,
      considerationPolicy: manifest.considerationPolicy ?? resolutionCreditPolicy(35),
      routingProfile: manifest.routingProfile ?? "bounded",
      extendedRoutingRationale: manifest.extendedRoutingRationale ?? null,
      messages: [
        { role: "system", content: "Provide advisory analysis of whether the source change satisfies the objective, constraints, and test vectors. Identify concrete evidence and missing proof channels in natural language. This opinion cannot accept or reject the candidate; only executable behavioral assays at the protected receiver boundary can do that." },
        { role: "user", content: packet },
      ],
    }];
  const records = await dispatch(jobs);
  const recordsById = new Map(records.map((record) => [record.id, record]));
  for (const job of jobs) {
    const record = recordsById.get(job.id);
    const provider = record?.provider || null;
    if (record?.procurement?.selectionRule || record?.cost) selections.push({
      provider,
      endpoint: record.endpoint || null,
      consideration: record.cost || null,
      selectionRule: record.procurement?.selectionRule || null,
      rankedFeasibleOffers: record.procurement?.rankedFeasibleOffers || [],
    });
    if (typeof record?.text === "string" && record.text) reviews.push({ provider, endpoint: record.endpoint, consideration: record.cost || null, advisory: record.text, acceptanceAuthority: false });
    else refusals.push({ id: record?.id || job.id, provider, refusal: record?.refusal || { type: "missing-advisory-carrier" }, attempts: record?.attempts || [] });
  }
  const protectedOracleWitness = manifest.acceptanceCapsule?.oracleReview?.accepted === true
    && manifest.acceptanceCapsule?.redWitness?.passed === false
    && Array.isArray(manifest.acceptanceCapsule?.artifacts)
    && manifest.acceptanceCapsule.artifacts.length > 0;
  const accepted = protectedOracleWitness;
  return {
    type: "BehavioralAssayAcceptanceWithAdvisory",
    accepted,
    requestedReviews: jobs.length,
    panelComplete: true,
    validReviews: reviews.length,
    acceptedCount: accepted ? 1 : 0,
    rejectedCount: accepted ? 0 : 1,
    acceptanceBasis: accepted ? "protected-executable-behavioral-assay" : "missing-protected-executable-behavioral-assay",
    reviews,
    authorProviders,
    marketSelections: selections,
    resourceAccount: {
      reviewLots: jobs.length,
      validIndependentReviews: 0,
      expectedConsideration: selections.map(({ provider, consideration }) => ({ provider, consideration })),
    },
    refusals,
  };
}
