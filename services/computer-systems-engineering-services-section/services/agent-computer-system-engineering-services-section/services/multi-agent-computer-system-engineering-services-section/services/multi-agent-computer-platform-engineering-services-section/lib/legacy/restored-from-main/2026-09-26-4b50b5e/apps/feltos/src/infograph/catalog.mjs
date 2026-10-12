/**
 * @packageDocumentation
 *
 * infograph/catalog - the application module catalog and schema-node service composition.
 */
import { builtinOperationModules } from "./builtins.mjs";
import { metroplatLspOperationFor } from "@red-cup-engineering/feltos/operations/lsp/operation";
import { authorizationFromCapabilityAssertions } from "@red-cup-engineering/feltos/capability";
import { authorizationFromStanding } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { createOperationCatalog } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaNamespaceResource, moduleMounts } from "@red-cup-engineering/feltos/presentation/mounting";
import { projectSurface } from "@red-cup-engineering/feltos/presentation/surface";
import { claudeSessionOperations } from "@red-cup-engineering/feltos/operations/anthropic/service";
import { claudeFleetOperations } from "@red-cup-engineering/feltos/operations/anthropic/fleet/service";
import { agentCoordinationOperations } from "@red-cup-engineering/computer-code-development-engine/agent/service";
import { claimSessionOperations } from "@red-cup-engineering/feltos/claims/service";
import { agentTokenUsageOperations } from "@red-cup-engineering/feltos/operations/token-usage/service";
import { codexSessionOperations } from "@red-cup-engineering/feltos/operations/openai/codex/service";
import { openAIPricingOperations } from "@red-cup-engineering/computer-inference-engine/openai/pricing/operations";
import { ledgerMaintenanceOperations, ledgerReportOperations } from "@red-cup-engineering/farolfi/ledger/operations";
import { energyAccountingOperations } from "@red-cup-engineering/farolfi/energy/operations";
import { marshResourceOperations } from "@red-cup-engineering/feltos/apps/infograph/operations/marsh-resource";
import { workCoordinationOperations } from "@red-cup-engineering/feltos/work/service";
import { proofHealthOperations } from "@red-cup-engineering/computer-code-development-engine/monitoring/proof-health";
import { conurbationOperations } from "@red-cup-engineering/feltos/operations/filesystem/services/conurbation";
import { filesystemOperations, withFilesystemBinding } from "@red-cup-engineering/feltos/operations/filesystem/services/read-write-verbs";
import { markdownFileWorkbenchOperations } from "@red-cup-engineering/knowledge-system-server/workbench/markdown";
import { arc42SadWorkbenchOperations } from "@red-cup-engineering/knowledge-system-server/workbench/arc42";
import { specificationWorkbenchOperations } from "@red-cup-engineering/knowledge-system-server/workbench/specification";
import { runCausalSetOperations } from "@red-cup-engineering/feltos/operations/filesystem/services/run-causal-set";
import { sessionPresenceOperations } from "@red-cup-engineering/feltos/operations/filesystem/services/session-presence";
import { feedReadoutOperations } from "@red-cup-engineering/feltos/journal/feed-readout";
import { arrivalProcessingOperations } from "@red-cup-engineering/feltos/operations/filesystem/services/arrival-processing";
import { workspaceReadoutOperations } from "@red-cup-engineering/computer-code-development-engine/workspace/readout";
import { gitWorkspaceOperations } from "@red-cup-engineering/computer-code-development-engine/git/operations";
import { moduleCohesionOperations, moduleTopologyOperations, sourceCodePolicyOperations, workspaceGraphOperations } from "@red-cup-engineering/computer-code-development-engine/monitoring/operations";
import { checkoutHealthFamilyOperations } from "@red-cup-engineering/computer-code-development-engine/monitoring/checkout-health/service";
import { directoryReadoutOperations } from "@red-cup-engineering/knowledge-system-server/directory-readout";
import { fileCensusOperations } from "@red-cup-engineering/computer-code-development-engine/monitoring/filesystem/file-census/service";
import { lexiconCensusOperations } from "@red-cup-engineering/computer-code-development-engine/monitoring/source-code/lexicon/service";
import { termCatalogOperations } from "@red-cup-engineering/feltos/apps/infograph/operations/term-catalog";
import { eavtCellOperations } from "@red-cup-engineering/feltos/apps/infograph/operations/eavt-cell";
import { capabilityAssertionOperations } from "@red-cup-engineering/feltos/apps/infograph/operations/capability";
import { legibilityOperations } from "@red-cup-engineering/computer-code-development-engine/monitoring/filesystem/legibility/service";
import { pathCorpusOperations } from "@red-cup-engineering/knowledge-system-server/search/path-corpus";
import { proofPlayOperations } from "@red-cup-engineering/computer-code-development-engine/monitoring/proof-play/service";
import { schemaConformanceOperations } from "@red-cup-engineering/computer-code-development-engine/monitoring/schema-conformance/service";
import { termIntensionOperations } from "@red-cup-engineering/knowledge-system-server/search/service";
import { scanPackagePublicationStatus } from "@red-cup-engineering/computer-code-development-engine/workspace/scanner/service";

