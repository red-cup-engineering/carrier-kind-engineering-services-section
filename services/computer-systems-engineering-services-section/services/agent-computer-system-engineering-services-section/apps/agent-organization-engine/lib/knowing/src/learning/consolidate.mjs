/**
 * learning/consolidate — utterances settled into knowledge: observation → articulation → settled
 * section, the first arrow of the settlement path (observation → instinct → skill → tool).
 *
 * Specified by the predicated agentic orchestration platform research (agency-services-section
 * research/predicated-agentic-orchestration-platform): consolidation-as-settlement ("not a separate
 * summarization step, not an LLM-pass over chat logs, but a closure-rule application"), the
 * `consolidate` transformer (compose observation cells pointwise, settle under learning-channel
 * rules, witness the run, idempotent on settled input), instinct-confidence-is-closure-fixpoint-measure
 * (confidence is the knowledge-order distance between the settlement over O and over an extension
 * O', never a count; ⊤-cells are low confidence), and anomaly-as-contradiction (a contested cell is
 * the visible failure, not an exception).
 *
 * The one inference-bearing step is articulation: a carrier reads an utterance and tells cells in
 * the relation vocabulary, each citing a span of the utterance. That is the aperiodic enactor
 * reaching past closure (knowing/dreaming), done once per utterance and kept as a record. Everything
 * here is deterministic over those records: the same articulations settle to the same section.
 *
 * Readings are SignCell's: extremal family held / denied / contested / unknown.
 */
import { address, cell, cellSet, sidesOf } from "@red-cup-engineering/signcell/cell";
import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { rule } from "@red-cup-engineering/signchain/rules";
import { closureOrbit } from "@red-cup-engineering/signcraft/settle";
import { makeContext, lawfulBasis, extent } from "@red-cup-engineering/metrologic/closure/formal-context";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { deonticOpposites, isToken, relationPredicates, transitivePredicates } from "./vocabulary.mjs";

const SIDES = ["for", "against"];
const PREDICATES = new Set(relationPredicates);
const SPAN_LIMIT = 280;

/** Admit one articulation record; refuses anything consolidation could not settle. */
export function articulation(record) {
  const issues = [];
  const { observation, session, at, utterer, carrier, articulator, claims } = record ?? {};
  if (typeof observation !== "string" || !observation.startsWith("ni:")) issues.push("observation must be the utterance's ni: address");
  for (const [field, value] of [["session", session], ["at", at], ["utterer", utterer], ["carrier", carrier], ["articulator", articulator]]) {
    if (typeof value !== "string" || value === "") issues.push(`${field} must be non-empty text`);
  }
  if (typeof at === "string" && Number.isNaN(Date.parse(at))) issues.push("at must be an ISO timestamp");
  if (!Array.isArray(claims)) issues.push("claims must be an array (empty when the utterance tells no relation)");
  const admittedClaims = (Array.isArray(claims) ? claims : []).map((claim, index) => {
    const where = `claims[${index}]`;
    if (!isToken(claim?.subject)) issues.push(`${where}.subject must be a kebab-case token`);
    if (!isToken(claim?.object)) issues.push(`${where}.object must be a kebab-case token`);
    if (!PREDICATES.has(claim?.predicate)) issues.push(`${where}.predicate ${JSON.stringify(claim?.predicate)} is not in the relation vocabulary`);
    if (!SIDES.includes(claim?.side)) issues.push(`${where}.side must be "for" or "against"`);
    if (typeof claim?.span !== "string" || claim.span.trim() === "") issues.push(`${where}.span must quote the utterance`);
    return Object.freeze({ subject: claim?.subject, predicate: claim?.predicate, object: claim?.object, side: claim?.side, span: String(claim?.span ?? "").slice(0, SPAN_LIMIT) });
  });
  if (issues.length > 0) throw new TypeError(`knowing articulation: ${issues.join("; ")}`);
  return Object.freeze({ kind: "knowing.articulation", observation, session, at, utterer, carrier, articulator, claims: Object.freeze(admittedClaims) });
}

/** Admit one naming record: a carrier's judgment that several tokens name one thing, and which
 *  token names it; `negations` are tokens naming its opposite practice (leaving-work-uncommitted to
 *  commit-and-push), so a directive about one is the converse directive about the other. Namings are
 *  the articulating carrier's own tellings, kept apart from the utterer's: they merge tokens and
 *  never add evidence to a relation. */
