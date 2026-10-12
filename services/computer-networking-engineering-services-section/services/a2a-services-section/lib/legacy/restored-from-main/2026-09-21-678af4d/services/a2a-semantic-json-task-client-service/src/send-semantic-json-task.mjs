import { AgentCard, Message, TaskState } from "@a2a-js/sdk";
import { ClientFactory, ServiceParameters, withA2AExtensions } from "@a2a-js/sdk/client";
import { discoverAgentCard, discoverSignedAgentCard } from "@red-cup-engineering/a2a-agent-card-discovery-service";
import {
  extractSemanticJsonPart,
  SEMANTIC_JSON_MEDIA_TYPE,
  userSemanticJsonMessage,
} from "@red-cup-engineering/a2a-semantic-json-part-service";

const TERMINAL = new Set([
  TaskState.TASK_STATE_COMPLETED,
  TaskState.TASK_STATE_FAILED,
  TaskState.TASK_STATE_CANCELED,
  TaskState.TASK_STATE_INPUT_REQUIRED,
  TaskState.TASK_STATE_REJECTED,
  TaskState.TASK_STATE_AUTH_REQUIRED,
]);

export function a2aResultParts(result) {
  if (Array.isArray(result?.parts)) return result.parts;
  if (Array.isArray(result?.status?.message?.parts)) return result.status.message.parts;
  if (Array.isArray(result?.artifacts)) return result.artifacts.flatMap((artifact) => artifact.parts ?? []);
  return [];
}

function requiredExtensions(card, supportedExtensions) {
  const supported = new Set(supportedExtensions);
  const required = [];
  for (const extension of card.capabilities?.extensions ?? []) {
    if (extension.required !== true) continue;
    if (typeof extension.uri !== "string" || !supported.has(extension.uri)) {
      throw new Error(`A2A provider requires an unsupported extension: ${String(extension.uri)}`);
    }
    required.push(extension.uri);
  }
  return required;
}

function refusal(result) {
  const state = result?.status?.state;
  if (state === undefined || state === TaskState.TASK_STATE_COMPLETED) return null;
  const text = a2aResultParts(result).find((part) => part?.content?.$case === "text")?.content?.value;
  return text ?? `A2A provider ended in task state ${String(state)}`;
}

export async function sendSemanticJsonTask({
  agentUrl,
  objectKind,
  value,
  resultObjectKind,
  requireSignature = true,
  supportedExtensions = [],
  signal,
  discover,
  client: suppliedClient,
  clientFactory = new ClientFactory(),
} = {}) {
  if (typeof agentUrl !== "string" || agentUrl.length === 0) throw new TypeError("agentUrl is required");
  const discoverCard = discover ?? (requireSignature ? discoverSignedAgentCard : discoverAgentCard);
  const card = await discoverCard({ agentUrl, signal });
  const cardJson = AgentCard.toJSON(card);
  const extensions = requiredExtensions(cardJson, supportedExtensions);
  const client = suppliedClient ?? await clientFactory.createFromAgentCard(card);
  const input = Message.fromJSON(userSemanticJsonMessage({ objectKind, value }));
  const inputPart = extractSemanticJsonPart(input.parts, { objectKind });
  const result = await client.sendMessage({
    message: input,
    configuration: {
      acceptedOutputModes: [SEMANTIC_JSON_MEDIA_TYPE],
      historyLength: 0,
      returnImmediately: false,
    },
  }, { signal, serviceParameters: ServiceParameters.create(withA2AExtensions(...extensions)) });
  if (typeof result?.id === "string" && !TERMINAL.has(result?.status?.state)) {
    const error = new Error(`A2A task ${result.id} remains nonterminal`);
    error.name = "A2aTaskPendingError";
    error.task = result;
    error.taskId = result.id;
    throw error;
  }
  const denied = refusal(result);
  if (denied) throw new Error(denied);
  const output = extractSemanticJsonPart(a2aResultParts(result), { objectKind: resultObjectKind ?? objectKind });
  return Object.freeze({
    result,
    value: output.value,
    inputToken: inputPart.token,
    outputToken: output.token,
    agentCard: cardJson,
    extensions: Object.freeze(extensions),
  });
}
