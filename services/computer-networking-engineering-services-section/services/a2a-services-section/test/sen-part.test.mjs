import assert from "node:assert/strict";
import test from "node:test";
import { createA2aServer } from "../scripts/a2a-server.mjs";
import { extractSenPart, rawNi, SEN_MEDIA_TYPE, senPart, sendSenTask, userSenMessage } from "../scripts/sen-part.mjs";
import { waitForListening } from "./_test-helpers.mjs";

const bytes = Buffer.from("canonical SEN bytes", "utf8");

test("SEN part uses the canonical byte-only NI service", () => {
  const part = senPart(bytes, "claim.sen.cbor");
  assert.equal(part.mediaType, SEN_MEDIA_TYPE);
  assert.equal(part.metadata.ni, "ni:///sha-256;lQuhSYDCx63ffDqdKZuOEJ6NGcjNfbKayemcPcMPMqU");
  assert.equal(rawNi(bytes), part.metadata.ni);
  assert.deepEqual(extractSenPart([part]), { bytes, ni: part.metadata.ni, filename: "claim.sen.cbor" });
});

test("SEN part verification refuses changed bytes", () => {
  const part = senPart(bytes);
  const changed = structuredClone(part);
  changed.content.value = Buffer.from("changed", "utf8").toString("base64");
  assert.throws(() => extractSenPart([changed]), /do not match/u);
});

test("SEN part verification requires exactly one raw SEN candidate", () => {
  assert.throws(() => extractSenPart([]), /exactly one/u);
  const part = senPart(bytes);
  assert.throws(() => extractSenPart([part, part]), /exactly one/u);
});

test("rawNi refuses implicit text at the packet boundary", () => {
  assert.throws(() => rawNi("canonical SEN bytes"), /Uint8Array/u);
});

test("sendSenTask hires an unsigned A2A provider end to end", async () => {
  const { baseUrl, close } = await createA2aServer({
    agentCard: { name: "sen-echo", protocolVersion: "1.0", capabilities: {} },
    handlers: {
      "message/send": (message) => {
        const input = extractSenPart(message.parts);
        return { messageId: "reply", taskId: message.taskId, contextId: message.contextId, role: "ROLE_AGENT", parts: [senPart(input.bytes, "echo.sen.cbor")], metadata: {}, extensions: [], referenceTaskIds: [] };
      },
    },
  });
  try {
    await waitForListening(baseUrl);
    const message = userSenMessage(bytes, "claim.sen.cbor");
    const exchange = await sendSenTask({ agentUrl: baseUrl, message });
    assert.equal(exchange.outputNi, rawNi(bytes));
    assert.equal(exchange.inputNi, rawNi(bytes));
  } finally { await close(); }
});
