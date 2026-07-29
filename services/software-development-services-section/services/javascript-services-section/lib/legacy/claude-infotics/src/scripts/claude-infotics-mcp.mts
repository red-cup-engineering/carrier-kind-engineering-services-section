#!/usr/bin/env node
/**
 * claude-infotics-mcp — stdio MCP server over the claude-infotics operation surface.
 *
 * Line-delimited JSON-RPC on stdin/stdout. Every tool call routes through the
 * same governed dispatcher as the CLI, so authorization and journal witnessing
 * are identical across transports.
 *
 * Wire it into a project's .mcp.json (or via `claude-harness-apply`):
 *   { "mcpServers": { "claude-infotics": { "type": "stdio",
 *       "command": "node",
 *       "args": ["<abs>/src/scripts/claude-infotics-mcp.mts", "--data-root", "<project>"] } } }
 */
import { createInterface } from "node:readline";
import {
  defaultFilesystemBinding,
  journalRpcWitness,
} from "@emsenn/metroplat/integrations/filesystem";
import { mcpJsonRpcLine, type JsonRpcRequest } from "@emsenn/metroplat/integrations/mcp";
import {
  isDirectEntrypoint,
  processArguments,
  processDataRootConfig,
  processEntrypointArgument,
  processIsoNow,
  processPackageRoot,
  processStdin,
  processStdout,
  runProcessMain,
} from "@emsenn/metroplat/integrations/process";

import { claudeInfoticsSurface } from "../surface.mts";
import { handleMcpRequest } from "../mcp.mts";
import { CLAUDE_INFOTICS_PROGRAM, CLAUDE_INFOTICS_SUBJECT } from "../authorization.mts";

async function main(): Promise<number> {
  const args = processArguments();
  const packageRoot = processPackageRoot(import.meta.url);
  const dataRoot = processDataRootConfig({
    defaultRoot: packageRoot,
    args,
    envName: "CLAUDE_INFOTICS_DATA_ROOT",
    configEnvName: "CLAUDE_INFOTICS_CONFIG",
  }).dataRoot;
  const binding = defaultFilesystemBinding(dataRoot, { packageRoot });
  const surface = claudeInfoticsSurface(binding, processIsoNow());
  const witness = journalRpcWitness(dataRoot);
  const stdout = processStdout();

  const lines = createInterface({ input: processStdin(), crlfDelay: Infinity });
  for await (const line of lines) {
    const text = line.trim();
    if (text.length === 0) continue;
    let request: JsonRpcRequest;
    try {
      request = JSON.parse(text) as JsonRpcRequest;
    } catch {
      stdout.write(mcpJsonRpcLine({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }));
      continue;
    }
    const envelope = await handleMcpRequest(surface, request, {
      subject: CLAUDE_INFOTICS_SUBJECT,
      program: CLAUDE_INFOTICS_PROGRAM,
      now: processIsoNow,
      witness,
    });
    if (envelope !== undefined) stdout.write(mcpJsonRpcLine(envelope));
  }
  return 0;
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  void runProcessMain(main, { name: "claude-infotics-mcp" });
}
