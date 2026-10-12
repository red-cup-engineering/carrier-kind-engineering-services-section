/** Provider-neutral inference material carried through witnessed RPC. */
import { requireJsonValue, type JsonRecord, type JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { contentAddress } from "../../lib/identity/index.mts";

export type InferenceRole = "system" | "developer" | "user" | "assistant" | "tool";
export type InferenceStop = "completed" | "tool-moves" | "length" | "content-filter" | "refused" | "incomplete";

export interface InferenceToolMove {
  readonly kind: "metroplat.inference.tool-move";
  readonly request: string;
  readonly name: string;
  readonly input: JsonValue;
  /** Namespaced opaque provider material required to continue this exact tool call. */
  readonly extensions?: JsonRecord;
}

export interface InferenceMessage {
  readonly kind: "metroplat.inference.message";
  readonly role: InferenceRole;
  readonly content: string | null;
  readonly name?: string;
  readonly toolRequest?: string;
  readonly toolMoves?: readonly InferenceToolMove[];
}

export interface InferenceTool {
  readonly kind: "metroplat.inference.tool";
  readonly name: string;
  readonly operation?: string;
  readonly description?: string;
  readonly inputSchema: JsonRecord;
  readonly strict?: boolean;
}

export interface InferenceCall {
  readonly kind: "metroplat.inference.call";
  readonly id: string;
  /** Stable caller/provider request key; retries retain it. */
  readonly request: string;
  readonly subject: string;
  readonly model: string;
  readonly messages: readonly InferenceMessage[];
  readonly tools: readonly InferenceTool[];
  readonly generation?: InferenceGeneration;
  readonly responseConstraint?: JsonValue;
  /** Namespaced lossless material not shared by every provider. */
  readonly extensions?: JsonRecord;
  readonly caller?: JsonRecord;
  readonly observedAt: string;
  readonly causes: readonly string[];
}

export interface InferenceGeneration {
  readonly maxOutputTokens?: number;
  readonly temperature?: number;
  readonly topP?: number;
  readonly stopSequences?: readonly string[];
}

export interface InferenceUsage {
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
  readonly reasoningOutputTokens: number;
  readonly totalTokens: number;
  readonly extensions?: JsonRecord;
}

export interface InferenceResult {
  readonly kind: "metroplat.inference.result";
  readonly id: string;
  readonly call: string;
  readonly model: string;
  readonly stop: InferenceStop;
  readonly message?: InferenceMessage;
  readonly toolMoves: readonly InferenceToolMove[];
  readonly usage?: InferenceUsage;
  readonly extensions?: JsonRecord;
  readonly observedAt: string;
  readonly causes: readonly string[];
}

export type InferenceFailureCondition =
  | "configuration"
  | "unauthorized"
  | "unreachable"
  | "rate-limited"
  | "rejected"
  | "timeout"
  | "cancelled"
  | "malformed"
  | "truncated-stream";

export interface InferenceObstruction {
  readonly kind: "metroplat.inference.obstruction";
  readonly id: string;
  readonly call: string;
  readonly condition: InferenceFailureCondition;
  readonly reasons: readonly string[];
  readonly retryable: boolean;
  /** Non-semantic, non-secret evidence retained without changing obstruction identity. */
  readonly extensions?: JsonRecord;
  readonly observedAt: string;
  readonly causes: readonly string[];
}

export type InferenceOutcome = InferenceResult | InferenceObstruction;

export interface InferenceCallDraft extends Omit<InferenceCall, "kind" | "id" | "messages" | "tools" | "causes"> {
  readonly messages: readonly InferenceMessage[];
  readonly tools?: readonly InferenceTool[];
  readonly causes?: readonly string[];
}

function jsonRecord(value: JsonRecord | undefined, label: string): JsonRecord | undefined {
  return value === undefined ? undefined : requireJsonValue(value, label) as JsonRecord;
}

export function inferenceToolMove(input: Omit<InferenceToolMove, "kind">): InferenceToolMove {
  return Object.freeze({
    kind: "metroplat.inference.tool-move" as const,
    request: input.request,
    name: input.name,
    input: requireJsonValue(input.input, "inference tool input"),
    ...(input.extensions === undefined ? {} : { extensions: jsonRecord(input.extensions, "inference tool move extensions")! }),
  });
}

export function inferenceMessage(input: Omit<InferenceMessage, "kind" | "toolMoves"> & { readonly toolMoves?: readonly InferenceToolMove[] }): InferenceMessage {
  return Object.freeze({
    kind: "metroplat.inference.message" as const,
    role: input.role,
    content: input.content,
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.toolRequest === undefined ? {} : { toolRequest: input.toolRequest }),
    ...(input.toolMoves === undefined ? {} : { toolMoves: Object.freeze(input.toolMoves.map((move) => inferenceToolMove(move))) }),
  });
}

