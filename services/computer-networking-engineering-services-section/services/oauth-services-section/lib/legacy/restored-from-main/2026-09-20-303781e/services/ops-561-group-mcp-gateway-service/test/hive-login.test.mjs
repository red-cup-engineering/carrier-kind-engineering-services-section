import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import { hiveLoginApp } from "../src/hive-login.mjs";

async function withDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), "ops-mcp-hive-login-"));
  try {
    return await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function fixture(dir, { admitted = true, verifyResult } = {}) {
  const established = [];
  let issuedNonce;
  const registry = { isHiveAdmitted: (account) => admitted && account === "emsenn0" };
  const browser = {
    validSession: () => null,
    establishHiveSession: (account) => {
      established.push(account);
      return { sessionId: "sid", cookieHeader: `__Host-ops_session=signed-${account}; Path=/` };
    },
    mintHiveChallengeCookie: (nonce) => { issuedNonce = nonce; return `__Host-ops_hive_login=signed-${nonce}; Path=/`; },
    hiveChallengeFrom: () => issuedNonce,
    clearHiveChallengeCookie: () => "__Host-ops_hive_login=; Max-Age=0; Path=/",
  };
  const verify = verifyResult ? async () => verifyResult : undefined;
  const app = hiveLoginApp({ stateDir: dir, registry, browser, ...(verify ? { verify } : {}) });
  const resource = (id) => app.resources.find((candidate) => candidate.id === id);
  return { app, resource, established };
}

function jsonRequest(body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.headers = { "content-type": "application/json" };
  return { req };
}

test("GET /login/hive renders a page carrying a fresh nonce and the Keychain request", () => withDir((dir) => {
  const { resource } = fixture(dir);
  const response = resource("ops-browser.login-hive").handler({ req: { headers: {} } });
  assert.match(response.body, /requestSignBuffer/);
  assert.match(response.body, /hive_keychain/);
  assert.match(response.body, /login\/hive\/callback/);
}));

test("GET /login/hive detects Keychain by waiting for load and polling, never by a synchronous check at parse time", () => withDir((dir) => {
  const { resource } = fixture(dir);
  const response = resource("ops-browser.login-hive").handler({ req: { headers: {} } });
  // Detection is deferred behind a load listener that invokes the poll —
  // never a bare check that runs while the script itself is executing.
  assert.match(response.body, /window\.addEventListener\("load", function \(\) \{ pollForKeychain\(0\); \}\)/);
  assert.match(response.body, /function pollForKeychain\(elapsedMs\)/);
  // The poll recurses on a bounded interval/timeout rather than checking
  // window.hive_keychain exactly once.
  assert.match(response.body, /setTimeout\(function \(\) \{ pollForKeychain\(elapsedMs \+ POLL_INTERVAL_MS\); \}, POLL_INTERVAL_MS\)/);
  assert.match(response.body, /POLL_INTERVAL_MS\s*=\s*100/);
  assert.match(response.body, /POLL_TIMEOUT_MS\s*=\s*3000/);
  assert.match(response.body, /not detected after 3 s/);
  // The submit control starts disabled and is enabled only once detected.
  assert.match(response.body, /<button type="submit" disabled>/);
  assert.match(response.body, /submitButton\.disabled = false/);
}));

test("GET /login/hive redirects an already-valid session straight to /network", () => withDir((dir) => {
  const dir2 = dir;
  const registry = { isHiveAdmitted: () => true };
  const browser = { validSession: () => ({ id: "x" }), establishHiveSession: () => ({ cookieHeader: "" }) };
  const app = hiveLoginApp({ stateDir: dir2, registry, browser });
  const response = app.resources.find((r) => r.id === "ops-browser.login-hive").handler({ req: { headers: {} } });
  assert.equal(response.status, 303);
  assert.equal(response.headers.location, "/network");
}));

test("callback admits a verified, admitted account and establishes the browser session cookie", async () => {
  await withDir(async (dir) => {
    const { resource, established } = fixture(dir, { verifyResult: { verified: true, account: "emsenn0", publicKey: "STMxyz", role: "posting" } });
    const page = resource("ops-browser.login-hive").handler({ req: { headers: {} } });
    const nonceMatch = /var nonce = "([^"]+)"/.exec(page.body);
    const expiryMatch = /var expiry = (\d+)/.exec(page.body);
    assert.ok(nonceMatch && expiryMatch, "the page embeds a nonce and expiry");
    const nonce = nonceMatch[1];
    const expiry = Number(expiryMatch[1]);
    const message = JSON.stringify({ username: "emsenn0", type: "login", app: "ops.561.group", expiry, nonce });
    const response = await resource("ops-browser.login-hive-callback").handler(
      jsonRequest({ account: "emsenn0", message, signature: "sig", publicKey: "STMxyz", nonce }),
    );
    assert.equal(response.status, 303);
    assert.equal(response.headers.location, "/network");
    assert.deepEqual(response.headers["set-cookie"], [
      "__Host-ops_session=signed-emsenn0; Path=/",
      "__Host-ops_hive_login=; Max-Age=0; Path=/",
    ]);
    assert.deepEqual(established, ["emsenn0"]);
  });
});

