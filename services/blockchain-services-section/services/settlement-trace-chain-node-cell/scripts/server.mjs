#!/usr/bin/env node
import { resolve } from "node:path";
import { serveContractedAgent } from "@red-cup-engineering/a2a-contracted-agent-service";
const host = process.env.HOST ?? "127.0.0.1", port = Number(process.env.PORT ?? 15612), baseUrl = process.env.BASE_URL ?? `http://${host}:${port}`;
serveContractedAgent({host, port, baseUrl, agentCard: resolve("content/agent-cards/settlement-trace-chain-node-cell.json"), executor: process.execPath, executorArgs: [resolve("bin/execute-a2a-task.mjs")]})
  .then(() => process.stdout.write(`${baseUrl}\n`)).catch((error) => { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; });
