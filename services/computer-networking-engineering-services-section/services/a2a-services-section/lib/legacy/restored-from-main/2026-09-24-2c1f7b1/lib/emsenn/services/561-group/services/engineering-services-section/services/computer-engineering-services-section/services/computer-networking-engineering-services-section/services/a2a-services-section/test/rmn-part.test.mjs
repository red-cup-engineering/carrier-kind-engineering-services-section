import assert from "node:assert/strict";
import test from "node:test";
import { createA2aServer } from "../scripts/a2a-server.mjs";
import { extractSenPart, rawNi, SEN_MEDIA_TYPE, senPart, sendSenTask, userSenMessage } from "../scripts/rmn-part.mjs";
import { waitForListening } from "./_test-helpers.mjs";

const bytes = Buffer.from("canonical RMN bytes", "utf8");

test("RMN part uses the canonical byte-only NI service", () => {
  const part = senPart(bytes, "claim.rmn.cbor");
  assert.equal(part.mediaType, SEN_MEDIA_TYPE);
  assert.equal(part.metadata.ni, "ni:///sha-256;0QTHhHsZe2J_qCcg-IDVYnICT7F24Eks97YpSJzrp3Y");
  assert.equal(rawNi(bytes), part.metadata.ni);
  assert.deepEqual(extractSenPart([part]), { bytes, ni: part.metadata.ni, filename: "claim.rmn.cbor" });
});

test("RMN part verification refuses changed bytes", () => {
  const part = senPart(bytes);
  const changed = structuredClone(part);
  changed.content.value = Buffer.from("changed", "utf8");
  assert.throws(() => extractSenPart([changed]), /do not match/u);
});

test("RMN part verification requires exactly one raw RMN candidate", () => {
  assert.throws(() => extractSenPart([]), /exactly one/u);
  const part = senPart(bytes);
  assert.throws(() => extractSenPart([part, part]), /exactly one/u);
});

test("rawNi refuses implicit text at the packet boundary", () => {
  assert.throws(() => rawNi("canonical RMN bytes"), /Uint8Array/u);
});

test("sendSenTask hires an unsigned A2A provider end to end", async () => {
  const { baseUrl, close } = await createA2aServer({
    agentCard: { name: "rmn-echo", protocolVersion: "1.0", capabilities: {} },
    handlers: {
      "message/send": (message) => {
        const input = extractSenPart(message.parts);
        return { messageId: "reply", taskId: message.taskId, contextId: message.contextId, role: "ROLE_AGENT", parts: [senPart(input.bytes, "echo.rmn.cbor")], metadata: {}, extensions: [], referenceTaskIds: [] };
      },
    },
  });
  try {
    await waitForListening(baseUrl);
    const message = userSenMessage(bytes, "claim.rmn.cbor");
    const exchange = await sendSenTask({ agentUrl: baseUrl, message });
    assert.equal(exchange.outputNi, rawNi(bytes));
    assert.equal(exchange.inputNi, rawNi(bytes));
  } finally { await close(); }
});
