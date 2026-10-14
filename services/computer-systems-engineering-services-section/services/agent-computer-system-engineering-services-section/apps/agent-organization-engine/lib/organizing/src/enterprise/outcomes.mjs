/**
 * enterprise/outcomes — every judgment of delivered work as one record, and what learns from it
 * (561 Group note of 2026-10-03, "One outcome path"; the economy of the work arena, 2026-10-01;
 * the work arena's seventh edition: a judgement is told evidence, read in FOUR).
 *
 * Work is judged in many registers: an assayer accepts or rejects a delivered request on the work
 * arena, a receiver accepts or refuses an inference delivery, an editor accepts or returns an
 * edition, a customer judges a delivery, a retailer reports a royalty. Each is the same act — the
 * receiver's decision on a delivery (fabrication science, "acceptance"; a fabricator's passing
 * assay is evidence toward it, never a substitute) — and each is told here as one **outcome**: who
 * delivered what lot, which carrier did the work, who judged it, the verdict, the evidence it
 * rests on, and the money it carried when it carried any. One function, `outcomeOf`, makes the
 * record; every producer calls it; every consumer folds the same records:
 *
 * - staffing's posterior (`standingOf` → work/staffing `staffingFor`, the Beta(1,1) estimator);
 * - the inference market's expected-resolution pricing (the `market` coordinate an outcome carries);
 * - the books (`outcomeBookOf`): an accepted outcome with value books where a counterparty outside
 *   the entity judged it; inside the entity a judgment moves no money, and a member's work for
 *   another member is the crossings' credit line (enterprise/crossings), never booked twice;
 * - the acceptance readout (`acceptanceReadoutOf`): accepted units, resources and cost per accepted
 *   unit, per carrier and per enterprise, and what strangers paid.
 *
 * The seam of a judgment is read, never typed: `partyOf` resolves the judge and the provider to
 * their enterprise and entity (territories, the wallet registry), and a payer who resolves to the
 * Group's own wallet is the Group paying itself, which no book records as a sale. A value nobody
 * witnessed is unknown, never zero; a resource consumed but never priced leaves the cost unknown.
 *
 * Outcomes are `work-outcome` records of the store (`outcomeJournal`), content-addressed, so telling
 * one twice records it once, each with a `work-outcome` log line at the instant it was judged for the
 * reads that want a period. The judgment's FOUR charge is read from its verdict: accepted is for,
 * rejected against. A judge withdraws a judgment by voiding it, which keeps the record and removes it
 * from every fold.
 * @packageDocumentation
 */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { append, each, get, has, logDates, put, readLog } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { readingFamilies, readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { formatGraded, gradedAdd, gradedFromParts, gradedIsZero, gradedNegate, gradedOfDecimal, gradedQuotient, gradedTimes, gradedToDecimalString } from "@red-cup-engineering/exact-number-data-service/graded";
import { canonicalJson, canonicalizeJson, JSON_RESOURCE_ENVELOPE } from "@red-cup-engineering/json-services-section/canonical-json";
import { isNiUri, makeNiUri, verifyNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { immutableContentKey } from "@red-cup-engineering/immutable-content-custody-service";
import { createFileStoreSync } from "@red-cup-engineering/immutable-content-custody-service/file-store";
import { join } from "node:path";
import { open, posting, transaction } from "../accounting/ledger.mjs";
import { printEntries } from "../accounting/report.mjs";
import { resourcesOf, sumResources } from "./resources.mjs";
import { assayerOf, createWorkArenaReader, houseSectionOf, offerAt } from "./work-arena.mjs";
import { recordedPlayerOf } from "../agency/kinds.mjs";
import { admitAgencyWorkResult } from "../work/schema.mjs";

/** Judgment registers; x402-settlement is retained solely to read historical payment claims. */
export const OUTCOME_SOURCES = Object.freeze(["work-arena", "work-discharge", "inference-market", "editor", "customer", "x402-settlement", "royalty"]);

/** A judgment's verdict: the delivery accepted, rejected (returned, refused), or an earlier judgment withdrawn. */
export const OUTCOME_VERDICTS = Object.freeze(["accepted", "rejected", "voided"]);

/** How a value was read: the price a buyer paid, the requester's offer, the provider's witnessed cost, a royalty reported. */
export const VALUE_BASES = Object.freeze(["price", "offer", "cost", "royalty"]);

export const OUTCOME_KIND = "organizing.enterprise.outcome";
/** The store type of a judgment: a record, and a log line at the instant it was judged. */
export const OUTCOME_TYPE = "work-outcome";

const text = (value) => typeof value === "string" && value.trim() !== "";
const DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u;
const INSTANT = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/u;

function required(input, field) {
  if (!text(input[field])) throw new TypeError(`an outcome names its ${field}`);
  return input[field];
}

function valueOf(value) {
  if (value === undefined || value === null) return undefined;
  if (!DECIMAL.test(String(value.amount ?? "")) || !text(value.currency) || !VALUE_BASES.includes(value.basis)) {
    throw new TypeError(`an outcome's value is {amount: decimal text, currency, basis: ${VALUE_BASES.join("|")}, account?, settledTo?}`);
  }
  return Object.freeze({
    amount: String(value.amount), currency: value.currency, basis: value.basis,
    ...(text(value.account) ? { account: value.account } : {}),
    ...(text(value.settledTo) ? { settledTo: value.settledTo } : {}),
  });
}

function marketOf(market) {
  if (market === undefined || market === null) return undefined;
  for (const field of ["provider", "offer", "taskClass", "receipt"]) {
    if (!text(market[field])) throw new TypeError(`an outcome's market coordinate names its ${field}`);
  }
  return Object.freeze({
    provider: market.provider, offer: market.offer, taskClass: market.taskClass, receipt: market.receipt,
    ...(text(market.configuration) ? { configuration: market.configuration } : {}),
  });
}

/**
 * The one outcome record of a judgment. Required: `source` (one of `OUTCOME_SOURCES`), `lot` (the
 * work lot judged), `delivery` (the exact delivery: a thread's delivery ordinal, an inference
 * receipt, a transaction), `provider` (who answers for the delivery), `judge` (who judged it),
 * `verdict` (one of `OUTCOME_VERDICTS`; a void names the outcome it `voids`), `at` (when it was
 * judged) and `evidence` (what it rests on, at least one). Optional: `carrier` (the doer staffing
 * learns on: a model, a harness carrier, an offer configuration), `taskClass`, `skill` (the skill
 * the judged work exercised), `player` (`{by, bearer?, hand?}`: the mask the work was played under,
 * the character wearing it, the session that carried it), `market` (the inference market's coordinate `{provider, offer, taskClass, receipt, configuration?}`), `value`
 * (`{amount, currency, basis, account?, settledTo?}`), `unmet` and `reason` (a rejection's), and
 * `resources` (what the work witnessed consuming), and `reportedResult` (the admitted native or
 * legacy work report, only for work-discharge). The verdict of an error report does not accept
 * or reject fulfillment of the requested work. Every report still carries its attempt and cost.
 * The id is the content address of the rest; records without reportedResult retain their ids.
 * @param {object} input
 */
export function outcomeOf(input) {
  if (input === null || typeof input !== "object") throw new TypeError("an outcome is an object");
  const source = required(input, "source");
  if (!OUTCOME_SOURCES.includes(source)) throw new TypeError(`an outcome's source is one of ${OUTCOME_SOURCES.join(", ")}`);
  if (source === "x402-settlement") throw new TypeError("an x402 payment is not a judgment of delivered work; retain it as cash evidence");
  const verdict = required(input, "verdict");
  if (!OUTCOME_VERDICTS.includes(verdict)) throw new TypeError(`an outcome's verdict is one of ${OUTCOME_VERDICTS.join(", ")}`);
  if (verdict === "voided" && !text(input.voids)) throw new TypeError("a voiding outcome names the outcome it voids");
  if (!INSTANT.test(input.at ?? "")) throw new TypeError("an outcome's at is an ISO instant in UTC");
  const evidence = [...new Set(input.evidence ?? [])].filter(text).map(String).sort();
  if (evidence.length === 0) throw new TypeError("an outcome rests on evidence");
  const value = valueOf(input.value);
  const market = marketOf(input.market);
  const player = recordedPlayerOf(input.player);
  const resources = input.resources === undefined ? undefined : resourcesOf(input.resources, "outcome resources");
  if (input.reportedResult !== undefined && source !== "work-discharge") throw new TypeError("a reported work result belongs to a work-discharge outcome");
  // The legacy result validator preserves its caller value. The outcome, however, is an
  // immutable content-addressed record: take the actual JSON codec's detached deep-frozen
  // snapshot, without SCA/NFC normalization of literal legacy keys or values.
  const reportedResult = input.reportedResult === undefined ? undefined
    : canonicalizeJson(admitAgencyWorkResult(input.reportedResult), JSON_RESOURCE_ENVELOPE).value;
  if (input.receivingReceipt !== undefined && (source !== "work-discharge" || !text(input.receivingReceipt))) throw new TypeError("a receiving receipt belongs to a work-discharge outcome");
  if (input.receivingAuthorizationReceipt !== undefined && (source !== "work-discharge" || !text(input.receivingReceipt) || !text(input.receivingAuthorizationReceipt))) throw new TypeError("receiving authorization provenance requires an admitted work-discharge receiving receipt");
  if (input.atPrecision !== undefined && (source !== "work-discharge" || input.atPrecision !== "day" || !/^\d{4}-\d\d-\d\dT00:00:00(?:\.0+)?Z$/u.test(input.at))) throw new TypeError("outcome time precision is day when no original clock time was witnessed");
  const body = {
    kind: OUTCOME_KIND, version: 1, source,
    lot: required(input, "lot"), delivery: required(input, "delivery"),
    provider: required(input, "provider"), judge: required(input, "judge"),
    verdict, at: input.at, evidence,
    ...(input.receivingReceipt === undefined ? {} : { receivingReceipt: input.receivingReceipt }),
    ...(input.atPrecision === undefined ? {} : { atPrecision: input.atPrecision }),
    ...(input.receivingAuthorizationReceipt === undefined ? {} : { receivingAuthorizationReceipt: input.receivingAuthorizationReceipt }),
    ...(reportedResult === undefined ? {} : { reportedResult }),
    ...(verdict === "voided" ? { voids: input.voids } : {}),
    ...(text(input.carrier) ? { carrier: input.carrier } : {}),
    ...(text(input.taskClass) ? { taskClass: input.taskClass } : {}),
    ...(text(input.skill) ? { skill: input.skill } : {}),
    ...(player === undefined ? {} : { player }),
    ...(market === undefined ? {} : { market }),
    ...(value === undefined ? {} : { value }),
    ...(verdict === "rejected" && Array.isArray(input.unmet) && input.unmet.length > 0 ? { unmet: [...new Set(input.unmet.filter(text))].sort() } : {}),
    ...(text(input.reason) ? { reason: input.reason } : {}),
    ...(resources === undefined || resources.length === 0 ? {} : { resources }),
  };
  return Object.freeze({ id: makeNiUri(Buffer.from(canonicalJson(body), "utf8")), ...body });
}

/** The receiver's verdict remains the judgment of the report it inspected. A
 * reported error cannot establish completed work, even when that report was
 * accepted. Legacy outcomes carry their original delivered-work meaning. */
export const isFailedWorkReport = outcome => outcome.reportedResult?.kind === "skill-error";
export const isAcceptedWorkOutcome = outcome => outcome.verdict === "accepted" && !isFailedWorkReport(outcome);
export const isRejectedWorkOutcome = outcome => outcome.verdict === "rejected" && !isFailedWorkReport(outcome);
const reportJudgmentsOf = outcomes => Object.freeze({
  accepted: outcomes.filter(outcome => isFailedWorkReport(outcome) && outcome.verdict === "accepted").length,
  rejected: outcomes.filter(outcome => isFailedWorkReport(outcome) && outcome.verdict === "rejected").length,
});

/** The store type the work arena's moves are recorded under (FeltOS's work board). */
export const WORK_ARENA_MOVE_TYPE = "work-arena-move";

/** Evidence prose is content, rather than an oversized record coordinate. */
function mapWorkArenaEvidence(move, visit) {
  const project = value => {
    if (Array.isArray(value)) return value.map(project);
    if (value === null || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
      key === "evidence" && Array.isArray(item) ? item.map(visit) : project(item)]));
  };
  return project(move);
}

