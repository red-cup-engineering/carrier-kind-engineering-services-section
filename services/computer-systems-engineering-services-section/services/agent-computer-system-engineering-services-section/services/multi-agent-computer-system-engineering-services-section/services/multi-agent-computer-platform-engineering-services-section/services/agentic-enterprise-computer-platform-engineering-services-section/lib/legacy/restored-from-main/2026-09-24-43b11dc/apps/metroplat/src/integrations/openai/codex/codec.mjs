/**
 * integrations/openai/codex/codec — Codex-specific OpenAI protocol material.
 *
 * Codex sessions enter as OpenAI boundary statements, but their exec events,
 * transcript JSONL admission, and explicit work reads live under the Codex
 * protocol specialization rather than the generic OpenAI request/result layer.
 *
 * @packageDocumentation
 */
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { parseLines } from "@red-cup-engineering/jsonl-services-section";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { agentEventChronicleContract } from "@red-cup-engineering/computer-networking-engineering-services-section/otlp-schema";

import { openaiModel } from "@red-cup-engineering/computer-inference-engine/openai/codecs";
import { openaiCodexExecEventContract } from "./schema.mjs";
import { claimSessionContinuation, hostActClaimObservations } from "@red-cup-engineering/relating/running/session";
import { agentStatusReadout } from "../../../claims/session.mjs";
import {
  chronicleRowRaw,
  chronicleSessionIdOf,
  chronicleWorkClaims,
  chronicleWorkReadFromChronicle,
} from "../../../work/chronicle.mjs";
import { claimSessionContinuationContract, claimSessionObservationBundleContract } from "@red-cup-engineering/relating/running/session-schema";
import { agentStatusReadoutContract } from "../../../claims/schema.mjs";
import { toEavt, eavtRecord } from "@red-cup-engineering/eavt/row";

export {
  openaiCodexExecEventContract,
  openaiCodexSessionJsonlRequestContract,
} from "./schema.mjs";

/** Options for reading one Codex transcript's content as claim-session material. */

/** Options for reading one Codex transcript's content as a status cut. */

/** One exact authored message part. Host-injected wrappers are retained in the
 * encounter's `hostContexts`, but removed from this authored-discourse leg. */

/** Exact host-supplied context separated from user/assistant authorship. */

/** A lossless tool act. Unlike the bounded tool-study projection, arguments and
 * every matching outcome remain exact JSON values and are never compacted. */

/** Lossless deterministic interpretation of one Codex transcript. The raw
 * transcript stays at its owning filesystem boundary; `commitment` assigns its
 * exact content to a stable token, while these typed claims are projections. */

const OPENAI_BOUNDARY_ATTRIBUTE = "openai.protocol.boundary";
const KNOWN_CODEX_MODELS = Object.freeze([
  Object.freeze({ id: "gpt-5-codex", tier: "F0", realizes: "codex" }),
  Object.freeze({ id: "gpt-5", tier: "F0", realizes: "general-inference" }),
  Object.freeze({ id: "gpt-5-mini", tier: "F1", realizes: "general-inference" }),
  Object.freeze({ id: "gpt-5-nano", tier: "F2", realizes: "general-inference" }),
]);

function jsonClone(value, context) {
  return requireJsonValue(JSON.parse(JSON.stringify(value)), context);
}

/** The Codex-model topology recovered from older organizing work, exposed without runtime claims. */
export function openaiCodexModelTopology() {
  return Object.freeze(KNOWN_CODEX_MODELS.map((model) => openaiModel({
    id: model.id,
    surface: "codex",
    tier: model.tier,
    realizes: model.realizes,
  })));
}

/** Admit one Codex exec JSON event as opaque OpenAI/Codex boundary material. */
export function openaiCodexExecEvent(raw) {
  const value = requireJsonValue(raw, "OpenAI Codex exec event");
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("OpenAI Codex exec event: expected object");
  const record = value;
  const type = record["type"];
  if (typeof type !== "string" || type.length === 0) throw new TypeError("OpenAI Codex exec event: expected string type");
  return openaiCodexExecEventContract.assert(Object.freeze({
    kind: "openai.codex-exec-event",
    type,
    raw: jsonClone(value, "OpenAI Codex exec raw"),
  }), "OpenAI Codex exec event");
}

