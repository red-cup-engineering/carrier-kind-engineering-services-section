/**
 * @packageDocumentation
 *
 * Stateless LSP face composition over MetroPlat's live operation family.
 *
 * @metroplatSubject lsp
 */
import {
  LSP_JSONRPC_VERSION,
  LSP_METHODS,
  lspResponseEnvelopeContract,

} from "@red-cup-engineering/computer-networking-engineering-services-section/lsp/codec";
import { schemasOfOperations } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { leanTheoremNameFromUtterance } from "@red-cup-engineering/feltos/lean/view";
import {
  markdownCodeActions,
  markdownDiagnostics,
  markdownDocument,
  markdownDocumentLinks,
  markdownDocumentSymbols,
  markdownFoldingRanges,
  markdownFormattingEdits,
  markdownHeadingAt,
  markdownHeadingLocation,
  markdownHover,
  markdownSelectionRanges,
} from "@red-cup-engineering/computer-networking-engineering-services-section/lsp/markdown";
import {
  UTTERANCE_PROJECTION_SURFACES,
  declarationLocation,
  diagnosticRangeFromMessage,
  docstringOf,
  operationDocument,
  operationHover,
  operationLocation,
  operationSchemaUseLocations,
  promptDocument,
  promptHover,
  promptLocation,
  resolveAction,
  resolvePrompt,
  resolveResource,
  resolveSchema,
  resolveUtteranceProjection,
  resourceDocument,
  resourceHover,
  resourceLocation,
  schemaDocument,
  schemaIdFromUri,
  titleOf,
  typeFaceOf,
  uniqueActionsByVerb,
  uniqueById,
  uniqueMarkdownDocumentsByUri,
  uniquePromptsByName,
  uniqueResourcesByUri,
  utteranceProjectionDefinitionLocation,
  utteranceProjectionDocument,
  utteranceProjectionHover,
  utteranceProjectionReferences,
  utteranceProjectionUtterances,
} from "./navigation.mjs";

