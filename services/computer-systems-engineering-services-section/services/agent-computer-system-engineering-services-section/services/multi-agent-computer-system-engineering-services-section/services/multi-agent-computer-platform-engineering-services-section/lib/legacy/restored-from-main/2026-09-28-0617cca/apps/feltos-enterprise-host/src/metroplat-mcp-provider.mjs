/**
 * FeltOS enterprise host provider for an installed MetroPlat ERP surface.
 * A node mounts the returned handler directly (an in-process MCP transport); nothing starts
 * MetroPlat as a child of its own. `environment` carries MetroPlat's settings (METROPLAT_*), and
 * `args` the same flags the CLI reads.
 */
import { activateMcpRequestedCapabilities, mcpOptions, mcpProcessConfig } from "@red-cup-engineering/metroplat/mcp-options";
import { installedMetroplatFromProcessOptions } from "@red-cup-engineering/metroplat/instance";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { operationDescriptor } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { processIsoNow } from "@red-cup-engineering/node-process-services-section/clock";
import { catalogOperationDescriptors } from "@red-cup-engineering/metroplat/generated/catalog-operation-descriptors";
import { mcpToolDescriptors } from "@red-cup-engineering/metroplat/generated/mcp-tool-descriptors";
import { programMcpToolsWithEndpoints } from "@red-cup-engineering/metroplat/presentation/program-surface";
import { conurbationOperations } from "./conurbation-readout.mjs";

function agencyWorkPumpMaxPerTick(environment) {
  const configured = environment["METROPLAT_AGENCY_WORK_PUMP_MAX_PER_TICK"]?.trim();
  if (configured === undefined || configured === "") return 32;
  const maximum = Number(configured);
  if (!Number.isInteger(maximum) || maximum < 1) throw new RangeError("METROPLAT_AGENCY_WORK_PUMP_MAX_PER_TICK must be a positive integer");
  return maximum;
}

