/**
 * @packageDocumentation
 *
 * infograph/catalog - the application module catalog and schema-node service composition.
 */
import { builtinOperationModules } from "./builtins.mts";
import { metroplatLspOperationFor } from "../../integrations/lsp/operation.mts";
import {
  authorizationFromCapabilityAssertions,
  authorizationFromStanding,
  createOperationCatalog,
  type Operation,
  type OperationCatalog,
} from "../../rpc/index.mts";
import {
  schemaNamespaceResource,
  projectSurface,
  moduleMounts,
  type SchemaMount,
  type ProjectedSurface,
  type PromptDescriptor,
  type ResourceDescriptor,
} from "../../presentation/index.mts";
import { claudeSessionOperations } from "../../integrations/anthropic/service.mts";
import { claudeFleetOperations } from "../../integrations/anthropic/fleet/service.mts";
import { agentCoordinationOperations } from "../../agents/service.mts";
import { claimSessionOperations } from "../../claims/service.mts";
import { agentTokenUsageOperations } from "../../integrations/token-usage/service.mts";
import { codexSessionOperations } from "../../integrations/openai/codex/service.mts";
import { openAIPricingOperations } from "../../integrations/openai/pricing/service.mts";
import { ledgerReportOperations } from "../../integrations/ledger/service.mts";
import { marshResourceOperations } from "./operations/marsh-resource.mts";
import { workCoordinationOperations, type WorkCoordinationOptions } from "../../work/index.mts";
import { proofHealthOperations } from "../../monitoring/proof-health.mts";
import { conurbationOperations } from "../../integrations/filesystem/services/conurbation.mts";
import { filesystemOperations, withFilesystemBinding, type FilesystemBinding } from "../../integrations/filesystem/services/read-write.mts";
import { markdownFileWorkbenchOperations } from "../../integrations/filesystem/services/markdown-workbench.mts";
import { arc42SadWorkbenchOperations } from "../../integrations/filesystem/services/arc42-sad-workbench.mts";
import { specificationWorkbenchOperations } from "../../integrations/filesystem/services/specification-workbench.mts";
import { runCausalSetOperations } from "../../integrations/filesystem/services/run-causal-set.mts";
import { sessionPresenceOperations } from "../../integrations/filesystem/services/session-presence.mts";
import { feedReadoutOperations } from "../../journal/feed-readout.mts";
import { arrivalProcessingOperations } from "../../integrations/filesystem/services/arrival-processing.mts";
import { knowledgeVaultOperations } from "../../integrations/knowledge-vaults/services/corpus.mts";
import { workspaceReadoutOperations } from "../../integrations/filesystem/services/workspace-readout.mts";
import { gitWorkspaceOperations } from "../../integrations/git/service.mts";
import { moduleCohesionOperations, moduleTopologyOperations, sourceCodePolicyOperations, workspaceGraphOperations } from "../../monitoring/operations.mts";
import { checkoutHealthFamilyOperations } from "../../monitoring/checkout-health/service.mts";
import { directoryReadoutOperations } from "../../integrations/filesystem/services/directory-readout/index.mts";
import { fileCensusOperations } from "../../monitoring/filesystem/file-census/service.mts";
import { lexiconCensusOperations } from "../../monitoring/source-code/lexicon/service.mts";
import { termCatalogOperations } from "./operations/term-catalog.mts";
import { eavtCellOperations } from "./operations/eavt-cell.mts";
import { capabilityAssertionOperations } from "./operations/capability.mts";
import { legibilityOperations } from "../../monitoring/filesystem/legibility/service.mts";
import { pathCorpusOperations } from "../../search/path-corpus.mts";
import { proofPlayOperations } from "../../monitoring/proof-play/service.mts";
import { schemaConformanceOperations } from "../../monitoring/schema-conformance/service.mts";
import { termIntensionOperations } from "../../search/service.mts";
import { scanPackagePublicationStatus } from "../../integrations/filesystem/services/workspace-scanner/service.mts";
import type { PublicationStatusProof } from "../../workspace/schemas/publication-status.mts";
import { callableOperationsFromWitnesses, capabilityWitnessesForOperations } from "../../agents/capability-witnesses.mts";
import { capabilityAddress } from "../../lib/capability/claims.mts";
import { readProgramContractEvidence } from "../../rpc/contract-evidence.mts";
import { readCapabilityAssertions } from "../../integrations/filesystem/services/capability-assertions.mts";

