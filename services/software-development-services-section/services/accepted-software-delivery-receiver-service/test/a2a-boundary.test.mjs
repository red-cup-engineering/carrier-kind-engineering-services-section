import assert from "node:assert/strict";
import test from "node:test";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import {
  ACTOR,
  executeA2aMessage,
  operationBytes,
  operationFromBytes,
  record,
} from "../src/a2a-executor.mjs";
import {
  invokeAcceptedSoftwareDeliveryReceiver,
  solicitAcceptedSoftwareDeliveryReceiver,
} from "../src/client.mjs";
import {
  CORRECTION_STAGE_OPERATION,
  STAGE_OPERATION,
} from "../src/accepted-software-delivery-receiver.mjs";

const CUSTOMER = "urn:ame:test-receiving-settlement";
const REQUEST_CORE = { type: "StageAcceptedSoftwareDeliveryRequest" };

function messageFor(operation) {
  return Message.toJSON({
    messageId: "00000000-0000-4000-8000-000000000001",
    contextId: "",
    taskId: "",
    role: Role.ROLE_USER,
    parts: [rmnPart(operationBytes(operation))],
    metadata: {},
    extensions: [],
    referenceTaskIds: [],
  });
}

function transportResponse(input, body) {
  const response = body?.id ? body : record(body);
  return {
    result: Message.fromJSON(Message.toJSON({
      messageId: "",
      contextId: "",
      taskId: "",
      role: Role.ROLE_AGENT,
      parts: [rmnPart(operationBytes(response))],
      metadata: {},
      extensions: [],
      referenceTaskIds: [],
    })),
    inputNi: input.id,
    outputNi: response.id,
    agentCard: { name: "Accepted Software Delivery Receiver Service" },
  };
}

test("one canonical RMN solicitation returns the receiver's existing operation offer", async () => {
  const request = record({
    type: "AcceptedSoftwareDeliveryReceiverSolicitation",
    provider: ACTOR,
    customer: CUSTOMER,
    operation: STAGE_OPERATION,
    requestCore: REQUEST_CORE,
    recordedAt: "2026-07-23T00:00:00.000Z",
  });
  const output = await executeA2aMessage(messageFor(request));
  const response = operationFromBytes(extractRmnPart(Message.fromJSON(output).parts).bytes);
  assert.equal(response.type, "AcceptedSoftwareDeliveryReceiverSolicitationResult");
  assert.equal(response.offer.operation, STAGE_OPERATION);
  assert.equal(response.offer.target, CUSTOMER);
  assert.equal(response.offer.separatelyInvoked, true);
});

test("the signed client preserves the exact offer and transport receipt", async () => {
  const send = async ({ message }) => {
    const input = operationFromBytes(extractRmnPart(Message.fromJSON(message).parts).bytes);
    const local = await executeA2aMessage(message);
    const response = operationFromBytes(extractRmnPart(Message.fromJSON(local).parts).bytes);
    return transportResponse(input, response);
  };
  const contacted = await solicitAcceptedSoftwareDeliveryReceiver(STAGE_OPERATION, REQUEST_CORE, {
    customer: CUSTOMER,
    recordedAt: "2026-07-23T00:00:00.000Z",
    agentCardUrl: "https://receiver.example/.well-known/agent-card.json",
    send,
  });
  assert.equal(contacted.offer.operation, STAGE_OPERATION);
  assert.equal(contacted.transport.inputNi.startsWith("ni:///sha-256;"), true);
  assert.equal(contacted.transport.authentication.agentCardSignatureVerified, true);
});

test("one exact invocation reaches only its selected existing receiver operation", async () => {
  const receiverRequest = { type: "StageAcceptedSoftwareDeliveryCorrectionRequest" };
  let selected;
  const request = record({
    type: "AcceptedSoftwareDeliveryReceiverInvocation",
    provider: ACTOR,
    customer: CUSTOMER,
    operation: CORRECTION_STAGE_OPERATION,
    receiverRequest,
  });
  const output = await executeA2aMessage(messageFor(request), {
    correctionStage: async (received) => {
      selected = received;
      return { type: "AcceptedSoftwareDeliveryCorrectionStagingReceipt", id: "urn:sha256:test-receipt" };
    },
  });
  const response = operationFromBytes(extractRmnPart(Message.fromJSON(output).parts).bytes);
  assert.deepEqual(selected, receiverRequest);
  assert.equal(response.type, "AcceptedSoftwareDeliveryReceiverInvocationResult");
  assert.equal(response.operation, CORRECTION_STAGE_OPERATION);
  assert.equal(response.result.type, "AcceptedSoftwareDeliveryCorrectionStagingReceipt");
});

test("the invocation client carries the receiver request without local execution", async () => {
  const receiverRequest = { type: "StageAcceptedSoftwareDeliveryCorrectionRequest", receiverIdentity: ACTOR };
  const send = async ({ message }) => {
    const input = operationFromBytes(extractRmnPart(Message.fromJSON(message).parts).bytes);
    assert.deepEqual(input.receiverRequest, receiverRequest);
    return transportResponse(input, {
      type: "AcceptedSoftwareDeliveryReceiverInvocationResult",
      provider: ACTOR,
      customer: CUSTOMER,
      request: input.id,
      operation: CORRECTION_STAGE_OPERATION,
      result: { type: "AcceptedSoftwareDeliveryCorrectionStagingReceipt", id: "urn:sha256:test-receipt" },
    });
  };
  const contacted = await invokeAcceptedSoftwareDeliveryReceiver(CORRECTION_STAGE_OPERATION, receiverRequest, {
    customer: CUSTOMER,
    agentCardUrl: "https://receiver.example/.well-known/agent-card.json",
    send,
  });
  assert.equal(contacted.result.type, "AcceptedSoftwareDeliveryCorrectionStagingReceipt");
});