export function inferenceTool(input: Omit<InferenceTool, "kind">): InferenceTool {
  return Object.freeze({
    kind: "metroplat.inference.tool" as const,
    name: input.name,
    ...(input.operation === undefined ? {} : { operation: input.operation }),
    ...(input.description === undefined ? {} : { description: input.description }),
    inputSchema: requireJsonValue(input.inputSchema, "inference tool input schema") as JsonRecord,
    ...(input.strict === undefined ? {} : { strict: input.strict }),
  });
}

/** Seal semantic call identity independently of transport, observation time, and causal placement. */
export function inferenceCall(draft: InferenceCallDraft): InferenceCall {
  const messages = Object.freeze(draft.messages.map((message) => inferenceMessage(message)));
  const tools = Object.freeze((draft.tools ?? []).map((tool) => inferenceTool(tool)));
  const responseConstraint = draft.responseConstraint === undefined
    ? undefined
    : requireJsonValue(draft.responseConstraint, "inference response constraint");
  const extensions = jsonRecord(draft.extensions, "inference call extensions");
  const generation = draft.generation === undefined ? undefined : Object.freeze({
    ...(draft.generation.maxOutputTokens === undefined ? {} : { maxOutputTokens: Math.max(0, Math.trunc(draft.generation.maxOutputTokens)) }),
    ...(draft.generation.temperature === undefined ? {} : { temperature: draft.generation.temperature }),
    ...(draft.generation.topP === undefined ? {} : { topP: draft.generation.topP }),
    ...(draft.generation.stopSequences === undefined ? {} : { stopSequences: Object.freeze([...draft.generation.stopSequences]) }),
  });
  const identity = Object.freeze({
    request: draft.request,
    subject: draft.subject,
    model: draft.model,
    messages,
    tools,
    ...(generation === undefined ? {} : { generation }),
    ...(responseConstraint === undefined ? {} : { responseConstraint }),
  });
  return Object.freeze({
    kind: "metroplat.inference.call" as const,
    id: contentAddress(identity as unknown as JsonValue),
    ...identity,
    ...(extensions === undefined ? {} : { extensions }),
    ...(draft.caller === undefined ? {} : { caller: jsonRecord(draft.caller, "inference caller")! }),
    observedAt: draft.observedAt,
    causes: Object.freeze([...(draft.causes ?? [])]),
  });
}

export function inferenceResult(input: Omit<InferenceResult, "kind" | "id" | "toolMoves" | "causes"> & { readonly toolMoves?: readonly InferenceToolMove[]; readonly causes?: readonly string[] }): InferenceResult {
  const toolMoves = Object.freeze((input.toolMoves ?? []).map((move) => inferenceToolMove(move)));
  const message = input.message === undefined ? undefined : inferenceMessage(input.message);
  const extensions = jsonRecord(input.extensions, "inference result extensions");
  const usage = input.usage === undefined ? undefined : Object.freeze({
    inputTokens: input.usage.inputTokens,
    cachedInputTokens: input.usage.cachedInputTokens,
    outputTokens: input.usage.outputTokens,
    reasoningOutputTokens: input.usage.reasoningOutputTokens,
    totalTokens: input.usage.totalTokens,
    ...(input.usage.extensions === undefined ? {} : { extensions: jsonRecord(input.usage.extensions, "inference usage extensions")! }),
  });
  const identityUsage = usage === undefined ? undefined : Object.freeze({
    inputTokens: usage.inputTokens,
    cachedInputTokens: usage.cachedInputTokens,
    outputTokens: usage.outputTokens,
    reasoningOutputTokens: usage.reasoningOutputTokens,
    totalTokens: usage.totalTokens,
  });
  const identity = Object.freeze({
    call: input.call,
    model: input.model,
    stop: input.stop,
    ...(message === undefined ? {} : { message }),
    toolMoves,
    ...(identityUsage === undefined ? {} : { usage: identityUsage }),
  });
  return Object.freeze({
    kind: "metroplat.inference.result" as const,
    id: contentAddress(identity as unknown as JsonValue),
    ...identity,
    ...(usage === undefined ? {} : { usage }),
    ...(extensions === undefined ? {} : { extensions }),
    observedAt: input.observedAt,
    causes: Object.freeze([...(input.causes ?? [])]),
  });
}

export function inferenceObstruction(input: Omit<InferenceObstruction, "kind" | "id" | "reasons" | "causes"> & { readonly reasons: readonly string[]; readonly causes?: readonly string[] }): InferenceObstruction {
  const generator = Object.freeze({ call: input.call, condition: input.condition, reasons: Object.freeze([...input.reasons]), retryable: input.retryable });
  const extensions = jsonRecord(input.extensions, "inference obstruction extensions");
  return Object.freeze({
    kind: "metroplat.inference.obstruction" as const,
    id: contentAddress(generator as unknown as JsonValue),
    ...generator,
    ...(extensions === undefined ? {} : { extensions }),
    observedAt: input.observedAt,
    causes: Object.freeze([...(input.causes ?? [])]),
  });
}
