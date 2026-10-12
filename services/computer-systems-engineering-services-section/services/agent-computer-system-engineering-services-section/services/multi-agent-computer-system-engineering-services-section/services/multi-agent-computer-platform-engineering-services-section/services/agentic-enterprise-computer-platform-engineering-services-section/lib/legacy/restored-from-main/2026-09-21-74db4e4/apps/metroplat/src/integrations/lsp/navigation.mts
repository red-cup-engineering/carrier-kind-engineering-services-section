/**
 * @packageDocumentation
 *
 * Virtual-document construction and semantic navigation for the LSP face.
 *
 * @metroplatSubject lsp
 */
import type { SchemaContract } from "../../lib/schema/index.mts";
import { realize } from "../../lib/schema/realize.mts";
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
} from "../lean/view.mts";
import { leanTheoremReferencesFromText } from "@red-cup-engineering/lean-system-services-section";
import type { Operation } from "../../rpc/index.mts";
import type { ProgramEndpoint } from "../../presentation/surface.mts";
import type { PromptDescriptor } from "../../presentation/prompt.mts";
import type { ResourceDescriptor } from "../../presentation/resources.mts";
import { parse as parseJson } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { UtteranceObject } from "../../lib/records/utterance/index.mts";
import { printType } from "../../lib/codecs/typescript/index.mts";
import { offsetAt, rangeOfNeedle, zeroRange } from "./text.domain.mts";
import type {
  MetroPlatLspOptions,
  LspHover,
  LspLocation,
  LspMarkdownDocument,
  LspPosition,
  LspRange,
  LspVirtualDocument,
  ReferenceParams,
  TextDocumentPositionParams,
} from "./types.mts";

function schemaUri(id: string, scheme: string): string {
  return `${scheme}://schema/${encodeURIComponent(id)}.schema.json`;
}

function operationUri(verb: string, scheme: string): string {
  return `${scheme}://action/${encodeURIComponent(verb)}.json`;
}

function resourceUri(uri: string, scheme: string): string {
  return `${scheme}://resource/${encodeURIComponent(uri)}.json`;
}

function promptUri(name: string, scheme: string): string {
  return `${scheme}://prompt/${encodeURIComponent(name)}.json`;
}

export const UTTERANCE_PROJECTION_SURFACES = Object.freeze([
  "lean-formalization-claims",
  "blueprint-declaration-index",
  "verso-theorem-references",
] as const);

export type UtteranceProjectionSurface = typeof UTTERANCE_PROJECTION_SURFACES[number];

function utteranceProjectionUri(surface: UtteranceProjectionSurface, scheme: string): string {
  return `${scheme}://utterance-projection/${encodeURIComponent(surface)}.json`;
}

export function schemaDocument(schema: SchemaContract, scheme: string): LspVirtualDocument {
  return Object.freeze({
    kind: "schema" as const,
    id: schema.id,
    uri: schemaUri(schema.id, scheme),
    text: `${JSON.stringify(schema.schema, null, 2)}\n`,
  });
}

export function operationDocument(
  action: Operation,
  scheme: string,
  endpoint?: ProgramEndpoint,
): LspVirtualDocument {
  const face = Object.freeze({
    kind: action.kind,
    verb: action.verb,
    summary: action.summary,
    description: action.description,
    domain: action.domain?.id,
    codomain: action.codomain?.id,
    inputFormat: action.inputFormat,
    outputFormat: action.outputFormat,
    ...(endpoint === undefined ? {} : {
      endpoint: Object.freeze({
        name: endpoint.name,
        href: endpoint.href,
        method: endpoint.method,
        input: endpoint.input,
        output: endpoint.output,
        settlement: endpoint.settlement,
        contract: endpoint.contract,
      }),
    }),
  });
  return Object.freeze({
    kind: "action" as const,
    id: action.verb,
    uri: operationUri(action.verb, scheme),
    text: `${JSON.stringify(face, null, 2)}\n`,
  });
}

