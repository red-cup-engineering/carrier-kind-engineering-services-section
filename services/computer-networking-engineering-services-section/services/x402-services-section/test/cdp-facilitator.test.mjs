import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import test from "node:test";

import {
  CDP_FACILITATOR_URL,
  createCdpFacilitatorClient,
  createCdpJwt,
  selectFacilitatorClient,
} from "../src/cdp-facilitator.mjs";

const ED25519_SEED = "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60";
const ED25519_PUBLIC = "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a";
const ED25519_SECRET = Buffer.from(`${ED25519_SEED}${ED25519_PUBLIC}`, "hex").toString("base64");
const FIXED_JWT = "eyJhbGciOiJFZERTQSIsImtpZCI6Im9yZ2FuaXphdGlvbnMvZXhhbXBsZS9hcGlLZXlzL2V4YW1wbGUiLCJ0eXAiOiJKV1QiLCJub25jZSI6IjAwMDEwMjAzMDQwNTA2MDcwODA5MGEwYjBjMGQwZTBmIn0.eyJzdWIiOiJvcmdhbml6YXRpb25zL2V4YW1wbGUvYXBpS2V5cy9leGFtcGxlIiwiaXNzIjoiY2RwIiwidXJpcyI6WyJHRVQgYXBpLmNkcC5jb2luYmFzZS5jb20vcGxhdGZvcm0vdjIveDQwMi9zdXBwb3J0ZWQiXSwiaWF0IjoxNzAwMDAwMDAwLCJuYmYiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMDEyMH0.8H1jECLd2wFVhBdKq-rtnSfSqSUwEL1wY1CNTLikE01HruBwNv0DWpQGzUImsfLapl0pPsMzwfKok8BB9WrtCA";

function jwtParts(jwt) {
  const [encodedHeader, encodedPayload, encodedSignature] = jwt.split(".");
  return {
    signingInput: `${encodedHeader}.${encodedPayload}`,
    header: JSON.parse(Buffer.from(encodedHeader, "base64url")),
    payload: JSON.parse(Buffer.from(encodedPayload, "base64url")),
    signature: Buffer.from(encodedSignature, "base64url"),
  };
}

test("Ed25519 JWT matches the deterministic RFC 8032 key vector", () => {
  const jwt = createCdpJwt({
    apiKeyId: "organizations/example/apiKeys/example",
    apiKeySecret: ED25519_SECRET,
    method: "GET",
    host: "api.cdp.coinbase.com",
    path: "/platform/v2/x402/supported",
    now: 1_700_000_000,
    nonce: "000102030405060708090a0b0c0d0e0f",
  });
  assert.equal(jwt, FIXED_JWT);
  assert.deepEqual(jwtParts(jwt).payload.uris, ["GET api.cdp.coinbase.com/platform/v2/x402/supported"]);
});

test("ES256 JWT is one JOSE P-1363 signature verifiable by its public key", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwt = createCdpJwt({
    apiKeyId: "organizations/example/apiKeys/es256",
    apiKeySecret: privateKey.export({ format: "pem", type: "pkcs8" }),
    method: "POST",
    host: "api.cdp.coinbase.com",
    path: "/platform/v2/x402/verify",
    now: 1_700_000_000,
    nonce: "101112131415161718191a1b1c1d1e1f",
  });
  const { signingInput, header, signature } = jwtParts(jwt);
  assert.equal(header.alg, "ES256");
  assert.equal(signature.length, 64);
  assert.equal(verify("sha256", Buffer.from(signingInput), { key: publicKey, dsaEncoding: "ieee-p1363" }, signature), true);
});

