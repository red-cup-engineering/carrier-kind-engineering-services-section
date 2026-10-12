#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createA2aServer } from "@red-cup-engineering/a2a-services-section/a2a-server";
import { executeA2aMessage } from "./tensor-circuit-board-synthesis-a2a-executor.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT ?? 19848);
const host = process.env.HOST ?? "127.0.0.1";
const baseUrl = process.env.BASE_URL ?? `http://${host}:${port}`;
const agentCard = JSON.parse(readFileSync(resolve(ROOT, "content/agent-cards/tensor-circuit-board-synthesis-service.json"), "utf8"));

createA2aServer({
  port,
  host,
  baseUrl,
  agentCard,
  handlers: { "message/send": (message) => executeA2aMessage(message) },
}).then(() => process.stdout.write(`${baseUrl}\n`)).catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