export function resourceDocument(descriptor: ResourceDescriptor, scheme: string): LspVirtualDocument {
  const face = Object.freeze({
    kind: "metroplat.resource.descriptor" as const,
    uri: descriptor.uri,
    name: descriptor.name,
    mimeType: descriptor.mimeType,
    ...(descriptor.description === undefined ? {} : { description: descriptor.description }),
  });
  return Object.freeze({
    kind: "resource" as const,
    id: descriptor.uri,
    uri: resourceUri(descriptor.uri, scheme),
    text: `${JSON.stringify(face, null, 2)}\n`,
  });
}

export function promptDocument(descriptor: PromptDescriptor, scheme: string): LspVirtualDocument {
  const face = Object.freeze({
    kind: "metroplat.prompt.descriptor" as const,
    name: descriptor.name,
    ...(descriptor.description === undefined ? {} : { description: descriptor.description }),
    arguments: descriptor.arguments,
  });
  return Object.freeze({
    kind: "prompt" as const,
    id: descriptor.name,
    uri: promptUri(descriptor.name, scheme),
    text: `${JSON.stringify(face, null, 2)}\n`,
  });
}

export function utteranceProjectionDocument(
  surface: UtteranceProjectionSurface,
  utterances: readonly UtteranceObject[],
  scheme: string,
): LspVirtualDocument {
  const projection =
    surface === "lean-formalization-claims"
      ? leanFormalizationClaimsFromUtterances(utterances)
      : surface === "blueprint-declaration-index"
        ? leanDeclarationIndexFromUtterances(utterances)
        : leanTheoremReferencesFromUtterances(utterances);
  const face = Object.freeze({
    kind: "metroplat.utterance.projection" as const,
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
    kind: "utterance-projection" as const,
    id: surface,
    uri: utteranceProjectionUri(surface, scheme),
    text: `${JSON.stringify(face, null, 2)}\n`,
  });
}

function quotedStringAt(text: string, position: LspPosition): string | undefined {
  const offset = offsetAt(text, position);
  const lineStart = text.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  const lineEnd = text.indexOf("\n", offset);
  const line = text.slice(lineStart, lineEnd < 0 ? text.length : lineEnd);
  const lineOffset = offset - lineStart;
  const quoted = /"((?:\\.|[^"\\])*)"/gu;
  let match: RegExpExecArray | null;
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

export function docstringOf(schema: SchemaContract): string {
  const description = schema.schema["description"];
  if (typeof description === "string") return description;
  const title = schema.schema["title"];
  return typeof title === "string" ? title : schema.id;
}

export function titleOf(schema: SchemaContract): string {
  const title = schema.schema["title"];
  return typeof title === "string" ? title : schema.id;
}

export function typeFaceOf(schema: SchemaContract): string {
  return printType(realize(schema.schema));
}

export function declarationLocation(schema: SchemaContract, docs: Map<string, LspVirtualDocument>, scheme: string): LspLocation {
  const doc = docs.get(schemaUri(schema.id, scheme));
  if (doc === undefined) return Object.freeze({ uri: schemaUri(schema.id, scheme), range: zeroRange() });
  return Object.freeze({ uri: doc.uri, range: rangeOfNeedle(doc.text, schema.id) });
}

export function operationLocation(action: Operation, docs: Map<string, LspVirtualDocument>, scheme: string): LspLocation {
  const doc = docs.get(operationUri(action.verb, scheme));
  if (doc === undefined) return Object.freeze({ uri: operationUri(action.verb, scheme), range: zeroRange() });
  return Object.freeze({ uri: doc.uri, range: rangeOfNeedle(doc.text, action.verb) });
}

export function resourceLocation(descriptor: ResourceDescriptor, docs: Map<string, LspVirtualDocument>, scheme: string): LspLocation {
  const uri = resourceUri(descriptor.uri, scheme);
  const doc = docs.get(uri);
  if (doc === undefined) return Object.freeze({ uri, range: zeroRange() });
  return Object.freeze({ uri: doc.uri, range: rangeOfNeedle(doc.text, descriptor.uri) });
}

