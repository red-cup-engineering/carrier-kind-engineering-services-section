import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { generateAgentCardSignature } from "@a2a-js/sdk";
import { agentCardSignatureEvidence } from "@red-cup-engineering/a2a-agent-card-discovery-service";
import { exportJWK } from "jose";

import { agentRmnMessage, extractRmnPart, parseA2aMessage } from "@red-cup-engineering/a2a-rmn-part-service";
import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import {
  createNotebookLmInventoryOperationObserver,
} from "@red-cup-engineering/notebooklm-services-section/a2a-deployed-provider-observation";
import { contentId, digest, PROVIDER } from "@red-cup-engineering/notebooklm-services-section/contract-notebooklm-audio-delivery";
import { bindPersistentNotebookToDeployedProvider } from "@red-cup-engineering/persistent-notebook-enterprise/provider-binding";
import { observeDeployedA2aProvider } from "../src/observe-deployed-provider.mjs";

const ORIGIN = "https://notebooklm.example.test";
const STAGING_ORIGIN = "https://candidate---notebooklm.example.test";
const CARD_URL = `${ORIGIN}/.well-known/agent-card.json`;
const JWKS_URL = `${ORIGIN}/.well-known/jwks.json`;
const OBSERVED_AT = "2026-08-16T21:00:00.000Z";
const OPERATIONS = Object.freeze(["inventory-observation", "cumulative-source-operation", "async-video-operation", "code-artifact-operation"]);
const PNE_ROOT = new URL("../../../../../../../../computer-inference-system-services-section/services/gemini-services-section/services/gemini-notebook-services-section/services/persistent-notebook-enterprise/", import.meta.url);
const historicalPolicy = JSON.parse(readFileSync(new URL("content/config/notebooklm-provider.json", PNE_ROOT), "utf8"));
const CARRIER_KIND = "rsc-quiescent.a2a-json";
const semanticBytes = (value) => identifyJsonSemanticContent({ objectKind: CARRIER_KIND, value, witnessRoot: EMPTY_WITNESS_ROOT }).bytes;
const decodeSemantic = (bytes) => admitJsonSemanticContent({ bytes, objectKind: CARRIER_KIND }).value;

function unsignedCard() {
  return {
    name: "NotebookLM composition fixture",
    description: "Exercises infrastructure, signed A2A, provider inventory, and customer binding without a cloud effect.",
    supportedInterfaces: [{ url: `${ORIGIN}/a2a/jsonrpc`, protocolBinding: "JSONRPC", tenant: "", protocolVersion: "1.0" }],
    provider: { url: "https://emsenn.net/", organization: "NotebookLM Inference Team" },
    version: "1.0.0",
    capabilities: { streaming: false, pushNotifications: false, extensions: [], extendedAgentCard: false },
    securitySchemes: {}, securityRequirements: [],
    defaultInputModes: ["application/rmn+cbor"], defaultOutputModes: ["application/rmn+cbor"],
    skills: OPERATIONS.map((id) => ({ id, name: id, description: `${id} fixture`, tags: [], examples: [], inputModes: ["application/rmn+cbor"], outputModes: ["application/rmn+cbor"], securityRequirements: [] })),
    signatures: [],
  };
}

async function signedFixture() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519"), kid = "notebooklm-composition-ed25519";
  const card = await generateAgentCardSignature(privateKey, { alg: "EdDSA", kid, typ: "JOSE", jku: JWKS_URL })(unsignedCard());
  const key = { ...(await exportJWK(publicKey)), kid, alg: "EdDSA", use: "sig" };
  return { card, jwks: { keys: [key] }, signature: agentCardSignatureEvidence(card) };
}

function json(value) { return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } }); }

function completedResult(request) {
  const sources = [{ id: "source-1", title: "One", status: "ready", type: "file", url: null }];
  const receiptBody = {
    type: "NotebookLMSourceReconciliationReceipt", provider: PROVIDER, notebookId: request.notebookId,
    requestDigest: request.providerRequestDigest, operationId: request.operationId, mode: "observe-live", policy: "observe-only", outcome: "observed",
    previousSources: sources, previousSourceIds: ["source-1"], desiredSources: [], preservedSourceIds: ["source-1"], addedSources: [],
    reusedDesiredSources: [], deletedSourceIds: [], finalSources: sources, finalSourceIds: ["source-1"], finalSourceSetDigest: digest(["source-1"]),
  };
  return { type: "NotebookLMA2AInventoryObservationResult", provider: PROVIDER, operation: request.operationId, disposition: "completed", receipt: { id: contentId(receiptBody), ...receiptBody }, code: null, externalEffects: ["external-network"] };
}

