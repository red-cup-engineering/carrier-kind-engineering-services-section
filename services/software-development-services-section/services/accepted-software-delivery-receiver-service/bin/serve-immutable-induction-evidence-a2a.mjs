#!/usr/bin/env node
import { resolve } from "node:path";
import { serveContractedAgent } from "@red-cup-engineering/a2a-contracted-agent-service";
import { readImmutableEvidenceRoutes } from "../src/immutable-induction-evidence.mjs";
const root = resolve(import.meta.dirname, "..");
const port = process.env.PORT === undefined ? undefined : Number(process.env.PORT);
if (port !== undefined && (!Number.isSafeInteger(port) || port < 1 || port > 65535)) {
  throw new Error("PORT must be a deployment allocation");
}
const routesFile = process.env.IMMUTABLE_EVIDENCE_ROUTES;
if (typeof routesFile !== "string" || routesFile.length === 0) {
  throw new Error("IMMUTABLE_EVIDENCE_ROUTES is required");
}
readImmutableEvidenceRoutes(routesFile);
serveContractedAgent({ port, host: process.env.HOST ?? "127.0.0.1", baseUrl: process.env.BASE_URL,
  agentCard: resolve(root, "content/agent-cards/immutable-induction-evidence-read-node.json"),
  executor: process.execPath,
  executorArgs: [resolve(root, "bin/execute-immutable-induction-evidence-a2a-message.mjs")],
}).then(({ server, baseUrl }) => { process.stdout.write(`${baseUrl}\n`); const stop = () => server.close(() => process.exit(0)); process.once("SIGINT", stop); process.once("SIGTERM", stop); }).catch((error) => { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; });
