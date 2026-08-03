import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { operationBytes, operationFromBytes } from "./a2a-executor.mjs";
import { ACTOR } from "./observer.mjs";
import { OPERATION_KIND, identifyJson } from "./semantic-content.mjs";

const id = (value) => identifyJson(value, OPERATION_KIND).id;
const record = (body) => Object.freeze({ id: id(body), ...body });
export async function observeRepository(request, { agentCardUrl = process.env.REPOSITORY_STATE_OBSERVATION_AGENT_CARD_URL, send = sendRmnTask, signal } = {}) {
  if (typeof agentCardUrl !== "string" || !agentCardUrl) throw new Error("REPOSITORY_STATE_OBSERVATION_AGENT_CARD_URL is required");
  const operation = record({ type: "RepositoryStateObservationOperation", provider: ACTOR, request });
  const message = Message.toJSON({ messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(operationBytes(operation))], metadata: {}, extensions: [], referenceTaskIds: [] });
  const exchange = await send({ agentUrl: agentCardUrl, message, requireSignature: true, signal });
  const parts = a2aResultParts(exchange.result);
  const response = operationFromBytes(extractRmnPart(parts).bytes);
  if (response?.type !== "RepositoryStateObservationOperationResult" || response.provider !== ACTOR || response.request !== operation.id) throw new Error("repository observer returned a foreign result");
  return Object.freeze({ ...response.observation, observationProvider: ACTOR, observationReceipt: { inputNi: exchange.inputNi, outputNi: exchange.outputNi, agentCard: exchange.agentCard } });
}
