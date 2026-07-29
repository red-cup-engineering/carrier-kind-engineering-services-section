/**
 * opinions — the agent's fiber of intuitions, desires, guidance, and feedback,
 * held as a relating CONTROL of charged norms and measured against plans/tasks
 * via relating's analysis/differential.
 *
 * An opinion is one Norm: a claim the operator asserts a good subject (plan,
 * task, design) satisfies, within scopes, carried with a kind (what speech-act
 * it is), a stance (favor / disfavor / note), and a severity (how firmly it
 * binds). The held opinions form the Control. Measuring a subject reads, per
 * applicable norm, a bilattice CHARGE — potential (holds), active (diverges),
 * stable (diverges under a declared allowance), absurd (no evidence yet) — not
 * a pass/fail. Opinions are operator evidence at recognition's `sense` tier;
 * the system never invents them, it admits them and projects the differential.
 *
 * Persistence mirrors goals.mts: an append-only EAVT log folded to a snapshot.
 */
import { differential } from "@emsenn/relating/analysis";
import type { EAVT, JsonValue } from "@emsenn/relating/writing";

import {
  appendEavtLog,
  ensureEavtLogStateDirs,
  operationsManifoldEavtLogState,
  readEavtLog,
  writeJsonState,
  type EavtLogStatePaths,
} from "./operating/recording/events/stating/library/eavt-log-state.mts";
import { hash, isRecord, jsonValue, maxIso, optionalText, requireText, slug, stringList, stringOf } from "./records.mts";

/** The speech-act an opinion is — what kind of operator input it records. */
export type OpinionKind = "intuition" | "desire" | "guidance" | "feedback" | "constraint";

/** The direction an opinion pulls a measured subject. */
export type OpinionStance = "favor" | "disfavor" | "note";

export type OpinionStatus = "held" | "withdrawn";

/** The bilattice charge a differential finding carries (relating's vocabulary). */
export type OpinionCharge = "potential" | "active" | "stable" | "absurd";
type Control = differential.Control;
type Finding = differential.Finding;
type Norm = differential.Norm;
type Severity = differential.Severity;
const { control, finding, normsFor } = differential;

export type OpinionRecord = Readonly<{
  id: string;
  kind: OpinionKind;
  stance: OpinionStance;
  severity: Severity;
  scopes: readonly string[];
  claim: string;
  /** the probe by which the norm is measured; default "judgment". */
  way: string;
  status: OpinionStatus;
  at: string;
  updatedAt: string;
  source: string;
}>;

export type OpinionSnapshot = Readonly<{
  kind: "operations-manifold.opinions";
  generatedAt: string;
  opinions: readonly OpinionRecord[];
  scopes: readonly string[];
  updatedAt: string | null;
}>;

export type OpinionIntakeParams = Readonly<{
  text?: string | undefined;
  q?: string | undefined;
  claim?: string | undefined;
  kind?: string | undefined;
  stance?: string | undefined;
  severity?: string | undefined;
  scope?: string | readonly string[] | undefined;
  scopes?: string | readonly string[] | undefined;
  way?: string | undefined;
  source?: string | undefined;
}>;

export type OpinionIntakeResult = Readonly<{
  kind: "operations-manifold.opinions.intake";
  accepted: true;
  opinion: OpinionRecord;
  eavtJsonl: string;
  snapshot: OpinionSnapshot;
}>;

export type OpinionAssessment = Readonly<{
  id: string;
  charge: OpinionCharge;
  message?: string | undefined;
  evidence?: readonly string[] | undefined;
}>;

export type OpinionMeasurementParams = Readonly<{
  subject?: string | undefined;
  text?: string | undefined;
  q?: string | undefined;
  scope?: string | undefined;
  assessments?: unknown;
}>;

export type OpinionMeasurement = Readonly<{
  kind: "operations-manifold.measure-opinions";
  generatedAt: string;
  subject: string;
  scope: string | null;
  findings: readonly Finding[];
  unassessed: readonly string[];
  control: readonly Norm[];
}>;

const OPINION_LOG_STATE: EavtLogStatePaths = operationsManifoldEavtLogState("opinions");

const OPINION_KINDS: ReadonlySet<OpinionKind> = new Set(["intuition", "desire", "guidance", "feedback", "constraint"]);
const OPINION_STANCES: ReadonlySet<OpinionStance> = new Set(["favor", "disfavor", "note"]);
const OPINION_SEVERITIES: ReadonlySet<Severity> = new Set(["error", "warning", "info"]);
const OPINION_CHARGES: ReadonlySet<OpinionCharge> = new Set(["potential", "active", "stable", "absurd"]);

