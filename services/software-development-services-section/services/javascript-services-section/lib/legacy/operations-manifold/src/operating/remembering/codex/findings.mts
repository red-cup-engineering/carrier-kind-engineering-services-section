import { finding, recallStatus, type Finding } from "@emsenn/organizing-with-openai-codex/session";
import { charge, chargeValue, isChargeValueName, valueOf, type ChargeValueName } from "@emsenn/relating";
import type { EAVT, JsonValue } from "@emsenn/relating/writing";

import { hash, isRecord, optionalText, requireText, stringList, stringOf } from "../../../records.mts";
import {
  appendEavtLog,
  ensureEavtLogStateDirs,
  operationsManifoldEavtLogState,
  readEavtLog,
  writeJsonState,
  type EavtLogStatePaths,
} from "../../recording/events/stating/library/eavt-log-state.mts";

const CODEX_FINDINGS_LOG_STATE: EavtLogStatePaths = operationsManifoldEavtLogState("codex-findings");
export const CODEX_FINDINGS_LOG_RELATIVE = CODEX_FINDINGS_LOG_STATE.log;
export const CODEX_FINDINGS_STATE_RELATIVE = CODEX_FINDINGS_LOG_STATE.state;

export type FindingParams = Readonly<{
  session?: string | undefined;
  session_id?: string | undefined;
  subject?: string | readonly string[] | undefined;
  predicate?: string | undefined;
  charge?: string | undefined;
  value?: string | undefined;
  object?: unknown;
  note?: unknown;
  evidence?: string | readonly string[] | undefined;
  focus?: string | undefined;
  intent?: string | undefined;
  trace?: string | undefined;
  source?: string | undefined;
}>;

export type FindingRecord = Readonly<{
  kind: "operations-manifold.codex.finding";
  id: string;
  eventId: string;
  at: string;
  session: string;
  subject: readonly string[];
  subjectKey: string;
  predicate: string;
  charge: ChargeValueName;
  object: JsonValue | null;
  note: JsonValue | null;
  focus: string | null;
  intent: string | null;
  trace: string | null;
  evidence: readonly string[];
  upstream: Finding;
}>;

export type FindingSnapshot = Readonly<{
  kind: "operations-manifold.codex.findings";
  generatedAt: string;
  log: string;
  state: string;
  eventCount: number;
  findings: readonly FindingRecord[];
  recall: readonly Readonly<{ session: string; subject: readonly string[]; subjectKey: string; charge: ChargeValueName }>[]; 
}>;

export type FindingRecordResult = Readonly<{
  kind: "operations-manifold.record-codex-finding";
  accepted: true;
  event: EAVT;
  eavtJsonl: string;
  finding: FindingRecord;
  snapshot: FindingSnapshot;
}>;

type FindingEventValue = Readonly<{
  kind: "operations-manifold.codex.finding.event";
  event: "recorded";
  eventId: string;
  at: string;
  session: string;
  subject: readonly string[];
  predicate: string;
  charge: ChargeValueName;
  object?: JsonValue;
  note?: JsonValue;
  focus?: string;
  intent?: string;
  trace?: string;
  evidence?: readonly string[];
  source?: string;
}>;

