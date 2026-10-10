// The Streamable HTTP transport of an MCP server, as one web-application resource. It serves the
// Fetch-shaped context (`ctx.request`, `ctx.input`) and the native Node one (`ctx.req`) alike and
// answers with a Web `Response`, which both application engines send. Bearer authentication
// follows the MCP authorization profile: a refused request gets a `WWW-Authenticate` challenge
// naming the protected-resource metadata (RFC 9728), from which a client such as ChatGPT or
// Claude discovers the authorization server, registers and signs in.

import { bearerChallenge, bearerToken } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/bearer-authentication";
import { INVALID_REQUEST, MCP_PROTOCOL_VERSIONS, PARSE_ERROR, createMcpServer, mcpRpcError } from "./server.mjs";

const DEFAULT_MAX_BODY_BYTES = 4 * 1024 * 1024;
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function carrier(ctx) {
  const request = ctx.request;
  const header = request !== undefined
    ? (name) => request.headers.get(name) ?? undefined
    : (name) => { const value = ctx.req?.headers?.[name]; return Array.isArray(value) ? value.join(", ") : value; };
  const url = ctx.url ?? new URL(request?.url ?? `http://${header("host") ?? "localhost"}${ctx.req?.url ?? "/"}`);
  return {
    method: request?.method ?? ctx.req?.method ?? "GET",
    header,
    url,
    remoteAddress: ctx.remoteAddress ?? ctx.req?.socket?.remoteAddress,
    async body(maxBytes) {
      if (ctx.input?.bytes !== undefined) {
        const bytes = await ctx.input.bytes();
        if (bytes.byteLength > maxBytes) throw new RangeError("body too large");
        return Buffer.from(bytes).toString("utf8");
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of ctx.req) {
        size += chunk.length;
        if (size > maxBytes) throw new RangeError("body too large");
        chunks.push(chunk);
      }
      return Buffer.concat(chunks).toString("utf8");
    },
  };
}

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
const plain = (text, status, headers = {}) => new Response(text, { status, headers: { "content-type": "text/plain; charset=utf-8", ...headers } });

/** Same-origin (by host, since a proxy may change the scheme) or explicitly allowed origins only:
 *  the transport's DNS-rebinding guard. Requests without an Origin (non-browser clients) pass. */
function originAdmitted(origin, url, allowed = []) {
  if (origin === undefined) return true;
  let parsed;
  try { parsed = new URL(origin); } catch { return false; }
  return parsed.host === url.host || allowed.includes(parsed.origin);
}

const wantsEventStream = (accept = "") => /text\/event-stream/iu.test(accept) && !/application\/json|\*\/\*/iu.test(accept);

/**
 * One MCP endpoint resource.
 *
 * @param {{
 *   server?: ReturnType<typeof createMcpServer>,
 *   name?: string, version?: string, tools?: object[], toolSources?: object[][], resources?: object[], resourceTemplates?: object[], prompts?: object[], instructions?: string,
 *   path?: string,
 *   verifyToken?: (token: string, ctx: object) => unknown,
 *   realm?: string,
 *   resourceMetadataUrl?: string | ((url: URL) => string),
 *   loopbackBypass?: boolean,
 *   bind?: (meta: {principal?: unknown, bearer?: string, ctx: object}) => object | Promise<object>,
 *   allowedOrigins?: string[],
 *   sessions?: boolean,
 *   maxBodyBytes?: number,
 * }} options
 */
