// Minimal MCP server over Streamable HTTP, single-JSON-response mode: one
// tools/list + tools/call surface, no resources/prompts/server-initiated
// messages. Moved upstream 2026-09-05 (Gig Assist spec §i): serverInfo is
// now caller-supplied. `ctxFactory` is handed in already auth-closed.

const PROTOCOL_VERSION = "2025-06-18";
const DEFAULT_SERVER_INFO = { name: "personal-intelligence-systems", version: "0.1.0" };

/**
 * Handle one MCP Streamable HTTP request.
 *
 * @param {Request} request
 * @param {{ registry: { toolRegistry: Array<object>, getTool: (name: string) => object|undefined }, ctxFactory: () => Promise<object>, serverInfo?: { name: string, version: string } }} deps
 * @returns {Promise<Response>}
 */
export async function handleMcpRequest(request, { registry, ctxFactory, serverInfo = DEFAULT_SERVER_INFO } = {}) {
  if (!request || typeof request.method !== "string" || typeof request.text !== "function") {
    throw new TypeError("handleMcpRequest requires a Request-like first argument with method/text()");
  }
  if (!registry || !Array.isArray(registry.toolRegistry) || typeof registry.getTool !== "function") {
    throw new TypeError(
      "handleMcpRequest requires options.registry with a toolRegistry array and a getTool(name) function",
    );
  }
  if (typeof ctxFactory !== "function") {
    throw new TypeError("handleMcpRequest requires options.ctxFactory to be a function");
  }

  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { allow: "POST" } });
  }

  let raw;
  try {
    raw = await request.text();
  } catch {
    return jsonRpcResponse(rpcError(null, -32700, "Parse error: could not read request body"));
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return jsonRpcResponse(rpcError(null, -32700, "Parse error: invalid JSON"));
  }

  if (!isValidRequestShape(parsed)) {
    const id = hasOwn(parsed, "id") ? parsed.id : null;
    return jsonRpcResponse(rpcError(id, -32600, "Invalid Request"));
  }

  const isNotification = !hasOwn(parsed, "id");
  const { method, params, id } = parsed;

  const outcome = await dispatch(method, params, { registry, ctxFactory, serverInfo });

  // JSON-RPC notifications never get a response body, per spec — MCP's only
  // client-sent notification in v1 is notifications/initialized, but the
  // rule is general so we apply it uniformly rather than special-casing one
  // method name.
  if (isNotification) {
    return new Response(null, { status: 202 });
  }

  if (outcome.notFound) {
    return jsonRpcResponse(rpcError(id, -32601, `Method not found: ${method}`));
  }

  return jsonRpcResponse(rpcResult(id, outcome.value));
}

async function dispatch(method, params, { registry, ctxFactory, serverInfo }) {
  switch (method) {
    case "initialize":
      return { value: { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo } };
    case "notifications/initialized":
      // Notification path in handleMcpRequest short-circuits before this
      // value is used; present for completeness if ever called with an id.
      return { value: null };
    case "tools/list":
      return { value: { tools: toMcpToolList(registry) } };
    case "tools/call":
      return { value: await callTool(registry, ctxFactory, params) };
    case "ping":
      return { value: {} };
    default:
      return { notFound: true };
  }
}

function toMcpToolList(registry) {
  return registry.toolRegistry.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.parameters,
  }));
}

async function callTool(registry, ctxFactory, params) {
  const name = isPlainObject(params) ? params.name : undefined;
  if (typeof name !== "string" || name.length === 0) {
    return {
      content: [{ type: "text", text: 'Invalid tools/call params: "name" must be a non-empty string' }],
      isError: true,
    };
  }

  const tool = registry.getTool(name);
  if (!tool) {
    return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  }

  const args = isPlainObject(params.arguments) ? params.arguments : {};

  try {
    const ctx = await ctxFactory();
    const { data, observations } = await tool.handler(ctx, args);
    return { content: [{ type: "text", text: JSON.stringify({ data, observations }) }], isError: false };
  } catch (err) {
    // Deliberately broad: any handler failure (ToolError for bad
    // args/missing scope, or an upstream EsiError, or a bug) becomes an
    // MCP tool-result error rather than a JSON-RPC protocol error or an
    // uncaught exception that would blow up the Worker's fetch handler.
    return { content: [{ type: "text", text: errorMessage(err) }], isError: true };
  }
}

function errorMessage(err) {
  if (err && typeof err.message === "string" && err.message.length > 0) return err.message;
  return String(err);
}

function isValidRequestShape(value) {
  if (!isPlainObject(value)) return false;
  if (value.jsonrpc !== "2.0") return false;
  if (typeof value.method !== "string" || value.method.length === 0) return false;
  if (hasOwn(value, "params")) {
    const p = value.params;
    if (p !== undefined && (typeof p !== "object" || p === null)) return false;
  }
  return true;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value, key) {
  return isPlainObject(value) && Object.prototype.hasOwnProperty.call(value, key);
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function jsonRpcResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