export async function recordFinding(repoRoot: string, params: FindingParams): Promise<FindingRecordResult> {
  const now = new Date().toISOString();
  const session = requireText(params.session ?? params.session_id, "codex finding session");
  const subject = subjectTerms(params.subject);
  if (subject.length === 0) throw new TypeError("codex finding subject is required");
  const predicate = requireText(params.predicate, "codex finding predicate");
  const chargeName = chargeNameFor(params.charge ?? params.value);
  const focus = optionalText(params.focus);
  const intent = optionalText(params.intent);
  const trace = optionalText(params.trace);
  const evidence = stringList(params.evidence);
  const object = jsonOrNull(params.object);
  const note = jsonOrNull(params.note);
  const eventSeed = { session, subject, predicate, chargeName, object, note, focus, intent, trace, evidence, now };
  const eventId = `codex-finding-event:${hash(eventSeed).slice(0, 24)}`;
  const id = `codex-finding:${slugSubject(subject)}:${hash(eventSeed).slice(0, 12)}`;
  const event = codexFindingEavt(id, {
    kind: "operations-manifold.codex.finding.event",
    event: "recorded",
    eventId,
    at: now,
    session,
    subject,
    predicate,
    charge: chargeName,
    ...(object === null ? {} : { object }),
    ...(note === null ? {} : { note }),
    ...(focus === null ? {} : { focus }),
    ...(intent === null ? {} : { intent }),
    ...(trace === null ? {} : { trace }),
    ...(evidence.length === 0 ? {} : { evidence }),
    source: optionalText(params.source) ?? "operations-manifold.record-codex-finding",
  });

  await ensureFindingDirs(repoRoot);
  const eavtJsonl = await appendFindingEvent(repoRoot, event);
  const snapshot = await refreshFindings(repoRoot);
  const record = snapshot.findings.find((item) => item.id === id);
  if (record === undefined) throw new Error(`codex finding was not projected: ${id}`);
  return Object.freeze({ kind: "operations-manifold.record-codex-finding" as const, accepted: true as const, event, eavtJsonl, finding: record, snapshot });
}

export async function readFindings(repoRoot: string): Promise<FindingSnapshot> {
  await ensureFindingDirs(repoRoot);
  return refreshFindings(repoRoot);
}

export async function refreshFindings(repoRoot: string): Promise<FindingSnapshot> {
  const events = await readFindingLog(repoRoot);
  const snapshot = foldFindingEvents(events);
  await writeFindingSnapshot(repoRoot, snapshot);
  return snapshot;
}

function foldFindingEvents(events: readonly EAVT[]): FindingSnapshot {
  const records: FindingRecord[] = [];
  for (const event of events) {
    const entity = stringOf(event[0]);
    const attr = stringOf(event[1]);
    const value = codexFindingEventValue(event[2]);
    if (entity === null || attr !== "operations-manifold.codex.finding.recorded" || value === null) continue;
    const upstream = finding({
      session: value.session,
      subject: value.subject,
      predicate: value.predicate,
      charge: charge(chargeValue(value.charge)),
      ...(value.object === undefined ? {} : { object: value.object }),
      ...(value.note === undefined ? {} : { note: value.note }),
      at: value.at,
    });
    records.push(Object.freeze({
      kind: "operations-manifold.codex.finding" as const,
      id: entity,
      eventId: value.eventId,
      at: value.at,
      session: value.session,
      subject: Object.freeze([...value.subject]),
      subjectKey: subjectKey(value.subject),
      predicate: value.predicate,
      charge: valueOf(upstream.charge).name,
      object: value.object ?? null,
      note: value.note ?? null,
      focus: value.focus ?? null,
      intent: value.intent ?? null,
      trace: value.trace ?? null,
      evidence: Object.freeze([`${CODEX_FINDINGS_LOG_RELATIVE}#${value.eventId}`, ...(value.evidence ?? [])]),
      upstream,
    }));
  }
  const findings = Object.freeze(records.sort((left, right) => right.at.localeCompare(left.at)));
  return Object.freeze({
    kind: "operations-manifold.codex.findings" as const,
    generatedAt: new Date().toISOString(),
    log: CODEX_FINDINGS_LOG_RELATIVE,
    state: CODEX_FINDINGS_STATE_RELATIVE,
    eventCount: events.length,
    findings,
    recall: recallRows(findings),
  });
}

function recallRows(records: readonly FindingRecord[]): FindingSnapshot["recall"] {
  const subjects = new Map<string, Readonly<{ session: string; subject: readonly string[] }>>();
  for (const record of records) subjects.set(JSON.stringify([record.session, record.subjectKey]), Object.freeze({ session: record.session, subject: record.subject }));
  return Object.freeze([...subjects.values()].map(({ session, subject }) => {
    const scoped = records.filter((record) => record.session === session).map((record) => record.upstream);
    return Object.freeze({ session, subject, subjectKey: subjectKey(subject), charge: recallStatus(scoped, subject) });
  }).sort((left, right) => left.session.localeCompare(right.session) || left.subjectKey.localeCompare(right.subjectKey)));
}

