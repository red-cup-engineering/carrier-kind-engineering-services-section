#!/usr/bin/env node
/**
 * metroplat-serve - the HTTP/OpenAPI/MCP/web-UX transport over the package's operations.
 *
 * Binds the CLI's `projectSurface` apex to `node:http`; see `presentation/serving.mts`
 * for the routed transports.
 *
 *   metroplat-serve
 */
import { assembleDefaultService, platformOperationFamilyDescriptors } from "../src/catalog.mjs";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { dataViewResources } from "@red-cup-engineering/metroplat/dashboards/standing-view";
import { tileResource } from "@red-cup-engineering/metroplat/dashboards/tile";
import { discoverClaudeSessionTranscripts, readClaudeSessionWorkClaims } from "@red-cup-engineering/feltos/agents/sessions/claude-code/service";
import { filesystemArrivalOptions } from "@red-cup-engineering/computer-system-engine/rpc/arrival-store";
import { filesystemRpcFeedResponder, journalRpcWitness } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { journalEncounterStore } from "@red-cup-engineering/feltos/encounter/store";
import { encounterExecutionControl } from "@red-cup-engineering/feltos/encounter/control";
import { filesystemServiceLifecycleSink } from "@red-cup-engineering/computer-system-engine/journal/service-lifecycle";
import { appendHoleObservationAtRoot } from "@red-cup-engineering/metroplat/sites/hole/record";
import { handRegisteredOperationsFindings, readCheckoutHealth } from "@red-cup-engineering/computer-code-development-engine/monitoring/checkout-health/checks";
import { normalizePackageForm } from "@red-cup-engineering/computer-code-development-engine/workspace/package-form/service";
import { executeJavascriptNodeCommand } from "@red-cup-engineering/execute-javascript-node-command-service";
import { processIsoNow } from "@red-cup-engineering/node-process-services-section/clock";
import { processCommandExitCode } from "@red-cup-engineering/node-process-services-section/command";
import { processDataRootConfig } from "@red-cup-engineering/node-process-services-section/config";
import { isDirectEntrypoint, processArguments, processEntrypointArgument, processPackageRoot } from "@red-cup-engineering/node-process-services-section/entrypoint";
import { processEnvironment, processEnvNumber, processEnvValue } from "@red-cup-engineering/node-process-services-section/environment";
import { writeProcessStderr, writeProcessStdout } from "@red-cup-engineering/node-process-services-section/stdio";
import { serveSchemaNamespace } from "@red-cup-engineering/metroplat/http/server";
import { jsonRepr } from "@red-cup-engineering/http-services-section/representation";
import { schemaNamespaceResource } from "@red-cup-engineering/metroplat/presentation/mounting";
import { projectSurface } from "@red-cup-engineering/metroplat/presentation/surface";
import { holeRootRoute, holeRouteOwner } from "@red-cup-engineering/metroplat/sites/hole/route";
import { authorizationFromCapabilityAssertions } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { authorizationFromStanding } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { inferenceProviderOperation, witnessedInferenceEncounterPort } from "@red-cup-engineering/feltos/agents/inference/rpc";
import { infographInferenceSource } from "@red-cup-engineering/metroplat/inference-source";
import { BOUNDED_INFERENCE_SERVICE_MODEL } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-work-lot-source";
import { AGENT_WORKER_STAGE_VERBS, runAgentWorkerEngine } from "@red-cup-engineering/feltos/agents/worker";
import { grantAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { admitCapabilityAssertions, readCapabilityAssertions } from "@red-cup-engineering/computer-system-engine/rpc/capability-assertions";
import { activateHttpRequestedCapabilities, httpProcessConfig } from "@red-cup-engineering/metroplat/http-options";
import { systemNodeDeclaredPeerKeys, systemNodeFromProcessEnvironment, systemNodeKeyFromProcessEnvironment, systemNodeResource, systemSettlementTypeGrants, systemSettlementPeering } from "@red-cup-engineering/computer-system-engine/rpc/node";
import { directoryRemote } from "@red-cup-engineering/semiotic-eavt-services-section/exchange";
import { resolveInfographProcessOptions } from "@red-cup-engineering/metroplat/process-options";
import { installedMetroplatFromProcessOptions } from "@red-cup-engineering/metroplat/instance";
import { firmPoolAuthorityResolver } from "@red-cup-engineering/metroplat/firm-pool-authority";
import { executeAgencyWorkProvider } from "@red-cup-engineering/feltos/work/agency-work-provider";
import { journalProviderDelegationAuthorizer, journalWorkDischargeReceiverAuthorizer, providerDelegationAuthorityAnchorFromFile } from "@red-cup-engineering/feltos/work/provider-delegation-authority";

/** Tell systemd that the HTTP listener exists, but only in a notify service. */
export function notifySystemdWhenHttpReady(options

 = {}) {
  if (options.notifySocket === undefined) return;
  const runCommand = options.runCommand ?? executeJavascriptNodeCommand;
  const receipt = runCommand({
    type: "JavascriptNodeCommandExecutionRequest",
    version: 1,
    command: "/usr/bin/systemd-notify",
    arguments: Object.freeze(["--ready", "--status=MetroPlat HTTP listener ready"]),
    directory: processPackageRoot(import.meta.url),
    environment: null,
    input: null,
  });
  const code = processCommandExitCode(receipt.result);
  if (code !== 0) throw new Error(`metroplat-serve: systemd readiness notification failed with exit code ${code}`);
}

async function main() {
  const port = processEnvNumber("PORT", 8787);
  const host = processEnvValue("HOST");
  const dataRoot = processDataRootConfig({
    defaultRoot: processPackageRoot(import.meta.url),
    args: processArguments(),
    envName: "METROPLAT_DATA_ROOT", configFileName: "metroplat.config.json",
    configEnvName: "METROPLAT_CONFIG",
    legacyEnvNames: Object.freeze(["METROPLAT_DATA"]),
  }).dataRoot;
  const httpConfig = httpProcessConfig(processArguments(), processEnvironment());
  const node = systemNodeFromProcessEnvironment(processEnvironment());
  const nodeKey = systemNodeKeyFromProcessEnvironment(processEnvironment());
  // A node with a key exchanges only the store types explicitly granted to each peer.
  const peering = node === undefined || nodeKey === undefined ? undefined : systemSettlementPeering(node, nodeKey, fetch, { declaredKeys: systemNodeDeclaredPeerKeys(processEnvironment(), node) });
  const settlementGrants = node === undefined ? undefined : systemSettlementTypeGrants(processEnvironment(), node);
  // --fern/--operations-root resolve exactly as they do at the CLI and MCP
  // process boundaries (../src/process-options.mjs); httpConfig
  // above resolves only the HTTP-specific subject/capability flags.
  const processOptions = resolveInfographProcessOptions(processArguments(), "anonymous", processEnvironment());
  const subject = httpConfig.subject;
  // The served surface is the mesh of module families: each module's operations
  // mount at the schema nodes they act on; the root node is the pooled
  // coproduct. read/write bind to this node's own root: the node IS the site it
  // admits into.
  const binding = Object.freeze({
    ...defaultFilesystemBinding(dataRoot, { packageRoot: processPackageRoot(import.meta.url), now: processIsoNow }),
    readCheckoutHealth,
    handRegisteredOperationsFindings,
    normalizePackageForm,
  });
  const installed = await installedMetroplatFromProcessOptions(processOptions, null);
  const rootName = installed.identity.id;
  const resolveAgencyWorkAuthority = processOptions.firmPoolRoot === undefined
    ? undefined
    : firmPoolAuthorityResolver({ firmPoolRoot: processOptions.firmPoolRoot }, binding);
  const authorizeProviderDelegation = processOptions.providerDelegationAuthorityAnchor === undefined
    ? undefined
    : journalProviderDelegationAuthorizer(binding, providerDelegationAuthorityAnchorFromFile(processOptions.providerDelegationAuthorityAnchor, binding));
  const authorizeWorkDischargeReceiver = processOptions.providerDelegationAuthorityAnchor === undefined
    ? undefined
    : journalWorkDischargeReceiverAuthorizer(binding, providerDelegationAuthorityAnchorFromFile(processOptions.providerDelegationAuthorityAnchor, binding));
  const encounters = journalEncounterStore(dataRoot, { namespace: rootName });
  const encounterControl = encounterExecutionControl();
  const configuredInference = infographInferenceSource({ env: processEnvironment(), now: processIsoNow });
  const inferenceProvider = inferenceProviderOperation(
    configuredInference.provider,
    configuredInference.source,
    encounters,
    encounterControl,
  );
  const inferenceBinding = {
    operation: inferenceProvider,
    encounters,
    witness: journalRpcWitness(dataRoot, { namespace: rootName }),
    authorize: authorizationFromCapabilityAssertions(
      authorizationFromStanding(new Map([[inferenceProvider.ref, "held"]]), "infograph-inference-provider"),
      () => readCapabilityAssertions(dataRoot),
      "settled-capability-assertions",
    ),
    now: processIsoNow,
  };
  const inferenceEncounters = witnessedInferenceEncounterPort(inferenceBinding);
  const workerModel = processEnvValue("METROPLAT_AGENT_WORKER_MODEL");
  if (configuredInference.provider === "inference-work-lot.market" && workerModel !== undefined
    && workerModel.length > 0 && workerModel !== BOUNDED_INFERENCE_SERVICE_MODEL) {
    throw new TypeError(`METROPLAT_AGENT_WORKER_MODEL must be ${BOUNDED_INFERENCE_SERVICE_MODEL} when the inference-work-lot market is selected`);
  }
  const workerId = workerModel === undefined || workerModel.length === 0
    ? undefined
    : processEnvValue("METROPLAT_AGENT_WORKER_ID") ?? "infograph-worker";
  const workerCapabilityVerbs = workerId === undefined ? undefined : new Set([
    ...AGENT_WORKER_STAGE_VERBS,
    ...(processEnvValue("METROPLAT_AGENT_WORKER_CAPABILITIES") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  ]);
  if (workerId !== undefined && workerCapabilityVerbs !== undefined) {
    admitCapabilityAssertions({
      dataRoot,
      rootName,
      date: processIsoNow().slice(0, 10),
      assertions: [...workerCapabilityVerbs].map((verb) => grantAssertion(rootName, workerId, `${rootName}#${verb}`, processIsoNow())),
    });
  }
  let assembly;
  const workOptions = Object.freeze({
    instanceIdentity: installed.identity,
    ...(resolveAgencyWorkAuthority === undefined ? {} : { resolveAgencyWorkAuthority }),
    ...(authorizeProviderDelegation === undefined ? {} : { authorizeProviderDelegation }),
    ...(authorizeWorkDischargeReceiver === undefined ? {} : { authorizeWorkDischargeReceiver }),
    ...(workerId === undefined || workerModel === undefined || workerModel.length === 0 ? {} : {
      executeAgencyWork: (item) => executeAgencyWorkProvider(item, {
        surface: assembly.apex, dataRoot, rootName, workerId, provider: configuredInference.provider,
        model: workerModel, inference: inferenceEncounters, now: processIsoNow,
      }),
    }),
  });
  const operational = await installedMetroplatFromProcessOptions(processOptions, binding, workOptions);
  assembly = assembleDefaultService(binding, rootName, operational.operationSources, workOptions,
    processOptions.instance === undefined ? undefined : platformOperationFamilyDescriptors);
  activateHttpRequestedCapabilities(dataRoot, assembly.operations, httpConfig, processIsoNow);
  const mounts = assembly.mounts;
  const requestedVerbs = new Set(httpConfig.requestedCapabilityVerbs);
  const assertedVerbs = new Set(httpConfig.assertedCapabilityVerbs);
  const mountedVerbs = new Set([...requestedVerbs, ...assertedVerbs]);
  const rootApex = mountedVerbs.size === 0 ? undefined : projectSurface(
    assembly.operations.filter((operation) => mountedVerbs.has(operation.verb)),
    {
      packageName: rootName,
      capabilityAssertions: () => readCapabilityAssertions(dataRoot),
      resources: [schemaNamespaceResource(() => mounts)],
    },
  );
  const workerAbort = new AbortController();
  const server = serveSchemaNamespace(mounts, {
    rootPackage: rootName,
    ...(processOptions.instance === undefined ? {} : { title: installed.identity.title }),
    routeOwner: holeRouteOwner(),
    rootRoute: holeRootRoute({
      observation: (input, observationOptions) => appendHoleObservationAtRoot(dataRoot, input, {
        ...observationOptions,
        rootName,
      }),
    }),
    resources: [
      {
        id: "metroplat.instance.identity",
        match: "/.well-known/metroplat-instance",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => jsonRepr(installed.identityCell),
      },
      ...(node === undefined ? [] : [systemNodeResource(node)]),
      ...dataViewResources({ binding }),
      // No transcript-count cap: `readClaudeSessionTranscript`/
      // `readClaudeSessionWorkClaims` now bound each transcript's own read to
      // a fixed byte budget (`src/integrations/anthropic/service`), the durable fix for
      // the earlier 4-transcript/6GB-heap stopgap this replaces.
      ...(binding.claudeSessionRoot === undefined ? [] : [tileResource({
        source: async () => {
          const discovery = await discoverClaudeSessionTranscripts(binding.claudeSessionRoot, binding);
          return Promise.all(discovery.matches.map((match) => readClaudeSessionWorkClaims(binding.claudeSessionRoot, match.relative, binding)));
        },
      })]),
    ],
    now: processIsoNow,
    witness: journalRpcWitness(dataRoot, { namespace: rootName }),
    ...filesystemArrivalOptions(dataRoot, rootName),
    journalFeed: filesystemRpcFeedResponder(dataRoot, rootName, processIsoNow),
    claimSession: { dataRoot, rootName, now: processIsoNow },
    lifecycle: filesystemServiceLifecycleSink(dataRoot, rootName),
    subject,
    caller: { transport: "http" },
    httpConfig,
    openAIChat: { inference: inferenceEncounters, subject },
    ...(peering === undefined ? {} : {
      settlementExchange: {
        verify: peering.verify,
        typesFor: settlementGrants.typesFor,
        ...directoryRemote(dataRoot),
      },
    }),
    ...(rootApex === undefined ? {} : { rootApex }),
  });
  const operations = mounts.reduce((count, mount) => count + mount.induced.operations.length, 0);
  server.once("close", () => workerAbort.abort());
  server.once("error", (error) => {
    workerAbort.abort();
    writeProcessStderr(`metroplat-serve: ${error.message}\n`);
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    const address = server.address();
    if (address === null || typeof address === "string") throw new Error("metroplat-serve: expected a TCP listening address");
    const listeningHost = address.family === "IPv6" ? `[${address.address}]` : address.address;
    writeProcessStdout(`metroplat-serve: ${operations} operations across ${mounts.length} module mounts on http://${listeningHost}:${address.port}/\n`);
    notifySystemdWhenHttpReady({ notifySocket: processEnvValue("NOTIFY_SOCKET") });
    if (workerModel !== undefined && workerModel.length > 0 && workerId !== undefined) {
      const intervalMs = processEnvNumber("METROPLAT_AGENT_WORKER_INTERVAL_MS", 1_000);
      const maxTurns = processEnvNumber("METROPLAT_AGENT_WORKER_MAX_TURNS", 8);
      writeProcessStdout(`metroplat-serve: agent worker ${workerId} consuming assigned work with ${workerModel}\n`);
      void runAgentWorkerEngine(assembly.apex, {
        dataRoot,
        rootName,
        workerId,
        model: workerModel,
        inference: inferenceEncounters,
        intervalMs,
        maxTurns,
        signal: workerAbort.signal,
        now: processIsoNow,
      }).catch((error) => {
        writeProcessStderr(`metroplat-serve: agent worker stopped: ${error instanceof Error ? error.message : String(error)}\n`);
      });
    }
  });
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  void main();
}
