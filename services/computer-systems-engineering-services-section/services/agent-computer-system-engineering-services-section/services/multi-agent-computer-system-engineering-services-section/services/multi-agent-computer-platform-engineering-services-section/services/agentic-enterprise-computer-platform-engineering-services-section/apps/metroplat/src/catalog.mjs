/**
 * @packageDocumentation
 *
 * catalog - MetroPlat's operation catalog and schema-node service composition.
 */
import { operationFamilyDescriptors } from "./generated/operation-family-descriptors.mjs";

// A named installation gets only MetroPlat's own entrance and authority
// mechanics. Domain operations arrive from package exports selected by its
// instance declaration; the legacy all-family catalog remains for callers
// that have not yet migrated to an installation.
export const platformOperationFamilyDescriptors = Object.freeze(Object.fromEntries([
  "@red-cup-engineering/metroplat/lsp",
  "@red-cup-engineering/metroplat/offices",
  "@red-cup-engineering/metroplat/world",
  "@red-cup-engineering/metroplat/capability-assertions",
].map((name) => [name, operationFamilyDescriptors[name]])));
import { loadOperationFamily } from "./operation-family-loaders.mjs";
import { authorizationFromCapabilityAssertions, authorizationUnderRules } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { authorizationFromStanding } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { createOperationCatalog, lazyOperation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaNamespaceResource, moduleMounts } from "./presentation/operation-mounting.mjs";
import { projectSurface } from "@red-cup-engineering/metroplat/presentation/surface";
import { dispatchProjectedSurface } from "@red-cup-engineering/computer-system-engine/rpc/wire-dispatch";
import { journalRpcWitness } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { processLeaseCoordinator } from "@red-cup-engineering/computer-system-engine/rpc/coordination";
import { arrivalProcessingOperations } from "@red-cup-engineering/metroplat/arrival-processing";

import { callableOperationsFromWitnesses, capabilityWitnessesForOperations } from "@red-cup-engineering/feltos/agents/capability-witnesses";
import { capabilityAddress } from "@red-cup-engineering/computer-system-engine/rpc/capability-claims";
import { readProgramContractEvidence } from "@red-cup-engineering/computer-system-engine/rpc/contract-evidence";
import { clockOperations } from "@red-cup-engineering/organizing/work/recurring";

