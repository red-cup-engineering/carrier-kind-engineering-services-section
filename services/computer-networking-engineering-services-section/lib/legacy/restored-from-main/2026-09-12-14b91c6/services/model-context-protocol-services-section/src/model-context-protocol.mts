import { isJsonValue, type JsonValue, type JsonRecord } from "@red-cup-engineering/computer-data-engine/json";
import { CallToolResultSchema, McpError, ErrorCode, type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
// Tool arguments and structured results are admitted by the house's one JSON Schema
// evaluator (computer-data-engine), which interprets schemas and so runs on every runtime,
// Cloudflare Workers included.
import { compileJsonSchema, type CompiledJsonSchema, type JsonSchema } from "@red-cup-engineering/computer-data-engine";

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
type McpToolServerSharedOptions = Readonly<{ serverInfo: McpServerInfo; instructions?: string; tools: readonly McpTool[]; schemaReferences?: readonly JsonSchema[]; toolsPageSize?: number }>;
/** `value` serializes domain values; `mcp` passes validated native MCP results through unchanged. */
export type McpToolServerOptions = McpToolServerSharedOptions & (
  Readonly<{ dispatchResult?: "value"; dispatch: McpValueDispatch }> |
  Readonly<{ dispatchResult: "mcp"; dispatch: McpResultDispatch }>
);

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
function issues(validation: ReturnType<CompiledJsonSchema["validate"]>): string {
  return validation.issues.map((issue) => (issue.path || "/") + " " + issue.message).join("; ");
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
function validArguments(tool: McpTool, args: Readonly<Record<string, unknown>>, inputValidator: CompiledJsonSchema | undefined): Readonly<Record<string, unknown>> {
  if (inputValidator === undefined) return args;
  const validation = inputValidator.validate(args);
  if (!validation.valid) throw new McpError(ErrorCode.InvalidParams, "tool " + tool.name + " arguments outside inputSchema: " + issues(validation));
  return args;
}
function resultFor(tool: McpTool, value: unknown, outputValidator: CompiledJsonSchema | undefined): McpToolResult {
  if (outputValidator === undefined) return textResult(value);
  if (!isJsonValue(value) || record(value) === undefined) throw new McpError(ErrorCode.InternalError, "tool " + tool.name + " declared outputSchema but returned non-object structured content");
  const validation = outputValidator.validate(value);
  if (!validation.valid) throw new McpError(ErrorCode.InternalError, "tool " + tool.name + " returned structured content outside outputSchema: " + issues(validation));
  return structuredResult(record(value) as JsonObject);
}
function nativeResultFor(tool: McpTool, value: unknown, outputValidator: CompiledJsonSchema | undefined): CallToolResult {
  const parsed = CallToolResultSchema.safeParse(value);
  if (!parsed.success) throw new McpError(ErrorCode.InternalError, "tool " + tool.name + " returned an invalid native MCP result: " + parsed.error.message);
  if (outputValidator !== undefined && parsed.data.isError !== true) {
    if (parsed.data.structuredContent === undefined) throw new McpError(ErrorCode.InternalError, "tool " + tool.name + " declared outputSchema but omitted structured content");
    const validation = outputValidator.validate(parsed.data.structuredContent);
    if (!validation.valid) throw new McpError(ErrorCode.InternalError, "tool " + tool.name + " returned structured content outside outputSchema: " + issues(validation));
  }
  return parsed.data;
}

/**
 * Forms an official low-level MCP server over one native JSON Schema tool catalog.
 *
 * @param options Server identity, tool catalog, static schema references, and dispatch.
 * @returns An unconnected MCP SDK server with tools/list and tools/call handlers.
 */
export function createMcpToolServer(options: McpToolServerOptions): Server {
  const byName = new Map(options.tools.map((tool) => [tool.name, tool]));
  if (byName.size !== options.tools.length) throw new TypeError("MCP tool names must be unique");
  const references = options.schemaReferences ?? [];
  const inputValidators = new Map(options.tools.map((tool) => [tool.name, tool.inputSchema === undefined ? undefined : compileJsonSchema(tool.inputSchema as JsonSchema, { references })]));
  const outputValidators = new Map(options.tools.map((tool) => [tool.name, tool.outputSchema === undefined ? undefined : compileJsonSchema(tool.outputSchema as JsonSchema, { references })]));
  const pageSize = options.toolsPageSize;
  if (pageSize !== undefined && (!Number.isSafeInteger(pageSize) || pageSize < 1)) throw new TypeError("toolsPageSize must be a positive integer");
  const server = new Server(options.serverInfo, { capabilities: { tools: { listChanged: false } }, ...(options.instructions === undefined ? {} : { instructions: options.instructions }) });
  server.setRequestHandler(ListToolsRequestSchema, (request) => {
    if (pageSize === undefined) {
      if (request.params?.cursor !== undefined) throw new McpError(ErrorCode.InvalidParams, "tools/list cursor is not valid for this endpoint");
      return { tools: options.tools };
    }
    const offset = toolsOffset(request.params?.cursor);
    if (offset > options.tools.length || (offset === options.tools.length && options.tools.length > 0)) throw new McpError(ErrorCode.InvalidParams, "invalid tools/list cursor");
    const end = Math.min(offset + pageSize, options.tools.length);
    return { tools: options.tools.slice(offset, end), ...(end < options.tools.length ? { nextCursor: toolsCursor(end) } : {}) };
  });
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const tool = byName.get(request.params.name);
    if (tool === undefined) throw new McpError(ErrorCode.MethodNotFound, "unknown tool " + request.params.name);
    try {
      const args = validArguments(tool, request.params.arguments ?? {}, inputValidators.get(tool.name));
      const value = await options.dispatch(tool.name, args, { authInfo: extra.authInfo });
      return options.dispatchResult === "mcp"
        ? nativeResultFor(tool, value, outputValidators.get(tool.name))
        : resultFor(tool, value, outputValidators.get(tool.name));
    } catch (error) {
      if (error instanceof McpError) throw error;
      return errorResult(error);
    }
  });
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
