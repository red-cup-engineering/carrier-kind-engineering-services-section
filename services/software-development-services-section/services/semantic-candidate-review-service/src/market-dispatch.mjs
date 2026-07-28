import { requestInferenceWorkLot } from "@harmonious-union/inference-work-lot-service/client";

const ACTOR = "urn:ame:semantic-candidate-review-service";

function marketUrl(value) {
  const source = value ?? process.env.INFERENCE_WORK_LOT_AGENT_CARD_URL;
  if (typeof source !== "string" || !/^https?:\/\//u.test(source)) throw new Error("INFERENCE_WORK_LOT_AGENT_CARD_URL is required");
  return source;
}

export async function dispatchReviewLots(jobs, { marketAgentUrl, signal, contract = requestInferenceWorkLot } = {}) {
  if (!Array.isArray(jobs) || jobs.length < 1) throw new Error("semantic review requires at least one review lot");
  return Promise.all(jobs.map(async (job) => {
  const request = {
    objective: `Analyze the observable behavior and evidence of software candidate ${job.id}`,
    context: JSON.stringify({ messages: job.messages, boundary: "Return one advisory review; do not claim customer acceptance." }),
    desiredUse: "Supply advisory analysis to a customer-owned behavioral assay; provider identity is provenance, not proof.",
    workType: "code-review",
    requiredCapabilities: job.requiredCapabilities ?? ["code-review"],
    difficulty: job.difficulty,
    considerationPolicy: job.considerationPolicy,
    routingProfile: job.routingProfile ?? "bounded",
    extendedRoutingRationale: job.extendedRoutingRationale ?? null,
    customer: ACTOR,
    workLotId: job.id.startsWith("urn:") ? job.id : `urn:semantic-review:${encodeURIComponent(job.id)}`,
    mode: "live",
  };
  const exchange = await contract({ agentUrl: marketUrl(marketAgentUrl), request, signal });
  const result = exchange.result;
  if (!["candidate-pending-customer-acceptance", "candidate-pending-codex-acceptance"].includes(result.outcome)) {
    return { id: job.id, provider: result.provider ?? null, text: "", attempts: result.settlementResidues ?? [], refusal: { type: result.disposition ?? result.outcome, residue: result }, procurement: { market: exchange.provider.account, result: exchange.resultNi } };
  }
  return {
    id: job.id,
    provider: result.provider,
    endpoint: result.provider,
    cost: result.consideration,
    text: typeof result.candidate === "string" ? result.candidate : JSON.stringify(result.candidate),
    attempts: [{ provider: result.provider, outcome: "completion" }],
    procurement: { market: exchange.provider.account, result: exchange.resultNi, selectionRule: result.selectionRule, rankedFeasibleOffers: result.rankedFeasibleOffers ?? [], settlement: result.evidence?.settlement, schemaAssay: result.evidence?.schemaAssay },
  };
  }));
}
