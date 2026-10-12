import assert from "node:assert/strict";
import test from "node:test";

import { relayToGoogleConsent } from "../scripts/relay-to-google-consent-service.mjs";

test("builds the accounts.google.com consent URL with the expected fixed parameters", () => {
  const url = new URL(relayToGoogleConsent({ state: "abc123", googleClientId: "google-client-id", publicBaseUrl: "https://ops.561.group" }));
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.pathname, "/o/oauth2/v2/auth");
  assert.equal(url.searchParams.get("client_id"), "google-client-id");
  assert.equal(url.searchParams.get("redirect_uri"), "https://ops.561.group/oauth/google/callback");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("scope"), "openid email");
  assert.equal(url.searchParams.get("state"), "abc123");
  assert.equal(url.searchParams.get("access_type"), "online");
});

test("carries the exact state token through unmodified", () => {
  const url = new URL(relayToGoogleConsent({ state: "different-state-token", googleClientId: "x", publicBaseUrl: "https://a.example" }));
  assert.equal(url.searchParams.get("state"), "different-state-token");
});

test("pinned output: a plain three-argument call produces the exact same URL string as before PKCE/nonce support was added", () => {
  const url = relayToGoogleConsent({ state: "abc123", googleClientId: "google-client-id", publicBaseUrl: "https://ops.561.group" });
  assert.equal(
    url,
    "https://accounts.google.com/o/oauth2/v2/auth?client_id=google-client-id&redirect_uri=https%3A%2F%2Fops.561.group%2Foauth%2Fgoogle%2Fcallback&response_type=code&scope=openid+email&state=abc123&access_type=online",
  );
});

test("codeChallenge, when given, sets code_challenge and code_challenge_method=S256; omitted otherwise", () => {
  const withChallenge = new URL(relayToGoogleConsent({ state: "s", googleClientId: "id", publicBaseUrl: "https://a.example", codeChallenge: "challenge-value" }));
  assert.equal(withChallenge.searchParams.get("code_challenge"), "challenge-value");
  assert.equal(withChallenge.searchParams.get("code_challenge_method"), "S256");

  const without = new URL(relayToGoogleConsent({ state: "s", googleClientId: "id", publicBaseUrl: "https://a.example" }));
  assert.equal(without.searchParams.has("code_challenge"), false);
  assert.equal(without.searchParams.has("code_challenge_method"), false);
});

test("nonce, when given, is passed through; omitted otherwise", () => {
  const withNonce = new URL(relayToGoogleConsent({ state: "s", googleClientId: "id", publicBaseUrl: "https://a.example", nonce: "nonce-value" }));
  assert.equal(withNonce.searchParams.get("nonce"), "nonce-value");

  const without = new URL(relayToGoogleConsent({ state: "s", googleClientId: "id", publicBaseUrl: "https://a.example" }));
  assert.equal(without.searchParams.has("nonce"), false);
});

test("prompt and loginHint, when given, are passed through as prompt and login_hint; omitted otherwise", () => {
  const withBoth = new URL(relayToGoogleConsent({ state: "s", googleClientId: "id", publicBaseUrl: "https://a.example", prompt: "consent", loginHint: "person@example.com" }));
  assert.equal(withBoth.searchParams.get("prompt"), "consent");
  assert.equal(withBoth.searchParams.get("login_hint"), "person@example.com");

  const without = new URL(relayToGoogleConsent({ state: "s", googleClientId: "id", publicBaseUrl: "https://a.example" }));
  assert.equal(without.searchParams.has("prompt"), false);
  assert.equal(without.searchParams.has("login_hint"), false);
});

test("scopes accepts an array (joined with a space) or a string, overriding the default", () => {
  const arrayForm = new URL(relayToGoogleConsent({ state: "s", googleClientId: "id", publicBaseUrl: "https://a.example", scopes: ["openid", "email", "profile"] }));
  assert.equal(arrayForm.searchParams.get("scope"), "openid email profile");

  const stringForm = new URL(relayToGoogleConsent({ state: "s", googleClientId: "id", publicBaseUrl: "https://a.example", scopes: "openid email profile" }));
  assert.equal(stringForm.searchParams.get("scope"), "openid email profile");
});

test("redirectPath overrides the default callback path; accessType overrides the default online value", () => {
  const url = new URL(relayToGoogleConsent({ state: "s", googleClientId: "id", publicBaseUrl: "https://a.example", redirectPath: "/custom/callback", accessType: "offline" }));
  assert.equal(url.searchParams.get("redirect_uri"), "https://a.example/custom/callback");
  assert.equal(url.searchParams.get("access_type"), "offline");
});