export function addressedWorkArenaEvidence(move, keepText) {
  return mapWorkArenaEvidence(move, text => {
    if (typeof text !== "string" || Buffer.byteLength(text, "utf8") <= 4096) return text;
    const body = Buffer.from(text, "utf8"), ni = makeNiUri(body);
    keepText?.(ni, body);
    return ni;
  });
}

/** Retrieve only evidence referenced by this reading, never expose the whole store. */
export function readWorkArenaEvidence(root, move) {
  const custody = createFileStoreSync(join(root, "data", "custody"));
  return mapWorkArenaEvidence(move, reference => {
    if (typeof reference !== "string" || !isNiUri(reference)) return reference;
    const held = custody.get(immutableContentKey(reference));
    // A referenced external artifact remains its reference; only locally retained
    // evidence prose has this media type and is expanded by this owner.
    if (held === null || held.mediaType !== "text/plain") return reference;
    const bytes = Buffer.from(held.body);
    if (!verifyNiUri(bytes, reference)) throw new TypeError("work evidence differs from its content address");
    return bytes.toString("utf8");
  });
}

/** Persist only the evidence of a move already admitted by its arena. */
export function keepWorkArenaEvidence(root, move) {
  const custody = createFileStoreSync(join(root, "data", "custody"));
  return addressedWorkArenaEvidence(move, (ni, body) => {
    const key = immutableContentKey(ni);
    custody.putIfAbsent(key, { body, mediaType: "text/plain" });
    const held = custody.get(key);
    if (held === null || !Buffer.from(held.body).equals(body)) throw new TypeError("work evidence differs from immutable custody");
  });
}

