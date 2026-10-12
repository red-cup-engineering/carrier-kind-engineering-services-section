#!/usr/bin/env node

import { loadGatewayConfig } from "../src/config.mjs";

const config = loadGatewayConfig();
let upstream = { probed: false, reachable: null, status: null };
if (process.argv.includes("--probe")) {
  try {
    const response = await fetch(`${config.upstreamMcpUrl}/mcp`, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(5_000) });
    upstream = { probed: true, reachable: true, status: response.status };
    await response.body?.cancel();
  } catch {
    upstream = { probed: true, reachable: false, status: null };
  }
}
process.stdout.write(`${JSON.stringify({
  ok: upstream.reachable !== false,
  service: "ops-gateway",
  bind: `${config.host}:${config.port}`,
  publicResource: `${config.publicBaseUrl}/mcp`,
  upstream: { origin: config.upstreamMcpUrl, ...upstream },
  stateDirectoryConfigured: true,
  googleCredentialsConfigured: config.googleClientId !== undefined,
  hiveLoginConfigured: config.hiveLoginConfigured,
  operatorAdmissionConfigured: true,
}, null, 2)}\n`);
if (upstream.reachable === false) process.exitCode = 2;
