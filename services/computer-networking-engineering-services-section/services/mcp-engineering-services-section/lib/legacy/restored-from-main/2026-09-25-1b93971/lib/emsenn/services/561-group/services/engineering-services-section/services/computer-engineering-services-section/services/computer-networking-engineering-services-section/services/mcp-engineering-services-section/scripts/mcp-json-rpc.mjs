import { createHttpServer } from "@red-cup-engineering/http-services-section/node-server";
// The house's one MCP (Model Context Protocol) server face: plain JSON-RPC 2.0 framing over
// stdio or HTTP, no `@modelcontextprotocol/sdk`, no `zod`. A caller supplies tool/resource
// definitions with plain handlers; this module owns initialize/ping/tools/resources dispatch and
// the two transports. Every MCP server face in the house composes this instead of wrapping the
// SDK, or its own JSON-RPC framing, a second time.

import readline from "node:readline";
import { admit, defineType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";

const PROTOCOL_VERSION = "2025-06-18";

function toolView({ handler: _handler, ...view }) { return view; }
function resourceView({ read: _read, ...view }) { return view; }

/** One compiled admission type per tool with a declared `inputSchema`, so `tools/call` rejects
 *  arguments outside it the same way the house's typed operation carriers already do. A tool with
 *  no `inputSchema` admits any arguments. */
function inputTypeOf(tool) {
  if (tool.inputSchema === undefined) return undefined;
  const declared = defineType({ id: `mcp:${tool.name}:input`, name: tool.name, description: tool.description ?? tool.name, schema: tool.inputSchema, parents: [] });
  if (!declared.ok) throw new TypeError(`tool ${tool.name} declares an invalid inputSchema: ${declared.refusal.message}`);
  return declared.value;
}

/** A handler's return value becomes the tool result: passed through as-is when it already looks
 *  like an MCP CallToolResult (a `content` array), otherwise wrapped as text plus structured JSON. */
function toCallToolResult(value) {
  if (value !== null && typeof value === "object" && Array.isArray(value.content)) return value;
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value };
}
function toolErrorResult(error) {
  return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }] };
}

/**
 * Forms one MCP server face over a tool/resource catalog.
 * @param {{name: string, version: string, instructions?: string, tools?: {name: string, description?: string, inputSchema?: object, handler: (args: object) => unknown}[], resources?: {uri: string, name?: string, description?: string, mimeType?: string, read: (uri: string) => unknown}[]}} options
 * @returns {{handleRequest: (request: object) => Promise<object|null>, serveStdio: (options?: object) => Promise<{close: () => void}>, serveHttp: (options?: {port?: number, host?: string}) => Promise<{port: number, close: () => Promise<void>}>}}
 */
