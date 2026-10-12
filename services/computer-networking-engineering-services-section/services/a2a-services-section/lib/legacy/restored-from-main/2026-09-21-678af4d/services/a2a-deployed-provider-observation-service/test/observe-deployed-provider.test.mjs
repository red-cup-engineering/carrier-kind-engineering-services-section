import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";

import { generateAgentCardSignature } from "@a2a-js/sdk";
import { agentCardSignatureEvidence } from "@red-cup-engineering/a2a-agent-card-discovery-service";
import { canonicalDeploymentRecord, identifyDeploymentRecord } from "@red-cup-engineering/deployment-formation-contracts/canonical-record";
import { exportJWK } from "jose";

import { observeDeployedA2aProvider } from "../src/observe-deployed-provider.mjs";

const ORIGIN = "https://provider.example.test";
const TRANSPORT_ORIGIN = "https://candidate---provider.example.test";
const CARD_URL = `${ORIGIN}/.well-known/agent-card.json`;
const JWKS_URL = `${ORIGIN}/.well-known/jwks.json`;
const PROVIDER = "urn:ame:provider";
const CUSTOMER = "urn:ame:customer";
const NOTEBOOK = "notebook-1";
const OPERATIONS = Object.freeze(["observe-inventory", "observe-health"]);
const NOW = "2026-08-16T19:00:00.000Z";

function unsignedCard(origin = ORIGIN, operations = OPERATIONS) {
  return {
    name: "Deployed provider fixture",
    description: "A hermetic signed provider fixture.",
    supportedInterfaces: [{ url: `${origin}/a2a/jsonrpc`, protocolBinding: "JSONRPC", tenant: "", protocolVersion: "1.0" }],
    provider: { url: "https://example.test/", organization: "Fixture provider" },
    version: "1.0.0",
    capabilities: { streaming: false, pushNotifications: false, extensions: [], extendedAgentCard: false },
    securitySchemes: {}, securityRequirements: [],
    defaultInputModes: ["application/rmn+cbor"], defaultOutputModes: ["application/rmn+cbor"],
    skills: operations.map((id) => ({ id, name: id, description: `${id} fixture`, tags: [], examples: [], inputModes: ["application/rmn+cbor"], outputModes: ["application/rmn+cbor"], securityRequirements: [] })),
    signatures: [],
  };
}

async function signedFixture({ interfaceOrigin = ORIGIN, operations = OPERATIONS } = {}) {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519"), kid = "provider-fixture-ed25519";
  const card = await generateAgentCardSignature(privateKey, { alg: "EdDSA", kid, typ: "JOSE", jku: JWKS_URL })(unsignedCard(interfaceOrigin, operations));
  const key = { ...(await exportJWK(publicKey)), kid, alg: "EdDSA", use: "sig" };
  return { card, jwks: { keys: [key] }, signature: agentCardSignatureEvidence(card) };
}

function machine(overrides = {}) {
  return {
    type: "GoogleCloudRunServiceObservation",
    resource: "urn:machine:cloud-run:provider",
    target: { project: "example-project", region: "us-central1", service: "provider" },
    observedAt: "2026-08-16T18:55:00.000Z",
    generation: 7,
    url: ORIGIN,
    revision: "provider-00007-abc",
    ...overrides,
  };
}

function expected(signature, overrides = {}) {
  const value = {
    machine: { resource: "urn:machine:cloud-run:provider", revision: "provider-00007-abc", generation: 7, origin: ORIGIN },
    provider: PROVIDER,
    customer: CUSTOMER,
    notebookId: NOTEBOOK,
    agentCard: { identity: signature.card, signatureIdentity: signature.signature, signingKid: signature.kid, algorithm: signature.algorithm },
    operations: [...OPERATIONS],
    healthOperation: OPERATIONS[0],
  };
  const expectedMachine = { ...value.machine, ...(overrides.machine ?? {}) };
  if (Object.hasOwn(overrides.machine ?? {}, "transportOrigin")) delete expectedMachine.origin;
  return { ...value, ...overrides, machine: expectedMachine, agentCard: { ...value.agentCard, ...(overrides.agentCard ?? {}) } };
}

