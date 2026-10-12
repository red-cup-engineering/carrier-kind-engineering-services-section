
/**
 * MCP streamable-HTTP envelope helpers.
 *
 * The MCP helpers build the small JSON-RPC and result vocabulary needed by a
 * streamable HTTP surface: initialize results, reachability records, tools/list
 * results, success and error envelopes, and text or structured tool-call
 * results. They deliberately stop before server dispatch, authorization,
 * transport sessions, or tool execution.
 *
 * Use this subpath when an metroplat-powered HTTP adapter needs MCP-shaped values
 * while keeping protocol envelopes separate from the application that serves
 * them.
 *
 * @packageDocumentation
 */
import { schemaFrom } from "../../lib/schema/contract.mts";

export const DEFAULT_MCP_PROTOCOL_VERSION = "2025-06-18";

/** Media type used for MCP JSON-RPC requests and replies over HTTP. */
export const MCP_JSON_TYPE = "application/json";

/** JSON object accepted by the MCP structured-result helpers. */
export type JsonObject = { readonly [key: string]: Json };

/** JSON value used where MCP envelopes carry structured content. */
export type Json = null | boolean | number | string | readonly Json[] | JsonObject;

/** Tool annotation record for MCP tool-list entries. */
export type McpToolAnnotations = Readonly<{
  readOnlyHint?: boolean;
  openWorldHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  title?: string;
}>;

/** Tool description record exposed through MCP tools/list. */
export type McpTool = Readonly<{
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Readonly<Record<string, unknown>>;
  outputSchema?: Readonly<Record<string, unknown>>;
  annotations?: McpToolAnnotations;
}>;

/** Server identity record returned from initialize and reachability reads. */
export type McpServerInfo = Readonly<{
  name: string;
  version: string;
}>;

/** Tools capability flag advertised by this small MCP envelope surface. */
export type McpToolsCapability = Readonly<{
  listChanged: boolean;
}>;

/** Capability record for the MCP server projection. */
export type McpCapabilities = Readonly<{
  tools: McpToolsCapability;
}>;

/** Initialize result record returned from an MCP initialize request. */
export type McpInitializeResult = Readonly<{
  protocolVersion: string;
  capabilities: McpCapabilities;
  serverInfo: McpServerInfo;
  instructions?: string;
}>;

/** Reachability witness for an HTTP surface that can project MCP tools. */
export type McpReachability = Readonly<{
  status: "ok";
  transport: "mcp";
  protocol: "streamable_http";
  serverInfo: McpServerInfo;
  capabilities: McpCapabilities;
  tools: readonly string[];
}>;

/** MCP tools/call result record for text, structured content, and errors. */
export type McpToolCallResult = Readonly<{
  content: readonly [Readonly<{ type: "text"; text: string }>];
  structuredContent?: JsonObject;
  isError?: true;
}>;

/** MCP tools/list result record, including the optional pagination cursor. */
export type McpToolsListResult = Readonly<{
  tools: readonly McpTool[];
  nextCursor?: string;
}>;

/** A tool definition admitted from an external MCP `tools/list` catalog. */
export type McpCatalogToolDefinition = Readonly<{
  kind: "metroplat.mcp.catalog-tool";
  name: string;
  description?: string;
  parameters?: Readonly<Record<string, unknown>>;
  outputSchema?: Readonly<Record<string, unknown>>;
  annotations?: McpToolAnnotations;
}>;

/** The admitted image of one MCP `tools/list` response. */
export type McpToolCatalogProjection = Readonly<{
  kind: "metroplat.mcp.tool-catalog-projection";
  source: "mcp:tools/list";
  tools: readonly McpCatalogToolDefinition[];
}>;

/** One admitted catalog row bound to the literal MCP `tools/call` name transport. */
export type McpCatalogToolBinding = Readonly<{
  kind: "metroplat.mcp.catalog-tool-binding";
  source: "mcp:tools/list";
  target: "mcp:tools/call";
  name: string;
  catalogTool: McpCatalogToolDefinition;
  call: Readonly<{
    method: "tools/call";
    params: Readonly<{ name: string }>;
  }>;
  handler: Readonly<{
    name: string;
    available: boolean;
  }>;
}>;

/** The transport relation from admitted `tools/list` rows to callable `tools/call` names. */
export type McpToolCatalogTransport = Readonly<{
  kind: "metroplat.mcp.tool-catalog-transport";
  source: "mcp:tools/list";
  target: "mcp:tools/call";
  bindings: readonly McpCatalogToolBinding[];
  bound: readonly string[];
  missing: readonly string[];
}>;