function codexFindingEavt(entity: string, value: FindingEventValue): EAVT {
  return Object.freeze([
    entity,
    "operations-manifold.codex.finding.recorded",
    value as unknown as JsonValue,
    Object.freeze({ at: value.at, eventId: value.eventId }) as JsonValue,
  ]);
}

async function appendFindingEvent(repoRoot: string, event: EAVT): Promise<string> {
  return appendEavtLog(repoRoot, CODEX_FINDINGS_LOG_STATE, [event]);
}

async function readFindingLog(repoRoot: string): Promise<readonly EAVT[]> {
  return readEavtLog(repoRoot, CODEX_FINDINGS_LOG_STATE);
}

async function writeFindingSnapshot(repoRoot: string, snapshot: FindingSnapshot): Promise<void> {
  return writeJsonState(repoRoot, CODEX_FINDINGS_LOG_STATE, snapshot);
}

async function ensureFindingDirs(repoRoot: string): Promise<void> {
  return ensureEavtLogStateDirs(repoRoot, CODEX_FINDINGS_LOG_STATE);
}

function codexFindingEventValue(value: JsonValue): FindingEventValue | null {
  if (!isRecord(value) || value["kind"] !== "operations-manifold.codex.finding.event" || value["event"] !== "recorded") return null;
  const eventId = value["eventId"];
  const at = value["at"];
  const session = value["session"];
  const subject = Array.isArray(value["subject"]) ? value["subject"].filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
  const predicate = value["predicate"];
  const chargeName = typeof value["charge"] === "string" && isChargeValueName(value["charge"]) ? value["charge"] : null;
  if (typeof eventId !== "string" || typeof at !== "string" || typeof session !== "string" || subject.length === 0 || typeof predicate !== "string" || chargeName === null) return null;
  return Object.freeze({
    kind: "operations-manifold.codex.finding.event" as const,
    event: "recorded" as const,
    eventId,
    at,
    session,
    subject: Object.freeze(subject),
    predicate,
    charge: chargeName,
    ...(value["object"] === undefined ? {} : { object: value["object"] }),
    ...(value["note"] === undefined ? {} : { note: value["note"] }),
    ...(typeof value["focus"] === "string" ? { focus: value["focus"] } : {}),
    ...(typeof value["intent"] === "string" ? { intent: value["intent"] } : {}),
    ...(typeof value["trace"] === "string" ? { trace: value["trace"] } : {}),
    ...(Array.isArray(value["evidence"]) ? { evidence: Object.freeze(value["evidence"].filter((item): item is string => typeof item === "string")) } : {}),
    ...(typeof value["source"] === "string" ? { source: value["source"] } : {}),
  });
}

function subjectTerms(value: string | readonly string[] | undefined): readonly string[] {
  if (Array.isArray(value)) return Object.freeze(value.map(String).map((item) => item.trim()).filter((item) => item !== ""));
  return Object.freeze(stringList(value).flatMap((item) => item.split("/")).map((item) => item.trim()).filter((item) => item !== ""));
}

function subjectKey(subject: readonly string[]): string {
  return subject.join("/");
}

function slugSubject(subject: readonly string[]): string {
  return subjectKey(subject).toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 56) || "subject";
}

function chargeNameFor(value: string | undefined): ChargeValueName {
  const name = optionalText(value) ?? "potential";
  if (!isChargeValueName(name)) throw new TypeError(`codex finding charge must be one of absurd, potential, active, stable: ${name}`);
  return name;
}

function jsonOrNull(value: unknown): JsonValue | null {
  return value === undefined ? null : JSON.parse(JSON.stringify(value)) as JsonValue;
}