function openaiBoundaryEntity(observation

) {
  const value = jsonClone(observation.material, "OpenAI Codex boundary value");
  if (observation.sessionId !== undefined) {
    return Object.freeze({ protocol: "openai", surface: "codex", session: observation.sessionId, type: observation.material.type });
  }
  return Object.freeze({ protocol: "openai", surface: "codex", material: observation.material.kind, id: boundaryId(value) });
}

function openaiBoundaryStatementValue(observation

) {
  const material = jsonClone(observation.material, "OpenAI Codex boundary value");
  return requireJsonValue(Object.freeze({
    material,
    ...(observation.sessionId === undefined ? {} : { session: observation.sessionId }),
    ...(observation.boundary === undefined ? {} : { boundary: observation.boundary }),
    ...(observation.caller === undefined ? {} : { caller: observation.caller }),
  }), "OpenAI Codex boundary value");
}

/** The Codex face of the OpenAI boundary feed. */
export const openaiCodexBoundaryFeed

 = Object.freeze({
  name: "openai-boundary",
  functional: Object.freeze([]),
  cellize: (observation

, at) => Object.freeze([
    toEavt({
      e: openaiBoundaryEntity(observation),
      a: OPENAI_BOUNDARY_ATTRIBUTE,
      v: openaiBoundaryStatementValue(observation),
      t: at,
    }),
  ]),
});

/** Encode one Codex boundary observation as EAVT material. */
export function openaiCodexBoundaryStatementRows(observation

) {
  return openaiCodexBoundaryFeed.cellize(observation, observation.at ?? boundaryTime(observation.material));
}

/** Group Codex exec events from one session as a hub agent-event chronicle. */
export function openaiCodexSessionChronicle(input) {
  const statements = Object.freeze(input.events.flatMap((raw) => {
    const event = openaiCodexExecEvent(raw);
    return openaiCodexBoundaryStatementRows({
      sessionId: input.sessionId,
      material: event,
      at: input.at ?? boundaryTime(event),
      boundary: Object.freeze({ protocol: "openai", surface: "codex", event: event.type }),
      caller: input.caller ?? Object.freeze({ protocol: "openai", surface: "codex", session: input.sessionId }),
    });
  }));
  return agentEventChronicleContract.assert(Object.freeze({
    kind: "metroplat.codecs.text.json.otlp.agent-event-chronicle",
    feed: openaiCodexBoundaryFeed.name,
    statements,
  }), "OpenAI Codex session chronicle");
}

