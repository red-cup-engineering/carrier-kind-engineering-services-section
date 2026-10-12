import {
  leanCapabilityAuthorityReportContract,
  leanCapabilityClaimContract,
  leanCapabilityClaimIndexContract,
  leanCapabilitySurfaceContract,
  leanDeclarationCatalogContract,
  leanDeclarationIndexContract,
  leanEnvironmentContract,
  leanFormalizationClaimContract,
  leanFormalizationReportContract,
  leanImportGraphContract,
  leanObligationCoverageContract,
  leanTheoremReferenceCoverageContract,
  leanTheoremReferenceIndexContract,
  leanTheoremSpineContract,
  type LeanCapabilityAuthorityReport,
  type LeanCapabilityClaim,
  type LeanCapabilityClaimIndex,
  type LeanCapabilitySurface,
  type LeanDeclarationCatalog,
  type LeanDeclarationIndex,
  type LeanEnvironment,
  type LeanFormalizationClaim,
  type LeanFormalizationReport,
  type LeanImportGraph,
  type LeanModule,
  type LeanObligationCoverage,
  type LeanTheoremReferenceCoverage,
  type LeanTheoremReferenceIndex,
  type LeanTheoremSpine,
} from "./schema.mts";
import { causalHeightStrata } from "@red-cup-engineering/feltos/math/order/causal";
import { graphFirstBettiNumberOfEdgeList } from "@lenticule-science/articulating/predicating/positing/settling/analysis/laplacian";


export type {
  LeanCapabilityAuthorityReport,
  LeanCapabilityClaim,
  LeanCapabilityClaimIndex,
  LeanCapabilitySurface,
  LeanDeclarationCatalog,
  LeanDeclarationIndex,
  LeanEnvironment,
  LeanFormalizationClaim,
  LeanFormalizationReport,
  LeanImportGraph,
  LeanModule,
  LeanObligationCoverage,
  LeanTheoremReferenceCoverage,
  LeanTheoremReferenceIndex,
  LeanTheoremSpine,
} from "./schema.mts";

type LeanImportGraphEdge = LeanImportGraph["edges"][number];
type LeanCapabilityReference = LeanCapabilityClaim["governs"][number];

export type LeanCapabilitySurfaceAction = Readonly<{
  verb: string;
  domain?: Readonly<{ id: string }>;
  codomain?: Readonly<{ id: string }>;
}>;

export type LeanCapabilitySurfaceSchemaLike = Readonly<{ id: string }>;

export type LeanCapabilitySurfacePackageSurface = Readonly<{
  exports?: Readonly<{
    entries: readonly Readonly<{ specifier: string }>[];
  }>;
  commitments?: readonly Readonly<{ face: string; name: string }>[];
}>;

export type LeanTextClaimObservationOptions = Readonly<{
  knownTheorems?: readonly string[];
  knownDeclarations?: readonly string[];
}>;

export function leanImportGraph(input: LeanEnvironment | readonly LeanModule[]): LeanImportGraph {
  const modules: readonly LeanModule[] = isLeanEnvironment(input) ? input.modules : input;
  const moduleById = new Map(modules.map((module) => [module.id, module]));
  const ids = new Set<string>();
  for (const module of modules) {
    ids.add(module.id);
    for (const imported of module.imports) ids.add(imported);
  }
  const edges = modules.flatMap((module) => module.imports.map((imported) => Object.freeze({
    from: module.id,
    to: imported,
    relationship: "import" as const,
    resolvedBy: "lean-import" as const,
  })));
  const nodes = [...ids].sort((left, right) => left.localeCompare(right)).map((id) => {
    const module = moduleById.get(id);
    return Object.freeze({
      id,
      ...(module?.path === undefined ? {} : { path: module.path }),
      workspaceMember: module !== undefined,
    });
  });
  return leanImportGraphContract.assert({
    kind: "metroplat.lean.import-graph",
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges.sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to))),
    cycles: dependencyCycles(nodes.map((node) => node.id), edges),
    h1: graphCycleRank(nodes.map((node) => node.id), edges),
    mediaType: "application/vnd.metroplat.lean.import-graph+json",
  }, "Lean import graph") as LeanImportGraph;
}

