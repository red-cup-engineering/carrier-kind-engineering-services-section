/**
 * learning/fiber — reading a consolidation back out: the always-loaded fiber a session opens with,
 * and the brief a carrier articulates new utterances against.
 *
 * Three-tier memory (research/predicated-agentic-orchestration-platform, three-tier-memory): the
 * always-loaded tier is the office fiber composed at session start, bounded by context economics and
 * curated by sharpening; the searchable tier is the log; deep storage is the substrate. The fiber
 * here is that first tier for what the founder has told: settled relations, the most restated first,
 * with the contested ones set apart as obstructions to repair, not rules to follow.
 *
 * `restated` is the pressure signal. A relation told again in a later session is one the always-
 * loaded tier failed to carry; the more sessions it took, the higher it ranks, and a relation the
 * fiber carries that is still restated is a candidate to promote from knowledge into a tool (a
 * check that runs instead of a sentence that is read).
 */
import { relationVocabulary } from "./vocabulary.mjs";

const said = (r) => r.for + r.against > 0;
const DIRECTIVES = new Set(["must", "must-not"]);
const verb = (r) => (r.reading === "denied" ? `not ${r.predicate}` : r.predicate);
const when = (r) => `${r.sessions} session${r.sessions === 1 ? "" : "s"}, last ${String(r.last).slice(0, 10)}`;
const quote = (r) => { const side = r.reading === "denied" ? "against" : "for"; const span = [...r.spans].sort((a, b) => (b.side === side) - (a.side === side) || b.span.length - a.span.length)[0]; return span ? ` — "${span.span.length > 110 ? `${span.span.slice(0, 110)}…` : span.span}"` : ""; };

/**
 * The always-loaded fiber, within `budget` characters: the directives restated across at least
 * `minimumSessions` sessions, most restated first, each with its fullest quote (up to 60% of the
 * budget); the other restated relations grouped by subject (up to 90% with the directives); then
 * the contested cells. Relations told in fewer sessions
 * stay in the searchable tier (learning-consolidate) — the fiber is curated by how often a relation
 * had to be said, per three-tier memory.
 */
export function fiber(consolidation, { budget = 12_000, minimumSessions = 2 } = {}) {
  if (consolidation?.kind !== "knowing.consolidation") throw new TypeError("knowing fiber: expects a knowing.consolidation");
  // Nothing told settles no standing: an empty journal reads as no fiber, never as a fiber of nothing.
  if (consolidation.utterances === 0) return "";
  const standing = consolidation.relations.filter((r) => (r.reading === "held" || r.reading === "denied") && said(r));
  const restated = standing.filter((r) => r.sessions >= minimumSessions);
  const directives = restated.filter((r) => DIRECTIVES.has(r.predicate));
  const relations = restated.filter((r) => !DIRECTIVES.has(r.predicate));
  const contested = consolidation.relations.filter((r) => r.reading === "contested" && said(r));
  const head = `What the founder has told, settled by knowing consolidate over ${consolidation.utterances} utterances in ${consolidation.sessions} sessions (${String(consolidation.from).slice(0, 10)} to ${String(consolidation.until).slice(0, 10)}). ${restated.length} relations were told in ${minimumSessions} or more sessions: each extra session is one where an earlier session did not carry it. They are standing, not suggestions. The ${standing.length - restated.length} relations told once are in learning-consolidate.`;
  const parts = [head];
  let used = head.length, omitted = 0;
  const take = (text, share = 1) => { if (used + text.length + 1 > budget * share) { omitted += 1; return false; } parts.push(text); used += text.length + 1; return true; };
  if (directives.length > 0) take("\nStanding directives, most restated first:");
  for (const r of directives) take(`- ${r.subject} ${verb(r)} ${r.object} (${when(r)})${quote(r)}`, 0.6);
  const bySubject = new Map();
  for (const r of relations) bySubject.set(r.subject, [...(bySubject.get(r.subject) ?? []), r]);
  for (const [subject, group] of [...bySubject.entries()].sort(([, a], [, b]) => b[0].sessions - a[0].sessions)) {
    take(`\n${subject}:\n${group.map((r) => `- ${r.subject} ${verb(r)} ${r.object} (${when(r)})`).join("\n")}`, 0.9);
  }
  if (contested.length > 0) take(`\nContested (told both ways; the latest telling is the newer position, and the other side is a repair to make — in the corpus, or in the articulation if it misread the utterance):\n${contested.map((r) => `- ${r.subject} ${r.predicate} ${r.object}: for ${r.for}, against ${r.against}, derived ${r.derived}; latest ${r.latest} (${String(r.last).slice(0, 10)})`).join("\n")}`);
  if (omitted > 0) parts.push(`\n(${omitted} further entries did not fit the ${budget}-character budget: learning-consolidate has them.)`);
  return parts.join("\n");
}

/** The brief a carrier articulates against: the relation vocabulary, the rules of articulation, and
 *  the tokens already settled (most-told first) so new tellings coincide with old ones. */
export function articulationBrief(consolidation, { tokens = 400 } = {}) {
  const counts = new Map();
  for (const r of consolidation?.relations ?? []) {
    if (r.for + r.against === 0) continue;
    for (const token of [r.subject, r.object]) counts.set(token, (counts.get(token) ?? 0) + r.for + r.against);
  }
  const known = [...counts.entries()].sort(([a, x], [b, y]) => (y - x) || (a < b ? -1 : 1)).slice(0, tokens).map(([token]) => token);
  return Object.freeze({
    kind: "knowing.articulation-brief",
    predicates: relationVocabulary.definitions.map(({ name, category, domain, range, description }) => Object.freeze({ name, category, domain, range, description })),
    rules: Object.freeze([
      "Tell only relations the utterance itself states or directly presupposes; never add background knowledge.",
      "Each claim is (subject, predicate, object, side, span): tokens are kebab-case names, predicate is one of the vocabulary, side is for or against, span quotes the utterance.",
      "A negation is the against side of the same cell, not a new predicate; must/must-not are the one deontic pair.",
      "Reuse a known token whenever it names the same thing; when the utterance names one thing two ways, tell (a same-as b).",
      "A token that names a house glossary term or package uses that name (metroplat, signcell, feltos, obsmetrologia).",
      "Directives to agents take the subject agent (or a named office or session); corrections tell the rejected practice with must-not and the wanted one with must.",
      "Keep the relation, drop the affect: anger, emphasis and repetition are not claims.",
      "Pasted material (logs, tool output, another model's answer, a quoted document) is not the utterer's telling: articulate only the utterer's own sentences around it.",
      "Never tell a claim about anyone's health, household, benefits, personal finances, contact details or credentials.",
      "An utterance with no relational content (\"continue\", \"yes\") articulates to no claims.",
    ]),
    tokens: Object.freeze(known),
  });
}
