/**
 * lsp - computing's IN-face reflection protocol.
 *
 * This is the inverse of consuming lsp-mcp from an editor: computing projects a
 * Language Server Protocol surface over the live relating carrier/action graph.
 * Definition, hover, references, and diagnostics are readings of the same
 * carriers and morphisms already registered with relating; there is no second
 * code model hiding behind the protocol.
 */
import { declaredSchemas, schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { realize } from "@red-cup-engineering/json-schema-services-section/realize";
import { printType } from "@red-cup-engineering/relating/typing";
import { coreActions as computingActions } from "./core-actions.mjs";
import { capabilityDecisionCarrier } from "./capability-decision.mjs";
import { capabilityRequestCarrier } from "./capability-request.mjs";
import { computationCarrier } from "./computation.mjs";
import { decisionRequestCarrier, decisionRunCarrier } from "./decision.mjs";
import { workClosureCarrier } from "./work-closure.mjs";
import { workTypeCarrier } from "./work-type.mjs";

export const LSP_JSONRPC_VERSION = "2.0";

export const LSP_METHODS = Object.freeze({
  definition: "textDocument/definition",
  references: "textDocument/references",
  hover: "textDocument/hover",
  diagnostics: "textDocument/diagnostic",
});

export const lspRequestEnvelopeSchema = {
  $id: "computing/lsp/request",
  title: "LspRequestEnvelope",
  description: "A dependency-free JSON-RPC request envelope for the computing LSP projection.",
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
  $id: "computing/lsp/response",
  title: "LspResponseEnvelope",
  description: "A dependency-free JSON-RPC response envelope for the computing LSP projection.",
  type: "object",
  required: ["jsonrpc", "id", "result"],
  additionalProperties: false,
  properties: {
    jsonrpc: { const: LSP_JSONRPC_VERSION },
    id: { type: ["string", "number"] },
    result: {},
  },
};

export const lspRequestEnvelopeCarrier = schemaFrom(lspRequestEnvelopeSchema);
export const lspResponseEnvelopeCarrier = schemaFrom(lspResponseEnvelopeSchema);

const builtinComputingCarriers = Object.freeze([
  computationCarrier,
  capabilityRequestCarrier,
  capabilityDecisionCarrier,
  workClosureCarrier,
  workTypeCarrier,
  decisionRequestCarrier,
  decisionRunCarrier,
  lspRequestEnvelopeCarrier,
  lspResponseEnvelopeCarrier,
]);

function carrierUri(id) {
  return `computing-lsp://carrier/${encodeURIComponent(id)}.schema.json`;
}

function actionUri(verb) {
  return `computing-lsp://action/${encodeURIComponent(verb)}.json`;
}

function carrierDocument(carrier) {
  return Object.freeze({
    kind: "carrier",
    id: carrier.id,
    uri: carrierUri(carrier.id),
    text: `${JSON.stringify(carrier.schema, null, 2)}\n`,
  });
}

function actionDocument(action) {
  const face = Object.freeze({
    kind: action.kind,
    verb: action.verb,
    summary: action.summary,
    description: action.description,
    domain: action.domain?.id,
    codomain: action.codomain?.id,
  });
  return Object.freeze({
    kind: "action",
    id: action.verb,
    uri: actionUri(action.verb),
    text: `${JSON.stringify(face, null, 2)}\n`,
  });
}

function positionAt(text, offset) {
  let line = 0;
  let character = 0;
  for (let i = 0; i < offset; i += 1) {
    if (text[i] === "\n") {
      line += 1;
      character = 0;
    } else {
      character += 1;
    }
  }
  return Object.freeze({ line, character });
}

function offsetAt(text, position) {
  let line = 0;
  let character = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (line === position.line && character === position.character) return i;
    if (text[i] === "\n") {
      line += 1;
      character = 0;
    } else {
      character += 1;
    }
  }
  return text.length;
}

function rangeOfOffset(text, offset, length) {
  return Object.freeze({
    start: positionAt(text, offset),
    end: positionAt(text, offset + length),
  });
}

function rangeOfNeedle(text, needle) {
  const quoted = JSON.stringify(needle);
  const offset = text.indexOf(quoted);
  return rangeOfOffset(text, Math.max(0, offset), offset < 0 ? 0 : quoted.length);
}

function zeroRange() {
  return Object.freeze({
    start: Object.freeze({ line: 0, character: 0 }),
    end: Object.freeze({ line: 0, character: 0 }),
  });
}

