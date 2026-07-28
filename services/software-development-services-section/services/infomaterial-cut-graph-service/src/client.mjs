import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { checkTerm, decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { circuitInterfaceFromAgentCard, SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION } from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { decodeCutGraphReceipt, encodeCutGraphRequest } from "./cut-graph.mjs";

const responseParts = a2aResultParts;

export async function deriveCutGraph({ agentUrl, circuit, components = [], assembly, coverReceipt, placements, signal, send = sendRmnTask }) {
  const request = encodeCutGraphRequest({ kind: "InfomaterialCutGraphRequest", circuit, components, assembly, coverReceipt, placements });
  const term = ["ascribe", request.type, request.term], bytes = semanticBytes(term);
  const message = Message.toJSON({ messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(bytes, "infomaterial-cut-graph-request.rmn.cbor")], metadata: {}, extensions: [], referenceTaskIds: [] });
  const exchange = await send({ agentUrl, extensions: [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION], message, requireSignature: true, ...(signal ? { signal } : {}) });
  const output = extractRmnPart(responseParts(exchange.result)), response = decodeSemantic(output.bytes);
  if (!semanticBytes(response).equals(output.bytes)) throw new Error("cut-graph provider returned noncanonical RMN CBOR");
  if (response?.[0] !== "ascribe" || response.length !== 3) throw new Error("cut-graph provider returned an untyped response");
  checkTerm(response[2], response[1]);
  const receipt = decodeCutGraphReceipt(response[1], response[2]), provider = circuitInterfaceFromAgentCard(exchange.agentCard);
  if (receipt.provider !== provider.account) throw new Error("cut-graph receipt provider does not own the signed Agent Card");
  return { receipt, receiptNi: semanticId(response), response, exchange };
}
