#!/usr/bin/env node
import { classifyWork } from "@lenticule-science/work-science-services-section";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

/**
 * Reads one work item's skillful-work type and attention lane off the item itself.
 * @param {object} request A record with scope, optional text, and optional grammar parameters.
 * @returns {object} A WorkDemand record.
 * @throws {TypeError} When the scope is not a non-empty string.
 */
export function classifyWorkDemand(request) {
  if (typeof request?.scope !== "string" || request.scope.length === 0) throw new TypeError("scope is required");
  const repairScriptKinds = Array.isArray(request.repairScriptKinds) ? request.repairScriptKinds : ["exact-deps", "data-custody"];
  const recognizedKinds = Array.isArray(request.recognizedKinds) ? request.recognizedKinds : ["import-stratification", "checkout-bound-unit"];
  const gatedFrictionKinds = Array.isArray(request.gatedFrictionKinds) ? request.gatedFrictionKinds : ["command", "tool", "carrier-falsehood"];
  const text = typeof request.text === "string" ? request.text : "";
  const scope = request.scope;
  const kindOf = (kinds) => kinds.find((kind) => scope.startsWith(`task:${kind}-`)) ?? null;
  const repairScript = kindOf(repairScriptKinds);
  const recognized = kindOf(recognizedKinds);
  const gatedFriction = gatedFrictionKinds.find((kind) => scope.startsWith(`task:friction-${kind}-`)) ?? null;
  const scriptPath = /\bscripts\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\.(?:mjs|mts|sh)\b/u.exec(text);
  const commandGate = /\b(?:npm (?:test|run [a-z:-]+)|node --test|exit(?:s)? (?:0|1|2)|exit status)\b/u.exec(text);
  const evidence = [];
  let operation = "open";
  let inputsAndPath = "open";
  if (repairScript !== null) {
    operation = "settled";
    inputsAndPath = "settled";
    evidence.push(`scope owned by repair script ${repairScript}: operation and inputs/path settled`);
  } else if (recognized !== null) {
    operation = "settled";
    evidence.push(`checker-recognized scope ${recognized}: operation settled by its finding schema`);
  } else if (gatedFriction !== null) {
    operation = "settled";
    evidence.push(`friction scope carries its own gate (${gatedFriction}): operation settled`);
  }
  if (inputsAndPath === "open" && scriptPath !== null) {
    inputsAndPath = "settled";
    evidence.push(`text names a script path: inputs/path settled (${scriptPath[0]})`);
  }
  if (operation === "open" && commandGate !== null) {
    operation = "settled";
    evidence.push(`text names a command gate: operation settled (${commandGate[0]})`);
  }
  if (operation === "open") evidence.push("operation open: no scope kind or command gate names it");
  if (inputsAndPath === "open") evidence.push("inputs/path open: no repair script or script path names it");
  const determination = Object.freeze({ operation, inputsAndPath });
  const workType = classifyWork(determination);
  const lane = { process: "script", derivation: "run-and-read", procedure: "bounded-inference", inquiry: "frontier" }[workType];
  return { type: "WorkDemand", scope, workType, lane, determination, repairScript, evidence };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "classify-work-demand", description: "Reads one work item's skillful-work type and attention lane off the item itself.", operation: classifyWorkDemand }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
