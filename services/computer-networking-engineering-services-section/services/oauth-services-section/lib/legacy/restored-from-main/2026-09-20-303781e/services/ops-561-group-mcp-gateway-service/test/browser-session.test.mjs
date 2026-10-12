import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import test from "node:test";
import { createBrowserSessionAuth } from "../src/browser-session.mjs";

function cookiePair(setCookie) {
  return setCookie.split(";", 1)[0];
}

function fixture() {
  let milliseconds = 1_000_000;
  let sequence = 0;
  let emailAdmitted = true;
  let hiveAdmitted = true;
  let humanAdmitted = true;
  let registryBroken = false;
  const revoked = [];
  const exchanges = [];
  const oauth = {
    registerClient(body) {
      assert.equal(body.client_name, "ops.561.group browser");
      assert.deepEqual(body.redirect_uris, ["https://ops.561.group/auth/callback"]);
      return { client_id: "self-client" };
    },
    exchangeCode(input) {
      exchanges.push(input);
      return { access_token: "browser-access", refresh_token: "server-only-refresh", token_type: "Bearer", expires_in: 3600 };
    },
    validateToken(token) {
      return token === "browser-access" ? { email: "Operator@Example.invalid" } : null;
    },
    revoke(token) { revoked.push(token); },
  };
  const browser = createBrowserSessionAuth({
    publicBaseUrl: "https://ops.561.group",
    oauth,
    registry: {
      isEmailAdmitted: (email) => {
        if (registryBroken) throw new Error("registry unavailable");
        return emailAdmitted && email?.toLowerCase() === "operator@example.invalid";
      },
      isHiveAdmitted: (account) => {
        if (registryBroken) throw new Error("registry unavailable");
        return hiveAdmitted && account === "hive-operator";
      },
      isHumanAdmitted: (username) => humanAdmitted && username === "operator",
      verifyHumanPassword: (username, password) => humanAdmitted && username === "operator" && password === "correct horse battery staple",
    },
  }, {
    now: () => milliseconds,
    secret: "test-only-cookie-signing-secret",
    token: () => `opaque-${++sequence}`,
  });
  const resource = (id) => browser.app.resources.find((candidate) => candidate.id === id);
  return {
    browser, exchanges, revoked, resource,
    advance(ms) { milliseconds += ms; },
    revokeEmailAdmission() { emailAdmitted = false; },
    revokeHiveAdmission() { hiveAdmitted = false; },
    revokeHumanAdmission() { humanAdmitted = false; },
    breakRegistry() { registryBroken = true; },
  };
}

function formRequest(fields, headers = {}) {
  const req = Readable.from([Buffer.from(new URLSearchParams(fields).toString())]);
  req.method = "POST";
  req.headers = { "content-type": "application/x-www-form-urlencoded", ...headers };
  return req;
}

function startLogin(f) {
  const response = f.resource("ops-browser.login-google").handler({ req: { headers: {} } });
  const authorization = new URL(response.headers.location);
  return { response, authorization, flowCookie: cookiePair(response.headers["set-cookie"]) };
}

function completeLogin(f, login, overrides = {}) {
  const callback = new URL("https://ops.561.group/auth/callback");
  callback.searchParams.set("code", overrides.code ?? "authorization-code");
  callback.searchParams.set("state", overrides.state ?? login.authorization.searchParams.get("state"));
  return f.resource("ops-browser.callback").handler({
    req: { headers: { cookie: login.flowCookie } },
    url: callback,
  });
}

