import type { EAVT, JsonValue } from "@emsenn/relating/writing";

import { operationsManifoldStatePath } from "../../../../package-surface.mts";
import { clamp, hash, isRecord, optionalText, requireText, slug as sharedSlug, stringList } from "../../../../records.mts";
import { appendContextEvent, contextLogEvent, ensureContextDirs } from "../../recording/library/context-recording.mts";
import type { ContextControlSnapshot } from "../../suiting/library/context-control.mts";
import { projectContextSuit, refreshContextControl } from "../../suiting/library/context-control.mts";
import type { ContextSuit } from "../../suiting/library/context-suit.mts";

export type ContextAdmissionParams = Readonly<{
  intent?: string | undefined;
  q?: string | undefined;
  focus?: string | undefined;
  candidateSources?: string | readonly string[] | undefined;
  sources?: string | readonly string[] | undefined;
  budget?: string | number | undefined;
  authority?: string | undefined;
  source?: string | undefined;
}>;

export type ContextSourceCandidate = Readonly<{
  uri: string;
  tier: "sense" | "rememberContexted-sense" | "learning";
  weight: number;
}>;

export type ContextAdmissionRecord = Readonly<{
  kind: "operations-manifold.context.admission";
  id: string;
  eventId: string;
  at: string;
  intent: string;
  focus: string | null;
  authority: string;
  budget: number;
  candidates: readonly ContextSourceCandidate[];
  evidence: readonly string[];
}>;

export type ContextAdmissionResult = Readonly<{
  kind: "operations-manifold.context.admit";
  accepted: true;
  event: EAVT;
  eavtJsonl: string;
  admission: ContextAdmissionRecord;
  suit: ContextSuit;
  snapshot: ContextControlSnapshot;
}>;

export async function admitContext(repoRoot: string, params: ContextAdmissionParams): Promise<ContextAdmissionResult> {
  const now = new Date().toISOString();
  const intent = requireText(params.intent ?? params.q, "context intent");
  const focus = optionalText(params.focus);
  const budget = budgetFor(params.budget);
  const authority = optionalText(params.authority) ?? "user";
  const candidates = sourceCandidates(params.candidateSources ?? params.sources, focus);
  const seed = { at: now, intent, focus, budget, authority, candidates };
  const eventId = `context-event:${hash(seed).slice(0, 24)}`;
  const admissionId = `context:${slug(intent)}:${hash({ intent, focus, at: now }).slice(0, 12)}`;
  const event = contextLogEvent(
    admissionId,
    "operations-manifold.context.admitted",
    {
      kind: "operations-manifold.context.event",
      event: "admitted",
      eventId,
      at: now,
      intent,
      ...(focus === null ? {} : { focus }),
      authority,
      budget,
      candidates,
      source: optionalText(params.source) ?? "operations-manifold.admit-context",
    },
    now,
    eventId,
  );

  await ensureContextDirs(repoRoot);
  const eavtJsonl = await appendContextEvent(repoRoot, event);
  const snapshot = await refreshContextControl(repoRoot);
  const admission = snapshot.admissions.find((item) => item.id === admissionId);
  if (admission === undefined) throw new Error(`context admission was not projected: ${admissionId}`);
  const suit = await projectContextSuit(repoRoot, { admission: admissionId });
  return Object.freeze({ kind: "operations-manifold.context.admit" as const, accepted: true as const, event, eavtJsonl, admission, suit, snapshot });
}

export function sourceCandidates(value: string | readonly string[] | undefined, focus: string | null): readonly ContextSourceCandidate[] {
  const explicit = stringList(value).map(sourceCandidateFromString);
  const candidates: ContextSourceCandidate[] = explicit.length === 0 ? [...defaultCandidates(focus)] : explicit;
  return Object.freeze(candidates.sort((left, right) => right.weight - left.weight || left.uri.localeCompare(right.uri)));
}

export function defaultCandidates(focus: string | null): readonly ContextSourceCandidate[] {
  return Object.freeze([
    candidate("AGENTS.md", "sense", 100),
    candidate(operationsManifoldStatePath("goals"), "sense", 96),
    candidate("content/_archive/animating/content/becoming/doing/working/working.md", "learning", 86),
    candidate("content/_archive/animating/content/becoming/doing/working/governing/content/individual/content/agent/agent.md", "learning", 84),
    candidate("content/_archive/animating/content/becoming/doing/working/governing/content/individual/content/agent/acting/loading-context-spacesuit/_archive/parameterized-agent-context.md", "rememberContexted-sense", 84),
    candidate("content/_archive/animating/content/becoming/doing/working/governing/content/individual/content/agent/acting/content/tool/content/model-context-protocol/_archive/agent-surface-is-mcp.md", "rememberContexted-sense", 80),
    candidate("content/_archive/animating/content/becoming/doing/working/governing/content/individual/content/agent/acting/planning/content/planning/task-decomposition/task-decomposition.md", "learning", 78),
    candidate("sites/ops.561.group/dev/docs/agentic-drift-control.md", "rememberContexted-sense", 88),
    candidate("triage/2026/05/24/claude-code-harness/docs/dev/journal/2026-05-28-context-spacesuit-and-memory.md", "rememberContexted-sense", 82),
    candidate("triage/2026/05/24/claude-code-harness/docs/dev/journal/2026-05-28-cognitive-layer.md", "rememberContexted-sense", 78),
    candidate("triage/2026/05/26/swarm-intelligence/README.md", "rememberContexted-sense", 74),
    ...(focus === null ? [] : [candidate(focus, "sense", 92)]),
  ]);
}

export function sourceCandidateFromString(value: string): ContextSourceCandidate {
  const parts = value.split("|").map((item) => item.trim()).filter((item) => item !== "");
  const tier = parts[1] === "learning" || parts[1] === "rememberContexted-sense" || parts[1] === "sense" ? parts[1] : "sense";
  const weight = parts[2] === undefined ? tierWeight(tier) : clamp(Number(parts[2]), 0, 100, tierWeight(tier));
  return candidate(parts[0] ?? value, tier, weight);
}

export function candidate(uri: string, tier: ContextSourceCandidate["tier"], weight: number): ContextSourceCandidate {
  return Object.freeze({ uri, tier, weight: Math.round(weight) });
}

export function sourceCandidate(value: JsonValue): ContextSourceCandidate | null {
  if (!isRecord(value) || typeof value["uri"] !== "string") return null;
  const tier = value["tier"] === "learning" || value["tier"] === "rememberContexted-sense" || value["tier"] === "sense" ? value["tier"] : "sense";
  return candidate(value["uri"], tier, typeof value["weight"] === "number" ? clamp(value["weight"], 0, 100, tierWeight(tier)) : tierWeight(tier));
}

export function tierWeight(tier: ContextSourceCandidate["tier"]): number {
  if (tier === "sense") return 90;
  if (tier === "rememberContexted-sense") return 70;
  return 45;
}

export function budgetFor(value: string | number | undefined): number {
  if (typeof value === "number") return clamp(value, 400, 16_000, 1600);
  const text = optionalText(value);
  if (text === null) return 1600;
  return clamp(Number(text), 400, 16_000, 1600);
}

function slug(value: string): string {
  return sharedSlug(value, "context", 56);
}