export function mcpResource(options) {
  const server = options.server ?? createMcpServer(options);
  const path = options.path ?? "/mcp";
  const maxBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const sessions = options.sessions === true ? new Set() : undefined;
  const allow = sessions === undefined ? "POST" : "POST, DELETE";

  const challenge = (url, error) => {
    const metadata = typeof options.resourceMetadataUrl === "function" ? options.resourceMetadataUrl(url) : options.resourceMetadataUrl;
    return bearerChallenge({ ...(options.realm === undefined ? {} : { realm: options.realm }), ...(error === undefined ? {} : { error }), ...(metadata === undefined ? {} : { resourceMetadata: metadata }) });
  };

  async function handler(ctx) {
    const http = carrier(ctx);
    if (http.method === "GET" || http.method === "HEAD") return plain(http.method === "HEAD" ? null : "Method Not Allowed", 405, { allow });
    const version = http.header("mcp-protocol-version");
    if (version !== undefined && !MCP_PROTOCOL_VERSIONS.includes(version)) return json(mcpRpcError(null, INVALID_REQUEST, `unsupported MCP-Protocol-Version: ${version}`), 400);
    if (!originAdmitted(http.header("origin"), http.url, options.allowedOrigins)) return json(mcpRpcError(null, INVALID_REQUEST, "origin not allowed"), 403);

    const bearer = bearerToken(http.header("authorization"));
    let principal;
    if (options.verifyToken !== undefined) {
      try { principal = bearer === undefined ? undefined : (await options.verifyToken(bearer, ctx)) ?? undefined; } catch { principal = undefined; }
      const bypass = options.loopbackBypass === true && LOOPBACK.has(http.remoteAddress) && http.header("x-forwarded-for") === undefined;
      if (principal === undefined && !bypass) {
        return json({ error: "invalid_token", error_description: bearer === undefined ? "a bearer token is required" : "the bearer token is not valid" }, 401,
          { "www-authenticate": challenge(http.url, bearer === undefined ? undefined : "invalid_token") });
      }
    }

    const sessionId = http.header("mcp-session-id");
    if (sessions !== undefined && sessionId !== undefined && !sessions.has(sessionId)) return json(mcpRpcError(null, INVALID_REQUEST, "unknown session"), 404);
    if (http.method === "DELETE") {
      if (sessions === undefined) return plain("Method Not Allowed", 405, { allow });
      if (sessionId !== undefined) sessions.delete(sessionId);
      return new Response(null, { status: 204 });
    }
    if (http.method !== "POST") return plain("Method Not Allowed", 405, { allow });

    let incoming;
    try { incoming = JSON.parse(await http.body(maxBytes)); }
    catch (error) { return json(mcpRpcError(null, PARSE_ERROR, error instanceof RangeError ? "request body too large" : "request body is not JSON"), error instanceof RangeError ? 413 : 400); }

    // The session a call arrives in is the hand it came through: a harness session's connection, kept
    // beside the principal it acts for, so an upstream can record which hand played the act.
    // A harness that names its own session (`x-harness-session`, its session id) gives its hand a name
    // that lives as long as the session, across reconnects; the principal still says who it acts for.
    const harnessSession = http.header("x-harness-session");
    const meta = { ...(bearer === undefined ? {} : { bearer }), ...(principal === undefined ? {} : { principal }), ...(sessionId === undefined ? {} : { session: sessionId }),
      ...(typeof harnessSession === "string" && /^[A-Za-z0-9._:-]{1,200}$/u.test(harnessSession) ? { harnessSession } : {}), ctx };
    const bound = (await options.bind?.(meta)) ?? {};
    let answer;
    try { answer = await server.handleMessage(incoming, { ...meta, ...bound }); }
    finally { await bound.close?.(); }
    if (answer === null) return new Response(null, { status: 202 });

    const headers = {};
    const initializing = !Array.isArray(incoming) && incoming?.method === "initialize" && answer.result !== undefined;
    if (sessions !== undefined && initializing) {
      const id = crypto.randomUUID();
      sessions.add(id);
      headers["mcp-session-id"] = id;
    }
    if (wantsEventStream(http.header("accept"))) {
      return new Response(`event: message\ndata: ${JSON.stringify(answer)}\n\n`, { status: 200, headers: { "content-type": "text/event-stream", "cache-control": "no-store", ...headers } });
    }
    return json(answer, 200, headers);
  }

  return Object.freeze({ id: "mcp.endpoint", name: "MCP Endpoint", route: path, match: path, methods: Object.freeze(["GET", "HEAD", "POST", "DELETE"]), handler });
}
