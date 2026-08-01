import { createHash } from "node:crypto";
import { conformTerm as requestConformance } from "@red-cup-engineering/rmn-semantic-conformance/client";
import { assayWitTransition } from "@lenticule-science/wit-transition-assay/client";

export const rawNi = (await import("@red-cup-engineering/rmn-semantic-conformance-die/canonical-cbor")).rawNiUri;
export function textNi(value) { return rawNi(Buffer.from(value, "utf8")); }

function agentUrl() {
  if (!process.env.RMN_CONFORMANCE_AGENT) throw new Error("RMN_CONFORMANCE_AGENT must name the hired RMN provider's A2A 1.0 Agent Card");
  return process.env.RMN_CONFORMANCE_AGENT;
}
function witAgentUrl() { if (!process.env.WIT_TRANSITION_ASSAY_AGENT) throw new Error("WIT_TRANSITION_ASSAY_AGENT must name the hired WIT transition provider's signed A2A 1.0 Agent Card"); return process.env.WIT_TRANSITION_ASSAY_AGENT; }

export async function conformTerm(_actor, term, expectedType, _now) {
  const result = await requestConformance({ agentUrl: agentUrl(), term, expectedType });
  return Object.freeze({ term: result.term, canonicalBytesBase64: result.canonicalBytesBase64, conformance: result.exchange.outputNi });
}

export async function proposeEffect(actor, cell, now) {
  const response = await conformTerm(actor, ["effect", cell], ["effect"], now);
  return { cell, semanticId: response.term, evidence: cell.evidenceRoot, conformance: response.conformance };
}

export async function completeEffect(_actor, proposalCell, completionCell, evidence, _now) {
  const response = await assayWitTransition({ agentUrl: witAgentUrl(), proposalCell, completionCell, evidence });
  return { proposal: response.proposal, completion: response.completion, witness: response.witness, outcome: response.outcome, conformance: response.exchange.outputNi };
}
