/**
 * enterprise/orders — the 单 of a micro-enterprise read as records: the parties it reaches, what
 * each contact told about a party's interest, the stages an order moves through and the reasons it
 * can end at each, the funnel, and the order in which parties are called. One implementation for
 * every business that sells through people (Rendanheyi glossary: ren-dan-he-yi, ling-juli); each
 * business supplies its own stages and outcome vocabulary and keeps its domain facts.
 * @packageDocumentation
 */
import { readingAs } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { cell, knowledgeReading } from "@red-cup-engineering/signcell/cell";

/**
 * Contact outcomes and the side of a party's interest each tells: `for` (the party wants to go on),
 * `against` (the party declined or asked not to be contacted), or nothing. A business uses the
 * subset that fits its calls (`contactOutcomes`).
 */
export const CONTACT_SIDES = Object.freeze({
  "no answer": null,
  voicemail: null,
  "wrong number": null,
  "not owner": null,
  "not the right contact": null,
  "not the right office": null,
  "letter sent": null,
  callback: "for",
  interested: "for",
  "offer call set": "for",
  "engagement sent": "for",
  "discovery call set": "for",
  "not interested": "against",
  remove: "against",
});

/** The named outcomes with their sides, refusing a name the house vocabulary does not have. */
export function contactOutcomes(names) {
  const unknown = names.filter((name) => !(name in CONTACT_SIDES));
  if (unknown.length > 0) throw new TypeError(`unknown contact outcomes: ${unknown.join(", ")}`);
  return Object.freeze(Object.fromEntries(names.map((name) => [name, CONTACT_SIDES[name]])));
}

/** The side a contact tells, under an outcome vocabulary. */
export const contactSide = (contact, outcomes = CONTACT_SIDES) => outcomes[contact.outcome] ?? null;

/**
 * A party's interest as a SignCell cell: (party, relation, enterprise), each contact that told
 * something a witness on its side.
 */
export function interestCell(party, contacts, { relation = "deals-with", enterprise = "561-group", outcomes = CONTACT_SIDES } = {}) {
  const witness = (contact) => ({ contact: contact.recordedAt, outcome: contact.outcome, ...(contact.by ? { by: contact.by } : {}) });
  return cell(party, relation, enterprise, {
    for: contacts.filter((contact) => contactSide(contact, outcomes) === "for").map(witness),
    against: contacts.filter((contact) => contactSide(contact, outcomes) === "against").map(witness),
  });
}

/** The interest cell's reading in the extremal family: unknown, held, denied or contested. */
export const interestReading = (contacts, options = {}) => readingAs("extremal", knowledgeReading(interestCell(options.party ?? "party", contacts, options)));

/** The latest record by `recordedAt`, or undefined. */
export const latest = (records) => [...records].sort((a, b) => String(a.recordedAt).localeCompare(String(b.recordedAt))).at(-1);

/** Records folded oldest first, later fields over earlier: the current state of a thing recorded in steps. */
export const folded = (records) => Object.assign({}, ...[...records].sort((a, b) => String(a.recordedAt).localeCompare(String(b.recordedAt))));

/** Group records by one field. */
export function groupBy(records, key) {
  const groups = new Map();
  for (const record of records) {
    const list = groups.get(record[key]) ?? [];
    list.push(record);
    groups.set(record[key], list);
  }
  return groups;
}

/**
 * A stage procedure: each stage's meaning, the office that moves an order out of it, what moves it
 * on, and the reasons an order can die there. `dead` ends an order at any stage and names one of
 * its stage's reasons, so every loss is counted where it happened.
 */
export function procedure(stages) {
  const seen = new Set();
  for (const entry of stages) {
    if (typeof entry.stage !== "string" || entry.stage === "dead" || seen.has(entry.stage)) throw new TypeError(`a procedure's stages are distinct names other than "dead": ${entry.stage}`);
    seen.add(entry.stage);
  }
  const frozen = stages.map((entry) => Object.freeze({ ...entry, deadReasons: Object.freeze([...(entry.deadReasons ?? [])]) }));
  return Object.freeze({
    stages: Object.freeze(frozen),
    names: Object.freeze([...frozen.map((entry) => entry.stage), "dead"]),
    deadReasons: Object.freeze([...new Set(frozen.flatMap((entry) => entry.deadReasons))]),
  });
}

/**
 * Each order's current state: its records merged oldest first, its latest stage, its fee (the
 * price it was sold on less the price it was bought on, or its recorded fee), and its history.
 * @param {object[]} records stage records, each naming its order under `key`
 */
export function currentOrders(records, { key = "order" } = {}) {
  return [...groupBy(records, key).values()].map((history) => {
    const sorted = [...history].sort((a, b) => String(a.recordedAt).localeCompare(String(b.recordedAt)));
    const merged = Object.assign({}, ...sorted);
    const fee = Number.isFinite(merged.fee) ? merged.fee
      : Number.isFinite(merged.assignmentPrice) && Number.isFinite(merged.price) ? merged.assignmentPrice - merged.price : null;
    return Object.freeze({ ...merged, stage: sorted.at(-1).stage, fee, history: Object.freeze(sorted) });
  });
}

