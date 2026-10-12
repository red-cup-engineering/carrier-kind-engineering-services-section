/**
 * integrations/lean/view - metroplat's own Lean claim-occurrence joins.
 *
 * The portable Lean domain readouts (import graphs, theorem spines,
 * capability surfaces/claims/authority reports, and text/OTLP/chronicle
 * theorem-reference extraction) live in
 * `@red-cup-engineering/lean-system-services-section` and are consumed here
 * directly. This module keeps only metroplat's own joins on top of them:
 * projecting Lean formalization material to/from the articulation
 * `UtteranceObject` carrier, reading theorem references out of metroplat's
 * own OpenAI/Codex chronicles, accountable transactions, data artifacts, and
 * OTLP runtime traces, and `leanRelationalConfigurationReport` — the single
 * report that joins a Lean environment with all of those metroplat-owned
 * protocol-boundary fibers.
 */
import { canonicalBytes } from "../../lib/identity/index.mts";
import {
  leanDeclarationIndexContract,
  leanEnvironmentContract,
  leanFormalizationClaim,
  leanImportGraph,
  leanTheoremReferenceCoverage,
  leanTheoremReferenceIndexContract,
  leanTheoremReferencesFromText,
  leanTheoremSpine,
  isLeanTheoremSpine,
  mergeLeanTheoremReferenceIndexes,
  type LeanCapabilityAuthorityReport,
  type LeanCapabilityClaimIndex,
  type LeanCapabilitySurface,
  type LeanDeclarationIndex,
  type LeanEnvironment,
  type LeanFormalizationClaim,
  type LeanImportGraph,
  type LeanModule,
  type LeanObligationCoverage,
  type LeanTextClaimObservationOptions,
  type LeanTheoremReferenceCoverage,
  type LeanTheoremReferenceIndex,
  type LeanTheoremSpine,
} from "@red-cup-engineering/lean-system-services-section";
import {
  blueprintClaimGraphContract,
  type BlueprintClaimGraph,
} from "@red-cup-engineering/lean-system-services-section/blueprint/schema";
import {
  versoExpositionWeldReportContract,
  type VersoExpositionWeldReport,
} from "@red-cup-engineering/lean-system-services-section/verso/schema";
import {
  leanRelationalConfigurationReportContract,
  type LeanRelationalConfigurationReport,
} from "./schema.mts";
import { artifactTier } from "@lenticule-science/metrologic/settling/records/persistence";
import { agentEventChronicleContract } from "../../lib/codecs/json/otlp-schema.mts";
import { agentStatusReadoutContract, claimSessionContinuationContract } from "../../claims/schema.mts";
import { mark, utterance, type UtteranceObject } from "../../lib/records/utterance/index.mts";
import { type JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
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
  LeanCapabilityClaimIndex,
  LeanCapabilitySurface,
  LeanDeclarationIndex,
  LeanEnvironment,
  LeanFormalizationClaim,
  LeanImportGraph,
  LeanModule,
  LeanObligationCoverage,
  LeanTheoremReferenceCoverage,
  LeanTheoremReferenceIndex,
  LeanTheoremSpine,
} from "@red-cup-engineering/lean-system-services-section";

export type LeanUtteranceProjectionOptions = Readonly<{
  source?: string;
}>;

