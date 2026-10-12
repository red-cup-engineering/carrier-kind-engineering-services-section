import { declareCapabilityOperation, type Operation } from "./operations.mjs";
import { createComputerPlatform, bindingsProviders, type ComputerPlatform, type PlatformExecutionOptions } from "./index.mjs";
import { isJsonValue, type JsonValue, type JsonRecord } from "../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { CallToolResultSchema, McpError, ErrorCode, type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
// Tool arguments and structured results are admitted by the house's one JSON Schema
// evaluator (computer-data-engine), which interprets schemas and so runs on every runtime,
// Cloudflare Workers included.
import { defineType, type DataType, type JsonSchema } from "@red-cup-engineering/computer-data-engine";

export type JsonObject = JsonRecord;
export type Json = JsonValue;
export type McpToolAnnotations = Readonly<{ readOnlyHint?: boolean; openWorldHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; title?: string }>;
export type McpTool = Readonly<{ name: string; title?: string; description?: string; inputSchema?: Readonly<Record<string, unknown>>; outputSchema?: Readonly<Record<string, unknown>>; annotations?: McpToolAnnotations }>;
export type McpServerInfo = Readonly<{ name: string; version: string }>;
export type McpToolResult = Readonly<{ content: readonly Readonly<{ type: "text"; text: string }>[]; structuredContent?: JsonObject; isError?: true }>;
export type McpCallMeta = Readonly<{ authInfo?: unknown }>;
export type McpValueDispatch = (name: string, args: Readonly<Record<string, unknown>>, meta: McpCallMeta) => unknown | Promise<unknown>;
export type McpResultDispatch = (name: string, args: Readonly<Record<string, unknown>>, meta: McpCallMeta) => CallToolResult | Promise<CallToolResult>;
export type McpDispatch = McpValueDispatch | McpResultDispatch;
type McpToolServerSharedOptions = Readonly<{ serverInfo: McpServerInfo; instructions?: string; tools?: readonly McpTool[]; schemaReferences?: readonly JsonSchema[]; toolsPageSize?: number }>;
/** `value` serializes domain values; `mcp` passes validated native MCP results through unchanged. */
export type McpToolServerOptions = McpToolServerSharedOptions & (
  Readonly<{ platform: ComputerPlatform; executionOptions?: PlatformExecutionOptions | ((name: string, args: Readonly<Record<string, unknown>>, meta: McpCallMeta) => PlatformExecutionOptions); dispatchResult?: "value" | "mcp" }> |
  Readonly<{ tools: readonly McpTool[]; dispatchResult?: "value"; dispatch: McpValueDispatch }> |
  Readonly<{ tools: readonly McpTool[]; dispatchResult: "mcp"; dispatch: McpResultDispatch }>
);

/** Project typed operations to the MCP tool catalog: id, description, domain and codomain schemas. */
export function mcpToolsOfOperations(operations: readonly Operation[]): readonly McpTool[] {
  return Object.freeze(operations.map((operation) => Object.freeze({
    name: operation.id,
    ...(operation.description === undefined ? {} : { description: operation.description }),
    inputSchema: schemaOf(operation.domain.schema),
    outputSchema: schemaOf(operation.codomain.schema),
  })));
}

function schemaOf(schema: unknown): Readonly<Record<string, unknown>> {
  return typeof schema === "object" && schema !== null ? schema as Readonly<Record<string, unknown>> : Object.freeze({});
}