/**
 * The outcomes the work arena's assayers judged: one for each delivery of a request whose verdict
 * the board derives (accepted when its witnesses hold it and its assayer validated the need,
 * rejected when it reads denied or contested), judged by the request's assayer when its last
 * witness told, resting on the witnesses' evidence. The provider is the delivering player; the
 * board never names a carrier, so none is told here. A request's offer, when its provider promised
 * at one, is the outcome's value.
 * @param {{threads: ReadonlyArray<object>}} board a work board (work-arena `workBoard`)
 */
export function arenaOutcomesOf(board) {
  const outcomes = [];
  for (const thread of board.threads) {
    if (thread.opening.move !== "request") continue;
    thread.deliveries.forEach((delivery, index) => {
      if (delivery.verdict !== "accepted" && delivery.verdict !== "rejected") return;
      const promise = thread.promisers.find((candidate) => candidate.player === delivery.player);
      const offer = promise === undefined ? undefined : offerAt(thread.opening, promise.at);
      outcomes.push(outcomeOf({
        source: "work-arena", lot: thread.id, delivery: `${thread.id}#${index + 1}`, provider: delivery.player, judge: assayerOf(thread),
        verdict: delivery.verdict, at: delivery.judgedAt ?? delivery.at,
        evidence: (delivery.assay ?? []).length > 0 ? delivery.assay : [`work-arena-delivery:${thread.id}#${index + 1}`],
        ...(delivery.verdict === "rejected" ? { unmet: delivery.unmet ?? [], ...(text(delivery.reason) ? { reason: delivery.reason } : {}) } : {}),
        ...(offer === undefined || !(Number(offer.amount) > 0) ? {} : { value: { amount: String(offer.amount), currency: offer.currency, basis: "offer" } }),
      }));
    });
  }
  return Object.freeze(outcomes);
}

/**
 * The moves recorded at a custody root, as the arena's reader takes them: each move a record whose
 * identity is its address (its `causes` are the store's, not the move's own).
 */
export function workArenaMovesAt(root) {
  return [...each(root, WORK_ARENA_MOVE_TYPE)].map(({ address, record }) => {
    const { causes, ...move } = record;
    return Object.freeze({ id: address, record: move, causes: Object.freeze(causes ?? []) });
  });
}

/** The work board at a custody root (the node's data root) at an instant, read from its moves. */
export function workArenaBoardAt(root, at, { territories } = {}) {
  return createWorkArenaReader().boardAt(workArenaMovesAt(root), at, { territories });
}

/** The arena's judged deliveries at a custody root (the node's data root), read from its moves. */
export const arenaOutcomesAt = (root, at, options = {}) => arenaOutcomesOf(workArenaBoardAt(root, at, options));

/**
 * The journal of outcomes at a custody root (the node's data root): `record` tells outcomes, and
 * one the store already holds is not told again; `read` returns them once each, optionally only
 * those judged in `[from, to)`, which it reads from the days of the `work-outcome` log that period
 * touches. Reading all folds the whole type: a learner that reads often reads a standing index
 * instead (`standingIndexOf`).
 * @param {string} root
 */
