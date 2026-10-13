/**
 * integrations/openai/codec — OpenAI protocol material as metroplat boundary records.
 *
 * This module admits OpenAI-facing requests, model coordinates, tool calls, and
 * usage costs without owning the network runtime. API keys, sockets, SDKs,
 * retries, and streaming transports stay outside this boundary; the material
 * here is the recoverable shape an metroplat service can record, settle, and
 * relate to capability/accountability protocols.
 *
 * @packageDocumentation
 */
import { requireJsonValue, type JsonValue } from "../../lib/codecs/json/core.mts";
import { canonicalBytes } from "../../lib/identity/index.mts";
import { toEavt, eavtObject, type EAVT } from "../../lib/codecs/json/jsonl/eavt/index.mts";
import type { McpCatalogToolDefinition } from "../mcp/index.mts";
import type { Feed } from "../../lib/addressing/feed.mts";
import type { StatementValue } from "../../lib/records/persistence.mts";
import {
  openaiChatCompletionRequestContract,
  openaiFunctionToolContract,
  openaiInferenceResultContract,
  openaiMessageContract,
  openaiModelContract,
  openaiResponseRequestContract,
  openaiToolCallContract,
  openaiToolContract,
  openaiUsageCostContract,
} from "./schemas.mts";

export * as chatCompletions from "../../../../../../src/integrations/openai/chat-completions/codec.mts";
export * as embeddings from "./embeddings/codec.mts";
export * as models from "./models/codec.mts";
export * as responses from "../../../../../../src/integrations/openai/responses/codec.mts";

export {
  openaiChatCompletionRequestContract,
  openaiFunctionToolContract,
  openaiInferenceResultContract,
  openaiMessageContract,
  openaiModelContract,
  openaiResponseRequestContract,
  openaiToolCallContract,
  openaiToolContract,
  openaiUsageCostContract,
} from "./schemas.mts";

export type OpenAISurface = "responses" | "chat-completions" | "codex" | "realtime";
export type OpenAIInferenceStatus = "completed" | "tool-calls" | "incomplete" | "refused" | "errored";

export interface OpenAIModel {
  readonly kind: "openai.model";
  readonly id: string;
  readonly surface: OpenAISurface;
  readonly tier: string;
  readonly realizes?: string;
}

export interface OpenAITool {
  readonly kind: "openai.tool";
  readonly type: "function" | "mcp";
  readonly name: string;
  readonly description?: string;
  readonly parameters?: Readonly<Record<string, unknown>>;
}

export interface OpenAIFunctionTool {
  readonly kind: "openai.function-tool";
  readonly type: "function";
  readonly function: Readonly<{
    readonly name: string;
    readonly description?: string;
    readonly parameters: Readonly<Record<string, unknown>>;
    readonly strict?: boolean;
  }>;
}

export type OpenAIToolDescriptor = OpenAITool | OpenAIFunctionTool;

export interface OpenAIMessage {
  readonly kind: "openai.message";
  readonly role: "system" | "developer" | "user" | "assistant" | "tool";
  readonly content: string | null;
  readonly name?: string;
  readonly toolCallId?: string;
}

export interface OpenAIToolCall {
  readonly kind: "openai.tool-call";
  readonly id: string;
  readonly name: string;
  readonly arguments: JsonValue;
}

