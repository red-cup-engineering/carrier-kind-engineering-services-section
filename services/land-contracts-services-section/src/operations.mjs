/**
 * The land contract business as an operation family, so its offices act through MetroPlat: pull
 * a market's parcels, find and filter leads by kind and place, record buyers' buy boxes, log
 * contacts, move deals through their stages, and draft agreements and letters. Contacts, deals
 * (orders), buy boxes (parties) and closings (settlements) are the land-contracts enterprise's
 * records in the Group's one enterprise store; offer ranges, the target fee, the caller's share and
 * the quiet period are the enterprise's grey-band settings. Each market's parcel snapshot is a dated
 * file under MetroPlat's data root, refreshed from its county's layer; so is each county's pull of
 * its sale lists. Land the Group buys to keep is recorded as holdings (its purchase, any balance
 * owed on terms, installments, holding costs and income), paid from the land fund that a share of
 * every closing's net fee is reserved to.
 */
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { callQueue, contactActivity, currentOrders, enterpriseOf, enterpriseStore, fillTemplate, funnel, groupBy, settingValues } from "@red-cup-engineering/organizing/enterprise";
import { queryFeatures } from "@red-cup-engineering/arcgis-rest-services-section/client";
import { exportReport } from "@red-cup-engineering/ssrs-report-services-section/client";
import { MARKETS, PROPERTY_KINDS, buyerRows, marketOf, normalizeParcel, parcelLocation, propertyKind, pullMarket } from "./leads.mjs";
import { CONTACT_OUTCOMES, DEAD_REASONS, DEAL_STAGES, LAND_ENTERPRISE, LAND_PROCEDURE, STAGES, findParcels, fitsBuyBox, interestReading, parcelRow } from "./pipeline.mjs";
import { COUNTY_SALES, pullSaleLists, saleParcel } from "./sales.mjs";

const SECTION_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATES = join(SECTION_ROOT, "content", "text", "documents", "templates");

const KIND = "land-contracts";
const YEAR_MS = 365 * 86_400_000;
/** The land enterprise's constitution, from its agency record in this section. */
// Read the declared settings only when an operation needs them; discovery does no registry IO.
const enterpriseForSettings = () => enterpriseOf(JSON.parse(readFileSync(join(SECTION_ROOT, "lib", "agency", "enterprises", `${LAND_ENTERPRISE}.json`), "utf8")));
const FOR = new Set(Object.entries(CONTACT_OUTCOMES).filter(([, side]) => side === "for").map(([name]) => name));

const parcelsDir = (binding) => join(binding.dataRoot, "data", "state", KIND, "parcels");
const saleListsDir = (binding, county) => join(binding.dataRoot, "data", "state", KIND, "sale-lists", county);
/** The settlement kinds that record land the Group keeps, apart from the fees it earns. */
const HOLDING_KINDS = Object.freeze(["acquisition", "installment", "holding-cost", "holding-income"]);
const LAND_FUND = "land";
const sum = (values) => values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
const round2 = (value) => Math.round(value * 100) / 100;
const snapshotDir = (binding, market) => join(parcelsDir(binding), market);