function eventRecord(value, context) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${context}: expected JSON object`);
  return value;
}

function payloadRecord(event) {
  const payload = event["payload"];
  return payload !== null && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : undefined;
}

export function codexSessionIdFromEvent(value) {
  const event = eventRecord(value, "Codex session event");
  const payload = payloadRecord(event);
  const direct = event["session_id"] ?? event["sessionId"] ?? payload?.["session_id"] ?? payload?.["sessionId"] ?? payload?.["id"];
  return typeof direct === "string" && direct.length > 0 ? direct : undefined;
}

/** Admit a Codex session JSONL transcript as OpenAI/Codex boundary statement material. */
export function openaiCodexSessionChronicleFromJsonl(input) {
  const events = Object.freeze(parseLines(input.content));
  const sessionId = input.sessionId ?? events.map(codexSessionIdFromEvent).find((value) => value !== undefined);
  if (sessionId === undefined) throw new TypeError("OpenAI Codex session JSONL: missing session id");
  return openaiCodexSessionChronicle({
    sessionId,
    events,
    caller: input.caller ?? Object.freeze({
      protocol: "openai",
      surface: "codex",
      session: sessionId,
      ...(input.source === undefined ? {} : { source: input.source }),
    }),
  });
}

/** Recover the OpenAI/Codex boundary value carried by a Codex boundary row. */
export function openaiCodexBoundaryValue(row) {
  const object = eavtRecord(row);
  if (object.a !== OPENAI_BOUNDARY_ATTRIBUTE) throw new TypeError(`openaiCodexBoundaryValue: unsupported attribute ${JSON.stringify(object.a)}`);
  const value = object.v;
  if (value !== null && typeof value === "object" && !Array.isArray(value) && "material" in value) {
    return (value).material;
  }
  throw new TypeError("openaiCodexBoundaryValue: expected recorded OpenAI/Codex boundary material");
}

function rowPayload(raw) {
  if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const payload = (raw)["payload"];
  return payload !== null && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : undefined;
}

/** Harness-injected wrapper blocks inside Codex message content: the host talking
 *  to the model (workspace instructions, environment context), not discourse. The
 *  `codex_internal_context` wrapper is NOT stripped — it carries goal material. */
const CODEX_HARNESS_BLOCK_PATTERN =
  /<(recommended_plugins|user_instructions|INSTRUCTIONS|environment_context|ENVIRONMENT_CONTEXT|permissions instructions|collaboration_mode|apps_instructions|skills_instructions|plugins_instructions)>[\s\S]*?<\/\1>/gu;
const CODEX_AGENTS_BLOCK_PATTERN =
  /^# AGENTS\.md instructions for [^\r\n]*\r?\n+(?:<INSTRUCTIONS>[\s\S]*?<\/INSTRUCTIONS>)/gmu;
const CODEX_HARNESS_LINE_PATTERN = /^# AGENTS\.md instructions for .*$/gmu;

function codexStrippedText(text) {
  const out = text
    .replace(CODEX_HARNESS_BLOCK_PATTERN, "")
    .replace(CODEX_AGENTS_BLOCK_PATTERN, "")
    .replace(CODEX_HARNESS_LINE_PATTERN, "")
    .trim();
  return out.length === 0 ? undefined : out;
}

function codexMessageText(payload) {
  const direct = payload["text"];
  if (typeof direct === "string") return codexStrippedText(direct);
  const content = payload["content"];
  if (!Array.isArray(content)) return undefined;
  const texts = content.flatMap((block) => {
    if (block === null || typeof block !== "object" || Array.isArray(block)) return [];
    const b = block;
    if ((b["type"] !== "input_text" && b["type"] !== "output_text" && b["type"] !== "text") || typeof b["text"] !== "string") return [];
    const stripped = codexStrippedText(b["text"]);
    return stripped === undefined ? [] : [stripped];
  });
  return texts.length > 0 ? texts.join("\n") : undefined;
}

function codexRawMessageParts(payload) {
  const direct = payload["text"];
  if (typeof direct === "string") return Object.freeze([direct]);
  const content = payload["content"];
  if (!Array.isArray(content)) return Object.freeze([]);
  return Object.freeze(content.flatMap((block) => {
    if (block === null || typeof block !== "object" || Array.isArray(block)) return [];
    const record = block;
    if ((record["type"] !== "input_text" && record["type"] !== "output_text" && record["type"] !== "text")
      || typeof record["text"] !== "string") return [];
    return [record["text"]];
  }));
}

function eventTimestamp(event) {
  const at = event["timestamp"] ?? event["created_at"] ?? event["createdAt"] ?? event["at"];
  return typeof at === "string" && at.length > 0 ? at : undefined;
}

function hostContextsFromText(
  text,
  row,
  event,
  at,
) {
  const contexts = [];
  let remainder = text;
  for (const match of text.matchAll(CODEX_AGENTS_BLOCK_PATTERN)) {
    contexts.push(Object.freeze({
      kind: "metroplat.codex-session.host-context",
      row,
      event,
      contextType: "AGENTS.md",
      text: match[0],
      ...(at === undefined ? {} : { at }),
    }));
    remainder = remainder.replace(match[0], "");
  }
  for (const match of remainder.matchAll(CODEX_HARNESS_BLOCK_PATTERN)) {
    contexts.push(Object.freeze({
      kind: "metroplat.codex-session.host-context",
      row,
      event,
      contextType: match[1] ?? "host-context",
      text: match[0],
      ...(at === undefined ? {} : { at }),
    }));
  }
  return Object.freeze(contexts);
}

function exactCallValue(payload, keys) {
  for (const key of keys) {
    const value = payload[key];
    if (value !== undefined) return jsonClone(value, `Codex tool ${key}`);
  }
  return undefined;
}

function compactText(text, max = 800) {
  const oneLine = text.replace(/\s+/gu, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 3)}...`;
}

