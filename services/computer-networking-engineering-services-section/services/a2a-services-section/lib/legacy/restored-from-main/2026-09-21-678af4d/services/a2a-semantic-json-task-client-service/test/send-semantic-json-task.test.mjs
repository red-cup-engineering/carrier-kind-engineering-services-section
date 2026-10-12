import assert from "node:assert/strict";
import test from "node:test";

import { AgentCard, Message, TaskState } from "@a2a-js/sdk";
import { agentSemanticJsonMessage } from "@red-cup-engineering/a2a-semantic-json-part-service";
import { sendSemanticJsonTask } from "../src/send-semantic-json-task.mjs";

const card = AgentCard.fromJSON({
  name: "Semantic JSON fixture",
  description: "fixture",
  version: "1.0.0",
  protocolVersion: "1.0",
  supportedInterfaces: [{ url: "https://provider.example/a2a", protocolBinding: "JSONRPC", protocolVersion: "1.0" }],
  capabilities: { streaming: false, pushNotifications: false, extensions: [] },
  defaultInputModes: ["application/vnd.561-group.semantic-json+cbor"],
  defaultOutputModes: ["application/vnd.561-group.semantic-json+cbor"],
  skills: [],
  securitySchemes: {},
  securityRequirements: [],
  signatures: [],
  iconUrl: "",
  documentationUrl: "",
  provider: undefined,
});

test("sends and admits one exact semantic JSON request/result exchange", async () => {
  let observed;
  const result = await sendSemanticJsonTask({
    agentUrl: "https://provider.example/.well-known/agent-card.json",
    objectKind: "test.request",
    resultObjectKind: "test.result",
    value: { operation: "observe", subject: "urn:test:one" },
    discover: async () => card,
    client: {
      async sendMessage(request) {
        observed = request.message;
        assert.equal(observed.parts[0].content.$case, "raw");
        return {
          id: "task-one",
          status: {
            state: TaskState.TASK_STATE_COMPLETED,
            message: Message.fromJSON(agentSemanticJsonMessage({ objectKind: "test.result", value: { disposition: "observed" } })),
          },
          artifacts: [],
          history: [],
          metadata: {},
        };
      },
    },
  });
  assert.equal(observed.parts.length, 1);
  assert.deepEqual(result.value, { disposition: "observed" });
  assert.match(result.inputToken, /^ni:\/\/\/sha-256;/u);
  assert.match(result.outputToken, /^ni:\/\/\/sha-256;/u);
});

test("refuses provider-required extensions the caller did not support", async () => {
  const requiring = AgentCard.fromJSON({ ...AgentCard.toJSON(card), capabilities: { streaming: false, pushNotifications: false, extensions: [{ uri: "urn:test:required", required: true, description: "test", params: {} }] } });
  await assert.rejects(() => sendSemanticJsonTask({
    agentUrl: "https://provider.example/.well-known/agent-card.json",
    objectKind: "test.request",
    value: {},
    discover: async () => requiring,
    client: { sendMessage: async () => { throw new Error("must not send"); } },
  }), /unsupported extension/u);
});
