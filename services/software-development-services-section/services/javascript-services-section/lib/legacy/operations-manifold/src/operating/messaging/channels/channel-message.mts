import { ENDPOINTS, checkBudget, inferenceCostEvent, user, type Budget, type BudgetStatus, type Conversation } from "@emsenn/organizing-with-llm-agents/algebra";
import { witnessInference } from "@emsenn/organizing-with-llm-agents/holography";
import { chargeValueName, valueOf, type ChargeValueName } from "@emsenn/relating";
import { requireJsonValue, type EAVT, type JsonValue } from "@emsenn/relating/writing";

import { boundaryListParam, boundaryScalarParam, boundaryTextParam, hash, isRecord, optionalText, slug, stringList, type BoundaryParams } from "../../../records.mts";
import { contextBudgetMetrics, money, nonNegativeNumber, optionalNonNegativeNumber, type ContextBudgetBand } from "../../recording/operations/metering/context/library/context-budget.mts";
import { recordOperation, type OperationRecordResult } from "../../recording/operations/ledgering/library/operation-ledger.mts";
import {
  appendEavtLog,
  ensureEavtLogStateDirs,
  operationsManifoldEavtLogState,
  readEavtLog,
  writeJsonState,
  type EavtLogStatePaths,
} from "../../recording/events/stating/library/eavt-log-state.mts";

const MESSAGE_LOG_STATE: EavtLogStatePaths = operationsManifoldEavtLogState("messages");
const MESSAGE_LOG_RELATIVE = MESSAGE_LOG_STATE.log;
const MESSAGE_STATE_RELATIVE = MESSAGE_LOG_STATE.state;

export type ChannelMessageRole = "user" | "assistant" | "agent" | "endpoint" | "system" | "tool";
export type ChannelMessageStatus = "recorded" | "replied" | "error" | "unavailable";
export type EndpointCondition = "ok" | "absent" | "unreachable" | "rejected";

export type SendNvidiaMessageParams = Readonly<{
  channel?: string | undefined;
  message?: string | undefined;
  prompt?: string | undefined;
  text?: string | undefined;
  q?: string | undefined;
  system?: string | undefined;
  speaker?: string | undefined;
  model?: string | undefined;
  temperature?: string | number | undefined;
  maxTokens?: string | number | undefined;
  budgetLimitTokens?: string | number | undefined;
  costUsd?: string | number | undefined;
  trace?: string | undefined;
  session?: string | undefined;
  procedure?: string | undefined;
  evidence?: string | readonly string[] | undefined;
  budgetPolicy?: string | undefined;
}>;

export type RecordMessageParams = Readonly<{
  channel?: string | undefined;
  role?: string | undefined;
  speaker?: string | undefined;
  message?: string | undefined;
  prompt?: string | undefined;
  text?: string | undefined;
  q?: string | undefined;
  status?: string | undefined;
  replyTo?: string | undefined;
  provider?: string | undefined;
  model?: string | undefined;
  procedure?: string | undefined;
  trace?: string | undefined;
  session?: string | undefined;
  evidence?: string | readonly string[] | undefined;
  promptTokens?: string | number | undefined;
  completionTokens?: string | number | undefined;
  totalTokens?: string | number | undefined;
  estimatedTokens?: string | number | undefined;
  inputBytes?: string | number | undefined;
  outputBytes?: string | number | undefined;
  budgetLimitTokens?: string | number | undefined;
  costUsd?: string | number | undefined;
}>;

export type ReadMessagesParams = Readonly<{
  channel?: string | undefined;
  focus?: string | undefined;
  q?: string | undefined;
  limit?: string | number | undefined;
}>;

