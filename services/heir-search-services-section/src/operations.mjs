/**
 * Heir search as an operation family: pull buyer-side leads (federal funders, nonprofits) from
 * public data, read Duluth's estate-owned land leads as heir search cases, take in an order and
 * price it, log contact with buyers, produce the report deliverable, and draft the engagement
 * letter or caller agreement. Records are semantic record journal rows under MetroPlat's data
 * root, the same shape the Duluth land business uses.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { contactOutcomes, currentOrders, enterpriseOf, enterpriseStore, fillTemplate, procedure, settingValues } from "@red-cup-engineering/organizing/enterprise";
import { searchAwardsAll } from "@red-cup-engineering/usaspending-services-section/client";
import { getOrganization, searchOrganizationsAll } from "@red-cup-engineering/propublica-nonprofit-explorer-services-section/client";
import {
  FEDERAL_LEAD_KEYWORDS, NAMED_VENDOR_COMPS, NONPROFIT_LEAD_QUERIES, UPHPA_STATES,
  funderRow, heirSearchLeadsFromLandRows, nonprofitRow, nonprofitRowWithAddress,
} from "./leads.mjs";
import { orderPrice } from "./pricing.mjs";
import { assembleReport } from "./report.mjs";

const SECTION_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATES = join(SECTION_ROOT, "content", "text", "documents", "templates");
const KIND = "heir-search";
const DOCUMENT_TEMPLATES = Object.freeze(["engagement-letter-order-form", "joint-venture-caller-agreement"]);

/** The heir-search enterprise's id in the agency registry and the enterprise store. */
export const HEIR_ENTERPRISE = "heir-search";
// Read the declared settings only when an operation needs them; discovery does no registry IO.
const enterpriseForSettings = () => enterpriseOf(JSON.parse(readFileSync(join(SECTION_ROOT, "lib", "agency", "enterprises", `${HEIR_ENTERPRISE}.json`), "utf8")));
/** An heir search order's procedure: a lead reached, an order taken, a report delivered, the order paid. */
export const HEIR_PROCEDURE = procedure([
  { stage: "ordered", means: "an order taken and priced", office: "heir-search-researcher" },
  { stage: "delivered", means: "the report delivered to the ordering party", office: "heir-search-researcher" },
  { stage: "paid", means: "payment received", office: "heir-search-researcher" },
]);
const CONTACT_OUTCOMES = contactOutcomes(["no answer", "voicemail", "wrong number", "not the right contact", "callback", "interested", "engagement sent", "not interested", "remove"]);
const FOR = new Set(Object.entries(CONTACT_OUTCOMES).filter(([, side]) => side === "for").map(([name]) => name));
const snapshotDir = (binding) => join(binding.dataRoot, "data", "state", KIND, "leads");
const reportDir = (binding, date) => join(binding.dataRoot, "data", "records", "reports", date);


function latestSnapshot(binding) {
  let names;
  try { names = readdirSync(snapshotDir(binding)).filter((name) => name.endsWith(".json")).sort(); }
  catch (error) { if (error?.code === "ENOENT") return null; throw error; }
  if (names.length === 0) return null;
  return JSON.parse(readFileSync(join(snapshotDir(binding), names.at(-1)), "utf8"));
}

const object = (id, properties, required = []) => schemaFrom({ $id: `heir-search/${id}`, type: "object", properties, required, additionalProperties: false });
const text = { type: "string" };
const number = { type: "number" };
const boolean = { type: "boolean" };

const pullSchema = object("pull", { fiscalYearStart: text, fiscalYearEnd: text });
const findSchema = object("find", { kind: { enum: ["funders", "nonprofits", "uphpa-states", "vendor-comps", "all"] }, minAmount: number, state: text });
const landRowsSchema = object("duluth-estate-leads", {
  rows: { type: "array", items: { type: "object" } }, county: text, state: text,
}, ["rows"]);
const orderIntakeSchema = object("order-intake", {
  client: text, decedent: text, dateOfDeath: text, county: text, state: text, parcel: text,
  scope: text, researchYears: number, heirsLocated: number, rush: boolean,
  contingencyPercent: number, estateValue: number,
}, ["client", "decedent"]);
const ordersFindSchema = object("orders-find", { state: text, county: text, client: text });
const contactSchema = object("contact", {
  leadKind: { enum: ["funder", "nonprofit", "attorney", "title-company", "probate-office", "land-trust", "estate-owner"] },
  leadName: text, orderId: text, outcome: { enum: Object.keys(CONTACT_OUTCOMES) },
  notes: text, by: text,
}, ["leadKind", "leadName", "outcome"]);
const reportProduceSchema = object("report-produce", {
  orderId: text,
  findings: { type: "object", properties: { heirs: { type: "array" }, sources: { type: "array" }, chainOfTitle: { type: "array" } } },
}, ["orderId"]);
const paymentSchema = object("payment", { orderId: text, received: number, date: text, notes: text }, ["orderId", "received"]);
const documentDraftSchema = object("document-draft", {
  template: { enum: DOCUMENT_TEMPLATES }, orderId: text, values: { type: "object" },
}, ["template"]);