/**
 * The funnel under a procedure: how many orders ever reached each stage, the share of the stage
 * before that went on to it, and dead orders counted by the stage they died at and their reason.
 */
export function funnel(histories, { stages }) {
  const order = stages.map((entry) => entry.stage);
  const reached = Object.fromEntries(order.map((stage) => [stage, 0]));
  const lost = {};
  for (const history of histories) {
    const sorted = [...history].sort((a, b) => String(a.recordedAt).localeCompare(String(b.recordedAt)));
    const furthest = Math.max(-1, ...sorted.filter((record) => record.stage !== "dead").map((record) => order.indexOf(record.stage)));
    for (let index = 0; index <= furthest; index += 1) reached[order[index]] += 1;
    const dead = sorted.find((record) => record.stage === "dead");
    if (dead) {
      const key = `${order[Math.max(furthest, 0)]}: ${dead.deadReason ?? "unstated"}`;
      lost[key] = (lost[key] ?? 0) + 1;
    }
  }
  return Object.freeze({
    stages: order.map((stage, index) => ({ stage, reached: reached[stage], rate: index === 0 || reached[order[index - 1]] === 0 ? null : Number((reached[stage] / reached[order[index - 1]]).toFixed(3)) })),
    lost,
  });
}

/**
 * Contact activity: dials, letters, conversations and interested parties in total, by day and by
 * the account that logged them.
 */
export function contactActivity(contacts, { outcomes = CONTACT_SIDES, reachedOutcomes = ["callback", "interested", "offer call set", "engagement sent", "discovery call set", "not interested", "remove", "not owner"] } = {}) {
  const reached = new Set(reachedOutcomes);
  const tally = (list) => ({
    dials: list.filter((c) => c.outcome !== "letter sent").length,
    letters: list.filter((c) => c.outcome === "letter sent").length,
    conversations: list.filter((c) => reached.has(c.outcome)).length,
    interested: list.filter((c) => contactSide(c, outcomes) === "for").length,
  });
  const days = groupBy(contacts.map((c) => ({ ...c, day: String(c.recordedAt).slice(0, 10) })), "day");
  const callers = groupBy(contacts.map((c) => ({ ...c, by: c.by ?? "unnamed" })), "by");
  return Object.freeze({
    total: tally(contacts),
    byDay: [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, list]) => ({ day, ...tally(list) })),
    byCaller: [...callers].map(([caller, list]) => ({ caller, ...tally(list) })),
  });
}

/**
 * The call queue: callbacks now due first, then parties not reached within `quietDays` (matched
 * ones before unmatched when `matched` says which are), one row per party with all its keys.
 * Parties that declined or gave mixed answers, and orders past `openStages`, are left out.
 * @param {object[]} rows the business's rows, each with `key`, `party`, `score`, `stage`
 * @param {Map<string, object[]>} contactsByKey contacts grouped by row key
 */
export function callQueue(rows, contactsByKey, { now = Date.now(), quietDays = 14, by, limit = 40, openStages = ["lead", "contacted", "interested"], matched = () => true, includeUnmatched = false, outcomes = CONTACT_SIDES } = {}) {
  const open = new Set(openStages);
  const due = [];
  const fresh = [];
  for (const row of rows) {
    if (!open.has(row.stage)) continue;
    const contacts = contactsByKey.get(row.key) ?? [];
    const interest = interestReading(contacts, { outcomes });
    if (interest === "denied" || interest === "contested") continue;
    const last = latest(contacts);
    if (last?.callbackAt && Date.parse(last.callbackAt) <= now && (!by || !last.by || last.by === by)) {
      due.push({ ...row, interest, reason: `callback due ${last.callbackAt}`, lastOutcome: last.outcome, lastNotes: last.notes ?? "" });
    } else if ((matched(row) || includeUnmatched) && interest !== "held" && (!last || now - Date.parse(last.recordedAt) > quietDays * 86_400_000)) {
      fresh.push({ ...row, interest, reason: last ? `last reached ${String(last.recordedAt).slice(0, 10)}` : "not yet reached", lastOutcome: last?.outcome ?? "", lastNotes: last?.notes ?? "" });
    }
  }
  fresh.sort((a, b) => Number(matched(b)) - Number(matched(a)) || (b.score ?? 0) - (a.score ?? 0));
  const byParty = new Map();
  for (const row of [...due, ...fresh]) {
    const entry = byParty.get(row.party) ?? { ...row, keys: [] };
    entry.keys.push(row.key);
    byParty.set(row.party, entry);
  }
  return Object.freeze({
    due: due.length,
    fresh: fresh.length,
    queue: [...byParty.values()].slice(0, limit).map(({ keys, ...row }) => ({ ...row, otherKeys: keys.filter((k) => k !== row.key) })),
  });
}