function isHarnessResidue(text) {
  return /request_user_input availability|Filesystem sandboxing|## Memory You have access|<\/collaboration_mode>|<\/permissions instructions>|<\/skills_instructions>/u.test(text);
}

function callOutputText(payload) {
  const direct = payload["output"];
  if (typeof direct === "string") return compactText(direct);
  const content = payload["content"];
  if (typeof content === "string") return compactText(content);
  if (content !== undefined) return compactText(canonicalJson(content));
  return undefined;
}

function callArguments(payload) {
  const direct = payload["arguments"] ?? payload["input"];
  if (typeof direct === "string") return compactText(direct);
  if (direct !== undefined) return compactText(canonicalJson(direct));
  return undefined;
}

function codexChatContext(row, index) {
  const event = eventRecord(row, "Codex tool-study row");
  const rowType = event["type"];
  const payload = payloadRecord(event);
  if (payload === undefined) return undefined;
  const payloadType = payload["type"];
  if (rowType === "event_msg" && (payloadType === "user_message" || payloadType === "agent_message")) {
    const message = payload["message"];
    if (typeof message !== "string") return undefined;
    const text = codexStrippedText(message);
    const compact = text === undefined ? undefined : compactText(text);
    if (compact === undefined || isHarnessResidue(compact)) return undefined;
    return Object.freeze({
      role: payloadType === "user_message" ? "user" : "assistant",
      text: compact,
      event: String(payloadType),
      index,
    });
  }
  if (rowType === "response_item" && payloadType === "message") {
    const role = payload["role"] === "user" ? "user" : "assistant";
    const text = codexMessageText(payload);
    const compact = text === undefined ? undefined : compactText(text);
    if (compact === undefined || isHarnessResidue(compact)) return undefined;
    return Object.freeze({
      role,
      text: compact,
      event: "response_item.message",
      index,
    });
  }
  return undefined;
}

function nearbyChat(
  contexts,
  index,
) {
  const before = contexts.filter((context) => context.index < index).slice(-3);
  const after = contexts.filter((context) => context.index > index).slice(0, 1);
  return Object.freeze([...before, ...after]);
}

function whyFromContext(contexts) {
  const assistant = contexts.filter((context) => context.role === "assistant").slice(-2).map((context) => context.text);
  if (assistant.length > 0) return Object.freeze(assistant);
  return Object.freeze(contexts.filter((context) => context.role === "user").slice(-1).map((context) => context.text));
}

/** Study what a Codex transcript used tools for, preserving nearby authored chat.
 *
 * This is deliberately stricter than `codexSessionHostActs`: host acts only need
 * call/outcome claims for settlement; this readout keeps the arguments, compact
 * output receipt, and surrounding discourse needed to inspect why an agent
 * reached for the tool in the first place.
 */
