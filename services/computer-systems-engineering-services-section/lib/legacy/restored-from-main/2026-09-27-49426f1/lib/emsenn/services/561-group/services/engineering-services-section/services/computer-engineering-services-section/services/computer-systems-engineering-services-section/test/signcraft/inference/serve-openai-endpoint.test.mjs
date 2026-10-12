import { test } from "node:test";
import assert from "node:assert/strict";
import { answerChatPacket, startServer } from "../../../scripts/signcraft-inference/serve-openai-endpoint.mjs";

const DEMAND = {
  rules: [
    { name: "law:script-no-app", if: ["is-script", "imports-app"], then: ["stratification-violation"] },
    { name: "law:violation-filed", if: ["stratification-violation"], then: ["needs-finding"] },
  ],
  facts: ["is-script", "imports-app"],
  query: "needs-finding",
};

function packet(content) {
  return { model: "predicated-inference-kernel/0.1.0", messages: [{ role: "user", content }] };
}

test("openai face: a demand round-trips to a witnessed verdict in dialect shape", () => {
  const out = answerChatPacket(packet(JSON.stringify(DEMAND)));
  assert.equal(out.object, "chat.completion");
  assert.equal(out.choices[0].finish_reason, "stop");
  const result = JSON.parse(out.choices[0].message.content);
  assert.equal(result.verdict, "potential");
  assert.ok(result.witness.some((w) => w.by === "law:violation-filed"));
  assert.ok(out.usage.total_tokens > 0);
  assert.equal(out.x_witness.verdict, "potential");
  assert.ok(out.x_witness.chainLength >= 3);
});

test("openai face: malformed demand refuses in dialect error shape, never guesses", () => {
  const out = answerChatPacket(packet("derive the thing please"));
  assert.ok(out.error);
  assert.equal(out.error.type, "invalid_request_error");
});

test("openai face: live HTTP loopback server answers a real POST", async () => {
  const { server, port } = await startServer({ port: 0 });
  try {
    const res = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(packet(JSON.stringify(DEMAND))),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const result = JSON.parse(body.choices[0].message.content);
    assert.equal(result.verdict, "potential");
    assert.ok(result.witness.length >= 3);
  } finally {
    server.close();
  }
});