import { callableOperationsFromWitnesses, capabilityWitnessesForOperations } from "@red-cup-engineering/feltos/agents/capability-witnesses";
import { capabilityAddress } from "@red-cup-engineering/feltos/capability/claims";
import { readProgramContractEvidence } from "@red-cup-engineering/computer-system-engine/rpc/contract-evidence";
import { readCapabilityAssertions } from "@red-cup-engineering/feltos/operations/filesystem/services/capability-assertions";

/**
 * Every service-visible module family: the package's own module families plus
 * the host-boundary families each service process contributes as a mesh member.
 *
 * `binding` is required: there is no unbound mode: every state-cut derivation
 * needs a real data root to read against, so callers with no explicit root
 * pass the package root, same as `defaultFilesystemBinding` everywhere else in
 * this package.
 */

/** Application and integration sources record claims. This is a bootstrap
 * collection, not a runtime capability table: the runtime receives only the
 * resulting journal statements and recomputes their standing. */
function* serviceSources(
  binding,
  operationSource = () => [],
  trustedOperationSources = [],
  workOptions = {},
) {
  for (const [module, operations] of Object.entries(builtinOperationModules)) yield Object.freeze({ module, operations });
  for (const source of trustedOperationSources) yield Object.freeze({ module: source.module, operations: Object.freeze([...source.operations]) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/integrations/filesystem", operations: filesystemOperations });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/markdown-files", operations: markdownFileWorkbenchOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/arc42-sad", operations: arc42SadWorkbenchOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/specifications", operations: specificationWorkbenchOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/claude-fleet", operations: claudeFleetOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/claude-sessions", operations: claudeSessionOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/agent-coordination", operations: agentCoordinationOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/claim-sessions", operations: claimSessionOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/codex-sessions", operations: codexSessionOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/openai-pricing", operations: openAIPricingOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/ledger", operations: ledgerReportOperations() });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/ledger-maintenance", operations: ledgerMaintenanceOperations() });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/energy-accounting", operations: energyAccountingOperations() });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/marsh", operations: marshResourceOperations });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/agent-token-usage", operations: agentTokenUsageOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/conurbation", operations: conurbationOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/work-coordination", operations: workCoordinationOperations(binding, workOptions) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/journal", operations: feedReadoutOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/proof-health", operations: proofHealthOperations(binding, operationSource) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/run-causal-set", operations: runCausalSetOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/session-presence", operations: sessionPresenceOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/directory-readout", operations: directoryReadoutOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/file-census", operations: fileCensusOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/lexicon-census", operations: lexiconCensusOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/term-catalog", operations: termCatalogOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/eavt-cell", operations: eavtCellOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/capability-assertions", operations: capabilityAssertionOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/legibility", operations: legibilityOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/module-cohesion", operations: moduleCohesionOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/module-topology", operations: moduleTopologyOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/source-code-policy", operations: sourceCodePolicyOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/checkout-health", operations: checkoutHealthFamilyOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/path-corpus", operations: pathCorpusOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/proof-play", operations: proofPlayOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/schema-conformance", operations: schemaConformanceOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/term-intension", operations: termIntensionOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/workspace-git", operations: gitWorkspaceOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/workspace-graph", operations: workspaceGraphOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/workspace-readout", operations: workspaceReadoutOperations(binding) });
}

function replaceOperations(
  sources,
  overrides,
) {
  if (overrides.length === 0) return sources;
  const byVerb = new Map(overrides.map((operation) => [operation.verb, operation]));
  return Object.freeze(sources.map((source) => Object.freeze({
    module: source.module,
    operations: Object.freeze(source.operations.map((operation) => byVerb.get(operation.verb) ?? operation)),
  })));
}

