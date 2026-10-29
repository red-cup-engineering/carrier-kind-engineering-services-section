import { contextControl, projectContextSuit, type ContextSourceCandidate } from "./operating/contextualizing/suiting/library/context-control.mts";
import { clamp, optionalText, stringList } from "./records.mts";

export type RecognitionParams = Readonly<{
  q?: string | undefined;
  query?: string | undefined;
  intent?: string | undefined;
  focus?: string | undefined;
  admission?: string | undefined;
  sources?: string | readonly string[] | undefined;
  source?: string | readonly string[] | undefined;
  subject?: string | undefined;
  limit?: string | number | undefined;
}>;

export type RecognitionTier = ContextSourceCandidate["tier"];

export type RecognitionEntry = Readonly<{
  uri: string;
  subject: string;
  claim: string;
  tier: RecognitionTier;
  observedWeight: number;
  recognitionWeight: number;
  precedence: number;
  decision: "recognized" | "subordinate" | "omitted";
  reason: string;
}>;

export type RecognitionConflict = Readonly<{
  subject: string;
  winner: RecognitionEntry;
  alternatives: readonly RecognitionEntry[];
  rule: "sense-over-learning" | "rememberContexted-sense-over-learning" | "weight";
}>;

export type RecognitionReading = Readonly<{
  kind: "operations-manifold.recognition";
  generatedAt: string;
  intent: string;
  focus: string | null;
  source: "project-context-suit" | "params";
  ranking: readonly RecognitionEntry[];
  conflicts: readonly RecognitionConflict[];
  rule: Readonly<{
    order: readonly ["sense", "rememberContexted-sense", "learning"];
    claim: "sense outranks rememberContexted-sense, rememberContexted-sense outranks learning, and ties resolve by weight then uri";
  }>;
}>;

export type RecognitionWeightReading = Readonly<{
  kind: "operations-manifold.weight-recognition";
  generatedAt: string;
  subject: string | null;
  selected: RecognitionEntry | null;
  ranking: readonly RecognitionEntry[];
  conflicts: readonly RecognitionConflict[];
}>;

export async function recognition(repoRoot: string, params: RecognitionParams = {}): Promise<RecognitionReading> {
  const intent = optionalText(params.intent ?? params.q ?? params.query) ?? "weight-recognitioned memory";
  const focus = optionalText(params.focus);
  const explicit = sourceCandidates(params.sources ?? params.source);
  const candidates = explicit.length === 0
    ? await contextCandidates(repoRoot, params, intent, focus)
    : explicit;
  const ranking = rankRecognition(candidates, optionalText(params.subject), limitFor(params.limit));
  return Object.freeze({
    kind: "operations-manifold.recognition" as const,
    generatedAt: new Date().toISOString(),
    intent,
    focus,
    source: explicit.length === 0 ? "project-context-suit" as const : "params" as const,
    ranking,
    conflicts: recognitionConflicts(ranking),
    rule: Object.freeze({
      order: Object.freeze(["sense", "rememberContexted-sense", "learning"] as const),
      claim: "sense outranks rememberContexted-sense, rememberContexted-sense outranks learning, and ties resolve by weight then uri" as const,
    }),
  });
}

export async function recognitionWeight(repoRoot: string, params: RecognitionParams = {}): Promise<RecognitionWeightReading> {
  const reading = await recognition(repoRoot, params);
  const subject = optionalText(params.subject);
  const ranking = subject === null
    ? reading.ranking
    : Object.freeze(reading.ranking.filter((entry) => entry.subject === subject || entry.subject.includes(subject)));
  return Object.freeze({
    kind: "operations-manifold.weight-recognition" as const,
    generatedAt: new Date().toISOString(),
    subject,
    selected: ranking[0] ?? null,
    ranking,
    conflicts: recognitionConflicts(ranking),
  });
}

async function contextCandidates(
  repoRoot: string,
  params: RecognitionParams,
  intent: string,
  focus: string | null,
): Promise<readonly ContextSourceCandidate[]> {
  const [control, suit] = await Promise.all([
    contextControl(repoRoot),
    projectContextSuit(repoRoot, {
      admission: params.admission,
      intent,
      focus: focus ?? undefined,
    }),
  ]);
  const byUri = new Map<string, ContextSourceCandidate>();
  for (const source of [
    ...control.admissions.flatMap((admission) => admission.candidates),
    ...suit.perception,
    ...suit.memory,
    ...suit.omitted,
  ]) {
    const prior = byUri.get(source.uri);
    if (prior === undefined || compareCandidate(source, prior) < 0) byUri.set(source.uri, source);
  }
  return Object.freeze([...byUri.values()]);
}