function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : undefined;
}
function textResult(value: unknown): McpToolResult {
  return Object.freeze({ content: Object.freeze([{ type: "text" as const, text: JSON.stringify(value, null, 1) }]) });
}
function structuredResult(value: JsonObject): McpToolResult {
  return Object.freeze({ content: Object.freeze([{ type: "text" as const, text: JSON.stringify(value, null, 1) }]), structuredContent: value });
}
function errorResult(error: unknown): McpToolResult {
  return Object.freeze({ content: Object.freeze([{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }]), isError: true });
}
/** Web-standard base64url encode (no Buffer), so this module has no Node-only dependency. */
function base64UrlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}
/** Web-standard base64url decode (no Buffer), so this module has no Node-only dependency. */
function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/gu, "+").replace(/_/gu, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new TextDecoder().decode(bytes);
}
function toolsCursor(offset: number): string {
  return base64UrlEncode(JSON.stringify({ collection: "tools", offset }));
}
function toolsOffset(cursor: string | undefined): number {
  if (cursor === undefined) return 0;
  try {
    const value = JSON.parse(base64UrlDecode(cursor)) as { collection?: unknown; offset?: unknown };
    const offset = value.offset;
    if (value.collection !== "tools" || typeof offset !== "number" || !Number.isSafeInteger(offset) || offset < 0) throw new Error("invalid");
    return offset;
  } catch {
    throw new McpError(ErrorCode.InvalidParams, "invalid tools/list cursor");
  }
}
function resultFor(tool: McpTool, value: unknown): McpToolResult {
  return tool.outputSchema === undefined ? textResult(value) : structuredResult(value as JsonObject);
}
function nativeResultFor(tool: McpTool, value: unknown): CallToolResult {
  const parsed = CallToolResultSchema.safeParse(value);
  if (!parsed.success) throw Object.assign(new Error("tool " + tool.name + " returned an invalid native MCP result: " + parsed.error.message), { code: "InvalidOutput" });
  if (tool.outputSchema !== undefined && parsed.data.isError !== true && parsed.data.structuredContent === undefined) {
    throw Object.assign(new Error("tool " + tool.name + " declared outputSchema but omitted structured content"), { code: "InvalidOutput" });
  }
  return parsed.data;
}

/** Generic protocol callbacks become declared platform capabilities at the boundary. */
function toolPlatform(options: Exclude<McpToolServerOptions, { platform: ComputerPlatform }>, tools: readonly McpTool[]): ComputerPlatform {
  const declare = (name: string, side: string, schema: JsonSchema): DataType => {
    const result = defineType({ id: `mcp:${name}:${side}`, name, description: `${name} ${side}`, parents: [], schema, references: options.schemaReferences ?? [] });
    if (!result.ok) throw new TypeError(result.refusal.message);
    return result.value;
  };
  const operations = tools.map(tool => {
    // Embedded schemas keep their own root for local $ref/$defs resolution.
    const scoped = (side: string, schema: JsonSchema): JsonSchema => typeof schema === "boolean" ? schema : { $id: `urn:mcp:${encodeURIComponent(tool.name)}:${side}`, ...schema };
    const output = tool.outputSchema === undefined ? undefined : scoped("output", tool.outputSchema as JsonSchema);
    const result = declareCapabilityOperation({ id: tool.name, domain: declare(tool.name, "input", {
      type: "object", required: ["args", "meta"], properties: { args: scoped("input", (tool.inputSchema ?? { type: "object" }) as JsonSchema), meta: true }, additionalProperties: false,
    }), codomain: declare(tool.name, "output", output === undefined ? true : options.dispatchResult === "mcp" ? {
      anyOf: [{ type: "object", required: ["isError"], properties: { isError: { const: true } } },
        { type: "object", required: ["structuredContent"], properties: { structuredContent: { allOf: [{ type: "object" }, output] } } }],
    } : { allOf: [{ type: "object" }, output] }) });
    if (!result.ok) throw new TypeError(result.refusal.message);
    return result.value;
  });
  return createComputerPlatform({ id: options.serverInfo.name, operations, providers: bindingsProviders(Object.fromEntries(tools.map(tool => [tool.name, async (input: unknown) => {
    const { args, meta } = input as { args: Readonly<Record<string, unknown>>; meta: McpCallMeta };
    const value = await options.dispatch(tool.name, args, meta);
    return options.dispatchResult === "mcp" ? nativeResultFor(tool, value) : value;
  }]))) });
}

/**
 * Forms an official low-level MCP server over one native JSON Schema tool catalog.
 *
 * @param options Server identity, tool catalog, static schema references, and dispatch.
 * @returns An unconnected MCP SDK server with tools/list and tools/call handlers.
 */