test("facilitator refuses ambiguous URLs and malformed correlation metadata", () => {
  const credentials = { apiKeyId: "key", apiKeySecret: ED25519_SECRET };
  const correlation = { sdkLanguage: "javascript", source: "test-customer", sourceVersion: "1.2.3" };
  assert.equal(createCdpFacilitatorClient({
    ...credentials,
    correlation,
    baseUrl: "https://example.test/platform/v2/x402/",
  }).url, "https://example.test/platform/v2/x402");

  for (const baseUrl of [
    "http://example.test/platform/v2/x402",
    "https://user@example.test/platform/v2/x402",
    "https://example.test/platform//v2/x402",
    "https://example.test/platform/v2/x402?operation=verify",
    "https://example.test/",
  ]) {
    assert.throws(() => createCdpFacilitatorClient({ ...credentials, correlation, baseUrl }), /canonical HTTPS URL|API base path/u);
  }
  assert.throws(() => createCdpFacilitatorClient({ ...credentials }), /correlation metadata/u);
  assert.throws(() => createCdpFacilitatorClient({ ...credentials, correlation: { ...correlation, extra: "no" } }), /exactly/u);
  assert.throws(() => createCdpFacilitatorClient({ ...credentials, correlation: { ...correlation, source: "bad,value" } }), /nonempty token/u);
});

test("native client binds fresh JWTs and caller correlation to all three endpoints", { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/supported")) return new Response(JSON.stringify({ kinds: [] }), { status: 200 });
    if (url.endsWith("/verify")) return new Response(JSON.stringify({ isValid: true, payer: "0xpayer" }), { status: 200 });
    return new Response(JSON.stringify({ success: true, payer: "0xpayer", transaction: `0x${"01".repeat(32)}`, network: "eip155:8453" }), { status: 200 });
  };

  try {
    const client = createCdpFacilitatorClient({
      apiKeyId: "organizations/example/apiKeys/wire",
      apiKeySecret: ED25519_SECRET,
      baseUrl: "https://facilitator.example/platform/v2/x402/",
      correlation: { sdkLanguage: "javascript", source: "shared-client-test", sourceVersion: "1.5.0" },
    });
    const requirements = {
      scheme: "exact",
      network: "eip155:8453",
      asset: "0x0000000000000000000000000000000000000002",
      amount: "40000",
      payTo: "0x0000000000000000000000000000000000000003",
      maxTimeoutSeconds: 60,
      extra: { name: "USDC", version: "2" },
    };
    const payload = { x402Version: 2, accepted: requirements, payload: { signature: "0xsigned" } };
    await client.getSupported();
    await client.verify(payload, requirements);
    await client.settle(payload, requirements);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(calls.map(({ url, options }) => [options.method, url]), [
    ["GET", "https://facilitator.example/platform/v2/x402/supported"],
    ["POST", "https://facilitator.example/platform/v2/x402/verify"],
    ["POST", "https://facilitator.example/platform/v2/x402/settle"],
  ]);
  assert.equal(new Set(calls.map(({ options }) => options.headers.Authorization)).size, 3);
  for (const call of calls) {
    assert.equal(call.options.headers["Correlation-Context"], "sdkLanguage=javascript,source=shared-client-test,sourceVersion=1.5.0");
    assert.match(call.options.headers.Authorization, /^Bearer /u);
  }
});

test("selectFacilitatorClient hires CDP only when named, with both credentials, and defers to an injected client", () => {
  const made = [];
  const factory = (options) => { made.push(options); return { cdp: true }; };
  const injected = { injected: true };
  assert.equal(selectFacilitatorClient({}, "https://facilitator.payai.network", { facilitatorClient: injected, factory }), injected);
  assert.equal(selectFacilitatorClient({}, "https://facilitator.payai.network", { factory }), undefined);
  assert.throws(() => selectFacilitatorClient({ CDP_API_KEY_ID: "id" }, CDP_FACILITATOR_URL, { factory }), /requires CDP_API_KEY_SECRET/u);
  assert.throws(() => selectFacilitatorClient({ X402_FACILITATOR_PROVIDER: "cdp" }, "https://other.invalid", { factory }), /CDP_API_KEY_ID and CDP_API_KEY_SECRET/u);
  const client = selectFacilitatorClient({ CDP_API_KEY_ID: "id", CDP_API_KEY_SECRET: "secret" }, CDP_FACILITATOR_URL, { factory, source: "market.561.group", sourceVersion: "0.1.0" });
  assert.deepEqual(client, { cdp: true });
  assert.deepEqual(made, [{ apiKeyId: "id", apiKeySecret: "secret", baseUrl: CDP_FACILITATOR_URL, correlation: { sdkLanguage: "javascript", source: "market.561.group", sourceVersion: "0.1.0" } }]);
});
