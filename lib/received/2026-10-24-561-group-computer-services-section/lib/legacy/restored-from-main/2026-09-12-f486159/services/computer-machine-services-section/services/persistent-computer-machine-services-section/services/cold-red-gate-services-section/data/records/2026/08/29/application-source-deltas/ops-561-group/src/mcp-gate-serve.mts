// mcp-gate-serve — ops.561.group entry point: the OAuth-gated proxy in front
// of infography's MCP surface.
//
// Reclaims the ops.561.group domain (the prior
// @emsenn/561-group-operations-manifold service is stopped separately; its
// code and data are untouched on disk, just no longer served here) for a
// single purpose: let an OAuth-authorized client (ChatGPT, as a custom MCP
// connector) reach infography's tools. Two processes: this gate (auth +
// transport only) and infography-mcp.service (127.0.0.1:18811, the real
// tool dispatch, unmodified).

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { installGracefulShutdown, start, mergeApps } from "@emsenn/http-server";

import { loadMcpGateAuth } from "./mcp-gate-auth.mts";
import { mcpGateProxyApp } from "./mcp-gate-proxy.mts";

const siteRoot = path.resolve(fileURLToPath(import.meta.url), "../..");
const port = Number(process.env["PORT"] ?? 18807);
const host = process.env["HOST"] ?? "127.0.0.1";
const publicBaseUrl = (process.env["PUBLIC_BASE_URL"] ?? process.env["BASE_URL"] ?? `http://${host}:${port}`).replace(/\/$/, "");
const upstreamMcpUrl = process.env["UPSTREAM_MCP_URL"] ?? "http://127.0.0.1:18811";

const stateDir = path.join(siteRoot, "data", "state", "oauth");
const auth = loadMcpGateAuth({ publicBaseUrl, stateDir });
const proxyApp = mcpGateProxyApp(upstreamMcpUrl);

const app = mergeApps(
  auth.app,          // /oauth/* + well-known metadata — ungated, discoverable
  auth.guard(proxyApp), // everything else (incl. /mcp) — bearer-gated, proxied upstream
);

const result = await start(app, { port, host });
installGracefulShutdown(result);

process.stderr.write(
  `[ops.561.group-mcp-gate] ${publicBaseUrl} on ${host}:${result.port} -> upstream ${upstreamMcpUrl}, ` +
  `gated to ${auth.allowedEmail} via Google OAuth\n`,
);
