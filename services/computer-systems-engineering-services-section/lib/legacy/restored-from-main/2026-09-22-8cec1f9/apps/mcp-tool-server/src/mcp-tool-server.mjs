import { declareCapabilityOperation } from "@red-cup-engineering/computer-platform/operations";
import { createComputerPlatform, bindingsProviders } from "@red-cup-engineering/computer-platform";
import { CallToolResultSchema, McpError, ErrorCode, CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { defineType } from "@red-cup-engineering/computer-system-engine/type-system";

export function mcpToolsOfOperations(operations) {
  return Object.freeze(operations.map((operation) => Object.freeze({
    name: operation.id,
    ...(operation.description === undefined ? {} : { description: operation.description }),
    inputSchema: schemaOf(operation.domain.schema),
    outputSchema: schemaOf(operation.codomain.schema),
  })));
}
function schemaOf(schema) { return typeof schema === "object" && schema !== null ? schema : Object.freeze({}); }
function textResult(value) { return Object.freeze({ content: Object.freeze([{ type: "text", text: JSON.stringify(value, null, 1) }]) }); }
function structuredResult(value) { return Object.freeze({ content: Object.freeze([{ type: "text", text: JSON.stringify(value, null, 1) }]), structuredContent: value }); }
function errorResult(error) { return Object.freeze({ content: Object.freeze([{ type: "text", text: error instanceof Error ? error.message : String(error) }]), isError: true }); }
function base64UrlEncode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}
function base64UrlDecode(value) {
  const padded = value.replace(/-/gu, "+").replace(/_/gu, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new TextDecoder().decode(bytes);
}
function toolsCursor(offset) { return base64UrlEncode(JSON.stringify({ collection: "tools", offset })); }
function toolsOffset(cursor) {
  if (cursor === undefined) return 0;
  try {
    const value = JSON.parse(base64UrlDecode(cursor));
    const offset = value.offset;
    if (value.collection !== "tools" || typeof offset !== "number" || !Number.isSafeInteger(offset) || offset < 0) throw new Error("invalid");
    return offset;
  } catch { throw new McpError(ErrorCode.InvalidParams, "invalid tools/list cursor"); }
}
function resultFor(tool, value) { return tool.outputSchema === undefined ? textResult(value) : structuredResult(value); }
function nativeResultFor(tool, value) {
  const parsed = CallToolResultSchema.safeParse(value);
  if (!parsed.success) throw Object.assign(new Error("tool " + tool.name + " returned an invalid native MCP result: " + parsed.error.message), { code: "InvalidOutput" });
  if (tool.outputSchema !== undefined && parsed.data.isError !== true && parsed.data.structuredContent === undefined) throw Object.assign(new Error("tool " + tool.name + " declared outputSchema but omitted structured content"), { code: "InvalidOutput" });
  return parsed.data;
}
function toolPlatform(options, tools) {
  const declare = (name, side, schema) => {
    const result = defineType({ id: `mcp:${name}:${side}`, name, description: `${name} ${side}`, parents: [], schema, references: options.schemaReferences ?? [] });
    if (!result.ok) throw new TypeError(result.refusal.message);
    return result.value;
  };
  const operations = tools.map((tool) => {
    const scoped = (side, schema) => typeof schema === "boolean" ? schema : { $id: `urn:mcp:${encodeURIComponent(tool.name)}:${side}`, ...schema };
    const output = tool.outputSchema === undefined ? undefined : scoped("output", tool.outputSchema);
    const result = declareCapabilityOperation({ id: tool.name, domain: declare(tool.name, "input", { type: "object", required: ["args", "meta"], properties: { args: scoped("input", (tool.inputSchema ?? { type: "object" })), meta: true }, additionalProperties: false }), codomain: declare(tool.name, "output", output === undefined ? true : options.dispatchResult === "mcp" ? { anyOf: [{ type: "object", required: ["isError"], properties: { isError: { const: true } } }, { type: "object", required: ["structuredContent"], properties: { structuredContent: { allOf: [{ type: "object" }, output] } } }] } : { allOf: [{ type: "object" }, output] }) });
    if (!result.ok) throw new TypeError(result.refusal.message);
    return result.value;
  });
  return createComputerPlatform({ id: options.serverInfo.name, operations, providers: bindingsProviders(Object.fromEntries(tools.map((tool) => [tool.name, async (input) => {
    const { args, meta } = input;
    const value = await options.dispatch(tool.name, args, meta);
    return options.dispatchResult === "mcp" ? nativeResultFor(tool, value) : value;
  }])) ) });
}

/** Form an unconnected MCP server from operations or a JSON Schema tool catalog. */
export function createMcpToolServer(options) {
  const tools = Object.freeze(structuredClone(options.tools ?? ("platform" in options ? mcpToolsOfOperations(options.platform.operations()) : [])));
  const suppliedPlatform = "platform" in options;
  const platform = suppliedPlatform ? options.platform : toolPlatform(options, tools);
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  if (byName.size !== tools.length) throw new TypeError("MCP tool names must be unique");
  const pageSize = options.toolsPageSize;
  if (pageSize !== undefined && (!Number.isSafeInteger(pageSize) || pageSize < 1)) throw new TypeError("toolsPageSize must be a positive integer");
  const server = new Server(options.serverInfo, { capabilities: { tools: { listChanged: false } }, ...(options.instructions === undefined ? {} : { instructions: options.instructions }) });
  server.setRequestHandler(ListToolsRequestSchema, (request) => {
    if (pageSize === undefined) {
      if (request.params?.cursor !== undefined) throw new McpError(ErrorCode.InvalidParams, "tools/list cursor is not valid for this endpoint");
      return { tools };
    }
    const offset = toolsOffset(request.params?.cursor);
    if (offset > tools.length || (offset === tools.length && tools.length > 0)) throw new McpError(ErrorCode.InvalidParams, "invalid tools/list cursor");
    const end = Math.min(offset + pageSize, tools.length);
    return { tools: tools.slice(offset, end), ...(end < tools.length ? { nextCursor: toolsCursor(end) } : {}) };
  });
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const tool = byName.get(request.params.name);
    if (tool === undefined) throw new McpError(ErrorCode.MethodNotFound, "unknown tool " + request.params.name);
    try {
      const args = request.params.arguments ?? {};
      const meta = { authInfo: extra.authInfo };
      const authority = "platform" in options ? (typeof options.executionOptions === "function" ? options.executionOptions(tool.name, args, meta) : options.executionOptions ?? {}) : {};
      const outcome = await platform.execute(tool.name, suppliedPlatform ? args : { args, meta }, authority);
      if (!outcome.ok) {
        if (outcome.refusal.code === "InvalidInput") throw new McpError(ErrorCode.InvalidParams, "tool " + tool.name + " arguments outside inputSchema: " + outcome.refusal.message);
        if (outcome.refusal.code === "InvalidOutput") throw new McpError(ErrorCode.InternalError, outcome.refusal.message);
        return errorResult(`${outcome.refusal.code}: ${outcome.refusal.message}`);
      }
      return options.dispatchResult === "mcp" ? nativeResultFor(tool, outcome.value) : resultFor(tool, outcome.value);
    } catch (error) {
      if (error instanceof McpError) throw error;
      return errorResult(error);
    }
  });
  if (!suppliedPlatform) {
    const close = server.close.bind(server);
    server.close = async () => { try { await close(); } finally { await platform.close(); } };
  }
  return server;
}
export const DEFAULT_MCP_PROTOCOL_VERSION = "2025-06-18";
export const MCP_JSON_TYPE = "application/json";
export function mcpInitializeResult(options) { return Object.freeze({ protocolVersion: options.protocolVersion ?? DEFAULT_MCP_PROTOCOL_VERSION, capabilities: Object.freeze({ tools: Object.freeze({ listChanged: false }) }), serverInfo: options.serverInfo, ...(options.instructions === undefined ? {} : { instructions: options.instructions }) }); }
export function mcpReachability(serverInfo, tools) { return Object.freeze({ status: "ok", transport: "mcp", protocol: "streamable_http", serverInfo, capabilities: Object.freeze({ tools: Object.freeze({ listChanged: false }) }), tools: Object.freeze(tools.map((tool) => tool.name)) }); }
export function mcpToolsListResult(tools, nextCursor) { return Object.freeze({ tools: Object.freeze([...tools]), ...(nextCursor === undefined ? {} : { nextCursor }) }); }
export function mcpToolTextResult(value) { return textResult(value); }
export function mcpToolStructuredResult(value) { return structuredResult(value); }
export function mcpToolTextError(error) { return errorResult(error); }
function rpcId(id) { return id ?? null; }
export function mcpOk(id, result) { return Object.freeze({ jsonrpc: "2.0", id: rpcId(id), result }); }
export function mcpRpcError(id, code, message) { return Object.freeze({ jsonrpc: "2.0", id: rpcId(id), error: Object.freeze({ code, message }) }); }
