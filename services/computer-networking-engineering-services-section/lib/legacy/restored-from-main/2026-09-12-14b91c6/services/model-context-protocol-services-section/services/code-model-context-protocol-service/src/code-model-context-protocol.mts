import {
  DEFAULT_MCP_PROTOCOL_VERSION,
  MCP_JSON_TYPE,
  mcpInitializeResult,
  mcpReachability,
  mcpToolsListResult,
  mcpToolTextResult,
  mcpToolStructuredResult,
  mcpToolTextError,
  type Json,
  type JsonObject,
  type McpToolAnnotations,
  type McpTool,
  type McpServerInfo,
  type McpInitializeResult,
  type McpReachability,
  type McpToolResult,
} from "@red-cup-engineering/model-context-protocol-services-section";

export {
  DEFAULT_MCP_PROTOCOL_VERSION,
  MCP_JSON_TYPE,
  mcpInitializeResult,
  mcpReachability,
  mcpToolsListResult,
  mcpToolTextResult,
  mcpToolStructuredResult,
  mcpToolTextError,
};
export type { Json, JsonObject, McpToolAnnotations, McpTool, McpServerInfo, McpInitializeResult, McpReachability };

/** This package's tool-call result shape is the shared `McpToolResult`; kept under its established local name for existing consumers. */
export type McpToolCallResult = McpToolResult;
export type McpToolsListResult = ReturnType<typeof mcpToolsListResult>;

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
