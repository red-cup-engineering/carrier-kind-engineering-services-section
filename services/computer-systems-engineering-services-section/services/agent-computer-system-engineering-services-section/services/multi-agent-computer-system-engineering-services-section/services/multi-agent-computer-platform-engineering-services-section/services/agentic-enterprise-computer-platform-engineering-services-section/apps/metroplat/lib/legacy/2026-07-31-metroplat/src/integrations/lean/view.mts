import { canonicalBytes } from "../../lib/identity/index.mts";
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
  leanRelationalConfigurationReportContract,
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
  type LeanRelationalConfigurationReport,
  type LeanTheoremReferenceCoverage,
  type LeanTheoremReferenceIndex,
  type LeanTheoremSpine,
} from "./schema.mts";
import {
  blueprintClaimGraphContract,
  type BlueprintClaimGraph,
} from "./blueprint/schema.mts";
import { causalHeightStrata } from "../../lib/math/order/causal.mts";
import { artifactTier } from "../../lib/records/persistence.mts";
import { graphFirstBettiNumberOfEdgeList } from "../../lib/math/graphs/laplacian.mts";
import {
  versoExpositionWeldReportContract,
  type VersoExpositionWeldReport,
} from "./verso/schema.mts";
import { agentEventChronicleContract } from "../../lib/codecs/json/otlp-schema.mts";
import { agentStatusReadoutContract, claimSessionContinuationContract } from "../../claims/schema.mts";
import { mark, utterance, type UtteranceObject } from "../../lib/records/utterance/index.mts";
import { type JsonValue } from "../../lib/codecs/json/core.mts";
import { openaiCodexBoundaryValue } from "../openai/codex/codec.mts";
import {
  accountableTransactionContract,
  verifyAccountableTransaction,
  type AccountabilityReport,
  type AccountableTransaction,
} from "../accountable-transaction/codec.mts";
import {
  otlpTracesContract,
  statementsFromOtlp,
  type OtlpTraces,
} from "../../lib/codecs/json/otlp.mts";
import { uniqueSortedStrings as uniqueSorted } from "../../lib/values/unique-sorted-strings.mts";
import { dataArtifactSchemaContractMaterial } from "../../lib/schema/data-artifact.mts";
import type { AgentEventChronicle } from "../../lib/codecs/json/otlp.mts";
import {
  agentStatusReadout,
  claimSessionContinuation,
  type AgentStatusReadout,
  type ClaimSessionContinuation,
} from "../../claims/session.mts";
import { chronicleWorkClaims, chronicleWorkReadFromChronicle } from "../../work/chronicle.mts";
import type { DataArtifactDescriptor } from "../../lib/addressing/index.mts";

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
  LeanRelationalConfigurationReport,
  LeanTheoremReferenceCoverage,
  LeanTheoremReferenceIndex,
  LeanTheoremSpine,
} from "./schema.mts";

type LeanImportGraphEdge = LeanImportGraph["edges"][number];
type LeanCapabilityReference = LeanCapabilityClaim["governs"][number];

export type LeanUtteranceProjectionOptions = Readonly<{
  source?: string;
}>;

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

