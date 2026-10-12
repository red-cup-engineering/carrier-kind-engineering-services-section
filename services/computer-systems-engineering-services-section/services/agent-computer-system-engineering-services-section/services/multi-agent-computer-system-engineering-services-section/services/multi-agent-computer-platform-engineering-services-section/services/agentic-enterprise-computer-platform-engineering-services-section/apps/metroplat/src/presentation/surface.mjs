/**
 * presentation/surface — module → projected surface: programs, resources,
 * and prompts.
 *
 * This is the inverse of the package-boundary-to-presentation arrow elsewhere in the
 * workspace (which reads `package.json#bin`). `projectSurface` reads a module's
 * operations, resources, and prompts and yields the program discovery presentation —
 * the coproduct apex into which each leg injects — plus a bound dispatch. CLI,
 * OpenAPI, MCP (tools + resources + prompts), and web UX are projected from this
 * one presentation as functorial images; none invents a second ontology.
 *
 * Resources and prompts are derived from what the package already declares: each
 * action's input/output JSON Schema and the discovery presentation itself project as
 * MCP resources, and each action projects as a guided MCP prompt — so the three
 * standard knowledge-vault primitives come for free, with packages free to
 * declare richer resources/prompts via `resource()`/`prompt()`.
 */

import { operationIrAudit, operationSenDebt, nonportableOperations, schemasOfOperations } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { operationUtterances, fact, isOperation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { wireCodec } from "@red-cup-engineering/computer-system-engine/wire-eavt-tuple";
import { authorizationFromCapabilityAssertions, authorizationUnderRules } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { authorizationFromStanding } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { createOperationCatalog } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { describe } from "@red-cup-engineering/computer-system-engine/rpc/describe";
import { isProgramContractStanding, readProgramContractStanding } from "@red-cup-engineering/computer-system-engine/rpc/contract";
import { isResource, resource, resourceDescriptor, resourceUtterances } from "@red-cup-engineering/computer-system-engine/rpc/resource";
import {
  actionPrompt,
  isPrompt,
  prompt,
  promptDescriptor,
  promptUtterances,
  userMessage,

} from "@red-cup-engineering/computer-system-engine/rpc/prompt";
import { operationsManifoldResource } from "@red-cup-engineering/computer-system-engine/rpc/manifold";

import { projectProgramDocuments } from "@red-cup-engineering/metroplat/lsp/documents";

import { agentReadinessReportContract } from "@red-cup-engineering/feltos/claims/readiness";
export * from "@red-cup-engineering/feltos/claims/readiness";

/** One generated program readout mounted as a POST endpoint. */

/** The program discovery presentation: the coproduct apex of a package's legs. */

/** Closure-free protocol projection material derived from one RPC catalog. */

/** Options for inducing a program surface. */

import { collectOperations, collectPrompts, collectResources, dedupeSurfacePrompts, dedupeSurfaceResources, surfaceEndpointOf, surfaceSchemaResources } from "@red-cup-engineering/computer-system-engine/rpc/induce";

export function lspDocumentIndexResourceUri(packageName = "@red-cup-engineering/metroplat") {
  return `metroplat://${encodeURIComponent(packageName)}/lsp/documents`;
}

export function lspDocumentResourceUri(uri, packageName = "@red-cup-engineering/metroplat") {
  return `metroplat://${encodeURIComponent(packageName)}/lsp/document/${encodeURIComponent(uri)}`;
}

export function agentReadinessResourceUri(packageName = "@red-cup-engineering/metroplat") {
  return `metroplat://${encodeURIComponent(packageName)}/agent-readiness`;
}

export function transportAgreementResourceUri(packageName = "@red-cup-engineering/metroplat") {
  return `metroplat://${encodeURIComponent(packageName)}/transport-agreement`;
}

export function operationIrAuditResourceUri(packageName = "@red-cup-engineering/metroplat") {
  return `metroplat://${encodeURIComponent(packageName)}/action-ir-audit`;
}

export function operationSenDebtResourceUri(packageName = "@red-cup-engineering/metroplat") {
  return `metroplat://${encodeURIComponent(packageName)}/action-sen-debt`;
}

function operationAuditResourcesOf(operations, packageName) {
  const irAudit = operationIrAudit(operations);
  const senDebt = operationSenDebt(operations);
  const freeTs = nonportableOperations(operations);
  return Object.freeze([
    resource({
      uri: operationIrAuditResourceUri(packageName),
      name: `${packageName} action IR audit`,
      description: "Operation relation and SEN-body audit derived from the same induced program surface as tools, resources, prompts, and endpoint projections.",
      read: () => `${JSON.stringify({
        kind: "metroplat.action-ir-audit-report",
        package: packageName,
        operations: irAudit.length,
        audit: irAudit,
      }, null, 2)}\n`,
    }),
    resource({
      uri: operationSenDebtResourceUri(packageName),
      name: `${packageName} action SEN debt`,
      description: "Strict free-TypeScript operations and adjacent SEN presentation-boundary debts detected from the induced program surface.",
      read: () => `${JSON.stringify({
        kind: "metroplat.action-sen-debt-report",
        package: packageName,
        nonportableOperations: freeTs,
        senDebt,
        ok: freeTs.length === 0 && senDebt.length === 0,
      }, null, 2)}\n`,
    }),
  ]);
}

function endpointOverlap(
  endpoint,
  faceA,
  faceB,
  requiredFaces,
  extraEvidence = [],
) {
  const evidence = Object.freeze([
    `action:${endpoint.name}`,
    `input:${endpoint.input}`,
    `output:${endpoint.output}`,
    `settlement:${endpoint.settlement.regime}/${endpoint.settlement.transport}/${endpoint.settlement.finality}`,
    ...requiredFaces.map((face) => `face:${face}`),
    ...extraEvidence,
  ]);
  return Object.freeze({
    kind: "metroplat.transport-agreement-overlap",
    faceA,
    faceB,
    target: endpoint.name,
    evidence,
    missing: Object.freeze([]),
    ok: true,
  });
}

function cardinalityOverlap(
  faceA,
  faceB,
  target,
  left,
  right,
) {
  const missing = left === right ? [] : [`${target}:count:${left}!=${right}`];
  return Object.freeze({
    kind: "metroplat.transport-agreement-overlap",
    faceA,
    faceB,
    target,
    evidence: Object.freeze([`${faceA}:${left}`, `${faceB}:${right}`]),
    missing: Object.freeze(missing),
    ok: missing.length === 0,
  });
}

function uniqueOverlap(
  faceA,
  faceB,
  target,
  values,
) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  const missing = [...duplicates].map((value) => `${target}:duplicate:${value}`);
  return Object.freeze({
    kind: "metroplat.transport-agreement-overlap",
    faceA,
    faceB,
    target,
    evidence: Object.freeze([`${target}:items:${values.length}`, `${target}:unique:${seen.size}`]),
    missing: Object.freeze(missing),
    ok: missing.length === 0,
  });
}