/**
 * Every service-visible module family: the package's own module families plus
 * the host-boundary families each service process contributes as a mesh member.
 *
 * `binding` is required: there is no unbound mode: every state-cut derivation
 * needs a real data root to read against, so callers with no explicit root
 * pass the package root, same as `defaultFilesystemBinding` everywhere else in
 * this package.
 */
export interface TrustedOperationSource {
  readonly module: string;
  readonly operations: readonly Operation[];
}

/** Application and integration sources record claims. This is a bootstrap
 * collection, not a runtime capability table: the runtime receives only the
 * resulting journal statements and recomputes their standing. */
function* serviceSources(
  binding: FilesystemBinding,
  operationSource: () => readonly Operation[] = () => [],
  trustedOperationSources: readonly TrustedOperationSource[] = [],
  workOptions: WorkCoordinationOptions = {},
): Generator<TrustedOperationSource> {
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
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/marsh", operations: marshResourceOperations });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/agent-token-usage", operations: agentTokenUsageOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/conurbation", operations: conurbationOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/work-coordination", operations: workCoordinationOperations(binding, workOptions) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/journal", operations: feedReadoutOperations(binding) });
  yield Object.freeze({ module: "@red-cup-engineering/metroplat/knowledge-vaults", operations: knowledgeVaultOperations(binding) });
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
  sources: readonly TrustedOperationSource[],
  overrides: readonly Operation[],
): readonly TrustedOperationSource[] {
  if (overrides.length === 0) return sources;
  const byVerb = new Map(overrides.map((operation) => [operation.verb, operation]));
  return Object.freeze(sources.map((source) => Object.freeze({
    module: source.module,
    operations: Object.freeze(source.operations.map((operation) => byVerb.get(operation.verb) ?? operation)),
  })));
}

function serviceSourceSet(
  binding: FilesystemBinding,
  overrides: readonly Operation[] = [],
  trustedOperationSources: readonly TrustedOperationSource[] = [],
  workOptions: WorkCoordinationOptions = {},
): {
  readonly sources: readonly TrustedOperationSource[];
  readonly operations: readonly Operation[];
  readonly contractEvidence: ReturnType<typeof readProgramContractEvidence>;
} {
  let operations: readonly Operation[] = Object.freeze([]);
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
  const standing = new Map<string, "held" | "denied" | "contested" | "unknown">();
  for (const designation of processable.reading.designated) {
    for (const operation of designation.carriers) standing.set(operation.ref, designation.charge);
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
export interface DefaultServiceAssembly {
  readonly operations: readonly Operation[];
  readonly catalog: OperationCatalog;
  readonly mounts: readonly SchemaMount[];
  readonly reading: ReturnType<typeof callableOperationsFromWitnesses>["reading"];
  readonly apex: ProjectedSurface;
}

function assembleService(
  binding: FilesystemBinding,
  packageName: string,
  overrides: readonly Operation[] = [],
  trustedOperationSources: readonly TrustedOperationSource[] = [],
  workOptions: WorkCoordinationOptions = {},
): DefaultServiceAssembly {
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
  const causalRank = (source: TrustedOperationSource): number => Math.min(
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
  binding: FilesystemBinding,
  packageName = "@red-cup-engineering/metroplat",
  trustedOperationSources: readonly TrustedOperationSource[] = [],
  workOptions: WorkCoordinationOptions = {},
): DefaultServiceAssembly {
  return assembleService(binding, packageName, [], trustedOperationSources, workOptions);
}

function publicationStatusForBinding(binding: FilesystemBinding): PublicationStatusProof | undefined {
  if (binding.packageRoot === undefined) return undefined;
  return scanPackagePublicationStatus(binding.packageRoot).proof;
}

type PublicationProjectionOptions = { readonly publicationStatus: PublicationStatusProof };

function publicationOptionsForBinding(binding: FilesystemBinding): PublicationProjectionOptions | Record<never, never> {
  const publicationStatus = publicationStatusForBinding(binding);
  return publicationStatus === undefined ? Object.freeze({}) : Object.freeze({ publicationStatus });
}

/** Assemble the MCP face from the same service cut, substituting only its
 * descriptor-aware LSP operation before capability settlement and mounting. */
export function assembleDefaultServiceMcp(
  binding: FilesystemBinding,
  packageName = "@red-cup-engineering/metroplat",
  trustedOperationSources: readonly TrustedOperationSource[] = [],
  workOptions: WorkCoordinationOptions = {},
): DefaultServiceAssembly {
  let resourceDescriptors: readonly ResourceDescriptor[] = [];
  let promptDescriptors: readonly PromptDescriptor[] = [];
  let family: readonly Operation[] = [];
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