export function promptLocation(descriptor: PromptDescriptor, docs: Map<string, LspVirtualDocument>, scheme: string): LspLocation {
  const uri = promptUri(descriptor.name, scheme);
  const doc = docs.get(uri);
  if (doc === undefined) return Object.freeze({ uri, range: zeroRange() });
  return Object.freeze({ uri: doc.uri, range: rangeOfNeedle(doc.text, descriptor.name) });
}

export function schemaIdFromUri(uri: string, scheme: string): string | undefined {
  const prefix = `${scheme}://schema/`;
  if (!uri.startsWith(prefix) || !uri.endsWith(".schema.json")) return undefined;
  return decodeURIComponent(uri.slice(prefix.length, -".schema.json".length));
}

function operationIdFromUri(uri: string, scheme: string): string | undefined {
  const prefix = `${scheme}://action/`;
  if (!uri.startsWith(prefix) || !uri.endsWith(".json")) return undefined;
  return decodeURIComponent(uri.slice(prefix.length, -".json".length));
}

function resourceIdFromUri(uri: string, scheme: string): string | undefined {
  const prefix = `${scheme}://resource/`;
  if (!uri.startsWith(prefix) || !uri.endsWith(".json")) return undefined;
  return decodeURIComponent(uri.slice(prefix.length, -".json".length));
}

function promptIdFromUri(uri: string, scheme: string): string | undefined {
  const prefix = `${scheme}://prompt/`;
  if (!uri.startsWith(prefix) || !uri.endsWith(".json")) return undefined;
  return decodeURIComponent(uri.slice(prefix.length, -".json".length));
}

export function resolveSchema(
  params: TextDocumentPositionParams,
  schemas: Map<string, SchemaContract>,
  docs: Map<string, LspVirtualDocument>,
  scheme: string,
): SchemaContract | undefined {
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
  params: TextDocumentPositionParams,
  operations: Map<string, Operation>,
  docs: Map<string, LspVirtualDocument>,
  scheme: string,
): Operation | undefined {
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
  params: TextDocumentPositionParams,
  resources: Map<string, ResourceDescriptor>,
  docs: Map<string, LspVirtualDocument>,
  scheme: string,
): ResourceDescriptor | undefined {
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
  params: TextDocumentPositionParams,
  prompts: Map<string, PromptDescriptor>,
  docs: Map<string, LspVirtualDocument>,
  scheme: string,
): PromptDescriptor | undefined {
  const doc = docs.get(params.textDocument.uri);
  if (doc !== undefined) {
    const token = quotedStringAt(doc.text, params.position);
    if (doc.kind === "prompt") return prompts.get(doc.id);
    if (doc.kind !== "action" && token !== undefined && prompts.has(token)) return prompts.get(token);
  }
  const uriId = promptIdFromUri(params.textDocument.uri, scheme);
  return uriId === undefined ? undefined : prompts.get(uriId);
}

function utteranceProjectionSurfaceFromUri(uri: string, scheme: string): UtteranceProjectionSurface | undefined {
  const prefix = `${scheme}://utterance-projection/`;
  if (!uri.startsWith(prefix) || !uri.endsWith(".json")) return undefined;
  const value = decodeURIComponent(uri.slice(prefix.length, -".json".length));
  return UTTERANCE_PROJECTION_SURFACES.includes(value as UtteranceProjectionSurface)
    ? value as UtteranceProjectionSurface
    : undefined;
}

export function resolveUtteranceProjection(
  params: TextDocumentPositionParams,
  utteranceByTheorem: ReadonlyMap<string, UtteranceObject>,
  docs: Map<string, LspVirtualDocument>,
  scheme: string,
): UtteranceObject | undefined {
  const doc = docs.get(params.textDocument.uri);
  const surface = utteranceProjectionSurfaceFromUri(params.textDocument.uri, scheme);
  if (doc?.kind !== "utterance-projection" || surface === undefined) return undefined;
  const token = quotedStringAt(doc.text, params.position);
  if (token === undefined) return undefined;
  return utteranceByTheorem.get(token);
}