export type LeanOpenAIChronicleReferenceOptions = LeanTextClaimObservationOptions & Readonly<{
  source?: string;
}>;

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
    declarations: Object.freeze([...new Set(utterances.map((utteranceValue) => leanTheoremNameFromUtterance(utteranceValue)))].sort()),
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
  const knownSessionReferenceNames = [...new Set([
    ...theoremSpine.entries.map((entry) => entry.name),
    ...(environment.declarationIndex?.declarations ?? []),
  ])].sort();
  const chronicleReferenceIndexes = (input.openaiChronicles ?? []).map((material) => {
    const chronicle = agentEventChronicleContract.assert(material, "Lean relational configuration OpenAI chronicle") as AgentEventChronicle;
    return leanTheoremReferencesFromOpenAIChronicle(chronicle, {
      knownDeclarations: knownSessionReferenceNames,
    });
  });
  const accountableTransactions = Object.freeze((input.accountableTransactions ?? []).map((material, index) =>
    accountableTransactionContract.assert(material, `Lean relational configuration accountableTransactions[${index}]`) as unknown as AccountableTransaction));
  const accountableTransactionReports = Object.freeze(accountableTransactions.map((transaction) => verifyAccountableTransaction(transaction)));
  const accountableTransactionBoundaryClaims = [...new Set(accountableTransactions.flatMap((transaction, index) =>
    accountableTransactionClaimText(transaction, accountableTransactionReports[index])))].sort();
  const accountableTransactionDisputes = [...new Set(accountableTransactionReports.flatMap((report) => [
    ...report.disputed,
    ...(report.authorized ? [] : [`transaction ${accountableTransactionId(report)} is not authorized`]),
    ...(report.paid ? [] : [`transaction ${accountableTransactionId(report)} is not paid`]),
    ...(report.attested ? [] : [`transaction ${accountableTransactionId(report)} is not attested`]),
    ...(report.coherent ? [] : [`transaction ${accountableTransactionId(report)} is not coherent`]),
  ]))].sort();
  const accountableTransactionReferenceIndexes = accountableTransactions.map((transaction, index) =>
    leanTheoremReferencesFromAccountableTransaction(transaction, {
      source: `accountable-transaction:${transaction.id ?? index + 1}`,
      knownDeclarations: knownSessionReferenceNames,
    }));
  const dataArtifacts = Object.freeze((input.dataArtifacts ?? []).map((material, index) =>
    dataArtifactSchemaContractMaterial.assert(material, `Lean relational configuration dataArtifacts[${index}]`) as DataArtifactDescriptor));
  const artifactBoundaryClaims = [...new Set(dataArtifacts.flatMap(dataArtifactClaimText))].sort();
  const artifactObstructions = [...new Set(dataArtifacts.flatMap(dataArtifactObstructions))].sort();
  const artifactReferenceIndexes = dataArtifacts.map((artifact, index) =>
    leanTheoremReferencesFromDataArtifact(artifact, {
      source: `data-artifact:${artifact.tier}:${index + 1}`,
      knownDeclarations: knownSessionReferenceNames,
    }));
  const runtimeTraces = Object.freeze((input.runtimeTraces ?? []).map((material, index) =>
    otlpTracesContract.assert(material, `Lean relational configuration runtimeTraces[${index}]`) as OtlpTraces));
  const runtimeTraceStatements = Object.freeze(runtimeTraces.flatMap((trace) => statementsFromOtlp(trace)));
  const runtimeTraceBoundaryClaims = [...new Set(runtimeTraceStatements.map((row) => canonicalBytes(row as unknown as JsonValue)))].sort();
  const runtimeTraceObstructions = [...new Set(runtimeTraces.flatMap((trace, index) =>
    statementsFromOtlp(trace).length === 0 ? [`runtime-trace:${index + 1}:no-statement-rows`] : []))].sort();
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
  const agentSessionConflicts = [...new Set(agentSessionContinuations.flatMap((continuation) => [...continuation.conflicts]))].sort();
  const agentSessionMissing = [...new Set(agentSessionStatusReadouts.flatMap((cut) => [...cut.missing]))].sort();
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
  const blueprintLeanDeclarations = [...new Set(blueprintClaimGraph?.nodes.flatMap((node) => [...node.leanDeclarations]) ?? [])].sort();
  const blueprintMissingLeanDeclarations = [...new Set(blueprintLeanDeclarations.filter((declaration) => !leanDeclarationNames.has(declaration)))].sort();
  const blueprintUnprovedLeanDeclarations = [...new Set(blueprintClaimGraph?.nodes
    .filter((node) => node.status === "settled")
    .flatMap((node) => node.leanDeclarations.filter((declaration) =>
      theoremProofStatus.has(declaration) && theoremProofStatus.get(declaration) !== "proved")) ?? [])].sort();
  const blueprintNodeIds = blueprintClaimGraph === undefined
    ? undefined
    : new Set(blueprintClaimGraph.nodes.map((node) => node.id));
  const versoMissingLeanDeclarations = [...new Set([
    ...(versoExpositionWeldReport?.missingLeanDeclarations ?? []),
    ...(versoExpositionWeldReport?.leanDeclarations.filter((declaration) => !leanDeclarationNames.has(declaration)) ?? []),
  ])].sort();
  const versoMissingBlueprintNodes = [...new Set([
    ...(versoExpositionWeldReport?.missingBlueprintNodes ?? []),
    ...(blueprintNodeIds === undefined
      ? []
      : versoExpositionWeldReport?.blueprintNodes.filter((node) => !blueprintNodeIds.has(node)) ?? []),
  ])].sort();
  const documentFiberMissing = [...new Set([
    ...(blueprintClaimGraph?.missingDependencies ?? []).map((dependency) => `blueprint-dependency:${dependency}`),
    ...blueprintMissingLeanDeclarations.map((declaration) => `blueprint-lean:${declaration}`),
    ...blueprintUnprovedLeanDeclarations.map((declaration) => `blueprint-unproved:${declaration}`),
    ...versoMissingLeanDeclarations.map((declaration) => `verso-lean:${declaration}`),
    ...versoMissingBlueprintNodes.map((node) => `verso-blueprint:${node}`),
    ...(versoExpositionWeldReport !== undefined && versoExpositionWeldReport.blueprintNodes.length > 0 && blueprintClaimGraph === undefined
      ? ["verso-blueprint-graph:missing"]
      : []),
  ])].sort();
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
  return `${continuation.sessionId ?? ""} ${continuation.source}`;
}

function statusCutKey(cut: AgentStatusReadout): string {
  return `${cut.sessionId ?? ""} ${cut.continuation.source}`;
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
