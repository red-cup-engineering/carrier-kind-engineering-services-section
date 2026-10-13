// running/session — the transfinite transport: a bounded interactive claim session.
//
// Between the Scott stream (one-sided, never conflicts) and the aperiodic open
// session (never settles) sits the transfinite-bounded session. It does NOT
// overwrite: nothing is ever retracted. Each message is a CLAIM — a charged
// predication about a cell — and the claims accumulate in a monotone log exactly
// like the Scott ledger. What moves is the JUDGEMENT: the ∨ₖ knowledge-join of all
// claims about a cell. Knowledge only grows, but the truth verdict can flip — a
// cell standing `held` (for) becomes `contested` (⊤, both) when a `denied`
// (against) claim arrives, with the earlier claim still in the log.
//
// The session is `scott` when no cell ever conflicts (flat, H¹=0) and
// `transfinite` when some cell reaches conflict (a ⊤ / NSC firing) — bounded,
// because the claim log is finite and ∨ₖ settling reaches a fixpoint. It never
// becomes aperiodic.

import {
  chargeValue,
  chargeValueName,
  isChargeValueName,
  joinKnowledgeValue,
  type ChargeValueName,
} from "../lib/values/index.mts";
import {
  classifyRegime,
  closureRegimeData,
  cohomologyVanishesInRegime,
  monotonicityCertificateOfFederatedCover,
  type ClosureRegime,
} from "../lib/fixpoint/index.mts";
import {
  assignments,
  empiricalModel,
  hasGlobalSection,
  logicallyContextual,
  measurementScenario,
} from "../lib/math/physics/models/quantum-contextuality/index.mts";
import { contentSlug } from "../lib/addressing/slug.mts";
import { statementCell, type StatementCoordinate, type StatementValue } from "../lib/records/persistence.mts";
import { utteredClaimIdentity } from "../lib/logic/predicating/predication.mts";
import { claimSessionObservationContract } from "./schema.mts";
import { toEavt, type EAVT } from "../lib/codecs/json/jsonl/eavt/index.mts";
import { isJsonRecord, type JsonValue } from "../lib/codecs/json/core.mts";
import type { Feed } from "../lib/addressing/feed.mts";

/** A claim: a charged predication about a cell. `held` = evidence for,
 *  `denied` = evidence against, `contested` = ⊤ (both), `unknown` = ⊥ (neither). Claims
 *  are never retracted; the judgement is derived by settling. */
export interface Claim {
  readonly cell: string;
  readonly charge: ChargeValueName;
}

/** A bounded interactive session: the monotone, append-only claim log and whether a
 *  close handshake has settled it. Nothing here is ever overwritten. */
export interface Session {
  readonly claims: readonly Claim[];
  readonly closed: boolean;
}

/** One accepted claim-session boundary event, ready to become RWIL/EAVT material. */
export interface ClaimSessionObservation {
  readonly sessionId: string;
  readonly transport: "claim-session" | "websocket-session";
  readonly claim: Claim;
  readonly session: Session;
  readonly judgement: JsonValue;
  readonly at: StatementCoordinate;
  readonly boundary?: StatementValue;
  readonly caller?: StatementValue;
}

export interface ClaimSessionObservationInput {
  readonly sessionId: string;
  readonly transport: "claim-session" | "websocket-session";
  readonly claim: Claim;
  readonly session: Session;
  readonly judgement: JsonValue;
  readonly at: StatementCoordinate;
  readonly boundary?: StatementValue;
  readonly caller?: StatementValue;
}

export interface ClaimSessionObservationBundle {
  readonly kind: "metroplat.claim-session.observation-bundle";
  readonly sessionId?: string;
  readonly source: string;
  readonly observations: readonly ClaimSessionObservation[];
  readonly evidence: readonly string[];
}

export interface ClaimSessionContinuationItem {
  readonly cell: string;
  readonly charge: ChargeValueName;
  readonly role: "goal" | "obligation" | "claim";
  readonly text: string;
  readonly source?: string;
  readonly evidence: readonly string[];
}

export interface ClaimSessionContinuation {
  readonly kind: "metroplat.claim-session.continuation";
  readonly sessionId?: string;
  readonly source: string;
  readonly observations: number;
  readonly goals: number;
  readonly obligations: number;
  readonly claims: number;
  readonly regime: "scott" | "transfinite";
  readonly conflicts: readonly string[];
  readonly items: readonly ClaimSessionContinuationItem[];
  readonly evidence: readonly string[];
  readonly text: string;
}

export interface AgentStatusReadiness {
  readonly provided: boolean;
  readonly ready: boolean;
  readonly mcp: boolean;
  readonly lsp: boolean;
  readonly agentWork: boolean;
  readonly publication: boolean;
  readonly tools?: number;
  readonly resources?: number;
  readonly prompts?: number;
  readonly lspDocuments?: number;
  readonly publicationTargets?: number;
}

