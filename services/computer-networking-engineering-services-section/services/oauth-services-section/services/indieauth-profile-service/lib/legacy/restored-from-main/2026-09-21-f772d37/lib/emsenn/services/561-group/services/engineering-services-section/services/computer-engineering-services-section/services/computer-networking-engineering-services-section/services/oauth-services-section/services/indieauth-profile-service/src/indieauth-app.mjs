import { jsonRepr } from "@red-cup-engineering/http-services-section/representation";
import { mintAuthorizationRequest } from "@red-cup-engineering/oauth-services-section/mint-authorization-request-service";
import { readFormBody } from "@red-cup-engineering/http-services-section/body";
import { redeemAuthorizationCode } from "@red-cup-engineering/oauth-services-section/redeem-authorization-code-service";
import {
  indieAuthAuthorizationServerMetadata,
  resolveIndieAuthClient,
  validateIndieAuthRedirectUri,
  validateProfileUrl,
} from "./indieauth-profile.mjs";

const PKCE_CHALLENGE = /^[A-Za-z0-9._~-]{43,128}$/;

function oauthError(error, description, status = 400) {
  return jsonRepr({ error, ...(description ? { error_description: description } : {}) }, {
    status,
    cacheControl: { noStore: true },
    headers: { pragma: "no-cache" },
  });
}

function errorDescription(error) {
  return error instanceof Error ? error.message : String(error);
}

function scopes(value) {
  const values = Array.isArray(value) ? value : String(value ?? "").split(/\s+/);
  return Object.freeze([...new Set(values.map(String).filter(Boolean))].sort());
}

function authorizationRequest(params, profileUrl) {
  if (params.get("response_type") !== "code") throw Object.assign(new TypeError("response_type must be code"), { oauthCode: "unsupported_response_type" });
  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const state = params.get("state");
  if (!state) throw new TypeError("state is required");
  const challenge = params.get("code_challenge") ?? "";
  if (!PKCE_CHALLENGE.test(challenge)) throw new TypeError("code_challenge must contain 43-128 PKCE characters");
  if (params.get("code_challenge_method") !== "S256") throw new TypeError("code_challenge_method must be S256");
  const requestedMe = params.get("me");
  if (requestedMe) {
    const validation = validateProfileUrl(requestedMe);
    if (!validation.valid || validation.url !== profileUrl) throw new TypeError("me does not match this authorization server profile");
  }
  return Object.freeze({ clientId, redirectUri, state, challenge, requestedScopes: scopes(params.get("scope")) });
}

function redirectResponse(redirectUri, values) {
  const target = new URL(redirectUri);
  for (const [name, value] of Object.entries(values)) if (value !== undefined) target.searchParams.set(name, value);
  return { status: 302, headers: { location: target.href, "cache-control": "no-store", pragma: "no-cache" } };
}

function requireOptions(options) {
  const profile = validateProfileUrl(options?.profileUrl);
  if (!profile.valid) throw new TypeError(`profileUrl is invalid: ${profile.reason}`);
  for (const [path, value] of Object.entries(options.paths ?? {})) {
    if (typeof value !== "string" || !value.startsWith("/") || value.includes("?") || value.includes("#")) {
      throw new TypeError(`paths.${path} must be an absolute path`);
    }
  }
  if (typeof options.authorization?.authorize !== "function") throw new TypeError("authorization.authorize is required");
  if (typeof options.codes?.issue !== "function" || typeof options.codes?.get !== "function" || typeof options.codes?.consume !== "function") {
    throw new TypeError("codes must provide issue, get, and consume custody operations");
  }
  if (typeof options.tokens?.put !== "function") throw new TypeError("tokens.put is required");
  return profile.url;
}

async function parsedForm(ctx) {
  try { return await readFormBody(ctx.req, { maxBytes: 64_000 }); }
  catch { return null; }
}

async function verifiedRedemption(form, options, { scoped }) {
  if (form.get("grant_type") !== "authorization_code") {
    throw Object.assign(new TypeError("grant_type must be authorization_code"), { oauthCode: "unsupported_grant_type" });
  }
  const code = form.get("code") ?? "";
  const record = await options.codes.get(code);
  if (!record) throw Object.assign(new TypeError("authorization code is invalid or expired"), { oauthCode: "invalid_grant" });
  if (scoped && !record.scope) throw Object.assign(new TypeError("authorization code was not issued for an access token"), { oauthCode: "invalid_grant" });
  if (!scoped && record.scope) throw Object.assign(new TypeError("scoped authorization codes must be redeemed at the token endpoint"), { oauthCode: "invalid_grant" });
  const minted = redeemAuthorizationCode({
    record: { ...record, email: record.me },
    clientId: form.get("client_id") ?? "",
    codeVerifier: form.get("code_verifier") ?? "",
    redirectUri: form.get("redirect_uri") ?? "",
  });
  if (await options.codes.consume(code, record) !== true) {
    throw Object.assign(new TypeError("authorization code was already consumed"), { oauthCode: "invalid_grant" });
  }
  return { record, minted };
}

function resourcePaths(options) {
  return {
    authorization: "/indieauth/authorize",
    token: "/indieauth/token",
    metadata: "/.well-known/oauth-authorization-server",
    ...(options.paths ?? {}),
  };
}

