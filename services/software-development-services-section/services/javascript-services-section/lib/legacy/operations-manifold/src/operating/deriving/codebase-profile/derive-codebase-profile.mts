import path from "node:path";
import { readdirSync, readFileSync } from "node:fs";

import { typeFlowNeighbourhood, workspaceTypeFlow, type TypeFlowNeighbourhood, type TypeFlowNode } from "@red-cup-engineering/organizing-with-jsnode/functions";
import { workspaceTypeIndex } from "@red-cup-engineering/organizing-with-jsnode/workspaces";

import { codebaseReading, type CodebaseReading, type CodebaseReadingParams } from "../../../codebase-reading.mts";
import { operationsManifoldScriptCatalog } from "../../../package-surface.mts";
import { optionalText } from "../../../records.mts";
import { packageAtlasView, type PackageAtlasView } from "../../../workspace-view.mts";
import { fileTouchMarket } from "../../recording/operations/ledgering/library/operation-ledger.mts";
import type { FileTouchMarketAsset } from "../../recording/touching/files/marketing/library/file-touch-market.mts";

export type CodebaseProfileParams = CodebaseReadingParams;

export type CodebaseProfileCarrierKind = "package" | "module" | "symbol" | "processor" | "work" | "goal" | "interface" | "upstream";
export type CodebaseProfileRelationKind = "contains" | "realizes" | "reads" | "selects" | "offers" | "uses-upstream" | "binds-work" | "serves-goal" | "next-interface";

export type CodebaseProfileCarrier = Readonly<{
  id: string;
  kind: CodebaseProfileCarrierKind;
  label: string;
  detail: string;
  href: string;
  evidence: readonly string[];
  attention: CodebaseProfileCarrierAttention | null;
}>;

export type CodebaseProfileCarrierAttention = Readonly<{
  path: string;
  regime: FileTouchMarketAsset["regime"];
  attention: number;
  reads: number;
  writes: number;
  touches: number;
  readDemand: number;
  writePressure: number;
  churn: number;
  midpointValue: number;
  spreadValue: number;
  evidence: readonly string[];
}>;

export type CodebaseProfileRelation = Readonly<{
  from: string;
  to: string;
  kind: CodebaseProfileRelationKind;
  evidence: readonly string[];
}>;

export type CodebaseProfileAnomaly = Readonly<{
  id: string;
  severity: "info" | "watch" | "block";
  summary: string;
  next: string;
  evidence: readonly string[];
}>;

export type CodebaseProfileAuditFinding = Readonly<{
  id: string;
  kind: "duplicate-helper" | "repeated-fold" | "script-surface";
  classification: "upstream-fusion" | "domain-specialization" | "surface-contract";
  severity: "info" | "watch" | "block";
  summary: string;
  next: string;
  upstreamCandidates: readonly string[];
  typeWitnesses: readonly string[];
  domainWitnesses: readonly string[];
  evidence: readonly string[];
}>;

export type CodebaseProfileTypeFlow = Readonly<{
  source: "@red-cup-engineering/organizing-with-jsnode/functions.workspaceTypeFlow";
  summary: Readonly<{
    order: number;
    size: number;
    packages: number;
    addressable: number;
    ambiguous: number;
    crossPackageEdges: number;
    sources: number;
    sinks: number;
  }>;
  hubs: readonly Readonly<Pick<TypeFlowNode, "name" | "pkg" | "kind" | "producers" | "consumers">>[];
  selectedNeighbourhoods: readonly CodebaseProfileTypeFlowNeighbourhood[];
  interfaces: readonly Readonly<{ bin: string; purpose: string; params: Readonly<Record<string, string>> }>[];
}>;

export type CodebaseProfileTypeFlowNeighbourhood = Readonly<{
  name: string;
  pkg: string;
  typeKind: string;
  producedBy: number;
  consumedBy: number;
  upstream: readonly TypeFlowNeighbourhood["upstream"][number][];
  downstream: readonly TypeFlowNeighbourhood["downstream"][number][];
  reaches: number;
  reachableFrom: number;
}>;

