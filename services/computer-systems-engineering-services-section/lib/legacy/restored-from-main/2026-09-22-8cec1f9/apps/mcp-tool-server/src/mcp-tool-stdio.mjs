import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpToolServer } from "./mcp-tool-server.mjs";

/** Connect a JSON-schema MCP tool server to the line-delimited stdio transport. */
export async function serveMcpToolServerStdio(options, streams = {}) {
  const server = createMcpToolServer(options);
  await server.connect(new StdioServerTransport(streams.stdin, streams.stdout));
  return server;
}
