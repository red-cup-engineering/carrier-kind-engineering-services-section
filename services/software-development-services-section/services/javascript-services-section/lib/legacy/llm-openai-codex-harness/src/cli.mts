#!/usr/bin/env node
// @red-cup-engineering/llm-openai-codex-harness CLI — start the persistent Codex hub.
//
// Configuration via environment:
//   PORT            (default 18806)
//   HUB_PATH        (default /hub/mcp)
//   CODEX_BIN       (default "codex")
//   CODEX_ARGS      (default "mcp"; space-separated)
//   CODEX_AUTOSTART (default "1"; set "0" to start the hub without spawning codex)

import process from "node:process";
import { start } from "@red-cup-engineering/http-server";
import { createHarnessServerApp, DEFAULT_PORT, HUB_PATH } from "./service.mjs";
import { createCodexProcess } from "./process.mjs";

export async function main(env: Readonly<Record<string, string | undefined>>): Promise<void> {
  const port = Number(env["PORT"] ?? DEFAULT_PORT);
  const path = env["HUB_PATH"] ?? HUB_PATH;
  const codex = createCodexProcess({
    ...(env["CODEX_BIN"] === undefined ? {} : { bin: env["CODEX_BIN"] }),
    args: (env["CODEX_ARGS"] ?? "mcp").split(/\s+/).filter((s) => s.length > 0),
  });
  if (env["CODEX_AUTOSTART"] !== "0") codex.start();

  const app = createHarnessServerApp({ path, process: codex });
  const started = await start(app, port);
  const info = started as { port?: number; close?: () => Promise<void> };
  const status = codex.status();
  process.stdout.write(
    `llm-openai-codex-harness listening on :${info.port ?? port}${path}` +
      ` — codex: ${status.running ? `running (pid ${status.pid ?? "?"})` : `stopped${status.lastError ? ` (${status.lastError})` : ""}`}\n`,
  );

  const shutdown = (): void => {
    void codex.stop().then(() => info.close?.()).then(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

const proc = (globalThis as { process?: { argv?: string[]; env?: Record<string, string | undefined> } }).process;
const argv1 = proc?.argv?.[1];
if (typeof argv1 === "string" && import.meta.url === `file://${argv1}`) {
  void main(proc?.env ?? {});
}