function transportAgreementReportOf(
  packageName,
  operations,
  endpoints,
  resources,
  prompts,
) {
  const operationNames = operations.map((act) => act.verb);
  const endpointNames = endpoints.map((endpoint) => endpoint.name);
  const overlaps = [
    cardinalityOverlap("cli", "discovery", "operations", operations.length, endpoints.length),
    cardinalityOverlap("mcp", "discovery", "tools", endpoints.length, operations.length),
    cardinalityOverlap("openapi", "discovery", "operations", endpoints.length, operations.length),
    cardinalityOverlap("openai", "discovery", "function-tools", endpoints.length, operations.length),
    cardinalityOverlap("resources", "discovery", "resources", resources.length, resources.length),
    cardinalityOverlap("prompts", "discovery", "prompts", prompts.length, prompts.length),
    uniqueOverlap("cli", "discovery", "action-verbs", operationNames),
    uniqueOverlap("openapi", "discovery", "operation-ids", endpointNames),
    uniqueOverlap("mcp", "discovery", "tool-names", endpointNames),
    uniqueOverlap("openai", "discovery", "function-tool-names", endpointNames),
    ...endpoints.flatMap((endpoint) => [
      endpointOverlap(endpoint, "cli", "discovery", Object.freeze(["cli-dispatch", "program-discovery"])),
      endpointOverlap(endpoint, "openapi", "discovery", Object.freeze(["openapi-operation", "program-discovery"])),
      endpointOverlap(endpoint, "mcp", "discovery", Object.freeze(["mcp-tool", "program-discovery"])),
      endpointOverlap(endpoint, "openai", "mcp", Object.freeze(["openai-function-tool", "mcp-tool"])),
      endpointOverlap(endpoint, "http", "discovery", Object.freeze(["http-route", "program-discovery"])),
      endpointOverlap(endpoint, "html-form", "discovery", Object.freeze(["html-form", "program-discovery"])),
      endpointOverlap(endpoint, "arrival-admission", "cli", Object.freeze(["arrival-admission", "cli-dispatch"])),
    ]),
  ];
  const missing = overlaps.flatMap((overlap) => overlap.missing);
  return Object.freeze({
    kind: "metroplat.transport-agreement",
    package: packageName,
    source: "induced-program-surface",
    faces: Object.freeze(["discovery", "cli", "http", "openapi", "mcp", "openai", "html-form", "arrival-admission", "resources", "prompts"]),
    operations: operations.length,
    resources: resources.length,
    prompts: prompts.length,
    overlaps: Object.freeze(overlaps),
    evidence: Object.freeze([
      `package:${packageName}`,
      `operations:${operations.length}`,
      `resources:${resources.length}`,
      `prompts:${prompts.length}`,
      `transport-cover:finite-equalizer-report`,
      ...endpoints.map((endpoint) => `endpoint:${endpoint.name}:${endpoint.input}:${endpoint.output}`),
    ]),
    missing: Object.freeze(missing),
    ok: missing.length === 0,
  });
}

