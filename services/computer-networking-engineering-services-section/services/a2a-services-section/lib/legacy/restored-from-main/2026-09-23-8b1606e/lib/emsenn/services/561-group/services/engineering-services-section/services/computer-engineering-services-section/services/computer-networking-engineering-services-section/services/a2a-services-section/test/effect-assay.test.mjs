import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { ascribedBytes, checkTerm, effectTerm, evaluate } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { extractRmnPart, rmnPart, SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION } from "../scripts/rmn-part.mjs";
import { artifactChecksum, assayWitTransition, completeEffect, proposeEffect, semanticBytesId, semanticJsonId, serveWitTransitionAssay, textNi } from "../scripts/effect-assay.mjs";

function minimalCell(overrides = {}) {
  return {
    caller: "eip155:31337:0x4444444444444444444444444444444444444444",
    provider: "eip155:31337:0x5555555555555555555555555555555555555555",
    evidenceRoot: textNi("evidence"),
    outcome: { positiveEvidence: false, negativeEvidence: false },
    measures: [],
    parent: null,
    ...overrides,
  };
}

/** Stands in for a real RMN conformance A2A provider: checks the ascribed
 * term, evaluates it, and answers with the normal form under the same
 * ascription -- exactly what relation-model-notation-conformance-service's
 * own executor does, reimplemented here so this section's tests never depend
 * on a package that itself depends back on this section. */
function conformantAnswer(message) {
  const input = extractRmnPart(message.parts);
  const request = decodeSemantic(input.bytes);
  assert.equal(request[0], "ascribe");
  const [, expectedType, term] = request;
  checkTerm(term, expectedType);
  const { normalForm } = evaluate(term, 10_000);
  checkTerm(normalForm, expectedType);
  const response = ["ascribe", expectedType, normalForm];
  return { parts: [rmnPart(semanticBytes(response), "conformant-term.rmn.cbor")] };
}

test("artifactChecksum names bytes by their sha256 hex digest", () => {
  const bytes = Buffer.from("effect-assay", "utf8");
  assert.equal(artifactChecksum(bytes), `sha256:${createHash("sha256").update(bytes).digest("hex")}`);
});

test("semanticJsonId/semanticBytesId/textNi are deterministic and object-kind-scoped", () => {
  assert.equal(textNi("FOUR-bottom"), textNi("FOUR-bottom"));
  assert.notEqual(textNi("FOUR-bottom"), textNi("FOUR-bottom", "inference-work-lot.effect-coordinate"));
  assert.match(textNi("FOUR-bottom"), /^ni:\/\/\/sha-256;/u);
  const bytes = Buffer.from("artifact bytes", "utf8");
  assert.equal(semanticBytesId("resource-brokerage.artifact", bytes), semanticBytesId("resource-brokerage.artifact", bytes));
  assert.notEqual(semanticBytesId("resource-brokerage.artifact", bytes), semanticBytesId("other.artifact", bytes));
  assert.equal(semanticJsonId("k", { a: 1 }), semanticJsonId("k", { a: 1 }));
});

test("proposeEffect hires the RMN conformance provider over rmn-part with the sovereign extension", async () => {
  process.env.RMN_CONFORMANCE_AGENT = "https://example.test/.well-known/agent.json";
  try {
    let call;
    const cell = minimalCell();
    const send = async (input) => {
      call = input;
      const answer = conformantAnswer(input.message);
      const output = extractRmnPart(answer.parts);
      return { result: answer, outputNi: output.ni };
    };
    const proposal = await proposeEffect("urn:ame:test-actor", cell, "2099-01-01T00:00:00.000Z", { send });
    assert.equal(call.agentUrl, process.env.RMN_CONFORMANCE_AGENT);
    assert.equal(call.requireSignature, true);
    assert.deepEqual(call.message.extensions, [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION]);
    assert.equal(proposal.semanticId, semanticId(effectTerm(cell)));
    assert.equal(proposal.evidence, cell.evidenceRoot);
    assert.match(proposal.conformance, /^ni:\/\/\/sha-256;/u);
  } finally { delete process.env.RMN_CONFORMANCE_AGENT; }
});

test("proposeEffect requires RMN_CONFORMANCE_AGENT to be named", async () => {
  delete process.env.RMN_CONFORMANCE_AGENT;
  await assert.rejects(() => proposeEffect("urn:ame:test-actor", minimalCell(), "2099-01-01T00:00:00.000Z", { send: async () => { throw new Error("unreachable"); } }), /RMN_CONFORMANCE_AGENT/u);
});

test("completeEffect requires WIT_TRANSITION_ASSAY_AGENT to be named before it hires the provider", async () => {
  delete process.env.WIT_TRANSITION_ASSAY_AGENT;
  await assert.rejects(() => completeEffect("urn:ame:test-actor", minimalCell(), minimalCell(), textNi("evidence"), "2099-01-01T00:00:00.000Z"), /WIT_TRANSITION_ASSAY_AGENT/u);
});

test("a served WIT transition provider witnesses one FOUR cover and refuses a double jump", async () => {
  const account = "eip155:31337:0x0aadad1c6a71d34f89dad0cb41a75603433a6071";
  const server = await serveWitTransitionAssay({ providerAccount: account });
  try {
    const evidence = textNi("evidence");
    const proposalCell = minimalCell();
    const completion = (positiveEvidence, negativeEvidence) => ({ ...proposalCell, evidenceRoot: evidence, outcome: { positiveEvidence, negativeEvidence } });
    const receipt = await assayWitTransition({ agentUrl: server.baseUrl, proposalCell, completionCell: completion(true, false), evidence });
    assert.equal(receipt.provider, account);
    assert.equal(receipt.witnessTerm.articulatedAxis, "positiveEvidence");
    await assert.rejects(() => assayWitTransition({ agentUrl: server.baseUrl, proposalCell, completionCell: completion(true, true), evidence }));
  } finally { await server.close(); }
});
