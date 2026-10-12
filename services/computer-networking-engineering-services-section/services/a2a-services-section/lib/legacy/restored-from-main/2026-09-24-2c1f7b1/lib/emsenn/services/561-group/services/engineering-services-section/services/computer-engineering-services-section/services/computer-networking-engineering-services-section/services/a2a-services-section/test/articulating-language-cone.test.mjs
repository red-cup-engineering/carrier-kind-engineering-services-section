import assert from "node:assert/strict";
import test from "node:test";
import { ROLE_AGENT, ROLE_USER } from "@red-cup-engineering/a2a-services-section/a2a-client";
import { discoverSignedAgentCard, ephemeralAgentCardSigning } from "@red-cup-engineering/a2a-services-section/agent-card-signing";
import { extractSenPart, senPart } from "@red-cup-engineering/a2a-services-section/rmn-part";
import {
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
  } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime";
import {
  ARTICULATE_OPERATION,
  ARTICULATING_APEX,
  ARTICULATING_LANGUAGE_IDENTIFIERS,
  ARTICULATING_REQUEST_KIND,
  executeArticulateUtterance,
} from "../scripts/articulating-apex.mjs";
import {
  articulatingSenProtocol,
  decodeCanonicalArticulatingSen,
  encodeArticulatingRequestSen,
} from "../scripts/articulating-rmn-face.mjs";
import {
  executeArticulatingA2aMove,
  projectSignedArticulatingAgentCard,
} from "../scripts/articulating-a2a-face.mjs";
import {
  handleArticulatingMcp,
} from "@red-cup-engineering/mcp-engineering-services-section/articulating-mcp-face";

const input = Object.freeze({ tokenMark: { source: "test" }, claimMark: "alive" });

test("one apex executes the canonical Node articulation and names its Lean and Solidity readings", () => {
  const receipt = executeArticulateUtterance(input);
  assert.equal(receipt.apex, ARTICULATING_APEX);
  assert.equal(receipt.operation, ARTICULATE_OPERATION);
  assert.deepEqual(receipt.identifiers, ARTICULATING_LANGUAGE_IDENTIFIERS);
  assert.equal(receipt.identifiers.node, "@red-cup-engineering/sign-cell#articulate");
  assert.equal(receipt.identifiers.lean, "Obsmetrologia.Articulating.Cell.initial");
  assert.equal(receipt.identifiers.solidity, "ArticulationCell.seat");
  assert.equal(receipt.cell.kind, "utterance.articulation.cell");
  assert.equal(receipt.cell.potentialAperiodicArticulationCell[0].token.mark.value.source, "test");
  const [, [tokenSlot, claimSlot]] = receipt.cell.potentialAperiodicArticulationCell;
  assert.deepEqual(tokenSlot[0].mark.value, input.tokenMark);
  assert.equal(claimSlot.length, 0);
});

test("RMN face is a reversible canonical CBOR ascription of that operation", () => {
  const projected = encodeArticulatingRequestSen(input);
  const expected = identifyJsonSemanticContent({
    objectKind: ARTICULATING_REQUEST_KIND,
    value: {
      kind: ARTICULATING_REQUEST_KIND,
      operation: ARTICULATE_OPERATION,
      input,
    },
    witnessRoot: EMPTY_WITNESS_ROOT,
  });
  assert.equal(projected.mediaType, "application/sen+cbor");
  assert.equal(projected.semanticId, expected.token);
  assert.deepEqual(projected.bytes, expected.bytes);
  const decoded = decodeCanonicalArticulatingSen(projected.bytes);
  assert.equal(decoded.semanticId, projected.semanticId);
  assert.equal(decoded.request.operation, ARTICULATE_OPERATION);
  assert.deepEqual(decoded.request.input, input);
  assert.throws(() => decodeCanonicalArticulatingSen(Buffer.concat([projected.bytes, Buffer.from([0])])), /canonical|trailing bytes/u);

  const oldUntyped = identifyJsonSemanticContent({
    objectKind: ARTICULATING_REQUEST_KIND,
    value: { operation: ARTICULATE_OPERATION, input },
    witnessRoot: EMPTY_WITNESS_ROOT,
  });
  assert.throws(
    () => decodeCanonicalArticulatingSen(oldUntyped.bytes),
    new RegExp(ARTICULATING_REQUEST_KIND, "u"),
  );
});

test("MCP lists and calls the exact action apex without a resident server", async () => {
  const listed = await handleArticulatingMcp({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), [ARTICULATE_OPERATION]);
  const called = await handleArticulatingMcp({
    jsonrpc: "2.0", id: 2, method: "tools/call",
    params: { name: ARTICULATE_OPERATION, arguments: { input } },
  });
  assert.equal(called.result.isError, undefined);
  const receipt = JSON.parse(called.result.content[0].text);
  assert.equal(receipt.apex, ARTICULATING_APEX);
  assert.equal(receipt.cell.kind, "utterance.articulation.cell");
});

test("A2A executes one bounded canonical-RMN move through the sovereign operation boundary", async () => {
  const projected = encodeArticulatingRequestSen(input);
  const request = {
    messageId: "00000000-0000-4000-8000-000000000561",
    contextId: "", taskId: "", role: ROLE_USER,
    parts: [senPart(projected.bytes, "articulating-request.rmn.cbor")],
    metadata: {}, extensions: [], referenceTaskIds: [],
  };
  const response = await executeArticulatingA2aMove(request);
  assert.equal(response.role, ROLE_AGENT);
  const part = extractSenPart(response.parts);
  const receipt = articulatingSenProtocol.admitResponse(part.bytes, part.ni);
  assert.equal(receipt.disposition, "accepted");
  assert.equal(receipt.result.apex, ARTICULATING_APEX);
  assert.equal(receipt.result.operation, ARTICULATE_OPERATION);
});

test("A2A discovery projects one independently verifiable signed Agent Card", async () => {
  const baseUrl = "https://articulating.actions.561.group";
  const signing = ephemeralAgentCardSigning(baseUrl, "articulating-test");
  const projection = await projectSignedArticulatingAgentCard({ baseUrl, signing });
  assert.equal(projection.card.skills[0].id, ARTICULATE_OPERATION);
  assert.equal(projection.card.signatures.length, 1);
  const fetch = async (url) => {
    if (String(url) === `${baseUrl}/.well-known/agent.json`) return new Response(JSON.stringify(projection.card));
    if (String(url) === `${baseUrl}/.well-known/jwks.json`) return new Response(JSON.stringify(projection.jwks));
    return new Response("missing", { status: 404 });
  };
  const discovered = await discoverSignedAgentCard(baseUrl, { fetch });
  assert.equal(discovered.skills[0].id, ARTICULATE_OPERATION);
});

test("the operation boundary refuses displacement and unbounded matter", () => {
  assert.throws(() => executeArticulateUtterance({ ...input, apex: "urn:wrong" }), /different apex/u);
  assert.throws(() => executeArticulateUtterance({ tokenMark: "x".repeat(70_000), claimMark: "y" }), /exceeds/u);
});
