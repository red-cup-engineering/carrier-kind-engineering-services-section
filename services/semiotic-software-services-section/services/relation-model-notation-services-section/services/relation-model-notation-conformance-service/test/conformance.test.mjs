import assert from "node:assert/strict";
import test from "node:test";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { semanticBytes, semanticId, decodeSemantic } from "@red-cup-engineering/relation-model-notation-runtime";
import { SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION } from "@red-cup-engineering/relation-model-notation-runtime/hierarchical-circuit";
import { conformTerm } from "../src/client.mjs";
import { executeA2aMessage } from "../scripts/execute-a2a-task.mjs";

function request(term, expectedType) {
  return Message.toJSON({ messageId: "request", contextId: "context", taskId: "task", role: Role.ROLE_USER,
    parts: [rmnPart(semanticBytes(["ascribe", expectedType, term]))], metadata: {}, extensions: [], referenceTaskIds: [] });
}

test("the executor preserves the typed A2A token and conformance claims", () => {
  const output = executeA2aMessage(request(["app", ["lam", ["var", 0]], ["star"]], ["unit"]));
  const message = Message.fromJSON(output), part = extractRmnPart(message.parts);
  assert.equal(message.role, Role.ROLE_AGENT);
  assert.deepEqual(decodeSemantic(part.bytes), ["ascribe", ["unit"], ["star"]]);
  assert.equal(message.metadata.disposition, "conformant");
  assert.equal(message.metadata.requestNi, semanticId(["ascribe", ["unit"], ["app", ["lam", ["var", 0]], ["star"]]]));
  assert.equal(message.metadata.normalFormNi, semanticId(["star"]));
});

test("the remote client asks for the sovereign interface and rejects a noncanonical input", async () => {
  let call;
  const result = await conformTerm({ agentUrl: "https://example.test/.well-known/agent-card.json", term: ["app", ["lam", ["var", 0]], ["star"]], expectedType: ["unit"],
    send: async (input) => {
      call = input;
      const response = executeA2aMessage(input.message);
      return { result: { parts: Message.fromJSON(response).parts }, inputNi: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", outputNi: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" };
    } });
  assert.deepEqual(call.extensions, [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION]);
  assert.equal(call.requireSignature, true);
  assert.deepEqual(result.normalForm, ["star"]);
  assert.equal(result.term, semanticId(["app", ["lam", ["var", 0]], ["star"]]));
  await assert.rejects(() => import("@red-cup-engineering/relation-model-notation-runtime/conformance").then(({ conformCanonicalBytes }) => conformCanonicalBytes(Buffer.from([0x18, 0x00]))), /deterministic|canonical/u);
});
