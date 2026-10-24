// mcp-gate-proxy — the one piece of real logic in the gate: a transparent
// reverse proxy from the OAuth-guarded edge to infography's own loopback-only
// HTTP/MCP surface (infography-mcp.service, 127.0.0.1:18811 by default).
//
// This forwards bytes; it does not import or understand infography's code.
// The gate owns transport and auth, nothing else — infography's `/mcp`
// dispatch (tools/list, tools/call, resources/*, prompts/*) runs unmodified
// on the other side of this proxy.

import type { App, Context, Repr } from "@emsenn/http-server";

const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "content-length",
  "authorization",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function forwardRequestHeaders(headers: Context["req"]["headers"]): HeadersInit {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (HOP_BY_HOP.has(key.toLowerCase())) continue;
    out[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  return out;
}

function forwardResponseHeaders(headers: globalThis.Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    if (HOP_BY_HOP.has(key.toLowerCase())) continue;
    out[key] = value;
  }
  return out;
}

async function readRawBody(req: Context["req"]): Promise<Buffer | undefined> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

/** Build the catch-all proxy App forwarding every request to `upstreamBaseUrl`. */
export function mcpGateProxyApp(upstreamBaseUrl: string): App {
  const base = upstreamBaseUrl.replace(/\/$/, "");
  return {
    resources: [
      {
        id: "mcp-gate.proxy",
        match: () => true,
        handler: async (ctx: Context): Promise<Repr> => {
          const target = `${base}${ctx.url.pathname}${ctx.url.search}`;
          const body = await readRawBody(ctx.req);
          const upstream = await fetch(target, {
            method: ctx.req.method,
            headers: forwardRequestHeaders(ctx.req.headers),
            ...(body !== undefined ? { body } : {}),
          });
          const responseBody = Buffer.from(await upstream.arrayBuffer());
          return {
            status: upstream.status,
            headers: forwardResponseHeaders(upstream.headers),
            body: responseBody,
          } satisfies Repr;
        },
      },
    ],
  };
}