export function leanDeclarationCatalog(input: LeanEnvironment | readonly LeanModule[]): LeanDeclarationCatalog {
  const modules: readonly LeanModule[] = isLeanEnvironment(input) ? input.modules : input;
  const rootModule = isLeanEnvironment(input) ? input.rootModule : "Lean";
  const entries = modules.flatMap((module) => module.declarations.map((decl) => Object.freeze({
    module: module.id,
    name: decl.name,
    kind: decl.kind,
    ...(decl.namespace === undefined ? {} : { namespace: decl.namespace }),
    ...(decl.line === undefined ? {} : { line: decl.line }),
    ...(decl.proofStatus === undefined ? {} : { proofStatus: decl.proofStatus }),
  })));
  return leanDeclarationCatalogContract.assert({
    kind: "metroplat.lean.declaration-catalog",
    rootModule,
    entries: Object.freeze(entries.sort((left, right) => left.module.localeCompare(right.module) || left.name.localeCompare(right.name))),
    mediaType: "application/vnd.metroplat.lean.declaration-catalog+json",
  }, "Lean declaration catalog") as LeanDeclarationCatalog;
}

/** A Lean import DAG is a finite causal set (an import edge is "imported
 *  precedes importer"), so module tiering is the causal HEIGHT STRATIFICATION,
 *  read by the carried kinematics rather than a hand Kahn walk. An import
 *  cycle surfaces as the closed-timelike-curve obstruction instead of its
 *  members silently vanishing from every tier. */
export function topologicalSortLeanModules(input: LeanImportGraph | LeanEnvironment | readonly LeanModule[]): readonly (readonly string[])[] {
  const graph: LeanImportGraph = isLeanImportGraph(input) ? input : leanImportGraph(input);
  const events = graph.nodes.map((node) => node.id);
  const known = new Set(events);
  const links = graph.edges
    .filter((edge) => known.has(edge.from) && known.has(edge.to))
    .map((edge) => Object.freeze({ from: edge.to, to: edge.from }));
  const strata = causalHeightStrata(Object.freeze({ kind: "lorentzian.causalSet" as const, events, links }));
  if (!Array.isArray(strata)) {
    const obstruction = strata as {
      readonly reason: string;
      readonly offending?: { readonly from: string; readonly to: string };
      readonly cycle: readonly string[];
    };
    const location = obstruction.cycle.length > 0
      ? ` cycle ${obstruction.cycle.join(" -> ")}`
      : obstruction.offending === undefined ? "" : ` at ${obstruction.offending.from} -> ${obstruction.offending.to}`;
    throw new TypeError(`topologicalSortLeanModules: ${obstruction.reason}${location}`);
  }
  return strata;
}

export function leanTheoremSpine(
  input: LeanEnvironment | readonly LeanModule[],
  names?: readonly string[],
): LeanTheoremSpine {
  const modules: readonly LeanModule[] = isLeanEnvironment(input) ? input.modules : input;
  const rootModule = isLeanEnvironment(input) ? input.rootModule : "Lean";
  const wanted = names === undefined ? undefined : new Set(names);
  const entries = modules.flatMap((module) => module.declarations
    .filter((decl) => decl.kind === "theorem" || decl.kind === "lemma")
    .filter((decl) => wanted === undefined || wanted.has(decl.name))
    .map((decl) => Object.freeze({
      module: module.id,
      name: decl.name,
      kind: decl.kind as "theorem" | "lemma",
      ...(decl.line === undefined ? {} : { line: decl.line }),
      ...(decl.proofStatus === undefined ? {} : { proofStatus: decl.proofStatus }),
    })));
  return leanTheoremSpineContract.assert({
    kind: "metroplat.lean.theorem-spine",
    rootModule,
    entries: Object.freeze(entries.sort((left, right) => left.module.localeCompare(right.module) || left.name.localeCompare(right.name))),
    admitted: Object.freeze(entries.filter((entry) => entry.proofStatus === "admitted").map((entry) => entry.name).sort((left, right) => left.localeCompare(right))),
    mediaType: "application/vnd.metroplat.lean.theorem-spine+json",
  }, "Lean theorem spine") as LeanTheoremSpine;
}