/** A county's owner line as a person would write it: "FISHER JANE E" reads "Jane E Fisher"; companies and trusts keep their order. */
function readableName(owner) {
  const title = (word) => word.charAt(0) + word.slice(1).toLowerCase();
  const cleaned = owner.replace(/\s+(TRUSTEE|TRUSTEES)?\s*OF$/i, "").trim();
  if (/\b(LLC|INC|CORP|TRUST|ESTATE|CHURCH|COMPANY|ASSOCIATION|BANK|PROPERTIES|HOLDINGS)\b|&|\//.test(cleaned) || !/^[A-Z' -]+$/.test(cleaned)) return cleaned.split(/\s+/).map(title).join(" ");
  const [last, ...rest] = cleaned.split(/\s+/);
  return [...rest, last].map(title).join(" ");
}

const readDir = (dir) => {
  try { return readdirSync(dir); } catch (error) { if (error?.code === "ENOENT") return []; throw error; }
};
// A release tree that ships no document templates (content/ is not archived on every host) still
// loads this module and lists no templates; importing it never fails on a missing directory.
const TEMPLATE_NAMES = readDir(TEMPLATES).filter((name) => name.endsWith(".md")).map((name) => name.slice(0, -3)).sort();

/**
 * The latest snapshot of one market. A snapshot taken before markets existed (Duluth's
 * `<date>.json` beside the market directories, or under the business's old `duluth-land` state
 * directory) moves into Duluth's directory the first time it is read.
 */
function latestSnapshot(binding, market) {
  if (market === "duluth") {
    for (const legacy of [parcelsDir(binding), join(binding.dataRoot, "data", "state", "duluth-land", "parcels")]) {
      for (const name of readDir(legacy).filter((n) => n.endsWith(".json"))) {
        mkdirSync(snapshotDir(binding, "duluth"), { recursive: true });
        renameSync(join(legacy, name), join(snapshotDir(binding, "duluth"), name));
      }
    }
  }
  const names = readDir(snapshotDir(binding, market)).filter((name) => name.endsWith(".json")).sort();
  if (names.length === 0) return null;
  const snapshot = JSON.parse(readFileSync(join(snapshotDir(binding, market), names.at(-1)), "utf8"));
  const found = marketOf(market);
  const parcels = (snapshot.parcels ?? [...(snapshot.lots ?? []), ...(snapshot.sites ?? [])]).map((raw) => normalizeParcel(raw, found));
  return { market, pulledAt: snapshot.pulledAt, parcels };
}

/** The markets with a snapshot, or the one named. */
function snapshotsOf(binding, market) {
  const names = market ? [market] : Object.keys(MARKETS);
  const snapshots = names.map((name) => latestSnapshot(binding, name)).filter(Boolean);
  if (snapshots.length === 0) throw new Error(market ? `no parcel snapshot for ${market} yet: run land-parcels-pull with market "${market}"` : "no parcel snapshot yet: run land-parcels-pull");
  return snapshots;
}

/** Current buy boxes: the latest record per buyer, retired buyers dropped. */
function currentBuyBoxes(store) {
  const byBuyer = new Map();
  for (const record of store.read("party", { enterprise: LAND_ENTERPRISE, role: "buyer" })) {
    const prior = byBuyer.get(record.buyer);
    if (!prior || String(record.recordedAt) > String(prior.recordedAt)) byBuyer.set(record.buyer, record);
  }
  return [...byBuyer.values()].filter((box) => !box.retired);
}

const ownerContacts = (store) => store.read("contact", { enterprise: LAND_ENTERPRISE, role: "owner" });
const dealRecords = (store) => store.read("order", { enterprise: LAND_ENTERPRISE });
const settingsOf = (store) => settingValues(enterpriseForSettings(), store.read("setting", { enterprise: LAND_ENTERPRISE }));

function rowsOf(store, snapshots) {
  const buyers = currentBuyBoxes(store);
  const settings = settingsOf(store);
  const contacts = groupBy(ownerContacts(store), "parcel");
  const deals = groupBy(dealRecords(store), "parcel");
  return snapshots.flatMap((snapshot) => snapshot.parcels.map((parcel) => parcelRow(parcel, {
    buyers, settings, contacts: contacts.get(parcel.parcel) ?? [], deals: deals.get(parcel.parcel) ?? [],
  })));
}

/** Each deal's current state (the enterprise layer's order reading) with when it was contracted. */
function dealsOf(store) {
  return currentOrders(dealRecords(store), { key: "parcel" }).map((deal) => ({ ...deal, contractedAt: deal.history.find((record) => record.stage === "contracted")?.recordedAt ?? null }));
}

/**
 * The account a deal is the caller's under the joint-venture caller agreement: whoever first
 * logged the owner as interested (or set the offer call) before the Group made its offer.
 */
function originatorOf(store, deal) {
  const offeredAt = deal.history.find((record) => record.stage === "offered")?.recordedAt ?? deal.history.find((record) => record.stage === "contracted")?.recordedAt;
  const told = ownerContacts(store).filter((c) => c.parcel === deal.parcel && FOR.has(c.outcome) && c.by && (!offeredAt || String(c.recordedAt) <= String(offeredAt)))
    .sort((a, b) => String(a.recordedAt).localeCompare(String(b.recordedAt)));
  return told[0]?.by ?? null;
}

/** A closed deal's settlement: the fee received, the seller's proceeds as the user's value, and the originating caller's share. */
function settlementOf(store, deal, input) {
  const fee = Number.isFinite(input.assignmentFee) ? input.assignmentFee : deal.fee;
  if (!Number.isFinite(fee)) throw new Error("a closed deal names its fee (assignmentPrice and price, or assignmentFee) so its settlement can be recorded");
  const settings = settingsOf(store);
  const share = Number.isFinite(deal.callerShare) ? deal.callerShare : settings["caller-share"];
  const originator = originatorOf(store, deal);
  const callerAmount = originator ? round2(fee * share) : 0;
  const reserved = round2((fee - callerAmount) * (settings["land-fund-share"] ?? 0));
  return {
    enterprise: LAND_ENTERPRISE,
    order: deal.parcel,
    date: input.closingDate ?? new Date().toISOString().slice(0, 10),
    received: fee,
    depositReturned: Number.isFinite(deal.earnestMoney) ? deal.earnestMoney : 0,
    closingAgent: deal.closingAgent ?? null,
    parties: [deal.seller, deal.buyer, deal.closingAgent].filter(Boolean),
    userValue: Number.isFinite(deal.price) && deal.seller ? [{ party: deal.seller, amount: deal.price, source: `purchase agreement price paid at closing by ${deal.closingAgent ?? "the closing agent"}` }] : [],
    shares: originator ? [{ party: originator, office: "land-caller", share, amount: callerAmount, basis: "joint-venture caller agreement: originating caller's share of the net fee" }] : [],
    reserves: reserved > 0 ? [{ fund: LAND_FUND, amount: reserved, basis: "land-fund-share of the Group's net fee, for land the Group keeps and its taxes" }] : [],
    witness: input.notes ?? null,
  };
}

/** The latest pull of a county's sale lists, or null. */
function latestSaleLists(binding, county) {
  const names = readDir(saleListsDir(binding, county)).filter((name) => name.endsWith(".json")).sort();
  return names.length ? JSON.parse(readFileSync(join(saleListsDir(binding, county), names.at(-1)), "utf8")) : null;
}

/**
 * The land the Group keeps, parcel by parcel, and its land fund: what each parcel cost, what is
 * still owed on terms and when the next installment falls, what holding it has cost and earned;
 * and the fund's reserves from closings against what has been paid from it.
 */
function holdingsOf(store) {
  const settlements = store.read("settlement", { enterprise: LAND_ENTERPRISE });
  const held = settlements.filter((record) => HOLDING_KINDS.includes(record.kind));
  const byParcel = new Map();
  for (const record of held) byParcel.set(record.order, [...(byParcel.get(record.order) ?? []), record]);
  const grouped = (records) => Object.fromEntries([...new Set(records.map((r) => r.what ?? "other"))].map((what) => [what, round2(sum(records.filter((r) => (r.what ?? "other") === what).map((r) => r.amount)))]));
  const holdings = [...byParcel].map(([parcel, records]) => {
    const acquisition = records.find((r) => r.kind === "acquisition") ?? null;
    const installments = records.filter((r) => r.kind === "installment").sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const costs = records.filter((r) => r.kind === "holding-cost");
    const income = records.filter((r) => r.kind === "holding-income");
    const financed = acquisition?.financed ?? 0;
    const balance = round2(financed - sum(installments.map((r) => r.principal)));
    const years = acquisition?.years;
    const next = acquisition && balance > 0 && years ? {
      due: `${Number(String(acquisition.date).slice(0, 4)) + installments.length + 1}${String(acquisition.date).slice(4)}`,
      principal: round2(Math.min(balance, financed / years)),
      interest: round2(balance * (acquisition.rate ?? 0)),
    } : null;
    return Object.freeze({
      parcel,
      market: acquisition?.market ?? null,
      acres: acquisition?.acres ?? null,
      acquired: acquisition?.date ?? null,
      price: acquisition?.price ?? null,
      fees: acquisition?.fees ?? 0,
      financed,
      balance,
      nextInstallment: next ? { ...next, amount: round2(next.principal + next.interest) } : null,
      interestPaid: round2(sum(installments.map((r) => r.interest))),
      costs: grouped(costs),
      income: grouped(income),
      net: round2(sum(income.map((r) => r.amount)) - sum(costs.map((r) => r.amount)) - sum(installments.map((r) => r.interest))),
    });
  });
  const reserved = round2(sum(settlements.flatMap((s) => (s.reserves ?? []).filter((r) => r.fund === LAND_FUND).map((r) => r.amount))));
  const drawnOf = (r) => (r.kind === "acquisition" ? sum([r.paid, r.fees]) : r.kind === "installment" ? sum([r.principal, r.interest]) : r.kind === "holding-cost" ? r.amount : 0);
  const drawn = round2(sum(held.filter((r) => r.fund === LAND_FUND && r.kind !== "holding-income").map(drawnOf)));
  const returned = round2(sum(held.filter((r) => r.fund === LAND_FUND && r.kind === "holding-income").map((r) => r.amount)));
  const due = holdings.filter((h) => h.nextInstallment).map((h) => ({ parcel: h.parcel, ...h.nextInstallment })).sort((a, b) => a.due.localeCompare(b.due));
  return Object.freeze({ fund: { reserved, drawn, returned, balance: round2(reserved - drawn + returned) }, holdings, installmentsDue: due, acres: round2(sum(holdings.map((h) => h.acres))) });
}

const object = (id, properties, required = []) => schemaFrom({ $id: `land-contracts/${id}`, type: "object", properties, required, additionalProperties: false });
const text = { type: "string" };
const number = { type: "number" };
const texts = { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] };
const market = { enum: Object.keys(MARKETS) };
const kinds = { anyOf: [{ enum: PROPERTY_KINDS }, { type: "array", items: { enum: PROPERTY_KINDS } }] };

