#!/usr/bin/env node
/**
 * infograph-mcp - stdio MCP server for the package operation surface.
 */
import { conurbationMcpApex } from "../mcp-surface.mjs";
import { activateMcpRequestedCapabilities, mcpOptions, mcpProcessConfig } from "@red-cup-engineering/feltos/apps/infograph/mcp-options";
import { once } from "node:events";
import { serveMcpStdio } from "@red-cup-engineering/mcp-engineering-services-section/server";
import { programMcpHandle } from "@red-cup-engineering/feltos/presentation/serving";
import { serviceLifecycleEvent } from "@red-cup-engineering/node-process-services-section/lifecycle";
import { trustedOperationSourcesFromProcessOptions } from "@red-cup-engineering/feltos/apps/infograph/fern-catalog";
import { firmPoolAuthorityResolver } from "@red-cup-engineering/feltos/apps/infograph/firm-pool-authority";
import { executeAgencyWorkProvider } from "@red-cup-engineering/feltos/apps/infograph/agency-work-provider";
import { journalProviderDelegationAuthorizer, journalWorkDischargeReceiverAuthorizer, providerDelegationAuthorityAnchorFromFile } from "@red-cup-engineering/feltos/work/provider-delegation-authority";
import { infographInferenceSource } from "@red-cup-engineering/feltos/apps/infograph/inference-source";
import { BOUNDED_INFERENCE_SERVICE_MODEL } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-work-lot-source";
import { AGENT_WORKER_STAGE_VERBS } from "@red-cup-engineering/feltos/operations/agent-worker/service";
import { journalEncounterStore } from "@red-cup-engineering/feltos/operations/filesystem/services/encounter-store";
import { journalRpcWitness } from "@red-cup-engineering/feltos/operations/filesystem/services/rpc-witness";
import { defaultFilesystemBinding } from "@red-cup-engineering/feltos/operations/filesystem/services/read-write";
import { encounterExecutionControl } from "@red-cup-engineering/feltos/encounter/control";
import { authorizationFromCapabilityAssertions } from "@red-cup-engineering/feltos/capability";
import { authorizationFromStanding } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { inferenceProviderOperation, witnessedInferenceEncounterPort } from "@red-cup-engineering/feltos/agents/inference/rpc";
import { grantAssertion } from "@red-cup-engineering/feltos/capability";
import { admitCapabilityAssertions, readCapabilityAssertions } from "@red-cup-engineering/feltos/operations/filesystem/services/capability-assertions";

import { processIsoNow } from "@red-cup-engineering/node-process-services-section/clock";
import { processDataRootConfig } from "@red-cup-engineering/node-process-services-section/config";
import { isDirectEntrypoint, processArguments, processEntrypointArgument, processPackageRoot } from "@red-cup-engineering/node-process-services-section/entrypoint";
import { processEnvironment, processEnvValue } from "@red-cup-engineering/node-process-services-section/environment";
import { runProcessMain } from "@red-cup-engineering/node-process-services-section/main-runner";
import { processStdin, processStdout } from "@red-cup-engineering/node-process-services-section/stdio";

