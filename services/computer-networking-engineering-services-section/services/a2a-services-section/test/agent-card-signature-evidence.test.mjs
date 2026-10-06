import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { agentCardSignatureEvidence, createAgentCardSigningConfiguration, ephemeralAgentCardSigning } from "../scripts/agent-card-signing.mjs";

test("createAgentCardSigningConfiguration signs from caller-supplied key material", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const signing = createAgentCardSigningConfiguration({ baseUrl: "http://127.0.0.1:9", kid: "supplied-ed25519", privateKey, publicJwk: publicKey.export({ format: "jwk" }) });
  const signed = signing.sign({ name: "signed-agent", protocolVersion: "1.0" });
  assert.equal(signed.signatures.length, 1);
  assert.equal(signing.kid, "supplied-ed25519");
  assert.equal(signing.jwks.keys.length, 1);
  assert.equal(signing.jwks.keys[0].kid, "supplied-ed25519");
});

test("createAgentCardSigningConfiguration refuses a private-key JWK where a public one belongs", () => {
  const { privateKey } = generateKeyPairSync("ed25519");
  assert.throws(() => createAgentCardSigningConfiguration({ baseUrl: "http://127.0.0.1:9", kid: "x", privateKey, publicJwk: privateKey.export({ format: "jwk" }) }));
});

test("ephemeralAgentCardSigning is createAgentCardSigningConfiguration over one generated keypair", () => {
  const signing = ephemeralAgentCardSigning("http://127.0.0.1:9", "fixture");
  assert.equal(signing.kid, "fixture-ed25519");
  assert.equal(typeof signing.sign, "function");
  assert.equal(signing.jwks.keys[0].kid, "fixture-ed25519");
});

test("agentCardSignatureEvidence reduces a signed card to ni:// digests and key claims", () => {
  const signing = ephemeralAgentCardSigning("http://origin.test", "witness");
  const signed = signing.sign({ name: "signed-agent", protocolVersion: "1.0" });
  const evidence = agentCardSignatureEvidence(signed);
  assert.match(evidence.card, /^ni:\/\/\/sha-256;/u);
  assert.match(evidence.signature, /^ni:\/\/\/sha-256;/u);
  assert.equal(evidence.kid, "witness-ed25519");
  assert.equal(evidence.algorithm, "EdDSA");
  assert.equal(evidence.jwks, "http://origin.test/.well-known/jwks.json");
});

test("agentCardSignatureEvidence is stable under key reordering and refuses zero or many signatures", () => {
  const signing = ephemeralAgentCardSigning("http://origin.test", "witness");
  const signed = signing.sign({ protocolVersion: "1.0", name: "signed-agent" });
  const reordered = signing.sign({ name: "signed-agent", protocolVersion: "1.0" });
  assert.equal(agentCardSignatureEvidence(signed).card, agentCardSignatureEvidence(reordered).card);
  assert.throws(() => agentCardSignatureEvidence({ name: "unsigned" }), /exactly one/u);
  assert.throws(() => agentCardSignatureEvidence({ ...signed, signatures: [...signed.signatures, ...signed.signatures] }), /exactly one/u);
});
