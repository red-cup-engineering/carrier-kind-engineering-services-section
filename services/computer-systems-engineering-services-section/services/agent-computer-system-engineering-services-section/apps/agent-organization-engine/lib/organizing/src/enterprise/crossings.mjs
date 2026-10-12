/**
 * enterprise/crossings — the economy the work arena carries, read off the board and never kept
 * beside it (engineering note of 2026-09-27, "the one journal": ledgers, books and dashboards are
 * projections of witnessed moves, never separate stores; 561 Group note of 2026-10-01, "the
 * economy of the work arena").
 *
 * A crossing is one request taken up by one provider: an exchange, one admitted, answered message
 * (the honeycomb note of 2026-09-03). Two nuclei act on it. Δ, transfer, extends: a promise is a
 * commitment going forward, a delivery the claim that it was carried. σ, saturation, restricts:
 * the requester's assay judges the claim against the contract. A crossing is settled exactly when
 * it is fixed under both (Fix σ ∩ Fix Δ), and only then is it a tally, the matched pair of the
 * provider's release and the requester's admission. Its corners:
 *
 * | corner  | stage                 | tally status | booked |
 * |---------|-----------------------|--------------|--------|
 * | neither | lapsed                | —            | no     |
 * | Δ       | committed, claimed    | claim (when claimed) | no; committed work is backlog, disclosed |
 * | σ       | disputed              | dispute      | no; held with both witnesses |
 * | both    | settled               | settled      | yes, in both books |
 *
 * The stage is not decided here but reconciled: the provider's release half (its delivery, while
 * it has not renounced it) and the assayer's admission half (its verdict on that delivery) go to
 * the split tally (computer data engineering, `tally`), whose status is the stage — settled when
 * the halves agree, claim when one is held, dispute when they disagree — and only with no half at
 * all does the thread's standing say committed or lapsed. Each lane is read in FOUR: Δ told for by
 * a standing delivery and against by a renounced one, σ told for by acceptance and against by
 * rejection. Neither a claim nor a dispute is erased by the thread closing: a delivery awaiting
 * assay on a withdrawn thread stays a claim, a rejected one the provider stands by stays a
 * dispute, and a stale half closes the provider's tally credit with that requester until matched.
 * The tally's link is the content digest of its halves. Nothing is self-attested: a crossing's value is read from the requester's offer
 * or from the provider's witnessed cost, and an amount nobody witnessed is unknown, never zero.
 *
 * Inside a legal entity price is cost (the internal clearing doctrine): a crossing between members
 * is valued at the provider's cost when that is witnessed, else at the offer. At a border (a party
 * that is no member) the offer is the price. A crossing within one micro-enterprise is its own
 * work and books nothing.
 *
 * Settled crossings between members are double-booked on their pairwise credit line: the provider
 * holds `Assets:Credit-Lines:<Requester>` against `Income:Intra-Group-Services:<Requester>`, the
 * requester `Expenses:Intra-Group-Services:<Provider>` against
 * `Liabilities:Credit-Lines:<Provider>`. The two entries share one link, the tally's name, and
 * consolidation (accounting/consolidation) eliminates both pairs.
 * @packageDocumentation
 */
