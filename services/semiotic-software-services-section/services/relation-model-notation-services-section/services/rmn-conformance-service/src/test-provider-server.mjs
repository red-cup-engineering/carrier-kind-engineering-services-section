import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serveContractedAgent } from "@red-cup-engineering/a2a-contracted-agent-service";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tasks = new Map(), coordination = new Map();
const taskKey = ({ taskId, tenant = "" }) => `${tenant}\u0000${taskId}`;
const coordinationKey = ({ namespace, tenant = "", key }) => `${namespace}\u0000${tenant}\u0000${key}`;
const taskSource = Object.freeze({
  async put(record) { tasks.set(taskKey(record), structuredClone(record)); return structuredClone(record); },
  async get(record) { const value = tasks.get(taskKey(record)); return value === undefined ? null : structuredClone(value); },
  async list({ tenant = "" } = {}) { return [...tasks.values()].filter((record) => record.tenant === tenant).map((record) => structuredClone(record)); },
});
const coordinationSource = Object.freeze({
  async put(record) { const value = { ...structuredClone(record), contentSha256: "test", etag: randomUUID() }; coordination.set(coordinationKey(record), value); return structuredClone(value); },
  async get(record) { const value = coordination.get(coordinationKey(record)); return value === undefined ? null : structuredClone(value); },
  async list({ namespace, tenant = "" }) { return [...coordination.values()].filter((record) => record.namespace === namespace && record.tenant === tenant).map((record) => structuredClone(record)); },
  async remove(record) { return coordination.delete(coordinationKey(record)); },
});

serveContractedAgent({
  port: Number(process.env.PORT ?? "8786"), host: process.env.HOST ?? "127.0.0.1", baseUrl: process.env.BASE_URL,
  agentCard: resolve(ROOT, "content/agent-cards/rmn-semantic-conformance.json"), executor: process.execPath,
  executorArgs: [resolve(ROOT, "bin/execute-a2a-task.mjs")], taskSource, coordinationSource,
}).then(({ baseUrl }) => process.stdout.write(`${baseUrl}\n`)).catch((error) => { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; });
