import { hash, notNull, optionalText } from "../../../../records.mts";
import type { GoalSnapshot } from "../../../../goals.mts";
import type { ActiveWorkRecord, WorkSnapshot } from "../../../../work-management.mts";
import { budgetFor, defaultCandidates, type ContextAdmissionRecord, type ContextSourceCandidate } from "../../admitting/library/context-admission.mts";

export type ContextSuitParams = Readonly<{
  admission?: string | undefined;
  intent?: string | undefined;
  q?: string | undefined;
  focus?: string | undefined;
  office?: string | undefined;
  agent?: string | undefined;
  session?: string | undefined;
  budget?: string | number | undefined;
}>;

export type ContextSuitWork = Readonly<{
  id: string;
  title: string;
  status: ActiveWorkRecord["status"];
  workStatus: ActiveWorkRecord["workStatus"];
  gate: ActiveWorkRecord["gate"];
  focus: string | null;
  agent: string;
  session: string | null;
  evidence: readonly string[];
}>;

export type ContextSuitInterface = Readonly<{
  bin: string;
  purpose: string;
  params: Readonly<Record<string, string>>;
}>;

export type ContextSuit = Readonly<{
  kind: "operations-manifold.context.suit";
  id: string;
  admissionId: string | null;
  generatedAt: string;
  intent: string;
  focus: string | null;
  office: string;
  agent: string;
  session: string | null;
  budget: number;
  identity: string;
  constraints: readonly string[];
  capabilities: readonly string[];
  workload: readonly ContextSuitWork[];
  interfaces: readonly ContextSuitInterface[];
  perception: readonly ContextSourceCandidate[];
  memory: readonly ContextSourceCandidate[];
  mission: string;
  omitted: readonly ContextSourceCandidate[];
  provenance: readonly string[];
  tokenEstimate: number;
}>;

export function suitFor(admission: ContextAdmissionRecord | null, params: ContextSuitParams, goals: GoalSnapshot, work: WorkSnapshot): ContextSuit {
  const generatedAt = new Date().toISOString();
  const intent = optionalText(params.intent ?? params.q) ?? admission?.intent ?? goals.goals[0]?.text ?? "Operate 561 Group Operations Manifold against filed goals.";
  const focus = optionalText(params.focus) ?? admission?.focus ?? goals.goals[0]?.focus ?? "sites/ops.561.group";
  const agent = optionalText(params.agent) ?? "codex";
  const office = optionalText(params.office) ?? officeFor(agent, focus);
  const session = optionalText(params.session);
  const budget = budgetFor(params.budget ?? admission?.budget);
  const candidates = mergedCandidates(defaultCandidates(focus), admission?.candidates ?? []);
  const ranked = [...candidates].sort((left, right) => right.weight - left.weight || left.uri.localeCompare(right.uri));
  const perception = Object.freeze(ranked.filter((item) => item.tier !== "learning").slice(0, 8));
  const memory = Object.freeze(ranked.filter((item) => item.tier !== "sense").slice(0, 6));
  const included = new Set([...perception, ...memory].map((item) => item.uri));
  const omitted = Object.freeze(ranked.filter((item) => !included.has(item.uri)));
  const activeGoals = goals.goals.filter((goal) => goals.open.includes(goal.id)).slice(0, 4);
  const workload = relevantWork(work, { intent, focus, office, agent, session });
  const interfaces = suitInterfaces(intent, focus, office, agent, session, workload, activeGoals.length);
  const provenance = Object.freeze([
    ...(admission === null ? [] : admission.evidence),
    ...activeGoals.flatMap((goal) => goal.evidence),
    ...workload.flatMap((item) => item.evidence),
  ]);
  return Object.freeze({
    kind: "operations-manifold.context.suit" as const,
    id: `suit:${hash({ admission: admission?.id ?? null, intent, focus, budget, generatedAt }).slice(0, 16)}`,
    admissionId: admission?.id ?? null,
    generatedAt,
    intent,
    focus,
    office,
    agent,
    session,
    budget,
    identity: `561 Group Operations Manifold context suit for ${agent} acting from the ${office} office${session === null ? "" : ` in session ${session}`}.`,
    constraints: Object.freeze([
      "Do not treat context presence as durable learning.",
      "File action evidence before projecting finite state.",
      "Prefer existing computing, gaming, animating, then relating carriers.",
      "Keep contradictory witnesses visible until later settlement.",
      "Preserve user goals as append-only EAVT evidence.",
      "Project the acting agent's context, not a universal context dump.",
    ]),
    capabilities: Object.freeze(["context.admit", "context.suit", "drift.assess", "goal.fold", "work.fold", "heartbeat.read", "trace.fold", "mcp.resource-template"]),
    workload,
    interfaces,
    perception,
    memory,
    mission: missionText(intent, activeGoals.map((goal) => goal.id), workload.map((item) => item.id)),
    omitted,
    provenance,
    tokenEstimate: estimateTokens([
      intent,
      focus,
      office,
      agent,
      session ?? "",
      ...ranked.map((item) => item.uri),
      ...activeGoals.map((goal) => goal.title),
      ...workload.map((item) => item.title),
      ...interfaces.map((item) => item.bin),
    ]),
  });
}

type RelevantWorkParams = Readonly<{
  intent: string;
  focus: string;
  office: string;
  agent: string;
  session: string | null;
}>;

