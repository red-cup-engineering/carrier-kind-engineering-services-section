/**
 * Suit injection — the read-path grounding capability.
 *
 * The thing an agent lacks each turn is grounding: the active filed goals, the
 * standing constraints, the rememberContexted settled claims, the mission. 561 Group Operations Manifold
 * already projects all of it as a project-context-suit (see operating/contextualizing/suiting/library/context-control.mts). This
 * module renders that suit as the text a harness injects into the model before
 * it reads the prompt, so the agent starts suited, not blind.
 *
 * It is the capability; the thin hook adapter (scripts/inject-suit.mjs) is the
 * actuator a harness invokes. Suiting is the read path — it admits the prompt as
 * a context filing (form -> eavt) but writes no durable learning.
 */
import { admitContext, projectContextSuit, type ContextSuit } from "./operating/contextualizing/suiting/library/context-control.mts";
import { deriveContextRelevance, type ContextRelevance, type RelevantFunction } from "./operating/contextualizing/suiting/library/context-relevance.mts";
import { deriveMessageLearning, type MessageLearningReading } from "./operating/learning/messages/derive-message-learning.mts";
import { operationsManifoldGoals, type GoalSnapshot } from "./goals.mts";
import { campaignRollup, type CampaignReading } from "./operating/planning/campaigning/library/campaign-rollup.mts";
import { readSession, type SessionReading } from "./session.mts";
import { operationsLedger, type OperationLedgerEntry } from "./operating/recording/operations/ledgering/library/operation-ledger.mts";
import { gameForEntries } from "./operating/recording/operations/folding/library/operation-ledger-fold.mts";
import { readFindings, type FindingRecord } from "./operating/remembering/codex/findings.mts";
import { experienceToNextLevel, type OperationLedgerGame } from "./operating/recording/operations/gaming/library/operation-ledger-game.mts";
import { harnessChannel, harnessIdentity, harnessTrace, type HarnessIdentity } from "./harness.mts";
import { writeSessionPlay } from "./play-state.mts";
import { readAssignments, type Receiver } from "./assignment.mts";
import { gamePosition, type GamePosition } from "./game-position.mts";
import { optionalText, stringList } from "./records.mts";

/**
 * The play-state read of the agent's standing — the operation ledger projected
 * through `gameFor` (Caillois mode, flow regime, level on the shared curve). The
 * world read is the whole-ledger game; the session read is the same projection
 * over the operations bound to this harness session, so the agent sees the
 * mode/flow/level it is actually playing in this turn rather than a blind log.
 */
export type PlayStatus = Readonly<{
  identity: HarnessIdentity;
  world: OperationLedgerGame;
  session: OperationLedgerGame;
  sessionMoves: number;
  sessionCtxTokens: number;
}>;

export type SuitInjectionParams = Readonly<{
  prompt?: string | undefined;
  session?: string | undefined;
  session_id?: string | undefined;
  trace?: string | undefined;
  focus?: string | undefined;
  paths?: string | readonly string[] | undefined;
  harness?: string | undefined;
  /** The cockpit persona name a session wears (else read from CWE_PERSONA env). */
  persona?: string | undefined;
  /** The cockpit session id behind the persona (else read from CWE_SESSION env). */
  personaSession?: string | undefined;
}>;

/**
 * The character a cockpit-launched session wears.
 *
 * A computing-with-emacs cockpit spawns each CLI with its session persona in
 * env (CWE_PERSONA, CWE_SESSION); the harness's hook subprocess inherits it. So
 * a session is not the generic "claude" — it is its own character. This is
 * display identity only; the manifold's session key stays the harness session id,
 * so the per-session world it already keys is preserved, just named.
 */
export type CockpitPersona = Readonly<{ name: string; session: string | null }>;