function serviceSourceSet(
  binding,
  overrides = [],
  trustedOperationSources = [],
  workOptions = {},
)

 {
  let operations = Object.freeze([]);
  const contractEvidence = readProgramContractEvidence(binding.dataRoot);
  const declaredSources = replaceOperations(
    Object.freeze([...serviceSources(binding, () => operations, trustedOperationSources, workOptions)]),
    overrides,
  );
  const boundSources = Object.freeze(declaredSources.map((source) => Object.freeze({
    module: source.module,
    operations: withFilesystemBinding(source.operations, binding),
  })));
  const processable = callableOperationsFromWitnesses(capabilityWitnessesForOperations(
    boundSources.flatMap((source) => source.operations),
    contractEvidence,
  ));
  const standing = new Map();
  for (const designation of processable.reading.designated) {
    for (const operation of designation.carriers) standing.set(operation.ref, designation.reading);
  }
  const arrival = Object.freeze({
    module: "@red-cup-engineering/metroplat/arrival-processing",
    operations: withFilesystemBinding(arrivalProcessingOperations(
      binding,
      processable.operations,
      authorizationFromCapabilityAssertions(
        authorizationFromStanding(standing, "settled-operation-standing"),
        () => readCapabilityAssertions(binding.dataRoot),
        "settled-capability-assertions",
      ),
    ), binding),
  });
  const sources = Object.freeze([...boundSources, arrival]);
  operations = Object.freeze(sources.flatMap((source) => source.operations));
  return Object.freeze({ sources, operations, contractEvidence });
}

/** One immutable capability cut and every public projection derived from it. */

function assembleService(
  binding,
  packageName,
  overrides = [],
  trustedOperationSources = [],
  workOptions = {},
) {
  const { sources, operations: declared, contractEvidence } = serviceSourceSet(binding, overrides, trustedOperationSources, workOptions);
  const witnesses = capabilityWitnessesForOperations(declared, contractEvidence);
  const callable = callableOperationsFromWitnesses(witnesses);
  const callableOperations = new Set(callable.operations);
  const capabilityAssertions = () => readCapabilityAssertions(binding.dataRoot);
  const order = new Map(callable.reading.order.map((address, index) => [address, index]));
  const operationRanks = new Map(witnesses.map((witness) => [
    witness.carrier,
    order.get(capabilityAddress(witness.claim)) ?? Number.MAX_SAFE_INTEGER,
  ]));
  const causalRank = (source) => Math.min(
    ...source.operations.map((operation) => operationRanks.get(operation) ?? Number.MAX_SAFE_INTEGER),
  );
  const mounts = Object.freeze(sources.map((source) => ({ source, rank: causalRank(source) }))
    .sort((left, right) => left.rank - right.rank)
    .flatMap(({ source: { module, operations } }) => moduleMounts(
      module,
      operations.filter((operation) => callableOperations.has(operation)),
      { capabilityAssertions },
    )));
  const catalog = createOperationCatalog(callable.operations);
  const apex = projectSurface(callable.reading, {
    catalog,
    packageName,
    capabilityAssertions,
    ...publicationOptionsForBinding(binding),
    resources: [schemaNamespaceResource(() => mounts)],
  });
  return Object.freeze({
    operations: catalog.operations,
    catalog,
    mounts,
    reading: callable.reading,
    apex,
  });
}

/**
 * Assemble the Infograph service once. Its catalog, mounts, schema namespace,
 * capability reading, and transport faces are projections of this exact cut.
 */
export function assembleDefaultService(
  binding,
  packageName = "@red-cup-engineering/metroplat",
  trustedOperationSources = [],
  workOptions = {},
) {
  return assembleService(binding, packageName, [], trustedOperationSources, workOptions);
}

function publicationStatusForBinding(binding) {
  if (binding.packageRoot === undefined) return undefined;
  return scanPackagePublicationStatus(binding.packageRoot, binding).proof;
}

function publicationOptionsForBinding(binding) {
  const publicationStatus = publicationStatusForBinding(binding);
  return publicationStatus === undefined ? Object.freeze({}) : Object.freeze({ publicationStatus });
}

/** Assemble the MCP face from the same service cut, substituting only its
 * descriptor-aware LSP operation before capability settlement and mounting. */
export function assembleDefaultServiceMcp(
  binding,
  packageName = "@red-cup-engineering/metroplat",
  trustedOperationSources = [],
  workOptions = {},
) {
  let resourceDescriptors = [];
  let promptDescriptors = [];
  let family = [];
  const lspOperation = metroplatLspOperationFor(() => family, {
    packageName,
    resourceDescriptors: () => resourceDescriptors,
    promptDescriptors: () => promptDescriptors,
  });
  const assembly = assembleService(binding, packageName, [lspOperation], trustedOperationSources, workOptions);
  family = assembly.operations;
  resourceDescriptors = assembly.apex.discovery.resources;
  promptDescriptors = assembly.apex.discovery.prompts;
  return assembly;
}
