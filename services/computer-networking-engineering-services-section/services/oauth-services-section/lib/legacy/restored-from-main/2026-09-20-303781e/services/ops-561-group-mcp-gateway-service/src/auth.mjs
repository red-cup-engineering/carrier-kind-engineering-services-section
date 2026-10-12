import { jsonRepr } from "@red-cup-engineering/form-http-response-representation-service";
import { guardHttpRequest } from "@red-cup-engineering/guard-http-request-service";
import { OAuthError } from "@red-cup-engineering/oauth-services-section";
import { readFormBody } from "@red-cup-engineering/read-http-request-body-service";
import {
  OAuthServer,
  authorizationServerMetadata,
  oauthApp,
  oauthConfigFromEnv,
  protectedResourceMetadata,
} from "@red-cup-engineering/serve-google-oauth-service";
import { createBrowserSessionAuth } from "./browser-session.mjs";
import { hiveLoginApp } from "./hive-login.mjs";
import { issueClientCredentialsToken, createMachineTokenStore } from "./machine-credentials.mjs";
import { createPrincipalRegistry } from "./principal-registry.mjs";

function oauthErrorRepr(code, description, status = 400) {
  const body = description ? { error: code, error_description: description } : { error: code };
  return jsonRepr(body, { status, cacheControl: { noStore: true } });
}

// Replaces oauthApp's /oauth/token: adds client_credentials; a body stream
// reads once, so the other two grants are dispatched here too.
/**
 * @param {import("@red-cup-engineering/serve-google-oauth-service").OAuthServer} oauth
 * @param {ReturnType<typeof createPrincipalRegistry>} registry
 * @param {ReturnType<typeof createMachineTokenStore>} machineTokens
 */
function tokenResource(oauth, registry, machineTokens) {
  return {
    id: "oauth.token",
    match: "/oauth/token",
    methods: ["POST"],
    handler: async (ctx) => {
      let form;
      try {
        form = await readFormBody(ctx.req);
      } catch {
        return oauthErrorRepr("invalid_request", "missing or invalid form body");
      }
      const grantType = form.get("grant_type");
      const clientId = form.get("client_id") ?? "";
      try {
        if (grantType === "client_credentials") {
          const response = issueClientCredentialsToken({
            registry,
            machineTokens,
            clientId,
            clientSecret: form.get("client_secret") ?? "",
          });
          return jsonRepr(response, { status: 200, cacheControl: { noStore: true } });
        }
        if (grantType === "authorization_code") {
          const response = oauth.exchangeCode({
            client_id: clientId,
            code: form.get("code") ?? "",
            code_verifier: form.get("code_verifier") ?? "",
            redirect_uri: form.get("redirect_uri") ?? "",
          });
          return jsonRepr(response, { status: 200, cacheControl: { noStore: true } });
        }
        if (grantType === "refresh_token") {
          const response = oauth.rotateRefreshToken({ client_id: clientId, refresh_token: form.get("refresh_token") ?? "" });
          return jsonRepr(response, { status: 200, cacheControl: { noStore: true } });
        }
        return oauthErrorRepr("unsupported_grant_type", `unsupported grant_type: ${grantType ?? "(none)"}`);
      } catch (err) {
        const e = err instanceof OAuthError ? err : new OAuthError("server_error", String(err));
        return oauthErrorRepr(e.code, e.description, e.code === "invalid_client" ? 401 : 400);
      }
    },
  };
}