export async function openMetroplatMcp({ dataRoot, environment = process.env, args = [] }) {
  const processConfig = mcpProcessConfig(args, environment);
  const pumpMaximum = agencyWorkPumpMaxPerTick(environment);
  const resolveAgencyWorkAuthority = processConfig.firmPoolRoot === undefined ? undefined
    : (await import("@red-cup-engineering/metroplat/firm-pool-authority")).firmPoolAuthorityResolver({ firmPoolRoot: processConfig.firmPoolRoot }, defaultFilesystemBinding(dataRoot));
  let authorizeProviderDelegation;
  let authorizeWorkDischargeReceiver;
  if (processConfig.providerDelegationAuthorityAnchor !== undefined) {
    const delegation = await import("@red-cup-engineering/feltos/work/provider-delegation-authority");
    const binding = defaultFilesystemBinding(dataRoot);
    const anchor = delegation.providerDelegationAuthorityAnchorFromFile(processConfig.providerDelegationAuthorityAnchor, binding);
    authorizeProviderDelegation = delegation.journalProviderDelegationAuthorizer(binding, anchor);
    authorizeWorkDischargeReceiver = delegation.journalWorkDischargeReceiverAuthorizer(binding, anchor);
  }
  const installed = await installedMetroplatFromProcessOptions(processConfig, defaultFilesystemBinding(dataRoot));
  const hostOperations = conurbationOperations(defaultFilesystemBinding(dataRoot));
  const hostSource = Object.freeze({
    module: "@red-cup-engineering/feltos-enterprise-host/conurbation-readout",
    operations: hostOperations,
  });
  let opened;
  const open = async () => opened ??= (async () => {
  const trustedOperationSources = [...installed.operationSources, hostSource];
  const rootName = installed.identity.id;
  const workerModel = environment["METROPLAT_AGENT_WORKER_MODEL"];
  const workerId = workerModel === undefined || workerModel.length === 0
    ? undefined
    : environment["METROPLAT_AGENT_WORKER_ID"] ?? "infograph-worker";
  if (workerId !== undefined) {
    const [{ AGENT_WORKER_STAGE_VERBS }, { grantAssertion }, { admitCapabilityAssertions }] = await Promise.all([
      import("@red-cup-engineering/feltos/agents/worker"),
      import("@red-cup-engineering/computer-networking-engineering-services-section/object-capability"),
      import("@red-cup-engineering/computer-system-engine/rpc/capability-assertions"),
    ]);
    const workerCapabilityVerbs = new Set([
      ...AGENT_WORKER_STAGE_VERBS,
      ...(environment["METROPLAT_AGENT_WORKER_CAPABILITIES"] ?? "").split(",").map((value) => value.trim()).filter((value) => value.length > 0),
    ]);
    const at = processIsoNow();
    admitCapabilityAssertions({
      dataRoot,
      rootName,
      date: at.slice(0, 10),
      assertions: [...workerCapabilityVerbs].map((verb) => grantAssertion(rootName, workerId, `${rootName}#${verb}`, at)),
    });
  }
  // Office work allocated to this machine's Codex character is done by a Codex session here.
  const codexWorker = environment["METROPLAT_CODEX_WORKER"];
  const executeCodexWork = codexWorker === undefined || codexWorker === "" ? undefined : (await import("@red-cup-engineering/agent-harness-computer-system-engineering-services-section/codex/agency-work")).codexAgencyWorkProvider({
    workerId: codexWorker, characterName: environment["METROPLAT_CODEX_CHARACTER_NAME"] ?? "the Codex character",
    cwd: environment["METROPLAT_CODEX_WORKSPACE"] ?? environment["METROPLAT_REPOSITORY_ROOT"] ?? process.cwd(),
    ...(environment["METROPLAT_CODEX_MODEL"] ? { model: environment["METROPLAT_CODEX_MODEL"] } : {}),
    ...(environment["METROPLAT_CODEX_BIN"] ? { codex: environment["METROPLAT_CODEX_BIN"] } : {}),
  });
  let executeInferredWork;
  if (workerId !== undefined && workerModel !== undefined) {
    const [sourceModule, lotModule, encounterModule, witnessModule, controlModule, inferenceModule, dispatchModule, assertionsModule, clockModule, providerModule] = await Promise.all([
      import("@red-cup-engineering/metroplat/inference-source"),
      import("@red-cup-engineering/computer-inference-engine/dispatch/inference-work-lot-source"),
      import("@red-cup-engineering/feltos/encounter/store"),
      import("@red-cup-engineering/computer-system-engine/rpc/journal-witness"),
      import("@red-cup-engineering/feltos/encounter/control"),
      import("@red-cup-engineering/feltos/agents/inference/rpc"),
      import("@red-cup-engineering/computer-system-engine/rpc/dispatch"),
      import("@red-cup-engineering/computer-system-engine/rpc/capability-assertions"),
      import("@red-cup-engineering/node-process-services-section/clock"),
      import("@red-cup-engineering/feltos/work/agency-work-provider"),
    ]);
    const configured = sourceModule.infographInferenceSource({ env: environment, now: clockModule.processIsoNow });
    if (configured.provider === "inference-work-lot.market" && workerModel !== lotModule.BOUNDED_INFERENCE_SERVICE_MODEL) throw new TypeError(`METROPLAT_AGENT_WORKER_MODEL must be ${lotModule.BOUNDED_INFERENCE_SERVICE_MODEL} when the inference-work-lot market is selected`);
    const encounters = encounterModule.journalEncounterStore(dataRoot, { namespace: rootName });
    const providerOperation = inferenceModule.inferenceProviderOperation(configured.provider, configured.source, encounters, controlModule.encounterExecutionControl());
    const inference = inferenceModule.witnessedInferenceEncounterPort({ operation: providerOperation, encounters, witness: witnessModule.journalRpcWitness(dataRoot, { namespace: rootName }), authorize: dispatchModule.authorizationFromCapabilityAssertions(dispatchModule.authorizationFromStanding(new Map([[providerOperation.ref, "held"]]), "infograph-inference-provider"), () => assertionsModule.readCapabilityAssertions(dataRoot), "settled-capability-assertions"), now: clockModule.processIsoNow });
    executeInferredWork = (item, surface) => providerModule.executeAgencyWorkProvider(item, { surface, dataRoot, rootName, workerId, provider: configured.provider, model: workerModel, inference, now: clockModule.processIsoNow });
  }
  let induced;
  const agencyWorkProviders = Object.freeze([...new Set([codexWorker, workerId].filter((provider) => provider !== undefined))]);
  if (authorizeProviderDelegation === undefined) {
    const [delegation, offices] = await Promise.all([
      import("@red-cup-engineering/feltos/work/provider-delegation-authority"),
      import("@red-cup-engineering/metroplat/offices"),
    ]);
    const binding = defaultFilesystemBinding(dataRoot);
    authorizeProviderDelegation = delegation.charterProviderDelegationAuthorizer({
      providers: agencyWorkProviders,
      resolveHolderOffices: (holder) => offices.providerDelegationOffices(binding, holder),
      operationOf: (reference) => induced?.operations.find((candidate) => candidate.ref === reference),
    });
  }
  // The FeltOS host federates declared peers; MetroPlat binds one ERP instance
  // to its own data root and does not discover network members by walking it.
  const { defaultMcpApex } = await import("@red-cup-engineering/metroplat/mcp-surface");
  induced = defaultMcpApex(dataRoot, {
    rootName,
    presentationOptions: {
      deriveSchemaResources: false,
      deriveLspResources: false,
      derivePrompts: false,
    },
    ...(processConfig.claudeSessionRoot === undefined ? {} : { claudeSessionRoot: processConfig.claudeSessionRoot }),
    ...(processConfig.codexSessionRoot === undefined ? {} : { codexSessionRoot: processConfig.codexSessionRoot }),
    trustedOperationSources,
    workOptions: Object.freeze({
      ...(resolveAgencyWorkAuthority === undefined ? {} : { resolveAgencyWorkAuthority }),
      ...(authorizeProviderDelegation === undefined ? {} : { authorizeProviderDelegation }),
      ...(authorizeWorkDischargeReceiver === undefined ? {} : { authorizeWorkDischargeReceiver }),
      agencyWorkProviders,
      agencyWorkPumpMaxPerTick: pumpMaximum,
      ...(executeCodexWork === undefined && (workerId === undefined || workerModel === undefined || workerModel.length === 0) ? {} : {
        executeAgencyWork: (item) => executeCodexWork !== undefined && item.delegation?.provider === codexWorker
          ? executeCodexWork(item)
          : executeInferredWork(item, induced),
      }),
    }),
  });
  activateMcpRequestedCapabilities(dataRoot, induced, processConfig);
  const options = mcpOptions(dataRoot, induced, environment, processConfig.subject, rootName);
  return Object.freeze({ induced, options });
  })();
  const tools = Object.freeze([
    ...mcpToolDescriptors,
    ...programMcpToolsWithEndpoints([...installed.operationSources.flatMap((source) => source.operations), ...hostOperations], [], installed.identity.id),
  ]);
  const induced = Object.freeze({
    operations: Object.freeze([...catalogOperationDescriptors, ...hostOperations.map(operationDescriptor)]),
    discovery: Object.freeze({ package: installed.identity.id, programs: Object.freeze([]) }),
    resources: Object.freeze([]),
    prompts: Object.freeze([]),
  });
  const options = mcpOptions(dataRoot, induced, environment, processConfig.subject, installed.identity.id);
  // A node that runs Codex recovers its queued and running tasks when it opens, not when the
  // lazily loaded codex family first answers a call.
  if (typeof environment.METROPLAT_CODEX_BIN === "string" && environment.METROPLAT_CODEX_BIN !== "") {
    void import("@red-cup-engineering/metroplat/operation-family-loaders")
      .then(({ loadOperationFamily }) => loadOperationFamily("@red-cup-engineering/metroplat/codex-harness", defaultFilesystemBinding(dataRoot)))
      .catch((error) => process.stderr.write(`[metroplat] Codex task recovery did not start: ${error?.stack ?? error}\n`));
  }
  return Object.freeze({
    induced,
    options,
    operationSurface: async () => (await open()).induced,
    handle: async (message) => {
      if (message?.method === "initialize") return { jsonrpc: "2.0", id: message.id, result: {
        protocolVersion: ["2024-11-05", "2025-03-26", "2025-06-18", "2025-11-25"].includes(message.params?.protocolVersion) ? message.params.protocolVersion : "2025-11-25",
        capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false }, prompts: { listChanged: false } },
        serverInfo: { name: installed.identity.id, version: "0.1.0" },
      } };
      if (message?.method === "tools/list") return { jsonrpc: "2.0", id: message.id, result: { tools } };
      const runtime = await open();
      const { programMcpHandle } = await import("@red-cup-engineering/metroplat/presentation/serving");
      return (await programMcpHandle(runtime.induced, message, runtime.options)) ?? null;
    },
  });
}
