
/**
 * @packageDocumentation
 *
 * operations/lsp — the LSP projection module: hover, definition, references, and
 * diagnostics over whatever operation family the serving apex binds it to.
 *
 * @metroplatSubject lsp
 */

import { utteranceSchemaContract } from "@red-cup-engineering/relating/carriers/schema";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { projectSurface } from "@red-cup-engineering/metroplat/presentation/surface";
import {
  lspRequestEnvelopeContract,
  lspResponseEnvelopeContract,

} from "@red-cup-engineering/computer-networking-engineering-services-section/lsp/codec";
import { projectLsp } from "@red-cup-engineering/metroplat/lsp/bind";

import {
  leanDeclarationIndexContract,
  leanFormalizationClaimContract,
  leanTheoremReferenceIndexContract,

} from "@red-cup-engineering/lean-system-services-section/schema";
import { agentEventChronicleContract } from "@red-cup-engineering/computer-networking-engineering-services-section/otlp-schema";
import {
  accountableTransactionContract,

} from "@red-cup-engineering/farolfi/accountable-transaction/codec";
import {
  otlpTracesContract,

} from "@red-cup-engineering/computer-networking-engineering-services-section/otlp";
import { dataArtifactSchemaContractMaterial } from "@red-cup-engineering/computer-system-engine/journal/data-artifact-schema";

function recordValue(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value
    : undefined;
}

function contextArray(record, field) {
  const value = record[field];
  return Array.isArray(value) ? value : [];
}

function markdownDocumentContext(entry, index) {
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

function lspProjectionContextOptions(request)

 {
  const params = recordValue(request.params);
  const context = params === undefined ? undefined : recordValue(params["projectionContext"]);
  if (context === undefined) return Object.freeze({});
  return Object.freeze({
    utterances: contextArray(context, "utterances").map((entry, index) =>
      utteranceSchemaContract.assert(entry, `metroplat-lsp projectionContext.utterances[${index}]`)),
    leanFormalizationClaims: contextArray(context, "leanFormalizationClaims").map((entry, index) =>
      leanFormalizationClaimContract.assert(entry, `metroplat-lsp projectionContext.leanFormalizationClaims[${index}]`)),
    leanDeclarationIndexes: contextArray(context, "leanDeclarationIndexes").map((entry, index) =>
      leanDeclarationIndexContract.assert(entry, `metroplat-lsp projectionContext.leanDeclarationIndexes[${index}]`)),
    leanTheoremReferenceIndexes: contextArray(context, "leanTheoremReferenceIndexes").map((entry, index) =>
      leanTheoremReferenceIndexContract.assert(entry, `metroplat-lsp projectionContext.leanTheoremReferenceIndexes[${index}]`)),
    openaiChronicles: contextArray(context, "openaiChronicles").map((entry, index) =>
      agentEventChronicleContract.assert(entry, `metroplat-lsp projectionContext.openaiChronicles[${index}]`)),
    accountableTransactions: contextArray(context, "accountableTransactions").map((entry, index) =>
      accountableTransactionContract.assert(entry, `metroplat-lsp projectionContext.accountableTransactions[${index}]`)),
    dataArtifacts: contextArray(context, "dataArtifacts").map((entry, index) =>
      dataArtifactSchemaContractMaterial.assert(entry, `metroplat-lsp projectionContext.dataArtifacts[${index}]`)),
    runtimeTraces: contextArray(context, "runtimeTraces").map((entry, index) =>
      otlpTracesContract.assert(entry, `metroplat-lsp projectionContext.runtimeTraces[${index}]`)),
    markdownDocuments: contextArray(context, "markdownDocuments").map(markdownDocumentContext),
  });
}

/** Bind metroplat-lsp to the same operation family as the apex that serves it. */
export function metroplatLspOperationFor(
  operationFamily,
  options = {},
) {
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
    run: (input) => {
      const request = lspRequestEnvelopeContract.assert(input, "metroplat-lsp input");
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