export type CodebaseProfile = Readonly<{
  kind: "operations-manifold.derive-codebase-profile";
  generatedAt: string;
  domain: CodebaseReading["domain"];
  sources: Readonly<{
    codebase: "read-codebase";
    fileTouchMarket: "market-file-touch";
    packageBins: "package.json#bin";
    workspace: "@red-cup-engineering/organizing-with-jsnode/workspaces";
    gaming: "@red-cup-engineering/gaming";
  }>;
  summary: Readonly<{
    carriers: number;
    relations: number;
    modules: number;
    symbols: number;
    processors: number;
    nextInterfaces: number;
    anomalies: number;
    auditFindings: number;
    duplicateFindings: number;
    upstreamFindings: number;
    attendedCarriers: number;
    volatileCarriers: number;
    typeFlowNodes: number;
    typeFlowEdges: number;
    typeFlowNeighbourhoods: number;
  }>;
  carriers: readonly CodebaseProfileCarrier[];
  relations: readonly CodebaseProfileRelation[];
  reuse: Readonly<{
    claim: "Codebase profile reuses the existing read-codebase, workspace atlas, package-bin catalog, and gaming reader instead of adding a second codebase scanner.";
    upstreams: readonly Readonly<{ name: string; witnessedBy: readonly string[] }>[];
  }>;
  typeFlow: CodebaseProfileTypeFlow;
  categorical: CodebaseReading["categorical"];
  audit: readonly CodebaseProfileAuditFinding[];
  anomalies: readonly CodebaseProfileAnomaly[];
  nextInterfaces: CodebaseReading["codomain"]["nextInterfaces"];
}>;

export async function deriveCodebaseProfile(repoRoot: string, params: CodebaseProfileParams = {}): Promise<CodebaseProfile> {
  const reading = await codebaseReading(repoRoot, params);
  const touchMarket = await fileTouchMarket(repoRoot, { focus: reading.package.path, limit: "200" });
  const touchAssets = touchMarket.assets;
  const scripts = operationsManifoldScriptCatalog(repoRoot).scripts;
  const atlas = await packageAtlasView(repoRoot, reading.package.name, { detail: "surface" });
  if (atlas === null) throw new Error(`derive-codebase-profile: package atlas not found: ${reading.package.name}`);
  const typeFlow = codebaseTypeFlow(repoRoot, reading);
  const processorNames = new Set(scripts.map((script) => script.name));
  const carriers = dedupeCarriers([
    carrier("package", packageId(reading.package.name), reading.package.name, reading.package.description, `/jsnode/package?name=${encodeURIComponent(reading.package.name)}`, [reading.package.path, `${reading.package.path}/package.json`], touchAssets),
    ...reading.reading.modules.map((module) => carrier("module", moduleId(module.module), module.module, module.file, `/jsnode/module?package=${encodeURIComponent(reading.package.name)}&module=${encodeURIComponent(module.module)}`, [module.file], touchAssets)),
    ...reading.reading.symbols.map((symbol) => carrier("symbol", symbolId(symbol.module, symbol.name), symbol.name, `${symbol.kind} in ${symbol.module}`, `/jsnode/symbol?package=${encodeURIComponent(reading.package.name)}&name=${encodeURIComponent(symbol.name)}`, [symbol.file], touchAssets)),
    ...reading.reading.work.map((work) => carrier("work", work.id, work.title, work.status, `/objects/${encodeURIComponent(work.id)}`, work.evidence, touchAssets)),
    ...reading.reading.goals.map((goal) => carrier("goal", goal.id, goal.title, goal.status, `/objects/${encodeURIComponent(goal.id)}`, goal.evidence, touchAssets)),
    ...reading.codomain.nextInterfaces.map((item) => carrier(processorNames.has(item.bin) ? "processor" : "interface", processorId(item.bin), item.bin, item.purpose, `/${encodeURIComponent(item.bin)}`, ["package.json#bin", item.bin, `${reading.package.path}/scripts/${item.bin}.mjs`], touchAssets)),
    ...reading.categorical.upstream.map((name) => carrier("upstream", upstreamId(name), name, "upstream reading source", `/objects/${encodeURIComponent(upstreamId(name))}`, [name], touchAssets)),
  ]);
  const carrierIds = new Set(carriers.map((item) => item.id));
  const relations = dedupeRelations([
    ...reading.reading.modules.map((module) => relation(packageId(reading.package.name), moduleId(module.module), "contains", [module.file])),
    ...reading.reading.symbols.map((symbol) => relation(moduleId(symbol.module), symbolId(symbol.module, symbol.name), "contains", [symbol.file])),
    ...reading.reading.symbols.map((symbol) => relation(packageId(reading.package.name), symbolId(symbol.module, symbol.name), "realizes", [symbol.signature])),
    ...reading.reading.work.map((work) => relation(work.id, packageId(reading.package.name), "reads", work.evidence)),
    ...reading.reading.goals.map((goal) => relation(packageId(reading.package.name), goal.id, "serves-goal", goal.evidence)),
    ...reading.codomain.nextInterfaces.map((item) => relation(packageId(reading.package.name), processorId(item.bin), "next-interface", ["read-codebase", item.bin])),
    ...reading.codomain.nextInterfaces.map((item) => relation(processorId(item.bin), packageId(reading.package.name), "reads", ["package.json#bin", item.bin])),
    ...reading.categorical.upstream.map((name) => relation(packageId(reading.package.name), upstreamId(name), "uses-upstream", [name])),
  ]).filter((item) => carrierIds.has(item.from) && carrierIds.has(item.to));
  const audit = auditFindingsFor({ repoRoot, reading, atlas, scripts });
  const anomalies = anomaliesFor(reading, processorNames, carriers, audit);

  return Object.freeze({
    kind: "operations-manifold.derive-codebase-profile" as const,
    generatedAt: new Date().toISOString(),
    domain: reading.domain,
    sources: Object.freeze({
      codebase: "read-codebase" as const,
      fileTouchMarket: "market-file-touch" as const,
      packageBins: "package.json#bin" as const,
      workspace: "@red-cup-engineering/organizing-with-jsnode/workspaces" as const,
      gaming: "@red-cup-engineering/gaming" as const,
    }),
    summary: Object.freeze({
      carriers: carriers.length,
      relations: relations.length,
      modules: reading.reading.modules.length,
      symbols: reading.reading.symbols.length,
      processors: carriers.filter((item) => item.kind === "processor").length,
      nextInterfaces: reading.codomain.nextInterfaces.length,
      anomalies: anomalies.length,
      auditFindings: audit.length,
      duplicateFindings: audit.filter((item) => item.kind === "duplicate-helper" || item.kind === "repeated-fold").length,
      upstreamFindings: audit.filter((item) => item.classification === "upstream-fusion").length,
      attendedCarriers: carriers.filter((item) => item.attention !== null).length,
      volatileCarriers: carriers.filter((item) => item.attention?.regime === "volatile").length,
      typeFlowNodes: typeFlow.summary.order,
      typeFlowEdges: typeFlow.summary.size,
      typeFlowNeighbourhoods: typeFlow.selectedNeighbourhoods.length,
    }),
    carriers,
    relations,
    reuse: Object.freeze({
      claim: "Codebase profile reuses the existing read-codebase, workspace atlas, package-bin catalog, and gaming reader instead of adding a second codebase scanner." as const,
      upstreams: Object.freeze([
        upstream("@red-cup-engineering/organizing-with-jsnode/workspaces", reading.categorical.upstream.filter((item) => item.includes("organizing-with-jsnode"))),
        upstream("@red-cup-engineering/organizing-with-jsnode/functions.workspaceTypeFlow", [`${typeFlow.summary.order} type-flow nodes`, `${typeFlow.summary.size} type-flow edges`]),
        upstream("@red-cup-engineering/gaming", reading.categorical.upstream.filter((item) => item.includes("gaming"))),
        upstream("@emsenn/trading/market", [touchMarket.pricing]),
        upstream("Operations Manifold logs and state", reading.categorical.upstream.filter((item) => item.includes("data/logs") || item.includes("data/state"))),
      ]),
    }),
    typeFlow,
    categorical: reading.categorical,
    audit,
    anomalies,
    nextInterfaces: reading.codomain.nextInterfaces,
  });
}