export function leanObligationCoverage(
  spine: LeanTheoremSpine,
  declarationIndex: LeanDeclarationIndex | Readonly<{ declarations: readonly string[] }>,
): LeanObligationCoverage {
  const declared = new Set(declarationIndex.declarations);
  const present = new Set(spine.entries.map((entry) => entry.name));
  return leanObligationCoverageContract.assert({
    kind: "metroplat.lean.obligation-coverage",
    declared: declared.size,
    present: [...declared].filter((name) => present.has(name)).length,
    missing: Object.freeze([...declared].filter((name) => !present.has(name)).sort((left, right) => left.localeCompare(right))),
    extra: Object.freeze([...present].filter((name) => !declared.has(name)).sort((left, right) => left.localeCompare(right))),
    admitted: spine.admitted,
    mediaType: "application/vnd.metroplat.lean.obligation-coverage+json",
  }, "Lean obligation coverage") as LeanObligationCoverage;
}

export function leanFormalizationClaim(input: Readonly<{
  theorem: string;
  source?: string;
  theoremMaturity?: string;
  environmentMaturity?: string;
  obligations?: readonly string[];
}>): LeanFormalizationClaim {
  return leanFormalizationClaimContract.assert({
    kind: "metroplat.lean.formalization-claim",
    theorem: input.theorem,
    ...(input.source === undefined ? {} : { source: input.source }),
    ...(input.theoremMaturity === undefined ? {} : { theoremMaturity: input.theoremMaturity }),
    ...(input.environmentMaturity === undefined ? {} : { environmentMaturity: input.environmentMaturity }),
    obligations: Object.freeze([...(input.obligations ?? [])]),
    mediaType: "application/vnd.metroplat.lean.formalization-claim+json",
  }, "Lean formalization claim") as LeanFormalizationClaim;
}

export function leanFormalizationClaimFromCertificate(certificate: unknown, source = "certificate.formalization"): LeanFormalizationClaim {
  const record = asRecord(certificate, "Lean formalization certificate");
  const formalization = asRecord(record["formalization"], "Lean formalization certificate.formalization");
  const theorem = stringField(formalization, "certificateTheorem");
  const theoremMaturity = optionalStringField(formalization, "certificateTheoremMaturity");
  const environmentMaturity = optionalStringField(formalization, "leanMaturity");
  const proof = recordValue(record["proof"]);
  const obligations = Array.isArray(proof?.["obligations"])
    ? proof["obligations"].flatMap((item) => {
        const obligation = recordValue(item)?.["obligation"];
        return typeof obligation === "string" && obligation !== "" ? [obligation] : [];
      })
    : [];
  return leanFormalizationClaim({
    theorem,
    source,
    ...(theoremMaturity === undefined ? {} : { theoremMaturity }),
    ...(environmentMaturity === undefined ? {} : { environmentMaturity }),
    obligations,
  });
}