export function outcomeJournal(root) {
  const standing = (outcome) => outcome?.kind === OUTCOME_KIND && OUTCOME_SOURCES.includes(outcome.source);
  const read = ({ from, to } = {}) => {
    const seen = new Map();
    const take = (outcome) => {
      if (!standing(outcome) || seen.has(outcome.id)) return;
      if ((from !== undefined && Date.parse(outcome.at) < Date.parse(from)) || (to !== undefined && Date.parse(outcome.at) >= Date.parse(to))) return;
      seen.set(outcome.id, canonicalizeJson(outcome).value);
    };
    if (from === undefined && to === undefined) {
      for (const { record } of each(root, OUTCOME_TYPE)) take(record);
    } else {
      const first = from === undefined ? "" : from.slice(0, 10);
      const last = to === undefined ? "\uffff" : to.slice(0, 10);
      for (const date of logDates(root, OUTCOME_TYPE)) {
        if (date < first) continue;
        if (date > last) break;
        for (const { line } of readLog(root, OUTCOME_TYPE, date)) {
          const record = typeof line.of === "string" ? get(root, OUTCOME_TYPE, line.of) : undefined;
          if (record !== undefined) take(record);
        }
      }
    }
    return Object.freeze([...seen.values()].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)));
  };
  return Object.freeze({
    record(outcomes) {
      let appended = 0;
      for (const outcome of [outcomes].flat()) {
        const made = outcome.kind === OUTCOME_KIND && text(outcome.id) ? outcome : outcomeOf(outcome);
        if (made.source === "x402-settlement") throw new TypeError("an x402 payment cannot be recorded as customer acceptance");
        const address = semanticId(made);
        if (has(root, OUTCOME_TYPE, address)) continue;
        // The line first: a line whose record never arrived reads as nothing, and a record without
        // its line would be missed by every read of a period.
        append(root, OUTCOME_TYPE, { at: new Date(made.at).toISOString(), of: address, verdict: made.verdict });
        put(root, OUTCOME_TYPE, made);
        appended += 1;
      }
      return appended;
    },
    read,
  });
}

/**
 * The outcomes that stand: each told once, voids and what they void removed, and of several
 * judgments one judge made of one delivery the latest. Timestamp-only consecutive replays of
 * the same work-discharge body retain their original instant; a changed judgment or a distinct
 * receiving receipt is a different act. Historical rows and content addresses stay unchanged.
 * @param {ReadonlyArray<object>} outcomes
 */
export function standingOutcomes(outcomes) {
  const voided = new Set(outcomes.filter((outcome) => outcome.source !== "x402-settlement" && outcome.verdict === "voided").map((outcome) => outcome.voids));
  const latest = new Map();
  const previousJudgment = new Map();
  const timeOrder = (a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id);
  const replayBody = ({ id, at, ...body }) => canonicalJson(body);
  for (const outcome of [...outcomes].sort(timeOrder)) {
    // Historical payment-as-acceptance rows remain readable as claims, not standing judgments.
    if (outcome.source === "x402-settlement" || outcome.verdict === "voided") continue;
    const key = `${outcome.source}\u0000${outcome.delivery}\u0000${outcome.judge}`;
    const previous = previousJudgment.get(key);
    previousJudgment.set(key, outcome);
    // A withdrawn B still separates the two genuine acts in A -> B -> A.
    // Withdrawal changes standing, not the original chronology of receiving.
    if (voided.has(outcome.id)) continue;
    const held = latest.get(key);
    // The old receiver used the retry clock in the content address. Folding identical
    // consecutive bodies at their first instant prevents those historic duplicate rows
    // from moving cost to a later period. A -> B -> A remains three genuine revisions.
    if (held?.source === "work-discharge" && previous !== undefined
      && replayBody(previous) === replayBody(outcome) && replayBody(held) === replayBody(outcome)) continue;
    latest.set(key, outcome);
  }
  return Object.freeze([...latest.values()].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)));
}

/** A delivery's reading in FOUR from the standing judgments of it: held, denied, contested or unknown. */
export function deliveryReadingOf(outcomes) {
  const standing = standingOutcomes(outcomes);
  return readingOfSides("extremal", standing.some(isAcceptedWorkOutcome), standing.some(isRejectedWorkOutcome));
}

/**
 * The house's standing of each key (a carrier, by default) from its standing outcomes, in the shape
 * work/staffing reads: a Map key → `{accepted, attempts}`. Outcomes without the key are left out.
 * @param {ReadonlyArray<object>} outcomes
 * @param {{keyOf?: (outcome: object) => (string | undefined)}} [options]
 */
export function standingOf(outcomes, { keyOf = (outcome) => outcome.carrier } = {}) {
  const standing = new Map();
  for (const outcome of standingOutcomes(outcomes)) {
    const key = keyOf(outcome);
    if (!text(key)) continue;
    const prior = standing.get(key) ?? { accepted: 0, attempts: 0 };
    standing.set(key, { accepted: prior.accepted + (isAcceptedWorkOutcome(outcome) ? 1 : 0), attempts: prior.attempts + 1 });
  }
  return standing;
}

/**
 * A standing as an index a learner reads instead of folding the journal itself: the journal is
 * folded once, by the job that reads it whole, and the result kept small. `writeStandingIndex`
 * writes it; `readStandingIndex` returns the Map `standingOf` would, empty when there is none.
 */
export function standingIndexOf(standing, { at, digest, excluded = [] } = {}) {
  return Object.freeze({
    kind: "organizing.enterprise.outcome-standing", at, digest, excluded: Object.freeze([...new Set([...excluded, "x402-settlement"])]),
    standing: Object.freeze([...standing.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([carrier, { accepted, attempts }]) => Object.freeze({ carrier, accepted, attempts }))),
  });
}