function auditFindingsFor(input: Readonly<{
  repoRoot: string;
  reading: CodebaseReading;
  atlas: PackageAtlasView;
  scripts: readonly Readonly<{ name: string; command: string }>[] | readonly { name: string }[];
}>): readonly CodebaseProfileAuditFinding[] {
  const findings: CodebaseProfileAuditFinding[] = [];
  const helperGroups = duplicateFunctionGroups(input.atlas)
    .filter((group) => group.name !== "morphism" && group.modules.length >= 3)
    .slice(0, 8);
  for (const group of helperGroups) {
    findings.push(Object.freeze({
      id: `duplicate-helper:${group.name}`,
      kind: "duplicate-helper" as const,
      classification: duplicateClassification(group),
      severity: group.modules.length >= 4 ? "watch" as const : "info" as const,
      summary: `Function helper ${group.name} appears in ${group.modules.length} module(s).`,
      next: duplicateNext(group),
      upstreamCandidates: Object.freeze(upstreamCandidatesForDuplicate(group, input.atlas)),
      typeWitnesses: Object.freeze(typeWitnessesForDuplicate(group)),
      domainWitnesses: Object.freeze(domainWitnessesForModules(group.modules.map((item) => item.module))),
      evidence: Object.freeze(group.modules.flatMap((item) => [item.module, item.file]).slice(0, 12)),
    }));
  }

  const foldModules = repeatedFoldModules(input.atlas, input.repoRoot);
  const localMechanicModules = foldModules.filter((module) => module.localMechanics && !module.sharedCarrier);
  const localMechanicFiles = localJsonlStateMechanicFiles(input.repoRoot);
  if (localMechanicModules.length >= 3) {
    findings.push(Object.freeze({
      id: "repeated-jsonl-state-folding",
      kind: "repeated-fold" as const,
      classification: "upstream-fusion" as const,
      severity: "watch" as const,
      summary: `${localMechanicModules.length} module(s) expose local JSONL read/fold/refresh state projection mechanics.`,
      next: "Fuse the generic append/read/fold/write law through upstream JSONL/EAVT and state carriers; keep only Operations Manifold event/domain projection local.",
      upstreamCandidates: Object.freeze([
        "@emsenn/relating/writing/path/object/attribute/file/flatfile/serialization/json/jsonl",
        "@red-cup-engineering/gaming/running/store",
        "@red-cup-engineering/organizing-with-jsnode/organizing/packages/carrier",
      ]),
      typeWitnesses: Object.freeze([...new Set(localMechanicModules.flatMap((item) => item.symbols).flatMap(symbolCarrierTerms))].slice(0, 12)),
      domainWitnesses: Object.freeze(domainWitnessesForModules(localMechanicModules.map((item) => item.module))),
      evidence: Object.freeze(localMechanicModules.flatMap((item) => [item.module, item.file, ...item.symbols]).slice(0, 18)),
    }));
  } else if (localMechanicFiles.length > 0) {
    findings.push(Object.freeze({
      id: "remaining-local-jsonl-state-mechanics",
      kind: "repeated-fold" as const,
      classification: "upstream-fusion" as const,
      severity: "watch" as const,
      summary: `${localMechanicFiles.length} source file(s) still own local JSONL event-log/state filesystem mechanics.`,
      next: "Route these carriers through the shared EAVT log-state carrier or an upstream package after isolating the domain projection law.",
      upstreamCandidates: Object.freeze([
        "src/operating/recording/events/stating/library/eavt-log-state.mts",
        "@emsenn/relating/writing/path/object/attribute/file/flatfile/serialization/json/jsonl",
        "@red-cup-engineering/organizing-with-jsnode/organizing/packages/carrier",
      ]),
      typeWitnesses: Object.freeze([...new Set(localMechanicFiles.flatMap((item) => item.typeWitnesses))].slice(0, 12)),
      domainWitnesses: Object.freeze([...new Set(localMechanicFiles.flatMap((item) => item.domainWitnesses))].slice(0, 12)),
      evidence: Object.freeze(localMechanicFiles.flatMap((item) => [item.file, ...item.mechanics]).slice(0, 24)),
    }));
  } else if (foldModules.length >= 3) {
    findings.push(Object.freeze({
      id: "shared-eavt-log-state-carrier",
      kind: "repeated-fold" as const,
      classification: "domain-specialization" as const,
      severity: "info" as const,
      summary: `${foldModules.length} module(s) expose domain read/fold/refresh wrappers over shared EAVT log-state mechanics.`,
      next: "Keep fold/projector logic local to each domain, and move the shared log-state carrier upstream only after another package needs the same filesystem law.",
      upstreamCandidates: Object.freeze([
        "@emsenn/relating/writing/path/object/attribute/file/flatfile/serialization/json/jsonl",
        "@red-cup-engineering/organizing-with-jsnode/organizing/packages/carrier",
      ]),
      typeWitnesses: Object.freeze([...new Set(foldModules.flatMap((item) => item.symbols).flatMap(symbolCarrierTerms))].slice(0, 12)),
      domainWitnesses: Object.freeze(domainWitnessesForModules(foldModules.map((item) => item.module))),
      evidence: Object.freeze([
        "src/operating/recording/events/stating/library/eavt-log-state.mts",
        ...foldModules.flatMap((item) => [item.module, item.file, ...item.symbols]),
      ].slice(0, 18)),
    }));
  }

  if (input.scripts.length > 0) {
    findings.push(Object.freeze({
      id: "package-bin-stdio-surface",
      kind: "script-surface" as const,
      classification: "surface-contract" as const,
      severity: "info" as const,
      summary: `${input.scripts.length} package-bin processor(s) are exposed for shared stdio/HTTP/OpenAPI/MCP projection.`,
      next: "Keep scripts as thin stdio morphism interfaces and move domain/codomain logic into source carriers or upstream packages.",
      upstreamCandidates: Object.freeze(["@red-cup-engineering/organizing-with-jsnode/packages.packageScriptCatalogFromPackage"]),
      typeWitnesses: Object.freeze(["PackageScriptCatalog", "PackageBin"]),
      domainWitnesses: Object.freeze(["scripts", "package.json#bin", "stdio-eavt"]),
      evidence: Object.freeze(["package.json#bin", ...input.scripts.slice(0, 8).map((script) => script.name)]),
    }));
  }

  if (input.reading.categorical.upstream.length === 0) {
    findings.push(Object.freeze({
      id: "missing-upstream-witness",
      kind: "script-surface" as const,
      classification: "upstream-fusion" as const,
      severity: "watch" as const,
      summary: "The codebase reading did not witness upstream package use.",
      next: "Route the carrier through @red-cup-engineering/organizing-with-jsnode, @red-cup-engineering/gaming, @red-cup-engineering/animating, @emsenn/relating, or another fitting upstream package.",
      upstreamCandidates: Object.freeze(["@red-cup-engineering/organizing-with-jsnode", "@red-cup-engineering/gaming", "@red-cup-engineering/animating", "@emsenn/relating"]),
      typeWitnesses: Object.freeze(["PackageAtlasView", "Arena", "WorkItem", "PredicationTerm"]),
      domainWitnesses: Object.freeze(["read-codebase.categorical.upstream"]),
      evidence: Object.freeze(["read-codebase.categorical.upstream"]),
    }));
  }

  return Object.freeze(findings);
}