export interface AgentStatusReadRequest {
  readonly kind?: "metroplat.agent-status-settlement.request";
  readonly source?: string;
  readonly continuation: ClaimSessionContinuation;
  readonly readiness?: {
    readonly ready: boolean;
    readonly mcp: { readonly tools: number; readonly resources: number; readonly prompts: number; readonly ready: boolean };
    readonly lsp: { readonly documents: number; readonly ready: boolean };
    readonly agentWork: { readonly ready: boolean };
    readonly publication?: { readonly targets: number; readonly ready: boolean };
    readonly missing: readonly string[];
  };
}

export interface AgentStatusReadout {
  readonly kind: "metroplat.agent-status-settlement";
  readonly source: string;
  readonly sessionId?: string;
  readonly ready: boolean;
  readonly statusline: string;
  readonly continuation: {
    readonly source: string;
    readonly observations: number;
    readonly goals: number;
    readonly obligations: number;
    readonly claims: number;
    readonly regime: "scott" | "transfinite";
  };
  readonly readiness: AgentStatusReadiness;
  readonly items: readonly ClaimSessionContinuationItem[];
  readonly conflicts: readonly string[];
  readonly evidence: readonly string[];
  readonly missing: readonly string[];
  readonly text: string;
}

/** Open an empty session. */
export function openSession(): Session {
  return { claims: [], closed: false };
}

/** Append one claim — never overwriting an earlier one. A closed session is inert. */
export function claim(session: Session, cell: string, charge: ChargeValueName): Session {
  if (session.closed) return session;
  return { claims: [...session.claims, { cell, charge }], closed: false };
}

/** Utter a claim as the caller's own identity (the token) asserting some
 *  content (the claim-mark) — the minimal principled pair `Utterance` admits
 *  (predicating's `utteredClaimIdentity`), rather than requiring the
 *  caller to invent a `cell` address string by hand. The cell this session
 *  stores is the derived predication cell's canonical statement address, so
 *  `judge`/`conflicts` and every other string-keyed reader are unchanged. */
export function claimUttered(session: Session, token: StatementValue, claimMark: StatementValue, charge: ChargeValueName): Session {
  return claim(session, utteredClaimIdentity(token, claimMark).address, charge);
}

/** The judgement: for each cell, the ∨ₖ knowledge-join of every claim about it — the
 *  collective standing. `held` and `denied` on one cell closeSession to `contested`
 *  (⊤, contested); knowledge only grows, but the verdict can flip with no claim
 *  removed. */
export function judge(session: Session): Map<string, ChargeValueName> {
  const byCell = new Map<string, ChargeValueName>();
  for (const { cell, charge } of session.claims) {
    const prior = byCell.get(cell);
    byCell.set(
      cell,
      prior === undefined
        ? charge
        : chargeValueName(joinKnowledgeValue(chargeValue(prior), chargeValue(charge))),
    );
  }
  return byCell;
}

/** The cells whose judgement is in conflict (`contested` = ⊤, both for and against) —
 *  the curved / transfinite signature (an NSC firing). */
export function conflicts(session: Session): readonly string[] {
  return [...judge(session)].filter(([, verdict]) => verdict === "contested").map(([cell]) => cell);
}

/** The session's settling regime, read off its judgement: `scott` (flat — no cell in
 *  conflict, H¹=0) or `transfinite` (some cell at ⊤, bounded). Never aperiodic: the
 *  claim log is finite and ∨ₖ settling reaches a fixpoint. */
export function sessionRegime(session: Session): "scott" | "transfinite" {
  return conflicts(session).length === 0 ? "scott" : "transfinite";
}

/** The FLEET's own growth-PROCESS classification — distinct from `sessionRegime` (which
 *  reads one bounded claim log's conflict state, not the process admitting sessions to
 *  it). A fleet of Claude Code sessions is never closed at read time: nothing bounds how
 *  many more sessions will be admitted, so its `finiteBase` is always false — the
 *  four-regime classifier (`classifyRegime`/`closureRegimeData`,
 *  `core/closure/value-category.mts`) can therefore never land the fleet on `finite`
 *  (strict). Which of the remaining three regimes it reaches is a real, decidable
 *  question, not an open one:
 *
 *  - `scottContinuous` is true: the fleet glue rule folds every session's claims through
 *    the SAME `joinKnowledgeValue` a single session's `judge` uses, and
 *    `scott-coalgebra.mts`'s `scottContinuityReceipt` already proves that fold commutes
 *    with directed joins over the FOUR value set — Scott-continuous by construction.
 *  - `countableCofinality` is true: sessions are admitted one discrete transcript at a
 *    time, a countable sequence by construction — no continuum of arrivals.
 *
 *  So the fleet's growth process classifies as `scott` (κ=ω), never `aperiodic`,
 *  regardless of how long it runs or how many sessions it eventually admits —
 *  `cohomologyVanishesInRegime` holds, and no coordinator is structurally required.
 *  This is the decided answer to `2026-07-01-kinematic-space-of-runs.md`'s "genuinely
 *  open" run-space closure-regime question, for the claim-session fleet specifically,
 *  read off the classifier metroplat already carries — not a new claim, and not left
 *  open pending some future ruling. */