const findSchema = object("find", {
  market, kinds,
  minAcres: number, maxAcres: number, minStandardLots: number, maxStandardLots: number,
  minLandEstimate: number, maxLandEstimate: number, minScore: number,
  classes: texts, ownerLives: texts, ownerKinds: texts, delinquent: { type: "boolean" },
  forfeitBy: number, soldBefore: number, place: text, buyer: text, matchedOnly: { type: "boolean" },
  interest: texts, stages: texts, sort: { enum: ["score", "fit", "value", "size"] },
  offset: { type: "integer", minimum: 0 }, limit: { type: "integer", minimum: 1, maximum: 1000 },
});
const buyBoxSchema = object("buy-box", {
  buyer: text, company: text, contact: text, phone: text, email: text,
  markets: { type: "array", items: market }, kinds: { type: "array", items: { enum: PROPERTY_KINDS } },
  areas: texts, minAcres: number, maxAcres: number, minStandardLots: number, classes: texts,
  maxPrice: number, utilitiesRequired: { type: "boolean" }, closeDays: number, cash: { type: "boolean" },
  sendVia: text, notes: text, retired: { type: "boolean" },
}, ["buyer"]);
const contactSchema = object("contact", {
  party: { enum: ["owner", "buyer"] }, parcel: text, buyer: text, name: text, phone: text,
  outcome: { enum: Object.keys(CONTACT_OUTCOMES) }, askingPrice: number, callbackAt: text, notes: text, by: text,
}, ["party", "outcome"]);
const dealSchema = object("deal", {
  parcel: text, market, stage: { enum: DEAL_STAGES }, deadReason: { enum: DEAD_REASONS }, seller: text, buyer: text, price: number,
  earnestMoney: number, assignmentPrice: number, assignmentFee: number, assignmentDeposit: number, closingDate: text,
  closingAgent: text, representedBy: text, dueDiligenceDays: number, callerShare: number, notes: text, by: text,
}, ["parcel", "stage"]);
const leadSchema = object("lead", { parcel: text, market }, ["parcel"]);
const documentSchema = object("document", {
  parcel: text, parcels: { type: "array", items: text, maxItems: 500 }, market,
  template: { enum: TEMPLATE_NAMES }, values: { type: "object" },
}, ["template"]);
const queueSchema = object("call-queue", { market, kinds, by: text, limit: { type: "integer", minimum: 1, maximum: 200 }, quietDays: number, includeUnmatched: { type: "boolean" } });
const activitySchema = object("activity", { since: text, by: text });
const pullSchema = object("pull", { market });
const county = { enum: Object.keys(COUNTY_SALES) };
const saleListsSchema = object("sale-lists", {
  county, market: { anyOf: [market, { type: "array", items: market }] }, way: { enum: ["auction", "over the counter"] },
  buyer: text, matchedOnly: { type: "boolean" }, includeSold: { type: "boolean" }, termsOnly: { type: "boolean" },
  minAcres: number, maxAcres: number, maxPrice: number, place: text, sort: { enum: ["price", "acres", "price-per-acre"] },
  offset: { type: "integer", minimum: 0 }, limit: { type: "integer", minimum: 1, maximum: 1000 },
});
const holdingSchema = object("holding", {
  parcel: text, kind: { enum: HOLDING_KINDS }, date: text, market, acres: number,
  price: number, paid: number, financed: number, fees: number, years: number, rate: number, seller: text, representedBy: text,
  principal: number, interest: number, amount: number, what: text, fromFund: { type: "boolean" }, notes: text,
}, ["parcel", "kind"]);
const emptySchema = object("empty", { stages: texts });

