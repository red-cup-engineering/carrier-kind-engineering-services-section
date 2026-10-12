import assert from "node:assert/strict";

import test from "node:test";
import { createClientCredentialsClient } from "../src/client-credentials.mjs";

function stubFetch(responses) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      const next = responses.shift();
      return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
    },
  };
}

test("getToken requests a client_credentials grant with client_secret_post and caches the result", async () => {
  const { calls, fetchImpl } = stubFetch([{ body: { access_token: "tok-1", token_type: "Bearer", expires_in: 3600 } }]);
  const client = createClientCredentialsClient({ tokenUrl: "https://ops.561.group/oauth/token", clientId: "machine_1", clientSecret: "s3cret", fetchImpl });
  const token = await client.getToken();
  assert.equal(token, "tok-1");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://ops.561.group/oauth/token");
  assert.equal(calls[0].init.method, "POST");
  const body = new URLSearchParams(calls[0].init.body);
  assert.equal(body.get("grant_type"), "client_credentials");
  assert.equal(body.get("client_id"), "machine_1");
  assert.equal(body.get("client_secret"), "s3cret");

  const cached = await client.getToken();
  assert.equal(cached, "tok-1");
  assert.equal(calls.length, 1, "a still-fresh token is served from cache, not re-requested");
});

test("getToken refreshes once the cached token is within its refresh margin", async () => {
  let now = 0;
  const { calls, fetchImpl } = stubFetch([
    { body: { access_token: "tok-1", expires_in: 60 } },
    { body: { access_token: "tok-2", expires_in: 60 } },
  ]);
  const client = createClientCredentialsClient({
    tokenUrl: "https://ops.561.group/oauth/token",
    clientId: "machine_1",
    clientSecret: "s3cret",
    fetchImpl,
    now: () => now,
    refreshMarginMs: 5000,
  });
  assert.equal(await client.getToken(), "tok-1");
  now += 56_000;
  assert.equal(await client.getToken(), "tok-2");
  assert.equal(calls.length, 2);
});

test("getToken raises when the token endpoint refuses the request", async () => {
  const { fetchImpl } = stubFetch([{ body: { error: "invalid_client" }, status: 401 }]);
  const client = createClientCredentialsClient({ tokenUrl: "https://ops.561.group/oauth/token", clientId: "machine_1", clientSecret: "wrong", fetchImpl });
  await assert.rejects(() => client.getToken(), /401/);
});

test("invalidate forces the next getToken to re-request", async () => {
  const { calls, fetchImpl } = stubFetch([
    { body: { access_token: "tok-1", expires_in: 3600 } },
    { body: { access_token: "tok-2", expires_in: 3600 } },
  ]);
  const client = createClientCredentialsClient({ tokenUrl: "https://ops.561.group/oauth/token", clientId: "machine_1", clientSecret: "s3cret", fetchImpl });
  assert.equal(await client.getToken(), "tok-1");
  client.invalidate();
  assert.equal(await client.getToken(), "tok-2");
  assert.equal(calls.length, 2);
});