export function fleetGrowthRegime(): { readonly regime: ClosureRegime; readonly coordinationFree: boolean } {
  const judgment = closureRegimeData(true, false, true);
  if (judgment.kind !== "settling.closureRegimeData:witness") {
    throw new TypeError(`fleetGrowthRegime: unreachable regime-data obstruction ${judgment.constraint}`);
  }
  const regime = classifyRegime(judgment.data);
  return Object.freeze({ regime, coordinationFree: cohomologyVanishesInRegime(regime) });
}

/** The settled judgement face of a claim session. */
export function sessionJudgement(session: Session): JsonValue {
  return Object.freeze({
    judgement: Object.freeze(Object.fromEntries(judge(session))),
    conflicts: Object.freeze([...conflicts(session)]),
    regime: sessionRegime(session),
  });
}

function normalizedClaimCell(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/gu, " ");
}

/** Glued cross-session settlement: every bundle's discourse claims folded through the
 *  SAME `claim`/`judge` primitives a single session already uses — not a parallel
 *  relation detour. The cell key is `role:normalizedText`, so a goal-utterance and an
 *  obligation-utterance drawn from the same message (different predicates ABOUT it,
 *  never opposing evidence about one subject) never collide as one cell; two sessions
 *  asserting the same role about the same text DO share a cell, and a genuinely
 *  opposing charge there settles to `contested` — a real standing contradiction, not a
 *  classifier artifact.
 *
 *  The fold alone is not the gluing question. `coordination` is: the sessions form a
 *  federated cover (source = session, cell = claim cell, stance = contributed charge),
 *  and the cover-nerve first cohomology — computed by the carried predication
 *  cohomology reader, not by string comparison — marks exactly the cells whose
 *  source-stance nerve has a cycle. A nonzero class is a genuine cross-session
 *  coordination obstruction: the adjudication queue, mathematically read. */
export interface GluedCoordinationReadout {
  readonly kind: "predication.cohomology.coordinationReadout";
  readonly rank: number;
  readonly vanishing: "witness" | "obstruction";
  readonly obstructions: readonly { readonly cell: string; readonly rank: number }[];
}

/** The adjudication of the conflict cells, read through possibilistic
 *  contextuality (`core/relational`): the conflicted cells are the measurements,
 *  each source's slice of them is a context, and an assignment is supported on
 *  a context only when EVERY source holding that slice uttered each of its
 *  charges (a global section must satisfy every source, so shared contexts
 *  intersect). `noncontextual` — a global section exists: one charge per cell
 *  every conflicting source has itself uttered (`resolution` carries it; the
 *  conflict dissolves by choosing it). `logically-contextual` — some supported
 *  local stance extends to no global section (`obstruction` pinpoints it).
 *  `strongly-contextual` — some context admits no reading at all: its sources
 *  deadlock outright (`obstruction` names them, with no `localSection`).
 *  `flat` — nothing to adjudicate. */
export interface GluedAdjudicationReadout {
  readonly kind: "relational.contextuality.adjudicationReadout";
  readonly cells: readonly string[];
  readonly omitted: readonly string[];
  readonly classification: "flat" | "noncontextual" | "logically-contextual" | "strongly-contextual";
  readonly resolution?: Readonly<Record<string, ChargeValueName>>;
  readonly obstruction?: Readonly<{
    readonly sources: readonly string[];
    readonly context: readonly string[];
    readonly localSection?: Readonly<Record<string, ChargeValueName>>;
  }>;
}

export interface GluedClaimSessions {
  readonly kind: "metroplat.running.glued-claim-sessions";
  readonly sources: readonly string[];
  readonly claims: number;
  readonly judgement: JsonValue;
  readonly conflicts: readonly string[];
  readonly regime: "scott" | "transfinite";
  /** The fleet's own growth-process classification (`fleetGrowthRegime`) — a
   *  structural reading of the admission process itself, not this call's cell
   *  conflicts (that's `regime`, above). Always `scott`/coordination-free for a
   *  claim-session fleet; see `fleetGrowthRegime`'s docstring for why. */
  readonly growth: { readonly regime: ClosureRegime; readonly coordinationFree: boolean };
  readonly coordination: GluedCoordinationReadout;
  readonly adjudication: GluedAdjudicationReadout;
}