export type ChannelMessageRecord = Readonly<{
  kind: "operations-manifold.message.event";
  eventId: string;
  messageId: string;
  at: string;
  channel: string;
  role: ChannelMessageRole;
  speaker: string;
  text: string;
  status: ChannelMessageStatus;
  replyTo?: string;
  provider?: string;
  model?: string;
  procedure?: string;
  trace?: string;
  session?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedTokens?: number;
  inputBytes?: number;
  outputBytes?: number;
  budgetLimitTokens?: number;
  budgetBand?: ContextBudgetBand;
  budgetWarnings?: readonly string[];
  costUsd?: number;
  settlementFuel?: number;
  budgetStatus?: BudgetStatus;
  budgetRemaining?: number;
  endpointCondition?: EndpointCondition;
  endpointCharge?: ChargeValueName;
  apiKeyPresent?: boolean;
  apiKeyEnv?: string;
  durationMs?: number;
  evidence: readonly string[];
}>;

export type ChannelSnapshot = Readonly<{
  id: string;
  updatedAt: string;
  messageCount: number;
  replyCount: number;
  endpointReplyCount: number;
  errorCount: number;
  totalTokens: number;
  estimatedTokens: number;
  budgetLimitTokens?: number;
  messages: readonly ChannelMessageRecord[];
}>;

export type MessageSnapshot = Readonly<{
  kind: "operations-manifold.message.snapshot";
  generatedAt: string;
  messageCount: number;
  replyCount: number;
  channels: readonly ChannelSnapshot[];
}>;

export type ReadMessagesResult = Readonly<{
  kind: "operations-manifold.message.read";
  accepted: true;
  query: ReadMessagesParams;
  snapshot: MessageSnapshot;
  channels: readonly ChannelSnapshot[];
  messages: readonly ChannelMessageRecord[];
}>;

export type SendNvidiaMessageResult = Readonly<{
  kind: "operations-manifold.message.send-nvidia";
  accepted: true;
  channel: ChannelSnapshot;
  message: ChannelMessageRecord;
  reply: ChannelMessageRecord;
  operation: OperationRecordResult;
  snapshot: MessageSnapshot;
}>;

export type RecordMessageResult = Readonly<{
  kind: "operations-manifold.message.record";
  accepted: true;
  channel: ChannelSnapshot;
  message: ChannelMessageRecord;
  snapshot: MessageSnapshot;
}>;

export function recordMessageScriptParams(params: BoundaryParams): RecordMessageParams {
  return Object.freeze({
    channel: boundaryTextParam(params, "channel"),
    role: boundaryTextParam(params, "role"),
    speaker: boundaryTextParam(params, "speaker"),
    message: boundaryTextParam(params, "message"),
    prompt: boundaryTextParam(params, "prompt"),
    text: boundaryTextParam(params, "text"),
    q: boundaryTextParam(params, "q", "__stdin"),
    status: boundaryTextParam(params, "status"),
    replyTo: boundaryTextParam(params, "replyTo", "reply_to"),
    provider: boundaryTextParam(params, "provider"),
    model: boundaryTextParam(params, "model"),
    procedure: boundaryTextParam(params, "procedure"),
    trace: boundaryTextParam(params, "trace"),
    session: boundaryTextParam(params, "session", "session_id"),
    evidence: boundaryListParam(params, "evidence"),
    promptTokens: boundaryScalarParam(params, "promptTokens", "prompt_tokens"),
    completionTokens: boundaryScalarParam(params, "completionTokens", "completion_tokens"),
    totalTokens: boundaryScalarParam(params, "totalTokens", "total_tokens"),
    estimatedTokens: boundaryScalarParam(params, "estimatedTokens", "estimated_tokens"),
    inputBytes: boundaryScalarParam(params, "inputBytes", "input_bytes"),
    outputBytes: boundaryScalarParam(params, "outputBytes", "output_bytes"),
    budgetLimitTokens: boundaryScalarParam(params, "budgetLimitTokens", "budget_limit_tokens"),
    costUsd: boundaryScalarParam(params, "costUsd", "cost_usd"),
  });
}

