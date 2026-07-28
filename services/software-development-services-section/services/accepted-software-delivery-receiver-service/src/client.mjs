import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, resumeRmnTask, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { ACTOR, OPERATIONS, operationBytes, operationFromBytes, record } from "./a2a-executor.mjs";

function agentUrl(value) {
  const url = value ?? process.env.ACCEPTED_SOFTWARE_DELIVERY_RECEIVER_AGENT_CARD_URL;
  if (typeof url !== "string" || !url) throw new Error("ACCEPTED_SOFTWARE_DELIVERY_RECEIVER_AGENT_CARD_URL is required");
  return url;
}

async function contact(request, {
  agentCardUrl,
  send = sendRmnTask,
  resume = resumeRmnTask,
  resumeTaskId,
  onTaskObservation,
  signal,
} = {}) {
  const message = Message.toJSON({
    messageId: randomUUID(),
    contextId: "",
    taskId: "",
    role: Role.ROLE_USER,
    parts: [rmnPart(operationBytes(request))],
    metadata: {},
    extensions: [],
    referenceTaskIds: [],
  });
  const address = agentUrl(agentCardUrl);
  const transport = resumeTaskId
    ? await resume({ agentUrl: address, taskId: resumeTaskId, inputNi: request.id, requireSignature: true, onTaskObservation, signal })
    : await send({ agentUrl: address, message, requireSignature: true, onTaskObservation, signal });
  const output = extractRmnPart(a2aResultParts(transport.result));
  const response = operationFromBytes(output.bytes);
  if (response?.provider !== ACTOR || response.request !== request.id) {
    throw new Error("accepted-delivery receiver returned a foreign operation result");
  }
  return Object.freeze({
    response,
    transport: {
      inputNi: transport.inputNi,
      outputNi: transport.outputNi,
      agentCard: transport.agentCard,
      authentication: { agentCardSignatureVerified: true, required: true },
    },
  });
}

export async function solicitAcceptedSoftwareDeliveryReceiver(operation, requestCore, {
  customer,
  recordedAt = new Date().toISOString(),
  ...transportOptions
} = {}) {
  if (!OPERATIONS.includes(operation) || typeof customer !== "string" || !customer.startsWith("urn:")) {
    throw new Error("exact receiver operation and customer are required");
  }
  const request = record({
    type: "AcceptedSoftwareDeliveryReceiverSolicitation",
    provider: ACTOR,
    customer,
    operation,
    requestCore,
    recordedAt,
  });
  const contacted = await contact(request, transportOptions);
  if (contacted.response.type !== "AcceptedSoftwareDeliveryReceiverSolicitationResult") return contacted;
  return Object.freeze({ ...contacted, offer: contacted.response.offer });
}

export async function invokeAcceptedSoftwareDeliveryReceiver(operation, receiverRequest, {
  customer,
  ...transportOptions
} = {}) {
  if (!OPERATIONS.includes(operation) || typeof customer !== "string" || !customer.startsWith("urn:")) {
    throw new Error("exact receiver operation and customer are required");
  }
  const request = record({
    type: "AcceptedSoftwareDeliveryReceiverInvocation",
    provider: ACTOR,
    customer,
    operation,
    receiverRequest,
  });
  const contacted = await contact(request, transportOptions);
  if (contacted.response.type !== "AcceptedSoftwareDeliveryReceiverInvocationResult") return contacted;
  return Object.freeze({ ...contacted, result: contacted.response.result });
}