async function main() {
  const args = processArguments();
  const dataRoot = processDataRootConfig({
    defaultRoot: processPackageRoot(import.meta.url),
    args,
    envName: "METROPLAT_DATA_ROOT", configFileName: "metroplat.config.json",
    configEnvName: "METROPLAT_CONFIG",
    legacyEnvNames: Object.freeze(["METROPLAT_DATA"]),
  }).dataRoot;
  const processConfig = mcpProcessConfig(args, processEnvironment());
  const resolveAgencyWorkAuthority = processConfig.firmPoolRoot === undefined
    ? undefined
    : firmPoolAuthorityResolver({ firmPoolRoot: processConfig.firmPoolRoot }, defaultFilesystemBinding(dataRoot));
  const authorizeProviderDelegation = processConfig.providerDelegationAuthorityAnchor === undefined
    ? undefined
    : journalProviderDelegationAuthorizer(defaultFilesystemBinding(dataRoot), providerDelegationAuthorityAnchorFromFile(processConfig.providerDelegationAuthorityAnchor, defaultFilesystemBinding(dataRoot)));
  const authorizeWorkDischargeReceiver = processConfig.providerDelegationAuthorityAnchor === undefined
    ? undefined
    : journalWorkDischargeReceiverAuthorizer(defaultFilesystemBinding(dataRoot), providerDelegationAuthorityAnchorFromFile(processConfig.providerDelegationAuthorityAnchor, defaultFilesystemBinding(dataRoot)));
  const trustedOperationSources = await trustedOperationSourcesFromProcessOptions(processConfig);
  const rootName = "@red-cup-engineering/metroplat";
  const encounters = journalEncounterStore(dataRoot, { namespace: rootName });
  const configuredInference = infographInferenceSource({ env: processEnvironment(), now: processIsoNow });
  const inferenceProvider = inferenceProviderOperation(
    configuredInference.provider,
    configuredInference.source,
    encounters,
    encounterExecutionControl(),
  );
  const inference = witnessedInferenceEncounterPort({
    operation: inferenceProvider,
    encounters,
    witness: journalRpcWitness(dataRoot, { namespace: rootName }),
    authorize: authorizationFromCapabilityAssertions(
      authorizationFromStanding(new Map([[inferenceProvider.ref, "held"]]), "infograph-inference-provider"),
      () => readCapabilityAssertions(dataRoot),
      "settled-capability-assertions",
    ),
    now: processIsoNow,
  });
  const workerModel = processEnvValue("METROPLAT_AGENT_WORKER_MODEL");
  if (configuredInference.provider === "inference-work-lot.market" && workerModel !== undefined
    && workerModel.length > 0 && workerModel !== BOUNDED_INFERENCE_SERVICE_MODEL) {
    throw new TypeError(`METROPLAT_AGENT_WORKER_MODEL must be ${BOUNDED_INFERENCE_SERVICE_MODEL} when the inference-work-lot market is selected`);
  }
  const workerId = workerModel === undefined || workerModel.length === 0
    ? undefined
    : processEnvValue("METROPLAT_AGENT_WORKER_ID") ?? "infograph-worker";
  if (workerId !== undefined) {
    const workerCapabilityVerbs = new Set([
      ...AGENT_WORKER_STAGE_VERBS,
      ...(processEnvValue("METROPLAT_AGENT_WORKER_CAPABILITIES") ?? "").split(",").map((value) => value.trim()).filter((value) => value.length > 0),
    ]);
    const at = processIsoNow();
    admitCapabilityAssertions({
      dataRoot,
      rootName,
      date: at.slice(0, 10),
      assertions: [...workerCapabilityVerbs].map((verb) => grantAssertion(rootName, workerId, `${rootName}#${verb}`, at)),
    });
  }
  let induced;
  // A data root's own single-apex behavior is unchanged: `conurbationMcpApex`
  // is exactly `defaultMcpApex(dataRoot)` whenever 0 or 1 inhabited roots are
  // discovered under it. It only composes when `dataRoot` really is a
  // conurbation of more than one inhabited root.
  induced = conurbationMcpApex(dataRoot, {
    ...(processConfig.claudeSessionRoot === undefined ? {} : { claudeSessionRoot: processConfig.claudeSessionRoot }),
    ...(processConfig.codexSessionRoot === undefined ? {} : { codexSessionRoot: processConfig.codexSessionRoot }),
    trustedOperationSources,
    workOptions: Object.freeze({
      ...(resolveAgencyWorkAuthority === undefined ? {} : { resolveAgencyWorkAuthority }),
      ...(authorizeProviderDelegation === undefined ? {} : { authorizeProviderDelegation }),
      ...(authorizeWorkDischargeReceiver === undefined ? {} : { authorizeWorkDischargeReceiver }),
      ...(workerId === undefined || workerModel === undefined || workerModel.length === 0 ? {} : {
        executeAgencyWork: (item) => executeAgencyWorkProvider(item, {
          surface: induced, dataRoot, rootName, workerId, provider: configuredInference.provider,
          model: workerModel, inference, now: processIsoNow,
        }),
      }),
    }),
  });
  activateMcpRequestedCapabilities(dataRoot, induced, processConfig);
  const options = mcpOptions(dataRoot, induced, processEnvironment(), processConfig.subject);
  const lifecycle = (boundary, event, detail, ok = true) => options.lifecycle?.(serviceLifecycleEvent({
    service: "infograph-mcp", boundary, event, ok, at: options.now(), ...(detail === undefined ? {} : { detail }), evidence: ["src/infograph/bin/infograph-mcp.mjs"],
  }));
  lifecycle("mcp-stdio", "start");
  lifecycle("stream", "stream-open", { input: "stdin", output: "stdout" });
  const input = processStdin();
  // The one MCP stdio transport: line or Content-Length framed messages, each admitted as an arrival.
  const stdio = serveMcpStdio(async (message) => (await programMcpHandle(induced, message, options)) ?? null, { input, output: processStdout() });
  await once(input, "end");
  await stdio.done();
  lifecycle("stream", "stream-close", { input: "stdin", output: "stdout" });
  lifecycle("mcp-stdio", "close");
  return 0;
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  void runProcessMain(main, { name: "infograph-mcp" });
}