export function naming(record) {
  const { token, names = [], negations = [], articulator, basis } = record ?? {};
  const issues = [];
  if (!isToken(token)) issues.push("token must be a kebab-case token");
  if (!Array.isArray(names) || !names.every(isToken)) issues.push("names must be an array of tokens");
  if (!Array.isArray(negations) || !negations.every(isToken)) issues.push("negations must be an array of tokens");
  if (Array.isArray(names) && Array.isArray(negations) && names.length + negations.length === 0) issues.push("a naming names at least one other token");
  if (typeof articulator !== "string" || articulator === "") issues.push("articulator must be non-empty text");
  if (issues.length > 0) throw new TypeError(`knowing naming: ${issues.join("; ")}`);
  return Object.freeze({
    kind: "knowing.naming",
    token,
    names: Object.freeze([...new Set(names.filter((name) => name !== token))].sort()),
    ...(negations.length > 0 ? { negations: Object.freeze([...new Set(negations)].sort()) } : {}),
    articulator,
    ...(typeof basis === "string" ? { basis } : {}),
  });
}

// — aliases: namings, and same-as told for, merge tokens onto one canonical token —

function canonicalizer(records, namings = []) {
  const mentions = new Map();
  const mention = (token) => mentions.set(token, (mentions.get(token) ?? 0) + 1);
  const parent = new Map();
  const find = (token) => { let root = token; while (parent.has(root) && parent.get(root) !== root) root = parent.get(root); return root; };
  // The canonical token is the most-told name; on a tie the shorter, then the first in code-point order.
  const prefer = (left, right) => ((mentions.get(right) ?? 0) - (mentions.get(left) ?? 0)) || (left.length - right.length) || (left < right ? -1 : left > right ? 1 : 0);
  for (const record of records) for (const claim of record.claims) { mention(claim.subject); mention(claim.object); }
  // A token a naming names is the canonical one wherever it meets another root.
  const named = new Set(namings.map((n) => n.token));
  const join = (left, right) => {
    const a = find(left), b = find(right);
    if (a === b) return;
    const [keep, fold] = named.has(a) && !named.has(b) ? [a, b] : named.has(b) && !named.has(a) ? [b, a] : prefer(a, b) <= 0 ? [a, b] : [b, a];
    parent.set(fold, keep);
    parent.set(keep, keep);
  };
  for (const n of namings) for (const name of n.names) join(n.token, name);
  for (const record of records) for (const claim of record.claims) {
    if (claim.predicate === "same-as" && claim.side === "for" && claim.subject !== claim.object) join(claim.subject, claim.object);
  }
  const classes = new Map();
  for (const token of mentions.keys()) {
    const root = find(token);
    if (root !== token) classes.set(root, [...(classes.get(root) ?? [root]), token].sort());
  }
  return { canonical: find, aliases: Object.freeze([...classes.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([token, names]) => Object.freeze({ token, names: Object.freeze(names) }))), mentions };
}

// — the learning-channel rules —

function transitiveRules(cells) {
  const rules = [];
  for (const predicate of transitivePredicates) {
    const edges = new Map();
    for (const at of cells) if (at.predicate === predicate && sidesOf(at)[0] && at.subject !== at.object) {
      edges.set(at.subject, [...(edges.get(at.subject) ?? []), at.object]);
    }
    // Reachability, then one rule per derivable step (a p b) ∧ (b p c) → (a p c); chaining rules reach the closure.
    const reach = new Map();
    const reachable = (from) => {
      if (reach.has(from)) return reach.get(from);
      const seen = new Set(), stack = [...(edges.get(from) ?? [])];
      while (stack.length > 0) { const next = stack.pop(); if (seen.has(next) || next === from) continue; seen.add(next); stack.push(...(edges.get(next) ?? [])); }
      reach.set(from, seen);
      return seen;
    };
    for (const a of edges.keys()) for (const b of reachable(a)) for (const c of edges.get(b) ?? []) {
      if (c === a || c === b) continue;
      rules.push(rule(`transitive:${predicate}:${a}:${b}:${c}`,
        [{ cell: { subject: a, predicate, object: b }, atLeast: "potential" }, { cell: { subject: b, predicate, object: c }, atLeast: "potential" }],
        { cell: { subject: a, predicate, object: c }, reading: "potential" }));
    }
  }
  return rules;
}

