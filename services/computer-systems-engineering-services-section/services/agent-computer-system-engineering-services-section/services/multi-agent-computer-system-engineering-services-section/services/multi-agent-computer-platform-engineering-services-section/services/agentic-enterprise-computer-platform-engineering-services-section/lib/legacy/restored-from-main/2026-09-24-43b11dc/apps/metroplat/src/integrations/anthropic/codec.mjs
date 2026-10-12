/**
 * @packageDocumentation
 *
 * integrations/anthropic/codec - Claude Code transcript admission.
 *
 * Claude Code transcript JSONL enters here as opaque JSON records. This codec
 * preserves each payload and only lifts local boundary marks observed in the
 * wire files: record index, source path provenance, top-level type, and literal
 * `message.role` when present.
 */
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { parseLines } from "@red-cup-engineering/jsonl-services-section";
import { agentEventChronicleContract } from "@red-cup-engineering/computer-networking-engineering-services-section/otlp-schema";

import { claimSessionContinuation, hostActClaimObservations } from "@red-cup-engineering/relating/running/session";
import { agentStatusReadout } from "../../claims/session.mjs";
import {
  chronicleRowRaw,
  chronicleSessionIdOf,
  chronicleUserTimes,
  chronicleWorkClaims,
  chronicleWorkReadFromChronicle,
  correctionComplianceObservations,

} from "../../work/chronicle.mjs";
import { claimSessionContinuationContract, claimSessionObservationBundleContract } from "@red-cup-engineering/relating/running/session-schema";
import { agentStatusReadoutContract } from "../../claims/schema.mjs";
import { toEavt, eavtRecord } from "@red-cup-engineering/eavt/row";

/** Options for reading one Claude Code transcript's content as claim-session material. */

/** Options for reading one Claude Code transcript's content as a status cut. */

function jsonClone(value) {
  return requireJsonValue(JSON.parse(JSON.stringify(value)), "Claude Code transcript payload");
}

function stringField(record, key) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) return undefined;
  const value = (record)[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function messageRole(record) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) return undefined;
  const message = (record)["message"];
  if (message === null || typeof message !== "object" || Array.isArray(message)) return undefined;
  const role = (message)["role"];
  return typeof role === "string" && role.length > 0 ? role : undefined;
}

const ANTHROPIC_BOUNDARY_ATTRIBUTE = "anthropic.protocol.boundary";

function recordString(payload, key) {
  return stringField(payload, key);
}

/**
 * Group one Claude Code transcript's records as a hub agent-event chronicle.
 *
 * A Claude Code session is a host presentation of the same OTLP agent-event
 * chronicle that Codex sessions present: boundary events recorded as EAVT
 * rows whose values carry the host record verbatim as `material.raw`. Every
 * chronicle-generic reading (work reads, continuation, status cuts, settling)
 * applies downstream of this one morphism.
 */
export function claudeCodeSessionChronicleFromJsonl(input) {
  const payloads = parseLines(input.content);
  const sessionId = input.sessionId
    ?? payloads.map((payload) => recordString(payload, "sessionId")).find((value) => value !== undefined);
  let lastSeenTime = input.at ?? "unknown-time";
  const statements = payloads.map((payload) => {
    const type = recordString(payload, "type") ?? "record";
    const at = recordString(payload, "timestamp") ?? lastSeenTime;
    lastSeenTime = at;
    const material = Object.freeze({
      kind: "anthropic.claude-code-transcript-event",
      type,
      raw: jsonClone(payload),
    });
    return toEavt({
      e: Object.freeze({ protocol: "anthropic", surface: "claude-code", ...(sessionId === undefined ? {} : { session: sessionId }), type }),
      a: ANTHROPIC_BOUNDARY_ATTRIBUTE,
      v: requireJsonValue(Object.freeze({
        material,
        ...(sessionId === undefined ? {} : { session: sessionId }),
        boundary: Object.freeze({ protocol: "anthropic", surface: "claude-code", event: type }),
        caller: input.caller ?? Object.freeze({ protocol: "anthropic", surface: "claude-code", ...(sessionId === undefined ? {} : { session: sessionId }) }),
      }), "Claude Code boundary value"),
      t: at,
    });
  });
  return agentEventChronicleContract.assert(Object.freeze({
    kind: "metroplat.codecs.text.json.otlp.agent-event-chronicle",
    feed: "anthropic-boundary",
    statements: Object.freeze(statements),
  }), "Claude Code session chronicle");
}

