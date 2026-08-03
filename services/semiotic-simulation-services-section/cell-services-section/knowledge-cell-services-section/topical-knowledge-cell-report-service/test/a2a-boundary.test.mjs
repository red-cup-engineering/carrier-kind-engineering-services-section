import assert from "node:assert/strict";
import test from "node:test";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { decodeSemantic, semanticBytes } from "@red-cup-engineering/relation-model-notation-cbor-codec";
import { executeA2aMessage } from "../scripts/execute-a2a-task.mjs";
import { decodeResponse, encodeRequest } from "../src/protocol.mjs";

function message(operation, input = {}) {
  const request = encodeRequest(operation, input);
  return Message.toJSON({
    messageId: "00000000-0000-4000-8000-000000000001",
    contextId: "",
    taskId: "",
    role: Role.ROLE_USER,
    parts: [rmnPart(semanticBytes(request.term), "topical-report-service-request.rmn.cbor")],
    metadata: {},
    extensions: [],
    referenceTaskIds: [],
  });
}

function response(output) {
  const parsed = Message.fromJSON(output);
  return decodeResponse(decodeSemantic(extractRmnPart(parsed.parts).bytes));
}

test("the callable face refuses while its deployment boundary is not activated", async () => {
  const output = await executeA2aMessage(message("issue-report-quote"), async () => {
    throw new Error("report-service deployment is not activated");
  });
  const result = response(output);
  assert.equal(result.disposition, "refused");
  assert.match(result.reason, /not activated/u);
});

test("the callable face dispatches only its two owned operations", async () => {
  const output = await executeA2aMessage(message("publish-corpus"), async () => ({
    quoteProviders: {},
    quoteOptions: {},
    reportProviders: {},
    reportOptions: {},
  }));
  const result = response(output);
  assert.equal(result.disposition, "refused");
  assert.match(result.reason, /unknown report-service operation/u);
});

test("an admitted operation reaches the owned kernel and preserves its refusal", async () => {
  const output = await executeA2aMessage(message("execute-report", { type: "NotAReportRequest" }), async () => ({
    quoteProviders: {},
    quoteOptions: {},
    reportProviders: {},
    reportOptions: {},
  }));
  const result = response(output);
  assert.equal(result.disposition, "refused");
  assert.match(result.reason, /missing requestId|unexpected|wrong report request type/u);
});