export function leanFormalizationReport(
  claim: LeanFormalizationClaim,
  input: LeanEnvironment | LeanTheoremSpine | readonly LeanModule[],
): LeanFormalizationReport {
  const spine = isLeanTheoremSpine(input) ? input : leanTheoremSpine(input);
  const entry = spine.entries.find((candidate) => candidate.name === claim.theorem);
  const proofStatus = entry?.proofStatus ?? "unknown";
  const present = entry !== undefined;
  const proved = proofStatus === "proved";
  const missing = [
    ...(present ? [] : [`theorem:${claim.theorem}`]),
    ...(present && !proved ? [`proof-status:${proofStatus}`] : []),
  ];
  return leanFormalizationReportContract.assert({
    kind: "metroplat.lean.formalization-report",
    theorem: claim.theorem,
    ...(claim.source === undefined ? {} : { source: claim.source }),
    present,
    proved,
    accepted: present && proved,
    proofStatus,
    ...(claim.theoremMaturity === undefined ? {} : { theoremMaturity: claim.theoremMaturity }),
    ...(claim.environmentMaturity === undefined ? {} : { environmentMaturity: claim.environmentMaturity }),
    obligations: Object.freeze([...(claim.obligations ?? [])]),
    missing: Object.freeze(missing),
    evidence: Object.freeze([
      `spine:${spine.rootModule}`,
      ...(entry?.module === undefined ? [] : [`module:${entry.module}`]),
      `proof-status:${proofStatus}`,
    ]),
    mediaType: "application/vnd.metroplat.lean.formalization-report+json",
  }, "Lean formalization report") as LeanFormalizationReport;
}

export function leanCapabilitySurface(input: Readonly<{
  actions?: readonly string[];
  schemas?: readonly string[];
  exports?: readonly string[];
}>): LeanCapabilitySurface {
  return leanCapabilitySurfaceContract.assert({
    kind: "metroplat.lean.capability-surface",
    actions: [...new Set(input.actions ?? [])].sort(),
    schemas: [...new Set(input.schemas ?? [])].sort(),
    exports: [...new Set(input.exports ?? [])].sort(),
    mediaType: "application/vnd.metroplat.lean.capability-surface+json",
  }, "Lean capability surface") as LeanCapabilitySurface;
}

export function leanCapabilitySurfaceFromOperations(
  actions: readonly LeanCapabilitySurfaceAction[],
  extra: Readonly<{ schemas?: readonly string[]; exports?: readonly string[] }> = {},
): LeanCapabilitySurface {
  const operationNames = actions.map((item) => item.verb);
  const schemaIds = actions.flatMap((item) => [
    ...(item.domain?.id === undefined ? [] : [item.domain.id]),
    ...(item.codomain?.id === undefined ? [] : [item.codomain.id]),
  ]);
  return leanCapabilitySurface({
    actions: operationNames,
    schemas: [...schemaIds, ...(extra.schemas ?? [])],
    ...(extra.exports === undefined ? {} : { exports: extra.exports }),
  });
}

export function leanCapabilitySurfaceFromPackageSurface(input: Readonly<{
  actions?: readonly LeanCapabilitySurfaceAction[];
  schemas?: readonly LeanCapabilitySurfaceSchemaLike[];
  packageSurface?: LeanCapabilitySurfacePackageSurface;
  exports?: readonly string[];
}>): LeanCapabilitySurface {
  const packageExports = [
    ...(input.packageSurface?.exports?.entries.map((entry) => entry.specifier) ?? []),
    ...(input.packageSurface?.commitments
      ?.filter((commitment) => commitment.face === "export")
      .map((commitment) => commitment.name) ?? []),
  ];
  return leanCapabilitySurface({
    ...(input.actions === undefined ? {} : { actions: input.actions.map((action) => action.verb) }),
    ...(input.schemas === undefined ? {} : { schemas: input.schemas.map((schema) => schema.id) }),
    exports: [...packageExports, ...(input.exports ?? [])],
  });
}

export function leanCapabilityClaim(input: Readonly<{
  theorem: string;
  source?: string;
  governs: readonly LeanCapabilityReference[];
}>): LeanCapabilityClaim {
  return leanCapabilityClaimContract.assert({
    kind: "metroplat.lean.capability-claim",
    theorem: input.theorem,
    ...(input.source === undefined ? {} : { source: input.source }),
    governs: Object.freeze([...input.governs].map((reference) => Object.freeze({ kind: reference.kind, id: reference.id }))),
    mediaType: "application/vnd.metroplat.lean.capability-claim+json",
  }, "Lean capability claim") as LeanCapabilityClaim;
}

