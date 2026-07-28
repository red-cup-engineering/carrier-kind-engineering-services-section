import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION, circuitInterfaceFromAgentCard } from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { ACCEPTANCE_ORACLE_ASSAY_LAW } from "./law.mjs";
import { decodeReceipt, encodeRequest } from "./protocol.mjs";
export const ACCEPTANCE_ORACLE_ASSAY_AGENT_CARD_URL = process.env.ACCEPTANCE_ORACLE_ASSAY_AGENT_CARD_URL
  ?? "https://bare-cedar-fog.561.group/a2a/acceptance-oracle-assay/.well-known/agent-card.json";
export async function requestAcceptanceOracleAssay({ agentUrl = ACCEPTANCE_ORACLE_ASSAY_AGENT_CARD_URL, manifest, oracle, signal, send = sendRmnTask }) {
  if (typeof agentUrl !== "string" || !/^https?:\/\//u.test(agentUrl)) throw new Error("acceptance-oracle assay requires one absolute A2A Agent Card URL");
  const request = encodeRequest({ kind: "AcceptanceOracleAssayRequest", manifest, oracle }), term = ["ascribe", request.type, request.term], subject = semanticId(term);
  const message = Message.toJSON({ messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(semanticBytes(term), "acceptance-oracle-assay-request.rmn.cbor")], metadata: {}, extensions: [], referenceTaskIds: [] });
  const exchange = await send({ agentUrl, extensions: [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION], requireSignature: true, message, ...(signal ? { signal } : {}) });
  const output = extractRmnPart(a2aResultParts(exchange.result)), response = decodeSemantic(output.bytes);
  if (!semanticBytes(response).equals(output.bytes) || response?.[0] !== "ascribe" || response.length !== 3) throw new Error("oracle assay returned noncanonical RMN");
  const receipt = decodeReceipt(response[1], response[2]), provider = circuitInterfaceFromAgentCard(exchange.agentCard);
  if (provider.component.law !== ACCEPTANCE_ORACLE_ASSAY_LAW.id || receipt.provider !== provider.account || receipt.subject !== subject) throw new Error("oracle assay receipt does not bind the contracted face and exact subject");
  return { receipt, assay: receipt.assay, receiptNi: semanticId(response), exchange };
}
