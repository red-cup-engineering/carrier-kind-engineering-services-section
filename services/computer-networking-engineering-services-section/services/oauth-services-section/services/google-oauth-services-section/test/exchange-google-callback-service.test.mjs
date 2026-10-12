import assert from "node:assert/strict";
import test from "node:test";

import { generateKeyPairSync } from "node:crypto";

import {
  createGoogleIdTokenVerifier,
  exchangeGoogleCallback,
} from "../scripts/exchange-google-callback-service.mjs";
import { OAuthError } from "@red-cup-engineering/oauth-services-section";
import { signJsonWebToken } from "@red-cup-engineering/oauth-services-section/json-web-token";

const generateKeyPair = async () => generateKeyPairSync("rsa", { modulusLength: 2048 });

const clientId = "client-id.apps.googleusercontent.com";
const claims = (changes = {}) => ({
  iss: "https://accounts.google.com",
  aud: clientId,
  exp: Math.floor(Date.now() / 1000) + 300,
  iat: Math.floor(Date.now() / 1000),
  sub: "google-subject-123",
  email: "person@example.com",
  email_verified: true,
  nonce: "nonce-value",
  ...changes,
});

function tokenResponse(idToken = "signed.id.token") {
  return { ok: true, json: async () => ({ id_token: idToken }) };
}

function exchangeConfig(verifiedClaims, changes = {}) {
  return {
    googleClientId: clientId,
    googleClientSecret: "secret",
    publicBaseUrl: "https://service.example",
    expectedNonce: "nonce-value",
    fetchImpl: async () => tokenResponse(),
    verifyIdToken: async () => verifiedClaims,
    ...changes,
  };
}

async function signedToken(privateKey, kid, payload) {
  return signJsonWebToken({ ...payload, iat: Math.floor(Date.now() / 1000) }, { privateKey, kid, alg: "RS256" });
}

async function jwkFor(publicKey, kid) {
  return { ...publicKey.export({ format: "jwk" }), kid, alg: "RS256", use: "sig" };
}

test("returns the compatible raw claims and id_token alongside the stable Google issuer and subject", async () => {
  const identity = await exchangeGoogleCallback("google-code", exchangeConfig(claims()));
  assert.equal(identity.issuer, "https://accounts.google.com");
  assert.equal(identity.subject, "google-subject-123");
  assert.equal(identity.email, "person@example.com");
  assert.equal(identity.emailVerified, true);
  assert.deepEqual(identity.claims, claims());
  assert.equal(identity.idToken, "signed.id.token");
});

test("requires issuer, audience, expiry, nonempty subject, and explicit verified email even for an injected verifier", async () => {
  for (const invalid of [
    claims({ iss: "https://issuer.example" }),
    claims({ aud: "wrong-client" }),
    claims({ exp: Math.floor(Date.now() / 1000) - 1 }),
    claims({ iat: undefined }),
    claims({ sub: "" }),
    claims({ email_verified: undefined }),
    claims({ email_verified: "true" }),
  ]) {
    await assert.rejects(
      () => exchangeGoogleCallback("code", exchangeConfig(invalid)),
      (error) => error instanceof OAuthError && error.code === "access_denied",
    );
  }
});

test("requires azp for a multiple-audience token and binds it to this client", async () => {
  await assert.rejects(
    () => exchangeGoogleCallback("code", exchangeConfig(claims({ aud: [clientId, "other-client"] }))),
    (error) => error instanceof OAuthError && error.description === "id_token authorized party mismatch",
  );
  const identity = await exchangeGoogleCallback("code", exchangeConfig(claims({ aud: [clientId, "other-client"], azp: clientId })));
  assert.equal(identity.subject, "google-subject-123");
});

test("requires a matching nonce when the caller has a pending nonce", async () => {
  await assert.rejects(
    () => exchangeGoogleCallback("code", exchangeConfig(claims({ nonce: "wrong-nonce" }))),
    (error) => error instanceof OAuthError && error.description === "id_token nonce mismatch",
  );
});

test("uses the injected clock for expiry validation", async () => {
  await assert.rejects(
    () => exchangeGoogleCallback("code", exchangeConfig(claims({ iat: 1, exp: 10 }), { now: () => 10_000 })),
    (error) => error instanceof OAuthError && error.description === "id_token expired",
  );
});

test("verifies against signed JWKS keys and refetches the JWKS for a rotated key", async () => {
  const first = await generateKeyPair();
  const second = await generateKeyPair();
  const firstJwk = await jwkFor(first.publicKey, "first");
  const secondJwk = await jwkFor(second.publicKey, "second");
  let keys = [firstJwk];
  let requests = 0;
  const verifier = createGoogleIdTokenVerifier({
    jwksUrl: "https://jwks.example/keys",
    cooldownDuration: 0,
    fetchImpl: async (url) => {
      assert.equal(url.toString(), "https://jwks.example/keys");
      requests += 1;
      return new Response(JSON.stringify({ keys }), { headers: { "content-type": "application/json" } });
    },
  });
  const firstToken = await signedToken(first.privateKey, "first", claims());
  const firstIdentity = await exchangeGoogleCallback("code", exchangeConfig(undefined, {
    fetchImpl: async () => tokenResponse(firstToken), verifyIdToken: verifier,
  }));
  assert.equal(firstIdentity.subject, "google-subject-123");
  keys = [firstJwk, secondJwk];
  const secondToken = await signedToken(second.privateKey, "second", claims({ sub: "rotated-key-subject" }));
  const secondIdentity = await exchangeGoogleCallback("code", exchangeConfig(undefined, {
    fetchImpl: async () => tokenResponse(secondToken), verifyIdToken: verifier,
  }));
  assert.equal(secondIdentity.subject, "rotated-key-subject");
  assert.ok(requests >= 2);
});

test("sanitizes a JWKS or signature verification failure", async () => {
  await assert.rejects(
    () => exchangeGoogleCallback("code", exchangeConfig(undefined, {
      verifyIdToken: async () => { throw new Error("raw verifier details must not reach the client"); },
    })),
    (error) => error instanceof OAuthError && error.code === "access_denied" && error.description === "Google id_token validation failed",
  );
});

test("refuses a signed id_token whose key is absent from the JWKS", async () => {
  const trusted = await generateKeyPair();
  const untrusted = await generateKeyPair();
  const verifier = createGoogleIdTokenVerifier({
    jwksUrl: "https://jwks.example/keys",
    cooldownDuration: 0,
    fetchImpl: async () => new Response(JSON.stringify({ keys: [await jwkFor(trusted.publicKey, "trusted")] })),
  });
  const token = await signedToken(untrusted.privateKey, "unknown", claims());
  await assert.rejects(
    () => exchangeGoogleCallback("code", exchangeConfig(undefined, {
      fetchImpl: async () => tokenResponse(token), verifyIdToken: verifier,
    })),
    (error) => error instanceof OAuthError && error.code === "access_denied" && error.description === "Google id_token validation failed",
  );
});

test("sends PKCE and reports a token endpoint failure without decoding a response", async () => {
  let request;
  await assert.rejects(
    () => exchangeGoogleCallback("code", {
      ...exchangeConfig(claims(), {
        fetchImpl: async (_url, init) => {
          request = init;
          return { ok: false, json: async () => ({}) };
        },
      }),
      codeVerifier: "verifier-value",
    }),
    (error) => error instanceof OAuthError && error.code === "server_error",
  );
  assert.equal(new URLSearchParams(request.body).get("code_verifier"), "verifier-value");
});