export function codexSessionToolStudyOfContent(
  content,
  options = {},
) {
  const rows = Object.freeze(parseLines(content));
  const sessionId = options.sessionId ?? rows.map(codexSessionIdFromEvent).find((value) => value !== undefined);
  const contexts = Object.freeze(rows.flatMap((row, index) => {
    const context = codexChatContext(row, index);
    return context === undefined ? [] : [context];
  }));
  const outputs = new Map();
  for (const row of rows) {
    const event = eventRecord(row, "Codex tool-study row");
    const payload = payloadRecord(event);
    if (payload === undefined) continue;
    const type = payload["type"];
    if (type !== "function_call_output" && type !== "custom_tool_call_output") continue;
    const callId = payload["call_id"];
    if (typeof callId !== "string" || callId.length === 0) continue;
    const output = callOutputText(payload);
    if (output !== undefined) outputs.set(callId, output);
  }
  const calls = rows.flatMap((row, index) => {
    const event = eventRecord(row, "Codex tool-study row");
    const payload = payloadRecord(event);
    if (payload === undefined) return [];
    const type = payload["type"];
    if (type !== "function_call" && type !== "custom_tool_call") return [];
    const callId = payload["call_id"];
    if (typeof callId !== "string" || callId.length === 0) return [];
    const name = typeof payload["name"] === "string" && payload["name"].length > 0 ? payload["name"] : "tool";
    const output = outputs.get(callId);
    const surroundingChat = nearbyChat(contexts, index);
    const args = callArguments(payload);
    return [Object.freeze({
      kind: "metroplat.codex-session.tool-call-study",
      callId,
      tool: name,
      callType: type,
      ...(args === undefined ? {} : { arguments: args }),
      ...(output === undefined ? {} : { output }),
      outputStatus: output === undefined ? "missing-output" : "recorded",
      why: whyFromContext(surroundingChat),
      surroundingChat,
      evidence: Object.freeze([
        `row:${index}`,
        `type:${type}`,
        output === undefined ? "output:missing" : "output:recorded",
      ]),
    })];
  });
  const counts = new Map();
  for (const call of calls) counts.set(call.tool, (counts.get(call.tool) ?? 0) + 1);
  const tools = Object.freeze([...counts.entries()]
    .map(([name, count]) => Object.freeze({ name, calls: count }))
    .sort((left, right) => right.calls - left.calls || left.name.localeCompare(right.name)));
  return Object.freeze({
    kind: "metroplat.codex-session.tool-study",
    ...(sessionId === undefined ? {} : { sessionId }),
    source: options.source ?? "codex-session",
    rows: rows.length,
    toolCalls: calls.length,
    tools,
    calls: Object.freeze(calls),
    evidence: Object.freeze([
      `rows:${rows.length}`,
      `contexts:${contexts.length}`,
      `tool-calls:${calls.length}`,
      `tools:${tools.length}`,
    ]),
  });
}

/** Interpret one Codex transcript without spending inference and without losing
 * the encounter material needed by a later customer-owned assay. This function
 * classifies only structural host facts: authorship role, wrapper grammar,
 * call/result pairing, and turn order. It deliberately does not decide whether
 * a candidate user correction is actually corrective or whether the terminal
 * assistant message satisfied the customer. */
