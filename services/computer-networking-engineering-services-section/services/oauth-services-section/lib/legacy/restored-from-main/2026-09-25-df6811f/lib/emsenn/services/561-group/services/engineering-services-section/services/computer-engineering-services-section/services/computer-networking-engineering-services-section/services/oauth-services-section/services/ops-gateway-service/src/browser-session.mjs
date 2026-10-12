import { createHash, randomBytes } from "node:crypto";

import { parseCookieHeader, serializeSetCookie } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/cookie";
import { htmlRepr, jsonRepr } from "@red-cup-engineering/http-services-section/representation";
import { signCookieValue, unsignCookieValue } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/signed-cookie";
import { readFormBody } from "@red-cup-engineering/http-services-section/body";
import { renderLoginPage } from "./login-page.mjs";
import { createPrincipalRegistry } from "./principal-registry.mjs";

const FLOW_COOKIE = "__Host-ops_login";
const HIVE_FLOW_COOKIE = "__Host-ops_hive_login";
const PASSWORD_FLOW_COOKIE = "__Host-ops_password_login";
const LOGOUT_FLOW_COOKIE = "__Host-ops_logout";
const SESSION_COOKIE = "__Host-ops_session";
const FLOW_TTL_MS = 300_000;
const SESSION_TTL_MS = 3_600_000;
const COOKIE_OPTIONS = Object.freeze({ path: "/", httpOnly: true, secure: true, sameSite: "Lax" });

function redirect(location, headers = {}) {
  return { status: 303, headers: { location, ...headers }, cacheControl: { noStore: true } };
}
function clearCookie(name) {
  return serializeSetCookie(name, "", { ...COOKIE_OPTIONS, expires: new Date(0), maxAge: 0 });
}

function callbackRefusal(reason) {
  return jsonRepr({ error: "authorization_refused", reason }, {
    status: 400,
    headers: { "set-cookie": clearCookie(FLOW_COOKIE) },
    cacheControl: { noStore: true },
  });
}

function header(headers, name) {
  const value = headers?.[name];
  return Array.isArray(value) ? value.join("; ") : value;
}

// The chooser only shows configured browser login methods.
function loginChooserHtml({ passwordLoginConfigured, googleLoginConfigured, hiveLoginConfigured }) {
  return renderLoginPage("Sign in — ops.561.group", "<h1>Sign in to ops.561.group</h1>"
    + "<p>Open your work and books with an admitted account.</p>"
    + (passwordLoginConfigured ? "<p><a href=\"/login/password\">Sign in with username and password</a></p>" : "")
    + (googleLoginConfigured ? "<p><a href=\"/login/google\">Sign in with Google</a></p>" : "")
    + (hiveLoginConfigured ? "<p><a href=\"/login/hive\">Sign in with Hive Keychain</a></p>" : "")
    );
}

function passwordLoginHtml(csrf, { failed = false } = {}) {
  return renderLoginPage("Sign in with password — ops.561.group", "<h1>Sign in with username and password</h1>"
    + (failed ? "<p role=\"alert\">Sign-in was refused.</p>" : "")
    + "<form method=\"post\" action=\"/login/password\">"
    + `<input type="hidden" name="csrf" value="${csrf}" />`
    + "<p><label>Username <input name=\"username\" autocomplete=\"username\" required /></label></p>"
    + "<p><label>Password <input name=\"password\" type=\"password\" autocomplete=\"current-password\" required /></label></p>"
    + "<p><button type=\"submit\">Sign in</button></p></form>"
    + "<p><a href=\"/login\">Other sign-in methods</a></p>");
}