export function readStandingIndex(path) {
  try {
    const index = JSON.parse(readFileSync(path, "utf8"));
    if (index?.kind !== "organizing.enterprise.outcome-standing" || !Array.isArray(index.standing)
        || !index.excluded?.includes("x402-settlement")) return new Map();
    return new Map(index.standing.filter((row) => text(row?.carrier) && Number.isInteger(row.accepted) && Number.isInteger(row.attempts))
      .map((row) => [row.carrier, { accepted: row.accepted, attempts: row.attempts }]));
  } catch { return new Map(); }
}

/**
 * The judgments routing reads of the inference market's deliveries from every other register (an
 * editor's return, a customer's acceptance, an arena verdict) that names the delivery it judged by
 * its market coordinate: the standing ones, folded once from the journal by the job that reads it
 * whole. The market's own receiver outcomes are left out; its pricing keeps them.
 */
export function marketJudgmentsIndexOf(outcomes, { at, digest } = {}) {
  return Object.freeze({
    kind: "organizing.enterprise.market-judgments", at, digest,
    judgments: Object.freeze(standingOutcomes(outcomes).filter((outcome) => outcome.source !== "inference-market" && outcome.market !== undefined)
      .map((outcome) => Object.freeze({ id: outcome.id, source: outcome.source, verdict: outcome.verdict, at: outcome.at, judge: outcome.judge, market: outcome.market, ...(outcome.reportedResult === undefined ? {} : { reportedResult: outcome.reportedResult }) }))),
  });
}

export function readMarketJudgments(path) {
  try {
    const index = JSON.parse(readFileSync(path, "utf8"));
    return index?.kind === "organizing.enterprise.market-judgments" && Array.isArray(index.judgments) ? Object.freeze(index.judgments.filter((row) => row.source !== "x402-settlement")) : Object.freeze([]);
  } catch { return Object.freeze([]); }
}

/** Currencies a value-added statement can sum as dollars; a value in any other is not counted, never zero. */
export const USD_PEGGED = Object.freeze(["USD", "USDC"]);

/**
 * The value each micro-enterprise captured from its users, as the settlement receipts its value-added
 * statement reads (enterprise/statement: value captured is counted only from settlement receipts):
 * one receipt for each accepted, valued judgment by a party outside the entity (external or related)
 * of work the enterprise provided, in a currency the statement can sum as dollars.
 */
export function judgedSettlementsOf(outcomes, { partyOf } = {}) {
  const receipts = {};
  for (const outcome of standingOutcomes(outcomes)) {
    if (!isAcceptedWorkOutcome(outcome) || outcome.value === undefined || outcome.value.basis === "cost" || !USD_PEGGED.includes(outcome.value.currency)) continue;
    const seam = seamOfOutcome(outcome, partyOf);
    const enterprise = partyOf?.(outcome.provider)?.enterprise;
    if (!BOOKED_SEAMS.includes(seam) || enterprise === undefined) continue;
    (receipts[enterprise] ??= []).push(Object.freeze({ kind: "settlement", received: Number(outcome.value.amount), currency: outcome.value.currency,
      parties: Object.freeze([outcome.judge]), recordedAt: outcome.at, outcome: outcome.id, source: outcome.source, seam }));
  }
  return Object.freeze(Object.fromEntries(Object.entries(receipts).sort(([a], [b]) => a.localeCompare(b)).map(([enterprise, list]) => [enterprise, Object.freeze(list)])));
}

export const judgedSettlementsIndexOf = (outcomes, { partyOf, at, digest } = {}) =>
  Object.freeze({ kind: "organizing.enterprise.judged-settlements", at, digest, enterprises: judgedSettlementsOf(outcomes, { partyOf }) });

const judgedSettlementsHeld = new Map();
/** One enterprise's judged settlement receipts from the index, re-read only when the file changes. */
export function readJudgedSettlements(path, enterprise) {
  if (path === undefined) return [];
  let mtime;
  try { mtime = statSync(path).mtimeMs; } catch { return []; }
  let held = judgedSettlementsHeld.get(path);
  if (held?.mtime !== mtime) {
    try {
      const index = JSON.parse(readFileSync(path, "utf8"));
      held = { mtime, enterprises: index?.kind === "organizing.enterprise.judged-settlements" ? index.enterprises ?? {} : {} };
    } catch { held = { mtime, enterprises: {} }; }
    judgedSettlementsHeld.set(path, held);
  }
  return (held.enterprises[enterprise] ?? []).filter((row) => row.source !== "x402-settlement");
}

/** The Beta(1,1) posterior acceptance of a standing: (accepted + 1) / (attempts + 2). */
export const posteriorOf = ({ accepted, attempts }) => (accepted + 1) / (attempts + 2);

/**
 * How a judgment stands to an entity's books, read from the parties `partyOf` resolves (`{enterprise?,
 * entity?}`; an unresolved party is outside every entity): `internal` when the judge is the
 * provider's own enterprise, `intra-group` when both are of one entity, `related` when the judge is
 * of another known entity (the founder, another legal entity of the Group), `external` when the
 * judge is no party the house knows.
 */
export function seamOfOutcome(outcome, partyOf = () => ({})) {
  const provider = partyOf(outcome.provider) ?? {};
  const judge = partyOf(outcome.judge) ?? {};
  if (judge.enterprise === undefined && judge.entity === undefined) return "external";
  if (provider.enterprise !== undefined && judge.enterprise === provider.enterprise) return "internal";
  return provider.entity !== undefined && provider.entity === judge.entity ? "intra-group" : "related";
}

const CAIP_ACCOUNT = /^[a-z0-9-]+:[A-Za-z0-9-]+:(.+)$/u;