function opinionKindOf(value: string | undefined): OpinionKind {
  const text = optionalText(value);
  return text !== null && OPINION_KINDS.has(text as OpinionKind) ? (text as OpinionKind) : "guidance";
}

function opinionStanceOf(value: string | undefined): OpinionStance {
  const text = optionalText(value);
  return text !== null && OPINION_STANCES.has(text as OpinionStance) ? (text as OpinionStance) : "favor";
}

/** Severity is the binding strength; default leans on the kind (constraints bind hardest). */
function severityOf(value: string | undefined, kind: OpinionKind): Severity {
  const text = optionalText(value);
  if (text !== null && OPINION_SEVERITIES.has(text as Severity)) return text as Severity;
  if (kind === "constraint" || kind === "guidance") return "warning";
  if (kind === "feedback") return "info";
  return "info";
}

function textList(value: unknown): readonly string[] {
  const input = typeof value === "string"
    ? value
    : Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : undefined;
  return Object.freeze(stringList(input).map((item) => item.trim()).filter((item) => item !== ""));
}

function scopesOf(value: unknown): readonly string[] {
  const scopes = textList(value);
  return Object.freeze(scopes.length === 0 ? ["*"] : [...new Set(scopes)]);
}

/** Read a field off an admitted record value, coalescing absence to JSON null. */
function field(record: Readonly<Record<string, JsonValue>>, key: string): JsonValue {
  return record[key] ?? null;
}

function chargeOf(value: JsonValue | undefined): OpinionCharge | null {
  return typeof value === "string" && OPINION_CHARGES.has(value as OpinionCharge) ? (value as OpinionCharge) : null;
}

export async function intakeOpinion(repoRoot: string, params: OpinionIntakeParams): Promise<OpinionIntakeResult> {
  const now = new Date().toISOString();
  const claim = requireText(params.claim ?? params.text ?? params.q, "opinion text");
  const kind = opinionKindOf(params.kind);
  const stance = opinionStanceOf(params.stance);
  const severity = severityOf(params.severity, kind);
  const scopes = scopesOf(params.scope ?? params.scopes);
  const way = optionalText(params.way) ?? "judgment";
  const source = optionalText(params.source) ?? "operations-manifold.admit-opinion";
  const id = `opinion:${slug(claim).slice(0, 48)}:${hash({ claim, kind, at: now }).slice(0, 12)}`;
  const value = Object.freeze({
    kind: "operations-manifold.opinion.event" as const,
    event: "held" as const,
    id,
    opinionKind: kind,
    stance,
    severity,
    scopes,
    claim,
    way,
    at: now,
    source,
  });
  const eventId = `opinion-event:${hash(value).slice(0, 24)}`;
  const event: EAVT = Object.freeze([
    id,
    "operations-manifold.opinion.held",
    jsonValue(value),
    jsonValue({ at: now, eventId }),
  ]);

  await ensureEavtLogStateDirs(repoRoot, OPINION_LOG_STATE);
  const eavtJsonl = await appendEavtLog(repoRoot, OPINION_LOG_STATE, [event]);
  const snapshot = await refreshOpinionSnapshot(repoRoot);
  const opinion = snapshot.opinions.find((item) => item.id === id);
  if (opinion === undefined) throw new Error(`opinion was not projected after intake: ${id}`);
  return Object.freeze({ kind: "operations-manifold.opinions.intake" as const, accepted: true as const, opinion, eavtJsonl, snapshot });
}

export async function readOpinions(repoRoot: string): Promise<OpinionSnapshot> {
  await ensureEavtLogStateDirs(repoRoot, OPINION_LOG_STATE);
  return refreshOpinionSnapshot(repoRoot);
}

async function refreshOpinionSnapshot(repoRoot: string): Promise<OpinionSnapshot> {
  const events = await readEavtLog(repoRoot, OPINION_LOG_STATE);
  const snapshot = foldOpinionEvents(events);
  await writeJsonState(repoRoot, OPINION_LOG_STATE, snapshot);
  return snapshot;
}

type MutableOpinion = {
  id: string;
  kind: OpinionKind;
  stance: OpinionStance;
  severity: Severity;
  scopes: readonly string[];
  claim: string;
  way: string;
  status: OpinionStatus;
  at: string;
  updatedAt: string;
  source: string;
};