function gluedClaimCell(role: string, text: string): string {
  return `${role}:${normalizedClaimCell(text)}`;
}

const naturalSize = (value: { readonly members: readonly unknown[] }): number => value.members.length;

/** The witness search enumerates charges^cells assignments, so the adjudicated
 *  region is bounded; cells beyond the bound are reported in `omitted`, never
 *  silently dropped. */
const ADJUDICATION_CELL_BOUND = 8;

/** Adjudicate the conflicted cells by presenting the glued statements as a
 *  support-level empirical model over a measurement scenario: measurements are
 *  the conflicted cells, one context per distinct source cell-slice, and an
 *  assignment is supported on a context when some source holding that slice
 *  uttered every one of its charges. The classification then falls out of the
 *  carried contextuality readers, not string comparison. */
function adjudicateConflictCells(
  statements: readonly { readonly source: string; readonly cell: string; readonly stance: string }[],
  conflictCells: readonly string[],
): GluedAdjudicationReadout {
  const cells = conflictCells.slice(0, ADJUDICATION_CELL_BOUND);
  const omitted = Object.freeze(conflictCells.slice(ADJUDICATION_CELL_BOUND));
  const flat: GluedAdjudicationReadout = Object.freeze({
    kind: "relational.contextuality.adjudicationReadout" as const,
    cells: Object.freeze([...cells]),
    omitted,
    classification: "flat" as const,
  });
  if (cells.length === 0) return flat;

  const cellSet = new Set(cells);
  const stancesBySource = new Map<string, Map<string, Set<string>>>();
  for (const statement of statements) {
    if (!cellSet.has(statement.cell)) continue;
    const table = stancesBySource.get(statement.source) ?? new Map<string, Set<string>>();
    const charges = table.get(statement.cell) ?? new Set<string>();
    charges.add(statement.stance);
    table.set(statement.cell, charges);
    stancesBySource.set(statement.source, table);
  }
  if (stancesBySource.size === 0) return flat;

  const contextKey = (context: readonly string[]): string => [...context].sort().join("\0");
  const contextsByKey = new Map<string, { readonly context: readonly string[]; readonly sources: string[] }>();
  for (const [source, table] of stancesBySource) {
    const context = Object.freeze([...table.keys()].sort());
    const key = contextKey(context);
    const entry = contextsByKey.get(key);
    if (entry === undefined) contextsByKey.set(key, { context, sources: [source] });
    else entry.sources.push(source);
  }
  const contextEntries = [...contextsByKey.values()];
  const outcomes = [...new Set(statements.filter((s) => cellSet.has(s.cell)).map((s) => s.stance))].sort();

  // A global section must satisfy every source, so sources sharing one cell
  // slice intersect: the assignment is supported only when each of them
  // uttered every charge it assigns.
  const admittedByAll = (
    entry: { readonly context: readonly string[]; readonly sources: readonly string[] },
    assignment: Readonly<Record<string, string | boolean | number>>,
  ): boolean => entry.sources.every((source) => {
    const table = stancesBySource.get(source);
    return entry.context.every((cell) => table?.get(cell)?.has(String(assignment[cell])) === true);
  });

  const scenario = measurementScenario(cells, contextEntries.map((entry) => entry.context));
  const model = empiricalModel(scenario, outcomes, (context, assignment) => {
    const entry = contextsByKey.get(contextKey(context));
    return entry !== undefined && admittedByAll(entry, assignment);
  });

  const restrict = (assignment: Readonly<Record<string, string | boolean | number>>, context: readonly string[]) =>
    Object.freeze(Object.fromEntries(context.map((cell) => [cell, assignment[cell] as ChargeValueName])));

  const global = hasGlobalSection(model);
  if (global !== undefined) {
    return Object.freeze({
      ...flat,
      classification: "noncontextual" as const,
      resolution: restrict(global.assignment, cells),
    });
  }
  // A context no assignment inhabits is an outright deadlock among its
  // sources — the strongest obstruction, reported before the classical
  // logical-contextuality pinpoint.
  const deadlocked = contextEntries.find((entry) =>
    !assignments(entry.context, outcomes).some((assignment) => admittedByAll(entry, assignment)));
  if (deadlocked !== undefined) {
    return Object.freeze({
      ...flat,
      classification: "strongly-contextual" as const,
      obstruction: Object.freeze({
        sources: Object.freeze([...deadlocked.sources]),
        context: deadlocked.context,
      }),
    });
  }
  const logical = logicallyContextual(model);
  return Object.freeze({
    ...flat,
    classification: "logically-contextual" as const,
    ...(logical === undefined ? {} : {
      obstruction: Object.freeze({
        sources: Object.freeze([...(contextsByKey.get(contextKey(logical.context))?.sources ?? [])]),
        context: logical.context,
        localSection: restrict(logical.localSection, logical.context),
      }),
    }),
  });
}