/**
 * The party an actor is, for `seamOfOutcome`: an account the house holds (`accounts`, keyed by the
 * account's address in lower case, so a CAIP-10 id `eip155:8453:0x…` and the bare address are one
 * account) is the party its owner is; a seated micro-enterprise is itself; an office
 * (`<section>#<office>`) or a section (`section:<path>`) is the enterprise seated most deeply over
 * it; an identifier in a namespace only the house mints (`namespaces`, each `{prefix, party}`: its
 * micro-enterprise urns, the actors it constitutes) is that namespace's party, unless an account
 * registers it as someone else; anyone else is no party the house knows.
 * @param {{territories?: ReadonlyArray<{id: string, section: string, entity?: string}>, accounts?: Map<string, {enterprise?: string, entity?: string}>, namespaces?: ReadonlyArray<{prefix: string, party: {enterprise?: string, entity?: string}}>}} [options]
 */
export function partyResolverOf({ territories = [], accounts = new Map(), namespaces = [] } = {}) {
  const seated = new Map(territories.map((territory) => [territory.id, territory]));
  const partyOfTerritory = (territory) => Object.freeze({ enterprise: territory.id, ...(territory.entity ? { entity: territory.entity } : {}) });
  return (actor) => {
    if (!text(actor)) return undefined;
    const account = accounts.get(actor.toLowerCase()) ?? accounts.get(CAIP_ACCOUNT.exec(actor)?.[1]?.toLowerCase());
    if (account !== undefined) return account;
    if (seated.has(actor)) return partyOfTerritory(seated.get(actor));
    const minted = namespaces.find(({ prefix }) => actor.startsWith(prefix));
    if (minted !== undefined) return Object.freeze({ ...minted.party });
    const section = houseSectionOf(actor.includes("#") ? actor.split("#")[0] : actor);
    if (section === undefined) return undefined;
    let home;
    for (const territory of territories) {
      if (section !== territory.section && !section.startsWith(`${territory.section}/`)) continue;
      if (home === undefined || territory.section.length > home.section.length) home = territory;
    }
    return home === undefined ? undefined : partyOfTerritory(home);
  };
}

const BOOKED_SEAMS = Object.freeze(["external", "related"]);
const linkOf = (outcome) => `outcome-${Buffer.from(outcome.id.split(";").at(-1), "base64url").toString("hex").slice(0, 32)}`;

/**
 * The postings an outcome makes in its provider entity's book: an accepted, valued judgment by a
 * counterparty outside the entity books the value to its account (the offer's `account`, else
 * `Income:Services`) against where it was settled (`settledTo`, else a trade receivable). A
 * judgment inside the entity books nothing: the Group paying itself is no sale.
 */
export function outcomePostingsOf(outcome, partyOf) {
  if (outcome.source === "x402-settlement" || !isAcceptedWorkOutcome(outcome) || outcome.value === undefined || outcome.value.basis === "cost" || !BOOKED_SEAMS.includes(seamOfOutcome(outcome, partyOf))) return Object.freeze([]);
  const amount = gradedOfDecimal(outcome.value.amount, outcome.value.currency);
  return Object.freeze([
    posting({ account: outcome.value.settledTo ?? "Assets:Receivables:Trade", amount }),
    posting({ account: outcome.value.account ?? "Income:Services", amount: gradedNegate(amount) }),
  ]);
}

/**
 * An entity's book of its outcomes: an entry for each accepted, valued judgment by a counterparty
 * outside it, linked by the outcome, each account opened at its first use. A delivery another book
 * already records (`booked`, by delivery id) is left to it, so the two never count one sale twice.
 * A projection, written whole and never edited.
 * @param {ReadonlyArray<object>} outcomes
 * @param {{partyOf?: (actor: string) => ({enterprise?: string, entity?: string} | undefined), booked?: Set<string>}} [options]
 */
export function outcomeBookOf(outcomes, { partyOf, booked = new Set() } = {}) {
  const entries = standingOutcomes(outcomes)
    .filter((outcome) => !booked.has(outcome.delivery) && outcomePostingsOf(outcome, partyOf).length > 0)
    .map((outcome) => transaction({
      date: outcome.at.slice(0, 10),
      flag: "*",
      payee: outcome.judge,
      narration: `${outcome.source} accepted ${outcome.lot}`,
      postings: outcomePostingsOf(outcome, partyOf),
      links: [linkOf(outcome)],
      meta: {
        outcome: outcome.id, source: outcome.source, delivery: outcome.delivery, provider: outcome.provider,
        seam: seamOfOutcome(outcome, partyOf), basis: outcome.value.basis, evidence: JSON.stringify(outcome.evidence),
        ...(outcome.carrier ? { carrier: outcome.carrier } : {}),
      },
    }));
  const opened = new Map();
  for (const entry of entries) for (const { account } of entry.postings) if (!opened.has(account)) opened.set(account, open({ date: entry.date, account }));
  return Object.freeze([...opened.values(), ...entries]);
}

/** The book's text: a header naming it a projection of the outcome journal, then its entries. */
export function outcomeBookText(outcomes, { partyOf, booked, title = "the Group's book of judged deliveries" } = {}) {
  const entries = outcomeBookOf(outcomes, { partyOf, booked });
  return `; ${title}, derived from the outcome journal (organizing/enterprise/outcomes).\n; A projection: do not edit; it is rewritten whole from the journal.\n\n${entries.length === 0 ? "" : `${printEntries(entries)}\n`}`;
}

const moneySum = (values) => {
  const totals = {};
  for (const value of values) {
    const amount = gradedOfDecimal(value.amount, value.currency);
    totals[value.currency] = totals[value.currency] === undefined ? amount : gradedAdd(totals[value.currency], amount);
  }
  return Object.freeze(Object.fromEntries(Object.entries(totals).filter(([, total]) => !gradedIsZero(total)).sort(([a], [b]) => a.localeCompare(b)).map(([currency, total]) => [currency, gradedToDecimalString(total)])));
};