function rankRecognition(
  candidates: readonly ContextSourceCandidate[],
  subjectFilter: string | null,
  limit: number,
): readonly RecognitionEntry[] {
  const entries = candidates
    .map(recognitionEntry)
    .filter((entry) => subjectFilter === null || entry.subject === subjectFilter || entry.subject.includes(subjectFilter))
    .sort(compareRecognition);
  const winners = new Set<string>();
  const decided = entries.map((entry) => {
    const decision = winners.has(entry.subject) ? "subordinate" as const : "recognized" as const;
    winners.add(entry.subject);
    return Object.freeze({
      ...entry,
      decision,
      reason: decision === "recognized"
        ? `${entry.tier} is the highest-recognized available tier for ${entry.subject}`
        : `subordinate to higher-recognition evidence for ${entry.subject}`,
    });
  });
  return Object.freeze(decided.slice(0, limit).map((entry, index) => index < limit ? entry : Object.freeze({ ...entry, decision: "omitted" as const })));
}

function recognitionEntry(source: ContextSourceCandidate): RecognitionEntry {
  const parsed = parseClaim(source.uri);
  const recognitionWeight = clamp(source.weight + tierBonus(source.tier), 0, 100, tierWeight(source.tier));
  return Object.freeze({
    uri: source.uri,
    subject: parsed.subject,
    claim: parsed.claim,
    tier: source.tier,
    observedWeight: source.weight,
    recognitionWeight,
    precedence: tierPrecedence(source.tier),
    decision: "omitted" as const,
    reason: "not ranked yet",
  });
}

function recognitionConflicts(entries: readonly RecognitionEntry[]): readonly RecognitionConflict[] {
  const bySubject = new Map<string, RecognitionEntry[]>();
  for (const entry of entries) {
    const bucket = bySubject.get(entry.subject) ?? [];
    bucket.push(entry);
    bySubject.set(entry.subject, bucket);
  }
  return Object.freeze([...bySubject.entries()].flatMap(([subject, bucket]) => {
    const claims = new Set(bucket.map((entry) => entry.claim));
    if (bucket.length < 2 || claims.size < 2) return [];
    const ordered = [...bucket].sort(compareRecognition);
    const winner = ordered[0];
    if (winner === undefined) return [];
    return [Object.freeze({
      subject,
      winner,
      alternatives: Object.freeze(ordered.slice(1)),
      rule: conflictRule(winner, ordered.slice(1)),
    })];
  }));
}

function conflictRule(winner: RecognitionEntry, alternatives: readonly RecognitionEntry[]): RecognitionConflict["rule"] {
  if (winner.tier === "sense" && alternatives.some((entry) => entry.tier === "learning")) return "sense-over-learning";
  if (winner.tier === "rememberContexted-sense" && alternatives.some((entry) => entry.tier === "learning")) return "rememberContexted-sense-over-learning";
  return "weight";
}

function compareCandidate(left: ContextSourceCandidate, right: ContextSourceCandidate): number {
  return tierPrecedence(right.tier) - tierPrecedence(left.tier) || right.weight - left.weight || left.uri.localeCompare(right.uri);
}

function compareRecognition(left: RecognitionEntry, right: RecognitionEntry): number {
  return right.precedence - left.precedence
    || right.recognitionWeight - left.recognitionWeight
    || right.observedWeight - left.observedWeight
    || left.uri.localeCompare(right.uri);
}

function sourceCandidates(value: string | readonly string[] | undefined): readonly ContextSourceCandidate[] {
  return Object.freeze(stringList(value).map(sourceCandidate));
}

function sourceCandidate(value: string): ContextSourceCandidate {
  const parts = value.split("|").map((item) => item.trim());
  const uri = parts[0] === undefined || parts[0] === "" ? value : parts[0];
  const tier = tierOf(parts[1]);
  const weight = parts[2] === undefined ? tierWeight(tier) : clamp(Number(parts[2]), 0, 100, tierWeight(tier));
  return Object.freeze({ uri, tier, weight });
}

function parseClaim(uri: string): Readonly<{ subject: string; claim: string }> {
  const parts = uri.split(/\s*(?:=>|->|\|)\s*/u).map((item) => item.trim()).filter((item) => item !== "");
  if (parts.length >= 2) return Object.freeze({ subject: parts[0] ?? uri, claim: parts.slice(1).join(" -> ") });
  return Object.freeze({ subject: uri, claim: uri });
}

function tierOf(value: string | undefined): RecognitionTier {
  if (value === "sense" || value === "rememberContexted-sense" || value === "learning") return value;
  return "sense";
}

function tierPrecedence(tier: RecognitionTier): number {
  if (tier === "sense") return 3;
  if (tier === "rememberContexted-sense") return 2;
  return 1;
}

function tierBonus(tier: RecognitionTier): number {
  if (tier === "sense") return 10;
  if (tier === "rememberContexted-sense") return 4;
  return 0;
}

function tierWeight(tier: RecognitionTier): number {
  if (tier === "sense") return 90;
  if (tier === "rememberContexted-sense") return 70;
  return 45;
}

function limitFor(value: string | number | undefined): number {
  if (typeof value === "number") return clamp(value, 1, 80, 24);
  const text = optionalText(value);
  return text === null ? 24 : clamp(Number(text), 1, 80, 24);
}