/** Read the cockpit persona from params, then env; null when unset. */
export function cockpitPersona(
  params: SuitInjectionParams = {},
  env: Readonly<Record<string, string | undefined>> = typeof process === "undefined" ? {} : process.env,
): CockpitPersona | null {
  const name = optionalText(params.persona) ?? optionalText(env["CWE_PERSONA"]);
  if (name === null) return null;
  return { name, session: optionalText(params.personaSession) ?? optionalText(env["CWE_SESSION"]) };
}

/** Render a projected suit + goals snapshot as injectable grounding text. */
export function renderSuitInjection(
  suit: ContextSuit,
  goals: GoalSnapshot,
  relevance: ContextRelevance | null = null,
  messageLearning: MessageLearningReading | null = null,
  session: SessionReading | null = null,
  play: PlayStatus | null = null,
  identity: HarnessIdentity = harnessIdentity(),
  inherited: FindingRecord | null = null,
  receiver: Receiver | null = null,
  position: GamePosition | null = null,
  persona: CockpitPersona | null = null,
  campaign: CampaignReading | null = null,
): string {
  const lines: string[] = ["# 561 Group Operations Manifold suit — injected grounding (read-path)"];
  if (play !== null) renderPlayStatus(lines, play);
  if (position !== null) lines.push(`- game position: ${position.flow} — challenge ${position.challenge} (open work) vs skill ${position.skill} (move repertoire); ${position.reading}`);
  if (receiver !== null) renderReceiver(lines, receiver);
  if (inherited !== null) renderInheritedSummary(lines, inherited);
  if (persona !== null) {
    const sessionTag = persona.session === null ? "" : ` · cockpit session \`${persona.session}\``;
    lines.push(`**Character:** ${persona.name}${sessionTag} — this session is its own self, not the generic harness.`);
  }
  if (suit.identity) lines.push(`**Acting as:** ${persona === null ? suit.identity : `${persona.name} (${suit.identity})`}`);
  if (suit.mission) {
    const missionHead = suit.mission.split("Active filed goals:").at(0)?.trim() ?? suit.mission.trim();
    lines.push(`**Mission:** ${missionHead}`);
  }

  const open = goals.goals.filter((g) => g.status !== "complete" && g.status !== "withdrawn").slice(0, 6);
  if (open.length > 0) {
    lines.push(`\n**Open filed goals (${goals.counts.open}):**`);
    for (const g of open) lines.push(`- [${g.status}] ${g.title}`);
  }
  if (campaign !== null) renderCampaign(lines, campaign);
  if (suit.constraints.length > 0) {
    lines.push("\n**Standing constraints:**");
    for (const c of suit.constraints) lines.push(`- ${c}`);
  }
  if (suit.memory.length > 0) {
    lines.push("\n**Remembered (provenance-weighted):**");
    for (const m of suit.memory.slice(0, 3)) lines.push(`- ${m.uri} (${m.tier} ${m.weight})`);
  }
  if (suit.capabilities.length > 0) {
    lines.push(`\n**561 Group Operations Manifold capabilities filed:** ${suit.capabilities.join(", ")}`);
  }
  if (session !== null) renderSession(lines, session, identity);
  // Everything above is high-charge grounding (settled org state, this session's
  // play/office/duty/bindings) — protected from budget trimming. What follows is
  // speculative keyword relevance and reviewable learning, dropped first if the
  // suit exceeds budget, so injection stays smart about what it spends.
  const coreEnd = lines.length;
  if (relevance !== null && relevance.keywords.length > 0) {
    lines.push(`\n**Keyword-relevant existing surfaces:** ${relevance.keywords.slice(0, 8).join(", ")}`);
    for (const surface of relevance.keywordSurfaces.slice(0, 6)) {
      const functions = surface.functions.map((fn) => `${fn.package}:${fn.name}`).join(", ");
      const types = surface.types.length === 0 ? "" : `; types ${surface.types.map((type) => `${type.package}:${type.name}`).join(", ")}`;
      const scripts = surface.scripts.length === 0 ? "" : `; scripts ${surface.scripts.map((script) => `${script.package}:${script.bin}`).join(", ")}`;
      lines.push(`- keyword ${surface.keyword}: functions ${functions || "none"}${types}${scripts}`);
    }
    for (const fn of selectedRelevantFunctions(relevance)) {
      const keywords = fn.keywords.length === 0 ? "" : ` [${fn.keywords.join(", ")}]`;
      lines.push(`- function${keywords} ${fn.package}:${fn.name} — ${fn.signature || fn.import} (${fn.file})`);
    }
    for (const type of relevance.types.slice(0, 4)) {
      const keywords = type.keywords.length === 0 ? "" : ` [${type.keywords.join(", ")}]`;
      lines.push(`- type${keywords} ${type.package}:${type.name} — ${type.signature || type.import} (${type.file})`);
    }
    for (const script of relevance.scripts.slice(0, 8)) {
      const keywords = script.keywords.length === 0 ? "" : ` [${script.keywords.join(", ")}]`;
      lines.push(`- script${keywords} ${script.package}:${script.bin} -> ${script.target}`);
    }
    if (relevance.interfaces.length > 0) {
      lines.push("- inspect more with:");
      for (const item of relevance.interfaces.slice(0, 4)) {
        lines.push(`  - ${item.bin}: stdio package-bin, HTTP ${item.method} ${item.href}, MCP ${item.mcp}`);
      }
    }
  }
  if (messageLearning !== null && messageLearning.candidates.length > 0) {
    lines.push(`\n**Reviewable message learning (not settled memory):** settlement ${messageLearning.settlement.value}`);
    for (const candidate of messageLearning.candidates.slice(0, 4)) {
      lines.push(`- [${candidate.review}] ${candidate.kind}: ${candidate.summary} (${candidate.channel})`);
    }
    lines.push("- inspect more with: derive-message-learning, read-messages, read-recognition");
  }
  lines.push("\n_Grounding is awareness, not durable learning. File evidence before claiming state._");
  return budgetTrimSuit(lines, coreEnd);
}

