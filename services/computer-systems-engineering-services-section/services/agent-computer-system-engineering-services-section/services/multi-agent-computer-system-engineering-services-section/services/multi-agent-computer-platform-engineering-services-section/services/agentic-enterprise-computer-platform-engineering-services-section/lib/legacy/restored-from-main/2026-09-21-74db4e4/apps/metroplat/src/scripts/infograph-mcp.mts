#!/usr/bin/env node
/**
 * infograph-mcp - stdio MCP server for the package operation surface.
 */
import { conurbationMcpApex } from "../apps/infograph/mcp-surface.mts";
import { activateMcpRequestedCapabilities, mcpOptions, mcpProcessConfig } from "../apps/infograph/mcp-options.mts";
import { serveMcpStdio } from "../apps/infograph/mcp/index.mts";
import { trustedOperationSourcesFromProcessOptions } from "../apps/infograph/fern-catalog.mts";
import { firmPoolAuthorityResolver } from "../apps/infograph/firm-pool-authority.mts";
import { executeAgencyWorkProvider } from "../apps/infograph/agency-work-provider.mts";
import { journalProviderDelegationAuthorizer, journalWorkDischargeReceiverAuthorizer, providerDelegationAuthorityAnchorFromFile } from "../work/provider-delegation-authority.mts";
import { infographInferenceSource } from "../apps/infograph/inference-source.mts";
import { BOUNDED_INFERENCE_SERVICE_MODEL } from "../integrations/inference-work-lot/index.mts";
import { AGENT_WORKER_STAGE_VERBS } from "../integrations/agent-worker/index.mts";
import { journalEncounterStore } from "../integrations/filesystem/services/encounter-store.mts";
import { journalRpcWitness } from "../integrations/filesystem/services/rpc-witness.mts";
import { defaultFilesystemBinding } from "../integrations/filesystem/services/read-write.mts";
import { encounterExecutionControl } from "../encounter/index.mts";
import { authorizationFromCapabilityAssertions, authorizationFromStanding } from "../rpc/index.mts";
import { inferenceProviderOperation, witnessedInferenceEncounterPort } from "../agents/inference/index.mts";
import { grantAssertion } from "../lib/capability/index.mts";
import { admitCapabilityAssertions, readCapabilityAssertions } from "../integrations/filesystem/services/capability-assertions.mts";
import type { AgentWorkDispatchItem } from "../work/dispatch.mts";
import { isDirectEntrypoint, processArguments, processDataRootConfig, processEntrypointArgument, processEnvironment, processEnvValue, processIsoNow, processPackageRoot, processStdin, processStdout, runProcessMain } from "@red-cup-engineering/node-process-services-section";

async function main(): Promise<number> {
  const args = processArguments();
  const dataRoot = processDataRootConfig({
    defaultRoot: processPackageRoot(import.meta.url),
    args,
    envName: "METROPLAT_DATA_ROOT", configFileName: "metroplat.config.json",
    configEnvName: "METROPLAT_CONFIG",
    legacyEnvNames: Object.freeze(["METROPLAT_DATA"]),
  }).dataRoot;
  const processConfig = mcpProcessConfig(args);
  const resolveAgencyWorkAuthority = processConfig.firmPoolRoot === undefined
    ? undefined
    : firmPoolAuthorityResolver({ firmPoolRoot: processConfig.firmPoolRoot });
  const authorizeProviderDelegation = processConfig.providerDelegationAuthorityAnchor === undefined
    ? undefined
    : journalProviderDelegationAuthorizer(defaultFilesystemBinding(dataRoot), providerDelegationAuthorityAnchorFromFile(processConfig.providerDelegationAuthorityAnchor));
  const authorizeWorkDischargeReceiver = processConfig.providerDelegationAuthorityAnchor === undefined
    ? undefined
    : journalWorkDischargeReceiverAuthorizer(defaultFilesystemBinding(dataRoot), providerDelegationAuthorityAnchorFromFile(processConfig.providerDelegationAuthorityAnchor));
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
  let induced: ReturnType<typeof conurbationMcpApex>;
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
        executeAgencyWork: (item: AgentWorkDispatchItem) => executeAgencyWorkProvider(item, {
          surface: induced, dataRoot, rootName, workerId, provider: configuredInference.provider,
          model: workerModel, inference, now: processIsoNow,
        }),
      }),
    }),
  });
  activateMcpRequestedCapabilities(dataRoot, induced, processConfig);
  await serveMcpStdio(processStdin(), processStdout(), {
    ...mcpOptions(dataRoot, induced, process.env, processConfig.subject),
  });
  return 0;
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  void runProcessMain(main, { name: "infograph-mcp" });
}
