#!/usr/bin/env node
// Call exactly one tool on one HTTP MCP node as its issued machine client. JSON
// arrives on stdin and the tool's own value is the only thing written to stdout.
import { createClientCredentialsClient } from "@red-cup-engineering/oauth-services-section/client-credentials";
import { createMcpClient, mcpHttpTransport } from "@red-cup-engineering/mcp-engineering-services-section/client";
import { pathToFileURL } from "node:url";
import { realpathSync } from "node:fs";

function option(argv, name) {
  const index = argv.indexOf(name);
  return index < 0 ? undefined : argv[index + 1];
}

function assignments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== "--argument") continue;
    const assignment = argv[index + 1] ?? "";
    const equals = assignment.indexOf("=");
    if (equals < 1) throw new TypeError("--argument requires name=value");
    values[assignment.slice(0, equals)] = assignment.slice(equals + 1);
  }
  return values;
}

async function stdinJson(stdin) {
  let text = "";
  stdin.setEncoding("utf8");
  for await (const chunk of stdin) text += chunk;
  return text.trim() === "" ? {} : JSON.parse(text);
}

export async function callMcpTool({ origin, clientId, clientSecret, tool, input, timeoutMs = null, fetchImpl = fetch }) {
  if (!origin || !clientId || !clientSecret) throw new TypeError("MCP_ORIGIN, MCP_CLIENT_ID and MCP_CLIENT_SECRET are required");
  if (!tool) throw new TypeError("--tool is required");
  const base = origin.replace(/\/$/u, "");
  const tokens = createClientCredentialsClient({ tokenUrl: `${base}/oauth/token`, clientId, clientSecret, resource: `${base}/mcp`, fetchImpl });
  const client = createMcpClient({
    transport: mcpHttpTransport({ url: `${base}/mcp`, headers: async () => ({ authorization: `Bearer ${await tokens.getToken()}` }), fetchImpl, ...(timeoutMs === null || timeoutMs === undefined ? {} : { signal: AbortSignal.timeout(timeoutMs) }) }),
    clientInfo: { name: "mcp-call-tool", version: "1.0.0" },
  });
  try {
    return await client.call(tool, input);
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const tool = option(argv, "--tool");
  const inputKey = option(argv, "--input-key");
  const stdin = await stdinJson(process.stdin);
  const input = { ...(inputKey === undefined ? stdin : { [inputKey]: stdin }), ...assignments(argv) };
  const value = await callMcpTool({
    origin: process.env.MCP_ORIGIN,
    clientId: process.env.MCP_CLIENT_ID,
    clientSecret: process.env.MCP_CLIENT_SECRET,
    tool,
    input,
    timeoutMs: option(argv, "--timeout-ms") === undefined ? null : Number(option(argv, "--timeout-ms")),
  });
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