export function sendNvidiaMessageScriptParams(params: BoundaryParams): SendNvidiaMessageParams {
  return Object.freeze({
    channel: boundaryTextParam(params, "channel"),
    message: boundaryTextParam(params, "message"),
    prompt: boundaryTextParam(params, "prompt"),
    text: boundaryTextParam(params, "text"),
    q: boundaryTextParam(params, "q", "__stdin"),
    system: boundaryTextParam(params, "system"),
    speaker: boundaryTextParam(params, "speaker"),
    model: boundaryTextParam(params, "model"),
    temperature: boundaryScalarParam(params, "temperature"),
    maxTokens: boundaryScalarParam(params, "maxTokens", "max_tokens"),
    budgetLimitTokens: boundaryScalarParam(params, "budgetLimitTokens", "budget_limit_tokens"),
    costUsd: boundaryScalarParam(params, "costUsd", "cost_usd"),
    trace: boundaryTextParam(params, "trace"),
    session: boundaryTextParam(params, "session", "session_id"),
    procedure: boundaryTextParam(params, "procedure"),
    evidence: boundaryListParam(params, "evidence"),
  });
}

type MutableChannel = {
  id: string;
  updatedAt: string;
  messageCount: number;
  replyCount: number;
  endpointReplyCount: number;
  errorCount: number;
  totalTokens: number;
  estimatedTokens: number;
  budgetLimitTokens: number | undefined;
  messages: ChannelMessageRecord[];
};

export async function recordMessage(repoRoot: string, params: RecordMessageParams): Promise<RecordMessageResult> {
  const at = new Date().toISOString();
  const channel = channelName(params.channel ?? params.session ?? params.procedure);
  const text = requireMessageText(params);
  const inputBytes = optionalNonNegativeNumber(params.inputBytes) ?? byteLength(text);
  const outputBytes = optionalNonNegativeNumber(params.outputBytes) ?? 0;
  const promptTokens = optionalNonNegativeNumber(params.promptTokens) ?? undefined;
  const completionTokens = optionalNonNegativeNumber(params.completionTokens) ?? undefined;
  const totalTokens = optionalNonNegativeNumber(params.totalTokens) ?? tokenSum(promptTokens, completionTokens);
  const estimatedTokenParam = optionalNonNegativeNumber(params.estimatedTokens);
  const budgetLimitTokens = optionalNonNegativeNumber(params.budgetLimitTokens);
  const budget = contextBudgetMetrics({
    inputBytes,
    outputBytes,
    explicitEstimatedTokens: estimatedTokenParam ?? totalTokens ?? null,
    budgetLimitTokens,
  });
  const message = channelMessage({
    at,
    channel,
    role: messageRole(params.role),
    speaker: optionalText(params.speaker) ?? "agent:codex",
    text,
    status: messageStatus(params.status),
    replyTo: optionalText(params.replyTo),
    provider: optionalText(params.provider),
    model: optionalText(params.model),
    procedure: optionalText(params.procedure),
    trace: optionalText(params.trace) ?? `channel:${channel}`,
    session: optionalText(params.session),
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedTokens: budget.estimatedTokens,
    inputBytes,
    outputBytes,
    budgetLimitTokens: budget.budgetLimitTokens,
    budgetBand: budget.budgetBand,
    budgetWarnings: budget.budgetWarnings,
    costUsd: money(params.costUsd),
    evidence: stringList(params.evidence),
  });

  await ensureMessageDirs(repoRoot);
  await appendMessageEvents(repoRoot, [messageEavtFromValue(message)]);
  const snapshot = await refreshMessages(repoRoot);
  const channelSnapshot = snapshot.channels.find((item) => item.id === channel);
  if (channelSnapshot === undefined) throw new Error(`message channel was not projected: ${channel}`);
  return Object.freeze({ kind: "operations-manifold.message.record" as const, accepted: true as const, channel: channelSnapshot, message, snapshot });
}