/** Rough token estimate matching the manifold's context-budget metering (~4 bytes/token). */
function estimateSuitTokens(text: string): number {
  return Math.ceil(Buffer.byteLength(text, "utf8") / 4);
}

/**
 * Keep the suit within a context budget by charge priority: the protected core
 * (settled org state + this session's play/office/duty/bindings) is never
 * dropped; the speculative tail (keyword relevance, reviewable learning) is
 * trimmed line-by-line until the suit fits. Smart about what context it spends,
 * grounded in the same budget bands the operation ledger meters.
 */
const SUIT_BUDGET_TOKENS = 1600;

function budgetTrimSuit(lines: readonly string[], coreEnd: number): string {
  const footer = lines[lines.length - 1] ?? "";
  const body = lines.slice(0, -1);
  if (estimateSuitTokens(body.join("\n")) <= SUIT_BUDGET_TOKENS) return lines.join("\n");
  const trimmed = [...body];
  let dropped = 0;
  while (trimmed.length > coreEnd && estimateSuitTokens(trimmed.join("\n")) > SUIT_BUDGET_TOKENS) {
    trimmed.pop();
    dropped += 1;
  }
  if (dropped > 0) trimmed.push(`\n_Suit trimmed to ~${SUIT_BUDGET_TOKENS}-token budget: ${dropped} lower-charge keyword/learning line(s) dropped — query read-* bins for detail._`);
  trimmed.push(footer);
  return trimmed.join("\n");
}

function selectedRelevantFunctions(relevance: ContextRelevance): readonly RelevantFunction[] {
  const focused = relevance.functions.filter((fn) => matchesFocus(fn, relevance.focus));
  const upstream = relevance.functions.filter((fn) => !matchesFocus(fn, relevance.focus));
  const focusedCore = focused.filter((fn) => !fn.name.startsWith("create") && !fn.file.includes("/projecting-"));
  const perKeyword = relevance.keywords.flatMap((keyword) => [
    ...focused.filter((fn) => fn.keywords.includes(keyword)).slice(0, 2),
    ...upstream.filter((fn) => fn.keywords.includes(keyword)).slice(0, 2),
  ]);
  return takeUnique([
    ...focusedCore.slice(0, 4),
    ...perKeyword,
    ...upstream.slice(0, 4),
    ...focused.slice(0, 4),
    ...relevance.functions,
  ], 10);
}