/** Admit one Claude Code JSONL transcript as opaque record material. */
export function claudeCodeTranscriptRecordsFromJsonl(input) {
  return Object.freeze(parseLines(input.content).map((payload, recordIndex) => {
    const type = stringField(payload, "type");
    const role = messageRole(payload);
    return Object.freeze({
      kind: "anthropic.claude-code.transcript-record",
      source: input.source,
      relative: input.relative,
      parentDirectory: input.parentDirectory,
      parentDirectoryName: input.parentDirectoryName,
      recordIndex,
      ...(type === undefined ? {} : { type }),
      ...(role === undefined ? {} : { role }),
      payload: jsonClone(payload),
    });
  }));
}

/* ── Claude Code authored-discourse restriction and host acts ───────────── */

/** Harness-injected wrapper blocks inside Claude Code message content. These are
 *  the host talking to the model (caveats, hook output, command echo, reminders),
 *  not anything the user or assistant uttered, so they are not authored prose. */
const HARNESS_BLOCK_PATTERN =
  /<(local-command-caveat|system-reminder|command-name|command-message|command-args|local-command-stdout|local-command-stderr|user-prompt-submit-hook|ide_selection|ide_opened_file|ide_diagnostics|task-notification)>[\s\S]*?<\/\1>/gu;

/** Host-injected interruption notices rendered as literal user-row text. */
const HARNESS_NOTICE_PATTERN = /^\[Request interrupted by user[^\]]*\]$/gmu;

function strippedAuthoredText(text) {
  const out = text.replace(HARNESS_BLOCK_PATTERN, "").replace(HARNESS_NOTICE_PATTERN, "").trim();
  return out.length === 0 ? undefined : out;
}

function authoredMessageText(row) {
  if (row === null || typeof row !== "object" || Array.isArray(row)) return undefined;
  const record = row;
  if (record["isMeta"] === true) return undefined;
  const type = record["type"];
  if (type !== "user" && type !== "assistant") return undefined;
  const message = record["message"];
  if (message === null || typeof message !== "object" || Array.isArray(message)) return undefined;
  const content = (message)["content"];
  if (typeof content === "string") return strippedAuthoredText(content);
  if (!Array.isArray(content)) return undefined;
  const texts = content.flatMap((block) => {
    if (block === null || typeof block !== "object" || Array.isArray(block)) return [];
    const b = block;
    if (b["type"] !== "text" || typeof b["text"] !== "string") return [];
    const stripped = strippedAuthoredText(b["text"]);
    return stripped === undefined ? [] : [stripped];
  });
  return texts.length > 0 ? texts.join("\n") : undefined;
}

/**
 * Restrict a Claude Code chronicle to authored prose before it reaches the
 * chronicle-generic work-item extractor. That reader scans every string
 * under a statement row's raw material for objective/obligation phrasing, and
 * a Claude Code row's raw is the whole transcript record — including
 * tool_use inputs and tool_result outputs, which routinely echo tool
 * descriptions full of "do not" / "only after" phrasing. Unfiltered, most
 * "obligations" a status cut reports are the tool catalog talking to
 * itself, not anything anyone said. This narrows what the work-read sees;
 * the artifact tier's raw stays intact.
 */
