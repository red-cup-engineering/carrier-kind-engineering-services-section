/**
 * enterprise/signals — work opened rather than allocated (Rendanheyi glossary: qiangdan, xiaowei,
 * sanquan, duidu). Demand not addressed to one micro-enterprise is posted as a signal; any
 * micro-enterprise whose own taking policy admits it takes it into its own root; the poster's assay
 * accepts one result. Nobody assigns a signal.
 *
 * The board holds only monotone facts — signals, takes, results, acceptances, withdrawals — so
 * taking needs no coordination and several micro-enterprises may take one signal. A signal's
 * standing is a reading of those facts at a time. An offer may grow with a signal's age on the
 * poster's own schedule: a stigmergic bounty in place of a dispatcher.
 * @packageDocumentation
 */
import { semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";

export const SIGNAL_CATEGORIES = Object.freeze(["signal", "take", "result", "acceptance", "withdrawal"]);
export const SIGNAL_STANDINGS = Object.freeze(["open", "taken", "resulted", "accepted", "withdrawn"]);

const DAY_MS = 86_400_000;
const named = (value, what) => {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${what} is a non-empty string`);
  return value;
};
const instant = (value, what) => {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new TypeError(`${what} is an ISO time`);
  return value;
};

function offerOf(offer) {
  if (offer === undefined) return undefined;
  const amount = Number(offer.amount ?? 0);
  const perDay = Number(offer.perDay ?? 0);
  const ceiling = offer.ceiling === undefined ? undefined : Number(offer.ceiling);
  if (![amount, perDay].every(Number.isFinite) || amount < 0 || perDay < 0) throw new TypeError("a signal's offer is a non-negative amount and daily growth");
  if (ceiling !== undefined && (!Number.isFinite(ceiling) || ceiling < amount)) throw new TypeError("a signal's offer ceiling is at least its amount");
  return Object.freeze({ amount, perDay, ...(ceiling === undefined ? {} : { ceiling }), currency: named(offer.currency ?? "USD", "an offer's currency") });
}

/**
 * A signal: who posts it, the structured work intent a taker admits into its own root, what is
 * offered, whose assay accepts a result (the poster unless named), and optionally the one
 * micro-enterprise it is addressed to. Its id is its content without the posting time, so posting
 * the same demand twice is one signal.
 */
export function signalOf(input) {
  const intent = input?.intent;
  if (intent === null || typeof intent !== "object" || typeof intent.id !== "string" || !Array.isArray(intent.items) || intent.items.length === 0) {
    throw new TypeError("a signal carries a structured work intent");
  }
  const content = {
    poster: named(input.poster, "a signal's poster"),
    intent,
    assayer: named(input.assayer ?? input.poster, "a signal's assayer"),
    ...(input.to === undefined ? {} : { to: named(input.to, "a signal's addressee") }),
    ...(input.tags === undefined ? {} : { tags: [...new Set(input.tags.map((tag) => named(tag, "a signal tag").toLowerCase()))].sort() }),
    ...(input.offer === undefined ? {} : { offer: offerOf(input.offer) }),
  };
  return Object.freeze({ id: input.id ?? semanticId(content), ...content, postedAt: instant(input.postedAt, "a signal's posting time") });
}

/** A micro-enterprise's take: it has admitted the signal's work into its own root. */
export function takeOf(input) {
  return Object.freeze({
    signal: named(input.signal, "a take's signal"),
    enterprise: named(input.enterprise, "a take's enterprise"),
    subject: named(input.subject, "a take's work subject"),
    at: instant(input.at, "a take's time"),
  });
}

/** A taker's offered result, with the evidence its assayer reads. */
export function resultOf(input) {
  return Object.freeze({
    signal: named(input.signal, "a result's signal"),
    enterprise: named(input.enterprise, "a result's enterprise"),
    evidence: Object.freeze([...(input.evidence ?? [])].map((item) => named(item, "result evidence"))),
    at: instant(input.at, "a result's time"),
  });
}

/** The assayer's acceptance of one taker's result. */
export function acceptanceOf(input) {
  return Object.freeze({
    signal: named(input.signal, "an acceptance's signal"),
    enterprise: named(input.enterprise, "the accepted enterprise"),
    by: named(input.by, "an acceptance's assayer"),
    at: instant(input.at, "an acceptance's time"),
  });
}

/** The poster's withdrawal of a signal nobody should take any longer. */
export function withdrawalOf(input) {
  return Object.freeze({
    signal: named(input.signal, "a withdrawal's signal"),
    by: named(input.by, "a withdrawal's poster"),
    at: instant(input.at, "a withdrawal's time"),
    ...(input.reason === undefined ? {} : { reason: String(input.reason) }),
  });
}

/** What a signal offers at a time: its amount grown by its daily rate, up to its ceiling. */
export function offerAt(signal, at) {
  if (signal.offer === undefined) return undefined;
  const days = Math.max(0, (Date.parse(at) - Date.parse(signal.postedAt)) / DAY_MS);
  const grown = signal.offer.amount + signal.offer.perDay * days;
  const amount = Math.round(Math.min(grown, signal.offer.ceiling ?? Infinity) * 100) / 100;
  return Object.freeze({ amount, currency: signal.offer.currency });
}

/** The words a signal's work is about, its items' text and evidence, for a taking policy to read. */
export function signalText(signal) {
  return [...(signal.tags ?? []), ...signal.intent.items.flatMap((item) => [item.text, ...(item.evidence ?? [])])].join("\n").toLowerCase();
}

/**
 * The board read at a time: every signal with its standing, takers (and the work subject each
 * holds it under), results, accepted taker and current offer. Facts about unknown signals, acceptances by anyone but the assayer and
 * withdrawals by anyone but the poster do not count.
 * @param {{signal?: object[], take?: object[], result?: object[], acceptance?: object[], withdrawal?: object[]}} facts
 * @param {string} at
 */
export function signalBoard(facts, at) {
  const signals = new Map();
  for (const record of facts.signal ?? []) {
    const signal = signalOf(record);
    const known = signals.get(signal.id);
    if (known === undefined || signal.postedAt < known.postedAt) signals.set(signal.id, signal);
  }
  const by = (category) => {
    const grouped = new Map();
    for (const record of facts[category] ?? []) {
      if (!signals.has(record.signal)) continue;
      grouped.set(record.signal, [...(grouped.get(record.signal) ?? []), record]);
    }
    return grouped;
  };
  const takes = by("take");
  const results = by("result");
  const acceptances = by("acceptance");
  const withdrawals = by("withdrawal");
  return Object.freeze([...signals.values()].sort((a, b) => a.postedAt.localeCompare(b.postedAt) || a.id.localeCompare(b.id)).map((signal) => {
    const takers = [...new Set((takes.get(signal.id) ?? []).map((take) => take.enterprise))].sort();
    const held = takers.map((enterprise) => Object.freeze({ enterprise, subject: (takes.get(signal.id) ?? []).find((take) => take.enterprise === enterprise).subject }));
    const resulted = [...new Set((results.get(signal.id) ?? []).map((result) => result.enterprise))].sort();
    const accepted = (acceptances.get(signal.id) ?? []).filter((a) => a.by === signal.assayer && resulted.includes(a.enterprise))
      .sort((a, b) => a.at.localeCompare(b.at))[0];
    const withdrawn = (withdrawals.get(signal.id) ?? []).some((w) => w.by === signal.poster);
    const standing = accepted ? "accepted" : withdrawn ? "withdrawn" : resulted.length > 0 ? "resulted" : takers.length > 0 ? "taken" : "open";
    return Object.freeze({
      signal,
      standing,
      takers: Object.freeze(takers),
      held: Object.freeze(held),
      resulted: Object.freeze(resulted),
      ...(accepted ? { accepted: accepted.enterprise } : {}),
      ageDays: Math.max(0, (Date.parse(at) - Date.parse(signal.postedAt)) / DAY_MS),
      ...(signal.offer === undefined ? {} : { offer: offerAt(signal, at) }),
    });
  }));
}

/**
 * A micro-enterprise's taking policy, held in its own record (its decision right): the words a
 * signal must mention (any of), the tags it must carry (any of), how old an untaken signal must be
 * before this enterprise takes it (a residual taker sets this), whether it takes signals others
 * have already taken, and how many it takes in one turn of its loop.
 */
export function takingPolicyOf(takes) {
  if (takes === undefined || takes === null) return undefined;
  const words = (list, what) => Object.freeze([...(list ?? [])].map((word) => named(word, what).toLowerCase()));
  const afterHours = Number(takes.afterHours ?? 0);
  const limit = Number(takes.limit ?? 4);
  if (!Number.isFinite(afterHours) || afterHours < 0) throw new TypeError("a taking policy's afterHours is a non-negative number");
  if (!Number.isInteger(limit) || limit < 1) throw new TypeError("a taking policy's limit is a positive integer");
  return Object.freeze({
    words: words(takes.words, "a taking word"),
    tags: words(takes.tags, "a taking tag"),
    any: takes.any === true,
    afterHours,
    alongside: takes.alongside === true,
    limit,
  });
}

/**
 * The signals a micro-enterprise takes this turn, by its own policy: addressed to it, or open to
 * all and matching its words or tags (or any, for a residual taker), old enough, not withdrawn or
 * accepted, not already taken by it, and — unless it takes alongside others — not yet taken. Demand
 * not yet naming its work is taken only by an enterprise that assesses demand.
 * @param {{id: string, takes?: object}} enterprise
 * @param {ReturnType<typeof signalBoard>} board
 */
export function signalsToTake(enterprise, board) {
  const policy = takingPolicyOf(enterprise.takes);
  const chosen = [];
  for (const entry of board) {
    const { signal } = entry;
    if (entry.standing === "accepted" || entry.standing === "withdrawn" || entry.takers.includes(enterprise.id)) continue;
    // Unassessed demand is taken only by an enterprise with its own office to assess it.
    if (!enterprise.assesses && signal.intent.items.some((item) => item.work === undefined)) continue;
    const addressed = signal.to === enterprise.id;
    if (!addressed) {
      if (policy === undefined || signal.to !== undefined) continue;
      if (entry.takers.length > 0 && !policy.alongside) continue;
      if (entry.ageDays * 24 < policy.afterHours) continue;
      const text = signalText(signal);
      const matches = policy.any
        || policy.words.some((word) => text.includes(word))
        || policy.tags.some((tag) => (signal.tags ?? []).includes(tag));
      if (!matches) continue;
    }
    chosen.push(entry);
    if (chosen.length >= (policy?.limit ?? 4)) break;
  }
  return Object.freeze(chosen);
}
