import assert from "node:assert/strict";
import test from "node:test";

import { validateBearerToken } from "../scripts/validate-bearer-token-service.mjs";

test("returns identity claims for a live token", () => {
  const tokens = new Map([["tok-1", { client_id: "client_1", email: "person@example.com", expires_at: Date.now() + 60_000 }]]);
  assert.deepEqual(validateBearerToken("tok-1", tokens), { client_id: "client_1", email: "person@example.com" });
});

test("returns null for an unknown token", () => {
  assert.equal(validateBearerToken("nope", new Map()), null);
});

test("returns null for an expired token", () => {
  const tokens = new Map([["tok-1", { client_id: "client_1", email: "person@example.com", expires_at: Date.now() - 1 }]]);
  assert.equal(validateBearerToken("tok-1", tokens), null);
});

test("honors an injected `now` for deterministic expiry testing", () => {
  const tokens = new Map([["tok-1", { client_id: "client_1", email: "person@example.com", expires_at: 1000 }]]);
  assert.equal(validateBearerToken("tok-1", tokens, 1001), null);
  assert.deepEqual(validateBearerToken("tok-1", tokens, 500), { client_id: "client_1", email: "person@example.com" });
});

test("returns provider-qualified continuity claims when the record has them", () => {
  const tokens = new Map([["tok-1", { client_id: "client_1", email: "changed@example.com", issuer: "https://accounts.google.com", subject: "stable-subject", expires_at: Date.now() + 60_000 }]]);
  assert.deepEqual(validateBearerToken("tok-1", tokens), { client_id: "client_1", email: "changed@example.com", issuer: "https://accounts.google.com", subject: "stable-subject" });
});

test("refuses malformed durable records and invalid trusted time", () => {
  const good = { client_id: "client", email: "person@example.com", expires_at: 1000 };
  for (const record of [{ ...good, expires_at: undefined }, { ...good, expires_at: NaN }, { ...good, expires_at: "1000" }, { ...good, expires_at: 500 }, { ...good, client_id: "" }, { ...good, email: "" }, { ...good, issuer: "issuer" }, { ...good, issuer: "", subject: "subject" }, { ...good, issuer: 1, subject: "subject" }]) assert.equal(validateBearerToken("t", new Map([["t", record]]), 500), null);
  assert.equal(validateBearerToken("t", new Map([["t", good]]), NaN), null);
  assert.deepEqual(validateBearerToken("t", new Map([["t", good]]), 500), { client_id: "client", email: "person@example.com" });
});
