import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { ACTOR, settle } from "./service.mjs";
import { OPERATION_KIND, admit, identify } from "./semantic-content.mjs";

const OPERATIONS = new Set(["solicit-service", "invoke-service", "renew-schedule", "retire-schedule"]);
function rmnId(value) { return identify(value, OPERATION_KIND).id; }
function record(body) { return Object.freeze({ id: rmnId(body), ...body }); }
function exact(value) { return value?.id === rmnId(Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => key !== "id"))); }
export function operationBytes(value) { return identify(value, OPERATION_KIND).bytes; }
export function operationFromBytes(bytes) { return admit(bytes, OPERATION_KIND); }

export async function executeOperation(request, options = {}) {
  if (!exact(request) || request.type !== "ClockkeeperOperationRequest" || request.provider !== ACTOR || !OPERATIONS.has(request.operation) || typeof request.at !== "string" || !Number.isFinite(Date.parse(request.at)) || !request.activity) throw new Error("exact provider-addressed Clockkeeper operation request required");
  const authenticatedCustomer = options.authenticatedCustomer ?? process.env.A2A_BEARER_USER;
  if (typeof authenticatedCustomer !== "string" || !authenticatedCustomer || request.activity.actor !== authenticatedCustomer) throw new Error("Clockkeeper requires the authenticated customer to match the activity actor");
  const now = (options.now ?? (() => new Date()))();
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error("Clockkeeper provider clock returned an invalid instant");
  const result = await (options.settle ?? settle)(request.activity, request.operation, now.toISOString(), options.service ?? {});
  return record({ type: "ClockkeeperOperationResult", provider: ACTOR, request: request.id, operation: request.operation, result });
}

export async function executeA2aMessage(source, options = {}) {
  const message = Message.fromJSON(source); if (message.role !== Role.ROLE_USER) throw new Error("Clockkeeper requires an A2A user Message");
  const input = extractRmnPart(message.parts), response = await executeOperation(operationFromBytes(input.bytes), options);
  return Message.toJSON({ messageId: "", contextId: message.contextId ?? "", taskId: message.taskId ?? "", role: Role.ROLE_AGENT, parts: [rmnPart(operationBytes(response))], metadata: { inputNi: input.ni, outputNi: response.id, provider: ACTOR }, extensions: [], referenceTaskIds: [] });
}
