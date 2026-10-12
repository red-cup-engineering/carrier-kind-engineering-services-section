/** Translate admitted agent-event chronicles into canonical work material. */
import {
  chargeValue,
  chargeValueName,
  joinKnowledgeValue,
  type ChargeValueName,
} from "../lib/values/index.mts";
import { contentSlug } from "../lib/addressing/slug.mts";
import type { StatementCoordinate } from "../lib/records/persistence.mts";
import { eavtObject, type EAVT } from "../lib/codecs/json/jsonl/eavt/index.mts";
import { falseClosureClaim, FALSE_CLOSURE_WARNING, classifyCorrectionCue } from "../lib/codecs/english/index.mts";
import type { JsonValue } from "../lib/codecs/json/core.mts";
import type { AgentEventChronicle } from "../lib/codecs/json/otlp.mts";
import { agentEventChronicleContract } from "../lib/codecs/json/otlp-schema.mts";
import {
  claim,
  openSession,
  sessionJudgement,
  type ClaimSessionObservation,
  type ClaimSessionObservationBundle,
  type Session,
} from "../claims/session.mts";
import { chronicleWorkReadContract } from "./schema.mts";
import { scopeOf } from "./model.mts";

export interface ChronicleWorkItem {
  readonly kind: "metroplat.chronicle-work-item";
  readonly role: "goal" | "obligation";
  readonly sessionId?: string;
  readonly source: string;
  readonly text: string;
  readonly evidence: readonly string[];
}

export interface ChronicleWorkRead {
  readonly kind: "metroplat.chronicle-work-read";
  readonly sessionId?: string;
  readonly source: string;
  readonly protocol?: string;
  readonly surface?: string;
  readonly goals: number;
  readonly obligations: number;
  readonly items: readonly ChronicleWorkItem[];
  readonly evidence: readonly string[];
}

export interface ChronicleWorkReadOptions { readonly source?: string }

export interface ChronicleWorkClaimsOptions {
  readonly source?: string;
  readonly sessionId?: string;
  readonly initialSession?: Session;
  readonly at?: StatementCoordinate;
}

function slug(value: string): string {
  return contentSlug(value, "mark");
}

function nonempty(value: string, label: string): string {
  if (value.trim().length === 0) throw new TypeError(`${label}: expected a non-empty string`);
  return value;
}

export function chronicleSessionIdOf(chronicle: AgentEventChronicle): string | undefined {
  for (const row of chronicle.statements) {
    const entity = row[0];
    if (entity !== null && typeof entity === "object" && !Array.isArray(entity)) {
      const session = (entity as { readonly session?: unknown }).session;
      if (typeof session === "string" && session.length > 0) return session;
    }
  }
  return undefined;
}

export function chronicleRowRaw(row: EAVT): JsonValue | undefined {
  const { v } = eavtObject(row);
  if (v === null || typeof v !== "object" || Array.isArray(v) || !("material" in v)) return undefined;
  const material = (v as { readonly material: JsonValue }).material;
  if (material === null || typeof material !== "object" || Array.isArray(material)) return undefined;
  return (material as Readonly<Record<string, JsonValue>>)["raw"];
}

function stringsFromJson(value: JsonValue): readonly string[] {
  if (typeof value === "string") return Object.freeze([value]);
  if (value === null) return Object.freeze([]);
  if (Array.isArray(value)) return Object.freeze(value.flatMap(stringsFromJson));
  return Object.freeze(Object.values(value).flatMap(stringsFromJson));
}

function objectiveTexts(text: string): readonly string[] {
  const matches = [...text.matchAll(/<objective>\s*([\s\S]*?)\s*<\/objective>/gu)]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => value !== undefined && value.length > 0);
  const slashGoal = text.split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("/goal "))
    .map((line) => line.slice("/goal ".length).trim())
    .filter((line) => line.length > 0);
  return Object.freeze([...matches, ...slashGoal]);
}

function obligationTexts(text: string): readonly string[] {
  return Object.freeze(text.split(/\r?\n/u)
    .map((line) => line.trim().replace(/^[-*]\s+/u, ""))
    .filter((line) => /(^|\b)(must|required|obligation|do not|only after|before proposing|verify with|close the loop|remains unearned)(\b|$)/iu.test(line))
    .filter((line) => line.length > 0));
}