export function claudeSessionAuthoredChronicle(chronicle) {
  const statements = chronicle.statements.flatMap((row) => {
    const { e, a, v, t } = eavtRecord(row);
    if (v === null || typeof v !== "object" || Array.isArray(v) || !("material" in v)) return [];
    const envelope = v;
    const material = envelope["material"];
    if (material === null || typeof material !== "object" || Array.isArray(material)) return [];
    const materialRecord = material;
    const raw = materialRecord["raw"];
    if (raw === undefined) return [];
    const text = authoredMessageText(raw);
    if (text === undefined) return [];
    const filteredMaterial = Object.freeze({ ...materialRecord, raw: text });
    const filteredEnvelope = Object.freeze({ ...envelope, material: filteredMaterial });
    return [toEavt({ e, a, v: filteredEnvelope, t })];
  });
  return agentEventChronicleContract.assert(Object.freeze({
    ...chronicle,
    statements: Object.freeze(statements),
  }), "Claude session authored-text chronicle");
}

/** Read the host's own act/result pairing: tool_use blocks are act-claims, and the
 *  matching tool_result block is the outcome the transcript itself statements for
 *  each act — `is_error` marks the evidence as contradicting the act. */
export function claudeSessionHostActs(chronicle) {
  const acts = new Map();
  for (const row of chronicle.statements) {
    const raw = chronicleRowRaw(row);
    if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) continue;
    const record = raw;
    const message = record["message"];
    if (message === null || typeof message !== "object" || Array.isArray(message)) continue;
    const content = (message)["content"];
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block === null || typeof block !== "object" || Array.isArray(block)) continue;
      const b = block;
      if (b["type"] === "tool_use" && typeof b["id"] === "string") {
        const prior = acts.get(b["id"]);
        acts.set(b["id"], {
          name: typeof b["name"] === "string" && b["name"].length > 0 ? b["name"] : "tool",
          outcome: prior?.outcome ?? "unrecorded",
        });
      } else if (b["type"] === "tool_result" && typeof b["tool_use_id"] === "string") {
        const prior = acts.get(b["tool_use_id"]);
        acts.set(b["tool_use_id"], {
          name: prior?.name ?? "tool",
          outcome: b["is_error"] === true ? "errored" : "recorded",
        });
      }
    }
  }
  return Object.freeze([...acts.entries()].map(([id, act]) => Object.freeze({ id, name: act.name, outcome: act.outcome })));
}

/** Every `tool_use` block's recorded time of initiation and its name — the
 *  same block shape `claudeSessionHostActs` reads, kept with time instead of
 *  collapsed to act id/outcome, for `correctionComplianceObservations` to ask
 *  whether the acting changed around a correction. Time, not row position:
 *  `chronicleWorkReadFromChronicle` reads a text-only FILTERED view of this
 *  same chronicle (`claudeSessionAuthoredChronicle`), whose row numbers don't
 *  correspond to this raw view's — recorded time is the one coordinate both
 *  views agree on. */
export function claudeSessionHostActRows(chronicle) {
  const rows = [];
  chronicle.statements.forEach((row) => {
    const raw = chronicleRowRaw(row);
    if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) return;
    const record = raw;
    const message = record["message"];
    if (message === null || typeof message !== "object" || Array.isArray(message)) return;
    const content = (message)["content"];
    if (!Array.isArray(content)) return;
    const { t } = eavtRecord(row);
    for (const block of content) {
      if (block === null || typeof block !== "object" || Array.isArray(block)) continue;
      const b = block;
      if (b["type"] === "tool_use" && typeof b["name"] === "string" && b["name"].length > 0) {
        rows.push(Object.freeze({ at: String(t), name: b["name"] }));
      }
    }
  });
  return Object.freeze(rows);
}

/** Whether content presents Claude Code transcript rows: top-level `type` plus a
 *  `sessionId`/`uuid` host mark, with no Codex-style `payload` envelope. */
