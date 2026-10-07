export const RECOGNITION_ORDER = Object.freeze(["sense", "rememberContexted-sense", "learning"]);

export function recognitionCandidate(value) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const tier = recognitionTier(value.tier);
    return Object.freeze({ uri: requiredText(value.uri, "recognition uri"), tier, weight: weight(value.weight, tier) });
  }
  const text = requiredText(value, "recognition source");
  const parts = text.split("|").map((item) => item.trim());
  const uri = parts[0] || text;
  const tier = recognitionTier(parts[1]);
  return Object.freeze({ uri, tier, weight: weight(parts[2], tier) });
}

export function rankRecognition(candidates, { subject = null, limit = 24 } = {}) {
  const subjectFilter = optionalText(subject);
  const boundedLimit = clamp(Number(limit), 1, 80, 24);
  const entries = candidates.map(recognitionCandidate).map(recognitionEntry)
    .filter((entry) => subjectFilter === null || entry.subject === subjectFilter || entry.subject.includes(subjectFilter))
    .sort(compareRecognition);
  const recognized = new Set();
  return Object.freeze(entries.slice(0, boundedLimit).map((entry) => {
    const decision = recognized.has(entry.subject) ? "subordinate" : "recognized";
    recognized.add(entry.subject);
    return Object.freeze({
      ...entry,
      decision,
      reason: decision === "recognized"
        ? `${entry.tier} is the highest-recognized available tier for ${entry.subject}`
        : `subordinate to higher-recognition evidence for ${entry.subject}`,
    });
  }));
}

export function recognitionConflicts(entries) {
  const bySubject = new Map();
  for (const entry of entries) bySubject.set(entry.subject, [...(bySubject.get(entry.subject) ?? []), entry]);
  return Object.freeze([...bySubject.entries()].flatMap(([subject, values]) => {
    if (values.length < 2 || new Set(values.map((entry) => entry.claim)).size < 2) return [];
    const ordered = [...values].sort(compareRecognition);
    return [Object.freeze({
      subject,
      winner: ordered[0],
      alternatives: Object.freeze(ordered.slice(1)),
      rule: conflictRule(ordered[0], ordered.slice(1)),
    })];
  }));
}

export function readRecognition(params = {}) {
  const candidates = sourceList(params.sources ?? params.source);
  if (candidates.length === 0) throw new TypeError("recognition sources are required");
  const subject = optionalText(params.subject);
  const ranking = rankRecognition(candidates, { subject, limit: params.limit });
  return Object.freeze({
    kind: "recognition.ranking",
    ranking,
    conflicts: recognitionConflicts(ranking),
    rule: Object.freeze({
      order: RECOGNITION_ORDER,
      claim: "sense outranks rememberContexted-sense, rememberContexted-sense outranks learning, and ties resolve by weight then uri",
    }),
  });
}

export function weightRecognition(params = {}) {
  const reading = readRecognition(params);
  const subject = optionalText(params.subject);
  return Object.freeze({
    kind: "recognition.weight",
    subject,
    selected: reading.ranking[0] ?? null,
    ranking: reading.ranking,
    conflicts: reading.conflicts,
  });
}

function recognitionEntry(source) {
  const parsed = parseClaim(source.uri);
  return Object.freeze({
    uri: source.uri,
    subject: parsed.subject,
    claim: parsed.claim,
    tier: source.tier,
    observedWeight: source.weight,
    recognitionWeight: clamp(source.weight + tierBonus(source.tier), 0, 100, tierWeight(source.tier)),
    precedence: tierPrecedence(source.tier),
    decision: "omitted",
    reason: "not ranked yet",
  });
}

function parseClaim(uri) {
  const parts = uri.split(/\s*(?:=>|->|\|)\s*/u).map((item) => item.trim()).filter(Boolean);
  return Object.freeze(parts.length >= 2
    ? { subject: parts[0], claim: parts.slice(1).join(" -> ") }
    : { subject: uri, claim: uri });
}

function compareRecognition(left, right) {
  return right.precedence - left.precedence
    || right.recognitionWeight - left.recognitionWeight
    || right.observedWeight - left.observedWeight
    || left.uri.localeCompare(right.uri);
}

function conflictRule(winner, alternatives) {
  if (winner.tier === "sense" && alternatives.some((entry) => entry.tier === "learning")) return "sense-over-learning";
  if (winner.tier === "rememberContexted-sense" && alternatives.some((entry) => entry.tier === "learning")) return "rememberContexted-sense-over-learning";
  return "weight";
}

function sourceList(value) {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.filter((item) => typeof item === "object" || optionalText(item) !== null);
  return String(value).split(/\r?\n|,/u).map((item) => item.trim()).filter(Boolean);
}

function recognitionTier(value) {
  return RECOGNITION_ORDER.includes(value) ? value : "sense";
}

function tierPrecedence(tier) {
  return tier === "sense" ? 3 : tier === "rememberContexted-sense" ? 2 : 1;
}

function tierBonus(tier) {
  return tier === "sense" ? 10 : tier === "rememberContexted-sense" ? 4 : 0;
}

function tierWeight(tier) {
  return tier === "sense" ? 90 : tier === "rememberContexted-sense" ? 70 : 45;
}

function weight(value, tier) {
  return value === undefined ? tierWeight(tier) : clamp(Number(value), 0, 100, tierWeight(tier));
}

function requiredText(value, label) {
  const text = optionalText(value);
  if (text === null) throw new TypeError(`${label} is required`);
  return text;
}

function optionalText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function clamp(value, min, max, fallback) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback;
}
