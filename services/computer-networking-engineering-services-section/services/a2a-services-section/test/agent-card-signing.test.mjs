import assert from "node:assert/strict";
import test from "node:test";
import { createA2aServer } from "../scripts/a2a-server.mjs";
import { discoverSignedAgentCard, ephemeralAgentCardSigning, verifyAgentCardSignature } from "../scripts/agent-card-signing.mjs";
import { waitForListening } from "./_test-helpers.mjs";

test("a signed Agent Card verifies against its own ephemeral JWKS", async () => {
  const signing = ephemeralAgentCardSigning("http://127.0.0.1:9", "fixture");
  const signed = signing.sign({ name: "signed-agent", protocolVersion: "1.0" });
  assert.equal(signed.signatures.length, 1);
  await assert.doesNotReject(() => verifyAgentCardSignature(signed, { jwks: signing.jwks }));
});

test("verification refuses a tampered card body", async () => {
  const signing = ephemeralAgentCardSigning("http://127.0.0.1:9", "fixture");
  const signed = signing.sign({ name: "signed-agent", protocolVersion: "1.0" });
  const tampered = { ...signed, name: "different-agent" };
  await assert.rejects(() => verifyAgentCardSignature(tampered, { jwks: signing.jwks }));
});

test("discoverSignedAgentCard fetches and verifies a live signed card", async () => {
  // jku is not origin-checked by discoverSignedAgentCard's caller-supplied jwks path,
  // so any placeholder origin is fine so long as the same jwks is supplied at verify time.
  const signing = ephemeralAgentCardSigning("http://placeholder", "fixture");
  const signedCard = signing.sign({ name: "signed-agent", protocolVersion: "1.0" });
  const { baseUrl, close } = await createA2aServer({ agentCard: signedCard, handlers: {} });
  try {
    await waitForListening(baseUrl);
    const card = await discoverSignedAgentCard(baseUrl, { jwks: signing.jwks });
    assert.equal(card.name, "signed-agent");
  } finally { await close(); }
});

test("discoverSignedAgentCard refuses an unsigned standard Agent Card", async () => {
  const source = { name: "unsigned", description: "test", version: "1", protocolVersion: "1.0", supportedInterfaces: [{ url: "https://agent.example/a2a/jsonrpc", protocolBinding: "JSONRPC", protocolVersion: "1.0", tenant: "" }], capabilities: {}, skills: [], securitySchemes: {}, securityRequirements: [], signatures: [] };
  const fetch = async () => new Response(JSON.stringify(source), { status: 200, headers: { "content-type": "application/json" } });
  await assert.rejects(discoverSignedAgentCard("https://agent.example", { fetch }), /exactly one valid JWS signature/u);
});
