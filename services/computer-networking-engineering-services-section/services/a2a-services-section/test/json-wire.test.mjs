import assert from "node:assert/strict";
import test from "node:test";
import { messageFromJson, messageToJson, partFromJson, partToJson, resultFromJson, taskFromJson, taskToJson } from "../scripts/json-wire.mjs";

test("Part oneofs carry text, bytes, URL and every structured JSON value", () => {
  for (const [kind, value] of [["text", ""], ["raw", "AP8="], ["url", "https://provider.example/resource"], ...[null, false, 0, "data", [], { content: { $case: "raw", value: "opaque" }, raw: "opaque" }].map((v) => ["data", v])]) {
    const wire = { [kind]: value, metadata: { economicClaim: { content: { $case: "text", value: "not a Part" } } }, filename: "fixture", mediaType: "application/octet-stream" };
    const internal = partFromJson(wire);
    assert.deepEqual(internal.content, { $case: kind, value });
    assert.deepEqual(partToJson(internal), wire);
    assert.deepEqual(partToJson(wire), wire);
  }
  assert.deepEqual(partToJson({ content: { $case: "raw", value: Uint8Array.of(0, 255) } }), { raw: "AP8=" });
  assert.deepEqual(partFromJson({ raw: "-_8" }), { content: { $case: "raw", value: "+/8=" } });
});

test("malformed or mixed Part representations are refused before transport", () => {
  for (const bad of [{}, { text: "x", raw: "eA==" }, { raw: "%%%" }, { raw: "A" }, { raw: "=" }, { raw: "AA=" }, { text: null }, { data: undefined }, { data: Infinity }, { raw: [1] }, { text: "x", metadata: [] }, { text: "x", mediaType: 1 }]) assert.throws(() => partFromJson(bad), /A2A/u);
  assert.throws(() => partFromJson({ content: { $case: "text", value: "internal" } }), /internal only/u);
  assert.throws(() => partToJson({ text: "wire", content: { $case: "text", value: "internal" } }), /cannot mix/u);
  assert.throws(() => partToJson({ content: { $case: "money", value: 1 } }), /invalid internal/u);
});

test("only protocol Part positions are converted, including Task history/status/artifacts", () => {
  const metadata = { witReceiptNi: "ni:///sha-256;fixture", authority: { content: { $case: "data", value: 1 } } };
  const message = { messageId: "m", contextId: "c", role: "ROLE_AGENT", parts: [{ content: { $case: "data", value: { raw: "do not rewrite" } }, metadata }], metadata };
  const task = { id: "t", contextId: "c", status: { state: "TASK_STATE_COMPLETED", message }, history: [message], artifacts: [{ artifactId: "a", parts: message.parts, metadata }], metadata };
  const wire = taskToJson(task);
  assert.deepEqual(wire.status.message.parts[0].data, { raw: "do not rewrite" });
  assert.equal(wire.history[0].parts[0].content, undefined);
  assert.equal(wire.artifacts[0].parts[0].content, undefined);
  assert.deepEqual(wire.metadata, metadata);
  assert.deepEqual(taskFromJson(wire), task);
  assert.deepEqual(messageFromJson(messageToJson(message)), message);
});

test("SendMessageResponse requires exactly one named result", () => {
  const message = { messageId: "m", role: "ROLE_AGENT", contextId: "c", parts: [{ text: "ok" }] };
  for (const bad of [message, {}, { message, task: {} }, { message: null }]) assert.throws(() => resultFromJson("SendMessage", bad), /A2A/u);
  assert.equal(resultFromJson("SendMessage", { message }).parts[0].content.value, "ok");
});