function anomaliesFor(
  reading: CodebaseReading,
  processorNames: ReadonlySet<string>,
  carriers: readonly CodebaseProfileCarrier[],
  audit: readonly CodebaseProfileAuditFinding[],
): readonly CodebaseProfileAnomaly[] {
  const out: CodebaseProfileAnomaly[] = [];
  for (const pressure of reading.codomain.pressures) {
    out.push(Object.freeze({
      id: `pressure:${pressure.id}`,
      severity: pressure.severity,
      summary: pressure.summary,
      next: pressure.next,
      evidence: Object.freeze(["read-codebase", pressure.id]),
    }));
  }
  const missingProcessors = reading.codomain.nextInterfaces.filter((item) => !processorNames.has(item.bin));
  if (missingProcessors.length > 0) {
    out.push(Object.freeze({
      id: "missing-package-bin-interface",
      severity: "watch" as const,
      summary: `Some next interfaces are not package-bin processors: ${missingProcessors.map((item) => item.bin).join(", ")}`,
      next: "Either add the missing processor bin or mark the interface as external guidance.",
      evidence: Object.freeze(missingProcessors.map((item) => item.bin)),
    }));
  }
  if (!reading.categorical.strategy.wellFormed || !reading.categorical.strategy.validPlays) {
    out.push(Object.freeze({
      id: "categorical-strategy-invalid",
      severity: "watch" as const,
      summary: "The selected codebase reading strategy is not fully valid.",
      next: "Inspect selected modules and symbols before treating the profile as a complete proof path.",
      evidence: Object.freeze(["read-codebase.categorical.strategy"]),
    }));
  }
  const volatile = carriers.filter((carrier) => carrier.attention?.regime === "volatile");
  if (volatile.length > 0) {
    out.push(Object.freeze({
      id: "volatile-codebase-carriers",
      severity: "watch" as const,
      summary: `${volatile.length} selected codebase carrier(s) have volatile file-touch market readings.`,
      next: "Inspect the volatile carrier object pages and prefer narrower edits or additional witness reads before modifying them.",
      evidence: Object.freeze(volatile.flatMap((carrier) => [carrier.id, carrier.attention?.path ?? carrier.id]).slice(0, 12)),
    }));
  }
  for (const finding of audit.filter((item) => item.severity !== "info")) {
    out.push(Object.freeze({
      id: `audit:${finding.id}`,
      severity: finding.severity,
      summary: finding.summary,
      next: finding.next,
      evidence: finding.evidence,
    }));
  }
  return Object.freeze(out);
}

