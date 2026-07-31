#!/usr/bin/env node

import { resolve } from "node:path";
import { serveContractedAgent } from "@red-cup-engineering/a2a-contracted-agent-service";

const ROOT = resolve(import.meta.dirname, "..");
const port = process.env.PORT === undefined ? undefined : Number(process.env.PORT);
if (port !== undefined && (!Number.isSafeInteger(port) || port < 1 || port > 65535)) {
  throw new Error("PORT must be a valid colony-supplied deployment allocation");
}

serveContractedAgent({
  port,
  host: process.env.HOST ?? "127.0.0.1",
  baseUrl: process.env.BASE_URL,
  agentCard: resolve(ROOT, "content/agent-cards/accepted-software-delivery-receiver.json"),
  executor: process.execPath,
  executorArgs: [resolve(ROOT, "bin/execute-a2a-message.mjs")],
}).then(({ server, baseUrl }) => {
  process.stdout.write(`${baseUrl}\n`);
  const stop = () => server.close(() => process.exit(0));
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}).catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