export async function sendNvidiaMessage(repoRoot: string, params: SendNvidiaMessageParams): Promise<SendNvidiaMessageResult> {
  const started = Date.now();
  const at = new Date().toISOString();
  const channel = channelName(params.channel ?? params.session ?? params.procedure);
  const text = requireMessageText(params);
  const system = optionalText(params.system);
  const speaker = optionalText(params.speaker) ?? "agent:codex";
  const endpoint = ENDPOINTS.nvidia;
  const model = optionalText(params.model) ?? "meta/llama-3.1-8b-instruct";
  const budgetLimitTokens = optionalNonNegativeNumber(params.budgetLimitTokens);
  const maxTokens = optionalNonNegativeNumber(params.maxTokens);
  const temperature = optionalNumber(params.temperature, 0.4);
  const evidence = stringList(params.evidence);
  const trace = optionalText(params.trace) ?? `channel:${channel}`;
  const procedure = optionalText(params.procedure);
  const session = optionalText(params.session);
  const inputBytes = byteLength(system === null ? text : `${system}\n\n${text}`);
  const message = channelMessage({
    at,
    channel,
    role: "user",
    speaker,
    text,
    status: "recorded",
    trace,
    procedure,
    session,
    inputBytes,
    budgetLimitTokens,
    costUsd: money(params.costUsd),
    evidence,
  });

  const conversation: Conversation = Object.freeze([user(text)]);
  const outcome = await witnessInference(endpoint, {
    endpoint,
    model,
    messages: conversation,
    ...(system === null ? {} : { system }),
    temperature,
    ...(maxTokens === null ? {} : { maxTokens }),
  });

  let replyText = "";
  let replyStatus: ChannelMessageStatus = "replied";
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;
  let promptBytes = inputBytes;
  let settlementFuel = 0;
  let costUsd = money(params.costUsd);
  let endpointCondition: EndpointCondition = "ok";
  const apiKeyPresent = outcome.apiKey.present;
  const apiKeyEnv = outcome.apiKey.envVarName;
  const endpointCharge = chargeValueName(valueOf(outcome.charge));
  if (outcome.ok) {
    replyText = outcome.result.text;
    promptTokens = outcome.result.usage?.input;
    completionTokens = outcome.result.usage?.output;
    promptBytes = outcome.result.promptBytes;
    const cost = inferenceCostEvent(outcome.result, {
      transactionTime: new Date().toISOString(),
      operation: "send-nvidia-message",
      evidence: [message.messageId, ...evidence],
    });
    settlementFuel = cost.settlementFuel;
    costUsd = costUsd === 0 ? cost.dollars : costUsd;
  } else {
    endpointCondition = outcome.condition;
    replyStatus = outcome.condition === "absent" ? "unavailable" : "error";
    replyText = outcome.reason;
  }

  const durationMs = Date.now() - started;
  const outputBytes = byteLength(replyText);
  const totalTokens = tokenSum(promptTokens, completionTokens);
  const budget = contextBudgetMetrics({
    inputBytes: promptBytes,
    outputBytes,
    explicitEstimatedTokens: totalTokens ?? null,
    budgetLimitTokens,
  });
  const budgetCheck = checkBudget(budgetFor(channel, budget.budgetLimitTokens, params.budgetPolicy), 0, budget.estimatedTokens);
  const reply = channelMessage({
    at: new Date().toISOString(),
    channel,
    role: "endpoint",
    speaker: "endpoint:nvidia",
    text: replyText,
    status: replyStatus,
    replyTo: message.messageId,
    provider: endpoint.id,
    model,
    trace,
    procedure,
    session,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedTokens: budget.estimatedTokens,
    inputBytes: promptBytes,
    outputBytes,
    budgetLimitTokens,
    budgetBand: budget.budgetBand,
    budgetWarnings: budget.budgetWarnings,
    costUsd,
    settlementFuel,
    budgetStatus: budgetCheck.status,
    budgetRemaining: budgetCheck.remaining,
    endpointCondition,
    endpointCharge,
    apiKeyPresent,
    apiKeyEnv,
    durationMs,
    evidence: [...evidence, message.messageId],
  });

  await ensureMessageDirs(repoRoot);
  await appendMessageEvents(repoRoot, [messageEavtFromValue(message), messageEavtFromValue(reply)]);
  const snapshot = await refreshMessages(repoRoot);
  const operation = await recordOperation(repoRoot, {
    kind: replyStatus === "replied" ? "http-call" : "note",
    subject: "endpoint:nvidia",
    predicate: replyStatus === "replied" ? "operations-manifold.message.received-endpoint-reply" : `operations-manifold.message.endpoint-${replyStatus}`,
    object: channel,
    trace,
    tool: "nvidia",
    tokens: totalTokens,
    estimatedTokens: budget.estimatedTokens,
    inputBytes: promptBytes,
    outputBytes,
    ...(budgetLimitTokens === null ? {} : { budgetLimitTokens }),
    costUsd,
    durationMs,
    agent: "endpoint:nvidia",
    source: "operations-manifold.send-nvidia-message",
    evidence: [message.messageId, reply.messageId, ...evidence],
    note: replyStatus === "replied" ? `NVIDIA reply recorded in channel ${channel}` : replyText,
  });
  const channelSnapshot = snapshot.channels.find((item) => item.id === channel);
  if (channelSnapshot === undefined) throw new Error(`message channel was not projected: ${channel}`);
  return Object.freeze({ kind: "operations-manifold.message.send-nvidia" as const, accepted: true as const, channel: channelSnapshot, message, reply, operation, snapshot });
}