/** Glue two or more claim-session observation bundles into one shared settlement. */
export function glueClaimSessions(bundles: readonly ClaimSessionObservationBundle[]): GluedClaimSessions {
  let glued = openSession();
  let claims = 0;
  const statements: { source: string; cell: string; stance: string }[] = [];
  for (const bundle of bundles) {
    for (const observation of bundle.observations) {
      const boundary = observation.boundary;
      const record = boundary !== null && typeof boundary === "object" && !Array.isArray(boundary)
        ? boundary as Readonly<Record<string, JsonValue>>
        : undefined;
      const text = record?.["text"];
      if (typeof text !== "string" || text.length === 0) continue;
      const role = record?.["role"];
      const cell = typeof role === "string" ? gluedClaimCell(role, text) : normalizedClaimCell(text);
      glued = claim(glued, cell, observation.claim.charge);
      statements.push({ source: bundle.source, cell, stance: observation.claim.charge });
      claims += 1;
    }
  }
  const certificate = monotonicityCertificateOfFederatedCover(statements);
  const conflictCells = Object.freeze([...conflicts(glued)]);
  return Object.freeze({
    kind: "metroplat.running.glued-claim-sessions" as const,
    sources: Object.freeze(bundles.map((bundle) => bundle.source)),
    claims,
    judgement: Object.freeze(Object.fromEntries(judge(glued))),
    conflicts: conflictCells,
    regime: sessionRegime(glued),
    growth: fleetGrowthRegime(),
    adjudication: adjudicateConflictCells(statements, conflictCells),
    coordination: Object.freeze({
      kind: "predication.cohomology.coordinationReadout" as const,
      rank: naturalSize(certificate.rank),
      vanishing: certificate.vanishing.kind === "predication.cohomology.rankVanishing:witness" ? "witness" as const : "obstruction" as const,
      obstructions: Object.freeze(certificate.obstructions.map((entry) => Object.freeze({
        cell: entry.cell,
        rank: naturalSize(entry.rank),
      }))),
    }),
  });
}

/** Construct and assert one claim-session boundary event before it is cellized. */
export function claimSessionObservation(input: ClaimSessionObservationInput): ClaimSessionObservation {
  return claimSessionObservationContract.assert(Object.freeze({
    sessionId: input.sessionId,
    transport: input.transport,
    claim: Object.freeze({ cell: input.claim.cell, charge: input.claim.charge }),
    session: input.session,
    judgement: input.judgement,
    at: input.at,
    ...(input.boundary === undefined ? {} : { boundary: input.boundary }),
    ...(input.caller === undefined ? {} : { caller: input.caller }),
  }), "claim-session observation") as ClaimSessionObservation;
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function stringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? Object.freeze(value.filter((entry): entry is string => typeof entry === "string")) : Object.freeze([]);
}

function continuationRole(observation: ClaimSessionObservation): "goal" | "obligation" | "claim" {
  const boundary = recordValue(observation.boundary);
  return boundary?.["role"] === "goal" ? "goal"
    : boundary?.["role"] === "obligation" ? "obligation"
      : "claim";
}

function continuationText(observation: ClaimSessionObservation): string {
  const boundary = recordValue(observation.boundary);
  return typeof boundary?.["text"] === "string" ? boundary["text"] : observation.claim.cell;
}

function continuationSource(observation: ClaimSessionObservation): string | undefined {
  const boundary = recordValue(observation.boundary);
  return typeof boundary?.["source"] === "string" ? boundary["source"] : undefined;
}

function continuationEvidence(observation: ClaimSessionObservation): readonly string[] {
  const boundary = recordValue(observation.boundary);
  return Object.freeze([
    ...stringArray(boundary?.["evidence"]),
    `cell:${observation.claim.cell}`,
    `charge:${observation.claim.charge}`,
  ]);
}

function latestSession(bundle: ClaimSessionObservationBundle): Session {
  const last = bundle.observations[bundle.observations.length - 1];
  return last?.session ?? openSession();
}