test("login initiates the existing authorization server with state, S256 PKCE, and a secure opaque flow cookie", () => {
  const f = fixture();
  const login = startLogin(f);
  assert.equal(login.response.status, 303);
  assert.equal(login.authorization.origin, "https://ops.561.group");
  assert.equal(login.authorization.pathname, "/oauth/authorize");
  assert.equal(login.authorization.searchParams.get("client_id"), "self-client");
  assert.equal(login.authorization.searchParams.get("redirect_uri"), "https://ops.561.group/auth/callback");
  assert.equal(login.authorization.searchParams.get("response_type"), "code");
  assert.equal(login.authorization.searchParams.get("code_challenge_method"), "S256");
  assert.ok(login.authorization.searchParams.get("state"));
  assert.match(login.response.headers["set-cookie"], /^__Host-ops_login=[^;]+; Max-Age=300; Path=\/; HttpOnly; Secure; SameSite=Lax$/);

  const completed = completeLogin(f, login);
  assert.equal(completed.status, 303);
  assert.equal(completed.headers.location, "/network");
  assert.equal(createHash("sha256").update(f.exchanges[0].code_verifier, "ascii").digest("base64url"), login.authorization.searchParams.get("code_challenge"));
  assert.equal(f.exchanges[0].redirect_uri, "https://ops.561.group/auth/callback");
  assert.doesNotMatch(JSON.stringify(completed), /browser-access|server-only-refresh|authorization-code/);
  assert.match(completed.headers["set-cookie"][1], /^__Host-ops_session=[^;]+; Max-Age=3600; Path=\/; HttpOnly; Secure; SameSite=Lax$/);
});
test("callback refuses mismatched, expired, and replayed state before code exchange", () => {
  const mismatched = fixture();
  const login = startLogin(mismatched);
  const refusal = completeLogin(mismatched, login, { state: "wrong" });
  assert.equal(refusal.status, 400);
  assert.equal(mismatched.exchanges.length, 0);
  assert.equal(completeLogin(mismatched, login).status, 400, "flow is one-use even after refusal");

  const expired = fixture();
  const expiringLogin = startLogin(expired);
  expired.advance(300_001);
  assert.equal(completeLogin(expired, expiringLogin).status, 400);
  assert.equal(expired.exchanges.length, 0);
});

test("opaque session admits HTML, expires, logs out, and never substitutes for bearer API authorization", async () => {
  const f = fixture();
  const login = startLogin(f);
  const completed = completeLogin(f, login);
  const sessionCookie = cookiePair(completed.headers["set-cookie"][1]);
  const inner = async () => ({ status: 204 });
  const bearerDecision = () => ({ status: 403, response: { status: 403 } });
  const guarded = f.browser.guardHandler(inner, bearerDecision);
  assert.equal((await guarded({ req: { headers: { cookie: sessionCookie } } })).status, 204);
  assert.equal((await guarded({ req: { headers: { cookie: sessionCookie, authorization: "Bearer wrong" } } })).status, 403);
  let bearerClaims;
  const bearerGuarded = f.browser.guardHandler(async (ctx) => { bearerClaims = ctx.claims; return { status: 204 }; }, () => ({ status: 200, claims: { actor: "actor:verified" } }));
  assert.equal((await bearerGuarded({ req: { headers: { authorization: "Bearer valid" } } })).status, 204);
  assert.deepEqual(bearerClaims, { actor: "actor:verified" });

  const logoutPage = await f.resource("ops-browser.logout").handler({ req: { headers: { cookie: sessionCookie } } });
  const csrf = /name="csrf" value="([^"]+)"/.exec(logoutPage.body)[1];
  const logout = await f.resource("ops-browser.logout").handler({ req: formRequest({ csrf }, { cookie: `${sessionCookie}; ${cookiePair(logoutPage.headers["set-cookie"])}`, origin: "https://ops.561.group" }) });
  assert.equal(logout.headers.location, "/");
  assert.match(logout.headers["set-cookie"][0], /Max-Age=0/);
  assert.deepEqual(f.revoked, ["browser-access"]);
  assert.equal((await guarded({ req: { headers: { cookie: sessionCookie } } })).headers.location, "/login");

  const expiring = fixture();
  const expiringSession = cookiePair(completeLogin(expiring, startLogin(expiring)).headers["set-cookie"][1]);
  expiring.advance(3_600_001);
  assert.equal((await expiring.browser.guardHandler(inner, bearerDecision)({ req: { headers: { cookie: expiringSession } } })).headers.location, "/login");
  assert.deepEqual(expiring.revoked, ["browser-access"]);
});

test("/login renders a chooser offering password first and configured external options after it", () => {
  const f = fixture();
  const response = f.resource("ops-browser.login").handler({ req: { headers: {} } });
  assert.equal(response.status, undefined, "no redirect status: this is a rendered page, not a 303");
  const passwordIndex = response.body.indexOf("/login/password");
  const hiveIndex = response.body.indexOf("/login/hive");
  const googleIndex = response.body.indexOf("/login/google");
  assert.ok(passwordIndex >= 0, "the chooser links to /login/password");
  assert.ok(hiveIndex >= 0, "the chooser links to /login/hive");
  assert.ok(googleIndex >= 0, "the chooser still links to /login/google");
  assert.ok(passwordIndex < googleIndex, "password is offered before Google");
});