export async function readMessages(repoRoot: string, params: ReadMessagesParams = {}): Promise<ReadMessagesResult> {
  const snapshot = await refreshMessages(repoRoot);
  const focus = optionalText(params.channel ?? params.focus ?? params.q);
  const limit = boundedLimit(params.limit, 48);
  const channels = focus === null ? snapshot.channels : snapshot.channels.filter((channel) => channel.id.includes(focus));
  const messages = channels.flatMap((channel) => channel.messages)
    .sort((left, right) => left.at.localeCompare(right.at))
    .slice(-limit);
  return Object.freeze({
    kind: "operations-manifold.message.read" as const,
    accepted: true as const,
    query: params,
    snapshot,
    channels: Object.freeze(channels),
    messages: Object.freeze(messages),
  });
}

export async function refreshMessages(repoRoot: string): Promise<MessageSnapshot> {
  await ensureMessageDirs(repoRoot);
  const snapshot = foldMessageEvents(await readMessageLog(repoRoot));
  await writeMessageSnapshot(repoRoot, snapshot);
  return snapshot;
}

function channelMessage(input: Readonly<{
  at: string;
  channel: string;
  role: ChannelMessageRole;
  speaker: string;
  text: string;
  status: ChannelMessageStatus;
  replyTo?: string | null | undefined;
  provider?: string | null | undefined;
  model?: string | null | undefined;
  procedure?: string | null | undefined;
  trace?: string | null | undefined;
  session?: string | null | undefined;
  promptTokens?: number | undefined;
  completionTokens?: number | undefined;
  totalTokens?: number | undefined;
  estimatedTokens?: number | undefined;
  inputBytes?: number | undefined;
  outputBytes?: number | undefined;
  budgetLimitTokens?: number | null | undefined;
  budgetBand?: ContextBudgetBand | undefined;
  budgetWarnings?: readonly string[] | undefined;
  costUsd?: number | undefined;
  settlementFuel?: number | undefined;
  budgetStatus?: BudgetStatus | undefined;
  budgetRemaining?: number | undefined;
  endpointCondition?: EndpointCondition | undefined;
  endpointCharge?: ChargeValueName | undefined;
  apiKeyPresent?: boolean | undefined;
  apiKeyEnv?: string | undefined;
  durationMs?: number | undefined;
  evidence: readonly string[];
}>): ChannelMessageRecord {
  const messageId = `message:${slug(input.channel, "channel", 48)}:${hash({ at: input.at, speaker: input.speaker, text: input.text, replyTo: input.replyTo ?? null }).slice(0, 16)}`;
  const eventId = `message-event:${hash({ messageId, status: input.status, at: input.at }).slice(0, 24)}`;
  return Object.freeze({
    kind: "operations-manifold.message.event" as const,
    eventId,
    messageId,
    at: input.at,
    channel: input.channel,
    role: input.role,
    speaker: input.speaker,
    text: input.text,
    status: input.status,
    ...(input.replyTo === null || input.replyTo === undefined ? {} : { replyTo: input.replyTo }),
    ...(input.provider === null || input.provider === undefined ? {} : { provider: input.provider }),
    ...(input.model === null || input.model === undefined ? {} : { model: input.model }),
    ...(input.procedure === null || input.procedure === undefined ? {} : { procedure: input.procedure }),
    ...(input.trace === null || input.trace === undefined ? {} : { trace: input.trace }),
    ...(input.session === null || input.session === undefined ? {} : { session: input.session }),
    ...(input.promptTokens === undefined ? {} : { promptTokens: nonNegativeNumber(input.promptTokens) }),
    ...(input.completionTokens === undefined ? {} : { completionTokens: nonNegativeNumber(input.completionTokens) }),
    ...(input.totalTokens === undefined ? {} : { totalTokens: nonNegativeNumber(input.totalTokens) }),
    ...(input.estimatedTokens === undefined ? {} : { estimatedTokens: nonNegativeNumber(input.estimatedTokens) }),
    ...(input.inputBytes === undefined ? {} : { inputBytes: nonNegativeNumber(input.inputBytes) }),
    ...(input.outputBytes === undefined ? {} : { outputBytes: nonNegativeNumber(input.outputBytes) }),
    ...(input.budgetLimitTokens === null || input.budgetLimitTokens === undefined ? {} : { budgetLimitTokens: nonNegativeNumber(input.budgetLimitTokens) }),
    ...(input.budgetBand === undefined ? {} : { budgetBand: input.budgetBand }),
    ...(input.budgetWarnings === undefined ? {} : { budgetWarnings: input.budgetWarnings }),
    ...(input.costUsd === undefined ? {} : { costUsd: money(input.costUsd) }),
    ...(input.settlementFuel === undefined ? {} : { settlementFuel: nonNegativeNumber(input.settlementFuel) }),
    ...(input.budgetStatus === undefined ? {} : { budgetStatus: input.budgetStatus }),
    ...(input.budgetRemaining === undefined ? {} : { budgetRemaining: nonNegativeNumber(input.budgetRemaining) }),
    ...(input.endpointCondition === undefined ? {} : { endpointCondition: input.endpointCondition }),
    ...(input.endpointCharge === undefined ? {} : { endpointCharge: input.endpointCharge }),
    ...(input.apiKeyPresent === undefined ? {} : { apiKeyPresent: input.apiKeyPresent }),
    ...(input.apiKeyEnv === undefined || input.apiKeyEnv === "" ? {} : { apiKeyEnv: input.apiKeyEnv }),
    ...(input.durationMs === undefined ? {} : { durationMs: nonNegativeNumber(input.durationMs) }),
    evidence: Object.freeze([...input.evidence]),
  });
}