function agentStatusCutPrompt(operations) {
  const operationNames = new Set(operations.map((act) => act.verb));
  if (!operationNames.has("read")) return Object.freeze([]);
  return Object.freeze([
    prompt({
      name: "agent-status-cut",
      description: "Read the carried handoff/status cut for an MetroPlat agent session from its state-tier cut address.",
      arguments: Object.freeze([
        Object.freeze({
          name: "session",
          description: "The host session id whose status cut to read (Claude Code or Codex).",
          required: true,
        }),
        Object.freeze({
          name: "readiness",
          description: "Optional JSON agent-readiness report read from metroplat://%40emsenn%2Fmetroplat/agent-readiness.",
          required: false,
        }),
      ]),
      compose: (args) => {
        const lines = [
          "Use MetroPlat to produce the agent handoff/status cut.",
          "",
          "SchemaContract path:",
          "1. Address the cut at the state tier: data/state/<kind>-state/${date}-cut-claude-session-${session}.json (or -cut-codex-session-${session}.json for a Codex host, -cut-codex-latest.json for the most recent Codex session).",
          "2. Call read with { \"path\": <that address> }; a current-day cut recomputes through its deriver before presentation.",
          "3. Read readiness from metroplat://%40emsenn%2Fmetroplat/agent-readiness when the MCP/LSP boundary is available.",
          "",
          "Do not summarize the session as ordinary prose first; keep goals, obligations, conflicts, evidence, readiness, and missing entries as carried material.",
          ...(args["session"] === undefined || args["session"] === "" ? [] : ["", "Session:", args["session"]]),
          ...(args["readiness"] === undefined || args["readiness"] === "" ? [] : ["", "Readiness:", args["readiness"]]),
        ];
        return [userMessage(lines.join("\n"))];
      },
    }),
  ]);
}

function uniqueStrings(values) {
  return Object.freeze([...new Set([...values].filter((value) => typeof value === "string" && value.length > 0))]);
}

