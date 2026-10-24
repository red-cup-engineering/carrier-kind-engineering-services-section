#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { CODEX_CUSTOMER, dispatchInferenceAsConfiguredCustomer } from "@red-cup-engineering/inference-dispatch-service/inference-dispatch";

import { processPromptCycle, recordPromptCycleAborted, recordPromptCycleFailure } from "../src/prompt-cycle.mjs";

process.env.WITNESS_JOURNAL_RDF_AGENT ??= "http://127.0.0.1:19764/.well-known/agent-card.json";
const cycleAt = process.argv.indexOf("--cycle");
if (cycleAt < 0 || !process.argv[cycleAt + 1]) throw new TypeError("--cycle is required");
const authorityAt = process.argv.indexOf("--placement-authority-file");
if (authorityAt < 0 || !process.argv[authorityAt + 1]) throw new TypeError("--placement-authority-file is required; direct local prompt workers are refused");
const placementAuthority = JSON.parse(readFileSync(resolve(process.argv[authorityAt + 1]), "utf8"));

const schema = {
  type: "object", additionalProperties: false, required: ["workItems"],
  properties: { workItems: { type: "array", minItems: 1, items: {
    type: "object", additionalProperties: false,
    required: ["ref", "objective", "desiredOutcome", "completionConditions", "dependencies", "candidate"],
    properties: {
      ref: { type: "string", minLength: 1 },
      objective: { type: "string", minLength: 1 }, desiredOutcome: { type: "string", minLength: 1 },
      completionConditions: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
      dependencies: { type: "array", items: { type: "string", minLength: 1 } },
      candidate: {
        type: "object", additionalProperties: false,
        required: ["type", "id", "taskClass", "principal", "requiredCapabilities", "requiredQualityTiers", "requiredEffects", "requiredExecutionClasses", "idempotence", "context", "outputContract", "measures", "routePolicy"],
        properties: {
          type: { const: "TypedWorkDemand" }, id: { type: "string", minLength: 1 }, taskClass: { type: "string", minLength: 1 }, principal: { type: "string", minLength: 1 },
          requiredCapabilities: { type: "array", uniqueItems: true, items: { type: "string", minLength: 1 } },
          requiredQualityTiers: { type: "array", uniqueItems: true, items: { type: "string", minLength: 1 } },
          requiredEffects: { type: "array", uniqueItems: true, items: { type: "string", minLength: 1 } },
          requiredExecutionClasses: { type: "array", uniqueItems: true, items: { type: "string", minLength: 1 } },
          idempotence: { type: "string", minLength: 1 },
          context: { type: "object", additionalProperties: false, required: ["identity", "authorityScope", "freshnessIdentity", "dataConstraints", "custodyConstraints"], properties: {
            identity: { type: "string", minLength: 1 }, authorityScope: { type: "string", minLength: 1 }, freshnessIdentity: { type: "string", minLength: 1 },
            dataConstraints: { type: "array", uniqueItems: true, items: { type: "string", minLength: 1 } }, custodyConstraints: { type: "array", uniqueItems: true, items: { type: "string", minLength: 1 } },
          } },
          outputContract: { type: "object", required: ["identity"], properties: { identity: { type: "string", minLength: 1 } } },
          difficulty: { type: "object", required: ["numerator", "denominator"], properties: { numerator: { type: "string" }, denominator: { type: "string" } } },
          measures: { type: "object", additionalProperties: { type: "integer", minimum: 0 } },
          routePolicy: { type: "object", additionalProperties: false, required: ["preferenceOrder", "reuse", "unknownObservations", "considerationPreference", "considerationCeilings", "resourceCeilings"], properties: {
            preferenceOrder: { type: "array", minItems: 1, items: { type: "array", minItems: 1, items: { enum: ["consideration", "resources", "latency", "acceptance-probability"] } } },
            reuse: { enum: ["forbid", "prefer-exact-accepted"] }, unknownObservations: { enum: ["choice-required", "prefer-observed"] },
            considerationPreference: { type: "array" }, considerationCeilings: { type: "array" }, resourceCeilings: { type: "array" },
          } },
        },
      },
    },
  } } },
};

const controller = new AbortController();
const abort = (signal) => controller.abort(`prompt-cycle worker received ${signal}`);
process.once("SIGTERM", abort);
process.once("SIGINT", abort);

const infer = async (prompt, start, { signal }) => {
  const result = await dispatchInferenceAsConfiguredCustomer({
    customer: "urn:ame:bare-cedar-fog-codex", workType: "extraction", taskClass: "codex-prompt-to-work-items",
    objective: "Extract the Leader's exact demand and corrections into the smallest dependency-aware set of executable work items. Supply a complete TypedWorkDemand candidate for every item, preserving capability, effects, execution class, authority, context, data and custody constraints, output contract, measures, route policy, and resource ceilings. Dependencies reference work-item ref values. Do not invent authority, completion, placement, or facts.",
    desiredUse: "Populate the persisted Codex MAPE cycle with candidate work items; Codex separately integrates and the customer separately accepts.",
    context: JSON.stringify({ prompt: prompt.prompt, interruption: prompt.interruption, supersedes: prompt.supersedes, cycle: start.cycle }),
    outputSchema: schema, enforceProviderSchema: true, mode: "live", requiredCapabilities: ["json-schema-output"],
  }, { customerActor: CODEX_CUSTOMER, signal });
  if (result.outcome !== "candidate-pending-codex-acceptance" || !result.candidate) throw new Error(`prompt inference did not deliver an assayed candidate: ${result.outcome ?? result.disposition ?? "unknown"}`);
  return { provider: result.provider, receipt: result.receipt?.id ?? result.receipt, product: result.candidate };
};

processPromptCycle(process.argv[cycleAt + 1], { infer, signal: controller.signal, placementAuthority }).then((result) => {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}).catch((error) => {
  if (controller.signal.aborted) recordPromptCycleAborted(process.argv[cycleAt + 1], error);
  else recordPromptCycleFailure(process.argv[cycleAt + 1], error);
  process.stderr.write(`process-prompt-cycle: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = controller.signal.aborted ? 0 : 1;
}).finally(() => {
  process.removeListener("SIGTERM", abort);
  process.removeListener("SIGINT", abort);
});