function relevantWork(work: WorkSnapshot, params: RelevantWorkParams): readonly ContextSuitWork[] {
  const { intent, focus, office, agent, session } = params;
  const needles = terms([intent, focus].join(" "));
  const items = work.items
    .filter((item) => item.status !== "complete")
    .map((item) => Object.freeze({ item, score: workRelevance(item, { intent, focus, office, agent, session }, needles) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || right.item.updatedAt.localeCompare(left.item.updatedAt))
    .slice(0, 5)
    .map(({ item }) => Object.freeze({
      id: item.id,
      title: item.title,
      status: item.status,
      workStatus: item.workStatus,
      gate: item.gate,
      focus: item.focus,
      agent: item.agent,
      session: item.session,
      evidence: Object.freeze(item.evidence.slice(0, 4)),
    }));
  return Object.freeze(items);
}

function workRelevance(item: ActiveWorkRecord, params: RelevantWorkParams, needles: readonly string[]): number {
  let score = 0;
  if (params.session !== null && item.session === params.session) score += 100;
  if (item.agent === params.agent || item.assignedTo.includes(params.agent) || item.owner === params.agent) score += 40;
  if (item.focus === params.focus) score += 35;
  if (item.evidence.includes(params.focus)) score += 24;
  if (matchesOffice(item, params.office)) score += 16;
  if (overlaps(needles, searchable([item.title, item.intent, item.focus, item.agent, item.owner, item.session, ...item.assignedTo, ...item.evidence]))) score += 12;
  if (item.gate === "stop") score += 4;
  return score;
}

function suitInterfaces(
  intent: string,
  focus: string,
  office: string,
  agent: string,
  session: string | null,
  workload: readonly ContextSuitWork[],
  openGoalCount: number,
): readonly ContextSuitInterface[] {
  const base = compactParams({ focus, intent, office, agent, session });
  const workReadSession = session === null || !workload.some((item) => item.session === session) ? null : session;
  const interfaces: ContextSuitInterface[] = [
    iface("project-context-suit", "project the acting agent's scoped context suit", base),
    iface("plan-codex", "bind Codex steps to current goals, work, and context", base),
    iface("read-work", "read the scoped work field for this agent before mutating it", compactParams({ focus, status: "active", agent, session: workReadSession, limit: "8", detail: "items" })),
    iface("market-file-touch", "inspect read demand and write pressure for files relevant to this focus", { focus, limit: "12" }),
    iface("record-operation", "record tool/file evidence into the operations ledger", compactParams({ focus, note: intent, agent, session })),
  ];
  if (workload.length === 0) {
    interfaces.push(iface("start-work", "create durable read-work for this context before execution", {
      title: intent,
      intent,
      success: "The read-work is completed with evidence recorded in the operations ledger.",
      workKind: "task",
      focus,
      office,
      agent,
      ...(session === null ? {} : { session }),
    }));
  } else {
    const active = workload[0]!;
    interfaces.push(
      iface("update-work", "append progress or evidence to the matched active read-work item", { id: active.id, note: intent }),
      iface("complete-work", "settle the matched active read-work item when evidence proves completion", { id: active.id, outcome: intent }),
    );
  }
  if (openGoalCount === 0) {
    interfaces.push(iface("admit-goal-document", "admit this objective as a durable goal if it is larger than a single read-work item", {
      title: intent,
      text: intent,
      focus,
      priority: "70",
    }));
  }
  return Object.freeze(interfaces);
}

function iface(bin: string, purpose: string, params: Readonly<Record<string, string>>): ContextSuitInterface {
  return Object.freeze({ bin, purpose, params: Object.freeze({ ...params }) });
}

function compactParams(params: Readonly<Record<string, string | null>>): Readonly<Record<string, string>> {
  return Object.freeze(Object.fromEntries(Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== null && entry[1] !== "")));
}

function missionText(intent: string, goals: readonly string[], work: readonly string[]): string {
  const parts = [intent];
  if (goals.length > 0) parts.push(`Active filed goals: ${goals.join(", ")}`);
  if (work.length > 0) parts.push(`Active work: ${work.join(", ")}`);
  return parts.join(" ");
}

function estimateTokens(parts: readonly string[]): number {
  return Math.max(1, Math.ceil(parts.join("\n").length / 4));
}

function terms(value: string): readonly string[] {
  return Object.freeze(value.toLowerCase().split(/[^a-z0-9]+/u).filter((term) => term !== ""));
}

function searchable(values: readonly (string | null)[]): string {
  return values.filter(notNull).join(" ").toLowerCase();
}

function overlaps(needles: readonly string[], haystack: string): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function matchesOffice(item: ActiveWorkRecord, office: string): boolean {
  const haystack = searchable([item.title, item.intent, item.focus, item.owner, item.agent, ...item.assignedTo, ...item.evidence]);
  return haystack.includes(office.toLowerCase());
}

function officeFor(agent: string, focus: string): string {
  const lowerFocus = focus.toLowerCase();
  if (lowerFocus.includes("ops.561.group") || lowerFocus.includes("operations")) return "operations";
  if (lowerFocus.includes("dev.bare-cedar-fog.emsenn.net") || lowerFocus.includes("dev")) return "development";
  if (agent.toLowerCase().includes("claude") || agent.toLowerCase().includes("codex")) return "development";
  return "operations";
}

function mergedCandidates(...groups: readonly (readonly ContextSourceCandidate[])[]): readonly ContextSourceCandidate[] {
  const byUri = new Map<string, ContextSourceCandidate>();
  for (const candidate of groups.flat()) {
    const current = byUri.get(candidate.uri);
    if (current === undefined || candidate.weight > current.weight) byUri.set(candidate.uri, candidate);
  }
  return Object.freeze([...byUri.values()]);
}
