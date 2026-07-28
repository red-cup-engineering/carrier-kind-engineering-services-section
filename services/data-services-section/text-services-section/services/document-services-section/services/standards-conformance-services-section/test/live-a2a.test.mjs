import assert from "node:assert/strict";
import test from "node:test";
import { requestPhase2TerritoryScan } from "../src/client.mjs";

test("a customer hires the signed smart-account conformance die", { skip: process.env.LIVE_PHASE2_CONFORMANCE !== "1" }, async () => {
  const result = await requestPhase2TerritoryScan({
    agentUrl: "http://127.0.0.1:19835/.well-known/agent-card.json",
    relativePath: "lib/emsenn/services/561-group/services/red-cup-engineering/services/software-development-services-section/services/recursive-infomaterial-fabrication-service",
  });
  assert.equal(result.report.conforming, true);
  assert.equal(result.report.violationCount, 0);
  assert.match(result.semanticId, /^ni:\/\/\/sha-256;/u);
});