function foldMessageEvents(events: readonly EAVT[]): MessageSnapshot {
  const messages = events.map((event) => messageEventValue(event[2])).filter((event): event is ChannelMessageRecord => event !== null);
  const byChannel = new Map<string, MutableChannel>();
  for (const message of messages) {
    const channel = byChannel.get(message.channel) ?? mutableChannel(message.channel);
    channel.updatedAt = maxIso(channel.updatedAt, message.at);
    channel.messageCount += 1;
    if (message.replyTo !== undefined) channel.replyCount += 1;
    if (message.role === "endpoint" && message.replyTo !== undefined) channel.endpointReplyCount += 1;
    if (message.status === "error" || message.status === "unavailable") channel.errorCount += 1;
    channel.totalTokens += message.totalTokens ?? 0;
    channel.estimatedTokens += message.estimatedTokens ?? 0;
    if (message.budgetLimitTokens !== undefined) channel.budgetLimitTokens = message.budgetLimitTokens;
    channel.messages.push(message);
    byChannel.set(message.channel, channel);
  }
  const channels = [...byChannel.values()]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((channel) => Object.freeze({
      id: channel.id,
      updatedAt: channel.updatedAt,
      messageCount: channel.messageCount,
      replyCount: channel.replyCount,
      endpointReplyCount: channel.endpointReplyCount,
      errorCount: channel.errorCount,
      totalTokens: channel.totalTokens,
      estimatedTokens: channel.estimatedTokens,
      ...(channel.budgetLimitTokens === undefined ? {} : { budgetLimitTokens: channel.budgetLimitTokens }),
      messages: Object.freeze(channel.messages.slice(-200)),
    }));
  return Object.freeze({
    kind: "operations-manifold.message.snapshot" as const,
    generatedAt: new Date().toISOString(),
    messageCount: messages.length,
    replyCount: messages.filter((message) => message.replyTo !== undefined).length,
    channels: Object.freeze(channels),
  });
}