/**
 * The money cost of resources at unit prices, by currency, and the resources no price covers.
 * `priceOf(resource)` returns the price of one unit `{amount, currency}` or undefined.
 */
function costOf(resources, priceOf) {
  const priced = [];
  const unpriced = [];
  for (const resource of resources) {
    const price = priceOf?.(resource);
    if (price === undefined || price === null) { unpriced.push(resource); continue; }
    const cost = gradedTimes(gradedOfDecimal(price.amount, price.currency), gradedFromParts(resource.amount, 1, resource.unit), price.currency);
    priced.push({ amount: gradedToDecimalString(cost), currency: price.currency });
  }
  const summed = moneySum(priced);
  // A witnessed zero price is known zero, not an absent price.
  const cost = Object.freeze(Object.fromEntries([...new Set(priced.map(value => value.currency))].sort()
    .map(currency => [currency, summed[currency] ?? "0"])));
  return Object.freeze({ cost, unpriced: sumResources(unpriced) });
}

/**
 * The money value of a list of resources at unit prices, when every one of them is priced in one
 * currency; undefined when any is unpriced (unknown is never zero) or the prices disagree in currency.
 * @param {ReadonlyArray<{resource: string, unit: string, amount: string, carrier?: string}>} resources
 * @param {(resource: object) => ({amount: string, currency: string} | undefined)} priceOf
 */
export function pricedCostOf(resources, priceOf) {
  if (!Array.isArray(resources) || resources.length === 0 || typeof priceOf !== "function") return undefined;
  const { cost, unpriced } = costOf(resources, priceOf);
  const currencies = Object.keys(cost);
  if (unpriced.length > 0 || currencies.length !== 1) return undefined;
  return Object.freeze({ amount: cost[currencies[0]], currency: currencies[0] });
}

const pricesHeld = new Map();
/**
 * The unit prices the allowance registry publishes (`<webData>/records/allowances/resource-prices.json`,
 * keyed `<carrier>|<resource>`, Lane 4's resourcePriceOf) as a `priceOf` for `pricedCostOf` and
 * `acceptanceReadoutOf`, re-read only when the file changes; a missing file prices nothing.
 */
export function resourcePricesAt(path) {
  return (resource) => {
    if (path === undefined || !text(resource?.carrier)) return undefined;
    let mtime;
    try { mtime = statSync(path).mtimeMs; } catch { return undefined; }
    let held = pricesHeld.get(path);
    if (held?.mtime !== mtime) {
      try { const index = JSON.parse(readFileSync(path, "utf8")); held = { mtime, prices: index?.prices ?? {} }; }
      catch { held = { mtime, prices: {} }; }
      pricesHeld.set(path, held);
    }
    const price = held.prices[`${resource.carrier}|${resource.resource}`];
    return price !== undefined && DECIMAL.test(String(price.amount ?? "")) && text(price.currency) ? price : undefined;
  };
}

/** A money amount divided among `count` units, to the cent's hundredth. */
const perUnit = (amount, currency, count) => formatGraded(gradedQuotient(gradedOfDecimal(amount, currency), gradedFromParts(count, 1, "unit"), currency), { places: 6, grouping: false });

/** A measured amount divided among `count` units, as a decimal to the thousandth with no trailing zeros. */
const decimalPerUnit = (amount, count) => {
  const fixed = (Number(amount) / count).toFixed(3);
  return fixed.replace(/(\.\d*?)0+$/u, "$1").replace(/\.$/u, "");
};

/** One row: accepted/rejected work, observed failed reports, every attempt and its full cost. */
function rowOf(key, outcomes, priceOf) {
  const accepted = outcomes.filter(isAcceptedWorkOutcome).length;
  const rejected = outcomes.filter(isRejectedWorkOutcome).length;
  const failed = outcomes.filter(isFailedWorkReport).length;
  const attempts = outcomes.length;
  const resources = sumResources(outcomes.map((outcome) => outcome.resources ?? []));
  // An explicit incurred cost is the monetary witness for this attempt. Do not
  // count the same attempt's resource-price estimate a second time. Attempts
  // without that witness retain their original resource pricing/unknowns.
  const priced = outcomes.map(outcome => outcome.value?.basis === "cost"
    ? { cost: { [outcome.value.currency]: outcome.value.amount }, unpriced: [] }
    : costOf(outcome.resources ?? [], priceOf));
  const amounts = priced.flatMap(row => Object.entries(row.cost).map(([currency, amount]) => ({ currency, amount })));
  const summed = moneySum(amounts);
  const cost = Object.freeze(Object.fromEntries([...new Set(amounts.map(value => value.currency))].sort()
    .map(currency => [currency, summed[currency] ?? "0"])));
  const unpriced = sumResources(priced.map(row => row.unpriced));
  return Object.freeze({
    ...key, accepted, rejected, judged: attempts,
    ...(failed === 0 ? {} : { failed, reportJudgments: reportJudgmentsOf(outcomes) }),
    posterior: posteriorOf({ accepted, attempts }),
    // What one accepted unit took in judged attempts: the denominator of staffing's expected cost
    // (price / acceptance), known from records alone; none until something was accepted.
    attemptsPerAccepted: accepted === 0 ? null : Number((attempts / accepted).toFixed(3)),
    resources,
    witnessedResources: outcomes.filter((outcome) => (outcome.resources ?? []).length > 0).length,
    cost,
    // What one accepted unit consumed, in each resource's own unit: the measured cost of the work,
    // known wherever anything was accepted and its consumption witnessed, priced or not.
    consumptionPerAccepted: accepted === 0 || resources.length === 0 ? null
      : Object.freeze(resources.map((resource) => Object.freeze({ ...resource, amount: decimalPerUnit(resource.amount, accepted) }))),
    // Its money value per accepted unit, known only where every consumed resource is priced.
    costPerAccepted: unpriced.length > 0 || Object.keys(cost).length === 0 || accepted === 0
      ? null : Object.freeze(Object.fromEntries(Object.entries(cost).map(([currency, amount]) => [currency, perUnit(amount, currency, accepted)]))),
    unpriced,
  });
}