function readinessSurface(
  surface,
  count,
  descriptors,
  contracts,
  evidence,
) {
  const evidencePolicies = Object.freeze([]);
  const missing = count > 0 ? [] : [`${surface}:descriptors`];
  return Object.freeze({
    surface,
    ready: missing.length === 0,
    count,
    contracts: Object.freeze([...contracts]),
    evidencePolicies,
    evidence: Object.freeze([...evidence]),
    missing: Object.freeze(missing),
  });
}

function agentReadinessReportOf(
  packageName,
  operations,
  endpoints,
  resources,
  prompts,
  lspResources,
) {
  const operationNames = new Set(operations.map((act) => act.verb));
  const resourceDescriptors = resources.map((res) => resourceDescriptor(res));
  const promptDescriptors = prompts.map((pr) => promptDescriptor(pr));
  const endpointDescriptors = endpoints.map((endpoint) => Object.freeze({
    name: endpoint.name,
    input: endpoint.input,
    output: endpoint.output,
    contract: endpoint.contract,
  }));
  const programContracts = uniqueStrings(endpoints.map((endpoint) => endpoint.contract.contract.id));
  const lspDocumentIndex = lspDocumentIndexResourceUri(packageName);
  const lspDocumentResources = lspResources.filter((res) => res.uri.startsWith(`metroplat://${encodeURIComponent(packageName)}/lsp/document/`));
  const lspResourceDocuments = lspDocumentResources.filter((res) => decodeURIComponent(res.uri).includes("metroplat-lsp://resource/"));
  const lspPromptDocuments = lspDocumentResources.filter((res) => decodeURIComponent(res.uri).includes("metroplat-lsp://prompt/"));
  const agentStatusPrompt = prompts.some((pr) => pr.name === "agent-status-cut");
  const freeTs = nonportableOperations(operations);
  const senDebts = operationSenDebt(operations);
  const portableOperations = operationIrAudit(operations).filter((entry) => entry.relation === "operation" && entry.hasRunTerm).length;
  const sen = Object.freeze({
    portableOperations,
    freeTsOperations: freeTs.length,
    debts: senDebts.length,
    auditResource: operationIrAuditResourceUri(packageName),
    debtResource: operationSenDebtResourceUri(packageName),
    ready: freeTs.length === 0 && senDebts.length === 0,
  });
  // Agent work rides the holographic boundary: session material, work claims,
  // continuations, and status/fleet cuts are all reads at corners or state-tier
  // cut addresses behind the one read/write pair.
  const agentWork = Object.freeze({
    holographicRead: operationNames.has("read"),
    holographicWrite: operationNames.has("write"),
    agentStatusCutPrompt: agentStatusPrompt,
    ready: false,
  });
  const completedAgentWork = Object.freeze({
    ...agentWork,
    ready: agentWork.holographicRead && agentWork.holographicWrite && agentWork.agentStatusCutPrompt,
  });
  const lsp = Object.freeze({
    action: operationNames.has("metroplat-lsp"),
    documentIndexResource: lspDocumentIndex,
    documents: lspDocumentResources.length,
    resources: lspResourceDocuments.length,
    prompts: lspPromptDocuments.length,
    ready: operationNames.has("metroplat-lsp") &&
      resources.some((res) => res.uri === lspDocumentIndex) &&
      lspDocumentResources.length > 0 &&
      lspResourceDocuments.length > 0 &&
      lspPromptDocuments.length > 0,
  });
  const mcp = Object.freeze({
    tools: endpoints.length,
    resources: resources.length,
    prompts: prompts.length,
    ready: endpoints.length > 0 && resources.length > 0 && prompts.length > 0,
  });
  const surfaces = Object.freeze([
    readinessSurface("mcp:tools/list", endpoints.length, endpointDescriptors, programContracts, Object.freeze([
      `operations:${operations.length}`,
      `endpoints:${endpoints.length}`,
    ])),
    readinessSurface("mcp:resources/list", resources.length, resourceDescriptors, programContracts, Object.freeze([
      `resources:${resources.length}`,
      `lsp-document-index:${resources.some((res) => res.uri === lspDocumentIndex)}`,
    ])),
    readinessSurface("mcp:prompts/list", prompts.length, promptDescriptors, programContracts, Object.freeze([
      `prompts:${prompts.length}`,
    ])),
    readinessSurface("lsp:documents", lspDocumentResources.length, lspDocumentResources.map((res) => resourceDescriptor(res)), programContracts, Object.freeze([
      `lsp-action:${lsp.action}`,
      `lsp-document-index:${lsp.documentIndexResource}`,
      `lsp-resource-documents:${lsp.resources}`,
      `lsp-prompt-documents:${lsp.prompts}`,
    ])),
  ]);
  const missing = [
    ...surfaces.flatMap((surface) => surface.missing),
    ...(mcp.ready ? [] : ["mcp"]),
    ...(lsp.ready ? [] : ["lsp"]),
    ...(completedAgentWork.holographicRead ? [] : ["agent-work:read"]),
    ...(completedAgentWork.holographicWrite ? [] : ["agent-work:write"]),
    ...(completedAgentWork.agentStatusCutPrompt ? [] : ["agent-work:agent-status-cut-prompt"]),
    ...(freeTs.length === 0 ? [] : freeTs.map((entry) => `sen:free-ts:${entry.verb}`)),
    ...(senDebts.length === 0 ? [] : senDebts.map((entry) => `sen:debt:${entry.verb}:${entry.debt}`)),
  ];
  const report = Object.freeze({
    kind: "metroplat.agent-readiness",
    package: packageName,
    source: "induced-program-surface",
    ready: missing.length === 0,
    surfaces,
    mcp,
    lsp,
    agentWork: completedAgentWork,
    sen,
    evidence: Object.freeze([
      `package:${packageName}`,
      `operations:${operations.length}`,
      `mcp-tools:${mcp.tools}`,
      `mcp-resources:${mcp.resources}`,
      `mcp-prompts:${mcp.prompts}`,
      `lsp-documents:${lsp.documents}`,
      `agent-work-ready:${completedAgentWork.ready}`,
      `sen-portable-operations:${sen.portableOperations}`,
      `sen-free-ts-operations:${sen.freeTsOperations}`,
      `sen-debts:${sen.debts}`,
    ]),
    missing: Object.freeze(missing),
  });
  return agentReadinessReportContract.assert(report, "agent readiness report");
}

