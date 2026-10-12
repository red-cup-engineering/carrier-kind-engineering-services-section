#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createA2aServerProcess } from "@red-cup-engineering/a2a-services-section/a2a-server";
import { executeA2aMessage } from "./recursive-infomaterial-fabrication-a2a-executor.mjs";
const ROOT = resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT ?? 19834), host = process.env.HOST ?? "127.0.0.1", baseUrl = process.env.BASE_URL ?? `http://${host}:${port}`;
const agentCard = JSON.parse(readFileSync(resolve(ROOT, "content/agent-cards/recursive-infomaterial-fabrication-service.json"), "utf8"));
createA2aServerProcess({ port, host, baseUrl, agentCard, handlers: { "message/send": (message) => executeA2aMessage(message) } });
