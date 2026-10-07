/**
 * @packageDocumentation
 *
 * Dependency-free JSON-RPC contracts for the stateless LSP face.
 *
 * @metroplatSubject lsp
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

export const LSP_JSONRPC_VERSION = "2.0";

export const LSP_METHODS = Object.freeze({
  definition: "textDocument/definition",
  references: "textDocument/references",
  hover: "textDocument/hover",
  diagnostics: "textDocument/diagnostic",
  formatting: "textDocument/formatting",
  codeAction: "textDocument/codeAction",
  documentSymbol: "textDocument/documentSymbol",
  documentLink: "textDocument/documentLink",
  foldingRange: "textDocument/foldingRange",
  selectionRange: "textDocument/selectionRange",
});

export const lspRequestEnvelopeSchema = {
  $id: "metroplat/lsp/request",
  title: "LspRequestEnvelope",
  description: "A dependency-free JSON-RPC request envelope for the metroplat LSP projection.",
  type: "object",
  required: ["jsonrpc", "id", "method", "params"],
  additionalProperties: false,
  properties: {
    jsonrpc: { const: LSP_JSONRPC_VERSION },
    id: { type: ["string", "number"] },
    method: { enum: Object.values(LSP_METHODS) },
    params: {},
  },
};

export const lspResponseEnvelopeSchema = {
  $id: "metroplat/lsp/response",
  title: "LspResponseEnvelope",
  description: "A dependency-free JSON-RPC response envelope for the metroplat LSP projection.",
  type: "object",
  required: ["jsonrpc", "id", "result"],
  additionalProperties: false,
  properties: {
    jsonrpc: { const: LSP_JSONRPC_VERSION },
    id: { type: ["string", "number"] },
    result: {},
  },
};

export const lspRequestEnvelopeContract = schemaFrom(lspRequestEnvelopeSchema);
export const lspResponseEnvelopeContract = schemaFrom(lspResponseEnvelopeSchema);