function quotedStringAt(text, position) {
  const offset = offsetAt(text, position);
  const lineStart = text.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  const lineEnd = text.indexOf("\n", offset);
  const line = text.slice(lineStart, lineEnd < 0 ? text.length : lineEnd);
  const lineOffset = offset - lineStart;
  const quoted = /"((?:\\.|[^"\\])*)"/g;
  let match;
  while ((match = quoted.exec(line)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (lineOffset < start || lineOffset > end) continue;
    try {
      return JSON.parse(match[0]);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function docstringOf(carrier) {
  const description = carrier.schema["description"];
  if (typeof description === "string") return description;
  const title = carrier.schema["title"];
  return typeof title === "string" ? title : carrier.id;
}

function titleOf(carrier) {
  const title = carrier.schema["title"];
  return typeof title === "string" ? title : carrier.id;
}

function typeFaceOf(carrier) {
  return printType(realize(carrier.schema));
}

function declarationLocation(carrier, docs) {
  const doc = docs.get(carrierUri(carrier.id));
  if (doc === undefined) return Object.freeze({ uri: carrierUri(carrier.id), range: zeroRange() });
  return Object.freeze({ uri: doc.uri, range: rangeOfNeedle(doc.text, carrier.id) });
}

function carrierIdFromUri(uri) {
  const prefix = "computing-lsp://carrier/";
  if (!uri.startsWith(prefix) || !uri.endsWith(".schema.json")) return undefined;
  return decodeURIComponent(uri.slice(prefix.length, -".schema.json".length));
}

function resolveCarrier(
  params,
  carriers,
  docs,
) {
  const doc = docs.get(params.textDocument.uri);
  if (doc !== undefined) {
    const token = quotedStringAt(doc.text, params.position);
    if (token !== undefined && carriers.has(token)) return carriers.get(token);
    if (doc.kind === "carrier") return carriers.get(doc.id);
  }
  const uriId = carrierIdFromUri(params.textDocument.uri);
  return uriId === undefined ? undefined : carriers.get(uriId);
}

function actionUseLocations(carrierId, actions, docs) {
  const locations = [];
  for (const action of actions) {
    const uses = [action.domain?.id, action.codomain?.id];
    if (!uses.includes(carrierId)) continue;
    const doc = docs.get(actionUri(action.verb));
    if (doc === undefined) continue;
    for (const use of uses) {
      if (use !== carrierId) continue;
      locations.push(Object.freeze({ uri: doc.uri, range: rangeOfNeedle(doc.text, carrierId) }));
    }
  }
  return Object.freeze(locations);
}

function diagnosticRangeFromMessage(message) {
  const match = /^\/([^ ]*)/.exec(message);
  if (match === null || match[1] === "") return zeroRange();
  const path = match[1] ?? "";
  const width = path.length;
  return Object.freeze({
    start: Object.freeze({ line: 0, character: 0 }),
    end: Object.freeze({ line: 0, character: width }),
  });
}

function uniqueById(items) {
  const byId = new Map();
  for (const item of items) byId.set(item.id, item);
  return Object.freeze([...byId.values()]);
}

function uniqueActionsByVerb(items) {
  const byVerb = new Map();
  for (const item of items) byVerb.set(item.verb, item);
  return Object.freeze([...byVerb.values()]);
}

export function projectLsp(options = {}) {
  const carriers = uniqueById(options.carriers ?? [...builtinComputingCarriers, ...declaredSchemas()]);
  const actions = uniqueActionsByVerb(options.actions ?? computingActions);
  const documents = Object.freeze([...carriers.map(carrierDocument), ...actions.map(actionDocument)]);
  const carrierById = new Map(carriers.map((carrier) => [carrier.id, carrier]));
  const docByUri = new Map(documents.map((doc) => [doc.uri, doc]));

  const definition = (params) => {
    const carrier = resolveCarrier(params, carrierById, docByUri);
    return carrier === undefined ? null : declarationLocation(carrier, docByUri);
  };

  const hover = (params) => {
    const carrier = resolveCarrier(params, carrierById, docByUri);
    if (carrier === undefined) return null;
    return Object.freeze({
      contents: Object.freeze({
        kind: "markdown",
        value: [
          `**${carrier.id}**`,
          "",
          `Title: ${titleOf(carrier)}`,
          "",
          `FromSchema: \`${typeFaceOf(carrier)}\``,
          "",
          docstringOf(carrier),
        ].join("\n"),
      }),
      range: declarationLocation(carrier, docByUri).range,
    });
  };

  const references = (params) => {
    const carrier = resolveCarrier(params, carrierById, docByUri);
    if (carrier === undefined) return Object.freeze([]);
    const refs = actionUseLocations(carrier.id, actions, docByUri);
    return params.context?.includeDeclaration === true
      ? Object.freeze([declarationLocation(carrier, docByUri), ...refs])
      : refs;
  };

  const diagnostics = (params) => {
    const id = params.carrierId ?? (params.textDocument === undefined ? undefined : carrierIdFromUri(params.textDocument.uri));
    const carrier = id === undefined ? undefined : carrierById.get(id);
    if (carrier === undefined) return Object.freeze([]);
    return Object.freeze(carrier.errors(params.value).map((message) => Object.freeze({
      range: diagnosticRangeFromMessage(message),
      severity: 1,
      source: "@red-cup-engineering/computing/lsp",
      message,
    })));
  };

  const handle = (request) => {
    const params = request.params;
    const result =
      request.method === LSP_METHODS.definition ? definition(params)
        : request.method === LSP_METHODS.references ? references(params)
          : request.method === LSP_METHODS.hover ? hover(params)
            : diagnostics(params);
    return lspResponseEnvelopeCarrier.assert(Object.freeze({
      jsonrpc: LSP_JSONRPC_VERSION,
      id: request.id,
      result,
    }));
  };

  return Object.freeze({ carriers, actions, documents, definition, hover, references, diagnostics, handle });
}

export const computingLspProjection = projectLsp();
