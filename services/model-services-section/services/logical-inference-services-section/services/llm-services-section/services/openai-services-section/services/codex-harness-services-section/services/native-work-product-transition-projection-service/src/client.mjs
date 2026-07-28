// Purchase one operation from the terminal FOAM locus.
import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalRwilDocument } from "@lenticule-science/rwil-rdf-projection-service/client";
import { ACTOR } from "./projector.mjs";
import { operationBytes, operationFromBytes } from "./a2a-executor.mjs";

const id = (value) => semanticId(relationalRwilDocument(value));
const record = (body) => Object.freeze({ id: id(body), ...body });
export async function purchaseNativeWorkProductProjection(workProduct, { agentCardUrl = process.env.NATIVE_WORK_PRODUCT_TRANSITION_PROJECTION_AGENT_CARD_URL, send = sendRmnTask, signal } = {}) {
  if (typeof agentCardUrl !== "string" || !agentCardUrl) throw new Error("NATIVE_WORK_PRODUCT_TRANSITION_PROJECTION_AGENT_CARD_URL is required");
  const operation = record({ type: "NativeWorkProductTransitionProjectionOperation", provider: ACTOR, workProduct });
  const message = Message.toJSON({ messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(operationBytes(operation))], metadata: {}, extensions: [], referenceTaskIds: [] });
  const exchange = await send({ agentUrl: agentCardUrl, message, requireSignature: true, signal });
  const response = operationFromBytes(extractRmnPart(a2aResultParts(exchange.result)).bytes);
  if (response?.type !== "NativeWorkProductTransitionProjectionOperationResult" || response.provider !== ACTOR || response.request !== operation.id) throw new Error("transition projector returned a foreign result");
  return Object.freeze({ ...response.projection, projectionProvider: ACTOR, projectionReceipt: { inputNi: exchange.inputNi, outputNi: exchange.outputNi, agentCard: exchange.agentCard } });
}