function codebaseTypeFlow(repoRoot: string, reading: CodebaseReading): CodebaseProfileTypeFlow {
  const index = workspaceTypeIndex(repoRoot);
  const flow = workspaceTypeFlow(index);
  const selectedNames = [...new Set(reading.reading.symbols
    .filter((symbol) => symbol.kind !== "function")
    .map((symbol) => symbol.name))];
  const selectedNeighbourhoods = typeFlowCandidateNames(flow, reading.package.name, selectedNames, reading.domain.terms)
    .map((name) => typeFlowNeighbourhood(index, flow, name))
    .filter((item): item is TypeFlowNeighbourhood => item !== undefined)
    .map(compactTypeFlowNeighbourhood)
    .slice(0, 8);
  return Object.freeze({
    source: "@red-cup-engineering/organizing-with-jsnode/functions.workspaceTypeFlow" as const,
    summary: Object.freeze({
      order: flow.order,
      size: flow.size,
      packages: flow.packages,
      addressable: flow.addressable,
      ambiguous: flow.ambiguous,
      crossPackageEdges: flow.crossPackageEdges,
      sources: flow.sources.length,
      sinks: flow.sinks.length,
    }),
    hubs: Object.freeze(flow.hubs.slice(0, 12).map((hub) => Object.freeze({
      name: hub.name,
      pkg: hub.pkg,
      kind: hub.kind,
      producers: hub.producers,
      consumers: hub.consumers,
    }))),
    selectedNeighbourhoods: Object.freeze(selectedNeighbourhoods),
    interfaces: Object.freeze([
      profileInterface("read-jsnode-types", "inspect exported type carriers related to this codebase profile", { package: reading.package.name, q: selectedNames[0] ?? reading.domain.terms[0] ?? "", limit: "12" }),
      profileInterface("read-jsnode-functions", "inspect exported functions that can produce or consume selected carriers", { package: reading.package.name, q: selectedNames[0] ?? reading.domain.terms[0] ?? "", limit: "12" }),
      profileInterface("derive-context-relevance", "surface upstream type-flow and neighbouring codebase functions for the current intent", { focus: reading.domain.focus, intent: reading.domain.intent, limit: "8" }),
    ]),
  });
}