function falseClosureTexts(text: string): readonly string[] {
  return falseClosureClaim(text).matched ? Object.freeze([FALSE_CLOSURE_WARNING]) : Object.freeze([]);
}

const CORRECTION_OBLIGATION_TEXT =
  "This turn's utterance read as a correction (repeated negation, ALL-CAPS emphasis, or heavy exclamation) — " +
  "verify the very next action visibly differs; do not restate agreement or re-argue the premise " +
  "(CLAUDE.md evidenced failure modes #1, #9).";

function correctionTexts(text: string): readonly string[] {
  return classifyCorrectionCue(text).matched ? Object.freeze([CORRECTION_OBLIGATION_TEXT]) : Object.freeze([]);
}

function dedupeKey(item: ChronicleWorkItem): string {
  const perOccurrence = item.evidence.includes("correction-claim") || item.evidence.includes("false-closure-claim");
  return perOccurrence ? `${item.role}\n${item.text}\n${item.evidence.join(",")}` : `${item.role}\n${item.text}`;
}

function dedupeItems(items: readonly ChronicleWorkItem[]): readonly ChronicleWorkItem[] {
  const seen = new Set<string>();
  const out: ChronicleWorkItem[] = [];
  for (const item of items) {
    const key = dedupeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return Object.freeze(out);
}

/** Read explicit goals and obligations from any admitted agent-event chronicle. */
export function chronicleWorkReadFromChronicle(
  chronicle: AgentEventChronicle,
  options: ChronicleWorkReadOptions = {},
): ChronicleWorkRead {
  const admitted = agentEventChronicleContract.assert(chronicle, "chronicle work read chronicle") as AgentEventChronicle;
  const source = options.source ?? `agent-event-chronicle:${admitted.feed}`;
  const sessionId = chronicleSessionIdOf(admitted);
  const items: ChronicleWorkItem[] = [];
  let hostProtocol: string | undefined;
  let hostSurface: string | undefined;
  admitted.statements.forEach((row, rowIndex) => {
    const { v: envelope, t: rowTime } = eavtObject(row);
    if (envelope === null || typeof envelope !== "object" || Array.isArray(envelope) || !("material" in envelope)) return;
    const value = (envelope as { readonly material: JsonValue }).material;
    if (value === null || typeof value !== "object" || Array.isArray(value)) return;
    const raw = (value as Readonly<Record<string, JsonValue>>)["raw"];
    if (raw === undefined) return;
    const boundary = (envelope as Readonly<Record<string, JsonValue>>)["boundary"];
    let boundaryEvent: string | undefined;
    if (boundary !== null && typeof boundary === "object" && !Array.isArray(boundary)) {
      const stamped = boundary as Readonly<Record<string, JsonValue>>;
      boundaryEvent = typeof stamped["event"] === "string" ? stamped["event"] : undefined;
      if (hostProtocol === undefined && typeof stamped["protocol"] === "string") hostProtocol = stamped["protocol"];
      if (hostSurface === undefined && typeof stamped["surface"] === "string") hostSurface = stamped["surface"];
    }
    if (boundaryEvent === "user") {
      const utterance = stringsFromJson(raw).map((text) => text.trim()).filter((text) => text.length > 0).join("\n");
      if (utterance.length > 0) items.push(Object.freeze({
        kind: "metroplat.chronicle-work-item" as const,
        role: "goal" as const,
        ...(sessionId === undefined ? {} : { sessionId }),
        source,
        text: utterance,
        evidence: Object.freeze([`row:${rowIndex + 1}`, "user-utterance"]),
      }));
    }
    for (const text of stringsFromJson(raw)) {
      for (const goal of objectiveTexts(text)) items.push(Object.freeze({
        kind: "metroplat.chronicle-work-item" as const,
        role: "goal" as const,
        ...(sessionId === undefined ? {} : { sessionId }),
        source,
        text: nonempty(goal, "chronicle work-read goal"),
        evidence: Object.freeze([`row:${rowIndex + 1}`, "objective"]),
      }));
      for (const obligation of obligationTexts(text)) items.push(Object.freeze({
        kind: "metroplat.chronicle-work-item" as const,
        role: "obligation" as const,
        ...(sessionId === undefined ? {} : { sessionId }),
        source,
        text: nonempty(obligation, "chronicle work-read obligation"),
        evidence: Object.freeze([`row:${rowIndex + 1}`, "obligation-text"]),
      }));
      for (const warning of falseClosureTexts(text)) items.push(Object.freeze({
        kind: "metroplat.chronicle-work-item" as const,
        role: "obligation" as const,
        ...(sessionId === undefined ? {} : { sessionId }),
        source,
        text: nonempty(warning, "chronicle work-read false-closure obligation"),
        evidence: Object.freeze([`row:${rowIndex + 1}`, "false-closure-claim"]),
      }));
      if (boundaryEvent === "user") for (const warning of correctionTexts(text)) items.push(Object.freeze({
        kind: "metroplat.chronicle-work-item" as const,
        role: "obligation" as const,
        ...(sessionId === undefined ? {} : { sessionId }),
        source,
        text: nonempty(warning, "chronicle work-read correction obligation"),
        evidence: Object.freeze([`row:${rowIndex + 1}`, "correction-claim", `at:${String(rowTime)}`]),
      }));
    }
  });
  const deduped = dedupeItems(items);
  const goals = deduped.filter((item) => item.role === "goal").length;
  const obligations = deduped.filter((item) => item.role === "obligation").length;
  return chronicleWorkReadContract.assert(Object.freeze({
    kind: "metroplat.chronicle-work-read" as const,
    ...(sessionId === undefined ? {} : { sessionId }),
    source,
    ...(hostProtocol === undefined ? {} : { protocol: hostProtocol }),
    ...(hostSurface === undefined ? {} : { surface: hostSurface }),
    goals,
    obligations,
    items: deduped,
    evidence: Object.freeze([
      `chronicle:${admitted.feed}`,
      `rows:${admitted.statements.length}`,
      `goals:${goals}`,
      `obligations:${obligations}`,
    ]),
  }), "chronicle work read") as ChronicleWorkRead;
}

function workItemCell(protocol: string, surface: string, sessionId: string, item: ChronicleWorkItem, index: number): string {
  return scopeOf("work-item", `${protocol}/${surface}/session/${slug(sessionId)}/work/${item.role}/${String(index + 1).padStart(4, "0")}`);
}

/** Project interpreted work items through the ordinary claim-session carrier. */
export function chronicleWorkClaims(
  read: ChronicleWorkRead,
  options: ChronicleWorkClaimsOptions = {},
): ClaimSessionObservationBundle {
  const source = options.source ?? read.source;
  const sessionId = options.sessionId ?? read.sessionId ?? "openai-codex-session";
  const protocol = read.protocol ?? "openai";
  const surface = read.surface ?? "codex";
  let session = options.initialSession ?? openSession();
  const observations = read.items.map((item, index) => {
    const accepted = Object.freeze({ cell: workItemCell(protocol, surface, sessionId, item, index), charge: "held" as const });
    session = claim(session, accepted.cell, accepted.charge);
    return Object.freeze({
      sessionId,
      transport: "claim-session" as const,
      claim: accepted,
      session,
      judgement: sessionJudgement(session),
      at: options.at ?? Object.freeze({ source, item: index + 1 }),
      boundary: Object.freeze({
        protocol,
        surface,
        operation: "session-work-read",
        role: item.role,
        source: item.source,
        text: item.text,
        evidence: Object.freeze([...item.evidence]),
      }),
      caller: Object.freeze({ protocol, surface, session: sessionId }),
    });
  });
  return Object.freeze({
    kind: "metroplat.claim-session.observation-bundle" as const,
    sessionId,
    source,
    observations: Object.freeze(observations),
    evidence: Object.freeze([
      `work-read:${source}`,
      `items:${read.items.length}`,
      `goals:${read.goals}`,
      `obligations:${read.obligations}`,
    ]),
  });
}

export function chronicleUserTimes(chronicle: AgentEventChronicle): readonly string[] {
  const admitted = agentEventChronicleContract.assert(chronicle, "chronicle user times chronicle") as AgentEventChronicle;
  const times: string[] = [];
  admitted.statements.forEach((row) => {
    const { v: envelope, t } = eavtObject(row);
    if (envelope === null || typeof envelope !== "object" || Array.isArray(envelope)) return;
    const boundary = (envelope as Readonly<Record<string, JsonValue>>)["boundary"];
    if (boundary === null || typeof boundary !== "object" || Array.isArray(boundary)) return;
    if ((boundary as Readonly<Record<string, JsonValue>>)["event"] === "user") times.push(String(t));
  });
  return Object.freeze(times);
}

export interface HostActRow { readonly at: string; readonly name: string }

export interface CorrectionComplianceFoldInput {
  readonly sessionId: string;
  readonly source: string;
  readonly protocol: string;
  readonly surface: string;
  readonly read: ChronicleWorkRead;
  readonly userTimes: readonly string[];
  readonly acts: readonly HostActRow[];
  readonly initialSession?: Session;
  readonly at?: StatementCoordinate;
}

function turnBoundaryAround(userTimes: readonly string[], at: string): { readonly prev: string; readonly next: string } {
  let prev = "";
  let next = "9999-12-31T23:59:59.999Z";
  for (const userTime of userTimes) {
    if (userTime < at && userTime > prev) prev = userTime;
    if (userTime > at && userTime < next) next = userTime;
  }
  return Object.freeze({ prev, next });
}

function toolNameSet(acts: readonly HostActRow[], after: string, before: string): ReadonlySet<string> {
  return new Set(acts.filter((act) => act.at > after && act.at < before).map((act) => act.name));
}

/** Settle correction obligations from subsequent host-act evidence. */
export function correctionComplianceObservations(
  input: CorrectionComplianceFoldInput,
): { readonly observations: readonly ClaimSessionObservation[]; readonly session: Session } {
  let session = input.initialSession ?? openSession();
  const observations: ClaimSessionObservation[] = [];
  const caller = Object.freeze({ protocol: input.protocol, surface: input.surface, session: input.sessionId });
  const byCell = new Map<string, ChargeValueName>();
  let conflictCells = 0;
  let item = 0;
  const push = (cell: string, charge: ChargeValueName, text: string, evidence: readonly string[]): void => {
    session = claim(session, cell, charge);
    const prior = byCell.get(cell);
    const verdict = prior === undefined ? charge : chargeValueName(joinKnowledgeValue(chargeValue(prior), chargeValue(charge)));
    if (verdict === "contested" && prior !== "contested") conflictCells += 1;
    byCell.set(cell, verdict);
    item += 1;
    observations.push(Object.freeze({
      sessionId: input.sessionId,
      transport: "claim-session" as const,
      claim: Object.freeze({ cell, charge }),
      session,
      judgement: Object.freeze({
        judgement: Object.freeze({ [cell]: verdict }),
        conflicts: verdict === "contested" ? Object.freeze([cell]) : Object.freeze([]),
        regime: conflictCells > 0 ? "transfinite" as const : "scott" as const,
      }),
      at: input.at ?? Object.freeze({ source: input.source, item }),
      boundary: Object.freeze({
        protocol: input.protocol,
        surface: input.surface,
        operation: "correction-compliance-read",
        role: "obligation",
        source: input.source,
        text,
        evidence: Object.freeze([...evidence]),
      }),
      caller,
    }));
  };
  input.read.items.forEach((workItem, index) => {
    if (workItem.role !== "obligation" || !workItem.evidence.includes("correction-claim")) return;
    const atTag = workItem.evidence.find((entry) => entry.startsWith("at:"));
    if (atTag === undefined) return;
    const at = atTag.slice("at:".length);
    const { prev, next } = turnBoundaryAround(input.userTimes, at);
    const before = toolNameSet(input.acts, prev, at);
    const after = toolNameSet(input.acts, at, next);
    if (after.size === 0) return;
    const changed = after.size !== before.size || [...after].some((name) => !before.has(name));
    const cell = workItemCell(input.protocol, input.surface, input.sessionId, workItem, index);
    if (!byCell.has(cell)) byCell.set(cell, "held");
    const text = `compliance:${workItem.text.slice(0, 60)}`;
    push(cell, changed ? "held" : "denied", text, Object.freeze([`at:${at}`, `correction-compliance:${changed ? "changed" : "unchanged"}`]));
  });
  return Object.freeze({ observations: Object.freeze(observations), session });
}