test("password form establishes the shared signed session, rejects malformed CSRF and wrong credentials, and respects revocation", async () => {
  const f = fixture();
  const get = await f.resource("ops-browser.login-password").handler({ req: { headers: {} } });
  const csrf = /name="csrf" value="([^"]+)"/.exec(get.body)[1];
  const flowCookie = cookiePair(get.headers["set-cookie"]);
  const submit = f.resource("ops-browser.login-password");
  const malformed = await submit.handler({ req: formRequest({ username: "operator", password: "correct horse battery staple" }, { cookie: flowCookie, origin: "https://ops.561.group" }) });
  assert.equal(malformed.status, 403);
  const wrong = await submit.handler({ req: formRequest({ csrf, username: "operator", password: "wrong password" }, { cookie: flowCookie, origin: "https://ops.561.group" }) });
  assert.equal(wrong.status, 401);
  f.advance(1_001);
  const nextCsrf = /name="csrf" value="([^"]+)"/.exec(wrong.body)[1];
  const session = await submit.handler({ req: formRequest({ csrf: nextCsrf, username: "operator", password: "correct horse battery staple" }, { cookie: cookiePair(wrong.headers["set-cookie"]), origin: "https://ops.561.group" }) });
  assert.equal(session.status, 303);
  assert.equal(session.headers.location, "/network");
  const sessionCookie = cookiePair(session.headers["set-cookie"][1]);
  assert.deepEqual(f.browser.validSession({ cookie: sessionCookie }).claims, { kind: "human", username: "operator" });
  f.revokeHumanAdmission();
  assert.equal(f.browser.validSession({ cookie: sessionCookie }), null);
});

test("the assembled browser app exposes one /login/password resource that admits GET and POST", () => {
  const f = fixture();
  const resources = f.browser.app.resources.filter((resource) => resource.match === "/login/password");
  assert.equal(resources.length, 1);
  assert.deepEqual(resources[0].methods, ["GET", "POST"]);
});

test("password attempts throttle with bounded refusal and never put the password in a response", async () => {
  const f = fixture();
  const get = await f.resource("ops-browser.login-password").handler({ req: { headers: {} } });
  const csrf = /name="csrf" value="([^"]+)"/.exec(get.body)[1];
  const response = await f.resource("ops-browser.login-password").handler({ req: formRequest({ csrf, username: "unknown", password: "correct horse battery staple" }, { cookie: cookiePair(get.headers["set-cookie"]), origin: "https://ops.561.group" }) });
  assert.equal(response.status, 401);
  assert.doesNotMatch(response.body, /correct horse battery staple/);
  const second = await f.resource("ops-browser.login-password").handler({ req: formRequest({ csrf: /name="csrf" value="([^"]+)"/.exec(response.body)[1], username: "unknown", password: "correct horse battery staple" }, { cookie: cookiePair(response.headers["set-cookie"]), origin: "https://ops.561.group" }) });
  assert.equal(second.status, 401);
});

test("password throttling canonicalizes username case and surrounding whitespace", async () => {
  const f = fixture();
  const get = await f.resource("ops-browser.login-password").handler({ req: { headers: {} } });
  const csrf = /name="csrf" value="([^"]+)"/.exec(get.body)[1];
  const first = await f.resource("ops-browser.login-password").handler({ req: formRequest({ csrf, username: " Operator ", password: "wrong password" }, { cookie: cookiePair(get.headers["set-cookie"]), origin: "https://ops.561.group" }) });
  assert.equal(first.status, 401);
  const second = await f.resource("ops-browser.login-password").handler({ req: formRequest({ csrf: /name="csrf" value="([^"]+)"/.exec(first.body)[1], username: "operator", password: "correct horse battery staple" }, { cookie: cookiePair(first.headers["set-cookie"]), origin: "https://ops.561.group" }) });
  assert.equal(second.status, 401, "a casing or whitespace variation cannot bypass the active throttle");
});

test("/login redirects straight to /network for an already-valid session, chooser or not", () => {
  const f = fixture();
  const completed = completeLogin(f, startLogin(f));
  const sessionCookie = cookiePair(completed.headers["set-cookie"][1]);
  const response = f.resource("ops-browser.login").handler({ req: { headers: { cookie: sessionCookie } } });
  assert.equal(response.status, 303);
  assert.equal(response.headers.location, "/network");
});