function matchesFocus(fn: RelevantFunction, focus: string | null): boolean {
  if (focus === null) return false;
  const normalizedFocus = focus.trim().toLowerCase().replace(/^\.\//u, "").replace(/\/+$/u, "");
  const normalizedPackagePath = fn.packagePath.toLowerCase().replace(/\/+$/u, "");
  return normalizedPackagePath === normalizedFocus
    || normalizedFocus.endsWith(`/${normalizedPackagePath}`)
    || normalizedPackagePath.endsWith(`/${normalizedFocus}`)
    || (normalizedFocus.includes("operations-manifold") && fn.package === "@emsenn/operations-manifold");
}

function takeUnique(values: readonly RelevantFunction[], limit: number): readonly RelevantFunction[] {
  const out: RelevantFunction[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const key = `${value.package}:${value.name}:${value.file}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= limit) return Object.freeze(out);
  }
  return Object.freeze(out);
}

/**
 * Project the grounding text for a turn. With a prompt (UserPromptSubmit), the
 * prompt is admitted as a context filing and the suit is taken from that
 * admission; without one (SessionStart), the suit is projected from the
 * standing goals/admissions.
 */
export async function suitInjectionText(repoRoot: string, params: SuitInjectionParams = {}): Promise<string> {
  const identity = harnessIdentity({ harness: params.harness, env: process.env });
  const prompt = (params.prompt ?? "").trim();
  const intent = prompt === "" ? "continue current 561 Group Operations Manifold read-work" : prompt;
  const session = optionalText(params.session ?? params.session_id);
  const trace = optionalText(params.trace) ?? (session === null ? null : harnessTrace(identity, session));
  const focus = optionalText(params.focus);
  const paths = stringList(params.paths);
  const suit: ContextSuit = prompt === ""
    ? await projectContextSuit(repoRoot, { intent, focus: focus ?? undefined })
    : (await admitContext(repoRoot, { intent, focus: focus ?? undefined, source: "operations-manifold.inject-suit" })).suit;
  const sessionParams = {
    intent,
    focus: focus ?? suit.focus ?? undefined,
    ...(session === null ? {} : { session }),
    ...(trace === null ? {} : { trace }),
    ...(paths.length === 0 ? {} : { paths }),
  };
  const [goals, relevance, messageLearning, sessionReading, ledger, findings, assignments, position, campaign] = await Promise.all([
    operationsManifoldGoals(repoRoot),
    deriveContextRelevance(repoRoot, { prompt: intent, focus: focus ?? suit.focus ?? undefined, limit: "12" }),
    deriveMessageLearning(repoRoot, session === null ? { limit: "8" } : { channel: harnessChannel(identity, session), limit: "8" }),
    session === null ? Promise.resolve(null) : readSession(repoRoot, sessionParams),
    operationsLedger(repoRoot),
    readFindings(repoRoot),
    readAssignments(repoRoot),
    gamePosition(repoRoot, session === null ? {} : { session }),
    campaignRollup(repoRoot, session === null ? {} : { session }),
  ]);
  const receiver = session === null ? null : assignments.receivers.find((item) => item.incumbent === session) ?? null;
  const play = playStatusFor(identity, ledger.game, ledger.entries, session, trace);
  if (session !== null) {
    writeSessionPlay(repoRoot, {
      kind: "operations-manifold.session.play",
      session,
      generatedAt: new Date().toISOString(),
      level: play.session.level,
      experience: play.session.experience,
      toNext: experienceToNextLevel(play.session.experience),
      mode: play.session.mode,
      flow: play.session.flow,
      badges: play.session.badges,
      challenges: play.session.challenges,
      moves: play.sessionMoves,
      ctxTokens: play.sessionCtxTokens,
    });
  }
  const inherited = latestSessionSummary(findings.findings, session);
  const persona = cockpitPersona(params, process.env);
  return renderSuitInjection(suit, goals, relevance, messageLearning, sessionReading, play, identity, inherited, receiver, position, persona, campaign);
}

/** Project the world + session play-read from the ledger for this harness session. */
function playStatusFor(
  identity: HarnessIdentity,
  world: OperationLedgerGame,
  entries: readonly OperationLedgerEntry[],
  session: string | null,
  trace: string | null,
): PlayStatus {
  const slice = session === null ? [] : entries.filter((entry) => boundToSession(entry, session, trace));
  return Object.freeze({
    identity,
    world,
    session: gameForEntries(slice),
    sessionMoves: slice.length,
    sessionCtxTokens: slice.reduce((sum, entry) => sum + entry.estimatedTokens, 0),
  });
}

function boundToSession(entry: OperationLedgerEntry, session: string, trace: string | null): boolean {
  return (trace !== null && entry.trace === trace)
    || entry.trace.includes(session)
    || entry.subject.includes(session)
    || entry.evidence.some((value) => value.includes(session));
}

/**
 * The continuous-learning recall: the most recent settled session-summary
 * finding from a prior session (findings are newest-first), so a fresh session
 * inherits what the last one learned and what it left as next-steps instead of
 * re-deriving it. Falls back to the latest summary overall when none is from a
 * different session.
 */
function latestSessionSummary(findings: readonly FindingRecord[], session: string | null): FindingRecord | null {
  const summaries = findings.filter((entry) => entry.predicate === "operations-manifold.session.summarized");
  return summaries.find((entry) => entry.session !== session) ?? summaries[0] ?? null;
}

/**
 * Render the session's office/duty standing: it is a receiver advertising skills
 * (the work-kinds it handles), acting under offices (the foci it works in), with
 * its current assignment load. Makes the offices↔work↔session coherence visible
 * to the agent as part of its grounding.
 */
/**
 * Render the campaign FRONT economically — at most a pointer line (campaign ·
 * objective · front N advancing / M stalled / K blocked) plus the next-task line
 * — and only when there is an open front (`campaign.current`). Pull, don't push:
 * the whole tree (projects, plans, every task) is one `read-campaign` call away;
 * the suit spends only the current front so a session always knows which campaign
 * it is inside, where the front stands, and what the next move is, without paying
 * to inject the forest each turn.
 */
function renderCampaign(lines: string[], campaign: CampaignReading): void {
  const front = campaign.current;
  if (front === null) return;
  const node = campaign.campaigns.find((item) => item.id === front.campaign.id) ?? null;
  const objective = node?.objective ?? null;
  const objectiveTag = objective === null ? "" : ` · ${objective.target} (${objective.status})`;
  const f = node?.front;
  const frontTag = f === undefined ? "" : ` · front: ${f.advancing.length} advancing / ${f.stalled.length} stalled / ${f.blocked.length} blocked`;
  lines.push(`\n**Campaign (run read-campaign for the tree):** ${front.campaign.title}${objectiveTag}${frontTag}`);
  if (front.task !== null) {
    const workTypeTag = front.task.workType === undefined ? "" : `[${front.task.workType}] `;
    lines.push(`- next: ${workTypeTag}${front.task.title}`);
  }
}

function renderReceiver(lines: string[], receiver: Receiver): void {
  lines.push(`\n**Office/duty standing (this session as receiver):**`);
  lines.push(`- advertises skills: ${receiver.skills.join(", ") || "none yet"}`);
  lines.push(`- acts under offices: ${receiver.offices.join(", ") || "operations-manifold"}`);
  lines.push(`- assignments: ${receiver.open} open / ${receiver.settled} settled`);
  lines.push("- inspect more with: read-assignments, read-work");
}

function renderInheritedSummary(lines: string[], finding: FindingRecord): void {
  const note = finding.note;
  if (note === null || typeof note !== "object" || Array.isArray(note)) return;
  const record = note as Readonly<Record<string, unknown>>;
  const nextSteps = stringArray(record["next_steps"]);
  const learned = stringArray(record["learned"]);
  const request = typeof record["request"] === "string" ? record["request"] : null;
  lines.push(`\n**Inherited from last session (${finding.session}):**`);
  if (request !== null) lines.push(`- it was working on: ${request}`);
  for (const step of nextSteps.slice(0, 5)) lines.push(`- next step: ${step}`);
  for (const item of learned.slice(0, 3)) lines.push(`- learned: ${item}`);
  lines.push("- inspect more with: read-session, read-recognition");
}

function stringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/**
 * Render the play-state read: the operation ledger seen through `gameFor` so the
 * agent perceives its work as play — Caillois mode, flow regime, level on the
 * shared curve, and the projection's own next-challenge/friction prompts.
 */
function renderPlayStatus(lines: string[], play: PlayStatus): void {
  const world = play.world;
  const session = play.session;
  const toNext = experienceToNextLevel(session.experience);
  lines.push(`**Operations play-state — ${play.identity.label}, this session**`);
  lines.push(`- Level ${session.level} · ${session.experience} xp (${toNext} to next) · ${session.mode}/${session.flow} · ${play.sessionMoves} operations, ~${play.sessionCtxTokens} ctx tokens${session.badges.length === 0 ? "" : ` · badges ${session.badges.join(", ")}`}`);
  const quest = session.challenges[0] ?? world.challenges[0];
  if (quest !== undefined) lines.push(`- Next quest: ${quest}`);
  const friction = session.friction[0] ?? world.friction[0];
  if (friction !== undefined) lines.push(`- Friction: ${friction}`);
  lines.push(`- (shared manifold world is level ${world.level} / ${world.experience} xp across all sessions — not yours)`);
}

function renderSession(lines: string[], session: SessionReading, identity: HarnessIdentity): void {
  const ready = session.codomain.ready ? "ready" : "not ready";
  const bindingSummary = session.codomain.bindings.map((binding) => `${binding.name}:${binding.ready ? "ready" : "open"}`).join(", ");
  lines.push(`\n**${identity.label} session binding:** ${session.domain.session} (${ready})`);
  lines.push(`- trace: ${session.domain.trace}`);
  lines.push(`- bindings: ${bindingSummary}`);
  lines.push(`- matched: operations ${session.operations.matched}, work ${session.work.matched}, messages ${session.messages.matched}, message channels ${session.messages.channels.length}`);
  if (session.messages.entries.length > 0) {
    lines.push("- recent session messages:");
    for (const message of session.messages.entries.slice(-3)) {
      const endpoint = [
        message.endpointCondition === null ? "" : `condition:${message.endpointCondition}`,
        message.endpointCharge === null ? "" : `charge:${message.endpointCharge}`,
        message.apiKeyPresent === null ? "" : `key:${message.apiKeyPresent ? "present" : "absent"}`,
      ].filter((item) => item !== "").join(", ");
      lines.push(`  - [${message.role}/${message.status}${endpoint === "" ? "" : `; ${endpoint}`}] ${message.speaker}: ${message.preview}`);
    }
  }
  if (session.codomain.pressures.length > 0) {
    lines.push("- session pressures:");
    for (const pressure of session.codomain.pressures.slice(0, 4)) lines.push(`  - [${pressure.severity}] ${pressure.id}: ${pressure.summary}`);
  }
  if (session.codomain.nextInterfaces.length > 0) {
    lines.push("- session interfaces:");
    for (const item of session.codomain.nextInterfaces.slice(0, 5)) lines.push(`  - ${item.bin}: ${item.purpose}`);
  }
}
