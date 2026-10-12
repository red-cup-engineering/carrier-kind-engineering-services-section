
/**
 * @packageDocumentation
 *
 * operations/lsp — the LSP projection module: hover, definition, references, and
 * diagnostics over whatever operation family the serving apex binds it to.
 *
 * @metroplatSubject lsp
 */
import type { UtteranceObject } from "../../lib/records/utterance/index.mts";
import { utteranceSchemaContract } from "../../lib/schema/index.mts";
import {
  operation,
  type Operation,
} from "../../rpc/index.mts";
import {
  projectSurface,
  type PromptDescriptor,
  type ResourceDescriptor,
} from "../../presentation/index.mts";
import {
  lspRequestEnvelopeContract,
  lspResponseEnvelopeContract,
  type LspRequestEnvelope,
} from "./codec.mts";
import { projectLsp } from "./bind.mts";
import type {
  MetroPlatLspOptions,
  LspMarkdownDocument,
} from "./types.mts";
import {
  leanDeclarationIndexContract,
  leanFormalizationClaimContract,
  leanTheoremReferenceIndexContract,
  type LeanDeclarationIndex,
  type LeanFormalizationClaim,
  type LeanTheoremReferenceIndex,
} from "@red-cup-engineering/lean-system-services-section";
import { agentEventChronicleContract } from "../../lib/codecs/json/otlp-schema.mts";
import {
  accountableTransactionContract,
  type AccountableTransaction,
} from "../accountable-transaction/codec.mts";
import {
  otlpTracesContract,
  type OtlpTraces,
} from "../../lib/codecs/json/otlp.mts";
import { dataArtifactSchemaContractMaterial } from "../../lib/schema/data-artifact.mts";
import type { DataArtifactDescriptor } from "../../lib/addressing/index.mts";
import type { AgentEventChronicle } from "../../lib/codecs/json/otlp.mts";

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function contextArray(record: Record<string, unknown>, field: string): readonly unknown[] {
  const value = record[field];
  return Array.isArray(value) ? value : [];
}

function markdownDocumentContext(entry: unknown, index: number): LspMarkdownDocument {
  const value = recordValue(entry);
  if (value === undefined || typeof value["uri"] !== "string" || typeof value["text"] !== "string") {
    throw new TypeError(`metroplat-lsp projectionContext.markdownDocuments[${index}] must carry uri and text strings`);
  }
  return Object.freeze({
    uri: value["uri"],
    text: value["text"],
    ...(typeof value["id"] === "string" ? { id: value["id"] } : {}),
  });
}

function lspProjectionContextOptions(request: LspRequestEnvelope): Pick<
  MetroPlatLspOptions,
  "utterances" | "leanFormalizationClaims" | "leanDeclarationIndexes" | "leanTheoremReferenceIndexes" | "openaiChronicles" | "accountableTransactions" | "dataArtifacts" | "runtimeTraces" | "markdownDocuments"
> {
  const params = recordValue(request.params);
  const context = params === undefined ? undefined : recordValue(params["projectionContext"]);
  if (context === undefined) return Object.freeze({});
  return Object.freeze({
    utterances: contextArray(context, "utterances").map((entry, index) =>
      utteranceSchemaContract.assert(entry, `metroplat-lsp projectionContext.utterances[${index}]`) as UtteranceObject),
    leanFormalizationClaims: contextArray(context, "leanFormalizationClaims").map((entry, index) =>
      leanFormalizationClaimContract.assert(entry, `metroplat-lsp projectionContext.leanFormalizationClaims[${index}]`) as LeanFormalizationClaim),
    leanDeclarationIndexes: contextArray(context, "leanDeclarationIndexes").map((entry, index) =>
      leanDeclarationIndexContract.assert(entry, `metroplat-lsp projectionContext.leanDeclarationIndexes[${index}]`) as LeanDeclarationIndex),
    leanTheoremReferenceIndexes: contextArray(context, "leanTheoremReferenceIndexes").map((entry, index) =>
      leanTheoremReferenceIndexContract.assert(entry, `metroplat-lsp projectionContext.leanTheoremReferenceIndexes[${index}]`) as LeanTheoremReferenceIndex),
    openaiChronicles: contextArray(context, "openaiChronicles").map((entry, index) =>
      agentEventChronicleContract.assert(entry, `metroplat-lsp projectionContext.openaiChronicles[${index}]`) as AgentEventChronicle),
    accountableTransactions: contextArray(context, "accountableTransactions").map((entry, index) =>
      accountableTransactionContract.assert(entry, `metroplat-lsp projectionContext.accountableTransactions[${index}]`) as unknown as AccountableTransaction),
    dataArtifacts: contextArray(context, "dataArtifacts").map((entry, index) =>
      dataArtifactSchemaContractMaterial.assert(entry, `metroplat-lsp projectionContext.dataArtifacts[${index}]`) as DataArtifactDescriptor),
    runtimeTraces: contextArray(context, "runtimeTraces").map((entry, index) =>
      otlpTracesContract.assert(entry, `metroplat-lsp projectionContext.runtimeTraces[${index}]`) as OtlpTraces),
    markdownDocuments: contextArray(context, "markdownDocuments").map(markdownDocumentContext),
  });
}

export interface MetroPlatLspOperationBindingOptions {
  readonly packageName?: string;
  readonly resourceDescriptors?: () => readonly ResourceDescriptor[];
  readonly promptDescriptors?: () => readonly PromptDescriptor[];
}

/** Bind metroplat-lsp to the same operation family as the apex that serves it. */
export function metroplatLspOperationFor(
  operationFamily: () => readonly Operation[],
  options: MetroPlatLspOperationBindingOptions = {},
): Operation {
  const packageName = options.packageName ?? "@red-cup-engineering/metroplat";
  return operation({
    verb: "metroplat-lsp",
    inputFormat: "json",
    outputFormat: "json",
    summary: "Answer MetroPlat LSP requests over the live package schema/operation surface.",
    description: "Domain: metroplat/lsp/request. Codomain: metroplat/lsp/response. This exposes hover, definition, references, and diagnostics over the same schemas and operations that MCP tools/resources publish.",
    domain: lspRequestEnvelopeContract,
    codomain: lspResponseEnvelopeContract,
    relation: "protocol",
    run: (input: unknown): unknown => {
      const request = lspRequestEnvelopeContract.assert(input, "metroplat-lsp input") as LspRequestEnvelope;
      const family = operationFamily();
      const induced = projectSurface(family, {
        packageName,
        deriveSchemaResources: false,
        deriveEndpointProjectionResources: false,
        deriveLspResources: false,
        derivePrompts: false,
      });
      return projectLsp({
        operations: family,
        endpoints: induced.discovery.programs,
        resourceDescriptors: options.resourceDescriptors?.() ?? [],
        promptDescriptors: options.promptDescriptors?.() ?? [],
        ...lspProjectionContextOptions(request),
      }).handle(request);
    },
  });
}
