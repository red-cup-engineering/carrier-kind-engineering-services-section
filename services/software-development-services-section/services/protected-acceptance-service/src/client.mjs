import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { decodeSemantic, semanticBytes } from "@red-cup-engineering/rmn-semantic-conformance";
import { SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION, circuitInterfaceFromAgentCard } from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { PROTECTED_ACCEPTANCE_LAW } from "./law.mjs";
import { decodeReceipt, encodeRequest } from "./protocol.mjs";
export { acceptanceCapsuleDigest, executeAcceptanceCapsule, loadAcceptanceCapsule, materializeAcceptanceCapsule, validateAcceptanceCapsule } from "./acceptance-capsule.mjs";

const parts = a2aResultParts;
export async function prepareProtectedAcceptance(input, { agentCardUrl = process.env.PROTECTED_ACCEPTANCE_AGENT_CARD_URL, signal, send = sendRmnTask } = {}) {
  if (!agentCardUrl) throw new Error("PROTECTED_ACCEPTANCE_AGENT_CARD_URL is required");
  const request = encodeRequest({ kind: "ProtectedAcceptancePreparationRequest", input });
  const message = Message.toJSON({ messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(request.bytes, "protected-acceptance-request.rmn.cbor")], metadata: {}, extensions: [], referenceTaskIds: [] });
  const exchange = await send({ agentUrl: agentCardUrl, extensions: [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION], requireSignature: true, message, ...(signal ? { signal } : {}) });
  const output = extractRmnPart(parts(exchange.result)), term = decodeSemantic(output.bytes);
  if (!semanticBytes(term).equals(output.bytes) || term?.[0] !== "ascribe" || term.length !== 3) throw new Error("protected acceptance provider returned noncanonical RMN");
  const receipt = decodeReceipt(term[1], term[2]), provider = circuitInterfaceFromAgentCard(exchange.agentCard);
  if (provider.component.law !== PROTECTED_ACCEPTANCE_LAW.id || receipt.provider !== provider.account || receipt.subject !== request.id) throw new Error("protected acceptance receipt does not bind the contracted face and exact subject");
  return Object.freeze(receipt.capsule);
}