function mutableChannel(id: string): MutableChannel {
  return { id, updatedAt: "0000-00-00T00:00:00.000Z", messageCount: 0, replyCount: 0, endpointReplyCount: 0, errorCount: 0, totalTokens: 0, estimatedTokens: 0, budgetLimitTokens: undefined, messages: [] };
}

function messageEavtFromValue(value: ChannelMessageRecord): EAVT {
  return Object.freeze([
    value.messageId,
    "operations-manifold.message.recorded",
    requireJsonValue(value, "message event"),
    requireJsonValue({ at: value.at, eventId: value.eventId, channel: value.channel }, "message time"),
  ]);
}

function messageEventValue(value: JsonValue): ChannelMessageRecord | null {
  if (!isRecord(value)) return null;
  if (value["kind"] !== "operations-manifold.message.event") return null;
  if (typeof value["eventId"] !== "string" || typeof value["messageId"] !== "string" || typeof value["at"] !== "string") return null;
  if (typeof value["channel"] !== "string" || typeof value["speaker"] !== "string" || typeof value["text"] !== "string") return null;
  const role = messageRole(typeof value["role"] === "string" ? value["role"] : undefined);
  const status = messageStatus(typeof value["status"] === "string" ? value["status"] : undefined);
  return Object.freeze({
    kind: "operations-manifold.message.event" as const,
    eventId: value["eventId"],
    messageId: value["messageId"],
    at: value["at"],
    channel: value["channel"],
    role,
    speaker: value["speaker"],
    text: value["text"],
    status,
    ...(typeof value["replyTo"] === "string" ? { replyTo: value["replyTo"] } : {}),
    ...(typeof value["provider"] === "string" ? { provider: value["provider"] } : {}),
    ...(typeof value["model"] === "string" ? { model: value["model"] } : {}),
    ...(typeof value["procedure"] === "string" ? { procedure: value["procedure"] } : {}),
    ...(typeof value["trace"] === "string" ? { trace: value["trace"] } : {}),
    ...(typeof value["session"] === "string" ? { session: value["session"] } : {}),
    ...(typeof value["promptTokens"] === "number" ? { promptTokens: nonNegativeNumber(value["promptTokens"]) } : {}),
    ...(typeof value["completionTokens"] === "number" ? { completionTokens: nonNegativeNumber(value["completionTokens"]) } : {}),
    ...(typeof value["totalTokens"] === "number" ? { totalTokens: nonNegativeNumber(value["totalTokens"]) } : {}),
    ...(typeof value["estimatedTokens"] === "number" ? { estimatedTokens: nonNegativeNumber(value["estimatedTokens"]) } : {}),
    ...(typeof value["inputBytes"] === "number" ? { inputBytes: nonNegativeNumber(value["inputBytes"]) } : {}),
    ...(typeof value["outputBytes"] === "number" ? { outputBytes: nonNegativeNumber(value["outputBytes"]) } : {}),
    ...(typeof value["budgetLimitTokens"] === "number" ? { budgetLimitTokens: nonNegativeNumber(value["budgetLimitTokens"]) } : {}),
    ...(typeof value["budgetBand"] === "string" ? { budgetBand: budgetBand(value["budgetBand"]) } : {}),
    ...(Array.isArray(value["budgetWarnings"]) ? { budgetWarnings: Object.freeze(value["budgetWarnings"].filter((item): item is string => typeof item === "string")) } : {}),
    ...(typeof value["costUsd"] === "number" ? { costUsd: money(value["costUsd"]) } : {}),
    ...(typeof value["settlementFuel"] === "number" ? { settlementFuel: nonNegativeNumber(value["settlementFuel"]) } : {}),
    ...(typeof value["budgetStatus"] === "string" ? { budgetStatus: budgetStatus(value["budgetStatus"]) } : {}),
    ...(typeof value["budgetRemaining"] === "number" ? { budgetRemaining: nonNegativeNumber(value["budgetRemaining"]) } : {}),
    ...(typeof value["endpointCondition"] === "string" ? { endpointCondition: endpointCondition(value["endpointCondition"]) } : {}),
    ...(typeof value["endpointCharge"] === "string" ? { endpointCharge: chargeName(value["endpointCharge"]) } : {}),
    ...(typeof value["apiKeyPresent"] === "boolean" ? { apiKeyPresent: value["apiKeyPresent"] } : {}),
    ...(typeof value["apiKeyEnv"] === "string" && value["apiKeyEnv"] !== "" ? { apiKeyEnv: value["apiKeyEnv"] } : {}),
    ...(typeof value["durationMs"] === "number" ? { durationMs: nonNegativeNumber(value["durationMs"]) } : {}),
    evidence: Object.freeze(Array.isArray(value["evidence"]) ? value["evidence"].filter((item): item is string => typeof item === "string") : []),
  });
}