export interface OpenAIResponseRequest {
  readonly kind: "openai.response-request";
  readonly model: string;
  readonly input: string | readonly OpenAIMessage[];
  readonly instructions?: string;
  readonly tools?: readonly OpenAIToolDescriptor[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface OpenAIChatCompletionRequest {
  readonly kind: "openai.chat-completion-request";
  readonly model: string;
  readonly messages: readonly OpenAIMessage[];
  readonly tools?: readonly OpenAIToolDescriptor[];
  readonly responseFormat?: string;
  readonly stream?: boolean;
}

export interface OpenAIInferenceResult {
  readonly kind: "openai.inference-result";
  readonly model: string;
  readonly status: OpenAIInferenceStatus;
  readonly text: string | null;
  readonly toolCalls: readonly OpenAIToolCall[];
  readonly usage?: Readonly<{ inputTokens: number; outputTokens: number }>;
}

export interface OpenAIUsageCost {
  readonly kind: "openai.usage-cost";
  readonly operation: string;
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly dollars: number;
  readonly at: string;
  readonly evidence?: readonly string[];
}

export type OpenAIBoundaryMaterial =
  | OpenAIResponseRequest
  | OpenAIChatCompletionRequest
  | OpenAIInferenceResult
  | OpenAIUsageCost;

export interface OpenAIBoundaryObservation {
  readonly material: OpenAIBoundaryMaterial;
  readonly sessionId?: string;
  readonly boundary?: StatementValue;
  readonly caller?: StatementValue;
  readonly at?: StatementValue;
}

const OPENAI_BOUNDARY_ATTRIBUTE = "openai.protocol.boundary";
function nonempty(value: string, label: string): string {
  if (value.trim().length === 0) throw new TypeError(`${label}: expected a non-empty string`);
  return value;
}

function optionalRecord(value: Readonly<Record<string, unknown>> | undefined, label: string): Readonly<Record<string, unknown>> | undefined {
  if (value === undefined) return undefined;
  return requireJsonValue({ ...value }, label) as Readonly<Record<string, unknown>>;
}

function jsonClone<T>(value: T, context: string): T {
  return requireJsonValue(JSON.parse(JSON.stringify(value)) as JsonValue, context) as T;
}

function textTokens(text: string | null | undefined): number {
  return (text ?? "").split(/\s+/).filter(Boolean).length;
}

/** Admit one OpenAI model coordinate as protocol material. */
export function openaiModel(input: {
  readonly id: string;
  readonly surface: OpenAISurface;
  readonly tier?: string;
  readonly realizes?: string;
}): OpenAIModel {
  return openaiModelContract.assert(Object.freeze({
    kind: "openai.model" as const,
    id: nonempty(input.id, "OpenAI model id"),
    surface: input.surface,
    tier: nonempty(input.tier ?? "unclassified", "OpenAI model tier"),
    ...(input.realizes === undefined ? {} : { realizes: nonempty(input.realizes, "OpenAI model realizes") }),
  }), "OpenAI model") as OpenAIModel;
}

/** Admit a function or MCP tool descriptor as OpenAI request material. */
export function openaiTool(input: {
  readonly name: string;
  readonly type?: "function" | "mcp";
  readonly description?: string;
  readonly parameters?: Readonly<Record<string, unknown>>;
}): OpenAITool {
  return openaiToolContract.assert(Object.freeze({
    kind: "openai.tool" as const,
    type: input.type ?? "function" as const,
    name: nonempty(input.name, "OpenAI tool name"),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.parameters === undefined ? {} : { parameters: optionalRecord(input.parameters, "OpenAI tool parameters") }),
  }), "OpenAI tool") as OpenAITool;
}

/** Admit a current OpenAI function-tool wire descriptor. */
export function openaiFunctionTool(input: {
  readonly name: string;
  readonly description?: string;
  readonly parameters?: Readonly<Record<string, unknown>>;
  readonly strict?: boolean;
}): OpenAIFunctionTool {
  return openaiFunctionToolContract.assert(Object.freeze({
    kind: "openai.function-tool" as const,
    type: "function" as const,
    function: Object.freeze({
      name: nonempty(input.name, "OpenAI function tool name"),
      ...(input.description === undefined ? {} : { description: input.description }),
      parameters: optionalRecord(input.parameters ?? { type: "object", properties: {}, additionalProperties: false }, "OpenAI function tool parameters"),
      ...(input.strict === undefined ? {} : { strict: input.strict }),
    }),
  }), "OpenAI function tool") as OpenAIFunctionTool;
}

/** Convert an admitted MCP tools/list catalog row into the current OpenAI function-tool wire descriptor. */
export function openaiFunctionToolFromMcpCatalogTool(tool: McpCatalogToolDefinition): OpenAIFunctionTool {
  return openaiFunctionTool({
    name: tool.name,
    ...(tool.description === undefined ? {} : { description: tool.description }),
    parameters: tool.parameters ?? { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  });
}

/** Convert an admitted MCP tools/list catalog row into the legacy flattened descriptor. */
export function openaiToolFromMcpCatalogTool(tool: McpCatalogToolDefinition): OpenAITool {
  return openaiTool({
    name: tool.name,
    type: "mcp",
    ...(tool.description === undefined ? {} : { description: tool.description }),
    ...(tool.parameters === undefined ? {} : { parameters: tool.parameters }),
  });
}

export function openaiToolName(tool: OpenAIToolDescriptor): string {
  return tool.kind === "openai.function-tool" ? tool.function.name : tool.name;
}

function admitOpenAIToolDescriptor(tool: OpenAIToolDescriptor, label: string): OpenAIToolDescriptor {
  if ((tool as { readonly kind?: unknown }).kind === "openai.function-tool") {
    return openaiFunctionToolContract.assert(tool, label) as OpenAIFunctionTool;
  }
  return openaiToolContract.assert(tool, label) as OpenAITool;
}

/** Admit a conversation message. */
export function openaiMessage(input: Omit<OpenAIMessage, "kind">): OpenAIMessage {
  return openaiMessageContract.assert(Object.freeze({
    kind: "openai.message" as const,
    role: input.role,
    content: input.content,
    ...(input.name === undefined ? {} : { name: nonempty(input.name, "OpenAI message name") }),
    ...(input.toolCallId === undefined ? {} : { toolCallId: nonempty(input.toolCallId, "OpenAI tool call id") }),
  }), "OpenAI message") as OpenAIMessage;
}

/** Admit a Responses-style request. */
export function openaiResponseRequest(input: {
  readonly model: string;
  readonly input: string | readonly Omit<OpenAIMessage, "kind">[] | readonly OpenAIMessage[];
  readonly instructions?: string;
  readonly tools?: readonly OpenAIToolDescriptor[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}): OpenAIResponseRequest {
  const requestInput = typeof input.input === "string"
    ? input.input
    : Object.freeze(input.input.map((message) => openaiMessage(message)));
  return openaiResponseRequestContract.assert(Object.freeze({
    kind: "openai.response-request" as const,
    model: nonempty(input.model, "OpenAI response model"),
    input: requestInput,
    ...(input.instructions === undefined ? {} : { instructions: input.instructions }),
    ...(input.tools === undefined ? {} : { tools: Object.freeze(input.tools.map((tool) => admitOpenAIToolDescriptor(tool, "OpenAI response tool"))) }),
    ...(input.metadata === undefined ? {} : { metadata: optionalRecord(input.metadata, "OpenAI response metadata") }),
  }), "OpenAI response request") as OpenAIResponseRequest;
}

/** Admit the older Chat Completions wire face as the same protocol family. */
export function openaiChatCompletionRequest(input: {
  readonly model: string;
  readonly messages: readonly Omit<OpenAIMessage, "kind">[] | readonly OpenAIMessage[];
  readonly tools?: readonly OpenAIToolDescriptor[];
  readonly responseFormat?: string;
  readonly stream?: boolean;
}): OpenAIChatCompletionRequest {
  return openaiChatCompletionRequestContract.assert(Object.freeze({
    kind: "openai.chat-completion-request" as const,
    model: nonempty(input.model, "OpenAI chat model"),
    messages: Object.freeze(input.messages.map((message) => openaiMessage(message))),
    ...(input.tools === undefined ? {} : { tools: Object.freeze(input.tools.map((tool) => admitOpenAIToolDescriptor(tool, "OpenAI chat tool"))) }),
    ...(input.responseFormat === undefined ? {} : { responseFormat: input.responseFormat }),
    ...(input.stream === undefined ? {} : { stream: input.stream }),
  }), "OpenAI chat completion request") as OpenAIChatCompletionRequest;
}

/** Admit one model-emitted tool call. */
export function openaiToolCall(input: {
  readonly id: string;
  readonly name: string;
  readonly arguments?: unknown;
}): OpenAIToolCall {
  return openaiToolCallContract.assert(Object.freeze({
    kind: "openai.tool-call" as const,
    id: nonempty(input.id, "OpenAI tool call id"),
    name: nonempty(input.name, "OpenAI tool call name"),
    arguments: requireJsonValue(input.arguments ?? {}, "OpenAI tool call arguments"),
  }), "OpenAI tool call") as OpenAIToolCall;
}

/** Build a pure inference result over admitted text/tool-call/usage material. */
export function openaiInferenceResult(input: {
  readonly model: string;
  readonly text?: string | null;
  readonly status?: OpenAIInferenceStatus;
  readonly toolCalls?: readonly OpenAIToolCall[];
  readonly usage?: Readonly<{ inputTokens: number; outputTokens: number }>;
}): OpenAIInferenceResult {
  const calls = Object.freeze((input.toolCalls ?? []).map((call) => openaiToolCallContract.assert(call, "OpenAI result tool call") as OpenAIToolCall));
  const status = input.status ?? (calls.length > 0 ? "tool-calls" : "completed");
  return openaiInferenceResultContract.assert(Object.freeze({
    kind: "openai.inference-result" as const,
    model: nonempty(input.model, "OpenAI result model"),
    status,
    text: input.text ?? null,
    toolCalls: calls,
    ...(input.usage === undefined ? {} : {
      usage: Object.freeze({
        inputTokens: Math.max(0, Math.trunc(input.usage.inputTokens)),
        outputTokens: Math.max(0, Math.trunc(input.usage.outputTokens)),
      }),
    }),
  }), "OpenAI inference result") as OpenAIInferenceResult;
}

/** Estimate a local result from a request without calling OpenAI. Useful for fixtures and protocol examples. */
export function observeOpenAIResponseRequest(request: OpenAIResponseRequest): OpenAIInferenceResult {
  const admitted = openaiResponseRequestContract.assert(request, "OpenAI response request") as OpenAIResponseRequest;
  const text = typeof admitted.input === "string"
    ? admitted.input
    : admitted.input.map((message) => message.content ?? "").join("\n");
  const calls = admitted.tools?.[0] === undefined
    ? []
    : [openaiToolCall({ id: `call_${openaiToolName(admitted.tools[0])}`, name: openaiToolName(admitted.tools[0]), arguments: { kind: "openai.protocol.tool-call", model: admitted.model } })];
  return openaiInferenceResult({
    model: admitted.model,
    text: calls.length === 0 ? `observed:${text}` : null,
    toolCalls: calls,
    usage: { inputTokens: textTokens(text) + textTokens(admitted.instructions), outputTokens: calls.length === 0 ? textTokens(text) : 0 },
  });
}

/** Project an inference result into a usage/cost observation. Dollars are provided by the caller, not inferred here. */
export function openaiUsageCost(input: {
  readonly operation: string;
  readonly model: string;
  readonly usage?: Readonly<{ inputTokens: number; outputTokens: number }>;
  readonly dollars?: number;
  readonly at: string;
  readonly evidence?: readonly string[];
}): OpenAIUsageCost {
  return openaiUsageCostContract.assert(Object.freeze({
    kind: "openai.usage-cost" as const,
    operation: nonempty(input.operation, "OpenAI usage operation"),
    model: nonempty(input.model, "OpenAI usage model"),
    inputTokens: Math.max(0, Math.trunc(input.usage?.inputTokens ?? 0)),
    outputTokens: Math.max(0, Math.trunc(input.usage?.outputTokens ?? 0)),
    dollars: Math.max(0, input.dollars ?? 0),
    at: nonempty(input.at, "OpenAI usage time"),
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
  }), "OpenAI usage cost") as OpenAIUsageCost;
}

function openaiBoundaryEntity(observation: OpenAIBoundaryObservation): JsonValue {
  const value = jsonClone(observation.material, "OpenAI boundary value") as unknown as JsonValue;
  return Object.freeze({
    kind: "metroplat.openai-boundary",
    surface: observation.material.kind,
    ...(observation.sessionId === undefined ? {} : { session: observation.sessionId }),
    id: boundaryId(value),
  });
}

function openaiBoundaryStatementValue(observation: OpenAIBoundaryObservation): JsonValue {
  const material = jsonClone(observation.material, "OpenAI boundary value") as unknown as JsonValue;
  return requireJsonValue(Object.freeze({
    material,
    ...(observation.boundary === undefined ? {} : { boundary: observation.boundary }),
    ...(observation.caller === undefined ? {} : { caller: observation.caller }),
  }), "OpenAI boundary value");
}

/** The OpenAI boundary feed: protocol material enters the statement log as EAVT rows. */
export const openaiBoundaryFeed: Feed<OpenAIBoundaryObservation> = Object.freeze({
  name: "openai-boundary",
  functional: Object.freeze([]),
  cellize: (observation: OpenAIBoundaryObservation, at: StatementValue): readonly EAVT[] => Object.freeze([
    toEavt({
      e: openaiBoundaryEntity(observation),
      a: OPENAI_BOUNDARY_ATTRIBUTE,
      v: openaiBoundaryStatementValue(observation),
      t: at,
    }),
  ]),
});

/** Encode one OpenAI boundary observation as EAVT material. */
export function openaiBoundaryStatementRows(observation: OpenAIBoundaryObservation): readonly EAVT[] {
  return openaiBoundaryFeed.cellize(observation, observation.at ?? boundaryTime(observation.material));
}

/** Encode any OpenAI protocol record as one EAVT boundary row. */
export function openaiBoundaryRow(input: OpenAIBoundaryMaterial): EAVT {
  const row = openaiBoundaryStatementRows({ material: input })[0];
  if (row === undefined) throw new TypeError("openaiBoundaryRow: expected one boundary statement row");
  return row;
}

/** Recover the OpenAI boundary value carried by a row emitted through `openaiBoundaryRow`. */
export function openaiBoundaryValue(row: EAVT): JsonValue {
  const object = eavtObject(row);
  if (object.a !== OPENAI_BOUNDARY_ATTRIBUTE) throw new TypeError(`openaiBoundaryValue: unsupported attribute ${JSON.stringify(object.a)}`);
  const value = object.v;
  if (value !== null && typeof value === "object" && !Array.isArray(value) && "material" in value) {
    return (value as { readonly material: JsonValue }).material;
  }
  throw new TypeError("openaiBoundaryValue: expected recorded OpenAI boundary material");
}

function boundaryId(value: JsonValue): string {
  let hash = 0;
  const text = canonicalBytes(value);
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function boundaryTime(input: OpenAIResponseRequest | OpenAIChatCompletionRequest | OpenAIInferenceResult | OpenAIUsageCost): string {
  if (input.kind === "openai.usage-cost") return input.at;
  return "boundary";
}