const readStandingWhenAuthorized = (binding, subject, invocation, operation) => import("./offices.mjs").then(({ readStanding }) => readStanding(binding, subject, operation === undefined ? undefined : { operation, input: invocation?.input }));
const judgeWhenAuthorized = (binding) => async (action) => (await import("./offices.mjs")).rulesJudge(binding)(action);

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
export function* serviceSources(
  binding,
  operationSource = () => [],
  trustedOperationSources = [],
  workOptions = {},
  sourceSet = () => [],
  descriptorFamilies = operationFamilyDescriptors,
  dispatchOperation,
) {
  for (const [module, descriptors] of Object.entries(descriptorFamilies)) {
    let loaded;
    const load = () => loaded ??= loadOperationFamily(module, binding, { operationSource, sourceSet, workOptions, dispatchOperation });
    yield Object.freeze({ module, operations: Object.freeze(descriptors.map((descriptor) => lazyOperation(descriptor, load))) });
  }
  for (const source of trustedOperationSources) yield Object.freeze({ module: source.module, operations: Object.freeze([...source.operations]) });
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

function withFilesystemBinding(operations, binding) {
  return Object.freeze([...operations]);
}

function serviceSourceSet(
  binding,
  overrides = [],
  trustedOperationSources = [],
  workOptions = {},
  descriptorFamilies = operationFamilyDescriptors,
  dispatchOperation,
)

 {
  let operations = Object.freeze([]);
  let sources = Object.freeze([]);
  const contractEvidence = readProgramContractEvidence(binding.dataRoot);
  const declaredSources = replaceOperations(
    Object.freeze([...serviceSources(binding, () => operations, trustedOperationSources, workOptions, () => sources, descriptorFamilies, dispatchOperation)]),
    overrides,
  );
  const boundSources = Object.freeze(declaredSources.map((source) => Object.freeze({
    module: source.module,
    operations: withFilesystemBinding(source.operations, binding),
  })));
  const sourceWitnesses = capabilityWitnessesForOperations(
    boundSources.flatMap((source) => source.operations),
    contractEvidence,
  );
  const processable = callableOperationsFromWitnesses(sourceWitnesses);
  const standing = new Map();
  for (const designation of processable.reading.designated) {
    for (const operation of designation.carriers) standing.set(operation.ref, designation.reading);
  }
  const arrival = Object.freeze({
    module: "@red-cup-engineering/metroplat/arrival-processing",
    operations: withFilesystemBinding(arrivalProcessingOperations(
      binding,
      processable.operations,
      authorizationUnderRules(authorizationFromCapabilityAssertions(
        authorizationFromStanding(standing, "settled-operation-standing"),
        (subject, invocation, operation) => readStandingWhenAuthorized(binding, subject, invocation, operation),
        "settled-capability-assertions",
      ), judgeWhenAuthorized(binding)),
    ), binding),
  });
  // The clock runs scheduled verbs through the same catalog and authorization as arrivals.
  const clock = Object.freeze({
    module: "@red-cup-engineering/organizing/work/recurring",
    operations: withFilesystemBinding(clockOperations(
      binding,
      () => processable.operations,
      () => authorizationUnderRules(authorizationFromCapabilityAssertions(
        authorizationFromStanding(standing, "settled-operation-standing"),
        (subject, invocation, operation) => readStandingWhenAuthorized(binding, subject, invocation, operation),
        "settled-capability-assertions",
      ), judgeWhenAuthorized(binding)),
    ), binding),
  });
  sources = Object.freeze([...boundSources, arrival, clock]);
  operations = Object.freeze(sources.flatMap((source) => source.operations));
  const witnesses = Object.freeze([...sourceWitnesses, ...capabilityWitnessesForOperations([...arrival.operations, ...clock.operations], contractEvidence)]);
  return Object.freeze({ sources, operations, contractEvidence, witnesses });
}

/** One immutable capability cut and every public projection derived from it. */

function assembleService(
  binding,
  packageName,
  overrides = [],
  trustedOperationSources = [],
  workOptions = {},
  descriptorFamilies = operationFamilyDescriptors,
  presentationOptions = {},
) {
  let apex;
  const rpcWitness = journalRpcWitness(binding.dataRoot, { namespace: packageName });
  const dispatchOperation = (account, request, parent) => {
    if (apex === undefined) throw new Error("World operation surface is not assembled");
    return dispatchProjectedSurface(apex, [request.verb], JSON.stringify(request.input), {
      subject: account,
      caller: Object.freeze({ transport: "world", ...(request.enterprise === undefined ? {} : { enterprise: request.enterprise }), ...(typeof parent?.hand === "string" ? { hand: parent.hand } : {}) }),
      program: "infograph",
      now: binding.now,
      coordinate: processLeaseCoordinator(binding.dataRoot),
      witness: rpcWitness,
      request: `${parent?.id ?? "world"}:${request.id}`,
      causes: parent?.evidence ?? [],
    });
  };
  const { sources, witnesses } = serviceSourceSet(binding, overrides, trustedOperationSources, workOptions, descriptorFamilies, dispatchOperation);
  const callable = callableOperationsFromWitnesses(witnesses);
  const callableOperations = new Set(callable.operations);
  const capabilityAssertions = (subject, invocation, operation) => readStandingWhenAuthorized(binding, subject, invocation, operation);
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
  apex = projectSurface(callable.reading, {
    catalog,
    packageName,
    capabilityAssertions,
    judgeAction: judgeWhenAuthorized(binding),
    ...presentationOptions,
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
  descriptorFamilies = operationFamilyDescriptors,
) {
  return assembleService(binding, packageName, [], trustedOperationSources, workOptions, descriptorFamilies);
}

/** Assemble the MCP face from the same service cut, substituting only its
 * descriptor-aware LSP operation before capability settlement and mounting. */
export function assembleDefaultServiceMcp(
  binding,
  packageName = "@red-cup-engineering/metroplat",
  trustedOperationSources = [],
  workOptions = {},
  descriptorFamilies = operationFamilyDescriptors,
  presentationOptions = {},
) {
  let resourceDescriptors = [];
  let promptDescriptors = [];
  let family = [];
  const lspModule = "@red-cup-engineering/metroplat/lsp";
  const lspOperation = lazyOperation(descriptorFamilies[lspModule][0], () => loadOperationFamily(lspModule, binding, {
    operationSource: () => family,
    packageName,
    resourceDescriptors: () => resourceDescriptors,
    promptDescriptors: () => promptDescriptors,
  }));
  const assembly = assembleService(binding, packageName, [lspOperation], trustedOperationSources, workOptions, descriptorFamilies, presentationOptions);
  family = assembly.operations;
  resourceDescriptors = assembly.apex.discovery.resources;
  promptDescriptors = assembly.apex.discovery.prompts;
  return assembly;
}