function continuationTextBody(input: {
  readonly sessionId?: string;
  readonly source: string;
  readonly observations: number;
  readonly goals: number;
  readonly obligations: number;
  readonly regime: "scott" | "transfinite";
  readonly conflicts: readonly string[];
  readonly items: readonly ClaimSessionContinuationItem[];
  readonly evidence: readonly string[];
}): string {
  const goals = input.items.filter((item) => item.role === "goal");
  const obligations = input.items.filter((item) => item.role === "obligation");
  const claimItems = input.items.filter((item) => item.role === "claim");
  const lines = [
    "MetroPlat claim-session continuation",
    `Session: ${input.sessionId ?? "(unnamed)"}`,
    `Source: ${input.source}`,
    `Observations: ${input.observations}`,
    `Regime: ${input.regime}`,
    `Conflicts: ${input.conflicts.length === 0 ? "none" : input.conflicts.join(", ")}`,
    `Goals: ${goals.length}`,
    ...goals.map((item, index) => `${index + 1}. ${item.text}`),
    `Obligations: ${obligations.length}`,
    ...obligations.map((item, index) => `${index + 1}. ${item.text}`),
    ...(claimItems.length === 0 ? [] : [
      `Other claims: ${claimItems.length}`,
      ...claimItems.map((item, index) => `${index + 1}. [${item.charge}] ${item.text}`),
    ]),
    "Evidence:",
    ...input.evidence.map((entry) => `- ${entry}`),
  ];
  return `${lines.join("\n")}\n`;
}

/** Project a finite claim-session observation bundle into continuation material. */
export function claimSessionContinuation(bundle: ClaimSessionObservationBundle): ClaimSessionContinuation {
  const session = latestSession(bundle);
  const items: readonly ClaimSessionContinuationItem[] = Object.freeze(bundle.observations.map((observation) => {
    const source = continuationSource(observation);
    return Object.freeze({
      cell: observation.claim.cell,
      charge: observation.claim.charge,
      role: continuationRole(observation),
      text: continuationText(observation),
      ...(source === undefined ? {} : { source }),
      evidence: continuationEvidence(observation),
    });
  }));
  const goals = items.filter((item) => item.role === "goal").length;
  const obligations = items.filter((item) => item.role === "obligation").length;
  const regime = sessionRegime(session);
  const conflictCells = Object.freeze([...conflicts(session)]);
  const evidence = Object.freeze([
    ...bundle.evidence,
    `observations:${bundle.observations.length}`,
    `claims:${session.claims.length}`,
    `regime:${regime}`,
  ]);
  const face = {
    ...(bundle.sessionId === undefined ? {} : { sessionId: bundle.sessionId }),
    source: bundle.source,
    observations: bundle.observations.length,
    goals,
    obligations,
    claims: session.claims.length,
    regime,
    conflicts: conflictCells,
    items,
    evidence,
  };
  return Object.freeze({
    kind: "metroplat.claim-session.continuation" as const,
    ...face,
    text: continuationTextBody(face),
  });
}

function statusReadiness(input: AgentStatusReadRequest): AgentStatusReadiness {
  if (input.readiness === undefined) {
    return Object.freeze({
      provided: false,
      ready: false,
      mcp: false,
      lsp: false,
      agentWork: false,
      publication: false,
    });
  }
  return Object.freeze({
    provided: true,
    ready: input.readiness.ready,
    mcp: input.readiness.mcp.ready,
    lsp: input.readiness.lsp.ready,
    agentWork: input.readiness.agentWork.ready,
    publication: input.readiness.publication?.ready ?? true,
    tools: input.readiness.mcp.tools,
    resources: input.readiness.mcp.resources,
    prompts: input.readiness.mcp.prompts,
    lspDocuments: input.readiness.lsp.documents,
    ...(input.readiness.publication === undefined ? {} : { publicationTargets: input.readiness.publication.targets }),
  });
}

function statusLine(input: AgentStatusReadRequest, readiness: AgentStatusReadiness, missing: readonly string[]): string {
  const continuation = input.continuation;
  return [
    `session:${continuation.sessionId ?? "(unnamed)"}`,
    `regime:${continuation.regime}`,
    `goals:${continuation.goals}`,
    `obligations:${continuation.obligations}`,
    `claims:${continuation.claims}`,
    `conflicts:${continuation.conflicts.length}`,
    `mcp:${readiness.mcp ? "ready" : "missing"}`,
    `lsp:${readiness.lsp ? "ready" : "missing"}`,
    `agent-work:${readiness.agentWork ? "ready" : "missing"}`,
    `publication:${readiness.publication ? "ready" : "missing"}`,
    `missing:${missing.length}`,
  ].join(" ");
}

