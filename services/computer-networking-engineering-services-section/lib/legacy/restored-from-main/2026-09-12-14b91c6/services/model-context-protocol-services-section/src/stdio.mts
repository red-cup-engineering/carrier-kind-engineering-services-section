import type { Readable, Writable } from "node:stream";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { createMcpToolServer, type McpToolServerOptions } from "./model-context-protocol.mts";

export type McpStdioStreams = Readonly<{ stdin?: Readable; stdout?: Writable }>;

/** Connects a native-schema MCP tool server to the official line-delimited stdio transport. */
export async function serveMcpToolServerStdio(options: McpToolServerOptions, streams: McpStdioStreams = {}): Promise<Server> {
  const server = createMcpToolServer(options);
  await server.connect(new StdioServerTransport(streams.stdin, streams.stdout));
  return server;
}