function foldOpinionEvents(events: readonly EAVT[]): OpinionSnapshot {
  const byId = new Map<string, MutableOpinion>();
  let updatedAt: string | null = null;
  for (const [entity, attribute, value, metadata] of events) {
    if (!isRecord(value)) continue;
    const id = stringOf(field(value, "id")) ?? (typeof entity === "string" ? entity : null);
    if (id === null) continue;
    const at = metaTime(metadata) ?? stringOf(field(value, "at")) ?? new Date(0).toISOString();
    updatedAt = updatedAt === null ? at : maxIso(updatedAt, at);
    const withdrawn = typeof attribute === "string" && attribute.endsWith(".withdrawn");
    const prior = byId.get(id);
    if (prior === undefined) {
      const kind = opinionKindOf(stringOf(field(value, "opinionKind")) ?? undefined);
      byId.set(id, {
        id,
        kind,
        stance: opinionStanceOf(stringOf(field(value, "stance")) ?? undefined),
        severity: severityOf(stringOf(field(value, "severity")) ?? undefined, kind),
        scopes: scopesOf(field(value, "scopes")),
        claim: stringOf(field(value, "claim")) ?? id,
        way: stringOf(field(value, "way")) ?? "judgment",
        status: withdrawn ? "withdrawn" : "held",
        at,
        updatedAt: at,
        source: stringOf(field(value, "source")) ?? "operations-manifold.admit-opinion",
      });
      continue;
    }
    prior.updatedAt = maxIso(prior.updatedAt, at) ?? at;
    if (withdrawn) prior.status = "withdrawn";
  }
  const opinions = [...byId.values()]
    .sort((left, right) => (left.at < right.at ? -1 : left.at > right.at ? 1 : left.id.localeCompare(right.id)))
    .map((item) => Object.freeze({ ...item }));
  const scopes = Object.freeze([...new Set(opinions.flatMap((item) => item.scopes))].sort());
  return Object.freeze({
    kind: "operations-manifold.opinions" as const,
    generatedAt: new Date().toISOString(),
    opinions: Object.freeze(opinions),
    scopes,
    updatedAt,
  });
}

function metaTime(metadata: JsonValue): string | null {
  if (typeof metadata === "string") return metadata;
  if (isRecord(metadata) && typeof metadata["at"] === "string") return metadata["at"];
  return null;
}

/** The opinion fiber as a relating Control of norms (held opinions only). */
export function opinionControl(snapshot: OpinionSnapshot): Control {
  return control(snapshot.opinions.filter((item) => item.status === "held").map(opinionNorm));
}

function opinionNorm(item: OpinionRecord): Norm {
  return Object.freeze({
    id: item.id,
    way: item.way,
    severity: item.severity,
    scopes: item.scopes,
    claim: `[${item.kind}/${item.stance}] ${item.claim}`,
  });
}

function parseAssessments(value: unknown): ReadonlyMap<string, OpinionAssessment> {
  const out = new Map<string, OpinionAssessment>();
  const list = Array.isArray(value) ? value : [];
  for (const raw of list) {
    if (!isRecord(raw as JsonValue)) continue;
    const record = raw as Readonly<Record<string, JsonValue>>;
    const id = stringOf(field(record, "id"));
    const charge = chargeOf(field(record, "charge"));
    if (id === null || charge === null) continue;
    out.set(id, Object.freeze({
      id,
      charge,
      message: stringOf(field(record, "message")) ?? undefined,
      evidence: textList(field(record, "evidence")),
    }));
  }
  return out;
}

export async function measureOpinions(repoRoot: string, params: OpinionMeasurementParams): Promise<OpinionMeasurement> {
  const subject = requireText(params.subject ?? params.text ?? params.q, "subject (plan/task) to measure");
  const scope = optionalText(params.scope);
  const snapshot = await readOpinions(repoRoot);
  const ctrl = opinionControl(snapshot);
  const scoped = scope === null
    ? ctrl.norms
    : [...normsFor(ctrl, scope), ...ctrl.norms.filter((norm) => norm.scopes.includes("*"))];
  const seen = new Set<string>();
  const applicable = scoped.filter((norm) => (seen.has(norm.id) ? false : (seen.add(norm.id), true)));
  const assessments = parseAssessments(params.assessments);
  const unassessed: string[] = [];
  const findings = applicable.map((norm) => {
    const assessment = assessments.get(norm.id);
    if (assessment === undefined) {
      unassessed.push(norm.id);
      return finding(norm, "absurd", "no evidence assessed yet — charge against the subject to weigh this opinion", []);
    }
    return finding(norm, assessment.charge, assessment.message ?? "", assessment.evidence ?? []);
  });
  return Object.freeze({
    kind: "operations-manifold.measure-opinions" as const,
    generatedAt: new Date().toISOString(),
    subject,
    scope,
    findings: Object.freeze(findings),
    unassessed: Object.freeze(unassessed),
    control: Object.freeze(applicable),
  });
}