export function codexSessionEncounterTraceOfContent(
  content,
  options = {},
) {
  const rows = Object.freeze(parseLines(content));
  const transcriptCommitment = `urn:sha256:${sha256Hex(content)}`;
  const sessionId = options.sessionId ?? rows.map(codexSessionIdFromEvent).find((value) => value !== undefined);
  const authoredTurns = [];
  const hostContexts = [];
  const toolOutcomes = new Map();

  for (const [index, row] of rows.entries()) {
    const event = eventRecord(row, "Codex encounter row");
    const payload = payloadRecord(event);
    if (payload === undefined) continue;
    const rowType = event["type"];
    const payloadType = payload["type"];
    const at = eventTimestamp(event);
    let role;
    let parts = Object.freeze([]);
    let eventName;

    if (rowType === "event_msg" && (payloadType === "user_message" || payloadType === "agent_message")) {
      role = payloadType === "user_message" ? "user" : "assistant";
      parts = typeof payload["message"] === "string" ? Object.freeze([payload["message"]]) : Object.freeze([]);
      eventName = String(payloadType);
    } else if (rowType === "response_item" && payloadType === "message") {
      role = payload["role"] === "user" ? "user" : payload["role"] === "assistant" ? "assistant" : undefined;
      parts = codexRawMessageParts(payload);
      eventName = "response_item.message";
    }

    if (role !== undefined && eventName !== undefined) {
      for (const part of parts) {
        hostContexts.push(...hostContextsFromText(part, index, eventName, at));
        const authored = codexStrippedText(part);
        if (authored === undefined || isHarnessResidue(authored)) continue;
        authoredTurns.push(Object.freeze({
          kind: "metroplat.codex-session.authored-turn",
          row: index,
          event: eventName,
          role,
          text: authored,
          ...(at === undefined ? {} : { at }),
        }));
      }
    }

    if (payloadType === "function_call_output" || payloadType === "custom_tool_call_output") {
      const callId = payload["call_id"];
      if (typeof callId !== "string" || callId.length === 0) continue;
      const output = exactCallValue(payload, ["output", "content"]);
      const outcome = Object.freeze({
        kind: "metroplat.codex-session.tool-outcome",
        row: index,
        outputType: payloadType,
        ...(output === undefined ? {} : { output }),
        ...(at === undefined ? {} : { at }),
      });
      toolOutcomes.set(callId, [...(toolOutcomes.get(callId) ?? []), outcome]);
    }
  }

  const toolActs = Object.freeze(rows.flatMap((row, index) => {
    const event = eventRecord(row, "Codex encounter row");
    const payload = payloadRecord(event);
    if (payload === undefined) return [];
    const payloadType = payload["type"];
    if (payloadType !== "function_call" && payloadType !== "custom_tool_call") return [];
    const callId = payload["call_id"];
    if (typeof callId !== "string" || callId.length === 0) return [];
    const at = eventTimestamp(event);
    const outcomes = Object.freeze([...(toolOutcomes.get(callId) ?? [])]);
    const argumentsValue = exactCallValue(payload, ["arguments", "input"]);
    return [Object.freeze({
      kind: "metroplat.codex-session.tool-act",
      row: index,
      callId,
      tool: typeof payload["name"] === "string" && payload["name"].length > 0 ? payload["name"] : "tool",
      callType: payloadType,
      ...(argumentsValue === undefined ? {} : { arguments: argumentsValue }),
      outcomes,
      outcomeStatus: outcomes.length === 0 ? "missing-output" : "recorded",
      ...(at === undefined ? {} : { at }),
    })];
  }));

  const correctionCandidates = [];
  let prior;
  for (const turn of authoredTurns) {
    if (turn.role === "user" && prior?.role === "assistant") {
      correctionCandidates.push(Object.freeze({
        kind: "metroplat.codex-session.correction-candidate",
        row: turn.row,
        text: turn.text,
        classification: "unresolved",
        evidence: Object.freeze([`preceded-by-assistant-row:${prior.row}`]),
      }));
    }
    prior = turn;
  }
  const terminalTurn = [...authoredTurns].reverse().find((turn) => turn.role === "assistant");
  const terminalOutcome = terminalTurn === undefined ? undefined : Object.freeze({
    kind: "metroplat.codex-session.terminal-outcome",
    row: terminalTurn.row,
    text: terminalTurn.text,
    standing: "provider-authored-unassayed",
    ...(terminalTurn.at === undefined ? {} : { at: terminalTurn.at }),
  });

  return Object.freeze({
    kind: "metroplat.codex-session.encounter-trace",
    ...(sessionId === undefined ? {} : { sessionId }),
    source: options.source ?? "codex-session",
    transcript: Object.freeze({
      commitment: transcriptCommitment,
      bytes: Buffer.byteLength(content, "utf8"),
      rows: rows.length,
    }),
    authoredTurns: Object.freeze(authoredTurns),
    hostContexts: Object.freeze(hostContexts),
    toolActs,
    correctionCandidates: Object.freeze(correctionCandidates),
    ...(terminalOutcome === undefined ? {} : { terminalOutcome }),
    evidence: Object.freeze([
      `transcript:${transcriptCommitment}`,
      `rows:${rows.length}`,
      `authored-turns:${authoredTurns.length}`,
      `host-contexts:${hostContexts.length}`,
      `tool-acts:${toolActs.length}`,
      `tool-acts-missing-output:${toolActs.filter((act) => act.outcomeStatus === "missing-output").length}`,
      `correction-candidates-unresolved:${correctionCandidates.length}`,
      terminalOutcome === undefined ? "terminal-outcome:missing" : "terminal-outcome:provider-authored-unassayed",
    ]),
  });
}