/** Compose the existing OAuth authority into a first-party browser session. */
export function createBrowserSessionAuth({ publicBaseUrl, allowedEmail, oauth, registry, googleLoginConfigured = true, hiveLoginConfigured = true, passwordLoginConfigured = true }, {
  now = Date.now,
  token = (bytes) => randomBytes(bytes).toString("base64url"),
  secret = token(32),
} = {}) {
  const principals = registry ?? createPrincipalRegistry({ allowedEmail });
  const callbackUrl = `${publicBaseUrl}/auth/callback`;
  const flows = new Map();
  const sessions = new Map();
  const attempts = new Map();
  let client;

  function selfClient() {
    if (client !== undefined) return client;
    client = oauth.registerClient({
      client_name: "ops.561.group browser",
      redirect_uris: [callbackUrl],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    });
    if (typeof client?.client_id !== "string" || client.client_id === "") throw new TypeError("OAuth self-client registration did not return a client_id");
    return client;
  }

  function signedCookie(name, value, maxAge) {
    return serializeSetCookie(name, signCookieValue(value, secret, name), { ...COOKIE_OPTIONS, maxAge });
  }

  function readSignedCookie(headers, name) {
    const raw = parseCookieHeader(header(headers, "cookie"))[name];
    return raw === undefined ? null : unsignCookieValue(raw, secret, name);
  }

  function isSameOrigin(headers) {
    const origin = header(headers, "origin");
    return typeof origin === "string" && origin === publicBaseUrl;
  }

  function loginThrottle(username) {
    const record = attempts.get(username);
    return record?.until > now();
  }

  function recordFailure(username) {
    if (attempts.size >= 4096 && !attempts.has(username)) attempts.delete(attempts.keys().next().value);
    const prior = attempts.get(username) ?? { failures: 0, until: 0 };
    const failures = Math.min(prior.failures + 1, 8);
    attempts.set(username, { failures, until: now() + Math.min(60_000, 1000 * (2 ** (failures - 1))) });
  }

  function clearFailures(username) { attempts.delete(username); }

  // Every browser session lives in the one `sessions` Map, keyed by the
  // opaque session id the __Host-ops_session cookie carries, regardless of
  // which principal kind established it: `{kind:"google", accessToken,
  // expiresAt}` (the OAuth-mediated flow) or `{kind:"hive", account,
  // expiresAt}` (Hive Keychain, no OAuth token involved).
  function validSession(headers) {
    const id = readSignedCookie(headers, SESSION_COOKIE);
    if (id === null) return null;
    const session = sessions.get(id);
    if (!session || session.expiresAt <= now()) {
      sessions.delete(id);
      if (session?.kind !== "hive" && session) oauth.revoke(session.accessToken);
      return null;
    }
    if (session.kind === "hive") {
      try {
        if (principals.isHiveAdmitted(session.account)) return Object.freeze({ id, claims: { kind: "hive", account: session.account } });
      } catch {
        sessions.delete(id);
        return null;
      }
      sessions.delete(id);
      return null;
    }
    if (session.kind === "human") {
      try {
        if (principals.isHumanAdmitted(session.username)) return Object.freeze({ id, claims: { kind: "human", username: session.username } });
      } catch { /* fail closed */ }
      sessions.delete(id);
      return null;
    }
    let claims;
    try {
      claims = oauth.validateToken(session.accessToken);
      if (claims && principals.isEmailAdmitted(claims.email)) return Object.freeze({ id, claims: { kind: "google", ...claims } });
    } catch {
      // A failed authority lookup cannot retain a browser session.
    }
    {
      sessions.delete(id);
      try { oauth.revoke(session.accessToken); } catch { /* Session deletion is the fail-closed boundary. */ }
      return null;
    }
  }

  /**
   * Establish the same browser session cookie the Google flow's callback
   * establishes, for an account already verified and admitted through Hive
   * Keychain.
   * @param {string} account
   * @param {number} [ttlMs]
   * @returns {{ sessionId: string, cookieHeader: string }}
   */
  function establishHiveSession(account, ttlMs = SESSION_TTL_MS) {
    const sessionId = token(32);
    sessions.set(sessionId, { kind: "hive", account, expiresAt: now() + ttlMs });
    return { sessionId, cookieHeader: signedCookie(SESSION_COOKIE, sessionId, Math.floor(ttlMs / 1000)) };
  }

  function establishHumanSession(username, ttlMs = SESSION_TTL_MS) {
    const sessionId = token(32);
    sessions.set(sessionId, { kind: "human", username, expiresAt: now() + ttlMs });
    return { sessionId, cookieHeader: signedCookie(SESSION_COOKIE, sessionId, Math.floor(ttlMs / 1000)) };
  }

  function mintHiveChallengeCookie(nonce, ttlMs) {
    return signedCookie(HIVE_FLOW_COOKIE, nonce, Math.floor(ttlMs / 1000));
  }

  function hiveChallengeFrom(headers) {
    return readSignedCookie(headers, HIVE_FLOW_COOKIE);
  }

  function clearHiveChallengeCookie() {
    return clearCookie(HIVE_FLOW_COOKIE);
  }

  const app = { resources: [
    {
      id: "ops-browser.home",
      match: "/",
      methods: ["GET"],
      handler: () => redirect("/network"),
    },
    {
      id: "ops-browser.login",
      match: "/login",
      methods: ["GET"],
      produces: ["text/html"],
      handler: (ctx) => {
        if (validSession(ctx.req.headers)) return redirect("/network");
        return htmlRepr(loginChooserHtml({ passwordLoginConfigured, googleLoginConfigured, hiveLoginConfigured }), { cacheControl: { noStore: true } });
      },
    },
    {
      id: "ops-browser.login-password",
      match: "/login/password",
      methods: ["GET", "POST"],
      produces: ["text/html"],
      handler: async (ctx) => {
        if ((ctx.req.method ?? "GET").toUpperCase() === "GET") {
          if (validSession(ctx.req.headers)) return redirect("/network");
          if (!passwordLoginConfigured) return redirect("/login");
          const csrf = token(24);
          return htmlRepr(passwordLoginHtml(csrf), { headers: { "set-cookie": signedCookie(PASSWORD_FLOW_COOKIE, csrf, FLOW_TTL_MS / 1000) }, cacheControl: { noStore: true } });
        }
        const refuse = (status = 403) => ({ status, headers: { "set-cookie": clearCookie(PASSWORD_FLOW_COOKIE) }, cacheControl: { noStore: true } });
        if (!passwordLoginConfigured || !isSameOrigin(ctx.req.headers)) return refuse();
        let form;
        try { form = await readFormBody(ctx.req, { maxBytes: 4096 }); } catch { return refuse(400); }
        const csrf = form.get("csrf");
        const boundCsrf = readSignedCookie(ctx.req.headers, PASSWORD_FLOW_COOKIE);
        if (typeof csrf !== "string" || boundCsrf === null || csrf !== boundCsrf) return refuse();
        const username = form.get("username") ?? "";
        const usernameKey = typeof username === "string" ? username.trim().toLowerCase() : "";
        const password = form.get("password") ?? "";
        let admitted = false;
        try { admitted = !loginThrottle(usernameKey) && principals.verifyHumanPassword(username, password); } catch { admitted = false; }
        if (!admitted) {
          recordFailure(usernameKey);
          const replacementCsrf = token(24);
          return htmlRepr(passwordLoginHtml(replacementCsrf, { failed: true }), { status: 401, headers: { "set-cookie": signedCookie(PASSWORD_FLOW_COOKIE, replacementCsrf, FLOW_TTL_MS / 1000) }, cacheControl: { noStore: true } });
        }
        clearFailures(usernameKey);
        const { cookieHeader } = establishHumanSession(usernameKey);
        return redirect("/network", { "set-cookie": [clearCookie(PASSWORD_FLOW_COOKIE), cookieHeader] });
      },
    },
    {
      id: "ops-browser.login-google",
      match: "/login/google",
      methods: ["GET"],
      handler: (ctx) => {
        if (!googleLoginConfigured) return redirect("/login");
        if (validSession(ctx.req.headers)) return redirect("/network");
        const verifier = token(32);
        const challenge = createHash("sha256").update(verifier, "ascii").digest("base64url");
        const flowId = token(24);
        const state = token(24);
        flows.set(flowId, { state, verifier, expiresAt: now() + FLOW_TTL_MS });
        const authorize = new URL("/oauth/authorize", publicBaseUrl);
        authorize.searchParams.set("client_id", selfClient().client_id);
        authorize.searchParams.set("redirect_uri", callbackUrl);
        authorize.searchParams.set("response_type", "code");
        authorize.searchParams.set("code_challenge", challenge);
        authorize.searchParams.set("code_challenge_method", "S256");
        authorize.searchParams.set("state", state);
        return redirect(authorize.toString(), { "set-cookie": signedCookie(FLOW_COOKIE, flowId, FLOW_TTL_MS / 1000) });
      },
    },
    {
      id: "ops-browser.callback",
      match: "/auth/callback",
      methods: ["GET"],
      handler: (ctx) => {
        const flowId = readSignedCookie(ctx.req.headers, FLOW_COOKIE);
        const flow = flowId === null ? undefined : flows.get(flowId);
        if (flowId !== null) flows.delete(flowId);
        const state = ctx.url.searchParams.get("state");
        const code = ctx.url.searchParams.get("code");
        if (!flow || flow.expiresAt <= now() || !state || state !== flow.state || !code) return callbackRefusal("invalid or expired authorization state");
        let tokenResponse;
        try {
          tokenResponse = oauth.exchangeCode({
            client_id: selfClient().client_id,
            code,
            code_verifier: flow.verifier,
            redirect_uri: callbackUrl,
          });
        } catch {
          return callbackRefusal("authorization code exchange failed");
        }
        const accessToken = tokenResponse?.access_token;
        const tokenLifetime = Number(tokenResponse?.expires_in) * 1000;
        const claims = typeof accessToken === "string" ? oauth.validateToken(accessToken) : null;
        let admitted = false;
        try { admitted = Boolean(claims && principals.isEmailAdmitted(claims.email)); } catch { admitted = false; }
        if (!admitted || !Number.isFinite(tokenLifetime) || tokenLifetime <= 0) {
          if (typeof accessToken === "string") oauth.revoke(accessToken);
          return callbackRefusal("authorized principal was not admitted");
        }
        const sessionId = token(32);
        const ttl = Math.min(tokenLifetime, SESSION_TTL_MS);
        sessions.set(sessionId, { kind: "google", accessToken, expiresAt: now() + ttl });
        return redirect("/network", { "set-cookie": [
          clearCookie(FLOW_COOKIE),
          signedCookie(SESSION_COOKIE, sessionId, Math.floor(ttl / 1000)),
        ] });
      },
    },
    {
      id: "ops-browser.logout",
      match: "/logout",
      methods: ["GET", "POST"],
      handler: async (ctx) => {
        if ((ctx.req.method ?? "GET").toUpperCase() === "GET") {
          if (!validSession(ctx.req.headers)) return redirect("/login", { "set-cookie": clearCookie(SESSION_COOKIE) });
          const csrf = token(24);
          return htmlRepr(renderLoginPage("Sign out — ops.561.group", "<h1>Sign out</h1><form method=\"post\" action=\"/logout\">"
            + `<input type="hidden" name="csrf" value="${csrf}" /><button type="submit">Sign out</button></form>`), { headers: { "set-cookie": signedCookie(LOGOUT_FLOW_COOKIE, csrf, FLOW_TTL_MS / 1000) }, cacheControl: { noStore: true } });
        }
        if (!isSameOrigin(ctx.req.headers)) return { status: 403, headers: { "set-cookie": clearCookie(LOGOUT_FLOW_COOKIE) }, cacheControl: { noStore: true } };
        let form;
        try { form = await readFormBody(ctx.req, { maxBytes: 1024 }); } catch { return { status: 400, headers: { "set-cookie": clearCookie(LOGOUT_FLOW_COOKIE) }, cacheControl: { noStore: true } }; }
        const csrf = form.get("csrf");
        if (typeof csrf !== "string" || readSignedCookie(ctx.req.headers, LOGOUT_FLOW_COOKIE) !== csrf) return { status: 403, headers: { "set-cookie": clearCookie(LOGOUT_FLOW_COOKIE) }, cacheControl: { noStore: true } };
        const session = validSession(ctx.req.headers);
        if (session) {
          const record = sessions.get(session.id);
          sessions.delete(session.id);
          if (record && record.kind === "google") oauth.revoke(record.accessToken);
        }
        return redirect("/", { "set-cookie": [clearCookie(SESSION_COOKIE), clearCookie(LOGOUT_FLOW_COOKIE)] });
      },
    },
  ] };

  function guardHandler(inner, bearerDecision) {
    return async (ctx) => {
      if (header(ctx.req.headers, "authorization") !== undefined) {
        const decision = bearerDecision(ctx.req.headers);
        return decision.status === 200 ? inner({ ...ctx, claims: decision.claims }) : decision.response;
      }
      const session = validSession(ctx.req.headers);
      return session ? inner({ ...ctx, claims: session.claims }) : redirect("/login", { "set-cookie": clearCookie(SESSION_COOKIE) });
    };
  }

  return Object.freeze({ app, guardHandler, validSession, establishHiveSession, establishHumanSession, mintHiveChallengeCookie, hiveChallengeFrom, clearHiveChallengeCookie });
}
