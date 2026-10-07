/**
 * @packageDocumentation
 *
 * Virtual-document construction and semantic navigation for the LSP face.
 *
 * @metroplatSubject lsp
 */

import { realize } from "@red-cup-engineering/json-schema-services-section/realize";
import {
  leanDeclarationIndexFromUtterances,
  leanFormalizationClaimsFromUtterances,
  leanProjectionContextFromUtterance,
  leanTheoremNameFromUtterance,
  leanTheoremReferencesFromAccountableTransaction,
  leanTheoremReferencesFromOtlpTrace,
  leanTheoremReferencesFromOpenAIChronicle,
  leanTheoremReferencesFromDataArtifact,
  leanTheoremReferencesFromUtterances,
  utteranceFromLeanFormalizationClaim,
  utterancesFromLeanDeclarationIndex,
  utterancesFromLeanTheoremReferences,
} from "@red-cup-engineering/feltos/lean/view";
import { leanTheoremReferencesFromText } from "@red-cup-engineering/lean-system-services-section/view";

import { parse as parseJson } from "@red-cup-engineering/json-services-section";

import { printType } from "@red-cup-engineering/relating/typing";
import { offsetAt, rangeOfNeedle, zeroRange } from "@red-cup-engineering/computer-networking-engineering-services-section/lsp/text.domain";
export { operationDocument, promptDocument, resourceDocument, schemaDocument, uniqueActionsByVerb, uniqueById, uniquePromptsByName, uniqueResourcesByUri } from "./documents.mjs";
import { operationDocument, promptDocument, resourceDocument, schemaDocument } from "./documents.mjs";

function schemaUri(id, scheme) {
  return `${scheme}://schema/${encodeURIComponent(id)}.schema.json`;
}

export const UTTERANCE_PROJECTION_SURFACES = Object.freeze([
  "lean-formalization-claims",
  "blueprint-declaration-index",
  "verso-theorem-references",
]);

function utteranceProjectionUri(surface, scheme) {
  return `${scheme}://utterance-projection/${encodeURIComponent(surface)}.json`;
}

export function utteranceProjectionDocument(
  surface,
  utterances,
  scheme,
) {
  const projection =
    surface === "lean-formalization-claims"
      ? leanFormalizationClaimsFromUtterances(utterances)
      : surface === "blueprint-declaration-index"
        ? leanDeclarationIndexFromUtterances(utterances)
        : leanTheoremReferencesFromUtterances(utterances);
  const face = Object.freeze({
    kind: "metroplat.utterance.projection",
    surface,
    schema: "metroplat/articulation/utterance",
    projection,
    material: Object.freeze(utterances.map((utteranceValue) => Object.freeze({
      theorem: leanTheoremNameFromUtterance(utteranceValue),
      claim: leanProjectionContextFromUtterance(utteranceValue),
      utterance: utteranceValue,
    }))),
  });
  return Object.freeze({
    kind: "utterance-projection",
    id: surface,
    uri: utteranceProjectionUri(surface, scheme),
    text: `${JSON.stringify(face, null, 2)}\n`,
  });
}