function deonticRules(cells) {
  const rules = [];
  for (const [yes, no] of deonticOpposites) for (const at of cells) {
    if (!sidesOf(at)[0]) continue;
    const other = at.predicate === yes ? no : at.predicate === no ? yes : null;
    if (other === null) continue;
    rules.push(rule(`deontic:${at.predicate}:${at.subject}:${at.object}`,
      [{ cell: { subject: at.subject, predicate: at.predicate, object: at.object }, atLeast: "potential" }],
      { cell: { subject: at.subject, predicate: other, object: at.object }, reading: "active" }));
  }
  return rules;
}

/** Settle tellings under the learning-channel rules their own cells generate. */
function settleTellings(tellings) {
  const seed = cellSet(tellings.map((t) => cell(t.subject, t.predicate, t.object, { [t.side]: [t.observation] })));
  const rules = [...transitiveRules(seed), ...deonticRules(seed)];
  const orbit = closureOrbit(rules, seed);
  return { rules, orbit, settled: orbit[orbit.length - 1] };
}

// — reading the settled section —

const extremal = (at) => readingOfSides("extremal", ...sidesOf(at));
const tripleKey = (s, p, o) => `${s}\u0000${p}\u0000${o}`;
const dayOf = (at) => at.slice(0, 10);

/**
 * Consolidate articulations into a settled knowledge section.
 *
 * Returns the relations (every settled cell, with its reading, its told and derived evidence, the
 * sessions and dates that told it, and how many rounds it has held unchanged), the contested cells,
 * the aliases, the per-round knowledge-order distance, and the co-statement implications among the
 * most-attended relations (a Duquenne–Guigues basis over utterance × relation incidence, bounded to
 * `themeAttributes` relations since the basis is exponential in them).
 */