export function createMcpServer({ name, version, instructions, tools = [], resources = [] }) {
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  const resourcesByUri = new Map(resources.map((resource) => [resource.uri, resource]));
  const inputTypesByName = new Map(tools.map((tool) => [tool.name, inputTypeOf(tool)]));

  async function handleRequest(request) {
    const id = request?.id;
    const method = request?.method;
    const params = request?.params;
    const reply = (result) => (id === undefined ? null : { jsonrpc: "2.0", id, result });
    const fail = (code, message) => (id === undefined ? null : { jsonrpc: "2.0", id, error: { code, message } });
    if (typeof method !== "string") return fail(-32600, "invalid request");
    if (method.startsWith("notifications/")) return null;
    if (method === "initialize") {
      return reply({
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { ...(tools.length > 0 ? { tools: { listChanged: false } } : {}), ...(resources.length > 0 ? { resources: { listChanged: false } } : {}) },
        serverInfo: { name, version },
        ...(instructions === undefined ? {} : { instructions }),
      });
    }
    if (method === "ping") return reply({});
    if (method === "tools/list") return reply({ tools: tools.map(toolView) });
    if (method === "tools/call") {
      const tool = toolsByName.get(params?.name);
      if (tool === undefined) return fail(-32601, `unknown tool: ${params?.name}`);
      const args = params?.arguments ?? {};
      const inputType = inputTypesByName.get(tool.name);
      if (inputType !== undefined) {
        const admitted = admit(inputType, args);
        if (!admitted.ok) {
          const issues = admitted.refusal.issues.map((issue) => `${issue.path || "/"} ${issue.message}`).join("; ");
          return fail(-32602, `tool ${tool.name} arguments outside inputSchema: ${issues}`);
        }
      }
      try {
        return reply(toCallToolResult(await tool.handler(args)));
      } catch (error) {
        return reply(toolErrorResult(error));
      }
    }
    if (method === "resources/list") return reply({ resources: resources.map(resourceView) });
    if (method === "resources/read") {
      const resource = resourcesByUri.get(params?.uri);
      if (resource === undefined) return fail(-32601, `unknown resource: ${params?.uri}`);
      try {
        return reply({ contents: [await resource.read(params.uri)] });
      } catch (error) {
        return fail(-32603, error instanceof Error ? error.message : String(error));
      }
    }
    return fail(-32601, `unknown method: ${method}`);
  }

  /** Newline-delimited JSON-RPC over stdin/stdout, one request per line, replies emitted in order. */
  async function serveStdio({ input = process.stdin, output = process.stdout } = {}) {
    const lines = readline.createInterface({ input, crlfDelay: Infinity });
    let chain = Promise.resolve();
    lines.on("line", (line) => {
      chain = chain.then(async () => {
        if (!line.trim()) return;
        let request;
        try {
          request = JSON.parse(line);
        } catch (error) {
          output.write(`${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: error.message } })}\n`);
          return;
        }
        const result = await handleRequest(request);
        if (result) output.write(`${JSON.stringify(result)}\n`);
      });
    });
    return { close: () => lines.close() };
  }

  /** One JSON-RPC request per HTTP POST body, one JSON-RPC response per HTTP response body. */
  function serveHttp({ port = 0, host = "127.0.0.1" } = {}) {
    const server = createHttpServer({ handle: (req, res) => {
      if (req.method !== "POST") {
        res.writeHead(405, { "content-type": "text/plain; charset=utf-8" }).end("Method Not Allowed");
        return;
      }
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", async () => {
        let request;
        try {
          request = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch (error) {
          res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: error.message } }));
          return;
        }
        const result = await handleRequest(request);
        res.writeHead(200, { "content-type": "application/json" }).end(result ? JSON.stringify(result) : "{}");
      });
    } });
    return new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, host, () => resolve({ server, port: server.address().port, close: () => new Promise((done) => server.close(() => done())) }));
    });
  }

  return Object.freeze({ handleRequest, serveStdio, serveHttp });
}

/** Projects an admitted computer-platform operation carrier's operations into MCP tool
 *  descriptors (name, description, input/output JSON Schema). Several server faces build their
 *  tool catalog off an operation carrier rather than hand-authoring it. */
export function mcpToolsOfOperations(operations) {
  const schemaOf = (schema) => (typeof schema === "object" && schema !== null ? schema : {});
  return operations.map((operation) => ({
    name: operation.id,
    ...(operation.description === undefined ? {} : { description: operation.description }),
    inputSchema: schemaOf(operation.domain.schema),
    outputSchema: schemaOf(operation.codomain.schema),
  }));
}

export const DEFAULT_MCP_PROTOCOL_VERSION = "2025-06-18";

export const MCP_JSON_TYPE = "application/json";

export function mcpInitializeResult(options) { return Object.freeze({ protocolVersion: options.protocolVersion ?? DEFAULT_MCP_PROTOCOL_VERSION, capabilities: Object.freeze({ tools: Object.freeze({ listChanged: false }) }), serverInfo: options.serverInfo, ...(options.instructions === undefined ? {} : { instructions: options.instructions }) }); }

export function mcpReachability(serverInfo, tools) { return Object.freeze({ status: "ok", transport: "mcp", protocol: "streamable_http", serverInfo, capabilities: Object.freeze({ tools: Object.freeze({ listChanged: false }) }), tools: Object.freeze(tools.map((tool) => tool.name)) }); }

export function mcpToolsListResult(tools, nextCursor) { return Object.freeze({ tools: Object.freeze([...tools]), ...(nextCursor === undefined ? {} : { nextCursor }) }); }

export function mcpToolTextResult(value) { return textResult(value); }

export function mcpToolStructuredResult(value) { return Object.freeze(toCallToolResult(value)); }

export function mcpToolTextError(error) { return Object.freeze(toolErrorResult(error)); }

const rpcId = (id) => id ?? null;

export function mcpOk(id, result) { return Object.freeze({ jsonrpc: "2.0", id: rpcId(id), result }); }

export function mcpRpcError(id, code, message) { return Object.freeze({ jsonrpc: "2.0", id: rpcId(id), error: Object.freeze({ code, message }) }); }

/**
 * Form the MCP resource of one web application.
 *
 * @param options The tool catalog (native tools or typed operations), authentication, and HTTP policy.
 * @returns One web-application resource at the MCP path.
 */
