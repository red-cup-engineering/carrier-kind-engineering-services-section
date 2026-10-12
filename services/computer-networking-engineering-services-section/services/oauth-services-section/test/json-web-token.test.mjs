import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";

import { remoteJsonWebKeySet, signJsonWebToken, verifyJsonWebToken } from "../src/json-web-token.mjs";

const now = Date.UTC(2026, 8, 27);
const claims = { iss: "https://issuer.test", aud: "client", sub: "subject", iat: now / 1000, exp: now / 1000 + 600 };
const pairs = {
  RS256: generateKeyPairSync("rsa", { modulusLength: 2048 }),
  ES256: generateKeyPairSync("ec", { namedCurve: "P-256" }),
  EdDSA: generateKeyPairSync("ed25519"),
};
const publicJwk = (alg) => ({ ...pairs[alg].publicKey.export({ format: "jwk" }), kid: alg, alg, use: "sig" });

test("each algorithm verifies what it signs, against a published key set", async () => {
  const keys = { keys: Object.keys(pairs).map(publicJwk) };
  for (const alg of Object.keys(pairs)) {
    const token = signJsonWebToken(claims, { privateKey: pairs[alg].privateKey, kid: alg, alg });
    const { header, payload } = await verifyJsonWebToken(token, keys, { issuer: "https://issuer.test", audience: "client", requiredClaims: ["sub"], now: () => now });
    assert.equal(header.alg, alg);
    assert.equal(payload.sub, "subject");
  }
});

test("a remote key set is fetched once and serves the key a token names", async () => {
  let fetches = 0;
  const keySet = remoteJsonWebKeySet("https://issuer.test/jwks", { fetchImpl: async () => { fetches += 1; return Response.json({ keys: [publicJwk("RS256")] }); } });
  for (let round = 0; round < 2; round += 1) {
    const token = signJsonWebToken(claims, { privateKey: pairs.RS256.privateKey, kid: "RS256" });
    assert.equal((await verifyJsonWebToken(token, keySet, { now: () => now })).payload.sub, "subject");
  }
  assert.equal(fetches, 1);
});

test("a token signed by another key, altered, expired, or for another audience is refused", async () => {
  const keys = { keys: [publicJwk("RS256")] };
  const stranger = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
  const forged = signJsonWebToken(claims, { privateKey: stranger, kid: "RS256" });
  await assert.rejects(verifyJsonWebToken(forged, keys, { now: () => now }), /signature verification failed/);
  const token = signJsonWebToken(claims, { privateKey: pairs.RS256.privateKey, kid: "RS256" });
  const [head, , signature] = token.split(".");
  const altered = `${head}.${Buffer.from(JSON.stringify({ ...claims, sub: "someone-else" })).toString("base64url")}.${signature}`;
  await assert.rejects(verifyJsonWebToken(altered, keys, { now: () => now }), /signature verification failed/);
  await assert.rejects(verifyJsonWebToken(token, keys, { now: () => now + 3_600_000 }), /expired/);
  await assert.rejects(verifyJsonWebToken(token, keys, { audience: "other", now: () => now }), /audience/);
});