function quotedStringAt(text, position) {
  const offset = offsetAt(text, position);
  const lineStart = text.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  const lineEnd = text.indexOf("\n", offset);
  const line = text.slice(lineStart, lineEnd < 0 ? text.length : lineEnd);
  const lineOffset = offset - lineStart;
  const quoted = /"((?:\\.|[^"\\])*)"/gu;
  let match;
  while ((match = quoted.exec(line)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (lineOffset < start || lineOffset > end) continue;
    try {
      const value = parseJson(match[0]);
      return typeof value === "string" ? value : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function docstringOf(schema) {
  const description = schema.schema["description"];
  if (typeof description === "string") return description;
  const title = schema.schema["title"];
  return typeof title === "string" ? title : schema.id;
}

export function titleOf(schema) {
  const title = schema.schema["title"];
  return typeof title === "string" ? title : schema.id;
}

export function typeFaceOf(schema) {
  return printType(realize(schema.schema));
}

export function declarationLocation(schema, docs, scheme) {
  const doc = docs.get(schemaUri(schema.id, scheme));
  if (doc === undefined) return Object.freeze({ uri: schemaUri(schema.id, scheme), range: zeroRange() });
  return Object.freeze({ uri: doc.uri, range: rangeOfNeedle(doc.text, schema.id) });
}

export function operationLocation(action, docs, scheme) {
  const doc = docs.get(operationUri(action.verb, scheme));
  if (doc === undefined) return Object.freeze({ uri: operationUri(action.verb, scheme), range: zeroRange() });
  return Object.freeze({ uri: doc.uri, range: rangeOfNeedle(doc.text, action.verb) });
}

export function resourceLocation(descriptor, docs, scheme) {
  const uri = resourceUri(descriptor.uri, scheme);
  const doc = docs.get(uri);
  if (doc === undefined) return Object.freeze({ uri, range: zeroRange() });
  return Object.freeze({ uri: doc.uri, range: rangeOfNeedle(doc.text, descriptor.uri) });
}

export function promptLocation(descriptor, docs, scheme) {
  const uri = promptUri(descriptor.name, scheme);
  const doc = docs.get(uri);
  if (doc === undefined) return Object.freeze({ uri, range: zeroRange() });
  return Object.freeze({ uri: doc.uri, range: rangeOfNeedle(doc.text, descriptor.name) });
}

export function schemaIdFromUri(uri, scheme) {
  const prefix = `${scheme}://schema/`;
  if (!uri.startsWith(prefix) || !uri.endsWith(".schema.json")) return undefined;
  return decodeURIComponent(uri.slice(prefix.length, -".schema.json".length));
}

function operationIdFromUri(uri, scheme) {
  const prefix = `${scheme}://action/`;
  if (!uri.startsWith(prefix) || !uri.endsWith(".json")) return undefined;
  return decodeURIComponent(uri.slice(prefix.length, -".json".length));
}

function resourceIdFromUri(uri, scheme) {
  const prefix = `${scheme}://resource/`;
  if (!uri.startsWith(prefix) || !uri.endsWith(".json")) return undefined;
  return decodeURIComponent(uri.slice(prefix.length, -".json".length));
}

function promptIdFromUri(uri, scheme) {
  const prefix = `${scheme}://prompt/`;
  if (!uri.startsWith(prefix) || !uri.endsWith(".json")) return undefined;
  return decodeURIComponent(uri.slice(prefix.length, -".json".length));
}

export function resolveSchema(
  params,
  schemas,
  docs,
  scheme,
) {
  const doc = docs.get(params.textDocument.uri);
  if (doc !== undefined) {
    const token = quotedStringAt(doc.text, params.position);
    if (token !== undefined && schemas.has(token)) return schemas.get(token);
    if (doc.kind === "schema") return schemas.get(doc.id);
  }
  const uriId = schemaIdFromUri(params.textDocument.uri, scheme);
  return uriId === undefined ? undefined : schemas.get(uriId);
}

export function resolveAction(
  params,
  operations,
  docs,
  scheme,
) {
  const doc = docs.get(params.textDocument.uri);
  if (doc !== undefined) {
    const token = quotedStringAt(doc.text, params.position);
    if (token !== undefined && operations.has(token)) return operations.get(token);
    if (doc.kind === "action") return operations.get(doc.id);
  }
  const uriId = operationIdFromUri(params.textDocument.uri, scheme);
  return uriId === undefined ? undefined : operations.get(uriId);
}

export function resolveResource(
  params,
  resources,
  docs,
  scheme,
) {
  const doc = docs.get(params.textDocument.uri);
  if (doc !== undefined) {
    const token = quotedStringAt(doc.text, params.position);
    if (token !== undefined && resources.has(token)) return resources.get(token);
    if (doc.kind === "resource") return resources.get(doc.id);
  }
  const uriId = resourceIdFromUri(params.textDocument.uri, scheme);
  return uriId === undefined ? undefined : resources.get(uriId);
}

export function resolvePrompt(
  params,
  prompts,
  docs,
  scheme,
) {
  const doc = docs.get(params.textDocument.uri);
  if (doc !== undefined) {
    const token = quotedStringAt(doc.text, params.position);
    if (doc.kind === "prompt") return prompts.get(doc.id);
    if (doc.kind !== "action" && token !== undefined && prompts.has(token)) return prompts.get(token);
  }
  const uriId = promptIdFromUri(params.textDocument.uri, scheme);
  return uriId === undefined ? undefined : prompts.get(uriId);
}

function utteranceProjectionSurfaceFromUri(uri, scheme) {
  const prefix = `${scheme}://utterance-projection/`;
  if (!uri.startsWith(prefix) || !uri.endsWith(".json")) return undefined;
  const value = decodeURIComponent(uri.slice(prefix.length, -".json".length));
  return UTTERANCE_PROJECTION_SURFACES.includes(value)
    ? value
    : undefined;
}

export function resolveUtteranceProjection(
  params,
  utteranceByTheorem,
  docs,
  scheme,
) {
  const doc = docs.get(params.textDocument.uri);
  const surface = utteranceProjectionSurfaceFromUri(params.textDocument.uri, scheme);
  if (doc?.kind !== "utterance-projection" || surface === undefined) return undefined;
  const token = quotedStringAt(doc.text, params.position);
  if (token === undefined) return undefined;
  return utteranceByTheorem.get(token);
}

export function operationSchemaUseLocations(
  schemaId,
  operations,
  docs,
  scheme,
) {
  const locations = [];
  for (const action of operations) {
    const uses = [action.domain?.id, action.codomain?.id];
    if (!uses.includes(schemaId)) continue;
    const doc = docs.get(operationUri(action.verb, scheme));
    if (doc === undefined) continue;
    for (const use of uses) {
      if (use !== schemaId) continue;
      locations.push(Object.freeze({ uri: doc.uri, range: rangeOfNeedle(doc.text, schemaId) }));
    }
  }
  return Object.freeze(locations);
}

function utteranceProjectionLocation(
  theorem,
  surface,
  docs,
  scheme,
) {
  const uri = utteranceProjectionUri(surface, scheme);
  const doc = docs.get(uri);
  return Object.freeze({
    uri,
    range: doc === undefined ? zeroRange() : rangeOfNeedle(doc.text, theorem),
  });
}

export function utteranceProjectionDefinitionLocation(
  utteranceValue,
  docs,
  scheme,
) {
  return utteranceProjectionLocation(leanTheoremNameFromUtterance(utteranceValue), "lean-formalization-claims", docs, scheme);
}

export function utteranceProjectionReferences(
  utteranceValue,
  docs,
  scheme,
) {
  const theorem = leanTheoremNameFromUtterance(utteranceValue);
  return Object.freeze(UTTERANCE_PROJECTION_SURFACES.map((surface) =>
    utteranceProjectionLocation(theorem, surface, docs, scheme)));
}

export function utteranceProjectionHover(utteranceValue, docs, scheme) {
  const theorem = leanTheoremNameFromUtterance(utteranceValue);
  return Object.freeze({
    contents: Object.freeze({
      kind: "markdown",
      value: [
        `**${theorem}**`,
        "",
        "Utterance schema: `metroplat/articulation/utterance`",
        "",
        `Token mark: ${theorem}`,
        "",
        `Claim mark: ${leanProjectionContextFromUtterance(utteranceValue)}`,
        "",
        `Realizations: ${UTTERANCE_PROJECTION_SURFACES.join(", ")}`,
      ].join("\n"),
    }),
    range: utteranceProjectionDefinitionLocation(utteranceValue, docs, scheme)?.range ?? zeroRange(),
  });
}

export function operationHover(
  action,
  endpoint,
  docs,
  scheme,
) {
  return Object.freeze({
    contents: Object.freeze({
      kind: "markdown",
      value: [
        `**${action.verb}**`,
        "",
        action.summary === undefined ? "Operation" : action.summary,
        "",
        ...(action.description === undefined ? [] : [action.description, ""]),
        `Domain: ${action.domain?.id ?? `wire:${action.inputFormat}`}`,
        "",
        `Codomain: ${action.codomain?.id ?? `wire:${action.outputFormat}`}`,
        "",
        ...(endpoint === undefined ? [] : [
          `Endpoint: ${endpoint.method} ${endpoint.href}`,
          "",
          `Settlement: ${endpoint.settlement.regime} / ${endpoint.settlement.transport} / ${endpoint.settlement.finality}`,
          "",
          `Contract: ${endpoint.contract.contract.id}`,
          "",
          `Standing: ${endpoint.contract.reading} (price ${endpoint.contract.price})`,
          "",
          `Coordination: ${endpoint.contract.contract.coordination.mode}`,
          "",
          `Laws: ${endpoint.contract.contract.laws.map((law) => law.theorem).join(", ")}`,
        ]),
      ].join("\n"),
    }),
    range: operationLocation(action, docs, scheme).range,
  });
}

export function resourceHover(
  descriptor,
  docs,
  scheme,
) {
  return Object.freeze({
    contents: Object.freeze({
      kind: "markdown",
      value: [
        `**${descriptor.name}**`,
        "",
        `Resource: ${descriptor.uri}`,
        "",
        `Media type: ${descriptor.mimeType}`,
        "",
        ...(descriptor.description === undefined ? [] : [descriptor.description, ""]),
        `Contract: (see catalog)`,
      ].join("\n"),
    }),
    range: resourceLocation(descriptor, docs, scheme).range,
  });
}

export function promptHover(
  descriptor,
  docs,
  scheme,
) {
  return Object.freeze({
    contents: Object.freeze({
      kind: "markdown",
      value: [
        `**${descriptor.name}**`,
        "",
        "Prompt",
        "",
        ...(descriptor.description === undefined ? [] : [descriptor.description, ""]),
        `Arguments: ${descriptor.arguments.map((arg) => arg.name).join(", ") || "(none)"}`,
        "",
        `Contract: (see catalog)`,
      ].join("\n"),
    }),
    range: promptLocation(descriptor, docs, scheme).range,
  });
}

export function diagnosticRangeFromMessage(message) {
  const match = /^\/([^ ]*)/u.exec(message);
  if (match === null || match[1] === "") return zeroRange();
  const width = match[1]?.length ?? 0;
  return Object.freeze({
    start: Object.freeze({ line: 0, character: 0 }),
    end: Object.freeze({ line: 0, character: width }),
  });
}

export function uniqueMarkdownDocumentsByUri(items) {
  const byUri = new Map();
  for (const item of items) byUri.set(item.uri, item);
  return Object.freeze([...byUri.values()]);
}

export function utteranceProjectionUtterances(options) {
  const knownDeclarations = [...new Set([
    ...(options.utterances ?? []).map((utteranceValue) => leanTheoremNameFromUtterance(utteranceValue)),
    ...(options.leanFormalizationClaims ?? []).map((claim) => claim.theorem),
    ...(options.leanDeclarationIndexes ?? []).flatMap((index) => index.declarations),
    ...(options.leanTheoremReferenceIndexes ?? []).flatMap((index) => index.references.map((reference) => reference.theorem)),
  ])].sort();
  const openaiTheoremReferenceIndexes = (options.openaiChronicles ?? []).map((chronicle) =>
    leanTheoremReferencesFromOpenAIChronicle(chronicle, { knownDeclarations }));
  const accountableTransactionTheoremReferenceIndexes = (options.accountableTransactions ?? []).map((transaction, index) =>
    leanTheoremReferencesFromAccountableTransaction(transaction, {
      source: `accountable-transaction:${transaction.id ?? index + 1}`,
      knownDeclarations,
    }));
  const artifactTheoremReferenceIndexes = (options.dataArtifacts ?? []).map((artifact, index) =>
    leanTheoremReferencesFromDataArtifact(artifact, {
      source: `data-artifact:${artifact.tier}:${index + 1}`,
      knownDeclarations,
    }));
  const runtimeTraceTheoremReferenceIndexes = (options.runtimeTraces ?? []).map((trace, index) =>
    leanTheoremReferencesFromOtlpTrace(trace, {
      source: `runtime-trace:${index + 1}`,
      knownDeclarations,
    }));
  return Object.freeze([
    ...(options.utterances ?? []),
    ...(options.leanFormalizationClaims ?? []).map((claim) => utteranceFromLeanFormalizationClaim(claim)),
    ...(options.leanDeclarationIndexes ?? []).flatMap((index) => utterancesFromLeanDeclarationIndex(index)),
    ...(options.leanTheoremReferenceIndexes ?? []).flatMap((index) => utterancesFromLeanTheoremReferences(index)),
    ...openaiTheoremReferenceIndexes.flatMap((index) => utterancesFromLeanTheoremReferences(index)),
    ...accountableTransactionTheoremReferenceIndexes.flatMap((index) => utterancesFromLeanTheoremReferences(index)),
    ...artifactTheoremReferenceIndexes.flatMap((index) => utterancesFromLeanTheoremReferences(index)),
    ...runtimeTraceTheoremReferenceIndexes.flatMap((index) => utterancesFromLeanTheoremReferences(index)),
  ]);
}