export function mcpResource(options) {
    if (options.tools === undefined && options.operations === undefined)
        throw new TypeError("mcpResource requires tools or operations");
    const tools = options.tools ?? mcpToolsOfOperations(options.operations ?? []);
    if (options.dispatch === undefined && options.operations === undefined)
        throw new TypeError("mcpResource requires dispatch when the catalog is native tools");
    const accepted = new Set(options.acceptedProtocolVersions ?? [options.protocolVersion ?? DEFAULT_PROTOCOL_VERSION, LEGACY_MCP_PROTOCOL_VERSION]);
    const path = options.path ?? DEFAULT_PATH;
    const maxBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
    const sessions = new Map();
    const serverFor = async (meta) => {
        const owned = await options.platform?.(meta);
        const platform = owned ?? meta.context.platform;
        const server = createMcpServer({
            serverInfo: options.serverInfo,
            ...(options.instructions === undefined ? {} : { instructions: options.instructions }),
            tools,
            ...(options.toolsPageSize === undefined ? {} : { toolsPageSize: options.toolsPageSize }),
            ...(options.dispatch !== undefined ? {
                dispatch: (name, args) => options.dispatch(name, args, meta),
                ...(options.dispatchResult === undefined ? {} : { dispatchResult: options.dispatchResult }),
            } : platform !== undefined ? {
                platform,
                executionOptions: (name) => {
                    const operation = platform.operation(name);
                    return options.execution?.(meta, operation) ?? { allowedEffects: operation.effects };
                },
            } : {
                dispatch: () => { throw new Error("HostUnavailable: the request runs over no computer platform"); },
            }),
        });
        if (owned) {
            server.onclose = () => { void owned.close(); };
            const close = server.close.bind(server);
            server.close = async () => { try {
                await close();
            }
            finally {
                await owned.close();
            } };
        }
        return server;
    };
    const handler = async (context) => {
        const protocol = protocolRefusal(context, accepted);
        if (protocol !== undefined)
            return protocol;
        const origin = originRefusal(context, options.allowedOrigins);
        if (origin !== undefined)
            return origin;
        const bearer = bearerToken(context.request.headers.get("authorization") ?? undefined);
        let principal;
        if (options.auth !== undefined) {
            principal = bearer === undefined ? undefined : await options.auth.verify(bearer, context);
            if (principal === undefined && !(options.auth.loopbackBypass === true && loopback(context))) {
                return json({ error: "invalid_token" }, 401, { "www-authenticate": bearerChallenge({ error: "invalid_token", ...(options.auth.realm === undefined ? {} : { realm: options.auth.realm }), ...(options.auth.resourceMetadataUrl === undefined ? {} : { resourceMetadata: options.auth.resourceMetadataUrl }) }) });
            }
        }
        const meta = Object.freeze({ ...(bearer === undefined ? {} : { bearer }), ...(principal === undefined ? {} : { principal }), context });
        const method = context.request.method;
        if (!options.sessions && (method === "GET" || method === "HEAD")) {
            return new Response(method === "HEAD" ? null : "Method Not Allowed", { status: 405, headers: { allow: "POST", "content-type": "text/plain; charset=utf-8" } });
        }
        const body = method === "POST" ? await context.input.bytes() : undefined;
        if (!options.sessions) {
            const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: !prefersSse(context) });
            const server = await serverFor(meta);
            await server.connect(transport);
            try {
                return await transport.handleRequest(transportRequest(context, body));
            }
            finally {
                await server.close().catch(() => { });
            }
        }
        const sessionId = context.request.headers.get("mcp-session-id");
        let transport = sessionId === null ? undefined : sessions.get(sessionId);
        if (sessionId === null) {
            transport = new WebStandardStreamableHTTPServerTransport({
                sessionIdGenerator: () => crypto.randomUUID(),
                enableJsonResponse: !prefersSse(context),
                onsessioninitialized: (id) => { sessions.set(id, transport); },
                onsessionclosed: (id) => { sessions.delete(id); },
            });
            await (await serverFor(meta)).connect(transport);
        }
        if (transport === undefined)
            return json({ error: "unknown_session" }, 404);
        return transport.handleRequest(transportRequest(context, body));
    };
    return Object.freeze({ match: path, methods: ["GET", "HEAD", "POST", "DELETE"], body: { maxBytes }, handler });
}

/**
 * Form the native Node HTTP binding of an MCP resource.  The MCP protocol stays
 * in `mcpResource`; this only projects an IncomingMessage carrier into the
 * Fetch-shaped resource context used by that protocol.
 */