/**
 * @param {{dataRoot: string}} binding MetroPlat's binding; records land under its data root.
 * @param {{fetch?: typeof fetch}} [options]
 */
export function heirSearchOperations(binding, { fetch: fetchImpl, store = enterpriseStore(binding), contractingParty = () => undefined } = {}) {
  const settings = () => settingValues(enterpriseForSettings(), store.read("setting", { enterprise: HEIR_ENTERPRISE }));
  const orders = () => currentOrders(store.read("order", { enterprise: HEIR_ENTERPRISE }), { key: "orderId" });
  const orderOf = (orderId) => orders().find((order) => order.orderId === orderId);
  return Object.freeze([
    operation({
      verb: "heir-search-lead-list-pull",
      summary: "Pull federal funder and nonprofit buyer leads for heir search into a dated snapshot.",
      description: "Reads USAspending.gov's award-search API for named heirs'-property/land-tenure keywords and ProPublica's Nonprofit Explorer for heirs'-property and land-tenure nonprofits, and writes the snapshot every heir-search-lead-list-find call reads.",
      domain: pullSchema,
      reads: ["usaspending/award-search", "propublica/nonprofit-explorer"],
      writes: ["heir-search/lead-snapshot"],
      effects: { class: "external", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "unmeasured" },
      run: async ({ fiscalYearStart, fiscalYearEnd } = {}) => {
        const funders = new Map();
        for (const keyword of FEDERAL_LEAD_KEYWORDS) {
          for await (const award of searchAwardsAll({ keywords: [keyword], fiscalYearStart, fiscalYearEnd, fetch: fetchImpl }, { limit: 100 })) {
            funders.set(award["Award ID"], funderRow(award));
          }
        }
        const nonprofits = new Map();
        for (const query of NONPROFIT_LEAD_QUERIES) {
          for await (const organization of searchOrganizationsAll(query, { limit: 40, fetch: fetchImpl })) {
            const row = nonprofitRow(organization);
            if (nonprofits.has(row.ein)) continue;
            const detail = await getOrganization(row.ein, { fetch: fetchImpl }).catch(() => null);
            nonprofits.set(row.ein, nonprofitRowWithAddress(row, detail));
          }
        }
        const pulledAt = new Date().toISOString();
        const snapshot = { pulledAt, funders: [...funders.values()], nonprofits: [...nonprofits.values()] };
        mkdirSync(snapshotDir(binding), { recursive: true });
        const path = join(snapshotDir(binding), `${pulledAt.slice(0, 10)}.json`);
        writeFileSync(path, JSON.stringify(snapshot));
        return Object.freeze({ path, pulledAt, funders: snapshot.funders.length, nonprofits: snapshot.nonprofits.length });
      },
    }),
    operation({
      verb: "heir-search-lead-list-find",
      summary: "Read the buyer lead list: federal funders and nonprofits from the latest pull, the UPHPA-enacted states, and the named vendor comps.",
      domain: findSchema,
      reads: ["heir-search/lead-snapshot"],
      run: ({ kind = "all", minAmount, state } = {}) => {
        const snapshot = latestSnapshot(binding);
        const funders = (snapshot?.funders ?? []).filter((row) => minAmount === undefined || row.amount >= minAmount);
        const nonprofits = (snapshot?.nonprofits ?? []).filter((row) => !state || row.state === state);
        const result = {
          pulledAt: snapshot?.pulledAt ?? null,
          funders: kind === "all" || kind === "funders" ? funders : [],
          nonprofits: kind === "all" || kind === "nonprofits" ? nonprofits : [],
          uphpaStates: kind === "all" || kind === "uphpa-states" ? UPHPA_STATES : [],
          vendorComps: kind === "all" || kind === "vendor-comps" ? NAMED_VENDOR_COMPS : [],
        };
        return Object.freeze(result);
      },
    }),
    operation({
      verb: "heir-search-duluth-estate-leads",
      summary: "Project Duluth land seller rows (estate, heirs or trust owners) into heir search case leads.",
      description: "Domain: rows shaped like Duluth's land-parcels-find/sellers.csv output. An estate/heirs/trust owner is a land lead on one list and a probable open or unopened probate on the other.",
      domain: landRowsSchema,
      run: ({ rows, county, state }) => Object.freeze({ leads: heirSearchLeadsFromLandRows(rows, { county, state }) }),
    }),
    operation({
      verb: "heir-search-order-intake",
      summary: "Take in an heir search order and price it against the named incumbents' rates.",
      domain: orderIntakeSchema,
      writes: ["heir-search/order"],
      run: (input, _args, context) => {
        const price = orderPrice(input, settings());
        const orderId = `${(input.decedent ?? "case").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
        return store.order({ ...input, enterprise: HEIR_ENTERPRISE, order: orderId, orderId, stage: "ordered", price, fee: price.total ?? price.estimate ?? null, by: context?.invocation?.subject });
      },
    }),
    operation({
      verb: "heir-search-orders",
      summary: "List heir search orders, optionally filtered by state, county or client.",
      domain: ordersFindSchema,
      reads: ["heir-search/order"],
      run: ({ state, county, client } = {}) => orders()
        .filter((order) => (!state || order.state === state) && (!county || order.county === county) && (!client || order.client === client)),
    }),
    operation({
      verb: "heir-search-contact-log",
      summary: "Log one call, email or letter to a funder, nonprofit, attorney, title company, probate office or land trust.",
      description: "Interested and engagement-sent tell for the lead's interest; not interested and remove tell against; the rest tell nothing.",
      domain: contactSchema,
      writes: ["heir-search/contact"],
      run: (input, _args, context) => store.contact({ ...input, enterprise: HEIR_ENTERPRISE, party: input.leadName, by: input.by ?? context?.invocation?.subject }, CONTACT_OUTCOMES),
    }),
    operation({
      verb: "heir-search-report-produce",
      summary: "Assemble the heir search report for an order from its research findings, and write it to disk.",
      description: "The heir tree is read on FOUR's extremal family (documented/disputed/excluded/presumed); the report names whether it is ready for the ordering attorney's review.",
      domain: reportProduceSchema,
      reads: ["heir-search/order"],
      writes: ["heir-search/report"],
      run: ({ orderId, findings = {} }, _args, context) => {
        const order = orderOf(orderId);
        if (!order) throw new Error(`no order ${orderId}: run heir-search-order-intake first`);
        const { markdown, summary, price } = assembleReport(order, findings);
        const date = new Date().toISOString().slice(0, 10);
        mkdirSync(reportDir(binding, date), { recursive: true });
        const path = join(reportDir(binding, date), `${orderId}.md`);
        writeFileSync(path, markdown);
        return store.order({ enterprise: HEIR_ENTERPRISE, order: orderId, orderId, stage: "delivered", report: path, summary, price, by: context?.invocation?.subject });
      },
    }),
    operation({
      verb: "heir-search-payment-record",
      summary: "Record payment received for an heir search order: the order is paid, and its settlement names the originating caller's share.",
      domain: paymentSchema,
      writes: ["enterprise/records"],
      run: ({ orderId, received, date, notes }, _args, context) => {
        const order = orderOf(orderId);
        if (!order) throw new Error(`no order ${orderId}`);
        const recorded = store.order({ enterprise: HEIR_ENTERPRISE, order: orderId, orderId, stage: "paid", fee: received, by: context?.invocation?.subject });
        const originator = store.read("contact", { enterprise: HEIR_ENTERPRISE })
          .filter((c) => FOR.has(c.outcome) && c.by && (c.orderId === orderId || c.leadName === order.client) && String(c.recordedAt) <= String(order.history[0].recordedAt))
          .sort((a, b) => String(a.recordedAt).localeCompare(String(b.recordedAt)))[0]?.by;
        const share = settings()["caller-share"];
        const settlement = store.settlement({
          enterprise: HEIR_ENTERPRISE, order: orderId, date: date ?? new Date().toISOString().slice(0, 10), received,
          parties: [order.client].filter(Boolean),
          userValue: [],
          shares: originator ? [{ party: originator, office: "heir-search-caller", share, amount: Math.round(received * share * 100) / 100, basis: "joint-venture caller agreement: originating caller's share of the order's price" }] : [],
          witness: notes ?? null,
        });
        return Object.freeze({ ...recorded, settlement });
      },
    }),
    operation({
      verb: "heir-search-document-draft",
      summary: "Draft the engagement letter/order form or the caller's joint-venture agreement with an order's values filled in.",
      domain: documentDraftSchema,
      reads: ["heir-search/order"],
      run: ({ template, orderId, values = {} }) => {
        const order = orderId ? orderOf(orderId) : undefined;
        const merged = { date: new Date().toISOString().slice(0, 10), contractingParty: contractingParty(HEIR_ENTERPRISE), ...order, ...values };
        const body = fillTemplate(readFileSync(join(TEMPLATES, `${template}.md`), "utf8").replace(/^---[\s\S]*?---\n/, ""), merged);
        return Object.freeze({ template, orderId: orderId ?? null, values: merged, markdown: body });
      },
    }),
  ]);
}
