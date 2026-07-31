#!/usr/bin/env node
// @red-cup-engineering/llm-claude-harness CLI — start the 561 Group Operations Manifold MCP hub.
//
// Configuration via environment: PORT (default 18805), HUB_PATH (default /hub/mcp).

import { start } from "@red-cup-engineering/http-server";
import { createHarnessServerApp, DEFAULT_PORT, HUB_PATH } from "./service.mjs";

export async function main(env: Readonly<Record<string, string | undefined>>): Promise<void> {
  const port = Number(env["PORT"] ?? DEFAULT_PORT);
  const path = env["HUB_PATH"] ?? HUB_PATH;
  const app = createHarnessServerApp({ path });
  const started = await start(app, port);
  const info = started as { port?: number };
  process.stdout.write(`llm-claude-harness listening on :${info.port ?? port}${path}\n`);
}

const proc = (globalThis as { process?: { argv?: string[]; env?: Record<string, string | undefined> } }).process;
const argv1 = proc?.argv?.[1];
if (typeof argv1 === "string" && import.meta.url === `file://${argv1}`) {
  void main(proc?.env ?? {});
}
