import assert from "node:assert/strict";
import test from "node:test";
import { discoverAgentCard } from "@red-cup-engineering/a2a-agent-card-discovery-service";
import { startRmnProvider } from "./rmn-provider.mjs";

test("the customer test RMN provider presents a verifiable signed Agent Card", async () => {
  const stop = await startRmnProvider();
  try {
    const card = await discoverAgentCard({ agentUrl: process.env.RMN_CONFORMANCE_AGENT, requireSignature: true, signal: AbortSignal.timeout(10_000) });
    assert.equal(card.signatures.length, 1);
  } finally {
    await stop();
  }
});
