import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { AgentCard, generateAgentCardSignature } from "@a2a-js/sdk";
import { exportJWK, exportPKCS8, importPKCS8 } from "jose";
import { discoverSignedAgentCard } from "@red-cup-engineering/a2a-agent-card-discovery-service";
import { ephemeralAgentCardSigning } from "@red-cup-engineering/a2a-agent-card-key-service/testing";
import { createSignedAgentCard, loadSignedAgentCard } from "../src/signed-agent-card.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TEMPLATE = readFileSync(join(ROOT, "test/fixtures/agent-card.json"), "utf8");

async function keyFixture(kid = "signed-agent-card-test-ed25519") {
  const root = mkdtempSync(join(tmpdir(), "signed-agent-card-"));
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicJwk = { ...(await exportJWK(publicKey)), kid, alg: "EdDSA", use: "sig" };
  const signingKeyPath = join(root, "signing.key"), jwksPath = join(root, "jwks.json");
  writeFileSync(signingKeyPath, await exportPKCS8(privateKey), { encoding: "utf8", mode: 0o600 });
  writeFileSync(jwksPath, JSON.stringify({ keys: [publicJwk] }), "utf8");
  return { root, signingKeyPath, jwksPath, kid, privateKey };
}

function discoveryFetch(baseUrl, bundle) {
  return async (url) => {
    if (String(url) === `${baseUrl}/.well-known/agent-card.json`) return new Response(JSON.stringify(bundle.card));
    if (String(url) === `${baseUrl}/.well-known/jwks.json`) return new Response(JSON.stringify(bundle.jwks));
    return new Response("missing", { status: 404 });
  };
}

test("createSignedAgentCard signs an in-memory card against an injected signing configuration", async () => {
  const baseUrl = "https://signed-agent-card.example";
  const signing = ephemeralAgentCardSigning(baseUrl, "signed-agent-card-test");
  const card = JSON.parse(TEMPLATE.replaceAll("${BASE_URL}", baseUrl));
  const bundle = await createSignedAgentCard(card, signing);
  assert.equal(bundle.card.name, "RMN echo conformance agent");
  assert.equal(bundle.card.signatures.length, 1);
  assert.deepEqual(bundle.jwks, signing.agentCardJwks);
  assert.ok(Object.isFrozen(bundle));
  assert.ok(Object.isFrozen(bundle.card));
  assert.ok(Object.isFrozen(bundle.jwks));
  const discovered = await discoverSignedAgentCard({
    agentUrl: `${baseUrl}/.well-known/agent-card.json`,
    fetch: discoveryFetch(baseUrl, bundle),
  });
  assert.equal(discovered.name, "RMN echo conformance agent");
  assert.equal(discovered.signatures.length, 1);
});

test("createSignedAgentCard requires an injected signature generator and jwks", async () => {
  const card = JSON.parse(TEMPLATE.replaceAll("${BASE_URL}", "https://x.example"));
  await assert.rejects(createSignedAgentCard(card, {}), /agentCardSignatureGenerator and agentCardJwks/u);
  await assert.rejects(createSignedAgentCard(card), /agentCardSignatureGenerator and agentCardJwks/u);
});

test("loadSignedAgentCard signs the file+env driven card and produces one independently verifiable Agent Card", async () => {
  const baseUrl = "https://articulating.example.signed-agent-card";
  const fixture = await keyFixture();
  try {
    const bundle = await loadSignedAgentCard({
      origin: baseUrl,
      cardPath: join(ROOT, "test/fixtures/agent-card.json"),
      signingKeyPath: fixture.signingKeyPath,
      jwksPath: fixture.jwksPath,
      kid: fixture.kid,
    });
    assert.equal(bundle.card.name, "RMN echo conformance agent");
    assert.equal(bundle.card.signatures.length, 1);
    assert.deepEqual(bundle.jwks, JSON.parse(readFileSync(fixture.jwksPath, "utf8")));
    const discovered = await discoverSignedAgentCard({
      agentUrl: `${baseUrl}/.well-known/agent-card.json`,
      fetch: discoveryFetch(baseUrl, bundle),
    });
    assert.equal(discovered.name, "RMN echo conformance agent");
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("loadSignedAgentCard is a thin file+env wrapper: it delegates to createSignedAgentCard byte-identically", async () => {
  const baseUrl = "https://articulating.example.delegation-check";
  const fixture = await keyFixture("delegation-check-ed25519");
  try {
    const loaded = await loadSignedAgentCard({
      origin: baseUrl,
      cardPath: join(ROOT, "test/fixtures/agent-card.json"),
      signingKeyPath: fixture.signingKeyPath,
      jwksPath: fixture.jwksPath,
      kid: fixture.kid,
    });
    const card = JSON.parse(TEMPLATE.replaceAll("${BASE_URL}", baseUrl));
    const privateKey = await importPKCS8(readFileSync(fixture.signingKeyPath, "utf8"), "EdDSA");
    const agentCardSignatureGenerator = generateAgentCardSignature(privateKey, {
      alg: "EdDSA", kid: fixture.kid, typ: "JOSE", jku: `${baseUrl}/.well-known/jwks.json`,
    });
    const composed = await createSignedAgentCard(card, {
      agentCardSignatureGenerator,
      agentCardJwks: JSON.parse(readFileSync(fixture.jwksPath, "utf8")),
    });
    assert.deepEqual(loaded.card, composed.card);
    assert.deepEqual(loaded.jwks, composed.jwks);
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("loadSignedAgentCard refuses a JWKS that does not expose exactly one matching public key", async () => {
  const fixture = await keyFixture();
  try {
    writeFileSync(fixture.jwksPath, JSON.stringify({ keys: [] }), "utf8");
    await assert.rejects(loadSignedAgentCard({
      origin: "https://articulating.example.no-key",
      cardPath: join(ROOT, "test/fixtures/agent-card.json"),
      signingKeyPath: fixture.signingKeyPath,
      jwksPath: fixture.jwksPath,
      kid: fixture.kid,
    }), /exactly one matching public key/u);
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("loadSignedAgentCard requires an explicit or environment-declared origin, key, jwks, and kid", async () => {
  await assert.rejects(loadSignedAgentCard({}), /Agent Card origin is required/u);
});
