import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION, circuitInterfaceFromAgentCard } from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { decodeReviewReceipt, encodeReviewRequest } from "./protocol.mjs";

const parts = a2aResultParts;

export async function requestSemanticCandidateReview({ agentUrl, manifest, candidate, minimumReviews = 2, maximumReviews = 3, signal, send = sendRmnTask }) {
  const request = encodeReviewRequest({
    kind: "SemanticCandidateReviewRequest", manifest,
    candidate: { ...candidate, providers: candidate.providers ?? [], actions: candidate.actions ?? [], changes: candidate.changes.map((change) => ({ ...change, after: Buffer.from(change.after).toString("utf8") })) },
    minimumReviews, maximumReviews,
  });
  const term = ["ascribe", request.type, request.term], requestNi = semanticId(term);
  const message = Message.toJSON({ messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(semanticBytes(term), "semantic-candidate-review-request.rmn.cbor")], metadata: {}, extensions: [], referenceTaskIds: [] });
  const exchange = await send({ agentUrl, extensions: [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION], requireSignature: true, message, ...(signal ? { signal } : {}) });
  const output = extractRmnPart(parts(exchange.result)), response = decodeSemantic(output.bytes);
  if (!semanticBytes(response).equals(output.bytes) || response?.[0] !== "ascribe" || response.length !== 3) throw new Error("semantic reviewer returned noncanonical RMN");
  const receipt = decodeReviewReceipt(response[1], response[2]), provider = circuitInterfaceFromAgentCard(exchange.agentCard);
  if (receipt.provider !== provider.account) throw new Error("semantic review receipt does not belong to the signed contracted face");
  if (receipt.subject !== requestNi) throw new Error("semantic review receipt does not bind the exact review subject");
  return { receipt, review: receipt.review, receiptNi: semanticId(response), exchange };
}