async function appendMessageEvents(repoRoot: string, events: readonly EAVT[]): Promise<string> {
  return appendEavtLog(repoRoot, MESSAGE_LOG_STATE, events);
}

async function readMessageLog(repoRoot: string): Promise<readonly EAVT[]> {
  return readEavtLog(repoRoot, MESSAGE_LOG_STATE);
}

async function writeMessageSnapshot(repoRoot: string, snapshot: MessageSnapshot): Promise<void> {
  return writeJsonState(repoRoot, MESSAGE_LOG_STATE, snapshot);
}

async function ensureMessageDirs(repoRoot: string): Promise<void> {
  return ensureEavtLogStateDirs(repoRoot, MESSAGE_LOG_STATE);
}

function requireMessageText(params: Pick<SendNvidiaMessageParams & RecordMessageParams, "message" | "prompt" | "text" | "q">): string {
  const text = optionalText(params.message ?? params.prompt ?? params.text ?? params.q);
  if (text === null) throw new TypeError("message is required");
  return text;
}

function channelName(value: string | undefined): string {
  return optionalText(value) ?? "agent-messages";
}

function optionalNumber(value: string | number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boundedLimit(value: string | number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(500, parsed) : fallback;
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function tokenSum(left: number | undefined, right: number | undefined): number | undefined {
  if (left === undefined && right === undefined) return undefined;
  return (left ?? 0) + (right ?? 0);
}

function maxIso(left: string, right: string): string {
  return left.localeCompare(right) >= 0 ? left : right;
}

function messageRole(value: string | undefined): ChannelMessageRole {
  if (value === "assistant" || value === "agent" || value === "endpoint" || value === "system" || value === "tool") return value;
  return "user";
}

function messageStatus(value: string | undefined): ChannelMessageStatus {
  if (value === "replied" || value === "error" || value === "unavailable") return value;
  return "recorded";
}

function budgetBand(value: string): ContextBudgetBand {
  if (value === "watch" || value === "over" || value === "huge") return value;
  return "ok";
}

function budgetFor(channel: string, boundValue: number, policy: string | undefined): Budget {
  return Object.freeze({
    id: `budget:messages:${slug(channel, "channel", 48)}:tokens`,
    resourceKind: "tokens" as const,
    boundValue,
    scope: `channel:${channel}`,
    exhaustionPolicy: budgetPolicy(policy),
    evidence: Object.freeze(["operations-manifold.messages", "organizing-with-llm-agents.checkBudget"]),
  });
}

function budgetPolicy(value: string | undefined): Budget["exhaustionPolicy"] {
  if (value === "abort" || value === "defer" || value === "escalate" || value === "degrade") return value;
  return "escalate";
}

function budgetStatus(value: string): BudgetStatus {
  if (value === "exhausted" || value === "downgrade") return value;
  return "available";
}

function endpointCondition(value: string): EndpointCondition {
  if (value === "absent" || value === "unreachable" || value === "rejected") return value;
  return "ok";
}

function chargeName(value: string): ChargeValueName {
  if (value === "stable" || value === "active" || value === "absurd") return value;
  return "potential";
}