function statusText(input: AgentStatusReadRequest, readiness: AgentStatusReadiness, missing: readonly string[]): string {
  const continuation = input.continuation;
  const goals = continuation.items.filter((item) => item.role === "goal");
  const obligations = continuation.items.filter((item) => item.role === "obligation");
  const lines = [
    "MetroPlat agent status cut",
    `Source: ${input.source ?? continuation.source}`,
    `Session: ${continuation.sessionId ?? "(unnamed)"}`,
    `Regime: ${continuation.regime}`,
    `Readiness: ${readiness.ready ? "ready" : "not ready"}`,
    `MCP: ${readiness.mcp ? "ready" : "missing"}${readiness.tools === undefined ? "" : ` (${readiness.tools} tools)`}`,
    `LSP: ${readiness.lsp ? "ready" : "missing"}${readiness.lspDocuments === undefined ? "" : ` (${readiness.lspDocuments} documents)`}`,
    `Agent work: ${readiness.agentWork ? "ready" : "missing"}`,
    `Publication: ${readiness.publication ? "ready" : "missing"}${readiness.publicationTargets === undefined ? "" : ` (${readiness.publicationTargets} targets)`}`,
    `Conflicts: ${continuation.conflicts.length === 0 ? "none" : continuation.conflicts.join(", ")}`,
    `Goals: ${goals.length}`,
    ...goals.map((item, index) => `${index + 1}. ${item.text}`),
    `Obligations: ${obligations.length}`,
    ...obligations.map((item, index) => `${index + 1}. ${item.text}`),
    "Missing:",
    ...(missing.length === 0 ? ["- none"] : missing.map((entry) => `- ${entry}`)),
  ];
  return `${lines.join("\n")}\n`;
}

/** Project continuation/readiness material into the compact cut a next agent or statusline needs. */
export function agentStatusReadout(input: AgentStatusReadRequest): AgentStatusReadout {
  const readiness = statusReadiness(input);
  const missing = Object.freeze([
    ...(input.readiness === undefined ? ["readiness"] : input.readiness.missing),
    ...(input.continuation.observations > 0 ? [] : ["continuation:observations"]),
  ]);
  const source = input.source ?? input.continuation.source;
  const continuation = Object.freeze({
    source: input.continuation.source,
    observations: input.continuation.observations,
    goals: input.continuation.goals,
    obligations: input.continuation.obligations,
    claims: input.continuation.claims,
    regime: input.continuation.regime,
  });
  const face = {
    kind: "metroplat.agent-status-settlement" as const,
    source,
    ...(input.continuation.sessionId === undefined ? {} : { sessionId: input.continuation.sessionId }),
    ready: missing.length === 0 && readiness.ready,
    statusline: statusLine(input, readiness, missing),
    continuation,
    readiness,
    items: input.continuation.items,
    conflicts: input.continuation.conflicts,
    evidence: Object.freeze([
      ...input.continuation.evidence,
      `continuation:${input.continuation.source}`,
      `readiness:${readiness.provided ? "provided" : "missing"}`,
      `readiness-publication:${readiness.publication ? "ready" : "missing"}`,
      `status-missing:${missing.length}`,
    ]),
    missing,
  };
  return Object.freeze({
    ...face,
    text: statusText(input, readiness, missing),
  });
}

/** The close handshake: closeSession the session so no further claim is accepted. The
 *  accumulated log and its judgement are preserved. */
export function closeSession(session: Session): Session {
  return { claims: session.claims, closed: true };
}

function slug(value: string): string {
  return contentSlug(value, "mark");
}

/** One host tool act (a Claude tool_use, a Codex function_call) paired with the
 *  outcome its own transcript records for it. */
export interface HostActClaim {
  readonly id: string;
  readonly name: string;
  readonly outcome: "recorded" | "errored" | "unrecorded";
}

export interface HostActClaimFoldInput {
  readonly sessionId: string;
  readonly source: string;
  readonly protocol: string;
  readonly surface: string;
  readonly acts: readonly HostActClaim[];
  readonly initialSession?: Session;
  readonly at?: StatementCoordinate;
}

/** Fold host tool acts into claim-session observations. An act IS a claim —
 *  "I am doing this" — charged `held` on its own act cell. Its recorded
 *  result is a second claim on the same cell: `held` when the evidence
 *  closes, `denied` when the evidence contradicts (an errored result), so the
 *  ∨ₖ judgement marks contradicted acts `contested` (⊤) — this is where a
 *  session's conflicts stop being vacuous. An unwitnessed act stands alone as
 *  an unclosed `held`. Act cells carry the host-unique act id, so glued
 *  cross-session settlements never conflate two different acts. */
