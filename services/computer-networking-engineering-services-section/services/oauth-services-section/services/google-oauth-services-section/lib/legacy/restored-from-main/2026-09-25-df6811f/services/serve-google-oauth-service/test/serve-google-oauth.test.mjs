import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import {
  OAuthServer,
  authorizationServerMetadata,
  oauthConfigFromEnv,
} from "../src/index.mjs";

test("builds deployment configuration from ordinary environment values", () => {
  const config = oauthConfigFromEnv({
    publicBaseUrl: "https://dashboard.example/",
    stateDir: "/tmp/oauth-state",
    env: {
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
      OAUTH_ALLOWED_EMAILS: "leader@example.com, operator@example.com",
    },
  });
  assert.equal(config.publicBaseUrl, "https://dashboard.example");
  assert.equal(config.admitEmail("LEADER@example.com"), true);
  assert.equal(config.admitEmail("outsider@example.com"), false);
});

test("serves standard authorization-server metadata", () => {
  const server = new OAuthServer({
    googleClientId: "client-id",
    googleClientSecret: "client-secret",
    publicBaseUrl: "https://dashboard.example",
    stateDir: "/tmp/oauth-state",
    admitEmail: () => true,
  });
  const metadata = authorizationServerMetadata(server);
  assert.equal(metadata.issuer, "https://dashboard.example");
  assert.equal(metadata.token_endpoint, "https://dashboard.example/oauth/token");
});

test("code exchange and refresh retain issuer-subject identity across email changes", () => {
  const server = new OAuthServer({ googleClientId: "client-id", googleClientSecret: "client-secret", publicBaseUrl: "https://dashboard.example", stateDir: "/tmp/oauth-state", admitEmail: () => true });
  const verifier = "integration-verifier";
  const challenge = createHash("sha256").update(verifier, "ascii").digest("base64url");
  const seed = (code, email, subject) => server.codes.set(code, { client_id: "client", redirect_uri: "https://client.example/callback", code_challenge: challenge, email, issuer: "https://accounts.google.com", subject, expires_at: Date.now() + 60_000 });
  const exchange = (code) => server.exchangeCode({ client_id: "client", code, code_verifier: verifier, redirect_uri: "https://client.example/callback" });
  seed("code-one", "before@example.com", "subject-one");
  const first = exchange("code-one");
  assert.deepEqual(server.validateToken(first.access_token), { client_id: "client", email: "before@example.com", issuer: "https://accounts.google.com", subject: "subject-one" });
  const rotated = server.rotateRefreshToken({ client_id: "client", refresh_token: first.refresh_token });
  assert.deepEqual(server.validateToken(rotated.access_token), { client_id: "client", email: "before@example.com", issuer: "https://accounts.google.com", subject: "subject-one" });
  seed("code-two", "before@example.com", "subject-two");
  seed("code-three", "after@example.com", "subject-one");
  assert.equal(server.validateToken(exchange("code-two").access_token).subject, "subject-two");
  assert.deepEqual(server.validateToken(exchange("code-three").access_token), { client_id: "client", email: "after@example.com", issuer: "https://accounts.google.com", subject: "subject-one" });
});
