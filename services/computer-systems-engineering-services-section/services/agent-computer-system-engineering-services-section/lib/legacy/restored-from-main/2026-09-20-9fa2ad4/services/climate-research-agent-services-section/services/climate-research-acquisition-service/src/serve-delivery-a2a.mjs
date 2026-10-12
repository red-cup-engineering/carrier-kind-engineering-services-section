#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { serveContractedAgentProcess } from "@red-cup-engineering/a2a-contracted-agent-service";
import { createFilesystemContractedAgentSources } from "@red-cup-engineering/a2a-contracted-agent-service/filesystem-state-sources";
const root = resolve(import.meta.dirname, ".."), activation = JSON.parse(readFileSync(resolve(root, "content/config/delivery-agent.json"), "utf8"));
process.env.AGENT_CARD_SIGNING_KEY ??= resolve(root, activation.signingKeyDataPath);
process.env.AGENT_CARD_JWKS ??= resolve(root, activation.publicJwks);
process.env.AGENT_CARD_SIGNING_KID ??= activation.signingKid;
process.env.AGENT_CARD_SIGNING_ALG ??= activation.algorithm;
const { taskSource, coordinationSource } = createFilesystemContractedAgentSources({ stateRoot: resolve(process.env.CLIMATE_RESEARCH_DATA_ROOT ?? resolve(root, "data"), "a2a-state"), provider: "delivery" });
serveContractedAgentProcess({ port: activation.port, host: activation.host, baseUrl: activation.baseUrl, agentCard: resolve(root, activation.agentCard), executor: process.execPath, executorArgs: [resolve(root, "src/a2a-delivery-executor.mjs")], timeoutMs: activation.timeoutMs, taskSource, coordinationSource });