/** Project schema/action material into an LSP-compatible informational surface. */
export function projectLsp(options = {}) {
  const scheme = options.scheme ?? "metroplat-lsp";
  const operations = uniqueActionsByVerb(options.operations ?? []);
  const schemas = uniqueById(options.schemas ?? schemasOfOperations(operations));
  const resourceDescriptors = uniqueResourcesByUri(options.resourceDescriptors ?? []);
  const promptDescriptors = uniquePromptsByName(options.promptDescriptors ?? []);
  const markdownDocuments = uniqueMarkdownDocumentsByUri(options.markdownDocuments ?? []);
  const endpointByName = new Map((options.endpoints ?? []).map((endpoint) => [endpoint.name, endpoint]));
  const utterances = utteranceProjectionUtterances(options);
  const utteranceProjectionDocuments = utterances.length === 0
    ? []
    : UTTERANCE_PROJECTION_SURFACES.map((surface) => utteranceProjectionDocument(surface, utterances, scheme));
  const documents = Object.freeze([
    ...schemas.map((schema) => schemaDocument(schema, scheme)),
    ...operations.map((act) => operationDocument(act, scheme, endpointByName.get(act.verb))),
    ...resourceDescriptors.map((descriptor) => resourceDocument(descriptor, scheme)),
    ...promptDescriptors.map((descriptor) => promptDocument(descriptor, scheme)),
    ...markdownDocuments.map((document) => markdownDocument(document)),
    ...utteranceProjectionDocuments,
  ]);
  const schemaById = new Map(schemas.map((schema) => [schema.id, schema]));
  const operationByVerb = new Map(operations.map((act) => [act.verb, act]));
  const resourceByUri = new Map(resourceDescriptors.map((descriptor) => [descriptor.uri, descriptor]));
  const promptByName = new Map(promptDescriptors.map((descriptor) => [descriptor.name, descriptor]));
  const docByUri = new Map(documents.map((doc) => [doc.uri, doc]));
  const utteranceByTheorem = new Map(utterances.map((utteranceValue) => [leanTheoremNameFromUtterance(utteranceValue), utteranceValue]));

  const definition = (params) => {
    const doc = docByUri.get(params.textDocument.uri);
    if (doc?.kind === "markdown") {
      const heading = markdownHeadingAt(doc, params.position);
      return heading === undefined ? null : markdownHeadingLocation(doc, heading);
    }
    const schema = resolveSchema(params, schemaById, docByUri, scheme);
    if (schema !== undefined) return declarationLocation(schema, docByUri, scheme);
    const resource = resolveResource(params, resourceByUri, docByUri, scheme);
    if (resource !== undefined) return resourceLocation(resource, docByUri, scheme);
    const prompt = resolvePrompt(params, promptByName, docByUri, scheme);
    if (prompt !== undefined) return promptLocation(prompt, docByUri, scheme);
    const utteranceProjection = resolveUtteranceProjection(params, utteranceByTheorem, docByUri, scheme);
    if (utteranceProjection !== undefined) return utteranceProjectionDefinitionLocation(utteranceProjection, docByUri, scheme);
    const act = resolveAction(params, operationByVerb, docByUri, scheme);
    return act === undefined ? null : operationLocation(act, docByUri, scheme);
  };

  const hover = (params) => {
    const doc = docByUri.get(params.textDocument.uri);
    if (doc?.kind === "markdown") return markdownHover(doc, params);
    const schema = resolveSchema(params, schemaById, docByUri, scheme);
    if (schema === undefined) {
      const resource = resolveResource(params, resourceByUri, docByUri, scheme);
      if (resource !== undefined) return resourceHover(resource, docByUri, scheme);
      const prompt = resolvePrompt(params, promptByName, docByUri, scheme);
      if (prompt !== undefined) return promptHover(prompt, docByUri, scheme);
      const utteranceProjection = resolveUtteranceProjection(params, utteranceByTheorem, docByUri, scheme);
      if (utteranceProjection !== undefined) return utteranceProjectionHover(utteranceProjection, docByUri, scheme);
      const act = resolveAction(params, operationByVerb, docByUri, scheme);
      return act === undefined ? null : operationHover(act, endpointByName.get(act.verb), docByUri, scheme);
    }
    return Object.freeze({
      contents: Object.freeze({
        kind: "markdown",
        value: [
          `**${schema.id}**`,
          "",
          `Title: ${titleOf(schema)}`,
          "",
          `FromSchema: \`${typeFaceOf(schema)}\``,
          "",
          docstringOf(schema),
        ].join("\n"),
      }),
      range: declarationLocation(schema, docByUri, scheme).range,
    });
  };

  const references = (params) => {
    const doc = docByUri.get(params.textDocument.uri);
    if (doc?.kind === "markdown") {
      const heading = markdownHeadingAt(doc, params.position);
      return heading === undefined ? Object.freeze([]) : Object.freeze([markdownHeadingLocation(doc, heading)]);
    }
    const schema = resolveSchema(params, schemaById, docByUri, scheme);
    if (schema === undefined) {
      const resource = resolveResource(params, resourceByUri, docByUri, scheme);
      if (resource !== undefined) return Object.freeze([resourceLocation(resource, docByUri, scheme)]);
      const prompt = resolvePrompt(params, promptByName, docByUri, scheme);
      if (prompt !== undefined) return Object.freeze([promptLocation(prompt, docByUri, scheme)]);
      const utteranceProjection = resolveUtteranceProjection(params, utteranceByTheorem, docByUri, scheme);
      if (utteranceProjection !== undefined) return utteranceProjectionReferences(utteranceProjection, docByUri, scheme);
      const act = resolveAction(params, operationByVerb, docByUri, scheme);
      return act === undefined ? Object.freeze([]) : Object.freeze([operationLocation(act, docByUri, scheme)]);
    }
    const refs = operationSchemaUseLocations(schema.id, operations, docByUri, scheme);
    return params.context?.includeDeclaration === true
      ? Object.freeze([declarationLocation(schema, docByUri, scheme), ...refs])
      : refs;
  };

  const diagnostics = (params) => {
    const doc = params.textDocument === undefined ? undefined : docByUri.get(params.textDocument.uri);
    if (doc?.kind === "markdown") return markdownDiagnostics(doc);
    if (doc?.kind === "utterance-projection") return Object.freeze([]);
    const id = params.schemaId ?? (params.textDocument === undefined ? undefined : schemaIdFromUri(params.textDocument.uri, scheme));
    const schema = id === undefined ? undefined : schemaById.get(id);
    if (schema === undefined) return Object.freeze([]);
    return Object.freeze(schema.errors(params.value).map((message) => Object.freeze({
      range: diagnosticRangeFromMessage(message),
      severity: 1,
      source: "@red-cup-engineering/metroplat/lsp",
      message,
    })));
  };

  const formatting = (params) => {
    const doc = docByUri.get(params.textDocument.uri);
    return doc?.kind === "markdown" ? markdownFormattingEdits(doc) : Object.freeze([]);
  };

  const codeAction = (params) => {
    const doc = docByUri.get(params.textDocument.uri);
    return doc?.kind === "markdown" ? markdownCodeActions(doc, params) : Object.freeze([]);
  };

  const documentSymbol = (params) => {
    const doc = docByUri.get(params.textDocument.uri);
    return doc?.kind === "markdown" ? markdownDocumentSymbols(doc) : Object.freeze([]);
  };

  const documentLink = (params) => {
    const doc = docByUri.get(params.textDocument.uri);
    return doc?.kind === "markdown" ? markdownDocumentLinks(doc) : Object.freeze([]);
  };

  const foldingRange = (params) => {
    const doc = docByUri.get(params.textDocument.uri);
    return doc?.kind === "markdown" ? markdownFoldingRanges(doc) : Object.freeze([]);
  };

  const selectionRange = (params) => {
    const doc = docByUri.get(params.textDocument.uri);
    return doc?.kind === "markdown" ? markdownSelectionRanges(doc, params) : Object.freeze([]);
  };

  const handle = (request) => {
    const params = request.params;
    const result =
      request.method === LSP_METHODS.definition ? definition(params)
        : request.method === LSP_METHODS.references ? references(params)
          : request.method === LSP_METHODS.hover ? hover(params)
            : request.method === LSP_METHODS.formatting ? formatting(params)
              : request.method === LSP_METHODS.codeAction ? codeAction(params)
                : request.method === LSP_METHODS.documentSymbol ? documentSymbol(params)
                  : request.method === LSP_METHODS.documentLink ? documentLink(params)
                    : request.method === LSP_METHODS.foldingRange ? foldingRange(params)
                      : request.method === LSP_METHODS.selectionRange ? selectionRange(params)
                        : diagnostics(params);
    return lspResponseEnvelopeContract.assert(Object.freeze({
      jsonrpc: LSP_JSONRPC_VERSION,
      id: request.id,
      result,
    }));
  };

  return Object.freeze({
    schemas,
    operations,
    documents,
    definition,
    hover,
    references,
    diagnostics,
    formatting,
    codeAction,
    documentSymbol,
    documentLink,
    foldingRange,
    selectionRange,
    handle,
  });
}

export const metroplatLspProjection = projectLsp();