function typeFlowCandidateNames(
  flow: ReturnType<typeof workspaceTypeFlow>,
  packageName: string,
  selectedNames: readonly string[],
  terms: readonly string[],
): readonly string[] {
  const wanted = searchable([...selectedNames, ...terms]);
  const local = flow.nodes
    .filter((node) => node.pkg === packageName)
    .filter((node) => node.producers + node.consumers > 0)
    .filter((node) => selectedNames.includes(node.name) || terms.some((term) => searchable([node.name, node.kind]).includes(term)) || wanted.includes(node.name.toLowerCase()))
    .sort((left, right) => (right.producers + right.consumers) - (left.producers + left.consumers) || left.name.localeCompare(right.name))
    .map((node) => node.name);
  const hubs = flow.hubs
    .filter((node) => node.producers + node.consumers > 0)
    .map((node) => node.name);
  return Object.freeze([...new Set([...selectedNames, ...local, ...hubs])].slice(0, 18));
}

function compactTypeFlowNeighbourhood(item: TypeFlowNeighbourhood): CodebaseProfileTypeFlowNeighbourhood {
  return Object.freeze({
    name: item.name,
    pkg: item.pkg,
    typeKind: item.typeKind,
    producedBy: item.producedBy.length,
    consumedBy: item.consumedBy.length,
    upstream: Object.freeze(item.upstream.slice(0, 8)),
    downstream: Object.freeze(item.downstream.slice(0, 8)),
    reaches: item.reaches.length,
    reachableFrom: item.reachableFrom.length,
  });
}

function profileInterface(bin: string, purpose: string, params: Readonly<Record<string, string>>) {
  return Object.freeze({ bin, purpose, params: Object.freeze({ ...params }) });
}

function searchable(values: readonly (string | null | undefined)[]): string {
  return values
    .filter((value): value is string => value !== null && value !== undefined)
    .join(" ")
    .replace(/([a-z])([A-Z])/gu, "$1 $2")
    .toLowerCase();
}

function duplicateFunctionGroups(atlas: PackageAtlasView): readonly Readonly<{
  name: string;
  modules: readonly Readonly<{ module: string; file: string; signature: string }>[];
}>[] {
  const groups = new Map<string, { module: string; file: string; signature: string }[]>();
  for (const module of atlas.modules) {
    if (module.module === ".") continue;
    for (const symbol of module.symbols) {
      if (symbol.kind !== "function") continue;
      const list = groups.get(symbol.name) ?? [];
      list.push({ module: module.module, file: module.file, signature: symbol.signature });
      groups.set(symbol.name, list);
    }
  }
  return Object.freeze([...groups.entries()]
    .map(([name, modules]) => Object.freeze({ name, modules: Object.freeze(modules) }))
    .filter((group) => new Set(group.modules.map((item) => item.file)).size > 1)
    .sort((left, right) => right.modules.length - left.modules.length || left.name.localeCompare(right.name)));
}

function duplicateClassification(group: Readonly<{
  name: string;
  modules: readonly Readonly<{ module: string; file: string; signature: string }>[];
}>): CodebaseProfileAuditFinding["classification"] {
  const domains = domainWitnessesForModules(group.modules.map((item) => item.module));
  const signatures = new Set(group.modules.map((item) => normalizeSignature(item.signature)));
  return domains.length >= 3 && signatures.size <= 2 ? "upstream-fusion" : "domain-specialization";
}

function duplicateNext(group: Readonly<{
  name: string;
  modules: readonly Readonly<{ module: string; file: string; signature: string }>[];
}>): string {
  return duplicateClassification(group) === "upstream-fusion"
    ? "Promote the repeated helper through an upstream or shared carrier before editing another local copy."
    : "Keep the local helper only if the domain witnesses and type signatures prove it is a real specialization; otherwise fuse it upstream.";
}