export function hostActClaimObservations(
  input: HostActClaimFoldInput,
): { readonly observations: readonly ClaimSessionObservation[]; readonly session: Session } {
  let session = input.initialSession ?? openSession();
  const observations: ClaimSessionObservation[] = [];
  const caller = Object.freeze({ protocol: input.protocol, surface: input.surface, session: input.sessionId });
  let item = 0;
  // Each act observation carries the judgement face RESTRICTED to its own act
  // cell, maintained incrementally — re-judging the whole session per act is
  // quadratic in acts, and the authoritative full judgement is recomputed by
  // any continuation/status read from the final session anyway.
  const byCell = new Map<string, ChargeValueName>();
  let conflictCells = 0;
  const push = (cell: string, charge: ChargeValueName, text: string, evidence: readonly string[]): void => {
    session = claim(session, cell, charge);
    const prior = byCell.get(cell);
    const verdict = prior === undefined
      ? charge
      : chargeValueName(joinKnowledgeValue(chargeValue(prior), chargeValue(charge)));
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
        regime: conflictCells > 0 ? "transfinite" : "scott",
      }),
      at: input.at ?? Object.freeze({ source: input.source, item }),
      boundary: Object.freeze({
        protocol: input.protocol,
        surface: input.surface,
        operation: "host-act-read",
        role: "act",
        source: input.source,
        text,
        evidence: Object.freeze([...evidence]),
      }),
      caller,
    }));
  };
  for (const act of input.acts) {
    const cell = `${input.protocol}/${input.surface}/session/${slug(input.sessionId)}/act/${act.id}`;
    const text = `act:${act.id} ${act.name}`;
    push(cell, "held", text, Object.freeze([`act:${act.id}`, `tool:${act.name}`, "act-claim"]));
    if (act.outcome === "errored") {
      push(cell, "denied", text, Object.freeze([`act:${act.id}`, "result:error"]));
    } else if (act.outcome === "recorded") {
      push(cell, "held", text, Object.freeze([`act:${act.id}`, "result:witnessed"]));
    }
  }
  return Object.freeze({ observations: Object.freeze(observations), session });
}

function sessionEntity(observation: ClaimSessionObservation): StatementValue {
  return Object.freeze({
    kind: "metroplat.claim-session",
    transport: observation.transport,
    session: observation.sessionId,
  });
}

function sessionAttribute(observation: ClaimSessionObservation): StatementValue {
  return Object.freeze({
    operation: "claim",
    cell: observation.claim.cell,
    charge: observation.claim.charge,
  });
}

function sessionValue(observation: ClaimSessionObservation): StatementValue {
  return Object.freeze({
    claim: Object.freeze({ cell: observation.claim.cell, charge: observation.claim.charge }),
    judgement: observation.judgement as StatementValue,
    claims: observation.session.claims.length,
    regime: sessionRegime(observation.session),
    conflicts: Object.freeze([...conflicts(observation.session)]),
    closed: observation.session.closed,
    ...(observation.boundary === undefined ? {} : { boundary: observation.boundary }),
    ...(observation.caller === undefined ? {} : { caller: observation.caller }),
  });
}

/** The claim-session feed: one accepted frame becomes one source EAVT row. */
export const claimSessionFeed: Feed<ClaimSessionObservation> = Object.freeze({
  name: "claim-session",
  functional: Object.freeze([]),
  cellize: (observation: ClaimSessionObservation, at: StatementCoordinate): readonly EAVT[] => Object.freeze([
    toEavt(statementCell(
      sessionEntity(observation),
      sessionAttribute(observation),
      sessionValue(observation),
      at,
    )),
  ]),
});

/** Cellize one accepted claim-session observation through the package-owned feed. */
export function claimSessionStatementRows(observation: ClaimSessionObservation): readonly EAVT[] {
  return claimSessionFeed.cellize(observation, observation.at);
}

/**
 * The inverse of `claimSessionStatementRows`: recover enough of a recorded
 * claim-session row to feed `glueClaimSessions` — `claim.cell`/`claim.charge`
 * from the row's own attribute, `boundary` (role/text/source/evidence)
 * verbatim from its value, same shape `sessionAttribute`/`sessionValue`
 * wrote. `glueClaimSessions` never reads `session`/`judgement` (it re-derives
 * its own glued session from the claims themselves), so those are
 * reconstructed as a fresh, unopened session rather than replayed — there is
 * no way to recover one row's session-at-that-moment from the row alone
 * (`sessionValue` only projects a moment's summary, not the session value),
 * and glue does not need it. `null` when the row is not a claim-session row
 * at all (a different feed's row sharing the same admitted log file).
 */
export function claimSessionObservationOfRow(row: EAVT, fallbackSessionId: string): ClaimSessionObservation | null {
  const [entity, attribute, value, at] = row;
  if (!isJsonRecord(attribute) || !isJsonRecord(value)) return null;
  const cell = attribute["cell"];
  const chargeField = attribute["charge"];
  if (typeof cell !== "string" || typeof chargeField !== "string" || !isChargeValueName(chargeField)) return null;
  const sessionId = isJsonRecord(entity) && typeof entity["session"] === "string" ? entity["session"] : fallbackSessionId;
  const boundary = value["boundary"];
  return Object.freeze({
    sessionId,
    transport: "claim-session" as const,
    claim: Object.freeze({ cell, charge: chargeField }),
    session: openSession(),
    judgement: Object.freeze({}),
    at,
    ...(isJsonRecord(boundary) ? { boundary: boundary as StatementValue } : {}),
  });
}
