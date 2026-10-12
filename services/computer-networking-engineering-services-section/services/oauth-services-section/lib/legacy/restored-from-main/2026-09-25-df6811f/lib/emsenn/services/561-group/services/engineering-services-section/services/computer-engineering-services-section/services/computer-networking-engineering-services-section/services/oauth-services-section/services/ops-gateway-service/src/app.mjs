import { mergeApps } from "@red-cup-engineering/computer-web-server/compose";

import { activityPubApplication } from "@red-cup-engineering/activitypub-services-section/app";
import { jsonRepr } from "@red-cup-engineering/http-services-section/representation";
import { createGatewayAuth, loadGatewayAuth } from "./auth.mjs";
import { controlPlaneApp } from "./control-plane.mjs";
import { mcpGatewayProxyApp } from "./proxy.mjs";
import { createPureOperationRegistry, pureOperationsApp } from "./pure-operations.mjs";

export { createGatewayAuth, loadGatewayAuth } from "./auth.mjs";
export { controlPlaneApp } from "./control-plane.mjs";
export { loadGatewayConfig, normalizeLoopbackUpstream, normalizePublicBaseUrl } from "./config.mjs";
export { forwardHeaders, mcpGatewayProxyApp } from "./proxy.mjs";
export { createPureOperationRegistry, pureOperationsApp } from "./pure-operations.mjs";

export function createOpsMcpGatewayApp(config, { oauth, fetchImpl, activityPubProvider, pureOperations = [] } = {}) {
  const auth = oauth
    ? createGatewayAuth({ publicBaseUrl: config.publicBaseUrl, allowedEmail: config.allowedEmail, oauth, stateDir: config.stateDir, googleLoginConfigured: config.googleClientId === undefined ? true : Boolean(config.googleClientId), hiveLoginConfigured: config.hiveLoginConfigured ?? true, passwordLoginConfigured: config.passwordLoginConfigured ?? true })
    : loadGatewayAuth(config, {
      GOOGLE_CLIENT_ID: config.googleClientId,
      GOOGLE_CLIENT_SECRET: config.googleClientSecret,
    });
  const publicApp = { resources: [{
    id: "ops-mcp.health",
    match: "/healthz",
    methods: ["GET"],
    produces: ["application/json"],
    handler: () => jsonRepr({ ok: true, service: "ops-gateway", resource: auth.resourceUrl }),
  }] };
  const proxy = mcpGatewayProxyApp(config.upstreamMcpUrl, {
    fetchImpl,
    upstreamGatewayToken: config.upstreamGatewayToken,
    subjectOf: (ctx) => ctx.claims?.actor,
  });
  const operationRegistry = createPureOperationRegistry(pureOperations);
  const activityPubApp = activityPubProvider === undefined
    ? undefined
    : activityPubApplication(activityPubProvider);
  // MetroPlat work is read from the same loopback MCP provider in every deployment. OPS_DATA_DIR
  // remains an optional source only for the older /world and /records rooms.
  const guardedApps = [
    auth.guard(proxy),
    auth.guard(pureOperationsApp(operationRegistry)),
    auth.guardControlPlane(controlPlaneApp(config.dataDir, { upstreamMcpUrl: config.upstreamMcpUrl, fetchImpl })),
  ];
  return Object.freeze({
    auth,
    app: mergeApps(auth.app, publicApp, ...(activityPubApp === undefined ? [] : [activityPubApp]), ...guardedApps),
  });
}