export type LeanOpenAIChronicleReferenceOptions = LeanTextClaimObservationOptions & Readonly<{
  source?: string;
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

function textMarkValue(utteranceValue: UtteranceObject, hand: "token" | "claim"): string {
  const value = hand === "token" ? utteranceValue.token.mark.value : utteranceValue.claim.mark.value;
  if (typeof value !== "string") throw new TypeError(`Lean utterance projection: ${hand} mark must carry text`);
  const text = value.trim();
  if (text === "") throw new TypeError(`Lean utterance projection: ${hand} mark must be non-empty text`);
  return text;
}

export function leanTheoremNameFromUtterance(utteranceValue: UtteranceObject): string {
  return textMarkValue(utteranceValue, "token");
}

export function leanProjectionContextFromUtterance(utteranceValue: UtteranceObject): string {
  return textMarkValue(utteranceValue, "claim");
}

export function leanFormalizationClaimFromUtterance(
  utteranceValue: UtteranceObject,
  options: LeanUtteranceProjectionOptions = {},
): LeanFormalizationClaim {
  const theorem = leanTheoremNameFromUtterance(utteranceValue);
  return leanFormalizationClaim({
    theorem,
    source: options.source ?? "metroplat/articulation/utterance",
    obligations: [theorem],
  });
}

export function leanFormalizationClaimsFromUtterances(
  utterances: readonly UtteranceObject[],
  options: LeanUtteranceProjectionOptions = {},
): readonly LeanFormalizationClaim[] {
  return Object.freeze(utterances.map((utteranceValue) => leanFormalizationClaimFromUtterance(utteranceValue, options)));
}

export function leanDeclarationIndexFromUtterances(
  utterances: readonly UtteranceObject[],
  options: LeanUtteranceProjectionOptions = {},
): LeanDeclarationIndex {
  return leanDeclarationIndexContract.assert({
    kind: "metroplat.lean.declaration-index",
    source: options.source ?? "metroplat/articulation/utterance",
    declarations: Object.freeze(uniqueSorted(utterances.map((utteranceValue) => leanTheoremNameFromUtterance(utteranceValue)))),
    mediaType: "text/vnd.lean.declarations",
  }, "Lean declaration index") as LeanDeclarationIndex;
}

export function leanTheoremReferencesFromUtterances(
  utterances: readonly UtteranceObject[],
  options: LeanUtteranceProjectionOptions = {},
): LeanTheoremReferenceIndex {
  const source = options.source ?? "metroplat/articulation/utterance";
  return leanTheoremReferenceIndexContract.assert({
    kind: "metroplat.lean.theorem-reference-index",
    source,
    references: Object.freeze(utterances.map((utteranceValue, index) => Object.freeze({
      theorem: leanTheoremNameFromUtterance(utteranceValue),
      source,
      line: index + 1,
      context: leanProjectionContextFromUtterance(utteranceValue).slice(0, 240),
    }))),
    mediaType: "application/vnd.metroplat.lean.theorem-reference-index+json",
  }, "Lean theorem reference index") as LeanTheoremReferenceIndex;
}

export function utteranceFromLeanFormalizationClaim(claim: LeanFormalizationClaim): UtteranceObject {
  return utterance(mark(claim.theorem), mark(claim.source ?? claim.theorem));
}

export function utterancesFromLeanDeclarationIndex(index: LeanDeclarationIndex): readonly UtteranceObject[] {
  return Object.freeze(index.declarations.map((declaration) => utterance(mark(declaration), mark(index.source))));
}

export function utterancesFromLeanTheoremReferences(index: LeanTheoremReferenceIndex): readonly UtteranceObject[] {
  return Object.freeze(index.references.map((reference) =>
    utterance(mark(reference.theorem), mark(reference.context ?? reference.source))));
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
    actions: uniqueSorted(input.actions ?? []),
    schemas: uniqueSorted(input.schemas ?? []),
    exports: uniqueSorted(input.exports ?? []),
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
    const missingCapabilities = uniqueSorted(claim.governs.flatMap((reference) =>
      capabilityReferencePresent(reference, operationIds, schemaIds, exportIds) ? [] : [`${reference.kind}:${reference.id}`]));
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
  const missingTheorems = uniqueSorted(reportClaims.filter((claim) => !claim.theoremPresent).map((claim) => claim.theorem));
  const unprovedTheorems = uniqueSorted(reportClaims
    .filter((claim) => claim.theoremPresent && !claim.theoremProved)
    .map((claim) => claim.theorem));
  const missingCapabilities = uniqueSorted(reportClaims.flatMap((claim) => claim.missingCapabilities));
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

export function leanRelationalConfigurationReport(input: Readonly<{
  environment: LeanEnvironment;
  importGraph?: LeanImportGraph;
  theoremSpine?: LeanTheoremSpine;
  obligationCoverage?: LeanObligationCoverage;
  theoremReferenceCoverage?: LeanTheoremReferenceCoverage;
  blueprintClaimGraph?: unknown;
  versoExpositionWeldReport?: unknown;
  accountableTransactions?: readonly unknown[];
  dataArtifacts?: readonly unknown[];
  runtimeTraces?: readonly unknown[];
  openaiChronicles?: readonly unknown[];
  agentSessionContinuations?: readonly unknown[];
  agentSessionStatusSettlements?: readonly unknown[];
  capabilitySurface?: LeanCapabilitySurface;
  capabilityClaims?: LeanCapabilityClaimIndex;
  capabilityAuthorityReport?: LeanCapabilityAuthorityReport;
}>): LeanRelationalConfigurationReport {
  const environment = leanEnvironmentContract.assert(input.environment, "Lean relational configuration environment") as LeanEnvironment;
  const importGraph = input.importGraph ?? leanImportGraph(environment);
  const theoremSpine = input.theoremSpine ?? leanTheoremSpine(environment);
  const obligationCoverage = input.obligationCoverage;
  const knownSessionReferenceNames = uniqueSorted([
    ...theoremSpine.entries.map((entry) => entry.name),
    ...(environment.declarationIndex?.declarations ?? []),
  ]);
  const chronicleReferenceIndexes = (input.openaiChronicles ?? []).map((material) => {
    const chronicle = agentEventChronicleContract.assert(material, "Lean relational configuration OpenAI chronicle") as AgentEventChronicle;
    return leanTheoremReferencesFromOpenAIChronicle(chronicle, {
      knownDeclarations: knownSessionReferenceNames,
    });
  });
  const accountableTransactions = Object.freeze((input.accountableTransactions ?? []).map((material, index) =>
    accountableTransactionContract.assert(material, `Lean relational configuration accountableTransactions[${index}]`) as unknown as AccountableTransaction));
  const accountableTransactionReports = Object.freeze(accountableTransactions.map((transaction) => verifyAccountableTransaction(transaction)));
  const accountableTransactionBoundaryClaims = uniqueSorted(accountableTransactions.flatMap((transaction, index) =>
    accountableTransactionClaimText(transaction, accountableTransactionReports[index])));
  const accountableTransactionDisputes = uniqueSorted(accountableTransactionReports.flatMap((report) => [
    ...report.disputed,
    ...(report.authorized ? [] : [`transaction ${accountableTransactionId(report)} is not authorized`]),
    ...(report.paid ? [] : [`transaction ${accountableTransactionId(report)} is not paid`]),
    ...(report.attested ? [] : [`transaction ${accountableTransactionId(report)} is not attested`]),
    ...(report.coherent ? [] : [`transaction ${accountableTransactionId(report)} is not coherent`]),
  ]));
  const accountableTransactionReferenceIndexes = accountableTransactions.map((transaction, index) =>
    leanTheoremReferencesFromAccountableTransaction(transaction, {
      source: `accountable-transaction:${transaction.id ?? index + 1}`,
      knownDeclarations: knownSessionReferenceNames,
    }));
  const dataArtifacts = Object.freeze((input.dataArtifacts ?? []).map((material, index) =>
    dataArtifactSchemaContractMaterial.assert(material, `Lean relational configuration dataArtifacts[${index}]`) as DataArtifactDescriptor));
  const artifactBoundaryClaims = uniqueSorted(dataArtifacts.flatMap(dataArtifactClaimText));
  const artifactObstructions = uniqueSorted(dataArtifacts.flatMap(dataArtifactObstructions));
  const artifactReferenceIndexes = dataArtifacts.map((artifact, index) =>
    leanTheoremReferencesFromDataArtifact(artifact, {
      source: `data-artifact:${artifact.tier}:${index + 1}`,
      knownDeclarations: knownSessionReferenceNames,
    }));
  const runtimeTraces = Object.freeze((input.runtimeTraces ?? []).map((material, index) =>
    otlpTracesContract.assert(material, `Lean relational configuration runtimeTraces[${index}]`) as OtlpTraces));
  const runtimeTraceStatements = Object.freeze(runtimeTraces.flatMap((trace) => statementsFromOtlp(trace)));
  const runtimeTraceBoundaryClaims = uniqueSorted(runtimeTraceStatements.map((row) => canonicalBytes(row as unknown as JsonValue)));
  const runtimeTraceObstructions = uniqueSorted(runtimeTraces.flatMap((trace, index) =>
    statementsFromOtlp(trace).length === 0 ? [`runtime-trace:${index + 1}:no-statement-rows`] : []));
  const runtimeTraceReferenceIndexes = runtimeTraces.map((trace, index) =>
    leanTheoremReferencesFromOtlpTrace(trace, {
      source: `runtime-trace:${index + 1}`,
      knownDeclarations: knownSessionReferenceNames,
    }));
  const chronicleWorkReads = (input.openaiChronicles ?? []).map((material) => {
    const chronicle = agentEventChronicleContract.assert(material, "Lean relational configuration OpenAI chronicle work") as AgentEventChronicle;
    return chronicleWorkReadFromChronicle(chronicle);
  });
  const explicitContinuations = Object.freeze((input.agentSessionContinuations ?? []).map((material, index) =>
    claimSessionContinuationContract.assert(material, `Lean relational configuration agentSessionContinuations[${index}]`) as ClaimSessionContinuation));
  const chronicleContinuations = Object.freeze(chronicleWorkReads.map((read) => claimSessionContinuation(chronicleWorkClaims(read))));
  const agentSessionContinuations = Object.freeze([...explicitContinuations, ...chronicleContinuations]);
  const explicitStatusReadouts = Object.freeze((input.agentSessionStatusSettlements ?? []).map((material, index) =>
    agentStatusReadoutContract.assert(material, `Lean relational configuration agentSessionStatusSettlements[${index}]`) as AgentStatusReadout));
  const explicitStatusCutKeys = new Set(explicitStatusReadouts.map(statusCutKey));
  const derivedStatusReadouts = Object.freeze(agentSessionContinuations
    .filter((continuation) => !explicitStatusCutKeys.has(continuationStatusCutKey(continuation)))
    .map((continuation) => agentStatusReadout({
      source: `lean-relational-configuration:${continuation.source}`,
      continuation,
    })));
  const agentSessionStatusReadouts = Object.freeze([...explicitStatusReadouts, ...derivedStatusReadouts]);
  const agentSessionGoals = agentSessionContinuations.reduce((sum, continuation) => sum + continuation.goals, 0);
  const agentSessionObligations = agentSessionContinuations.reduce((sum, continuation) => sum + continuation.obligations, 0);
  const agentSessionClaims = agentSessionContinuations.reduce((sum, continuation) => sum + continuation.claims, 0);
  const agentSessionConflicts = uniqueSorted(agentSessionContinuations.flatMap((continuation) => [...continuation.conflicts]));
  const agentSessionMissing = uniqueSorted(agentSessionStatusReadouts.flatMap((cut) => [...cut.missing]));
  const theoremReferenceCoverage = input.theoremReferenceCoverage
    ?? (chronicleReferenceIndexes.length === 0
      && accountableTransactionReferenceIndexes.length === 0
      && artifactReferenceIndexes.length === 0
      && runtimeTraceReferenceIndexes.length === 0
      ? undefined
      : leanTheoremReferenceCoverage(mergeLeanTheoremReferenceIndexes([
        ...chronicleReferenceIndexes,
        ...accountableTransactionReferenceIndexes,
        ...artifactReferenceIndexes,
        ...runtimeTraceReferenceIndexes,
      ], "protocol-boundary-events"), theoremSpine));
  const blueprintClaimGraph = input.blueprintClaimGraph === undefined
    ? undefined
    : blueprintClaimGraphContract.assert(input.blueprintClaimGraph, "Lean relational configuration Blueprint claim graph") as BlueprintClaimGraph;
  const versoExpositionWeldReport = input.versoExpositionWeldReport === undefined
    ? undefined
    : versoExpositionWeldReportContract.assert(input.versoExpositionWeldReport, "Lean relational configuration Verso exposition weld report") as VersoExpositionWeldReport;
  const leanDeclarationNames = new Set(environment.modules.flatMap((module) => module.declarations.map((declaration) => declaration.name)));
  const theoremProofStatus = new Map(theoremSpine.entries.map((entry) => [entry.name, entry.proofStatus]));
  const blueprintLeanDeclarations = uniqueSorted(blueprintClaimGraph?.nodes.flatMap((node) => [...node.leanDeclarations]) ?? []);
  const blueprintMissingLeanDeclarations = uniqueSorted(blueprintLeanDeclarations.filter((declaration) => !leanDeclarationNames.has(declaration)));
  const blueprintUnprovedLeanDeclarations = uniqueSorted(blueprintClaimGraph?.nodes
    .filter((node) => node.status === "settled")
    .flatMap((node) => node.leanDeclarations.filter((declaration) =>
      theoremProofStatus.has(declaration) && theoremProofStatus.get(declaration) !== "proved")) ?? []);
  const blueprintNodeIds = blueprintClaimGraph === undefined
    ? undefined
    : new Set(blueprintClaimGraph.nodes.map((node) => node.id));
  const versoMissingLeanDeclarations = uniqueSorted([
    ...(versoExpositionWeldReport?.missingLeanDeclarations ?? []),
    ...(versoExpositionWeldReport?.leanDeclarations.filter((declaration) => !leanDeclarationNames.has(declaration)) ?? []),
  ]);
  const versoMissingBlueprintNodes = uniqueSorted([
    ...(versoExpositionWeldReport?.missingBlueprintNodes ?? []),
    ...(blueprintNodeIds === undefined
      ? []
      : versoExpositionWeldReport?.blueprintNodes.filter((node) => !blueprintNodeIds.has(node)) ?? []),
  ]);
  const documentFiberMissing = uniqueSorted([
    ...(blueprintClaimGraph?.missingDependencies ?? []).map((dependency) => `blueprint-dependency:${dependency}`),
    ...blueprintMissingLeanDeclarations.map((declaration) => `blueprint-lean:${declaration}`),
    ...blueprintUnprovedLeanDeclarations.map((declaration) => `blueprint-unproved:${declaration}`),
    ...versoMissingLeanDeclarations.map((declaration) => `verso-lean:${declaration}`),
    ...versoMissingBlueprintNodes.map((node) => `verso-blueprint:${node}`),
    ...(versoExpositionWeldReport !== undefined && versoExpositionWeldReport.blueprintNodes.length > 0 && blueprintClaimGraph === undefined
      ? ["verso-blueprint-graph:missing"]
      : []),
  ]);
  const capabilitySurface = input.capabilitySurface;
  const capabilityClaims = input.capabilityClaims;
  const capabilityAuthorityReport = input.capabilityAuthorityReport;
  const hasCapabilityClaims = (capabilityClaims?.claims.length ?? 0) > 0;
  const authorityAccepted = hasCapabilityClaims ? capabilityAuthorityReport?.accepted === true : true;
  const missingCapabilityTheorems = capabilityAuthorityReport?.missingTheorems ?? [];
  const unprovedCapabilityTheorems = capabilityAuthorityReport?.unprovedTheorems ?? [];
  const missingCapabilities = capabilityAuthorityReport?.missingCapabilities ?? [];
  const admitted = theoremSpine.admitted;
  const missingObligations = obligationCoverage?.missing ?? [];
  const extraObligations = obligationCoverage?.extra ?? [];
  const missingReferences = theoremReferenceCoverage?.missing ?? [];
  const unprovedReferences = theoremReferenceCoverage?.unproved ?? [];
  const accepted = importGraph.cycles.length === 0
    && admitted.length === 0
    && missingObligations.length === 0
    && missingReferences.length === 0
    && unprovedReferences.length === 0
    && documentFiberMissing.length === 0
    && accountableTransactionDisputes.length === 0
    && artifactObstructions.length === 0
    && runtimeTraceObstructions.length === 0
    && authorityAccepted
    && missingCapabilityTheorems.length === 0
    && unprovedCapabilityTheorems.length === 0
    && missingCapabilities.length === 0
    && agentSessionConflicts.length === 0;
  return leanRelationalConfigurationReportContract.assert({
    kind: "metroplat.lean.relational-configuration-report",
    rootModule: environment.rootModule,
    accepted,
    modules: environment.modules.length,
    theorems: theoremSpine.entries.length,
    admitted,
    importCycles: importGraph.cycles,
    importH1: importGraph.h1,
    ...(obligationCoverage === undefined ? {} : { declaredObligations: obligationCoverage.declared }),
    missingObligations,
    extraObligations,
    ...(theoremReferenceCoverage === undefined ? {} : { theoremReferences: theoremReferenceCoverage.referenced }),
    missingReferences,
    unprovedReferences,
    ...(blueprintClaimGraph === undefined ? {} : { blueprintClaimGraph }),
    blueprintClaimOccurrences: blueprintClaimGraph?.nodes.length ?? 0,
    blueprintFrontier: blueprintClaimGraph?.frontier ?? 0,
    blueprintMissingDependencies: blueprintClaimGraph?.missingDependencies ?? [],
    blueprintMissingLeanDeclarations,
    blueprintUnprovedLeanDeclarations,
    ...(versoExpositionWeldReport === undefined ? {} : { versoExpositionWeldReport }),
    versoClaimOccurrences: versoExpositionWeldReport?.claimOccurrences.length ?? 0,
    versoMissingLeanDeclarations,
    versoMissingBlueprintNodes,
    documentFiberMissing,
    accountableTransactions: accountableTransactions.length,
    accountableTransactionReports,
    accountableTransactionBoundaryClaims,
    accountableTransactionDisputes,
    dataArtifacts,
    artifactBoundaryClaims,
    artifactObstructions,
    runtimeTraces: runtimeTraces.length,
    runtimeTraceStatements,
    runtimeTraceBoundaryClaims,
    runtimeTraceObstructions,
    ...(capabilitySurface === undefined ? {} : {
      capabilityActions: capabilitySurface.actions.length,
      capabilitySchemas: capabilitySurface.schemas.length,
      capabilityExports: capabilitySurface.exports.length,
    }),
    capabilityClaims: capabilityClaims?.claims.length ?? 0,
    authorityAccepted,
    agentSessionGoals,
    agentSessionObligations,
    agentSessionClaims,
    agentSessionConflicts,
    agentSessionContinuations,
    agentSessionStatusSettlements: agentSessionStatusReadouts,
    agentSessionMissing,
    missingCapabilityTheorems,
    unprovedCapabilityTheorems,
    missingCapabilities,
    evidence: Object.freeze([
      `environment:${environment.rootModule}`,
      `modules:${environment.modules.length}`,
      `import-graph:${importGraph.nodes.length}/${importGraph.edges.length}`,
      `theorem-spine:${theoremSpine.entries.length}`,
      ...(obligationCoverage === undefined ? [] : [`obligations:${obligationCoverage.present}/${obligationCoverage.declared}`]),
      ...(theoremReferenceCoverage === undefined ? [] : [`references:${theoremReferenceCoverage.present}/${theoremReferenceCoverage.referenced}`]),
      ...(blueprintClaimGraph === undefined ? [] : [
        `blueprint-claim-occurrences:${blueprintClaimGraph.nodes.length}`,
        `blueprint-frontier:${blueprintClaimGraph.frontier}`,
      ]),
      ...(versoExpositionWeldReport === undefined ? [] : [
        `verso-claim-occurrences:${versoExpositionWeldReport.claimOccurrences.length}`,
        `verso-checked:${versoExpositionWeldReport.ok}`,
      ]),
      ...(documentFiberMissing.length === 0 ? [] : [`document-fiber-missing:${documentFiberMissing.length}`]),
      ...(accountableTransactions.length === 0 ? [] : [`accountable-transactions:${accountableTransactions.length}`]),
      ...(accountableTransactionBoundaryClaims.length === 0 ? [] : [`accountable-transaction-boundary-claims:${accountableTransactionBoundaryClaims.length}`]),
      ...(accountableTransactionDisputes.length === 0 ? [] : [`accountable-transaction-disputes:${accountableTransactionDisputes.length}`]),
      ...(dataArtifacts.length === 0 ? [] : [`data-artifacts:${dataArtifacts.length}`]),
      ...(artifactBoundaryClaims.length === 0 ? [] : [`artifact-boundary-claims:${artifactBoundaryClaims.length}`]),
      ...(artifactObstructions.length === 0 ? [] : [`artifact-obstructions:${artifactObstructions.length}`]),
      ...(runtimeTraces.length === 0 ? [] : [`runtime-traces:${runtimeTraces.length}`]),
      ...(runtimeTraceStatements.length === 0 ? [] : [`runtime-trace-statements:${runtimeTraceStatements.length}`]),
      ...(runtimeTraceObstructions.length === 0 ? [] : [`runtime-trace-obstructions:${runtimeTraceObstructions.length}`]),
      ...((input.openaiChronicles?.length ?? 0) === 0 ? [] : [`openai-chronicles:${input.openaiChronicles?.length ?? 0}`]),
      ...(agentSessionContinuations.length === 0 ? [] : [`agent-session-continuations:${agentSessionContinuations.length}`]),
      ...(agentSessionStatusReadouts.length === 0 ? [] : [`agent-session-status-settlements:${agentSessionStatusReadouts.length}`]),
      ...(agentSessionGoals === 0 ? [] : [`agent-session-goals:${agentSessionGoals}`]),
      ...(agentSessionObligations === 0 ? [] : [`agent-session-obligations:${agentSessionObligations}`]),
      ...(agentSessionClaims === 0 ? [] : [`agent-session-claims:${agentSessionClaims}`]),
      ...(agentSessionConflicts.length === 0 ? [] : [`agent-session-conflicts:${agentSessionConflicts.length}`]),
      ...(agentSessionMissing.length === 0 ? [] : [`agent-session-missing:${agentSessionMissing.length}`]),
      ...(capabilitySurface === undefined ? [] : [
        `actions:${capabilitySurface.actions.length}`,
        `schemas:${capabilitySurface.schemas.length}`,
        `exports:${capabilitySurface.exports.length}`,
      ]),
      ...(capabilityClaims === undefined ? [] : [`capability-claims:${capabilityClaims.claims.length}`]),
      ...(capabilityAuthorityReport === undefined ? [] : [`authority-report:${capabilityAuthorityReport.claims.length}`]),
    ]),
    mediaType: "application/vnd.metroplat.lean.relational-configuration-report+json",
  }, "Lean relational configuration report") as LeanRelationalConfigurationReport;
}

function accountableTransactionClaimText(
  transaction: AccountableTransaction,
  report?: AccountabilityReport,
): readonly string[] {
  const claimText = [
    `capability resource ${transaction.capability.resource}`,
    `capability actions ${transaction.capability.actions.join(" ")}`,
    `invocation ${transaction.invocation.resource}#${transaction.invocation.action}`,
    `settlement challenge ${transaction.settlement.challenge.resource}`,
    transaction.settlement.challenge.memo,
    ...(report?.disputed ?? []),
    `accountable transaction ${transaction.id} invokes ${transaction.invocation.resource}#${transaction.invocation.action}`,
  ].filter((text): text is string => typeof text === "string" && text.trim().length > 0);
  return Object.freeze(claimText.map((text) => text.trim()));
}

function accountableTransactionId(report: AccountabilityReport): string {
  const value = report.statement[2];
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const id = (value as { readonly id?: unknown }).id;
    if (typeof id === "string" && id.trim().length > 0) return id;
  }
  return "unknown";
}

function dataArtifactClaimText(artifact: DataArtifactDescriptor): readonly string[] {
  return Object.freeze([
    `record ${artifact.tier} artifact ${artifact.path}`,
    `record ${artifact.tier} role ${artifact.role}`,
    `record ${artifact.tier} schema ${artifact.schema}`,
  ]);
}

function dataArtifactObstructions(artifact: DataArtifactDescriptor): readonly string[] {
  const segment = `${artifactTier(artifact.tier).pathSegment}/`;
  return artifact.path.includes(segment)
    ? Object.freeze([])
    : Object.freeze([`data-artifact:${artifact.tier}:path-missing-${segment}`]);
}

function continuationStatusCutKey(continuation: ClaimSessionContinuation): string {
  return `${continuation.sessionId ?? ""}\u0000${continuation.source}`;
}

function statusCutKey(cut: AgentStatusReadout): string {
  return `${cut.sessionId ?? ""}\u0000${cut.continuation.source}`;
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

/** Read theorem-name references from admitted OpenAI/Codex session statement material. */
export function leanTheoremReferencesFromOpenAIChronicle(
  chronicle: AgentEventChronicle,
  options: LeanOpenAIChronicleReferenceOptions = {},
): LeanTheoremReferenceIndex {
  const text = chronicle.statements.map((row) => canonicalBytes(openaiCodexBoundaryValue(row))).join("\n");
  return leanTheoremReferencesFromText(
    text,
    options.source ?? `openai-chronicle:${chronicle.feed}`,
    options,
  );
}

/** Read theorem-name references from an accountable transaction boundary. */
export function leanTheoremReferencesFromAccountableTransaction(
  transaction: AccountableTransaction,
  options: LeanOpenAIChronicleReferenceOptions = {},
): LeanTheoremReferenceIndex {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction theorem references") as unknown as AccountableTransaction;
  const report = verifyAccountableTransaction(admitted);
  return leanTheoremReferencesFromText(
    accountableTransactionClaimText(admitted, report).join("\n"),
    options.source ?? `accountable-transaction:${admitted.id}`,
    options,
  );
}

/** Read theorem-name references from a durable data artifact handle. */
export function leanTheoremReferencesFromDataArtifact(
  artifact: DataArtifactDescriptor,
  options: LeanOpenAIChronicleReferenceOptions = {},
): LeanTheoremReferenceIndex {
  const admitted = dataArtifactSchemaContractMaterial.assert(artifact, "data artifact theorem references") as DataArtifactDescriptor;
  return leanTheoremReferencesFromText(
    dataArtifactClaimText(admitted).join("\n"),
    options.source ?? `data-artifact:${admitted.tier}:${admitted.path}`,
    options,
  );
}

/** Read theorem-name references from an OTLP runtime trace as an EAVT channel-code. */
export function leanTheoremReferencesFromOtlpTrace(
  trace: OtlpTraces,
  options: LeanOpenAIChronicleReferenceOptions = {},
): LeanTheoremReferenceIndex {
  const admitted = otlpTracesContract.assert(trace, "otlp runtime trace theorem references") as OtlpTraces;
  const text = statementsFromOtlp(admitted).map((row) => canonicalBytes(row as unknown as JsonValue)).join("\n");
  return leanTheoremReferencesFromText(
    text,
    options.source ?? "runtime-trace:otlp-eavt",
    options,
  );
}

/** Check OpenAI/Codex session theorem mentions against an admitted Lean theorem spine. */
export function leanTheoremReferenceCoverageFromOpenAIChronicle(
  chronicle: AgentEventChronicle,
  input: LeanEnvironment | LeanTheoremSpine | readonly LeanModule[],
  options: LeanOpenAIChronicleReferenceOptions = {},
): LeanTheoremReferenceCoverage {
  const spine = isLeanTheoremSpine(input) ? input : leanTheoremSpine(input);
  const index = leanTheoremReferencesFromOpenAIChronicle(chronicle, {
    ...options,
    knownTheorems: options.knownTheorems ?? spine.entries.map((entry) => entry.name),
  });
  return leanTheoremReferenceCoverage(index, spine);
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

function isLeanEnvironment(input: LeanEnvironment | readonly LeanModule[]): input is LeanEnvironment {
  return !Array.isArray(input) && "modules" in input;
}

function isLeanImportGraph(input: LeanImportGraph | LeanEnvironment | readonly LeanModule[]): input is LeanImportGraph {
  return !Array.isArray(input) && "nodes" in input && "edges" in input;
}

function isLeanTheoremSpine(input: LeanEnvironment | LeanTheoremSpine | readonly LeanModule[]): input is LeanTheoremSpine {
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
  return uniqueSorted([
    ...(options.knownTheorems ?? []),
    ...(options.knownDeclarations ?? []),
  ]);
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
