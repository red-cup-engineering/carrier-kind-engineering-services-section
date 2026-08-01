import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { decodeSemantic, semanticBytes } from "@red-cup-engineering/rmn-semantic-conformance";
import { circuitInterfaceFromAgentCard, SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION } from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { decodeWriteCapabilityResponse, encodeWriteCapabilityRequest } from "./protocol.mjs";
const parts = a2aResultParts;
export async function hireStandingWriteCapabilityAssay({ agentUrl, material, signal }) {
  if (typeof agentUrl !== "string" || agentUrl.length === 0) throw new TypeError("the hired write-capability assay Agent Card URL is required");
  const request = encodeWriteCapabilityRequest(material);
  const message = Message.toJSON({ messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(semanticBytes(request.term), "write-capability-request.rmn.cbor")], metadata: {}, extensions: [], referenceTaskIds: [] });
  const exchange = await sendRmnTask({ agentUrl, extensions: [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION], requireSignature: true, message, signal });
  const provider = circuitInterfaceFromAgentCard(exchange.agentCard);
  const part = extractRmnPart(parts(exchange.result)), term = decodeSemantic(part.bytes);
  if (!semanticBytes(term).equals(part.bytes)) throw new Error("write-capability assay response is not canonical typed RMN CBOR");
  const response = decodeWriteCapabilityResponse(term);
  if (response.request !== request.id) throw new Error("write-capability assay response does not close the exact material");
  if (response.disposition !== "admitted") throw new Error(response.reason ?? "write-capability assay refused");
  return Object.freeze({ observation: response.observation, request: request.id, response: part.ni, provider });
}
