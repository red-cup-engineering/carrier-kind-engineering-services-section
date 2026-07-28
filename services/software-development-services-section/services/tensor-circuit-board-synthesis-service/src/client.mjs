import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { checkTerm, decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION, circuitInterfaceFromAgentCard } from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { decodeSynthesisReceipt, encodeSynthesisRequest } from "./synthesis.mjs";

const parts = a2aResultParts;

export async function requestTensorCircuitBoardSynthesis({ agentUrl, root, faces, signal, send = sendRmnTask }) {
  const request = encodeSynthesisRequest({ kind: "TensorCircuitBoardSynthesisRequest", root, faces });
  const term = ["ascribe", request.type, request.term];
  const message = Message.toJSON({
    messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER,
    parts: [rmnPart(semanticBytes(term), "tensor-circuit-board-synthesis-request.rmn.cbor")],
    metadata: {}, extensions: [], referenceTaskIds: [],
  });
  const exchange = await send({ agentUrl, extensions: [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION], message, requireSignature: true, ...(signal ? { signal } : {}) });
  const output = extractRmnPart(parts(exchange.result));
  const response = decodeSemantic(output.bytes);
  if (!semanticBytes(response).equals(output.bytes) || response?.[0] !== "ascribe" || response.length !== 3) throw new Error("synthesis provider returned noncanonical RMN");
  checkTerm(response[2], response[1]);
  const receipt = decodeSynthesisReceipt(response[1], response[2]);
  const provider = circuitInterfaceFromAgentCard(exchange.agentCard);
  if (receipt.provider !== provider.account) throw new Error("synthesis receipt provider does not own the signed Agent Card");
  return { receipt, receiptNi: semanticId(response), response, exchange };
}
