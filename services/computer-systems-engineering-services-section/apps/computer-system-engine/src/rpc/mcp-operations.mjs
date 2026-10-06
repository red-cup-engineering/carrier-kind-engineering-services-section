/**
 * An MCP server's tools as operations: each named tool becomes an operation `<prefix>-<tool>`
 * whose body calls the tool over Streamable HTTP and returns its value, so a remote territory's
 * capabilities (a knowledge garden, another platform) take their place in an operation catalog
 * beside local ones. The connection opens on first use and is opened again after a failure.
 */
import { createMcpClient, mcpHttpTransport } from "@red-cup-engineering/mcp-engineering-services-section/client";
import { operation } from "./operation.mjs";

const firstSentence = (text) => String(text ?? "").split(/(?<=\.)\s/u)[0];

export function mcpToolOperations({ prefix, url, headers = () => ({}), tools, fetchImpl }) {
  let client;
  const connected = () => (client ??= createMcpClient({
    transport: mcpHttpTransport({ url, headers, ...(fetchImpl === undefined ? {} : { fetchImpl }) }),
    clientInfo: { name: `operations:${prefix}`, version: "0.1.0" },
  }));
  return Object.freeze(tools.map((tool) => operation({
    verb: `${prefix}-${tool.name.replace(/_/gu, "-")}`,
    summary: tool.title ?? firstSentence(tool.description),
    description: tool.description ?? tool.name,
    reads: [prefix],
    run: async (input) => {
      try { return await connected().call(tool.name, input ?? {}); }
      catch (error) { client = undefined; throw error; }
    },
  })));
}
