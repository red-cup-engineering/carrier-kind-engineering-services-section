#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CONTRACT } from "./law.mjs";
import { RECORD_KIND, identify } from "./semantic-content.mjs";

export const CONTEXT = "https://www.w3.org/ns/activitystreams";
export const ACTOR = "urn:ame:clockkeeper-service";
export const CAPABILITY = `${ACTOR}:capability:read-system-time`;

function id(value) { return identify(value, RECORD_KIND).id; }
function record(value) { return Object.freeze({ id: id(value), ...value }); }
function response(type, request, object) {
  return record({
    "@context": CONTEXT,
    type,
    actor: ACTOR,
    target: request?.actor ?? null,
    inReplyTo: request?.id ?? null,
    object,
  });
}
function problem(request) {
  if (request?.["@context"] !== CONTEXT) return "activitystreams-context-required";
  if (request.type !== "Question") return "system-time-question-required";
  if (typeof request.actor !== "string" || !request.actor) return "customer-actor-required";
  if (request.target !== ACTOR) return "question-must-address-clockkeeper";
  if (request.capability !== CAPABILITY) return "read-system-time-capability-required";
  if (request.object?.type !== "SystemTimeQuestion" || Object.keys(request.object).some((key) => key !== "type")) return "exact-system-time-question-required";
  return null;
}

export function readSystemTime(request, { now = () => Date.now() } = {}) {
  const refusal = problem(request);
  if (refusal) return response("Reject", request, {
    type: "SystemTimeRefusal",
    contract: CONTRACT,
    reason: refusal,
    customerTerritoryMutation: false,
  });
  const epochMilliseconds = now();
  if (!Number.isSafeInteger(epochMilliseconds) || epochMilliseconds < 0) throw new Error("system clock returned an invalid epoch millisecond reading");
  return response("Create", request, {
    type: "SystemTimeReading",
    contract: CONTRACT,
    observedAt: new Date(epochMilliseconds).toISOString(),
    epochMilliseconds,
    clock: "system-realtime",
    precisionMilliseconds: 1,
    scheduled: false,
    deliveredActivity: false,
    processExecuted: false,
    customerTerritoryMutation: false,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const request = JSON.parse(readFileSync(0, "utf8"));
    const result = readSystemTime(request);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.type === "Reject") process.exitCode = 2;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