/**
 * @param {{dataRoot: string}} binding MetroPlat's binding; records land under its data root.
 * @param {{fetch?: typeof fetch}} [options]
 */
export function landContractOperations(binding, { fetch: fetchImpl, store = enterpriseStore(binding), contractingParty = () => undefined } = {}) {
  const findRaw = (parcel, market) => {
    for (const snapshot of snapshotsOf(binding, market)) {
      const found = snapshot.parcels.find((p) => p.parcel === parcel);
      if (found) return found;
    }
    return undefined;
  };

  const ownerOf = (parcel) => {
    try { return findRaw(parcel)?.owner; } catch { return undefined; }
  };

  function draft(template, parcel, values, deals) {
    const history = parcel ? deals.filter((d) => d.parcel === parcel).sort((a, b) => String(a.recordedAt).localeCompare(String(b.recordedAt))) : [];
    const deal = Object.assign({}, ...history);
    const contracted = history.find((d) => d.stage === "contracted");
    if (contracted && deal.contractDate === undefined) deal.contractDate = String(contracted.recordedAt).slice(0, 10);
    const county = parcel ? findRaw(parcel, values.market) : undefined;
    const row = county ? parcelRow(county, { buyers: currentBuyBoxes(store), settings: settingsOf(store) }) : {};
    const merged = {
      date: new Date().toISOString().slice(0, 10), parcel, buyerSigner: contractingParty(LAND_ENTERPRISE),
      seller: county?.owner, sellerName: county ? readableName(county.owner) : undefined, legal: county?.legal, location: county ? parcelLocation(county) : undefined,
      place: county ? county.place || MARKETS[county.market]?.name : undefined, county: county?.county, acres: row.acres, kind: row.kind, mailing: row.mailing,
      offer: row.openOffer, maxOffer: row.maxOffer, estimate: row.estimate,
      ...deal, ...values,
    };
    if (merged.assignmentFee === undefined && Number.isFinite(merged.assignmentPrice) && Number.isFinite(merged.price)) merged.assignmentFee = merged.assignmentPrice - merged.price;
    const body = fillTemplate(readFileSync(join(TEMPLATES, `${template}.md`), "utf8").replace(/^---[\s\S]*?---\n/, ""), merged);
    return Object.freeze({ template, parcel: parcel ?? null, values: merged, markdown: body });
  }

  return Object.freeze([
    operation({
      verb: "land-markets",
      summary: "The markets the land business works: where each one's parcels come from, when it was last pulled, and its parcels by kind.",
      domain: object("markets", {}),
      reads: ["land-contracts/parcels"],
      run: () => Object.freeze(Object.keys(MARKETS).map((id) => {
        const found = marketOf(id);
        const snapshot = latestSnapshot(binding, id);
        const byKind = Object.fromEntries(PROPERTY_KINDS.map((kind) => [kind, 0]));
        for (const parcel of snapshot?.parcels ?? []) { const kind = propertyKind(parcel); if (kind) byKind[kind] += 1; }
        return { market: id, name: found.name, county: found.county, source: found.source, pulledAt: snapshot?.pulledAt ?? null, parcels: snapshot?.parcels.length ?? 0, byKind };
      })),
    }),
    operation({
      verb: "land-parcels-pull",
      summary: "Pull one market's privately owned vacant land, underbuilt sites, houses their owners do not live in, and forfeited parcels into a dated snapshot.",
      description: "Reads the market's county layer (St. Louis County's own, refreshed weekly, or Minnesota's compiled layer, refreshed quarterly) and writes the snapshot every land verb reads for that market. Defaults to Duluth.",
      domain: pullSchema,
      reads: ["st-louis-county/tax-parcels", "minnesota/parcels"],
      writes: ["land-contracts/parcels"],
      effects: { class: "external", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "unmeasured" },
      run: async ({ market: id = "duluth" } = {}) => {
        const { market: found, parcels } = await pullMarket(id, { queryFeatures, fetch: fetchImpl });
        const pulledAt = new Date().toISOString();
        mkdirSync(snapshotDir(binding, id), { recursive: true });
        const path = join(snapshotDir(binding, id), `${pulledAt.slice(0, 10)}.json`);
        writeFileSync(path, JSON.stringify({ market: id, layer: found.layer, pulledAt, parcels }));
        const byKind = Object.fromEntries(PROPERTY_KINDS.map((kind) => [kind, parcels.filter((p) => propertyKind(p) === kind).length]));
        return Object.freeze({ market: id, path, pulledAt, parcels: parcels.length, byKind });
      },
    }),
    operation({
      verb: "land-parcels-find",
      summary: "Find parcels by market, kind, size, class, owner, taxes, value, place, matched buyer, interest and deal stage.",
      description: "Rows carry the seller score and reasons, the matched buyers, the offer range for the parcel's kind (capped by the best matched buyer's price less the target fee), the owner's interest reading from logged contacts, and the deal stage. Without a market, every pulled market is searched.",
      domain: findSchema,
      reads: ["land-contracts/parcels", "land-contracts/buy-box", "land-contracts/contact", "land-contracts/deal"],
      run: ({ market: id, ...input } = {}) => {
        const snapshots = snapshotsOf(binding, id);
        return Object.freeze({ pulledAt: Object.fromEntries(snapshots.map((s) => [s.market, s.pulledAt])), ...findParcels(rowsOf(store, snapshots), input) });
      },
    }),
    operation({
      verb: "land-lead",
      summary: "Read one parcel as a lead: its row, every contact with its owner, its deal history and its matched buyers.",
      domain: leadSchema,
      reads: ["land-contracts/parcels", "land-contracts/buy-box", "land-contracts/contact", "land-contracts/deal"],
      run: ({ parcel, market: id }) => {
        const raw = findRaw(parcel, id);
        if (!raw) throw new Error(`parcel ${parcel} is not in any pulled market`);
        const contacts = ownerContacts(store).filter((c) => c.parcel === parcel);
        const deals = dealRecords(store).filter((d) => d.parcel === parcel);
        const buyers = currentBuyBoxes(store);
        const row = parcelRow(raw, { buyers, contacts, deals, settings: settingsOf(store) });
        return Object.freeze({ ...row, county: raw, contactHistory: contacts, dealHistory: deals, matchedBuyBoxes: buyers.filter((b) => row.buyers.includes(b.buyer)) });
      },
    }),
    operation({
      verb: "land-buy-box-record",
      summary: "Record or update a buyer's buy box: markets, kinds, areas, size and class, top price, how fast, and how to send them a deal.",
      domain: buyBoxSchema,
      writes: ["land-contracts/buy-box"],
      run: (input, _args, context) => store.party({ ...input, enterprise: LAND_ENTERPRISE, role: "buyer", party: input.buyer, by: context?.invocation?.subject }),
    }),
    operation({
      verb: "land-buyers",
      summary: "List buyers: recorded buy boxes with their contact history and matched parcel counts, and candidate builders from the pulled markets not yet called.",
      domain: object("buyers", { market }),
      reads: ["land-contracts/parcels", "land-contracts/buy-box", "land-contracts/contact"],
      run: ({ market: id } = {}) => {
        let snapshots = [];
        try { snapshots = snapshotsOf(binding, id); } catch { snapshots = []; }
        const boxes = currentBuyBoxes(store);
        const contacts = groupBy(store.read("contact", { enterprise: LAND_ENTERPRISE, role: "buyer" }), "buyer");
        const rows = rowsOf(store, snapshots);
        const recorded = new Set(boxes.map((box) => box.buyer.toUpperCase()));
        return Object.freeze({
          buyBoxes: boxes.map((box) => ({ ...box, interest: interestReading(contacts.get(box.buyer) ?? []), matchedParcels: rows.filter((r) => r.buyers.includes(box.buyer)).length })),
          candidates: snapshots.flatMap((snapshot) => buyerRows(snapshot.parcels)).filter((c) => !recorded.has(c.owner.toUpperCase())),
        });
      },
    }),
    operation({
      verb: "land-contact-log",
      summary: "Log one call, text, letter or visit with an owner or buyer: outcome, asking price, callback time and notes.",
      description: "Interested, callback and offer-call-set tell for the party's interest; not interested and remove tell against; the rest tell nothing.",
      domain: contactSchema,
      writes: ["land-contracts/contact"],
      run: (input, _args, context) => {
        if (input.party === "owner" && !input.parcel) throw new Error("an owner contact names its parcel");
        if (input.party === "buyer" && !input.buyer) throw new Error("a buyer contact names its buyer");
        const party = input.party === "owner" ? ownerOf(input.parcel) ?? input.name ?? input.parcel : input.buyer;
        return store.contact({ ...input, enterprise: LAND_ENTERPRISE, role: input.party, party, by: context?.invocation?.subject }, CONTACT_OUTCOMES);
      },
    }),
    operation({
      verb: "land-deal-record",
      summary: "Move a deal to a stage with its prices, buyer, dates, closing agent and representation; a dead deal names its reason.",
      domain: dealSchema,
      writes: ["land-contracts/deal"],
      run: (input, _args, context) => {
        if (input.stage === "dead" && !input.deadReason) throw new Error(`a dead deal names its reason: ${DEAD_REASONS.join(", ")}`);
        const recorded = store.order({ ...input, enterprise: LAND_ENTERPRISE, order: input.parcel, by: context?.invocation?.subject });
        if (input.stage === "contracted" && Number.isFinite(input.earnestMoney) && input.earnestMoney > 0) {
          const deposit = store.settlement({ enterprise: LAND_ENTERPRISE, kind: "deposit", order: input.parcel, date: new Date().toISOString().slice(0, 10), deposit: input.earnestMoney, closingAgent: input.closingAgent });
          return Object.freeze({ ...recorded, deposit });
        }
        if (input.stage !== "closed") return recorded;
        const deal = dealsOf(store).find((d) => d.parcel === input.parcel);
        const settlement = store.settlement(settlementOf(store, deal, input));
        return Object.freeze({ ...recorded, settlement });
      },
    }),
    operation({
      verb: "land-pipeline",
      summary: "Every deal at its current stage with prices and expected fee, the funnel, the stage procedures, and the contracts signed in the last twelve months against the licensing presumption.",
      description: "Minnesota presumes a person who engages as principal in five or more transactions in twelve months is in the business of selling real estate unless a licensee represents them (Minn. Stat. 82.55, subd. 19(g)); `licensing` counts contracts and the Group's own purchases in the window, and those naming no representative.",
      domain: emptySchema,
      reads: ["land-contracts/deal"],
      run: ({ stages } = {}) => {
        const wanted = stages === undefined ? null : new Set(Array.isArray(stages) ? stages : String(stages).split(","));
        const all = dealsOf(store);
        const deals = all.filter((deal) => !wanted || wanted.has(deal.stage)).map(({ history, ...deal }) => ({ ...deal, stages: history.length }));
        const byStage = Object.fromEntries(DEAL_STAGES.map((stage) => [stage, all.filter((d) => d.stage === stage).length]));
        const window = all.filter((deal) => deal.contractedAt && Date.now() - Date.parse(deal.contractedAt) <= YEAR_MS);
        const bought = store.read("settlement", { enterprise: LAND_ENTERPRISE, kind: "acquisition" }).filter((a) => Date.now() - Date.parse(a.date ?? a.recordedAt) <= YEAR_MS);
        return Object.freeze({
          byStage,
          expectedFees: all.filter((d) => !["dead", "closed"].includes(d.stage) && d.fee !== null).reduce((sum, d) => sum + d.fee, 0),
          licensing: { contractsLast12Months: window.length, acquisitionsLast12Months: bought.length, transactionsLast12Months: window.length + bought.length, unrepresented: window.filter((d) => !d.representedBy).length + bought.filter((a) => !a.representedBy).length, presumptionAt: 5 },
          funnel: funnel(all.map((deal) => deal.history), LAND_PROCEDURE),
          procedure: STAGES,
          settlements: store.read("settlement", { enterprise: LAND_ENTERPRISE }),
          deals,
        });
      },
    }),
    operation({
      verb: "land-call-queue",
      summary: "The next calls to make: callbacks now due first, then matched owners not reached lately, one row per owner with every parcel they hold.",
      description: "Owners who declined or asked to be removed drop out. Parcels matched to a buyer come before unmatched ones (which appear only with includeUnmatched). Narrow by market and kind.",
      domain: queueSchema,
      reads: ["land-contracts/parcels", "land-contracts/buy-box", "land-contracts/contact", "land-contracts/deal"],
      run: ({ market: id, kinds: wantedKinds, by, limit = 40, quietDays, includeUnmatched = false } = {}) => {
        const snapshots = snapshotsOf(binding, id);
        const kindList = wantedKinds === undefined ? null : new Set(Array.isArray(wantedKinds) ? wantedKinds : [wantedKinds]);
        const rows = rowsOf(store, snapshots)
          .filter((row) => row.kind !== "forfeited" && (!kindList || kindList.has(row.kind)))
          .map((row) => ({ ...row, key: row.parcel, party: row.owner }));
        const read = callQueue(rows, groupBy(ownerContacts(store), "parcel"), {
          by, limit, includeUnmatched, outcomes: CONTACT_OUTCOMES,
          quietDays: quietDays ?? settingsOf(store)["quiet-days"],
          matched: (row) => row.buyers.length > 0,
        });
        return Object.freeze({ ...read, queue: read.queue.map(({ otherKeys, key: _key, ...row }) => ({ ...row, otherParcels: otherKeys })) });
      },
    }),
    operation({
      verb: "land-activity",
      summary: "Calling and deal activity: dials, conversations and interested owners by caller and by day, buy boxes recorded, deals by stage, the funnel and fees.",
      domain: activitySchema,
      reads: ["land-contracts/contact", "land-contracts/buy-box", "land-contracts/deal"],
      run: ({ since, by } = {}) => {
        const from = since ? Date.parse(since) : 0;
        const contacts = store.read("contact", { enterprise: LAND_ENTERPRISE }).filter((c) => Date.parse(c.recordedAt) >= from && (!by || c.by === by));
        const deals = dealsOf(store);
        return Object.freeze({
          ...contactActivity(contacts, { outcomes: CONTACT_OUTCOMES }),
          buyBoxes: currentBuyBoxes(store).length,
          deals: Object.fromEntries(DEAL_STAGES.map((stage) => [stage, deals.filter((d) => d.stage === stage).length])),
          funnel: funnel(deals.map((deal) => deal.history), LAND_PROCEDURE),
          closedFees: store.read("settlement", { enterprise: LAND_ENTERPRISE }).filter((s) => (s.kind ?? "settlement") === "settlement").reduce((sum, settlement) => sum + (settlement.received ?? 0), 0),
          settings: settingsOf(store),
        });
      },
    }),
    operation({
      verb: "land-sale-lists-pull",
      summary: "Pull a county's current forfeited-land sale lists (auctions and the over-the-counter available lists) into a dated snapshot.",
      description: "Reads the county's sales page for every list it links, exports each as CSV, and records each tract's parcels, place, acres, price, whether it is sold, and whether the county takes terms. St. Louis County by default.",
      domain: object("sale-lists-pull", { county }),
      reads: ["st-louis-county/tax-forfeited-land-sales"],
      writes: ["land-contracts/sale-lists"],
      effects: { class: "external", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "unmeasured" },
      run: async ({ county: id = "st-louis" } = {}) => {
        const pulled = await pullSaleLists(id, { exportReport, fetch: fetchImpl });
        const pulledAt = new Date().toISOString();
        mkdirSync(saleListsDir(binding, id), { recursive: true });
        const path = join(saleListsDir(binding, id), `${pulledAt.slice(0, 10)}.json`);
        writeFileSync(path, JSON.stringify({ ...pulled, pulledAt }));
        return Object.freeze({ county: id, path, pulledAt, lists: pulled.lists.map((list) => ({ list: list.name, saleDate: list.saleDate, way: list.way, tracts: list.rows.length, unsold: list.rows.filter((row) => !row.sold).length })) });
      },
    }),
    operation({
      verb: "land-sale-lists",
      summary: "Forfeited land a county is selling now, by market, way of sale, size and price, with the buyers whose buy boxes each tract fits and what buying it on the county's terms takes.",
      description: "Reads the latest land-sale-lists-pull. Unsold tracts only unless includeSold. A tract fits a buy box as forfeited land in its market and place, at its listed price; the Group's own box (buyer \"561 Group\") finds the land it keeps.",
      domain: saleListsSchema,
      reads: ["land-contracts/sale-lists", "land-contracts/buy-box"],
      run: ({ county: id = "st-louis", market: markets, way, buyer, matchedOnly = false, includeSold = false, termsOnly = false, minAcres, maxAcres, maxPrice, place, sort = "price-per-acre", offset = 0, limit = 50 } = {}) => {
        const pulled = latestSaleLists(binding, id);
        if (!pulled) throw new Error(`no sale lists for ${id} yet: run land-sale-lists-pull with county "${id}"`);
        const boxes = currentBuyBoxes(store);
        const settings = settingsOf(store);
        const wantedMarkets = markets === undefined ? null : new Set(Array.isArray(markets) ? markets : [markets]);
        const wantedPlace = place ? String(place).toUpperCase() : null;
        const rows = pulled.lists.flatMap((list) => list.rows).map((row) => {
          const parcel = saleParcel(row);
          return { ...row, pricePerAcre: row.acres > 0 ? Math.round(row.price / row.acres) : null, buyers: boxes.filter((box) => fitsBuyBox(parcel, box, settings)).map((box) => box.buyer) };
        }).filter((row) => (includeSold || !row.sold)
          && (!wantedMarkets || wantedMarkets.has(row.market))
          && (!way || row.way === way)
          && (!termsOnly || row.terms)
          && (minAcres === undefined || row.acres >= minAcres)
          && (maxAcres === undefined || row.acres <= maxAcres)
          && (maxPrice === undefined || row.price <= maxPrice)
          && (!wantedPlace || [row.place, row.comments].join(" ").toUpperCase().includes(wantedPlace))
          && (!buyer || row.buyers.includes(buyer))
          && (!matchedOnly || row.buyers.length > 0));
        const sorts = {
          price: (a, b) => a.price - b.price,
          acres: (a, b) => b.acres - a.acres,
          "price-per-acre": (a, b) => (a.pricePerAcre ?? Infinity) - (b.pricePerAcre ?? Infinity),
        };
        rows.sort(sorts[sort] ?? sorts["price-per-acre"]);
        return Object.freeze({ county: id, pulledAt: pulled.pulledAt, lists: pulled.lists.map((list) => ({ list: list.name, saleDate: list.saleDate, way: list.way })), total: rows.length, offset, rows: rows.slice(offset, offset + limit) });
      },
    }),
    operation({
      verb: "land-holding-record",
      summary: "Record land the Group keeps: its purchase (price, paid, balance on terms, fees), an installment, a holding cost such as property tax, or income such as a forest-incentive payment.",
      description: "Kinds: acquisition (price, paid; financed defaults to price less paid; years and rate for a terms sale), installment (principal, interest), holding-cost and holding-income (amount, what). fromFund marks money paid from or into the land fund. Each is a settlement of the land enterprise, so ledger-settlement-proposal posts it.",
      domain: holdingSchema,
      writes: ["land-contracts/holdings"],
      run: (input, _args, context) => {
        const date = input.date ?? new Date().toISOString().slice(0, 10);
        const base = { enterprise: LAND_ENTERPRISE, kind: input.kind, order: input.parcel, date, fund: input.fromFund ? LAND_FUND : undefined, witness: input.notes, by: context?.invocation?.subject };
        if (input.kind === "acquisition") {
          if (!Number.isFinite(input.price) || !Number.isFinite(input.paid)) throw new Error("an acquisition names its price and what was paid at closing");
          const financed = Number.isFinite(input.financed) ? input.financed : round2(input.price - input.paid);
          return store.settlement({ ...base, price: input.price, paid: input.paid, financed, fees: input.fees ?? 0, years: input.years, rate: input.rate, market: input.market, acres: input.acres, seller: input.seller, representedBy: input.representedBy });
        }
        if (input.kind === "installment") {
          if (!Number.isFinite(input.principal)) throw new Error("an installment names its principal (and interest)");
          return store.settlement({ ...base, principal: input.principal, interest: input.interest ?? 0 });
        }
        if (!Number.isFinite(input.amount) || !input.what) throw new Error(`a ${input.kind} names its amount and what it is (property tax, forest plan, SFIA payment, timber)`);
        return store.settlement({ ...base, amount: input.amount, what: input.what });
      },
    }),
    operation({
      verb: "land-holdings",
      summary: "The land the Group keeps: each parcel's cost, balance owed on terms, next installment, holding costs and income; the installments coming due; and the land fund's reserves, draws and balance.",
      domain: object("holdings", {}),
      reads: ["land-contracts/holdings", "land-contracts/deal"],
      run: () => holdingsOf(store),
    }),
    operation({
      verb: "land-document-draft",
      summary: "Draft an agreement, disclosure, letter or deal sheet with a parcel's and its deal's values filled in; with several parcels, one document each (a mailing).",
      description: `Templates: ${TEMPLATE_NAMES.join(", ")}. Values come from the parcel's latest deal record, the parcel's snapshot row, and any values given; blanks stay for hand entry.`,
      domain: documentSchema,
      reads: ["land-contracts/deal", "land-contracts/parcels"],
      run: ({ parcel, parcels, market: id, template, values = {} }) => {
        const deals = dealRecords(store);
        const scoped = id ? { ...values, market: id } : values;
        if (parcels?.length) return Object.freeze({ template, documents: parcels.map((p) => draft(template, p, scoped, deals)) });
        return draft(template, parcel, scoped, deals);
      },
    }),
  ]);
}
