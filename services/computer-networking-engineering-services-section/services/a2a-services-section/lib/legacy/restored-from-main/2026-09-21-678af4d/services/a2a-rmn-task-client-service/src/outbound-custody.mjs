import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function nonempty(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label} must be nonempty`);
  return value;
}

/** Durable task custody is scoped to one deliberate transport attempt. */
export function outboundRecordPath(root, agentUrl, inputNi, attemptId) {
  if (!root) return null;
  const coordinates = `${new URL(agentUrl).href}\n${nonempty(inputNi, "outbound input NI")}\n${nonempty(attemptId, "outbound attempt identity")}`;
  const digest = createHash("sha256").update(coordinates, "utf8").digest("hex");
  return resolve(root, digest.slice(0, 2), `${digest}.json`);
}

export function readOutboundRecord(path, agentUrl, inputNi, attemptId) {
  if (!path) return null;
  try {
    const record = JSON.parse(readFileSync(path, "utf8"));
    if (record.agentUrl !== new URL(agentUrl).href || record.inputNi !== inputNi
      || record.attemptId !== attemptId || typeof record.taskId !== "string") {
      throw new Error(`outbound A2A custody record drifted at ${path}`);
    }
    return record;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export function seatOutboundRecord(path, record) {
  if (!path) return;
  mkdirSync(dirname(path), { recursive: true });
  try {
    writeFileSync(path, `${JSON.stringify(record)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const seated = readOutboundRecord(path, record.agentUrl, record.inputNi, record.attemptId);
    if (seated.taskId !== record.taskId) throw new Error(`concurrent outbound A2A submissions diverged at ${path}`);
  }
}