export function leanCapabilityClaimsFromText(
  text: string,
  source = "source",
  options: LeanTextClaimObservationOptions = {},
): LeanCapabilityClaimIndex {
  const knownTheorems = knownLeanTextNames(options);
  const claims: LeanCapabilityClaim[] = [];
  text.split(/\r?\n/u).forEach((line, index) => {
    const lower = line.toLowerCase();
    if (!lower.includes("governs") && !lower.includes("authority")) return;
    const theoremNames = knownTheorems.filter((name) => lineMentionsLeanName(line, name));
    if (theoremNames.length === 0) return;
    const governs = [...line.matchAll(/\b(action|schema|export):([^\s,;]+)/gu)]
      .map((match) => Object.freeze({
        kind: match[1] as LeanCapabilityReference["kind"],
        id: (match[2] ?? "").replace(/[.)\]}]+$/u, ""),
      }))
      .filter((reference) => reference.id.length > 0);
    if (governs.length === 0) return;
    for (const theorem of [...new Set(theoremNames)]) {
      claims.push(leanCapabilityClaim({
        theorem,
        source: `${source}:${index + 1}`,
        governs,
      }));
    }
  });
  return leanCapabilityClaimIndexContract.assert({
    kind: "metroplat.lean.capability-claim-index",
    source,
    claims: Object.freeze(claims),
    mediaType: "application/vnd.metroplat.lean.capability-claim-index+json",
  }, "Lean capability claim index") as LeanCapabilityClaimIndex;
}

export function mergeLeanCapabilityClaimIndexes(
  indexes: readonly LeanCapabilityClaimIndex[],
  source = "merged",
): LeanCapabilityClaimIndex {
  return leanCapabilityClaimIndexContract.assert({
    kind: "metroplat.lean.capability-claim-index",
    source,
    claims: Object.freeze(indexes.flatMap((index) => [...index.claims])),
    mediaType: "application/vnd.metroplat.lean.capability-claim-index+json",
  }, "Lean capability claim index") as LeanCapabilityClaimIndex;
}

export function leanCapabilityAuthorityReport(
  claims: readonly LeanCapabilityClaim[],
  surface: LeanCapabilitySurface,
  input: LeanEnvironment | LeanTheoremSpine | readonly LeanModule[],
): LeanCapabilityAuthorityReport {
  const spine = isLeanTheoremSpine(input) ? input : leanTheoremSpine(input);
  const byTheorem = new Map(spine.entries.map((entry) => [entry.name, entry]));
  const operationIds = new Set(surface.actions);
  const schemaIds = new Set(surface.schemas);
  const exportIds = new Set(surface.exports);
  const reportClaims = claims.map((claim) => {
    const theorem = byTheorem.get(claim.theorem);
    const proofStatus = theorem?.proofStatus ?? "unknown";
    const missingCapabilities = [...new Set(claim.governs.flatMap((reference) =>
      capabilityReferencePresent(reference, operationIds, schemaIds, exportIds) ? [] : [`${reference.kind}:${reference.id}`]))].sort();
    return Object.freeze({
      theorem: claim.theorem,
      ...(claim.source === undefined ? {} : { source: claim.source }),
      theoremPresent: theorem !== undefined,
      theoremProved: proofStatus === "proved",
      proofStatus,
      governs: Object.freeze([...claim.governs]),
      missingCapabilities,
    });
  });
  const missingTheorems = [...new Set(reportClaims.filter((claim) => !claim.theoremPresent).map((claim) => claim.theorem))].sort();
  const unprovedTheorems = [...new Set(reportClaims
    .filter((claim) => claim.theoremPresent && !claim.theoremProved)
    .map((claim) => claim.theorem))].sort();
  const missingCapabilities = [...new Set(reportClaims.flatMap((claim) => claim.missingCapabilities))].sort();
  return leanCapabilityAuthorityReportContract.assert({
    kind: "metroplat.lean.capability-authority-report",
    accepted: missingTheorems.length === 0 && unprovedTheorems.length === 0 && missingCapabilities.length === 0,
    claims: Object.freeze(reportClaims),
    missingTheorems,
    unprovedTheorems,
    missingCapabilities,
    evidence: Object.freeze([
      `spine:${spine.rootModule}`,
      `claims:${claims.length}`,
      `actions:${surface.actions.length}`,
      `schemas:${surface.schemas.length}`,
      `exports:${surface.exports.length}`,
    ]),
    mediaType: "application/vnd.metroplat.lean.capability-authority-report+json",
  }, "Lean capability authority report") as LeanCapabilityAuthorityReport;
}

