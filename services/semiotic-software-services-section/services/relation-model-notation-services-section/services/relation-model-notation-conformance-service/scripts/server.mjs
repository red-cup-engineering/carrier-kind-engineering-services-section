#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serveContractedAgent } from "@red-cup-engineering/a2a-contracted-agent-service";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** A membrane supplies durable task and coordination sources; this boundary owns no task state. */
export function serveRmnConformance(options = {}) {
  return serveContractedAgent({
    port: Number(process.env.PORT ?? "8786"), host: process.env.HOST ?? "127.0.0.1", baseUrl: process.env.BASE_URL,
    agentCard: resolve(ROOT, "content/agent-cards/rmn-semantic-conformance.json"),
    executor: process.execPath, executorArgs: [resolve(ROOT, "scripts/execute-a2a-task.mjs"),],
    ...options,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  serveRmnConformance().then(({ baseUrl }) => process.stdout.write(`${baseUrl}\n`))
    .catch((error) => { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; });
}