export function consolidate(records, { themeAttributes = 14, namings = [] } = {}) {
  const admitted = records.map(articulation).sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.observation < b.observation ? -1 : 1));
  const byObservation = new Map(admitted.map((record) => [record.observation, record]));
  const admittedNamings = namings.map(naming);
  const { canonical, aliases } = canonicalizer(admitted, admittedNamings);
  // A directive about a practice's negation is the converse directive about the practice.
  const negationOf = new Map(admittedNamings.flatMap((n) => (n.negations ?? []).map((negation) => [negation, n.token])));
  const converse = new Map(deonticOpposites.flatMap(([yes, no]) => [[yes, no], [no, yes]]));

  // Tell: one witness per utterance per side; a claim repeated inside an utterance is one telling.
  const tellings = [];
  for (const record of admitted) for (const claim of record.claims) {
    if (claim.predicate === "same-as") continue;
    const negated = converse.has(claim.predicate) && negationOf.has(claim.object);
    const subject = canonical(claim.subject), object = canonical(negated ? negationOf.get(claim.object) : claim.object);
    if (subject === object && claim.predicate !== "is-named") continue;
    tellings.push({ subject, predicate: negated ? converse.get(claim.predicate) : claim.predicate, object, side: claim.side, observation: record.observation, span: claim.span });
  }

  // Rounds: the settled section over each day's prefix of tellings. d_k between consecutive rounds is
  // the number of cells whose reading moved; a cell's confidence is how many rounds it has held since.
  const days = [...new Set(admitted.map((record) => dayOf(record.at)))];
  const rounds = [];
  const movedAt = new Map();
  const previous = new Map();
  let settlement;
  for (const day of days) {
    settlement = settleTellings(tellings.filter((t) => dayOf(byObservation.get(t.observation).at) <= day));
    let moved = 0, entered = 0;
    for (const at of settlement.settled) {
      const key = tripleKey(at.subject, at.predicate, at.object), reading = extremal(at), before = previous.get(key);
      if (before === undefined) { entered += 1; movedAt.set(key, day); } else if (before !== reading) { moved += 1; movedAt.set(key, day); }
      previous.set(key, reading);
    }
    rounds.push(Object.freeze({ round: day, cells: settlement.settled.length, entered, moved }));
  }
  const { rules, orbit, settled } = settlement ?? settleTellings([]);

  const spansOf = new Map();
  for (const t of tellings) {
    const key = tripleKey(t.subject, t.predicate, t.object);
    const list = spansOf.get(key) ?? [];
    if (list.length < 3 && !list.some((s) => s.span === t.span)) list.push({ side: t.side, span: t.span, observation: t.observation });
    spansOf.set(key, list);
  }

  const relations = settled.map((at) => {
    const key = tripleKey(at.subject, at.predicate, at.object);
    const observed = (side) => at[side].filter((w) => typeof w === "string" && byObservation.has(w));
    const derived = at.for.filter((w) => typeof w !== "string").length + at.against.filter((w) => typeof w !== "string").length;
    const told = [...observed("for").map((w) => ["for", byObservation.get(w)]), ...observed("against").map((w) => ["against", byObservation.get(w)])]
      .sort(([, a], [, b]) => (a.at < b.at ? -1 : 1));
    const sessions = new Set(told.map(([, r]) => r.session));
    const sessionsFor = new Set(told.filter(([side]) => side === "for").map(([, r]) => r.session));
    const sessionsAgainst = new Set(told.filter(([side]) => side === "against").map(([, r]) => r.session));
    const settledOn = movedAt.get(key);
    return Object.freeze({
      subject: at.subject,
      predicate: at.predicate,
      object: at.object,
      reading: extremal(at),
      for: observed("for").length,
      against: observed("against").length,
      derived,
      sessions: sessions.size,
      restated: Math.max(0, sessionsFor.size - 1) + Math.max(0, sessionsAgainst.size - 1),
      first: told[0]?.[1].at ?? null,
      last: told[told.length - 1]?.[1].at ?? null,
      latest: told[told.length - 1]?.[0] ?? null,
      settledOn: settledOn ?? null,
      heldRounds: settledOn === undefined ? 0 : days.length - 1 - days.indexOf(settledOn),
      spans: Object.freeze((spansOf.get(key) ?? []).map(Object.freeze)),
    });
  }).sort((a, b) => (b.sessions - a.sessions) || (b.for + b.against - a.for - a.against) || (a.subject < b.subject ? -1 : a.subject > b.subject ? 1 : 0));

  // Co-statement: which told relations travel together across utterances.
  const attended = relations.filter((r) => r.derived === 0 && r.reading !== "contested" && r.sessions >= 2).slice(0, themeAttributes);
  const attributeOf = new Map(attended.map((r) => [tripleKey(r.subject, r.predicate, r.object), `${r.subject} ${r.reading === "denied" ? "not " : ""}${r.predicate} ${r.object}`]));
  const incidence = [];
  for (const t of tellings) {
    const name = attributeOf.get(tripleKey(t.subject, t.predicate, t.object));
    if (name !== undefined) incidence.push([t.observation, name]);
  }
  const context = makeContext([...new Set(incidence.map(([g]) => g))], [...attributeOf.values()], incidence);
  const themes = lawfulBasis(context)
    .filter((imp) => imp.from.size > 0)
    .map((imp) => Object.freeze({ when: Object.freeze([...imp.from].sort()), also: Object.freeze([...imp.to].sort()), support: extent(context, new Set([...imp.from, ...imp.to])).size }))
    .filter((theme) => theme.support >= 2)
    .sort((a, b) => b.support - a.support);

  const witness = Object.freeze({
    articulations: semanticId(admitted.map((record) => record.observation)),
    rules: rules.length,
    stages: orbit.length,
    settled: semanticId(settled.map(address).sort()),
  });
  const count = (reading) => relations.filter((r) => r.reading === reading).length;
  return Object.freeze({
    kind: "knowing.consolidation",
    utterances: admitted.length,
    articulated: admitted.filter((record) => record.claims.length > 0).length,
    sessions: new Set(admitted.map((record) => record.session)).size,
    from: admitted[0]?.at ?? null,
    until: admitted[admitted.length - 1]?.at ?? null,
    held: count("held"),
    denied: count("denied"),
    contested: count("contested"),
    relations: Object.freeze(relations),
    aliases,
    rounds: Object.freeze(rounds),
    themes: Object.freeze(themes),
    witness,
  });
}