export function isClaudeSessionTranscriptContent(content) {
  const rows = jsonlHeadRows(content, 5);
  return rows.length > 0 && rows.some((row) => {
    if (row === null || typeof row !== "object" || Array.isArray(row)) return false;
    const record = row;
    return typeof record["type"] === "string"
      && !("payload" in record)
      && (typeof record["sessionId"] === "string" || typeof record["uuid"] === "string");
  });
}

function jsonlHeadRows(content, limit) {
  try {
    return parseLines(content).slice(0, limit);
  } catch {
    return Object.freeze([]);
  }
}

/** Admit one Claude Code transcript's content as the shared agent-event chronicle. */
export function claudeSessionChronicleOfContent(content, options = {}) {
  return claudeCodeSessionChronicleFromJsonl({
    content,
    ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
    ...(options.caller === undefined ? {} : { caller: options.caller }),
  });
}

/** Read one Claude Code transcript's content as charged claim-session material: authored
 *  goals and obligations, plus every tool act charged by its recorded result. */
export function claudeSessionWorkClaimsOfContent(
  content,
  options = {},
) {
  const chronicle = claudeSessionChronicleOfContent(content, options);
  const source = options.source ?? "claude-session";
  const workRead = chronicleWorkReadFromChronicle(claudeSessionAuthoredChronicle(chronicle), { source });
  const workBundle = chronicleWorkClaims(workRead, {
    ...(options.claimSessionId === undefined ? {} : { sessionId: options.claimSessionId }),
    ...(options.at === undefined ? {} : { at: options.at }),
    source,
  });
  const sessionId = options.claimSessionId ?? workBundle.sessionId ?? chronicleSessionIdOf(chronicle) ?? "claude-session";
  const acts = claudeSessionHostActs(chronicle);
  const lastObservation = workBundle.observations[workBundle.observations.length - 1];
  const fold = hostActClaimObservations({
    sessionId,
    source,
    protocol: "anthropic",
    surface: "claude-code",
    acts,
    ...(lastObservation === undefined ? {} : { initialSession: lastObservation.session }),
    ...(options.at === undefined ? {} : { at: options.at }),
  });
  const errored = acts.filter((act) => act.outcome === "errored").length;
  const lastFoldObservation = fold.observations[fold.observations.length - 1];
  const compliance = correctionComplianceObservations({
    sessionId,
    source,
    protocol: "anthropic",
    surface: "claude-code",
    read: workRead,
    userTimes: chronicleUserTimes(chronicle),
    acts: claudeSessionHostActRows(chronicle),
    ...(lastFoldObservation === undefined ? { initialSession: fold.session } : { initialSession: lastFoldObservation.session }),
    ...(options.at === undefined ? {} : { at: options.at }),
  });
  return claimSessionObservationBundleContract.assert(Object.freeze({
    kind: "metroplat.claim-session.observation-bundle",
    sessionId,
    source,
    observations: Object.freeze([...workBundle.observations, ...fold.observations, ...compliance.observations]),
    evidence: Object.freeze([
      ...workBundle.evidence,
      `acts:${acts.length}`,
      `acts-errored:${errored}`,
      `correction-compliance-checked:${compliance.observations.length}`,
    ]),
  }), "Claude session work claims");
}

/** Read one Claude Code transcript's content as claim-session continuation material. */
export function claudeSessionContinuationOfContent(
  content,
  options = {},
) {
  return claimSessionContinuationContract.assert(
    claimSessionContinuation(claudeSessionWorkClaimsOfContent(content, options)),
    "Claude session continuation",
  );
}

/** Read one Claude Code transcript's content as agent handoff/status-cut material. */
export function claudeSessionStatusReadoutOfContent(
  content,
  options = {},
) {
  return agentStatusReadoutContract.assert(
    agentStatusReadout({
      source: options.source ?? "claude-session",
      continuation: claudeSessionContinuationOfContent(content, options),
      ...(options.readiness === undefined ? {} : { readiness: options.readiness }),
    }),
    "Claude session status cut",
  );
}
