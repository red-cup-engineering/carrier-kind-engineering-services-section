import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { ACTOR, observeRepositoryState } from "./observer.mjs";
import { OPERATION_KIND, identifyJson, jsonFromBytes } from "./semantic-content.mjs";

const id = (value) => identifyJson(value, OPERATION_KIND).id;
const record = (body) => Object.freeze({ id: id(body), ...body });
const exact = (value) => value?.id === id(Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => key !== "id")));
export const operationBytes = (value) => identifyJson(value, OPERATION_KIND).bytes;
export function operationFromBytes(bytes) { return jsonFromBytes(bytes, OPERATION_KIND); }
export async function executeOperation(request, options = {}) {
  if (!exact(request) || request.type !== "RepositoryStateObservationOperation" || request.provider !== ACTOR) throw new Error("exact provider-addressed canonical RMN repository observation is required");
  const result = await (options.observeRepositoryState ?? observeRepositoryState)(request.request, options.observation ?? {});
  return record({ type: "RepositoryStateObservationOperationResult", provider: ACTOR, request: request.id, observation: result });
}
export async function executeA2aMessage(source, options = {}) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("repository observer requires an A2A user Message");
  const input = extractRmnPart(message.parts), response = await executeOperation(operationFromBytes(input.bytes), options);
  return Message.toJSON({ messageId: "", contextId: message.contextId ?? "", taskId: message.taskId ?? "", role: Role.ROLE_AGENT, parts: [rmnPart(operationBytes(response))], metadata: { inputNi: input.ni, outputNi: response.id, provider: ACTOR }, extensions: [], referenceTaskIds: [] });
}