function lspDocumentResource(document, packageName) {
  return resource({
    uri: lspDocumentResourceUri(document.uri, packageName),
    name: `${document.id} LSP virtual document`,
    mimeType: "application/json",
    description: `MetroPlat LSP ${document.kind} document ${document.uri}.`,
    read: () => document.text,
  });
}

function lspResourcesOf(
  schemas,
  operations,
  endpoints,
  resourceDescriptors,
  promptDescriptors,
  packageName,
) {
  const documents = projectProgramDocuments({
    schemas: schemas,
    operations,
    endpoints,
    resourceDescriptors,
    promptDescriptors,
  });
  const index = Object.freeze(documents.map((document) => Object.freeze({
    kind: document.kind,
    id: document.id,
    uri: document.uri,
    resource: lspDocumentResourceUri(document.uri, packageName),
  })));
  return Object.freeze([
    resource({
      uri: lspDocumentIndexResourceUri(packageName),
      name: `${packageName} MetroPlat LSP document index`,
      description: "The MetroPlat language-service document index projected from the same presentation/action graph as MCP tools and resources.",
      read: () => `${JSON.stringify(index, null, 2)}\n`,
    }),
    ...documents.map((document) => lspDocumentResource(document, packageName)),
  ]);
}

/**
 * Induce the program surface for a module's legs.
 *
 * The input can be a module namespace object or a list. Actions, resources, and
 * prompts are collected, schema resources and operation prompts are derived, and the
 * result is one discovery presentation plus a bound dispatcher. HTTP, OpenAPI, MCP,
 * forms, and CLI code consume this induced apex rather than re-declaring the
 * operation surface.
 */
function isCapabilityReading(source) {
  return source !== null
    && typeof source === "object"
    && (source).kind === "metroplat.capability.reading"
    && Array.isArray((source).designated);
}