/** How many deliveries stand at each point of FOUR: held, denied, contested, unknown. */
const readingsCensusOf = (readings) => Object.freeze(Object.fromEntries(readingFamilies.extremal.map((name) => [name, readings.filter((reading) => reading === name).length])));

function groupBy(outcomes, keyOf) {
  const groups = new Map();
  for (const outcome of outcomes) {
    const key = keyOf(outcome);
    if (key === undefined) continue;
    const name = JSON.stringify(key);
    (groups.get(name) ?? groups.set(name, { key, outcomes: [] }).get(name)).outcomes.push(outcome);
  }
  return [...groups.values()].sort((a, b) => JSON.stringify(a.key).localeCompare(JSON.stringify(b.key)));
}

/**
 * The acceptance readout of a period: from the outcomes judged in `[from, to)`, how many deliveries
 * were accepted and rejected per register, per carrier and per providing enterprise, the posterior
 * acceptance, what the work consumed and cost, the cost per accepted unit where every resource is
 * priced, and at the border what strangers paid, what related parties paid, and what the Group paid
 * itself (never booked). Read from records alone.
 * @param {ReadonlyArray<object>} outcomes
 * @param {{from: string, to: string, partyOf?: Function, priceOf?: Function}} options
 */
export function acceptanceReadoutOf(outcomes, { from, to, partyOf, priceOf } = {}) {
  if (!INSTANT.test(from ?? "") || !INSTANT.test(to ?? "") || Date.parse(from) >= Date.parse(to)) throw new TypeError("an acceptance readout reads a period [from, to) of ISO instants");
  const inPeriod = standingOutcomes(outcomes).filter((outcome) => Date.parse(outcome.at) >= Date.parse(from) && Date.parse(outcome.at) < Date.parse(to));
  const enterpriseOf = (actor) => partyOf?.(actor)?.enterprise ?? actor;
  const valued = inPeriod.filter((outcome) => isAcceptedWorkOutcome(outcome) && outcome.value !== undefined && outcome.value.basis !== "cost");
  const bySeam = (seam) => valued.filter((outcome) => seamOfOutcome(outcome, partyOf) === seam);
  const external = bySeam("external");
  return Object.freeze({
    kind: "organizing.enterprise.acceptance-readout",
    from, to,
    recognition: "Every judgment of delivered work told as one outcome: accepted and rejected deliveries per register, carrier and enterprise, with the Beta(1,1) posterior (accepted work + 1) / (all judged attempts + 2). Error reports retain their verdict, native failure and cost without satisfying work. Cost per accepted unit is stated only where every consumed resource is priced; unknown is never zero. Money paid by the Group's own wallets is the Group paying itself and is no sale.",
    judged: Object.freeze({ accepted: inPeriod.filter(isAcceptedWorkOutcome).length, rejected: inPeriod.filter(isRejectedWorkOutcome).length }),
    ...(inPeriod.some(isFailedWorkReport) ? { failed: inPeriod.filter(isFailedWorkReport).length, reportJudgments: reportJudgmentsOf(inPeriod) } : {}),
    readings: readingsCensusOf(groupBy(inPeriod, (outcome) => outcome.delivery).map(({ outcomes: judged }) => deliveryReadingOf(judged))),
    bySource: Object.freeze(groupBy(inPeriod, (outcome) => ({ source: outcome.source })).map(({ key, outcomes: list }) => rowOf(key, list, priceOf))),
    byCarrier: Object.freeze(groupBy(inPeriod, (outcome) => ({ carrier: outcome.carrier ?? null })).map(({ key, outcomes: list }) => rowOf(key, list, priceOf))),
    byEnterprise: Object.freeze(groupBy(inPeriod, (outcome) => ({ enterprise: enterpriseOf(outcome.provider) })).map(({ key, outcomes: list }) => rowOf(key, list, priceOf))),
    border: Object.freeze({
      external: Object.freeze({ count: external.length, value: moneySum(external.map((outcome) => outcome.value)), payers: [...new Set(external.map((outcome) => outcome.judge))].sort() }),
      related: Object.freeze({ count: bySeam("related").length, value: moneySum(bySeam("related").map((outcome) => outcome.value)) }),
      self: Object.freeze({ count: bySeam("intra-group").length + bySeam("internal").length, value: moneySum([...bySeam("intra-group"), ...bySeam("internal")].map((outcome) => outcome.value)) }),
    }),
    unattributed: Object.freeze({ carrier: inPeriod.filter((outcome) => outcome.carrier === undefined).length }),
  });
}

/** The week `[from, to)` an instant falls in, Monday 00:00Z to the next Monday (ISO weeks). */
export function isoWeekOf(at) {
  const day = new Date(`${at.slice(0, 10)}T00:00:00.000Z`);
  const monday = new Date(day.getTime() - (((day.getUTCDay() + 6) % 7) * 86_400_000));
  const next = new Date(monday.getTime() + 7 * 86_400_000);
  const thursday = new Date(monday.getTime() + 3 * 86_400_000);
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.floor((thursday.getTime() - yearStart) / (7 * 86_400_000)) + 1;
  return Object.freeze({ week: `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`, from: monday.toISOString(), to: next.toISOString() });
}

/** The digest an outcome-derived artifact names its inputs by. */
export const outcomesDigestOf = (outcomes) => createHash("sha256").update(outcomes.map((outcome) => outcome.id).sort().join("\n")).digest("hex");