test("a Hive challenge can only be completed by the browser that received its signed binding", async () => {
  await withDir(async (dir) => {
    let verified = 0;
    const browser = {
      validSession: () => null,
      mintHiveChallengeCookie: (nonce) => `challenge=${nonce}`,
      hiveChallengeFrom: (headers) => headers.cookie?.slice("challenge=".length) ?? null,
      clearHiveChallengeCookie: () => "challenge=; Max-Age=0",
      establishHiveSession: () => ({ cookieHeader: "session=ok" }),
    };
    const app = hiveLoginApp({
      stateDir: dir,
      browser,
      registry: { isHiveAdmitted: (account) => account === "operator" },
      verify: async () => { verified += 1; return { verified: true, account: "operator" }; },
    });
    const login = app.resources.find((resource) => resource.id === "ops-browser.login-hive");
    const callback = app.resources.find((resource) => resource.id === "ops-browser.login-hive-callback");
    const first = login.handler({ req: { headers: {} } });
    const second = login.handler({ req: { headers: {} } });
    const nonce = /var nonce = "([^"]+)"/.exec(first.body)[1];
    const expiry = Number(/var expiry = (\d+)/.exec(first.body)[1]);
    const message = JSON.stringify({ username: "operator", type: "login", app: "ops.561.group", expiry, nonce });
    const wrongBrowser = await callback.handler({
      ...jsonRequest({ account: "operator", message, signature: "wrong-browser", nonce }),
      req: Object.assign(jsonRequest({ account: "operator", message, signature: "wrong-browser", nonce }).req, { headers: { "content-type": "application/json", cookie: second.headers["set-cookie"] } }),
    });
    assert.equal(wrongBrowser.status, 403);
    assert.equal(verified, 0);
    const rightRequest = jsonRequest({ account: "operator", message, signature: "right-browser", nonce });
    rightRequest.req.headers.cookie = first.headers["set-cookie"];
    const rightBrowser = await callback.handler(rightRequest);
    assert.equal(rightBrowser.status, 303);
    assert.equal(verified, 1);
  });
});

test("callback refuses an unadmitted account with 403 naming the reason, without establishing a session", async () => {
  await withDir(async (dir) => {
    const { resource, established } = fixture(dir, { admitted: false, verifyResult: { verified: true, account: "emsenn0", publicKey: "STMxyz", role: "posting" } });
    const page = resource("ops-browser.login-hive").handler({ req: { headers: {} } });
    const nonce = /var nonce = "([^"]+)"/.exec(page.body)[1];
    const expiry = Number(/var expiry = (\d+)/.exec(page.body)[1]);
    const message = JSON.stringify({ username: "emsenn0", type: "login", app: "ops.561.group", expiry, nonce });
    const response = await resource("ops-browser.login-hive-callback").handler(
      jsonRequest({ account: "emsenn0", message, signature: "sig", publicKey: "STMxyz", nonce }),
    );
    assert.equal(response.status, 403);
    assert.match(JSON.parse(response.body).reason, /not an admitted principal/);
    assert.deepEqual(established, []);
  });
});

test("callback refuses a failed signature verification, naming the verification service's own reason", async () => {
  await withDir(async (dir) => {
    const { resource } = fixture(dir, { verifyResult: { verified: false, reason: "signature does not verify against the provided publicKey" } });
    const page = resource("ops-browser.login-hive").handler({ req: { headers: {} } });
    const nonce = /var nonce = "([^"]+)"/.exec(page.body)[1];
    const expiry = Number(/var expiry = (\d+)/.exec(page.body)[1]);
    const message = JSON.stringify({ username: "emsenn0", type: "login", app: "ops.561.group", expiry, nonce });
    const response = await resource("ops-browser.login-hive-callback").handler(
      jsonRequest({ account: "emsenn0", message, signature: "sig", publicKey: "STMxyz", nonce }),
    );
    assert.equal(response.status, 403);
    assert.equal(JSON.parse(response.body).reason, "signature does not verify against the provided publicKey");
  });
});

test("callback refuses a missing, already-used, or expired nonce", async () => {
  await withDir(async (dir) => {
    const { resource } = fixture(dir, { verifyResult: { verified: true, account: "emsenn0", publicKey: "STMxyz", role: "posting" } });
    const message = JSON.stringify({ username: "emsenn0", type: "login", app: "ops.561.group", expiry: 123, nonce: "never-minted" });
    const response = await resource("ops-browser.login-hive-callback").handler(
      jsonRequest({ account: "emsenn0", message, signature: "sig", publicKey: "STMxyz", nonce: "never-minted" }),
    );
    assert.equal(response.status, 403);
    assert.match(JSON.parse(response.body).reason, /invalid, expired, or already used/);
  });
});

test("callback refuses a message that does not match the minted challenge (wrong account, app, or nonce)", async () => {
  await withDir(async (dir) => {
    const { resource } = fixture(dir, { verifyResult: { verified: true, account: "emsenn0", publicKey: "STMxyz", role: "posting" } });
    const page = resource("ops-browser.login-hive").handler({ req: { headers: {} } });
    const nonce = /var nonce = "([^"]+)"/.exec(page.body)[1];
    const wrongMessage = JSON.stringify({ username: "someone-else", type: "login", app: "ops.561.group", expiry: 1, nonce });
    const response = await resource("ops-browser.login-hive-callback").handler(
      jsonRequest({ account: "emsenn0", message: wrongMessage, signature: "sig", publicKey: "STMxyz", nonce }),
    );
    assert.equal(response.status, 403);
    assert.match(JSON.parse(response.body).reason, /does not match the minted login challenge/);
  });
});

test("callback refuses a malformed JSON body with 400", async () => {
  await withDir(async (dir) => {
    const { resource } = fixture(dir);
    const req = Readable.from([Buffer.from("not json")]);
    req.headers = { "content-type": "application/json" };
    const response = await resource("ops-browser.login-hive-callback").handler({ req });
    assert.equal(response.status, 400);
  });
});