export function leanTheoremReferencesFromText(
  text: string,
  source = "source",
  options: LeanTextClaimObservationOptions = {},
): LeanTheoremReferenceIndex {
  const knownTheorems = knownLeanTextNames(options);
  const references: LeanTheoremReferenceIndex["references"][number][] = [];
  text.split(/\r?\n/u).forEach((line, index) => {
    const seen = new Set<string>();
    for (const theorem of knownTheorems) {
      if (!lineMentionsLeanName(line, theorem)) continue;
      if (seen.has(theorem)) continue;
      seen.add(theorem);
      references.push(Object.freeze({
        theorem,
        source,
        line: index + 1,
        context: line.trim().slice(0, 240),
      }));
    }
  });
  return leanTheoremReferenceIndexContract.assert({
    kind: "metroplat.lean.theorem-reference-index",
    source,
    references: Object.freeze(references),
    mediaType: "application/vnd.metroplat.lean.theorem-reference-index+json",
  }, "Lean theorem reference index") as LeanTheoremReferenceIndex;
}

export function mergeLeanTheoremReferenceIndexes(
  indexes: readonly LeanTheoremReferenceIndex[],
  source = "merged",
): LeanTheoremReferenceIndex {
  return leanTheoremReferenceIndexContract.assert({
    kind: "metroplat.lean.theorem-reference-index",
    source,
    references: Object.freeze(indexes.flatMap((index) => [...index.references])),
    mediaType: "application/vnd.metroplat.lean.theorem-reference-index+json",
  }, "Lean theorem reference index") as LeanTheoremReferenceIndex;
}

export function leanTheoremReferenceCoverage(
  index: LeanTheoremReferenceIndex,
  input: LeanEnvironment | LeanTheoremSpine | readonly LeanModule[],
): LeanTheoremReferenceCoverage {
  const spine = isLeanTheoremSpine(input) ? input : leanTheoremSpine(input);
  const byName = new Map(spine.entries.map((entry) => [entry.name, entry]));
  const referenced = [...new Set(index.references.map((entry) => entry.theorem))].sort((left, right) => left.localeCompare(right));
  const missing = referenced.filter((name) => !byName.has(name));
  const unproved = referenced.filter((name) => {
    const entry = byName.get(name);
    return entry !== undefined && entry.proofStatus !== "proved";
  });
  return leanTheoremReferenceCoverageContract.assert({
    kind: "metroplat.lean.theorem-reference-coverage",
    referenced: referenced.length,
    present: referenced.length - missing.length,
    proved: referenced.length - missing.length - unproved.length,
    missing: Object.freeze(missing),
    unproved: Object.freeze(unproved),
    evidence: Object.freeze([
      `reference-index:${index.source}`,
      `spine:${spine.rootModule}`,
      `references:${index.references.length}`,
    ]),
    mediaType: "application/vnd.metroplat.lean.theorem-reference-coverage+json",
  }, "Lean theorem reference coverage") as LeanTheoremReferenceCoverage;
}

export function isLeanEnvironment(input: LeanEnvironment | readonly LeanModule[]): input is LeanEnvironment {
  return !Array.isArray(input) && "modules" in input;
}

export function isLeanImportGraph(input: LeanImportGraph | LeanEnvironment | readonly LeanModule[]): input is LeanImportGraph {
  return !Array.isArray(input) && "nodes" in input && "edges" in input;
}

