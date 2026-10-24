import { request as httpRequest } from "node:http";

const ROUTES = new Map([
  ["POST /compute/inference", "/inference"],
  ["GET /compute/status", "/status"],
  ["POST /compute/occupation-entropy", "/v1/occupation-entropy"],
]);
const BROKERAGE_ROUTES = new Set([
  "GET /.well-known/brokerage-products",
  "POST /v1/issuer-evidence",
  "POST /v1/aggressive-alpha",
  "POST /v1/strategies/synthesize",
  "POST /v1/paper-intent",
  "POST /v1/reconcile",
  "POST /v1/alpaca/read",
  "POST /v1/alpaca/execute",
]);
const HOP_BY_HOP = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]);

function providerPorts(value = process.env.X402_PROVIDER_ROUTES ?? "") {
  return new Map(value.split(",").filter(Boolean).map((entry) => {
    const [provider, rawPort, ...rest] = entry.split(":");
    const port = Number(rawPort);
    if (rest.length > 0 || !/^[a-z0-9][a-z0-9-]*$/u.test(provider ?? "")
        || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new TypeError("X402_PROVIDER_ROUTES must contain provider:port entries");
    }
    return [provider, port];
  }));
}

export function x402Route(
  method,
  pathname,
  value = process.env.METERED_INFERENCE_TOLLBOOTH_PORT ?? "4022",
  providers = process.env.X402_PROVIDER_ROUTES ?? "",
  brokerageValue = process.env.BROKERAGE_X402_PORT ?? "4022",
) {
  if (BROKERAGE_ROUTES.has(`${method} ${pathname}`)) {
    const port = Number(brokerageValue);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new TypeError("BROKERAGE_X402_PORT must name one TCP port");
    return Object.freeze({ port, upstreamPath: pathname });
  }
  const upstreamPath = ROUTES.get(`${method} ${pathname}`);
  if (upstreamPath) {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new TypeError("METERED_INFERENCE_TOLLBOOTH_PORT must name one TCP port");
    return Object.freeze({ port, upstreamPath });
  }
  const match = /^\/x402\/([a-z0-9][a-z0-9-]*)\/(offer|invoke|result\/[0-9a-f]{64}|recover\/[0-9a-f]{64})$/u.exec(pathname);
  const write = match?.[2] === "invoke" || match?.[2]?.startsWith("recover/");
  if (!match || (write ? method !== "POST" : method !== "GET")) {
    throw new Error("request is outside the contracted metered ingress");
  }
  const port = providerPorts(providers).get(match[1]);
  if (port === undefined) throw new Error("request is outside the contracted metered ingress");
  return Object.freeze({ port, upstreamPath: pathname });
}

export async function proxyX402Request(ctx) {
  const route = x402Route(ctx.req.method ?? "GET", ctx.url.pathname);
  const headers = Object.fromEntries(Object.entries(ctx.req.headers).flatMap(([name, value]) => HOP_BY_HOP.has(name) || value === undefined ? [] : [[name, value]]));
  const publicOrigin = new URL(process.env.PUBLIC_BASE_URL ?? ctx.url.origin);
  headers["x-forwarded-proto"] = publicOrigin.protocol.replace(":", "");
  headers["x-forwarded-host"] = publicOrigin.host;
  return new Promise((resolve, reject) => {
    const upstream = httpRequest({ hostname: "127.0.0.1", port: route.port, method: ctx.req.method, path: route.upstreamPath, headers, signal: ctx.signal }, (response) => {
      const responseHeaders = Object.fromEntries(Object.entries(response.headers).flatMap(([name, value]) => HOP_BY_HOP.has(name) || value === undefined ? [] : [[name, value]]));
      resolve({ status: response.statusCode ?? 502, headers: responseHeaders, type: response.headers["content-type"] ?? "application/octet-stream", body: response });
    });
    upstream.once("error", reject);
    ctx.req.pipe(upstream);
  });
}

export const x402ProxyApp = { resources: [{
  match: (path) => path === "/compute/inference" || path === "/compute/status" || path === "/compute/occupation-entropy"
    || [...BROKERAGE_ROUTES].some((route) => route.endsWith(` ${path}`))
    || /^\/x402\/[a-z0-9][a-z0-9-]*\/(?:offer|invoke|result\/[0-9a-f]{64}|recover\/[0-9a-f]{64})$/u.test(path),
  route: "metered-inference-x402-boundary",
  methods: ["GET", "POST"],
  handler: proxyX402Request,
}] };
