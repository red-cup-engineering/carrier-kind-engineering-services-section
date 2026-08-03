import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, circuitInterfaceFromAgentCard, sendRmnTask, SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { admitNormalizedSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { decodeReviewReceipt, encodeReviewRequest, identifyReviewValue, REVIEW_RECEIPT_KIND, REVIEW_REQUEST_KIND } from "./protocol.mjs";

const parts = a2aResultParts;

export async function requestSemanticCandidateReview({ agentUrl, manifest, candidate, minimumReviews = 2, maximumReviews = 3, signal, send = sendRmnTask }) {
  const request = encodeReviewRequest({
    kind: "SemanticCandidateReviewRequest", manifest,
    candidate: { ...candidate, providers: candidate.providers ?? [], actions: candidate.actions ?? [], changes: candidate.changes.map((change) => ({ ...change, after: Buffer.from(change.after).toString("utf8") })) },
    minimumReviews, maximumReviews,
  });
  const requestIdentity = identifyReviewValue(request.value, REVIEW_REQUEST_KIND), requestNi = requestIdentity.id;
  const message = Message.toJSON({ messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(requestIdentity.bytes, "semantic-candidate-review-request.rmn.cbor")], metadata: {}, extensions: [], referenceTaskIds: [] });
  const exchange = await send({ agentUrl, extensions: [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION], requireSignature: true, message, ...(signal ? { signal } : {}) });
  const output = extractRmnPart(parts(exchange.result)), response = admitNormalizedSemanticContent(output.bytes);
  if (response.envelope.objectKind !== REVIEW_RECEIPT_KIND) throw new Error("semantic reviewer returned the wrong semantic object kind");
  const receipt = decodeReviewReceipt(response.envelope.semanticType, response.envelope.settledBody), provider = circuitInterfaceFromAgentCard(exchange.agentCard);
  if (receipt.provider !== provider.account) throw new Error("semantic review receipt does not belong to the signed contracted face");
  if (receipt.subject !== requestNi) throw new Error("semantic review receipt does not bind the exact review subject");
  return { receipt, review: receipt.review, receiptNi: response.token, exchange };
}