import { createHash } from "node:crypto";
import { census, readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { gradedAdd, gradedIsZero, gradedNegate, gradedOfDecimal, gradedSign, gradedSubtract, gradedToDecimalString, gradedZero } from "@red-cup-engineering/exact-number-data-service/graded";
import { tally } from "@red-cup-engineering/computer-data-engineering-services-section/tally";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { cohomologyOfCells } from "@red-cup-engineering/signgraph/cohomology";
import { creditLineAccount, intraGroupServicesAccount } from "../accounting/consolidation.mjs";
import { open, posting, transaction } from "../accounting/ledger.mjs";
import { printEntries } from "../accounting/report.mjs";
import { tallyCredit } from "../accounting/tally-credit.mjs";
import { sumResources } from "./resources.mjs";
import { CLOSED_STANDINGS, houseSectionOf, offerAt } from "./work-arena.mjs";

const DAY_MS = 86_400_000;

/** The stages a crossing reaches, in the order a crossing passes through them. */
export const CROSSING_STAGES = Object.freeze(["committed", "claimed", "disputed", "settled", "lapsed"]);

/** Each stage's corner of the σ/Δ quartet. */
export const CROSSING_CORNERS = Object.freeze({ committed: "Δ", claimed: "Δ", disputed: "σ", settled: "both", lapsed: "neither" });

/** How a crossing stands to the federation's books: within one enterprise, between members of one entity, between entities, or across the border. */
export const SEAMS = Object.freeze(["internal", "intra-group", "related", "external"]);

/**
 * The party a player is: a seated micro-enterprise by its id; an office by the enterprise seated
 * over the deepest section enclosing it; anyone else an outside party.
 * @param {string} player
 * @param {ReadonlyArray<{id: string, section: string, entity?: string}>} territories
 */
export function partyOf(player, territories = []) {
  const seated = territories.find((territory) => territory.id === player);
  if (seated !== undefined) return Object.freeze({ player, enterprise: seated.id, ...(seated.entity ? { entity: seated.entity } : {}) });
  const section = typeof player === "string" && player.includes("#") ? houseSectionOf(player.split("#")[0]) : undefined;
  let home;
  for (const territory of section === undefined ? [] : territories) {
    if (section !== territory.section && !section.startsWith(`${territory.section}/`)) continue;
    if (home === undefined || territory.section.length > home.section.length) home = territory;
  }
  return Object.freeze(home === undefined ? { player } : { player, enterprise: home.id, ...(home.entity ? { entity: home.entity } : {}) });
}

function seamOf(provider, requester) {
  if (provider.enterprise === undefined || requester.enterprise === undefined) return "external";
  if (provider.enterprise === requester.enterprise) return "internal";
  return provider.entity !== undefined && provider.entity === requester.entity ? "intra-group" : "related";
}

/** A money amount as exact decimal text in its currency. */
const money = (amount, currency) => Object.freeze({ amount: String(amount), currency });

function valueOf(crossing, thread, costOf) {
  const offered = crossing.promisedAt === undefined ? undefined : offerAt(thread.opening, crossing.promisedAt);
  const offer = offered === undefined || offered.amount === 0 ? undefined : money(offered.amount, offered.currency);
  const cost = costOf?.(crossing);
  const witnessedCost = cost === undefined || cost === null ? undefined : money(cost.amount, cost.currency);
  const [first, second] = crossing.seam === "external" ? [["offer", offer], ["cost", witnessedCost]] : [["cost", witnessedCost], ["offer", offer]];
  const [basis, value] = first[1] !== undefined ? first : second;
  return value === undefined ? null : Object.freeze({ ...value, basis });
}

/**
 * What the two halves of a crossing's tally compare: the case (the thread), the content the
 * delivery carried (its evidence digests), and whether its contract was met — the provider's
 * release always says it was, the assayer's admission says what its assay found. A rejection is
 * therefore a dispute held in FOUR (contested: the halves agree on the case and the content and
 * disagree on the outcome), never a lapse.
 */
export const CROSSING_TALLY_FIELDS = Object.freeze(["caseId", "digests", "met"]);

/** One half of a crossing's tally, held by `actor` against `counterparty`. */
function halfOf(thread, delivery, actor, counterparty, met) {
  return Object.freeze({ caseId: thread.id, digests: [...(delivery.evidence ?? [])].map(String).sort(), met, actor, counterparty });
}

/** The tally's own name: the digest of its halves, so both books carry one content-addressed link. */
function tallyDigestOf(release, admission) {
  return `tally-${createHash("sha256").update(canonicalJson({ release, admission: admission ?? null })).digest("hex")}`;
}

/**
 * The crossings of a board: one for each request and each provider that promised it, released
 * it or delivered on it.
 * @param {{threads: ReadonlyArray<object>}} board a work board (work-arena `workBoard`)
 * @param {object} [options]
 * @param {ReadonlyArray<{id: string, section: string, entity?: string}>} [options.territories]
 * @param {(crossing: object) => ({amount: string, currency: string} | null | undefined)} [options.costOf] the provider's witnessed cost of a crossing, given the crossing with its resources
 * @param {(crossing: object) => (ReadonlyArray<object> | undefined)} [options.consumedOf] the resources the provider's work on a crossing witnessed consuming (enterprise/resources); undefined when unwitnessed
 */
export function crossingsOf(board, { territories = [], costOf, consumedOf } = {}) {
  const crossings = [];
  for (const thread of board.threads) {
    if (thread.opening.move !== "request") continue;
    const requester = partyOf(thread.opening.assayer ?? thread.opening.by, territories);
    const players = new Set([
      ...thread.promisers.map((promise) => promise.player),
      ...(thread.releases ?? []).map((release) => release.player),
      ...thread.deliveries.map((delivery) => delivery.player),
    ]);
    for (const player of players) {
      const promise = thread.promisers.find((candidate) => candidate.player === player);
      const released = (thread.releases ?? []).filter((release) => release.player === player).at(-1);
      const deliveries = thread.deliveries.filter((delivery) => delivery.player === player);
      const last = deliveries.at(-1);
      const provider = partyOf(player, territories);
      // The tally's two halves. The release is the provider's delivery, standing while the provider
      // has not renounced it; the admission is the assayer's verdict on that same delivery. Which
      // delivery is tallied: the one accepted, else the last.
      const tallied = deliveries.find((delivery) => delivery.verdict === "accepted") ?? last;
      const renounced = released !== undefined && promise === undefined && tallied?.verdict !== "accepted" && (tallied === undefined || released.released >= tallied.at);
      const release = tallied === undefined || renounced ? undefined : halfOf(thread, tallied, player, thread.opening.assayer ?? thread.opening.by, true);
      const admission = release === undefined || tallied.verdict === undefined ? undefined : halfOf(thread, tallied, thread.opening.assayer ?? thread.opening.by, player, tallied.verdict === "accepted");
      const reconciled = tally({ release, admission, fields: CROSSING_TALLY_FIELDS });
      const stage = reconciled.status === "settled" ? "settled"
        : reconciled.status === "claim" ? "claimed"
          : reconciled.status === "dispute" ? "disputed"
            : promise === undefined || CLOSED_STANDINGS.includes(thread.standing) ? "lapsed"
              : "committed";
      const reading = Object.freeze({
        // Δ, transfer: told for by a standing delivery, against by a renounced commitment.
        delta: readingOfSides("knowledge", release !== undefined, renounced || (promise === undefined && release === undefined)),
        // σ, saturation: told for by acceptance, against by rejection, of the tallied delivery.
        sigma: readingOfSides("knowledge", tallied?.verdict === "accepted", tallied?.verdict === "rejected"),
        tally: reconciled.reading,
      });
      const base = {
        id: `${thread.id}#${player}`,
        thread: thread.id,
        provider,
        requester,
        seam: seamOf(provider, requester),
        stage,
        corner: CROSSING_CORNERS[stage],
        promisedAt: (promise ?? released)?.at,
        ...(promise?.subject ?? released?.subject ? { subject: promise?.subject ?? released?.subject } : {}),
        ...(released !== undefined && promise === undefined ? { releasedAt: released.released } : {}),
        deliveries: deliveries.length,
        rejections: deliveries.filter((delivery) => delivery.verdict === "rejected").map((delivery) => delivery.judgedAt),
        ...(last === undefined ? {} : { deliveredAt: last.at }),
        ...(stage === "settled" ? { settledAt: tallied.judgedAt ?? tallied.at, evidence: tallied.evidence ?? [] } : {}),
        reading,
        tally: Object.freeze({ status: reconciled.status, mismatches: reconciled.mismatches, ...(release === undefined ? {} : { link: tallyDigestOf(release, admission) }) }),
      };
      const consumed = consumedOf?.(base);
      const witnessed = consumed === undefined || consumed.length === 0 ? base : { ...base, resources: sumResources(consumed) };
      crossings.push(Object.freeze({ ...witnessed, value: valueOf(witnessed, thread, costOf) }));
    }
  }
  return Object.freeze(crossings);
}

/** The tally a settled crossing is named by in both books: the content digest of its two halves. */
export const tallyLinkOf = (crossing) => crossing.tally.link;

const BOOKED_SEAMS = Object.freeze(["intra-group", "related", "external"]);

/**
 * The postings a settled, valued crossing makes in one enterprise's book: as provider, as
 * requester, or none.
 * @param {object} crossing
 * @param {string} enterprise
 */
export function postingsOf(crossing, enterprise) {
  if (crossing.stage !== "settled" || crossing.value === null || !BOOKED_SEAMS.includes(crossing.seam)) return Object.freeze([]);
  const amount = gradedOfDecimal(crossing.value.amount, crossing.value.currency);
  const against = (party) => party.enterprise ?? party.player;
  if (crossing.provider.enterprise === enterprise) {
    return crossing.seam === "external"
      ? Object.freeze([posting({ account: `Assets:Receivables:Trade`, amount }), posting({ account: "Income:Services", amount: gradedNegate(amount) })])
      : Object.freeze([posting({ account: creditLineAccount("creditor", against(crossing.requester)), amount }), posting({ account: intraGroupServicesAccount("provider", against(crossing.requester)), amount: gradedNegate(amount) })]);
  }
  if (crossing.requester.enterprise === enterprise) {
    return crossing.seam === "external"
      ? Object.freeze([posting({ account: "Expenses:Contractor-Services", amount }), posting({ account: "Liabilities:Accounts-Payable", amount: gradedNegate(amount) })])
      : Object.freeze([posting({ account: intraGroupServicesAccount("requester", against(crossing.provider)), amount }), posting({ account: creditLineAccount("debtor", against(crossing.provider)), amount: gradedNegate(amount) })]);
  }
  return Object.freeze([]);
}

/**
 * One micro-enterprise's book of its crossings: an entry for every settled, valued crossing it
 * provided or requested, each account opened at its first use. The book is a projection; it is
 * written whole and never edited.
 * @param {string} enterprise
 * @param {ReadonlyArray<object>} crossings
 */
export function crossingBookOf(enterprise, crossings) {
  const transactions = crossings
    .filter((crossing) => postingsOf(crossing, enterprise).length > 0)
    .sort((a, b) => a.settledAt.localeCompare(b.settledAt) || a.id.localeCompare(b.id))
    .map((crossing) => {
      const providing = crossing.provider.enterprise === enterprise;
      const counterparty = providing ? crossing.requester : crossing.provider;
      return transaction({
        date: crossing.settledAt.slice(0, 10),
        payee: counterparty.enterprise ?? counterparty.player,
        narration: `${providing ? "rendered" : "received"} ${crossing.thread}`,
        postings: postingsOf(crossing, enterprise),
        links: [tallyLinkOf(crossing)],
        meta: { thread: crossing.thread, basis: crossing.value.basis, seam: crossing.seam, ...(crossing.subject ? { subject: crossing.subject } : {}) },
      });
    });
  const opened = new Map();
  for (const entry of transactions) for (const { account } of entry.postings) if (!opened.has(account)) opened.set(account, open({ date: entry.date, account }));
  return Object.freeze([...opened.values(), ...transactions]);
}

/** The book's text: a header naming it a projection, then its entries. */
export function crossingBookText(enterprise, crossings) {
  const entries = crossingBookOf(enterprise, crossings);
  return `; ${enterprise}'s book of its crossings, derived from the work arena (organizing/enterprise/crossings).\n; A projection: do not edit; it is rewritten whole from the board.\n\n${entries.length === 0 ? "" : printEntries(entries)}`;
}

/** The tally record between a provider and a requester, as tally credit reads it. */
export function tallyRecordOf(crossings) {
  const size = (crossing) => (crossing.value === null ? 0 : Number(crossing.value.amount));
  return Object.freeze(crossings.flatMap((crossing) => [
    ...(crossing.tally.status === "settled" ? [{ status: "settled", at: crossing.settledAt, size: size(crossing) }] : []),
    ...(crossing.tally.status === "claim" ? [{ status: "claim", at: crossing.deliveredAt, size: size(crossing) }] : []),
    ...crossing.rejections.filter(Boolean).map((at) => ({ status: "dispute", at, size: size(crossing) })),
  ]));
}

const sumOf = (values) => {
  const totals = {};
  for (const value of values) {
    if (value === null) continue;
    const amount = gradedOfDecimal(value.amount, value.currency);
    totals[value.currency] = totals[value.currency] === undefined ? amount : gradedAdd(totals[value.currency], amount);
  }
  return Object.freeze(Object.fromEntries(Object.entries(totals).filter(([, total]) => !gradedIsZero(total)).map(([currency, total]) => [currency, gradedToDecimalString(total)])));
};

/** Counts and sums of a set of crossings: how many, what is known of their value, and how many are unknown. */
function tallyOf(crossings) {
  return Object.freeze({ count: crossings.length, value: sumOf(crossings.map((crossing) => crossing.value)), unknown: crossings.filter((crossing) => crossing.value === null).length });
}

/** The stages a set of crossings has reached, each with its tally; a stage none reached is left out. */
const stagesOf = (crossings) => Object.freeze(Object.fromEntries(CROSSING_STAGES
  .map((stage) => [stage, crossings.filter((crossing) => crossing.stage === stage)])
  .filter(([, list]) => list.length > 0)
  .map(([stage, list]) => [stage, tallyOf(list)])));

const partyName = (party) => party.enterprise ?? party.player;

/**
 * Multilateral netting of the members' credit lines. Settled crossings between members leave
 * pairwise credit (the provider is owed by the requester), and that web of obligations splits,
 * as any flow on a graph does, into its divergence — each member's net position, which some
 * payment must carry — and a circulation, which cancels around the web's cycles and needs no
 * payment at all. The circulation lives in the first cohomology of the obligation graph
 * (signgraph: H¹ = edges − members + components); its rank counts the independent cycles netting
 * can clear. Gross is everything owed pairwise; net, the least any settlement must move, is the
 * sum of the positive positions (positions sum to zero); clearable is gross less net. Netting
 * nothing reads zero cycles, not an absent reading.
 * @param {ReadonlyArray<object>} crossings
 */
export function nettingOf(crossings) {
  const owed = crossings.filter((crossing) => crossing.stage === "settled" && crossing.value !== null && (crossing.seam === "intra-group" || crossing.seam === "related"));
  const pairs = new Map();
  const positions = new Map();
  const credit = (map, key, currency, amount) => {
    const held = map.get(key) ?? map.set(key, {}).get(key);
    held[currency] = held[currency] === undefined ? amount : gradedAdd(held[currency], amount);
  };
  for (const crossing of owed) {
    const amount = gradedOfDecimal(crossing.value.amount, crossing.value.currency);
    const [provider, requester] = [partyName(crossing.provider), partyName(crossing.requester)];
    credit(pairs, `${provider}\u0000${requester}`, crossing.value.currency, amount);
    credit(positions, provider, crossing.value.currency, amount);
    credit(positions, requester, crossing.value.currency, gradedNegate(amount));
  }
  const graph = cohomologyOfCells([...pairs.keys()].map((key) => { const [subject, object] = key.split("\u0000"); return { subject, predicate: "is-owed-by", object }; }));
  const currencies = [...new Set(owed.map((crossing) => crossing.value.currency))].sort();
  const byCurrency = Object.fromEntries(currencies.map((currency) => {
    const total = (amounts) => amounts.reduce((sum, amount) => gradedAdd(sum, amount), gradedZero(currency));
    const gross = total([...pairs.values()].flatMap((held) => (held[currency] === undefined ? [] : [held[currency]])));
    const net = total([...positions.values()].flatMap((held) => (held[currency] !== undefined && gradedSign(held[currency]) > 0 ? [held[currency]] : [])));
    return [currency, Object.freeze({ gross: gradedToDecimalString(gross), net: gradedToDecimalString(net), clearable: gradedToDecimalString(gradedSubtract(gross, net)) })];
  }));
  return Object.freeze({
    cycles: graph.firstCohomology.rank,
    components: graph.zeroCohomology.rank,
    byCurrency: Object.freeze(byCurrency),
    positions: Object.freeze([...positions.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([enterprise, held]) => Object.freeze({ enterprise, net: Object.freeze(Object.fromEntries(Object.entries(held).filter(([, amount]) => !gradedIsZero(amount)).map(([currency, amount]) => [currency, gradedToDecimalString(amount)]))) }))),
  });
}

/**
 * The economy of the board as the C-suite reads it: crossings by stage, flows by pair, each
 * enterprise's position, each credit line's tally credit, the market's open bounties, and the
 * obstructions that keep the books from gluing.
 * @param {{threads: ReadonlyArray<object>}} board
 * @param {object} options
 * @param {string} options.at
 * @param {ReadonlyArray<{id: string, section: string, entity?: string}>} [options.territories]
 * @param {(crossing: object) => ({amount: string, currency: string} | null | undefined)} [options.costOf]
 * @param {(crossing: object) => (ReadonlyArray<object> | undefined)} [options.consumedOf]
 * @param {number} [options.windowDays] the window tally credit reads (30 days)
 */
export function economyOf(board, { at, territories = [], costOf, consumedOf, windowDays = 30 } = {}) {
  const crossings = crossingsOf(board, { territories, costOf, consumedOf });
  const consumption = (list) => sumResources(list.map((crossing) => crossing.resources ?? []));
  const window = windowDays * DAY_MS;
  const byStage = Object.fromEntries(CROSSING_STAGES.map((stage) => [stage, tallyOf(crossings.filter((crossing) => crossing.stage === stage))]));

  const pairs = new Map();
  for (const crossing of crossings) {
    if (crossing.seam === "internal") continue;
    const key = `${partyName(crossing.provider)}\u0000${partyName(crossing.requester)}`;
    (pairs.get(key) ?? pairs.set(key, []).get(key)).push(crossing);
  }
  const flows = [...pairs.values()].map((list) => Object.freeze({
    provider: partyName(list[0].provider),
    requester: partyName(list[0].requester),
    seam: list[0].seam,
    stages: stagesOf(list),
    credit: tallyCredit(tallyRecordOf(list), { now: at, window }),
    consumed: consumption(list),
  })).sort((a, b) => a.provider.localeCompare(b.provider) || a.requester.localeCompare(b.requester));

  const enterprises = territories.map(({ id, entity }) => {
    const provided = crossings.filter((crossing) => crossing.provider.enterprise === id);
    const requested = crossings.filter((crossing) => crossing.requester.enterprise === id && crossing.provider.enterprise !== id);
    return Object.freeze({
      id,
      ...(entity ? { entity } : {}),
      provided: stagesOf(provided.filter((crossing) => crossing.seam !== "internal")),
      requested: stagesOf(requested),
      ownWork: tallyOf(provided.filter((crossing) => crossing.seam === "internal")),
      // What its work consumed, all seams, and the part spent on crossings that lapsed unsettled.
      consumed: consumption(provided),
      sunk: consumption(provided.filter((crossing) => crossing.stage === "lapsed")),
      counterparties: [...new Set([...provided.map((crossing) => partyName(crossing.requester)), ...requested.map((crossing) => partyName(crossing.provider))])].filter((party) => party !== id).sort(),
    });
  });

  const market = board.threads
    .filter((thread) => thread.opening.move === "request" && thread.standing === "open" && thread.offer !== undefined)
    .map((thread) => Object.freeze({ thread: thread.id, offer: money(thread.offer.amount, thread.offer.currency), ageDays: Math.floor(thread.ageDays), ...(thread.home ? { home: thread.home } : {}) }));

  const stale = (time) => time !== undefined && Date.parse(at) - Date.parse(time) > window;
  const obstructions = Object.freeze([
    ...crossings.filter((crossing) => crossing.stage === "claimed" && stale(crossing.deliveredAt)).map((crossing) => ({ kind: "stale-claim", crossing: crossing.id, since: crossing.deliveredAt, owes: partyName(crossing.requester) })),
    ...crossings.filter((crossing) => crossing.stage === "disputed").map((crossing) => ({ kind: "dispute", crossing: crossing.id, since: crossing.rejections.at(-1), owes: partyName(crossing.provider) })),
    ...crossings.filter((crossing) => crossing.stage === "settled" && crossing.value === null && crossing.seam !== "internal").map((crossing) => ({ kind: "unvalued-settlement", crossing: crossing.id, since: crossing.settledAt, owes: partyName(crossing.provider) })),
    ...crossings.filter((crossing) => crossing.resources !== undefined && crossing.value === null && crossing.stage !== "lapsed").map((crossing) => ({ kind: "unpriced-consumption", crossing: crossing.id, since: crossing.deliveredAt ?? crossing.promisedAt, owes: partyName(crossing.provider) })),
    ...crossings.filter((crossing) => crossing.provider.enterprise === undefined && crossing.stage !== "lapsed").map((crossing) => ({ kind: "unseated-provider", crossing: crossing.id, since: crossing.promisedAt, owes: crossing.provider.player })),
  ].map((obstruction) => Object.freeze(obstruction)));

  return Object.freeze({
    kind: "organizing.enterprise.economy",
    at,
    recognition: "A crossing is booked only when settled (accepted by its assayer) and valued by a witnessed cost or the requester's offer; committed work is backlog, claims and disputes are held, and an unwitnessed value is unknown, never zero. Resources are quantities the provider's work witnessed consuming, apart from any price; sunk is what lapsed crossings consumed.",
    crossings: Object.freeze(byStage),
    consumed: Object.freeze({ all: consumption(crossings), sunk: consumption(crossings.filter((crossing) => crossing.stage === "lapsed")) }),
    // Each crossing's tally reading in FOUR, by the knowledge order: potential settled, contested disputed, absurd untold.
    readings: census(crossings.map((crossing) => crossing.reading.tally)),
    netting: nettingOf(crossings),
    flows: Object.freeze(flows),
    enterprises: Object.freeze(enterprises),
    market: Object.freeze(market),
    obstructions,
  });
}