function response(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

function effects(fixture, overrides = {}) {
  return {
    now: () => NOW,
    fetch: async (url) => {
      if (String(url) === CARD_URL) return response(fixture.card);
      if (String(url) === JWKS_URL) return response(fixture.jwks);
      throw new Error(`unexpected URL ${url}`);
    },
    observeOperation: async ({ operation, provider, customer, notebookId }) => {
      const body = { type: "A2AProviderOperationObservation", status: "passed", operation, provider, customer, notebookId };
      return { id: identifyDeploymentRecord(body), ...body };
    },
    ...overrides,
  };
}

test("an exact signed endpoint, complete operation set, and selected safe probe form one machine-bound observation", async () => {
  const fixture = await signedFixture();
  const result = await observeDeployedA2aProvider({ machine: machine(), expected: expected(fixture.signature) }, effects(fixture));
  assert.equal(result.type, "DeployedProviderObservation");
  assert.equal(result.status, "healthy");
  assert.equal(result.machine.revision, "provider-00007-abc");
  assert.equal(result.machine.generation, 7);
  assert.equal(result.origin, ORIGIN);
  assert.equal(result.agentCard.url, CARD_URL);
  assert.deepEqual(result.operations, OPERATIONS);
  assert.deepEqual(result.health.map(({ name, status }) => ({ name, status })), [
    { name: "agent-card", status: "passed" },
    { name: "a2a-operation", status: "passed" },
  ]);
  const { id, ...body } = result;
  assert.equal(id, identifyDeploymentRecord(body));
});

test("a tagged staged revision routes card, JWKS, and health transport without changing the signed declared origin", async () => {
  const fixture = await signedFixture();
  const reads = [];
  let operationAgentUrl;
  const result = await observeDeployedA2aProvider({
    machine: machine({ url: TRANSPORT_ORIGIN }),
    expected: expected(fixture.signature, { machine: { origin: undefined, transportOrigin: TRANSPORT_ORIGIN }, declaredOrigin: ORIGIN }),
  }, effects(fixture, {
    fetch: async (url) => {
      reads.push(String(url));
      const parsed = new URL(String(url));
      assert.equal(parsed.origin, TRANSPORT_ORIGIN);
      if (parsed.pathname === "/.well-known/agent-card.json") return response(fixture.card);
      if (parsed.pathname === "/.well-known/jwks.json") return response(fixture.jwks);
      throw new Error(`unexpected URL ${url}`);
    },
    observeOperation: async ({ agentUrl, operation, provider, customer, notebookId }) => {
      operationAgentUrl = agentUrl;
      const body = { type: "A2AProviderOperationObservation", status: "passed", operation, provider, customer, notebookId };
      return { id: identifyDeploymentRecord(body), ...body };
    },
  }));
  assert.equal(result.type, "DeployedProviderObservation", JSON.stringify(result));
  assert.equal(result.transportOrigin, TRANSPORT_ORIGIN);
  assert.equal(result.declaredOrigin, ORIGIN);
  assert.equal(result.machine.origin, TRANSPORT_ORIGIN);
  assert.equal(result.origin, ORIGIN);
  assert.equal(result.agentCard.url, CARD_URL);
  assert.equal(result.agentCard.transportUrl, `${TRANSPORT_ORIGIN}/.well-known/agent-card.json`);
  assert.equal(operationAgentUrl, `${TRANSPORT_ORIGIN}/.well-known/agent-card.json`);
  assert.deepEqual(reads.map((url) => new URL(url).pathname), ["/.well-known/agent-card.json", "/.well-known/jwks.json"]);
});

test("transport and declared origin swaps are refused before or during exact evidence reads", async () => {
  const fixture = await signedFixture();
  let fetched = false;
  const drift = await observeDeployedA2aProvider({
    machine: machine({ url: "https://other-tag.example.test" }),
    expected: expected(fixture.signature, { machine: { origin: undefined, transportOrigin: TRANSPORT_ORIGIN }, declaredOrigin: ORIGIN }),
  }, effects(fixture, { fetch: async () => { fetched = true; throw new Error("must not fetch"); } }));
  assert.equal(drift.code, "deployment-origin-drift");
  assert.equal(fetched, false);

  const wrongDeclaration = await observeDeployedA2aProvider({
    machine: machine({ url: TRANSPORT_ORIGIN }),
    expected: expected(fixture.signature, { machine: { origin: undefined, transportOrigin: TRANSPORT_ORIGIN }, declaredOrigin: "https://other.example.test" }),
  }, effects(fixture, {
    fetch: async (url) => new URL(String(url)).pathname === "/.well-known/agent-card.json" ? response(fixture.card) : response(fixture.jwks),
  }));
  assert.equal(wrongDeclaration.code, "agent-card-observation-failed");
});

test("a provider-owned canonical urn:sha256 operation observation remains valid foreign evidence", async () => {
  const fixture = await signedFixture();
  const result = await observeDeployedA2aProvider({ machine: machine(), expected: expected(fixture.signature) }, effects(fixture, {
    observeOperation: async ({ operation, provider, customer, notebookId }) => {
      const body = { type: "A2AProviderOperationObservation", status: "passed", operation, provider, customer, notebookId };
      return { id: `urn:sha256:${createHash("sha256").update(canonicalDeploymentRecord(body)).digest("hex")}`, ...body };
    },
  }));
  assert.equal(result.type, "DeployedProviderObservation");
  assert.match(result.health[1].observation, /^urn:sha256:/u);
});

test("a signed card whose A2A interface escapes the machine origin is refused", async () => {
  const fixture = await signedFixture({ interfaceOrigin: "https://other.example.test" });
  const result = await observeDeployedA2aProvider({ machine: machine(), expected: expected(fixture.signature) }, effects(fixture));
  assert.equal(result.code, "agent-card-origin-drift");
});

test("invalid signed-card cryptography is refused by the discovery owner", async () => {
  const fixture = await signedFixture();
  fixture.card.signatures[0].signature = `${fixture.card.signatures[0].signature[0] === "A" ? "B" : "A"}${fixture.card.signatures[0].signature.slice(1)}`;
  const result = await observeDeployedA2aProvider({ machine: machine(), expected: expected(fixture.signature) }, effects(fixture));
  assert.equal(result.code, "agent-card-observation-failed");
  assert.match(result.detail, /no valid signature/u);
});

test("card identity, signature identity, and signing authority drift remain distinct", async () => {
  const fixture = await signedFixture();
  for (const [overrides, code] of [
    [{ identity: `ni:///sha-256;${"A".repeat(43)}` }, "agent-card-identity-drift"],
    [{ signatureIdentity: `ni:///sha-256;${"B".repeat(43)}` }, "agent-card-signature-drift"],
    [{ signingKid: "other-kid" }, "agent-card-signing-drift"],
  ]) {
    const result = await observeDeployedA2aProvider({ machine: machine(), expected: expected(fixture.signature, { agentCard: overrides }) }, effects(fixture));
    assert.equal(result.code, code);
  }
});

test("the complete signed Agent Card operation set must equal policy", async () => {
  const fixture = await signedFixture({ operations: [...OPERATIONS, "foreign-operation"] });
  const result = await observeDeployedA2aProvider({ machine: machine(), expected: expected(fixture.signature) }, effects(fixture));
  assert.equal(result.code, "provider-operation-drift");
});

test("a failed, thrown, or identity-drifting provider-owned operation observation cannot become health", async () => {
  const fixture = await signedFixture();
  const failed = await observeDeployedA2aProvider({ machine: machine(), expected: expected(fixture.signature) }, effects(fixture, {
    observeOperation: async ({ operation, provider, customer, notebookId }) => ({ id: `ni:///sha-256;${"C".repeat(43)}`, type: "A2AProviderOperationObservation", status: "failed", operation, provider, customer, notebookId }),
  }));
  assert.equal(failed.code, "operation-health-failed");
  const thrown = await observeDeployedA2aProvider({ machine: machine(), expected: expected(fixture.signature) }, effects(fixture, {
    observeOperation: async () => { throw new Error("provider refused harmless observation"); },
  }));
  assert.equal(thrown.code, "operation-health-failed");
  assert.match(thrown.detail, /provider refused/u);
  const identityDrift = await observeDeployedA2aProvider({ machine: machine(), expected: expected(fixture.signature) }, effects(fixture, {
    observeOperation: async ({ operation, provider, customer, notebookId }) => ({ id: `ni:///sha-256;${"D".repeat(43)}`, type: "A2AProviderOperationObservation", status: "passed", operation, provider, customer, notebookId }),
  }));
  assert.equal(identityDrift.code, "operation-health-failed");
});

test("resource, revision, generation, and origin drift are refused before network observation", async () => {
  const fixture = await signedFixture();
  for (const [machineOverrides, expectedOverrides, code] of [
    [{ resource: "urn:machine:cloud-run:other" }, {}, "deployment-resource-drift"],
    [{ revision: "provider-00008-def" }, {}, "deployment-revision-drift"],
    [{ generation: 8 }, {}, "deployment-generation-drift"],
    [{ url: "https://other.example.test" }, {}, "deployment-origin-drift"],
  ]) {
    let fetched = false;
    const result = await observeDeployedA2aProvider({ machine: machine(machineOverrides), expected: expected(fixture.signature, expectedOverrides) }, effects(fixture, { fetch: async () => { fetched = true; throw new Error("must not fetch"); } }));
    assert.equal(result.code, code);
    assert.equal(fetched, false);
  }
});