export function isLeanTheoremSpine(input: LeanEnvironment | LeanTheoremSpine | readonly LeanModule[]): input is LeanTheoremSpine {
  return !Array.isArray(input) && "entries" in input && "admitted" in input;
}

function capabilityReferencePresent(
  reference: LeanCapabilityReference,
  actions: ReadonlySet<string>,
  schemas: ReadonlySet<string>,
  exports: ReadonlySet<string>,
): boolean {
  if (reference.kind === "action") return actions.has(reference.id);
  if (reference.kind === "schema") return schemas.has(reference.id);
  return exports.has(reference.id);
}

function knownLeanTextNames(options: LeanTextClaimObservationOptions): readonly string[] {
  return [...new Set([
    ...(options.knownTheorems ?? []),
    ...(options.knownDeclarations ?? []),
  ])].sort();
}

function lineMentionsLeanName(line: string, name: string): boolean {
  if (name === "") return false;
  let index = line.indexOf(name);
  while (index !== -1) {
    const before = index === 0 ? "" : line[index - 1] ?? "";
    const beforeBefore = index <= 1 ? "" : line[index - 2] ?? "";
    const after = line[index + name.length] ?? "";
    const afterAfter = line[index + name.length + 1] ?? "";
    const continuesFromNamespace = before === "." && isLeanNameCharacter(beforeBefore);
    const continuesIntoNamespace = after === "." && /^[A-Za-z_]$/u.test(afterAfter);
    if (!isLeanNameCharacter(before) && !isLeanNameCharacter(after) && !continuesFromNamespace && !continuesIntoNamespace) {
      return true;
    }
    index = line.indexOf(name, index + name.length);
  }
  return false;
}

function isLeanNameCharacter(value: string): boolean {
  return /^[A-Za-z0-9_']$/u.test(value);
}

function recordValue(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : undefined;
}

function asRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  const record = recordValue(value);
  if (record === undefined) throw new TypeError(`${label}: expected object`);
  return record;
}

function stringField(record: Readonly<Record<string, unknown>>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value === "") throw new TypeError(`Lean formalization ${key}: expected non-empty string`);
  return value;
}

function optionalStringField(record: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value !== "" ? value : undefined;
}

function dependencyCycles(nodes: readonly string[], edges: readonly LeanImportGraphEdge[]): readonly (readonly string[])[] {
  const out = new Map(nodes.map((node) => [node, [] as string[]]));
  for (const edge of edges) out.get(edge.from)?.push(edge.to);
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const visit = (node: string): void => {
    if (visiting.has(node)) {
      const offset = stack.indexOf(node);
      if (offset !== -1) cycles.push(stack.slice(offset));
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const next of out.get(node) ?? []) visit(next);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  };
  for (const node of nodes) visit(node);
  return Object.freeze(cycles.map((cycle) => Object.freeze(cycle)).sort((left, right) => right.length - left.length || (left[0] ?? "").localeCompare(right[0] ?? "")));
}

/** The import graph's first Betti number (`h1`, its independent-cycle count) is the `E - V + C`
 *  union-find invariant, read by the sparse-graph-native `graphFirstBettiNumberOfEdgeList` — an
 *  import graph is large but sparse (`E = O(V)`), so this stays off the exact-integer dense-matrix
 *  path (`hodgeDecompositionOfWeights` + `weightsOfEdges`), whose `O(V³)` exact-integer rank/Smith
 *  reduction is fine for the small predication-cell relation graphs it was built for but is
 *  infeasible at Lean-module-import scale (hundreds of nodes OOM there). */
function graphCycleRank(nodes: readonly string[], edges: readonly LeanImportGraphEdge[]): number {
  const indexOf = new Map(nodes.map((node, index) => [node, index]));
  const pairs: (readonly [number, number])[] = [];
  for (const edge of edges) {
    const from = indexOf.get(edge.from);
    const to = indexOf.get(edge.to);
    if (from !== undefined && to !== undefined) pairs.push(Object.freeze([from, to]));
  }
  return graphFirstBettiNumberOfEdgeList(nodes.length, pairs);
}