/**
 * Restrict a Codex chronicle to authored discourse before the chronicle-generic
 * work read. Codex carries utterances on two row families: `event_msg` rows with
 * payload type `user_message` / `agent_message` (structural, exactly what was
 * said), and `response_item` message rows (which also carry harness-injected
 * instruction wrappers — stripped here as host grammar). Everything else
 * (function calls, reasoning, session/token metadata) is tool material whose
 * strings keyword-scan into fake obligations, and is dropped. The boundary event
 * is re-stamped to the role the host payload declares, so the generic
 * user-utterance goal lift applies; overlap between the two row families collapses
 * in the work read's exact-text dedupe. The artifact tier's raw stays intact.
 */
export function codexSessionAuthoredChronicle(chronicle) {
  const statements = chronicle.statements.flatMap((row) => {
    const { e, a, v, t } = eavtRecord(row);
    const raw = chronicleRowRaw(row);
    const payload = rowPayload(raw);
    if (payload === undefined) return [];
    const payloadType = payload["type"];
    let role;
    let text;
    if (payloadType === "user_message" || payloadType === "agent_message") {
      role = payloadType === "user_message" ? "user" : "assistant";
      const message = payload["message"];
      text = typeof message === "string" ? codexStrippedText(message) : undefined;
    } else if (payloadType === "message") {
      role = typeof payload["role"] === "string" ? payload["role"] : undefined;
      text = codexMessageText(payload);
    } else {
      return [];
    }
    if (text === undefined) return [];
    const envelope = v;
    const material = envelope["material"];
    const boundary = envelope["boundary"];
    const priorBoundary = boundary !== null && typeof boundary === "object" && !Array.isArray(boundary)
      ? boundary
      : Object.freeze({ protocol: "openai", surface: "codex" });
    const stampedBoundary = role === undefined ? priorBoundary : Object.freeze({ ...priorBoundary, event: role });
    const filteredEnvelope = Object.freeze({
      ...envelope,
      material: Object.freeze({ ...material, raw: text }),
      boundary: stampedBoundary,
    });
    return [toEavt({ e, a, v: filteredEnvelope, t })];
  });
  return agentEventChronicleContract.assert(Object.freeze({
    ...chronicle,
    statements: Object.freeze(statements),
  }), "Codex session authored-text chronicle");
}

/** Read the host's own act/result pairing: function_call and custom_tool_call rows
 *  are act-claims; the matching *_output row statements the outcome. Codex outputs
 *  carry no structural error mark, so outcomes are recorded/unrecorded only. */
export function codexSessionHostActs(chronicle) {
  const acts = new Map();
  for (const row of chronicle.statements) {
    const payload = rowPayload(chronicleRowRaw(row));
    if (payload === undefined) continue;
    const type = payload["type"];
    const callId = payload["call_id"];
    if (typeof callId !== "string" || callId.length === 0) continue;
    if (type === "function_call" || type === "custom_tool_call") {
      const prior = acts.get(callId);
      acts.set(callId, {
        name: typeof payload["name"] === "string" && payload["name"].length > 0 ? payload["name"] : "tool",
        outcome: prior?.outcome ?? "unrecorded",
      });
    } else if (type === "function_call_output" || type === "custom_tool_call_output") {
      const prior = acts.get(callId);
      acts.set(callId, { name: prior?.name ?? "tool", outcome: "recorded" });
    }
  }
  return Object.freeze([...acts.entries()].map(([id, act]) => Object.freeze({ id, name: act.name, outcome: act.outcome })));
}

