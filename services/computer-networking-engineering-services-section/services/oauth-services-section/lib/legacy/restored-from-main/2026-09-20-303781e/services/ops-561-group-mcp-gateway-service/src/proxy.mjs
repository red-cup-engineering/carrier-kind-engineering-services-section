import { jsonRepr } from "@red-cup-engineering/form-http-response-representation-service";
import { normalizeLoopbackUpstream } from "./config.mjs";

const HOP_BY_HOP = new Set([
  "authorization", "connection", "content-length", "host", "keep-alive",
  "proxy-authenticate", "proxy-authorization", "te", "trailer",
  "transfer-encoding", "upgrade",
]);

const SPOOFABLE_SUBJECT_HEADERS = new Set(["x-metroplat-subject", "x-metroplat-gateway-token"]);

/**
 * Copies client request headers to forward upstream, dropping hop-by-hop
 * headers, Connection-nominated headers, and the metroplat subject-assertion
 * headers (a client must never be able to assert its own gateway identity).
 * @param {Record<string, string | string[] | undefined>} headers
 * @returns {Headers}
 */
export function forwardHeaders(headers) {
  const entries = Object.entries(headers ?? {});
  const connectionValue = entries.find(([name]) => name.toLowerCase() === "connection")?.[1];
  const connectionNamed = new Set((Array.isArray(connectionValue) ? connectionValue.join(",") : connectionValue ?? "")
    .split(",").map((name) => name.trim().toLowerCase()).filter(Boolean));
  const forwarded = new Headers();
  for (const [name, rawValue] of entries) {
    const lowerName = name.toLowerCase();
    if (rawValue === undefined || HOP_BY_HOP.has(lowerName) || connectionNamed.has(lowerName) || SPOOFABLE_SUBJECT_HEADERS.has(lowerName)) continue;
    forwarded.set(name, Array.isArray(rawValue) ? rawValue.join(", ") : rawValue);
  }
  return forwarded;
}

function responseHeaders(headers) {
  const connectionNamed = new Set((headers.get("connection") ?? "")
    .split(",").map((name) => name.trim().toLowerCase()).filter(Boolean));
  const forwarded = new Headers();
  for (const [name, value] of headers.entries()) {
    if (!HOP_BY_HOP.has(name.toLowerCase()) && !connectionNamed.has(name.toLowerCase())) forwarded.set(name, value);
  }
  return forwarded;
}

/**
 * @param {string} upstreamMcpUrl loopback origin for MCP and OpenAI Chat Completions
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {string} [options.upstreamGatewayToken] shared secret metroplat honors on the loopback;
 *   when absent, no subject headers are ever set (current behavior preserved exactly)
 * @param {(ctx: unknown) => string | undefined} [options.subjectOf] resolves the authenticated
 *   subject to assert to metroplat for this request, or undefined to assert none
 * @returns {{ resources: Array<object> }}
 */
export function mcpGatewayProxyApp(upstreamMcpUrl, { fetchImpl = fetch, upstreamGatewayToken, subjectOf } = {}) {
  const upstream = normalizeLoopbackUpstream(upstreamMcpUrl);
  return { resources: [{
    id: "ops-mcp.proxy",
    match: (path) => path === "/mcp" || path.startsWith("/mcp/") || path === "/v1/chat/completions",
    handler: async (ctx) => {
      const target = new URL(`${ctx.url.pathname}${ctx.url.search}`, upstream);
      const method = ctx.req.method ?? "GET";
      const carriesBody = method !== "GET" && method !== "HEAD";
      const headers = forwardHeaders(ctx.req.headers);
      const subject = upstreamGatewayToken !== undefined ? subjectOf?.(ctx) : undefined;
      if (ctx.url.pathname === "/v1/chat/completions" && (!upstreamGatewayToken || typeof subject !== "string" || subject === "")) {
        return jsonRepr({ error: "inference_identity_unavailable", reason: "inference requires an authenticated actor and an upstream identity binding" }, { status: 503, cacheControl: { noStore: true } });
      }
      if (upstreamGatewayToken !== undefined && typeof subject === "string" && subject !== "") {
        headers.set("x-metroplat-subject", subject);
        headers.set("x-metroplat-gateway-token", upstreamGatewayToken);
      }
      try {
        const reply = await fetchImpl(target, {
          method,
          headers,
          redirect: "manual",
          signal: ctx.signal,
          ...(carriesBody ? { body: ctx.req, duplex: "half" } : {}),
        });
        return new Response(reply.body, { status: reply.status, statusText: reply.statusText, headers: responseHeaders(reply.headers) });
      } catch (error) {
        if (ctx.signal?.aborted) throw error;
        return jsonRepr({ error: "bad_gateway", reason: "the loopback provider did not complete the request" }, { status: 502, cacheControl: { noStore: true } });
      }
    },
  }] };
}