function upstreamCandidatesForDuplicate(
  group: Readonly<{
    name: string;
    modules: readonly Readonly<{ module: string; file: string; signature: string }>[];
  }>,
  atlas: PackageAtlasView,
): readonly string[] {
  const text = `${group.name} ${group.modules.flatMap((item) => [item.module, item.signature]).join(" ")}`.toLowerCase();
  const candidates = [
    text.includes("json") || text.includes("log") || text.includes("event") ? "@emsenn/relating/writing" : null,
    text.includes("script") || text.includes("package") || text.includes("module") || text.includes("symbol") ? "@red-cup-engineering/organizing-with-jsnode" : null,
    text.includes("work") || text.includes("agent") || text.includes("operation") || text.includes("dispatch") ? "@red-cup-engineering/animating" : null,
    text.includes("strategy") || text.includes("play") || text.includes("arena") ? "@red-cup-engineering/gaming" : null,
    text.includes("charge") || text.includes("predicate") || text.includes("term") ? "@emsenn/relating" : null,
    ...atlas.package.dependencies.filter((dependency) => dependency.startsWith("@emsenn/")),
  ].filter((candidate): candidate is string => candidate !== null);
  return Object.freeze([...new Set(candidates)].slice(0, 8));
}

function typeWitnessesForDuplicate(group: Readonly<{
  name: string;
  modules: readonly Readonly<{ module: string; file: string; signature: string }>[];
}>): readonly string[] {
  return Object.freeze([...new Set(group.modules.flatMap((item) => typeTerms(item.signature)))].slice(0, 12));
}

function domainWitnessesForModules(modules: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(modules.map((module) => module.split("/").slice(0, 3).join("/")).filter((item) => item !== ""))].slice(0, 12));
}

function normalizeSignature(signature: string): string {
  return signature.replace(/\s+/gu, " ").replace(/\b[A-Za-z_$][A-Za-z0-9_$]*\b(?=\s*:)/gu, "_").trim();
}

function typeTerms(signature: string): readonly string[] {
  return Object.freeze([...new Set(signature.match(/\b[A-Z][A-Za-z0-9_]*(?:<[^>]+>)?/gu) ?? [])].slice(0, 12));
}

function symbolCarrierTerms(symbol: string): readonly string[] {
  const carrier = symbol.replace(/^(append|derive|read|record|refresh|select|update|write)/u, "");
  return carrier === symbol ? Object.freeze([]) : typeTerms(carrier);
}

function repeatedFoldModules(atlas: PackageAtlasView, repoRoot: string): readonly Readonly<{
  module: string;
  file: string;
  symbols: readonly string[];
  sharedCarrier: boolean;
  localMechanics: boolean;
}>[] {
  return Object.freeze(atlas.modules
    .filter((module) => module.module !== ".")
    .map((module) => {
      const symbols = module.symbols
        .map((symbol) => symbol.name)
        .filter((name) => /^read.*Log$/u.test(name) || /^refresh.*(Snapshot|Ledger|Control|Checkpoints)$/u.test(name) || /^append.*Event/u.test(name));
      const source = readModuleSource(repoRoot, module.file);
      return Object.freeze({
        module: module.module,
        file: module.file,
        symbols: Object.freeze(symbols),
        sharedCarrier: source.includes("events/stating/library/eavt-log-state"),
        localMechanics: /\b(parseJsonlLines|serializeEavt|appendFile|readFile|writeFile|rename)\b/u.test(source),
      });
    })
    .filter((module) => module.symbols.length > 0));
}

function localJsonlStateMechanicFiles(repoRoot: string): readonly Readonly<{
  file: string;
  mechanics: readonly string[];
  domainWitnesses: readonly string[];
  typeWitnesses: readonly string[];
}>[] {
  const srcRoot = path.join(repoRoot, "sites", "ops.561.group", "src");
  return Object.freeze(sourceFiles(srcRoot)
    .map((file) => path.relative(repoRoot, file).split(path.sep).join("/"))
    .map((file) => {
      const source = readModuleSource(repoRoot, file);
      if (file.endsWith("/operating/recording/events/stating/library/eavt-log-state.mts")) return null;
      if (source.includes("events/stating/library/eavt-log-state")) return null;
      const mechanics = jsonlStateMechanics(source);
      const stateful = mechanics.includes("parseJsonlLines")
        && mechanics.includes("serializeEavt")
        && mechanics.includes("appendFile")
        && mechanics.includes("readFile")
        && mechanics.includes("writeFile");
      if (!stateful) return null;
      return Object.freeze({
        file,
        mechanics,
        domainWitnesses: domainWitnessesForFiles([file]),
        typeWitnesses: typeWitnessesForSource(source),
      });
    })
    .filter((item): item is Readonly<{
      file: string;
      mechanics: readonly string[];
      domainWitnesses: readonly string[];
      typeWitnesses: readonly string[];
    }> => item !== null)
    .sort((left, right) => left.file.localeCompare(right.file)));
}

function sourceFiles(dir: string): readonly string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return Object.freeze([]);
  }
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".tmp") continue;
      files.push(...sourceFiles(full));
      continue;
    }
    if (entry.isFile() && full.endsWith(".mts")) files.push(full);
  }
  return Object.freeze(files);
}