function transport(formResult = completedResult) {
  return async ({ message }) => {
    const term = decodeSemantic(extractRmnPart(parseA2aMessage(message).parts).bytes), result = formResult(term[1]);
    assert.equal(term[0], "notebooklm-inventory-observation");
    return { result: parseA2aMessage(agentRmnMessage(semanticBytes(["notebooklm-operation-result", result]), "notebooklm-operation-result.rmn.cbor")) };
  };
}

async function composition(formResult = completedResult, { transportOrigin = ORIGIN } = {}) {
  const fixture = await signedFixture();
  const policy = { ...historicalPolicy, agentCardIdentity: fixture.signature.card, agentCardSignatureIdentity: fixture.signature.signature, signingKid: fixture.signature.kid, algorithm: fixture.signature.algorithm };
  const machine = { type: "GoogleCloudRunServiceObservation", resource: "urn:561-group:cloud-run-service:notebooklm", target: { project: "example-project", region: "us-central1", service: "notebooklm" }, observedAt: "2026-08-16T20:59:00.000Z", generation: 20, revision: "notebooklm-00020-qsz", url: transportOrigin };
  const expectedMachine = transportOrigin === ORIGIN
    ? { resource: machine.resource, revision: machine.revision, generation: machine.generation, origin: ORIGIN }
    : { resource: machine.resource, revision: machine.revision, generation: machine.generation, transportOrigin };
  const expected = { machine: expectedMachine, ...(transportOrigin === ORIGIN ? {} : { declaredOrigin: ORIGIN }), provider: policy.provider, customer: policy.customer, notebookId: policy.notebookId, agentCard: { identity: fixture.signature.card, signatureIdentity: fixture.signature.signature, signingKid: fixture.signature.kid, algorithm: fixture.signature.algorithm }, operations: [...OPERATIONS], healthOperation: "inventory-observation" };
  const observed = await observeDeployedA2aProvider({ machine, expected }, {
    now: () => OBSERVED_AT,
    fetch: async (url) => new URL(String(url)).pathname === "/.well-known/agent-card.json" ? json(fixture.card) : new URL(String(url)).pathname === "/.well-known/jwks.json" ? json(fixture.jwks) : assert.fail(`unexpected URL ${url}`),
    observeOperation: createNotebookLmInventoryOperationObserver({ observedAt: OBSERVED_AT, send: transport(formResult) }),
  });
  return { observed, policy };
}

test("tagged machine transport, NotebookLM inventory health, and the PNE granted subset compose without changing provider identity", async () => {
  const { observed, policy } = await composition(completedResult, { transportOrigin: STAGING_ORIGIN });
  assert.equal(observed.type, "DeployedProviderObservation");
  assert.deepEqual(observed.operations, OPERATIONS);
  const binding = bindPersistentNotebookToDeployedProvider(observed, policy);
  assert.equal(binding.type, "PersistentNotebookProviderBinding");
  assert.equal(binding.status, "active");
  assert.deepEqual(binding.admittedOperations, ["inventory-observation", "cumulative-source-operation", "async-video-operation"]);
  assert.equal(binding.admittedOperations.includes("code-artifact-operation"), false);
  assert.equal(observed.machine.origin, STAGING_ORIGIN);
  assert.equal(observed.origin, ORIGIN);
  assert.equal(binding.origin, ORIGIN);
});

test("provider inventory refusal and a missing granted operation fail at their exact seams", async () => {
  const refused = await composition((request) => ({ type: "NotebookLMA2AInventoryObservationResult", provider: PROVIDER, operation: request.operationId, disposition: "refused", code: "provider-frozen", externalEffects: [] }));
  assert.equal(refused.observed.code, "operation-health-failed");
  const successful = await composition();
  const expandedPolicy = { ...successful.policy, admittedOperations: [...successful.policy.admittedOperations, "missing-granted-operation"] };
  assert.equal(bindPersistentNotebookToDeployedProvider(successful.observed, expandedPolicy).code, "provider-operation-drift");
});