export const mcpCatalogToolSchema = {
  $id: "metroplat/executing/mcp/catalog-tool",
  title: "McpCatalogTool",
  description: "One external MCP tool descriptor admitted as boundary catalog material.",
  type: "object",
  required: ["kind", "name"],
  properties: {
    kind: { const: "metroplat.mcp.catalog-tool" },
    name: { type: "string", minLength: 1 },
    description: { type: "string" },
    parameters: { type: "object" },
    outputSchema: { type: "object" },
    annotations: {
      type: "object",
      properties: {
        readOnlyHint: { type: "boolean" },
        openWorldHint: { type: "boolean" },
        destructiveHint: { type: "boolean" },
        idempotentHint: { type: "boolean" },
        title: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

export const mcpToolCatalogProjectionSchema = {
  $id: "metroplat/executing/mcp/tool-catalog-projection",
  title: "McpToolCatalogProjection",
  description: "The admitted projection of an MCP tools/list catalog into metroplat catalog-tool records.",
  type: "object",
  required: ["kind", "source", "tools"],
  properties: {
    kind: { const: "metroplat.mcp.tool-catalog-projection" },
    source: { const: "mcp:tools/list" },
    tools: { type: "array", items: mcpCatalogToolSchema },
  },
  additionalProperties: false,
} as const;

const mcpCatalogToolBindingSchema = {
  type: "object",
  required: ["kind", "source", "target", "name", "catalogTool", "call", "handler"],
  properties: {
    kind: { const: "metroplat.mcp.catalog-tool-binding" },
    source: { const: "mcp:tools/list" },
    target: { const: "mcp:tools/call" },
    name: { type: "string", minLength: 1 },
    catalogTool: mcpCatalogToolSchema,
    call: {
      type: "object",
      required: ["method", "params"],
      properties: {
        method: { const: "tools/call" },
        params: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string", minLength: 1 } },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    handler: {
      type: "object",
      required: ["name", "available"],
      properties: {
        name: { type: "string", minLength: 1 },
        available: { type: "boolean" },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

export const mcpToolCatalogTransportSchema = {
  $id: "metroplat/executing/mcp/tool-catalog-transport",
  title: "McpToolCatalogTransport",
  description: "The explicit MCP name-transport binding between admitted tools/list catalog rows and tools/call handler names.",
  type: "object",
  required: ["kind", "source", "target", "bindings", "bound", "missing"],
  properties: {
    kind: { const: "metroplat.mcp.tool-catalog-transport" },
    source: { const: "mcp:tools/list" },
    target: { const: "mcp:tools/call" },
    bindings: { type: "array", items: mcpCatalogToolBindingSchema },
    bound: { type: "array", items: { type: "string", minLength: 1 } },
    missing: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
} as const;

export const mcpCatalogToolContract = schemaFrom(mcpCatalogToolSchema);
export const mcpToolCatalogProjectionContract = schemaFrom(mcpToolCatalogProjectionSchema);
export const mcpToolCatalogTransportContract = schemaFrom(mcpToolCatalogTransportSchema);

/** JSON-RPC id value normalized by outgoing success and failure envelopes. */
export type JsonRpcId = string | number | null | undefined;

/** Minimal JSON-RPC request shape consumed by MCP-facing dispatchers. */
export type JsonRpcRequest = Readonly<{
  jsonrpc?: "2.0";
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
}>;

/** Successful JSON-RPC envelope returned by MCP helpers. */
export type JsonRpcSuccess = Readonly<{
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
}>;

/** Failed JSON-RPC envelope returned by MCP helpers. */
export type JsonRpcFailure = Readonly<{
  jsonrpc: "2.0";
  id: string | number | null;
  error: Readonly<{
    code: number;
    message: string;
    data?: unknown;
  }>;
}>;

/** Union of the success and failure envelopes this module constructs. */
export type JsonRpcEnvelope = JsonRpcSuccess | JsonRpcFailure;

const CAPABILITIES: McpCapabilities = Object.freeze({ tools: Object.freeze({ listChanged: false }) });

function rpcId(id: unknown): string | number | null {
  return typeof id === "string" || typeof id === "number" ? id : null;
}

/** Build a successful JSON-RPC envelope while normalizing a missing id to null. */
export function mcpOk(id: unknown, result: unknown): JsonRpcSuccess {
  return Object.freeze({ jsonrpc: "2.0" as const, id: rpcId(id), result });
}

/** Build a JSON-RPC error envelope while preserving the request id relation. */
export function mcpRpcError(id: unknown, code: number, message: string, data?: unknown): JsonRpcFailure {
  return Object.freeze({
    jsonrpc: "2.0" as const,
    id: rpcId(id),
    error: Object.freeze({
      code,
      message,
      ...(data === undefined ? {} : { data }),
    }),
  });
}

/** Serialize one JSON-RPC envelope as the newline-delimited MCP stdio line image. */
export function mcpJsonRpcLine(envelope: JsonRpcEnvelope | Readonly<Record<string, unknown>>): string {
  return `${JSON.stringify(envelope)}\n`;
}

/** Build the initialize result for a streamable-HTTP MCP projection. */
export function mcpInitializeResult(options: {
  serverInfo: McpServerInfo;
  protocolVersion?: string;
  instructions?: string;
}): McpInitializeResult {
  return Object.freeze({
    protocolVersion: options.protocolVersion ?? DEFAULT_MCP_PROTOCOL_VERSION,
    capabilities: CAPABILITIES,
    serverInfo: options.serverInfo,
    ...(options.instructions === undefined ? {} : { instructions: options.instructions }),
  });
}

/** Describe the MCP tools reachable through a mounted HTTP surface. */
export function mcpReachability(serverInfo: McpServerInfo, tools: readonly McpTool[]): McpReachability {
  return Object.freeze({
    status: "ok" as const,
    transport: "mcp" as const,
    protocol: "streamable_http" as const,
    serverInfo,
    capabilities: CAPABILITIES,
    tools: Object.freeze(tools.map((tool) => tool.name)),
  });
}

/** Build the MCP tools/list result without exposing a mutable tool array. */
export function mcpToolsListResult(tools: readonly McpTool[], nextCursor?: string): McpToolsListResult {
  return Object.freeze({
    tools: Object.freeze([...tools]),
    ...(nextCursor === undefined ? {} : { nextCursor }),
  });
}

/**
 * Admit an MCP `tools/list` catalog as metroplat boundary material.
 *
 * This is the inverse-side projection of `mcpToolsListResult`: a remote tool row
 * is not executed here, but its name, description, input schema, output schema,
 * and annotations become a stable catalog-tool record that an agent or service
 * can later bind to handlers under its own capability policy.
 */
export function projectMcpToolCatalog(tools: readonly McpTool[]): McpToolCatalogProjection {
  return Object.freeze({
    kind: "metroplat.mcp.tool-catalog-projection" as const,
    source: "mcp:tools/list" as const,
    tools: Object.freeze(tools.map(projectMcpCatalogTool)),
  });
}

function callableToolName(tool: string | Pick<McpTool, "name"> | Pick<McpCatalogToolDefinition, "name">): string {
  return typeof tool === "string" ? tool : tool.name;
}

/**
 * Construct the internal MCP transport relation from admitted catalog rows to handlers.
 *
 * MCP's binding law is name equality between a `tools/list` row and a
 * `tools/call` request's `params.name`. This function does not execute tools or
 * grant authority; it only makes that wire-level transport explicit and records
 * which catalog rows have a callable name in the supplied handler set.
 */
export function mcpToolCatalogTransport(
  projection: McpToolCatalogProjection,
  callableTools: readonly (string | Pick<McpTool, "name"> | Pick<McpCatalogToolDefinition, "name">)[],
): McpToolCatalogTransport {
  const callable = new Set(callableTools.map(callableToolName));
  const bindings = Object.freeze(projection.tools.map((tool) => Object.freeze({
    kind: "metroplat.mcp.catalog-tool-binding" as const,
    source: "mcp:tools/list" as const,
    target: "mcp:tools/call" as const,
    name: tool.name,
    catalogTool: tool,
    call: Object.freeze({
      method: "tools/call" as const,
      params: Object.freeze({ name: tool.name }),
    }),
    handler: Object.freeze({
      name: tool.name,
      available: callable.has(tool.name),
    }),
  })));
  return Object.freeze({
    kind: "metroplat.mcp.tool-catalog-transport" as const,
    source: "mcp:tools/list" as const,
    target: "mcp:tools/call" as const,
    bindings,
    bound: Object.freeze(bindings.filter((binding) => binding.handler.available).map((binding) => binding.name)),
    missing: Object.freeze(bindings.filter((binding) => !binding.handler.available).map((binding) => binding.name)),
  });
}

function projectMcpCatalogTool(tool: McpTool): McpCatalogToolDefinition {
  return Object.freeze({
    kind: "metroplat.mcp.catalog-tool" as const,
    name: tool.name,
    ...(tool.description === undefined ? {} : { description: tool.description }),
    ...(tool.inputSchema === undefined ? {} : { parameters: tool.inputSchema }),
    ...(tool.outputSchema === undefined ? {} : { outputSchema: tool.outputSchema }),
    ...(tool.annotations === undefined ? {} : { annotations: tool.annotations }),
  });
}

/** Encode an arbitrary value as the single text content item MCP expects. */
export function mcpToolTextResult(value: unknown): McpToolCallResult {
  return Object.freeze({
    content: Object.freeze([{ type: "text" as const, text: JSON.stringify(value, null, 1) }]) as McpToolCallResult["content"],
  });
}

/** Encode a JSON object as both text content and structured MCP content. */
export function mcpToolStructuredResult(value: JsonObject): McpToolCallResult {
  return Object.freeze({
    content: Object.freeze([{ type: "text" as const, text: JSON.stringify(value, null, 1) }]) as McpToolCallResult["content"],
    structuredContent: value,
  });
}

/** Encode a thrown value as an MCP error result with text content. */
export function mcpToolTextError(error: unknown): McpToolCallResult {
  const text = error instanceof Error ? error.message : String(error);
  return Object.freeze({
    content: Object.freeze([{ type: "text" as const, text }]) as McpToolCallResult["content"],
    isError: true as const,
  });
}