/** Whether content presents Codex rollout rows: a `payload` envelope beside
 *  `type`/`timestamp`, or a top-level session id in the Codex spelling. */
export function isCodexSessionTranscriptContent(content) {
  const rows = jsonlHeadRows(content, 5);
  return rows.length > 0 && rows.some((row) => {
    if (row === null || typeof row !== "object" || Array.isArray(row)) return false;
    const record = row;
    if (typeof record["session_id"] === "string") return true;
    const payload = record["payload"];
    return payload !== null && typeof payload === "object" && !Array.isArray(payload)
      && typeof record["type"] === "string";
  });
}

function jsonlHeadRows(content, limit) {
  try {
    return parseLines(content).slice(0, limit);
  } catch {
    return Object.freeze([]);
  }
}

/** Admit one Codex session transcript's content as the shared agent-event chronicle. */
export function codexSessionChronicleOfContent(content, options = {}) {
  return openaiCodexSessionChronicleFromJsonl({
    content,
    ...(options.source === undefined ? {} : { source: options.source }),
    ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
    ...(options.caller === undefined ? {} : { caller: options.caller }),
  });
}

/** Read one Codex session transcript's content as charged claim-session material. */
export function codexSessionWorkClaimsOfContent(
  content,
  options = {},
) {
  const chronicle = codexSessionChronicleOfContent(content, options);
  const source = options.source ?? "codex-session";
  const workRead = chronicleWorkReadFromChronicle(codexSessionAuthoredChronicle(chronicle), { source });
  const sessionId = options.claimSessionId ?? chronicleSessionIdOf(chronicle) ?? "codex-session";
  const workBundle = chronicleWorkClaims(workRead, {
    sessionId,
    ...(options.at === undefined ? {} : { at: options.at }),
    source,
  });
  const acts = codexSessionHostActs(chronicle);
  const lastObservation = workBundle.observations[workBundle.observations.length - 1];
  const fold = hostActClaimObservations({
    sessionId,
    source,
    protocol: "openai",
    surface: "codex",
    acts,
    ...(lastObservation === undefined ? {} : { initialSession: lastObservation.session }),
    ...(options.at === undefined ? {} : { at: options.at }),
  });
  return claimSessionObservationBundleContract.assert(Object.freeze({
    kind: "metroplat.claim-session.observation-bundle",
    sessionId,
    source,
    observations: Object.freeze([...workBundle.observations, ...fold.observations]),
    evidence: Object.freeze([
      ...workBundle.evidence,
      `acts:${acts.length}`,
      `acts-unrecorded:${acts.filter((act) => act.outcome === "unrecorded").length}`,
    ]),
  }), "Codex session work claims");
}

/** Read one Codex session transcript's content as claim-session continuation material. */
export function codexSessionContinuationOfContent(
  content,
  options = {},
) {
  return claimSessionContinuationContract.assert(
    claimSessionContinuation(codexSessionWorkClaimsOfContent(content, options)),
    "Codex session continuation",
  );
}

/** Read one Codex session transcript's content as agent handoff/status-cut material. */
export function codexSessionStatusReadoutOfContent(
  content,
  options = {},
) {
  return agentStatusReadoutContract.assert(
    agentStatusReadout({
      source: options.source ?? "codex-session",
      continuation: codexSessionContinuationOfContent(content, options),
      ...(options.readiness === undefined ? {} : { readiness: options.readiness }),
    }),
    "Codex session status cut",
  );
}

function boundaryId(value) {
  let hash = 0;
  const text = canonicalJson(value);
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function boundaryTime(input) {
  const raw = input.raw;
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw;
    const stamp = record["timestamp"] ?? record["created_at"] ?? record["createdAt"] ?? record["at"];
    if (typeof stamp === "string" && stamp.length > 0) return stamp;
  }
  return "boundary";
}