export function createGatewayAuth({ publicBaseUrl, allowedEmail, oauth, registry, machineTokens = createMachineTokenStore(), stateDir, googleLoginConfigured = true, hiveLoginConfigured = true, passwordLoginConfigured = true }) {
  const principals = registry ?? createPrincipalRegistry({ allowedEmail });
  const resourceUrl = `${publicBaseUrl}/mcp`;
  const resourceMetadataUrl = `${publicBaseUrl}/.well-known/oauth-protected-resource/mcp`;
  const challenge = `Bearer realm="ops-561-group-mcp", resource_metadata="${resourceMetadataUrl}"`;
  const bearerDecision = (headers) => {
    const decision = guardHttpRequest(
      headers,
      (token) => oauth.validateToken(token) ?? machineTokens.validate(token),
      (claims) => {
        if (!claims) return false;
        if (claims.actor !== undefined) return principals.isClientAdmitted(claims.client_id)
          && principals.actorForClient(claims.client_id) === claims.actor;
        return principals.isEmailAdmitted(claims.email);
      },
    );
    if (decision.status !== 200) {
      return { status: decision.status, response: jsonRepr({
        error: decision.status === 401 ? "unauthorized" : "forbidden",
        reason: decision.challenge,
      }, { status: decision.status, headers: { "www-authenticate": challenge }, cacheControl: { noStore: true } }) };
    }
    return { status: 200, claims: decision.claims };
  };
  const guardHandler = (inner) => async (ctx) => {
    const decision = bearerDecision(ctx.req.headers);
    return decision.status === 200 ? inner({ ...ctx, claims: decision.claims }) : decision.response;
  };
  const guard = (app) => ({
    ...app,
    resources: (app.resources ?? []).map((resource) => ({ ...resource, handler: guardHandler(resource.handler) })),
  });
  const baseAuthorizationMetadata = authorizationServerMetadata(oauth);
  const authorizationMetadata = {
    ...baseAuthorizationMetadata,
    grant_types_supported: [...new Set([...(baseAuthorizationMetadata.grant_types_supported ?? []), "client_credentials"])],
  };
  const browser = createBrowserSessionAuth({ publicBaseUrl, oauth, registry: principals, googleLoginConfigured, hiveLoginConfigured, passwordLoginConfigured });
  const resourceMetadata = protectedResourceMetadata(resourceUrl, publicBaseUrl);
  const metadataApp = { resources: [
    { id: "ops-mcp.oauth-authorization-server", match: "/.well-known/oauth-authorization-server", methods: ["GET"], produces: ["application/json"], handler: () => jsonRepr(authorizationMetadata) },
    { id: "ops-mcp.oauth-protected-resource", match: "/.well-known/oauth-protected-resource", methods: ["GET"], produces: ["application/json"], handler: () => jsonRepr(resourceMetadata) },
    { id: "ops-mcp.oauth-protected-resource-path", match: "/.well-known/oauth-protected-resource/mcp", methods: ["GET"], produces: ["application/json"], handler: () => jsonRepr(resourceMetadata) },
  ] };
  const guardControlPlane = (app) => ({
    ...app,
    resources: (app.resources ?? []).map((resource) => ({
      ...resource,
      handler: resource.methods?.length > 0 && resource.methods.every((method) => method === "GET" || method === "HEAD")
        ? (ctx) => {
          const wantsBrowser = resource.produces?.[0] === "text/html"
            || String(ctx.req.headers.accept ?? "").includes("text/html")
            || browser.validSession(ctx.req.headers);
          return wantsBrowser ? browser.guardHandler(resource.handler, bearerDecision)(ctx) : guardHandler(resource.handler)(ctx);
        }
        : guardHandler(resource.handler),
    })),
  });
  const oauthResources = (oauthApp(oauth).resources ?? []).filter((resource) => resource.id !== "oauth.token");
  // /login/hive needs a persistent nonce carrier; it mounts whenever a
  // state directory is given (always true for a real deployment via
  // loadGatewayAuth) and is otherwise omitted rather than falling back to
  // an in-memory store that would not survive this process's own restarts.
  const hiveLoginResources = stateDir === undefined ? [] : hiveLoginApp({ stateDir, registry: principals, browser }).resources;
  return Object.freeze({
    oauth,
    browser,
    allowedEmail,
    principals,
    machineTokens,
    publicBaseUrl,
    resourceUrl,
    resourceMetadataUrl,
    challenge,
    guard,
    guardControlPlane,
    app: { resources: [...oauthResources, tokenResource(oauth, principals, machineTokens), ...metadataApp.resources, ...browser.app.resources, ...hiveLoginResources] },
  });
}

export function loadGatewayAuth(config, env = process.env, { OAuthServerCtor = OAuthServer, configFromEnv = oauthConfigFromEnv } = {}) {
  const registry = createPrincipalRegistry({ stateDir: config.stateDir, allowedEmail: config.allowedEmail });
  const oauth = new OAuthServerCtor(configFromEnv({
    publicBaseUrl: config.publicBaseUrl,
    allowedEmail: config.allowedEmail,
    admitEmail: registry.isEmailAdmitted,
    stateDir: config.stateDir,
    env,
  }));
  return createGatewayAuth({ publicBaseUrl: config.publicBaseUrl, allowedEmail: config.allowedEmail, oauth, registry, stateDir: config.stateDir, googleLoginConfigured: Boolean(config.googleClientId), hiveLoginConfigured: Boolean(config.hiveLoginConfigured), passwordLoginConfigured: Boolean(config.passwordLoginConfigured) });
}
