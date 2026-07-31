#!/usr/bin/env node
import { resolve } from "node:path";
import { serveContractedAgent } from "@red-cup-engineering/a2a-contracted-agent-service";
import { loadCellEnterpriseRuntime } from "../src/runtime.mjs";
const port = Number(process.env.PORT ?? 19841), host = process.env.HOST ?? "127.0.0.1", baseUrl = process.env.BASE_URL ?? `http://${host}:${port}`;
await loadCellEnterpriseRuntime();
serveContractedAgent({ port, host, baseUrl, agentCard: resolve("content/agent-cards/topical-knowledge-cell-enterprise.json"), executor: process.execPath, executorArgs: [resolve("bin/execute-a2a-task.mjs")] })
  .then(() => process.stdout.write(`${baseUrl}\n`)).catch((error) => { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; });