function jsonlStateMechanics(source: string): readonly string[] {
  const terms = ["parseJsonlLines", "serializeEavt", "appendFile", "readFile", "writeFile", "rename", "mkdir"];
  return Object.freeze(terms.filter((term) => new RegExp(`\\b${term}\\b`, "u").test(source)));
}

function domainWitnessesForFiles(files: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(files
    .map((file) => file.replace(/^sites\/operations-manifold\.561\.group\/src\//u, ""))
    .map((file) => {
      const parts = file.split("/");
      return parts.length === 1 ? parts[0]?.replace(/\.mts$/u, "") ?? file : parts.slice(0, 3).join("/");
    })
    .filter((item) => item !== ""))].slice(0, 12));
}

function typeWitnessesForSource(source: string): readonly string[] {
  const terms = [
    ...source.matchAll(/\bexport\s+type\s+([A-Z][A-Za-z0-9_]*)/gu),
    ...source.matchAll(/\bexport\s+interface\s+([A-Z][A-Za-z0-9_]*)/gu),
  ].map((match) => match[1]).filter((term): term is string => term !== undefined);
  return Object.freeze([...new Set(terms)].slice(0, 12));
}

function readModuleSource(repoRoot: string, file: string): string {
  try {
    return readFileSync(path.join(repoRoot, file), "utf8");
  } catch {
    return "";
  }
}

function upstream(name: string, witnessedBy: readonly string[]) {
  return Object.freeze({
    name,
    witnessedBy: Object.freeze(witnessedBy.length === 0 ? [name] : witnessedBy),
  });
}

function carrier(
  kind: CodebaseProfileCarrierKind,
  id: string,
  label: string,
  detail: string,
  href: string,
  evidence: readonly string[],
  assets: readonly FileTouchMarketAsset[],
): CodebaseProfileCarrier {
  const uniqueEvidence = [...new Set(evidence)].slice(0, 8);
  return Object.freeze({
    id,
    kind,
    label,
    detail: clip(detail, 220),
    href,
    evidence: Object.freeze(uniqueEvidence),
    attention: compactAttention(attentionAsset(uniqueEvidence, assets)),
  });
}

function attentionAsset(evidence: readonly string[], assets: readonly FileTouchMarketAsset[]): FileTouchMarketAsset | null {
  const candidates = evidence.map(normalizeEvidencePath).filter((item): item is string => item !== null);
  const matches = assets.filter((asset) => candidates.some((candidate) => candidate === asset.path || candidate.includes(asset.path) || asset.path.includes(candidate)));
  return matches.sort((left, right) => right.attention - left.attention || left.path.localeCompare(right.path))[0] ?? null;
}

function compactAttention(asset: FileTouchMarketAsset | null): CodebaseProfileCarrierAttention | null {
  if (asset === null) return null;
  return Object.freeze({
    path: asset.path,
    regime: asset.regime,
    attention: asset.attention,
    reads: asset.reads,
    writes: asset.writes,
    touches: asset.touches,
    readDemand: asset.readDemand,
    writePressure: asset.writePressure,
    churn: asset.churn,
    midpointValue: asset.quote.midpointValue,
    spreadValue: asset.quote.spreadValue,
    evidence: Object.freeze(asset.evidence.slice(0, 6)),
  });
}

function normalizeEvidencePath(value: string): string | null {
  const pathLike = value.split("#", 1)[0]?.trim().replaceAll("\\", "/").replace(/^\.\//u, "") ?? "";
  if (pathLike === "" || !pathLike.includes("/")) return null;
  return pathLike;
}

function relation(from: string, to: string, kind: CodebaseProfileRelationKind, evidence: readonly string[]): CodebaseProfileRelation {
  return Object.freeze({
    from,
    to,
    kind,
    evidence: Object.freeze([...new Set(evidence)].slice(0, 8)),
  });
}

function dedupeCarriers(carriers: readonly CodebaseProfileCarrier[]): readonly CodebaseProfileCarrier[] {
  return Object.freeze([...new Map(carriers.map((item) => [item.id, item])).values()]);
}

function dedupeRelations(relations: readonly CodebaseProfileRelation[]): readonly CodebaseProfileRelation[] {
  return Object.freeze([...new Map(relations.map((item) => [`${item.from}\u0000${item.kind}\u0000${item.to}`, item])).values()]);
}

function packageId(name: string): string {
  return `package:${name}`;
}

function moduleId(name: string): string {
  return `module:${name}`;
}

function symbolId(moduleName: string, name: string): string {
  return `symbol:${moduleName}:${name}`;
}

function processorId(name: string): string {
  return `processor:${name}`;
}

function upstreamId(name: string): string {
  return `upstream:${name}`;
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 3))}...`;
}

export function codebaseProfileFocus(params: CodebaseProfileParams = {}): string {
  return optionalText(params.package ?? params.pkg ?? params.focus) ?? "@emsenn/operations-manifold";
}
