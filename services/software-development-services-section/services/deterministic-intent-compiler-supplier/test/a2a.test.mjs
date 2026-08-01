import assert from "node:assert/strict";
import test from "node:test";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalWitnessJournalDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { executeA2aMessage, operationBytes, operationFromBytes } from "../src/a2a-executor.mjs";
import { ACTOR, CONTEXT } from "../src/supplier.mjs";

const exact = (body) => ({ id: semanticId(relationalWitnessJournalDocument(body)), ...body });

test("the supplier admits one provider-addressed canonical RMN pulse through A2A", async () => {
  const pulse = exact({
    "@context": CONTEXT,
    type: "Create",
    actor: "urn:ame:clockkeeper",
    target: ACTOR,
    capability: "urn:capability:pulse",
    object: { type: "DeterministicIntentCompilerSupplierPulse", pulseId: "urn:pulse:test#1" },
  });
  const request = exact({
    type: "DeterministicIntentCompilerSupplierPulseRequest",
    provider: ACTOR,
    pulse,
  });
  const message = Message.toJSON({
    messageId: "pulse-1",
    contextId: "",
    taskId: "",
    role: Role.ROLE_USER,
    parts: [rmnPart(operationBytes(request))],
    metadata: {},
    extensions: [],
    referenceTaskIds: [],
  });
  const output = await executeA2aMessage(message, {
    operatePulse: async (received) => ({ type: "Accept", inReplyTo: received.id }),
  });
  const response = operationFromBytes(extractRmnPart(Message.fromJSON(output).parts).bytes);
  assert.equal(response.type, "DeterministicIntentCompilerSupplierPulseResult");
  assert.equal(response.provider, ACTOR);
  assert.equal(response.request, request.id);
  assert.equal(response.pulse, pulse.id);
  assert.deepEqual(response.result, { type: "Accept", inReplyTo: pulse.id });
});

test("the supplier refuses a request addressed to another provider", async () => {
  const pulse = exact({ type: "Create", object: { pulseId: "urn:pulse:test#2" } });
  const request = exact({
    type: "DeterministicIntentCompilerSupplierPulseRequest",
    provider: "urn:ame:foreign-supplier",
    pulse,
  });
  const message = Message.toJSON({
    messageId: "pulse-2",
    contextId: "",
    taskId: "",
    role: Role.ROLE_USER,
    parts: [rmnPart(operationBytes(request))],
    metadata: {},
    extensions: [],
    referenceTaskIds: [],
  });
  await assert.rejects(() => executeA2aMessage(message), /provider-addressed/u);
});