export function createMcpToolServer(options: McpToolServerOptions): Server {
  const tools = Object.freeze(structuredClone(options.tools ?? ("platform" in options ? mcpToolsOfOperations(options.platform.operations()) : [])));
  const suppliedPlatform = "platform" in options;
  const platform = suppliedPlatform ? options.platform : toolPlatform(options, tools);
  const byName = new Map(tools.map(tool => [tool.name, tool]));
  if (byName.size !== tools.length) throw new TypeError("MCP tool names must be unique");
  const pageSize = options.toolsPageSize;
  if (pageSize !== undefined && (!Number.isSafeInteger(pageSize) || pageSize < 1)) throw new TypeError("toolsPageSize must be a positive integer");
  const server = new Server(options.serverInfo, { capabilities: { tools: { listChanged: false } }, ...(options.instructions === undefined ? {} : { instructions: options.instructions }) });
  server.setRequestHandler(ListToolsRequestSchema, (request) => {
    if (pageSize === undefined) {
      if (request.params?.cursor !== undefined) throw new McpError(ErrorCode.InvalidParams, "tools/list cursor is not valid for this endpoint");
      return { tools: tools };
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
export type McpInitializeResult = Readonly<{ protocolVersion: string; capabilities: { tools: { listChanged: boolean } }; serverInfo: McpServerInfo; instructions?: string }>;
export type McpReachability = Readonly<{ status: "ok"; transport: "mcp"; protocol: "streamable_http"; serverInfo: McpServerInfo; capabilities: { tools: { listChanged: boolean } }; tools: readonly string[] }>;

/** @param options Server identity and optional instructions. @returns An MCP initialize response. */
export function mcpInitializeResult(options: { serverInfo: McpServerInfo; protocolVersion?: string; instructions?: string }): McpInitializeResult {
  return Object.freeze({ protocolVersion: options.protocolVersion ?? DEFAULT_MCP_PROTOCOL_VERSION, capabilities: Object.freeze({ tools: Object.freeze({ listChanged: false }) }), serverInfo: options.serverInfo, ...(options.instructions === undefined ? {} : { instructions: options.instructions }) });
}
/** @param serverInfo Server identity. @param tools Advertised tools. @returns A transport reachability record. */
export function mcpReachability(serverInfo: McpServerInfo, tools: readonly McpTool[]): McpReachability {
  return Object.freeze({ status: "ok", transport: "mcp", protocol: "streamable_http", serverInfo, capabilities: Object.freeze({ tools: Object.freeze({ listChanged: false }) }), tools: Object.freeze(tools.map((tool) => tool.name)) });
}
/** @param tools Tool catalog. @param nextCursor Optional pagination continuation. @returns A tools/list result. */
export function mcpToolsListResult(tools: readonly McpTool[], nextCursor?: string): Readonly<{ tools: readonly McpTool[]; nextCursor?: string }> {
  return Object.freeze({ tools: Object.freeze([...tools]), ...(nextCursor === undefined ? {} : { nextCursor }) });
}
/** @param value Value to serialize. @returns A text tool result. */
export function mcpToolTextResult(value: unknown): McpToolResult { return textResult(value); }
/** @param value JSON object to serialize and expose structurally. @returns A structured tool result. */
export function mcpToolStructuredResult(value: JsonObject): McpToolResult { return structuredResult(value); }
/** @param error Execution error. @returns An MCP isError result. */
export function mcpToolTextError(error: unknown): McpToolResult { return errorResult(error); }

export type JsonRpcId = string | number | null | undefined;

export type JsonRpcRequest = Readonly<{
  jsonrpc?: "2.0";
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
}>;

export type JsonRpcSuccess = Readonly<{
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
}>;

export type JsonRpcFailure = Readonly<{
  jsonrpc: "2.0";
  id: string | number | null;
  error: Readonly<{
    code: number;
    message: string;
  }>;
}>;

export type JsonRpcEnvelope = JsonRpcSuccess | JsonRpcFailure;

function rpcId(id: JsonRpcId): string | number | null {
  return id ?? null;
}

export function mcpOk(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return Object.freeze({ jsonrpc: "2.0" as const, id: rpcId(id), result });
}

export function mcpRpcError(id: JsonRpcId, code: number, message: string): JsonRpcFailure {
  return Object.freeze({
    jsonrpc: "2.0" as const,
    id: rpcId(id),
    error: Object.freeze({ code, message }),
  });
}