test("establishHiveSession sets the same session cookie shape the Google flow sets, and it validates and logs out the same way", async () => {
  const f = fixture();
  const { cookieHeader } = f.browser.establishHiveSession("hive-operator");
  assert.match(cookieHeader, /^__Host-ops_session=[^;]+; Max-Age=3600; Path=\/; HttpOnly; Secure; SameSite=Lax$/);
  const sessionCookie = cookiePair(cookieHeader);

  const session = f.browser.validSession({ cookie: sessionCookie });
  assert.deepEqual(session.claims, { kind: "hive", account: "hive-operator" });

  const inner = async () => ({ status: 204 });
  const bearerDecision = () => ({ status: 403, response: { status: 403 } });
  const guarded = f.browser.guardHandler(inner, bearerDecision);
  assert.equal((await guarded({ req: { headers: { cookie: sessionCookie } } })).status, 204);

  const logoutPage = await f.resource("ops-browser.logout").handler({ req: { headers: { cookie: sessionCookie } } });
  const csrf = /name="csrf" value="([^"]+)"/.exec(logoutPage.body)[1];
  const logout = await f.resource("ops-browser.logout").handler({ req: formRequest({ csrf }, { cookie: `${sessionCookie}; ${cookiePair(logoutPage.headers["set-cookie"])}`, origin: "https://ops.561.group" }) });
  assert.equal(logout.headers.location, "/");
  assert.deepEqual(f.revoked, [], "a Hive session never asks the OAuth server to revoke a token it never minted");
  assert.equal((await guarded({ req: { headers: { cookie: sessionCookie } } })).headers.location, "/login");
});

test("establishHiveSession expires like any other session", async () => {
  const f = fixture();
  const { cookieHeader } = f.browser.establishHiveSession("hive-operator");
  const sessionCookie = cookiePair(cookieHeader);
  f.advance(3_600_001);
  assert.equal(f.browser.validSession({ cookie: sessionCookie }), null);
});

test("each protected browser request rechecks registry admission and clears a revoked session", async () => {
  const f = fixture();
  const googleCookie = cookiePair(completeLogin(f, startLogin(f)).headers["set-cookie"][1]);
  f.revokeEmailAdmission();
  const guarded = f.browser.guardHandler(async () => ({ status: 204 }), () => ({ status: 401, response: { status: 401 } }));
  const googleRefusal = await guarded({ req: { headers: { cookie: googleCookie } } });
  assert.equal(googleRefusal.status, 303);
  assert.match(googleRefusal.headers["set-cookie"], /__Host-ops_session=.*Max-Age=0/);
  assert.deepEqual(f.revoked, ["browser-access"]);

  const hive = fixture();
  const hiveCookie = cookiePair(hive.browser.establishHiveSession("hive-operator").cookieHeader);
  hive.revokeHiveAdmission();
  const hiveRefusal = await hive.browser.guardHandler(async () => ({ status: 204 }), () => ({ status: 401, response: { status: 401 } }))({ req: { headers: { cookie: hiveCookie } } });
  assert.equal(hiveRefusal.status, 303);
  assert.match(hiveRefusal.headers["set-cookie"], /__Host-ops_session=.*Max-Age=0/);
});

test("a registry read error fails closed before the protected browser handler", async () => {
  const f = fixture();
  const sessionCookie = cookiePair(completeLogin(f, startLogin(f)).headers["set-cookie"][1]);
  f.breakRegistry();
  let called = false;
  const response = await f.browser.guardHandler(async () => { called = true; return { status: 204 }; }, () => ({ status: 401, response: { status: 401 } }))({ req: { headers: { cookie: sessionCookie } } });
  assert.equal(called, false);
  assert.equal(response.status, 303);
  assert.match(response.headers["set-cookie"], /Max-Age=0/);
});

test("the documented allowedEmail-only browser API retains Google admission but never admits Hive", () => {
  const oauth = {
    registerClient: () => ({ client_id: "self" }),
    exchangeCode: () => ({ access_token: "token", expires_in: 60 }),
    validateToken: () => ({ email: "operator@example.invalid" }),
    revoke() {},
  };
  const browser = createBrowserSessionAuth({ publicBaseUrl: "https://ops.561.group", allowedEmail: "operator@example.invalid", oauth }, { secret: "test", token: () => "token" });
  assert.equal(browser.validSession({ cookie: "__Host-ops_session=forged" }), null);
  assert.equal(browser.establishHiveSession("operator").sessionId, "token");
  assert.equal(browser.validSession({ cookie: browser.establishHiveSession("operator").cookieHeader.split(";", 1)[0] }), null);
});