export function operationSchemaUseLocations(
  schemaId: string,
  operations: readonly Operation[],
  docs: Map<string, LspVirtualDocument>,
  scheme: string,
): readonly LspLocation[] {
  const locations: LspLocation[] = [];
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
  theorem: string,
  surface: UtteranceProjectionSurface,
  docs: Map<string, LspVirtualDocument>,
  scheme: string,
): LspLocation {
  const uri = utteranceProjectionUri(surface, scheme);
  const doc = docs.get(uri);
  return Object.freeze({
    uri,
    range: doc === undefined ? zeroRange() : rangeOfNeedle(doc.text, theorem),
  });
}

export function utteranceProjectionDefinitionLocation(
  utteranceValue: UtteranceObject,
  docs: Map<string, LspVirtualDocument>,
  scheme: string,
): LspLocation | null {
  return utteranceProjectionLocation(leanTheoremNameFromUtterance(utteranceValue), "lean-formalization-claims", docs, scheme);
}

export function utteranceProjectionReferences(
  utteranceValue: UtteranceObject,
  docs: Map<string, LspVirtualDocument>,
  scheme: string,
): readonly LspLocation[] {
  const theorem = leanTheoremNameFromUtterance(utteranceValue);
  return Object.freeze(UTTERANCE_PROJECTION_SURFACES.map((surface) =>
    utteranceProjectionLocation(theorem, surface, docs, scheme)));
}

export function utteranceProjectionHover(utteranceValue: UtteranceObject, docs: Map<string, LspVirtualDocument>, scheme: string): LspHover {
  const theorem = leanTheoremNameFromUtterance(utteranceValue);
  return Object.freeze({
    contents: Object.freeze({
      kind: "markdown" as const,
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
  action: Operation,
  endpoint: ProgramEndpoint | undefined,
  docs: Map<string, LspVirtualDocument>,
  scheme: string,
): LspHover {
  return Object.freeze({
    contents: Object.freeze({
      kind: "markdown" as const,
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
          `Standing: ${endpoint.contract.charge} (price ${endpoint.contract.price})`,
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
  descriptor: ResourceDescriptor,
  docs: Map<string, LspVirtualDocument>,
  scheme: string,
): LspHover {
  return Object.freeze({
    contents: Object.freeze({
      kind: "markdown" as const,
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
  descriptor: PromptDescriptor,
  docs: Map<string, LspVirtualDocument>,
  scheme: string,
): LspHover {
  return Object.freeze({
    contents: Object.freeze({
      kind: "markdown" as const,
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

export function diagnosticRangeFromMessage(message: string): LspRange {
  const match = /^\/([^ ]*)/u.exec(message);
  if (match === null || match[1] === "") return zeroRange();
  const width = match[1]?.length ?? 0;
  return Object.freeze({
    start: Object.freeze({ line: 0, character: 0 }),
    end: Object.freeze({ line: 0, character: width }),
  });
}

export function uniqueById<T extends { readonly id: string }>(items: readonly T[]): readonly T[] {
  const byId = new Map<string, T>();
  for (const item of items) byId.set(item.id, item);
  return Object.freeze([...byId.values()]);
}

export function uniqueActionsByVerb(items: readonly Operation[]): readonly Operation[] {
  const byVerb = new Map<string, Operation>();
  for (const item of items) byVerb.set(item.verb, item);
  return Object.freeze([...byVerb.values()]);
}

export function uniqueResourcesByUri(items: readonly ResourceDescriptor[]): readonly ResourceDescriptor[] {
  const byUri = new Map<string, ResourceDescriptor>();
  for (const item of items) byUri.set(item.uri, item);
  return Object.freeze([...byUri.values()]);
}

export function uniquePromptsByName(items: readonly PromptDescriptor[]): readonly PromptDescriptor[] {
  const byName = new Map<string, PromptDescriptor>();
  for (const item of items) byName.set(item.name, item);
  return Object.freeze([...byName.values()]);
}

export function uniqueMarkdownDocumentsByUri(items: readonly LspMarkdownDocument[]): readonly LspMarkdownDocument[] {
  const byUri = new Map<string, LspMarkdownDocument>();
  for (const item of items) byUri.set(item.uri, item);
  return Object.freeze([...byUri.values()]);
}

export function utteranceProjectionUtterances(options: MetroPlatLspOptions): readonly UtteranceObject[] {
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