/** Compose IndieAuth discovery, authorization, code exchange, and token resources. */
export function indieAuthApp(options) {
  const profileUrl = requireOptions(options);
  const paths = resourcePaths(options);
  const issuer = options.issuer ?? new URL("/", profileUrl).href;
  const metadata = indieAuthAuthorizationServerMetadata({
    issuer,
    authorizationEndpoint: new URL(paths.authorization, issuer).href,
    tokenEndpoint: new URL(paths.token, issuer).href,
    scopes: options.scopes ?? [],
  });
  const clientIo = {
    fetchImpl: options.fetchImpl,
    ...(options.admitFetch === undefined ? {} : { admitFetch: options.admitFetch }),
    ...(options.clientCustody === undefined ? {} : { custody: options.clientCustody }),
    ...(options.maxClientBytes === undefined ? {} : { maxClientBytes: options.maxClientBytes }),
  };
  return Object.freeze({
    resources: Object.freeze([
      Object.freeze({
        id: "indieauth.metadata",
        name: "IndieAuth Authorization Server Metadata",
        match: paths.metadata,
        route: paths.metadata,
        methods: Object.freeze(["GET", "HEAD"]),
        produces: Object.freeze(["application/json"]),
        handler() {
          return jsonRepr(metadata, { cacheControl: { maxAge: 300 }, headers: { vary: "accept" } });
        },
      }),
      Object.freeze({
        id: "indieauth.authorization",
        name: "IndieAuth Authorization",
        match: paths.authorization,
        route: paths.authorization,
        methods: Object.freeze(["GET", "POST"]),
        produces: Object.freeze(["application/json"]),
        async handler(ctx) {
          if (ctx.req.method === "POST") {
            const form = await parsedForm(ctx);
            if (!form) return oauthError("invalid_request", "expected an application/x-www-form-urlencoded body");
            try {
              const { record } = await verifiedRedemption(form, options, { scoped: false });
              return jsonRepr({ me: record.me }, { cacheControl: { noStore: true }, headers: { pragma: "no-cache" } });
            } catch (error) {
              return oauthError(error.oauthCode ?? "invalid_grant", errorDescription(error));
            }
          }
          let request;
          let client;
          try {
            request = authorizationRequest(ctx.url.searchParams, profileUrl);
            client = await resolveIndieAuthClient(request.clientId, clientIo);
            validateIndieAuthRedirectUri(client, request.redirectUri);
          } catch (error) {
            return oauthError(error.oauthCode ?? "invalid_request", errorDescription(error));
          }
          let decision;
          try {
            decision = await options.authorization.authorize(Object.freeze({
              profileUrl,
              client,
              requestedScopes: request.requestedScopes,
              context: ctx,
            }));
          } catch (error) {
            return oauthError("server_error", errorDescription(error), 500);
          }
          if (!decision?.approved) {
            return redirectResponse(request.redirectUri, {
              error: decision?.error ?? "access_denied",
              error_description: decision?.description,
              state: request.state,
              iss: metadata.issuer,
            });
          }
          const approvedScopes = scopes(decision.scopes ?? request.requestedScopes);
          if (approvedScopes.some((scope) => !request.requestedScopes.includes(scope))) {
            return oauthError("server_error", "authorization adapter approved a scope the client did not request", 500);
          }
          let pending;
          try {
            pending = mintAuthorizationRequest({
              client: client.oauthClient,
              redirectUri: request.redirectUri,
              codeChallenge: request.challenge,
              codeChallengeMethod: "S256",
              state: request.state,
            });
            const record = Object.freeze({
              ...pending.record,
              me: profileUrl,
              scope: approvedScopes.join(" "),
              issuer: metadata.issuer,
            });
            const code = await options.codes.issue(record);
            if (typeof code !== "string" || code.length < 16) throw new TypeError("codes.issue must return an opaque code of at least 16 characters");
            return redirectResponse(request.redirectUri, { code, state: request.state, iss: metadata.issuer });
          } catch (error) {
            return oauthError(error.oauthCode ?? "server_error", errorDescription(error), 500);
          }
        },
      }),
      Object.freeze({
        id: "indieauth.token",
        name: "IndieAuth Token",
        match: paths.token,
        route: paths.token,
        methods: Object.freeze(["POST"]),
        produces: Object.freeze(["application/json"]),
        async handler(ctx) {
          const form = await parsedForm(ctx);
          if (!form) return oauthError("invalid_request", "expected an application/x-www-form-urlencoded body");
          try {
            const { record, minted } = await verifiedRedemption(form, options, { scoped: true });
            const tokenRecord = Object.freeze({
              client_id: record.client_id,
              me: record.me,
              scope: record.scope,
              expires_at: minted.tokenRecord.expires_at,
            });
            try { await options.tokens.put(minted.accessToken, tokenRecord); }
            catch (error) { return oauthError("server_error", errorDescription(error), 500); }
            return jsonRepr({
              access_token: minted.accessToken,
              token_type: "Bearer",
              expires_in: minted.response.expires_in,
              me: record.me,
              scope: record.scope,
            }, { cacheControl: { noStore: true }, headers: { pragma: "no-cache" } });
          } catch (error) {
            return oauthError(error.oauthCode ?? "invalid_grant", errorDescription(error));
          }
        },
      }),
    ]),
  });
}