function callableActionsOfReading(reading) {
  const obstructions = new Map(reading.obstructions.map((obstruction) => [obstruction.address, obstruction]));
  return Object.freeze(reading.designated.flatMap((entry) => entry.carriers.map((carrier) => {
    const obstruction = obstructions.get(entry.address);
    if (obstruction === undefined) return carrier;
    return Object.freeze({
      ...carrier,
      run: () => Object.freeze({
        kind: obstruction.kind,
        address: obstruction.address,
        reading: obstruction.reading,
        price: obstruction.price,
      }),
    });
  })));
}

/**
 * Induce the protocol surface from a settled operation-capability reading.
 * Subject standing is always conjoined afterward; an absent assertion set is
 * the all-unknown valuation and therefore authorizes nothing.
 */
export function projectSurface(
  source,
  options = {},
) {
  const capabilityReading = isCapabilityReading(source) ? source : undefined;
  const settledSource = capabilityReading === undefined
    ? source
    : callableActionsOfReading(capabilityReading);
  const operations = collectOperations(settledSource);
  const catalog = options.catalog ?? createOperationCatalog(operations);
  const projectedVerbs = operations.map((operation) => operation.verb).sort();
  const catalogVerbs = catalog.operations.map((operation) => operation.verb).sort();
  if (JSON.stringify(projectedVerbs) !== JSON.stringify(catalogVerbs)) {
    throw new TypeError("projectSurface: supplied catalog does not match the projected operation family");
  }
  const standingByOperation = new Map();
  if (capabilityReading === undefined) {
    for (const operation of operations) standingByOperation.set(operation.ref, "held");
  } else {
    for (const designation of capabilityReading.designated) {
      for (const carrier of designation.carriers) {
        if (isOperation(carrier)) standingByOperation.set(carrier.ref, designation.reading);
      }
    }
  }
  const standingAuthorize = authorizationFromCapabilityAssertions(
    authorizationFromStanding(
      standingByOperation,
      capabilityReading === undefined ? "explicit-catalog" : "settled-operation-standing",
    ),
    options.capabilityAssertions ?? [],
    "settled-subject-standing",
  );
  // Every operation is judged against the house's rules once its standing holds.
  const authorize = options.judgeAction === undefined ? standingAuthorize : authorizationUnderRules(standingAuthorize, options.judgeAction);
  const rpcDescription = describe(catalog, standingByOperation);
  const packageName = options.packageName ?? "@red-cup-engineering/metroplat";
  const basePath = options.basePath ?? "";
  const term = `metroplat.package.${packageName}`;
  const standingByVerb = new Map();
  if (capabilityReading !== undefined) {
    for (const designation of capabilityReading.designated) {
      if (!isProgramContractStanding(designation.claim.contract)) continue;
      for (const carrier of designation.carriers) standingByVerb.set(carrier.verb, designation.claim.contract);
    }
  }
  const programs = operations.map((act) => surfaceEndpointOf(act, basePath, standingByVerb.get(act.verb)));

  // Carried prompts come first so they win de-duplication over derived ones.
  const carriedPrompts = [...collectPrompts(settledSource), ...(options.prompts ?? []), ...agentStatusCutPrompt(operations)];
  const derivedPrompts = options.derivePrompts === false ? [] : operations.map(actionPrompt);
  const prompts = dedupeSurfacePrompts([...carriedPrompts, ...derivedPrompts]);

  // Explicit resources come first; auto-derived schema + discovery resources follow.
  const carriedResources = [...collectResources(settledSource), ...(options.resources ?? [])];
  const liveSchemas = schemasOfOperations(operations);
  const schemaResources = options.deriveSchemaResources === false ? [] : surfaceSchemaResources(operations, packageName, "metroplat");
  const operationAuditResources = operationAuditResourcesOf(operations, packageName);
  const resourcesBeforeReadiness = dedupeSurfaceResources([
    ...carriedResources,
    ...schemaResources,
    ...operationAuditResources,
  ]);
  let readinessRef;
  let transportAgreementRef;
  const readinessResource = resource({
    uri: agentReadinessResourceUri(packageName),
    name: `${packageName} agent readiness`,
    description: "Finite MCP/LSP/agent-work readiness observation derived from the same induced program surface as tools, resources, prompts, and LSP documents.",
    read: () => {
      if (readinessRef === undefined) throw new Error("agent readiness report was read before the program surface was sealed");
      return `${JSON.stringify(readinessRef, null, 2)}\n`;
    },
  });
  const transportAgreementResource = resource({
    uri: transportAgreementResourceUri(packageName),
    name: `${packageName} transport agreement`,
    description: "Finite agreement report over CLI, HTTP, OpenAPI, MCP, OpenAI, form, resource, prompt, and invocation faces induced from one program surface.",
    read: () => {
      if (transportAgreementRef === undefined) throw new Error("transport agreement report was read before the program surface was sealed");
      return `${JSON.stringify(transportAgreementRef, null, 2)}\n`;
    },
  });
  const resourcesBeforeLsp = dedupeSurfaceResources([
    ...resourcesBeforeReadiness,
    readinessResource,
    transportAgreementResource,
  ]);
  const lspResources = options.deriveLspResources === false
    ? []
    : lspResourcesOf(liveSchemas, operations, programs, resourcesBeforeLsp.map(resourceDescriptor), prompts.map(promptDescriptor), packageName);

  const utterances = [
    fact(term, "metroplat.package.has-name", packageName),
    fact(term, "metroplat.package.speaks-protocol", "stdio"),
  ];
  for (const act of operations) {
    utterances.push(fact(term, "metroplat.package.has-action", act.verb));
    for (const u of operationUtterances(act)) utterances.push(u);
  }

  // The discovery presentation is itself a resource; its read thunk closes over the
  // assembled descriptors so the artifact is always the live apex.
  let discoveryRef;
  const discoveryResource = resource({
    uri: `metroplat://${encodeURIComponent(packageName)}/discovery`,
    name: `${packageName} discovery`,
    description: "The package's program discovery surface: mounted programs, source operations, resources, and prompts.",
    read: () => `${JSON.stringify(discoveryRef, null, 2)}\n`,
  });
  const manifoldResource = operationsManifoldResource(packageName, () => discoveryRef, "metroplat");

  const resources = dedupeSurfaceResources([
    ...resourcesBeforeLsp,
    ...lspResources,
    discoveryResource,
    manifoldResource,
  ]);
  readinessRef = agentReadinessReportOf(packageName, operations, programs, resources, prompts, lspResources);
  transportAgreementRef = transportAgreementReportOf(packageName, operations, programs, resources, prompts);
  for (const res of resources) {
    utterances.push(fact(term, "metroplat.package.has-resource", res.uri));
    for (const u of resourceUtterances(res)) utterances.push(u);
  }
  for (const pr of prompts) {
    utterances.push(fact(term, "metroplat.package.has-prompt", pr.name));
    for (const u of promptUtterances(pr)) utterances.push(u);
  }

  discoveryRef = Object.freeze({
    kind: "metroplat.program.discovery",
    scheme: "metroplat",
    package: packageName,
    protocol: "stdio",
    programs: Object.freeze(programs),
    resources: Object.freeze(resources.map(resourceDescriptor)),
    prompts: Object.freeze(prompts.map(promptDescriptor)),
    ...(capabilityReading === undefined ? {} : {
      capabilities: Object.freeze({
        valuation: capabilityReading.valuation,
        designated: Object.freeze(capabilityReading.designated.map(({ address, reading }) => Object.freeze({ address, reading }))),
        obstructions: capabilityReading.obstructions,
        order: capabilityReading.order,
      }),
    }),
    utterances: Object.freeze(utterances),
  });

  return Object.freeze({
    discovery: discoveryRef,
    ...(capabilityReading === undefined ? {} : { capabilities: capabilityReading }),
    operations,
    catalog,
    description: rpcDescription,
    authorize,
    resources,
    prompts,
  });
}
